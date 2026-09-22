import { describe, expect, it } from "vitest";
import { savedReviewSections, serializeReviewSections } from "@/lib/tickerReviewSections";

const trades = [
  { number: 1, entryTime: "09:35" },
  { number: 2, entryTime: "10:10" },
];

describe("ticker review sections", () => {
  it("separates overall, trade, and chart-moment notes", () => {
    expect(savedReviewSections("Overall context\n@trade2\nSecond attempt\n@11:15\nLate flush", trades)).toEqual([
      { kind: "overall", body: "Overall context" },
      { kind: "trade", tradeNumber: 2, time: "10:10", body: "Second attempt" },
      { kind: "moment", time: "11:15", body: "Late flush" },
    ]);
  });

  it("keeps an explicit trade time and round-trips the saved format", () => {
    const sections = savedReviewSections("@trade1 · @09:42\nWaited for confirmation", trades);
    expect(sections).toEqual([
      { kind: "trade", tradeNumber: 1, time: "09:42", body: "Waited for confirmation" },
    ]);
    expect(serializeReviewSections(sections)).toBe("@trade1 · @09:42\nWaited for confirmation");
  });
});
