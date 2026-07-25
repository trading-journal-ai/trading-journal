import { describe, expect, it } from "vitest";
import type { ChartCandle } from "@/components/TradeChart";
import {
  tradeCandlesDuringHold,
  tradeExcursionFromCandles,
  tradeNumberForCandleMinute,
} from "@/lib/tradeExcursion";

const candles: ChartCandle[] = [
  { t: 600, o: 10, h: 10.2, l: 9.8, c: 10.1, vol: 1000 },
  { t: 660, o: 10.1, h: 10.6, l: 9.9, c: 10.5, vol: 1200 },
  { t: 720, o: 10.5, h: 10.7, l: 10.2, c: 10.3, vol: 900 },
];

describe("tradeExcursionFromCandles", () => {
  it("derives long MAE, MFE, realized return, and capture", () => {
    const result = tradeExcursionFromCandles(candles, {
      side: "long",
      entryAt: 615,
      exitAt: 725,
      entryPrice: 10,
      exitPrice: 10.5,
    });

    expect(result).not.toBeNull();
    expect(result?.adversePct).toBeCloseTo(-2);
    expect(result?.favorablePct).toBeCloseTo(7);
    expect(result?.realizedPct).toBeCloseTo(5);
    expect(result?.capturePct).toBeCloseTo(71.428, 2);
    expect(result?.confirmedAdversePct).toBeCloseTo(-1);
    expect(result?.confirmedFavorablePct).toBeCloseTo(6);
    expect(result?.adverseAt).toBe(600);
    expect(result?.favorableAt).toBe(720);
    expect(result?.barCount).toBe(3);
  });

  it("mirrors favorable and adverse prices for a short", () => {
    const result = tradeExcursionFromCandles(candles, {
      side: "short",
      entryAt: 615,
      exitAt: 725,
      entryPrice: 10,
      exitPrice: 9.9,
    });

    expect(result?.adversePct).toBeCloseTo(-7);
    expect(result?.favorablePct).toBeCloseTo(2);
    expect(result?.realizedPct).toBeCloseTo(1);
    expect(result?.adversePrice).toBe(10.7);
    expect(result?.favorablePrice).toBe(9.8);
  });

  it("returns null when the hold has no candle coverage", () => {
    expect(tradeExcursionFromCandles(candles, {
      side: "long",
      entryAt: 900,
      exitAt: 930,
      entryPrice: 10,
      exitPrice: 10.1,
    })).toBeNull();
  });

  it("uses entry as zero when every observed price is favorable", () => {
    const result = tradeExcursionFromCandles([
      { t: 600, o: 10.2, h: 10.5, l: 10.1, c: 10.4, vol: 1000 },
    ], {
      side: "long",
      entryAt: 615,
      exitAt: 640,
      entryPrice: 10,
      exitPrice: 10.4,
    });

    expect(result?.adversePct).toBe(0);
    expect(result?.adversePrice).toBe(10);
    expect(result?.adverseAt).toBe(615);
    expect(result?.confirmedAdversePct).toBe(0);
    expect(result?.confirmedFavorablePct).toBeCloseTo(4);
  });
});

describe("tradeCandlesDuringHold", () => {
  it("returns entry, held, and exit minutes without post-exit context", () => {
    const held = tradeCandlesDuringHold(candles, {
      side: "long",
      entryAt: 615,
      exitAt: 725,
      entryPrice: 10,
      exitPrice: 10.5,
    });

    expect(held.map((candle) => candle.startedAt)).toEqual([600, 660, 720]);
    expect(held.map((candle) => candle.phase)).toEqual(["entry", "held", "exit"]);
    expect(held[2]?.minimumPct).toBeCloseTo(2);
    expect(held[2]?.maximumPct).toBeCloseTo(7);
    expect(held[2]?.closePct).toBeCloseTo(3);
  });

  it("uses one boundary candle when entry and exit share a minute", () => {
    const held = tradeCandlesDuringHold(candles, {
      side: "long",
      entryAt: 615,
      exitAt: 645,
      entryPrice: 10,
      exitPrice: 10.1,
    });

    expect(held).toHaveLength(1);
    expect(held[0]?.phase).toBe("single");
  });

  it("keeps favorable direction inverted for a short", () => {
    const held = tradeCandlesDuringHold(candles, {
      side: "short",
      entryAt: 615,
      exitAt: 665,
      entryPrice: 10,
      exitPrice: 9.9,
    });

    expect(held[1]?.minimumPct).toBeCloseTo(-6);
    expect(held[1]?.maximumPct).toBeCloseTo(1);
    expect(held[1]?.openPct).toBeCloseTo(-1);
    expect(held[1]?.closePct).toBeCloseTo(-5);
  });
});

describe("tradeNumberForCandleMinute", () => {
  const trades = [
    { tradeNumber: 2, entryAt: 10 * 60 + 42, exitAt: 12 * 60 + 44 },
    { tradeNumber: 3, entryAt: 13 * 60 + 45, exitAt: 29 * 60 + 45 },
  ];

  it("keeps adjacent flat-to-flat trades on their own candle minutes", () => {
    expect(tradeNumberForCandleMinute(trades, 10 * 60)).toBe(2);
    expect(tradeNumberForCandleMinute(trades, 12 * 60)).toBe(2);
    expect(tradeNumberForCandleMinute(trades, 13 * 60)).toBe(3);
  });

  it("uses a preferred trade to disambiguate overlapping candle minutes", () => {
    const overlapping = [
      { tradeNumber: 6, entryAt: 600, exitAt: 640 },
      { tradeNumber: 7, entryAt: 620, exitAt: 650 },
    ];

    expect(tradeNumberForCandleMinute(overlapping, 600)).toBe(6);
    expect(tradeNumberForCandleMinute(overlapping, 600, 7)).toBe(7);
  });
});
