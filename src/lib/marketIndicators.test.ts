import { describe, expect, it } from "vitest";
import { emaSeries, marketIndicatorSeries, vwapSeries, type IndicatorCandle } from "./marketIndicators";

function candles(closes: number[], volumes?: number[]): IndicatorCandle[] {
  return closes.map((close, index) => ({
    t: index * 60,
    h: close + 1,
    l: close - 1,
    c: close,
    vol: volumes?.[index] ?? 100,
  }));
}

describe("emaSeries", () => {
  it("matches the chart warmup and causal EMA recurrence", () => {
    const points = emaSeries(candles([1, 2, 3, 4]), 3);

    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({ t: 120, value: 2.25 });
    expect(points[1]).toEqual({ t: 180, value: 3.125 });
  });

  it("rejects invalid periods", () => {
    expect(() => emaSeries(candles([1]), 0)).toThrow(RangeError);
  });
});

describe("vwapSeries", () => {
  it("uses typical price weighted by non-negative volume", () => {
    const points = vwapSeries(candles([10, 12], [100, 300]));

    expect(points[0].value).toBe(10);
    expect(points[1].value).toBe(11.5);
  });

  it("starts at the explicit session anchor", () => {
    const points = vwapSeries(candles([10, 12, 14], [100, 100, 100]), { anchorTime: 60 });

    expect(points).toEqual([
      { t: 60, value: 12 },
      { t: 120, value: 13 },
    ]);
  });
});

describe("marketIndicatorSeries", () => {
  it("builds the shared 9/20/VWAP bundle", () => {
    const points = marketIndicatorSeries(candles(Array.from({ length: 20 }, (_, index) => index + 1)));

    expect(points.ema9).toHaveLength(12);
    expect(points.ema20).toHaveLength(1);
    expect(points.vwap).toHaveLength(20);
  });
});
