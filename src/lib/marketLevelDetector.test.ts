import { describe, expect, it } from "vitest";
import type { CurlDay } from "./marketInsights";
import { detectMarketLevels } from "./marketLevelDetector";

type Bar = CurlDay["bars"][number];
const bar = (i: number, high = 10.1, low = 9.9, close = 10): Bar => [60 + i * 60, close, high, low, close, 100];
const day = (bars: Bar[]): CurlDay => ({ id: "SYNTHETIC", sym: "TEST", date: "2026-10-01", pc: 10, bars, curls: [], priceZones: [], zones: [] });
function resistanceDay(peaks: [number, number][], count = 23): CurlDay {
  const bars = Array.from({ length: count }, (_, i) => bar(i));
  for (const [index, price] of peaks) bars[index] = bar(index, price);
  return day(bars);
}

describe("completed-chart wick level proposals", () => {
  it("uses actual wick prices, separated tests, and right-candle close availability", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.51], [18, 10.5]]);
    const original = structuredClone(input);
    const result = detectMarketLevels(input);
    expect(result.detector).toBe("wick-levels:v2");
    expect(result.proposals).toHaveLength(1);
    const proposal = result.proposals[0];
    expect(proposal.evidence.map((item) => item.price)).toEqual([10.5, 10.51, 10.5]);
    expect(proposal.evidence[0]).toEqual({ t: 240, price: 10.5, role: "resistance", basis: "wick", confirmedAt: 420 });
    expect(proposal).toMatchObject({ role: "resistance", center: 10.5, startT: 240, endT: 1380 });
    expect(proposal.low).toBeLessThanOrEqual(10.5);
    expect(proposal.high).toBeGreaterThanOrEqual(10.51);
    expect(proposal.high - proposal.low).toBeLessThanOrEqual(10.5 * result.parameters.maxPriceToleranceFraction);
    expect(detectMarketLevels(input)).toEqual(result);
    expect(input).toEqual(original);
  });

  it("requires two return visits and does not turn a plateau into many touches", () => {
    expect(detectMarketLevels(resistanceDay([[3, 10.5]])).proposals).toEqual([]);
    expect(detectMarketLevels(resistanceDay([[3, 10.5], [4, 10.5], [5, 10.5]])).proposals).toEqual([]);
    const result = detectMarketLevels(resistanceDay([[3, 10.5], [4, 10.5], [5, 10.5], [15, 10.5]]));
    expect(result.proposals[0].evidence.map((item) => item.t)).toEqual([360, 960]);
  });

  it("keeps nearby shelves separate and prevents transitive clustering", () => {
    const result = detectMarketLevels(resistanceDay([[3, 10.5], [10, 10.57], [18, 10.64], [25, 10.5], [32, 10.64]], 36));
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0].high).toBeLessThan(result.proposals[1].low);
    expect(result.proposals[0].evidence.map((item) => item.price)).toEqual([10.5, 10.57, 10.5]);
    expect(result.proposals[1].evidence.map((item) => item.price)).toEqual([10.64, 10.64]);
  });

  it("uses the latest evidence role without calling the level an established flip", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.5]], 25);
    for (let i = 14; i < 25; i++) input.bars[i] = bar(i, 10.9, 10.7, 10.8);
    input.bars[19] = bar(19, 10.9, 10.5, 10.8);
    const proposal = detectMarketLevels(input).proposals.find((item) => item.center === 10.5);
    expect(proposal?.role).toBe("support");
    expect(proposal?.evidence.map((item) => item.role)).toEqual(["resistance", "resistance", "support"]);
  });

  it("recognizes a separated role-change test after movement through the level", () => {
    const bars = Array.from({ length: 20 }, (_, i) => bar(i, 10.45, 10.2, 10.4));
    bars[3][2] = 10.5;
    for (let i = 7; i < bars.length; i++) bars[i] = bar(i, 11.1, 10.9, 11);
    bars[15][3] = 10.5;
    const proposal = detectMarketLevels(day(bars)).proposals.find((item) => item.center === 10.5);
    expect(proposal?.evidence.map((item) => item.role)).toEqual(["resistance", "support"]);
    expect(proposal?.role).toBe("support");
  });

  it("rounds editable geometry while retaining exact source wick prices", () => {
    const proposal = detectMarketLevels(resistanceDay([[3, 10.534567], [10, 10.534567]])).proposals[0];
    for (const price of [proposal.low, proposal.high, proposal.center]) expect(price).toBe(Number(price.toFixed(4)));
    expect(proposal.evidence.map((item) => item.price)).toEqual([10.534567, 10.534567]);
  });

  it("does not bridge a missing minute in either side of a pivot window", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.5]]);
    input.bars.splice(11, 1);
    expect(detectMarketLevels(input).proposals).toEqual([]);
    const leftGap = resistanceDay([[3, 10.5], [10, 10.5]]);
    leftGap.bars.splice(9, 1);
    expect(detectMarketLevels(leftGap).proposals).toEqual([]);
  });

  it("does not synthesize endpoint pivots or use unconfirmed final wicks", () => {
    expect(detectMarketLevels(resistanceDay([[0, 10.5], [3, 10.5], [22, 10.5]])).proposals).toEqual([]);
    expect(detectMarketLevels(day([])).proposals).toEqual([]);
    expect(detectMarketLevels(day([bar(0), bar(1)])).proposals).toEqual([]);
    expect(detectMarketLevels(day(Array.from({ length: 30 }, (_, i) => bar(i, 10, 10)))).proposals).toEqual([]);
  });

  it("does not count neighboring tests without an observed close away from the level", () => {
    const input = day(Array.from({ length: 20 }, (_, i) => bar(i, 10.499, 10.3, 10.498)));
    input.bars[3][2] = 10.5;
    input.bars[12][2] = 10.5;
    expect(detectMarketLevels(input).proposals).toEqual([]);
  });

  it("keeps evidence identity independent of later padding candles", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.5]]);
    const first = detectMarketLevels(input).proposals[0];
    input.bars.push(bar(23));
    const next = detectMarketLevels(input).proposals[0];
    expect(next.id).toBe(first.id);
    expect(next.endT).toBe(first.endT + 60);
  });

  it("does not widen earlier bands using a later full-day extreme", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.51]]);
    const first = detectMarketLevels(input).proposals[0];
    for (let i = 23; i < 40; i++) input.bars.push(bar(i, 20.1, 19.9, 20));
    const next = detectMarketLevels(input).proposals.find((item) => item.id === first.id);
    expect(next).toMatchObject({ low: first.low, high: first.high, center: first.center, evidence: first.evidence });
  });

  it("does not split equal-price tests when their local volatility differs", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.53]], 45);
    for (let i = 14; i < 45; i++) input.bars[i] = bar(i, 10.01, 9.99);
    input.bars[30][2] = 10.53;
    input.bars[40][2] = 10.53;
    const result = detectMarketLevels(input);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].evidence.map((item) => item.price)).toEqual([10.5, 10.53, 10.53, 10.53]);
  });

  it("waits for the complete right window of the second test", () => {
    const input = resistanceDay([[3, 10.5], [10, 10.5]]);
    expect(detectMarketLevels({ ...input, bars: input.bars.slice(0, 12) }).proposals).toEqual([]);
    const result = detectMarketLevels({ ...input, bars: input.bars.slice(0, 13) });
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0].evidence[1].confirmedAt).toBe(input.bars[12][0] + 60);
  });

  it.each([
    (bars: Bar[]) => { bars[0][2] = Number.NaN; },
    (bars: Bar[]) => { bars[0][3] = 11; },
    (bars: Bar[]) => { bars[0][5] = -1; },
    (bars: Bar[]) => { bars[0][4] = 0; },
    (bars: Bar[]) => { bars[1][0] = bars[0][0]; },
    (bars: Bar[]) => { bars[1][0] = bars[0][0] - 60; },
    (bars: Bar[]) => { bars[1][0] += 0.5; },
    (bars: Bar[]) => { bars[1][0] += 1; },
  ])("rejects invalid OHLCV instead of silently reordering or dropping it", (corrupt) => {
    const input = resistanceDay([[3, 10.5], [10, 10.5]]);
    corrupt(input.bars);
    expect(() => detectMarketLevels(input)).toThrow();
  });
});
