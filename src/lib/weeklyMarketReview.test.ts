import { describe, expect, it, vi } from "vitest";
import * as providers from "./marketArchive/provider";
import { buildWeeklyMarketReview, loadWeeklyMarketReview } from "./weeklyMarketReview";
import type { ArchiveMoverSummary, MarketHistoryDay } from "./marketArchive/types";
import type { MarketArchiveClient } from "./marketArchive/provider";
const weekStart = "2026-06-08";
const source = { scope: "selected-candidates", completeness: "bounded-inputs-complete", limitations: [] };
function day(date = weekStart): MarketHistoryDay {
  return { date, massive: { available: false, datasetId: null }, dts: { available: true, coverage: {status:"partial"}, heartbeat: null, observations: null, snapshot: null }, research: [], candidateContext: {
    date, state: "complete", scope: "selected-candidates", publishedAt: `${date}T23:00:00Z`, generatedAt: `${date}T23:00:00Z`, calculationVersion: "synthetic-v1", discovery: {},
    sourceCoverage: { discovery: source, groupedDaily: source, candidateMinutes: source, candidateReference: source },
  } };
}
function mover(symbol: string, date = weekStart, gain = 60): ArchiveMoverSummary {
  return { symbol, date, qualifiesCore: true, splitEvent: false, instrumentName: null, instrumentType: null, primaryExchange: null, previousRegularClose: 1,
    coreExclusionReasons: [], peakSession: "regular", premarketGainPercent: 10, regularGainPercent: gain, afterHoursGainPercent: 20, afterHoursGainFromRegularClosePercent: 0, continuationPercent: 10,
    evidence: { activeMinutes: 10, close: 1.5, closeDistanceFromHighPercent: 2, dollarVolume: 100, gainPercent: gain, high: 1.6, highAt: null, rvol: null, transactions: 10, transactionsPerActiveMinute: 1, volume: 100 },
  };
}
const base = { weekStart, asOfDate: "2026-06-13", sessions: [{date: weekStart, symbols: ["DEMO"], tickerPnl: [{symbol:"DEMO",pnl:15}]}] };
describe("weekly shared market evidence", () => {
  it("matches exact ticker and same session, ranks retrospective leaders, and keeps bounded coverage partial", () => {
    const result = buildWeeklyMarketReview({...base, records:[{date:weekStart,day:day(),movers:[mover("DEMO"),mover("OTHER",weekStart,100)],total:2}]});
    expect(result.days[0].tradedSymbols).toEqual(["DEMO"]);
    expect(result.days[0].leaders[0].symbol).toBe("OTHER");
    expect(result.status).toBe("partial");
    expect(result.note).toContain("not entry-time signals");
    expect(result.summary).toContain("1 recorded qualifying mover");
    expect(result.matchedPnl).toBe(15);
  });
  it("includes market days without personal trades, without inventing participation", () => {
    const date="2026-06-09";
    const result=buildWeeklyMarketReview({...base,records:[{date,day:day(date),movers:[mover("DEMO",date)],total:1}]});
    expect(result.days).toHaveLength(1);
    expect(result.days[0].tradedSymbols).toEqual([]);
    expect(result.matchedPnl).toBeNull();
  });
  it("excludes same-day/future, wrong-date, split, ineligible and duplicate entries", () => {
    const result=buildWeeklyMarketReview({...base,asOfDate:"2026-06-09",records:[
      {date:weekStart,day:day(),movers:[mover("DEMO"),mover("DEMO"),mover("demo"),mover("WRONG","2026-06-10"),{...mover("SPLIT"),splitEvent:true},{...mover("WARRANT"),qualifiesCore:false}],total:6},
      {date:"2026-06-09",day:day("2026-06-09"),movers:[mover("OTHER","2026-06-09")],total:1},
    ]});
    expect(result.days).toHaveLength(1);
    expect(result.days[0].eligibleMovers).toBe(2);
    expect(result.days[0].tradedSymbols).toEqual(["DEMO"]);
  });
  it("withholds later-published candidate evidence and mismatched day records", () => {
    const late=day();late.candidateContext!.publishedAt="2026-06-15T23:00:00Z";
    expect(buildWeeklyMarketReview({...base,records:[{date:weekStart,day:late,movers:[mover("DEMO")],total:1}]}).status).toBe("unavailable");
    expect(buildWeeklyMarketReview({...base,records:[{date:weekStart,day:day("2026-06-09"),movers:[],total:0}]}).days).toEqual([]);
  });
  it("does not turn absent records into a cold market and labels truncation", () => {
    expect(buildWeeklyMarketReview({...base,records:[]}).status).toBe("unavailable");
    const result=buildWeeklyMarketReview({...base,records:[{date:weekStart,day:day(),movers:[mover("DEMO")],total:201}]});
    expect(result.days[0].coverage).toContain("first 1 of 201 records");
    expect(result.status).toBe("partial");
  });
  it("continues through a failed day read and never requests upcoming sessions", async () => {
    const requested:string[]=[];
    const client:MarketArchiveClient={
      health:async()=>({available:false,coreRuleVersion:"core-equity-v2"}),
      getDay:async(date)=>{requested.push(date);if(date===weekStart) throw new Error("offline");return day(date);},
      listMovers:async(input)=>({movers:[mover("OTHER",input!.date)],total:1}),
      listTradingDays:async()=>[],summarizeMovers:async()=>{throw new Error("unused");},
    };
    const result=await loadWeeklyMarketReview({...base,asOfDate:"2026-06-10"},client);
    expect(requested).toEqual([weekStart,"2026-06-09"]);
    expect(result.days.map(row=>row.date)).toEqual(["2026-06-09"]);
    expect(result.status).toBe("partial");
  });
});

it("coalesces public day reads without caching account overlaps, and expires cached evidence", async () => {
  const getDay = vi.fn(async (date: string) => day(date));
  const listMovers = vi.fn(async (input?: Parameters<MarketArchiveClient["listMovers"]>[0]) => ({ movers: [mover("DEMO", input!.date)], total: 1 }));
  const client: MarketArchiveClient = {
    health: async () => ({ available: false, coreRuleVersion: "core-equity-v2" }),
    getDay, listMovers, listTradingDays: async () => [], summarizeMovers: async () => { throw new Error("unused"); },
  };
  vi.useFakeTimers();
  vi.stubEnv("MARKET_HISTORY_PROVIDER", "local");
  vi.stubEnv("MARKET_HISTORY_SERVER_URL", "synthetic-cache-test");
  vi.spyOn(providers, "createMarketArchiveClient").mockReturnValue(client);
  try {
    const [first, second] = await Promise.all([
      loadWeeklyMarketReview(base),
      loadWeeklyMarketReview({ ...base, sessions: [] }),
    ]);
    expect(getDay).toHaveBeenCalledTimes(5);
    expect(listMovers).toHaveBeenCalledTimes(5);
    expect(first.matchedPnl).toBe(15);
    expect(second.matchedPnl).toBeNull();
    expect(second.days.every(row => row.tradedSymbols.length === 0)).toBe(true);
    vi.setSystemTime(Date.now() + 181_000);
    await loadWeeklyMarketReview(base);
    expect(getDay).toHaveBeenCalledTimes(10);
  } finally {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  }
});
