import { describe, expect, it } from "vitest";
import { calendarWeeks, isCalendarDate, isCalendarDayDetail, sumCalendarSessions, type CalendarSession } from "./monthCalendar";
import { formatCalendarAccuracy, formatCalendarProfitFactor } from "./calendarMetrics";

const session = (date: string, changes: Partial<CalendarSession> = {}): CalendarSession => ({ date, trades: 1, pnl: 10, wins: 1, losses: 0, grossProfit: 10, grossLoss: 0, ...changes });

describe("shared month calendar", () => {
  it("retains out-of-range day evidence while excluding it from totals", () => {
    const weeks = calendarWeeks({ month: "2026-07", sessions: [session("2026-07-01"), session("2026-07-02")], range: { from: "2026-07-02", to: "2026-07-02" } });
    const excluded = weeks[0].days.find((day) => day.date === "2026-07-01");
    expect(excluded).toMatchObject({ inRange: false, session: { trades: 1, pnl: 10 } });
    expect(weeks[0].totals).toMatchObject({ trades: 1, pnl: 10 });
  });
  it("ignores padding-month and weekend sessions in the weekday totals", () => {
    const weeks = calendarWeeks({ month: "2026-07", sessions: [session("2026-06-30"), session("2026-07-01"), session("2026-07-04")] });
    expect(weeks[0].days.find((day) => day.date === "2026-06-30")?.session).toBeUndefined();
    expect(sumCalendarSessions(weeks.map((week) => week.totals)).trades).toBe(1);
  });
  it("calculates range metrics from raw outcomes, not averages of daily ratios", () => {
    const totals = sumCalendarSessions([
      session("2026-07-01", { trades: 10, wins: 1, losses: 1, grossProfit: 40, grossLoss: 20 }),
      session("2026-07-02", { trades: 2, wins: 2, losses: 0, grossProfit: 20, grossLoss: 0 }),
    ]);
    expect(formatCalendarAccuracy(totals.wins, totals.losses)).toBe("75%");
    expect(formatCalendarProfitFactor(totals.grossProfit, totals.grossLoss)).toBe("3.00");
  });
  it("does not turn zero-trade comparison rows into traded calendar days", () => {
    const weeks = calendarWeeks({ month: "2026-07", sessions: [session("2026-07-01", { trades: 0 })] });
    expect(weeks[0].days.find((day) => day.date === "2026-07-01")?.session).toBeUndefined();
  });
  it("validates calendar dates and the day payload before rendering it", () => {
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2026-13-01")).toBe(false);
    expect(isCalendarDayDetail({ accountId: 1, date: "2026-07-01", rows: [] })).toBe(true);
    expect(isCalendarDayDetail({ accountId: 1, date: "2026-07-01", rows: [{ id: 1, symbol: "TEST", time: "09:30", pnl: "bad", tags: [] }] })).toBe(false);
  });
});
