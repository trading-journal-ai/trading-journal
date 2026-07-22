import { describe, expect, it } from "vitest";
import { tradingCalendarWeeks, tradingWeekDates } from "./journalPnlViews";

describe("journal P&L view date shaping", () => {
  it("builds a Monday through Friday week", () => {
    expect(tradingWeekDates("2026-07-06")).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
    ]);
  });

  it("places a weekend month opening into the following trading week", () => {
    const weeks = tradingCalendarWeeks("2026-08");
    expect(weeks[0].map((day) => day.date)).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
    expect(weeks.at(-1)?.map((day) => day.date)).toEqual([
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
    ]);
  });

  it("keeps adjacent weekdays as padding without treating them as in-month", () => {
    const firstWeek = tradingCalendarWeeks("2026-07")[0];
    expect(firstWeek.map((day) => [day.date, day.inMonth])).toEqual([
      ["2026-06-29", false],
      ["2026-06-30", false],
      ["2026-07-01", true],
      ["2026-07-02", true],
      ["2026-07-03", true],
    ]);
  });
});
