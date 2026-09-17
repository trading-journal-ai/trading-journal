import { describe,it,expect,vi } from 'vitest';
import { createServerArchiveClient,createMarketArchiveClient } from './provider';

const health={available:true,owner:'trading-server',coreRuleVersion:'core-equity-v2',counts:{archiveDates:1,coreMovers:2,rawMoversExcludingSplits:2,sessionStats:2,symbolDays:2},coverage:{from:'2026-01-05',to:'2026-01-05'},candidateContext:{available:true,scope:'selected-candidates',firstDate:'2026-01-05',lastDate:'2026-01-07',days:3,partialDays:1}};
const coverage={scope:'selected-candidates',completeness:'complete',limitations:[]};
const day={date:'2026-01-05',massive:{available:true,datasetId:'market-history-v1'},candidateContext:{date:'2026-01-05',state:'complete',scope:'selected-candidates',publishedAt:'2026-01-06T01:00:00.000Z',generatedAt:'2026-01-06T00:30:00.000Z',sourceCoverage:{discovery:coverage,groupedDaily:coverage,candidateMinutes:coverage,candidateReference:coverage},discovery:{candidateCount:12},calculationVersion:'core-equity-v2'},dts:{available:false,observations:[],heartbeat:null,coverage:null,snapshot:null},research:[]};
describe('shared market history provider',()=>{
  it('uses a versioned loopback API and deduplicates reads per client',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:health})));
    const client=createServerArchiveClient({},fetcher);
    expect((await client.health()).available).toBe(true);
    expect((await client.health()).available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toContain('http://127.0.0.1:8787/api/market-history/health');
  });
  it('accepts an empty candidate-context health state before the first publication',async()=>{
    const emptyHealth={...health,candidateContext:{available:false,scope:'selected-candidates',firstDate:null,lastDate:null,days:0,partialDays:0}};
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:emptyHealth})));
    expect(await createServerArchiveClient({},fetcher).health()).toMatchObject({
      available:true,
      candidateContext:{available:false,firstDate:null,lastDate:null,days:0,partialDays:0},
    });
  });
  it('reports server unavailable without falling back to a local database',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const client=createServerArchiveClient({},fetcher);
    expect(await client.health()).toMatchObject({available:false,reason:'server_unavailable'});
    await expect(client.listMovers()).rejects.toThrow('market history is unavailable');
  });
  it('reads and validates selected-candidate day coverage from the date endpoint',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:day})));
    const result=await createServerArchiveClient({},fetcher).getDay('2026-01-05');
    expect(result?.candidateContext).toMatchObject({state:'complete',scope:'selected-candidates'});
    expect(String(fetcher.mock.calls[0][0])).toBe('http://127.0.0.1:8787/api/market-history/day?date=2026-01-05');
  });
  it('accepts a pre-publication day response without candidate context',async()=>{
    const unpublished={date:'2026-01-04',massive:{available:false,datasetId:'market-history-v1'},dts:day.dts,research:[]};
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:unpublished})));
    await expect(createServerArchiveClient({},fetcher).getDay('2026-01-04')).resolves.toMatchObject({massive:{available:false}});
  });
  it('rejects malformed selected-candidate coverage instead of implying complete evidence',async()=>{
    const malformed={...day,candidateContext:{...day.candidateContext,sourceCoverage:{...day.candidateContext.sourceCoverage,candidateMinutes:{...coverage,limitations:'unknown'}}}};
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:malformed})));
    await expect(createServerArchiveClient({},fetcher).getDay('2026-01-05')).rejects.toThrow('market history is unavailable');
  });
  it('rejects incompatible or malformed server payloads',async()=>{
    for(const payload of [{apiVersion:1,data:{...health,coreRuleVersion:'core-common-stock-v1'}},{apiVersion:2,data:health},{apiVersion:1,data:{available:true}},{apiVersion:1,data:{movers:'bad',total:2}}]) {
      const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
      expect((await createServerArchiveClient({},fetcher).health()).available).toBe(false);
    }
  });
  it('reconnects once after a dropped read socket',async()=>{
    const fetcher=vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError('fetch failed',{cause:{code:'UND_ERR_SOCKET'}}))
      .mockResolvedValueOnce(new Response(JSON.stringify({apiVersion:1,data:health})));
    expect((await createServerArchiveClient({},fetcher).health()).available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('refuses nonlocal URLs and unknown provider modes',()=>{
    expect(()=>createServerArchiveClient({MARKET_HISTORY_SERVER_URL:'https://example.com'})).toThrow('local Trading Server');
    expect(()=>createMarketArchiveClient({MARKET_HISTORY_PROVIDER:'typo'})).toThrow('Invalid');
  });
});

it('forwards the optional prior-close floor to the Server',async()=>{
  const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:{total:0,movers:[]}})));
  await createServerArchiveClient({},fetcher).listMovers({minPreviousClose:1,peakSession:'afterHours'});
  const url=new URL(String(fetcher.mock.calls[0][0]));
  expect(JSON.parse(url.searchParams.get('input')!)).toMatchObject({minPreviousClose:1,peakSession:'afterHours'});
});
