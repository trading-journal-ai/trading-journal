import { describe, expect, it } from "vitest";
import { marketDataSymbolForDate, marketDataSymbolFromEvents } from "./symbolHistory";

describe("point-in-time market-data symbols", () => {
  it("uses SNSE for FTH before the ticker change", () => {
    expect(marketDataSymbolForDate("FTH", "2026-02-18")).toBe("SNSE");
    expect(marketDataSymbolForDate("fth", "2026-06-15")).toBe("SNSE");
  });

  it("uses FTH from the effective date forward", () => {
    expect(marketDataSymbolForDate("FTH", "2026-06-16")).toBe("FTH");
    expect(marketDataSymbolForDate("FTH", "2026-07-21")).toBe("FTH");
  });

  it("leaves symbols without known history unchanged", () => {
    expect(marketDataSymbolForDate(" aapl ", "2026-02-18")).toBe("AAPL");
  });

  it("selects the latest ticker event effective on the market date", () => {
    const events = [
      { date: "2026-06-16", ticker: "FTH" },
      { date: "2025-06-17", ticker: "SNSE" },
    ];

    expect(marketDataSymbolFromEvents("2026-02-18", events)).toBe("SNSE");
    expect(marketDataSymbolFromEvents("2026-06-16", events)).toBe("FTH");
    expect(marketDataSymbolFromEvents("2025-06-16", events)).toBeNull();
  });

  it("ignores malformed ticker events", () => {
    expect(marketDataSymbolFromEvents("2026-02-18", [
      { date: "not-a-date", ticker: "BAD" },
      { date: "2025-06-17", ticker: " snse " },
    ])).toBe("SNSE");
  });
});
