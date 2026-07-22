import { describe, expect, it, vi } from "vitest";
import type { Candle } from "./massive";
import { fetchResolvedCandleDay } from "./resolveDay";

const candle: Candle = { t: 1, o: 10, h: 11, l: 9, c: 10.5, vol: 1_000 };

describe("point-in-time candle repair", () => {
  it("retries the ticker effective on the requested market date", async () => {
    const fetchDay = vi.fn(async (symbol: string) => symbol === "OLD" ? [candle] : []);
    const fetchTickerEvents = vi.fn(async () => [
      { date: "2026-06-16", ticker: "NEW" },
      { date: "2025-06-17", ticker: "OLD" },
    ]);

    const result = await fetchResolvedCandleDay("NEW", "2026-02-18", {
      fetchDay,
      fetchTickerEvents,
    });

    expect(result).toEqual({
      attemptedSymbols: ["NEW", "OLD"],
      bars: [candle],
      marketDataSymbol: "OLD",
      resolutionMethod: "ticker_events",
    });
    expect(fetchDay).toHaveBeenCalledTimes(2);
  });

  it("returns an unresolved result after ticker history finds no usable symbol", async () => {
    const result = await fetchResolvedCandleDay("UNKNOWN", "2026-02-18", {
      fetchDay: vi.fn(async () => []),
      fetchTickerEvents: vi.fn(async () => []),
    });

    expect(result).toEqual({ attemptedSymbols: ["UNKNOWN"], bars: [] });
  });

  it("preserves a ticker-history error without inventing candle data", async () => {
    const result = await fetchResolvedCandleDay("UNKNOWN", "2026-02-18", {
      fetchDay: vi.fn(async () => []),
      fetchTickerEvents: vi.fn(async () => {
        throw new Error("history unavailable");
      }),
    });

    expect(result.bars).toEqual([]);
    expect(result.historyError).toBe("history unavailable");
  });
});
