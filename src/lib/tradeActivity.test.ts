import { describe, expect, it } from "vitest";
import { heldCalendarDays, tradeDayActivities } from "./tradeActivity";

describe("tradeDayActivities", () => {
  it("attributes partial and final realized P&L to their execution dates", () => {
    const entryAt = Date.parse("2026-06-01T15:00:00Z") / 1000;
    const partialAt = Date.parse("2026-06-02T15:00:00Z") / 1000;
    const exitAt = Date.parse("2026-06-03T15:00:00Z") / 1000;
    const activities = tradeDayActivities(
      { symbol: "TEST", side: "long", entryAt, exitAt },
      [
        { executedAt: entryAt, side: "buy", quantity: 100, price: 10, fees: 0 },
        { executedAt: partialAt, side: "sell", quantity: 40, price: 11, fees: 0 },
        { executedAt: exitAt, side: "sell", quantity: 60, price: 12, fees: 0 },
      ],
    );

    expect(activities.map(({ date, kind, realizedPnl }) => ({ date, kind, realizedPnl })))
      .toEqual([
        { date: "2026-06-01", kind: "opened", realizedPnl: 0 },
        { date: "2026-06-02", kind: "adjusted", realizedPnl: 40 },
        { date: "2026-06-03", kind: "closed", realizedPnl: 120 },
      ]);
  });

  it("preserves cost basis through the NVDL 3-for-1 split", () => {
    const entryAt = Date.parse("2026-06-05T15:00:00Z") / 1000;
    const exitAt = Date.parse("2026-08-05T15:00:00Z") / 1000;
    const activities = tradeDayActivities(
      { symbol: "NVDL", side: "long", entryAt, exitAt },
      [
        { executedAt: entryAt, side: "buy", quantity: 100, price: 60, fees: 0 },
        { executedAt: exitAt, side: "sell", quantity: 300, price: 25, fees: 0 },
      ],
    );

    expect(activities.at(-1)).toMatchObject({
      date: "2026-08-05",
      kind: "closed",
      realizedPnl: 1500,
    });
    expect(heldCalendarDays(entryAt, exitAt)).toBe(61);
  });
});
