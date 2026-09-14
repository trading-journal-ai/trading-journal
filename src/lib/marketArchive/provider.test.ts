import { describe,it,expect,vi } from 'vitest';
import { createServerArchiveClient,createMarketArchiveClient } from './provider';

const health={available:true,owner:'trading-server',coreRuleVersion:'core-common-stock-v1',counts:{archiveDates:1,coreMovers:2,rawMoversExcludingSplits:2,sessionStats:2,symbolDays:2},coverage:{from:'2026-01-05',to:'2026-01-05'}};
describe('shared market history provider',()=>{
  it('uses a versioned loopback API and deduplicates reads per client',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({apiVersion:1,data:health})));
    const client=createServerArchiveClient({},fetcher);
    expect((await client.health()).available).toBe(true);
    expect((await client.health()).available).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toContain('http://127.0.0.1:8787/api/market-history/health');
  });
  it('reports server unavailable without falling back to a local database',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));
    const client=createServerArchiveClient({},fetcher);
    expect(await client.health()).toMatchObject({available:false,reason:'server_unavailable'});
    await expect(client.listMovers()).rejects.toThrow('market history is unavailable');
  });
  it('rejects incompatible or malformed server payloads',async()=>{
    for(const payload of [{apiVersion:2,data:health},{apiVersion:1,data:{available:true}},{apiVersion:1,data:{movers:'bad',total:2}}]) {
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
