import { describe, expect, it } from "vitest";
import { averagePnlPerShare, formatPerShareMoney } from "./averagePnlPerShare";
import { calendarWeeks, sumCalendarSessions, type CalendarSession } from "./monthCalendar";

const session = (date: string, perShareTrades: CalendarSession["perShareTrades"]): CalendarSession => ({
  date, perShareTrades, trades: perShareTrades?.length ?? 0,
  pnl: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0,
});

describe("average P&L per share", () => {
  it("averages per-trade results with equal weight, including losses and breakevens", () => {
    const trades = [
      { id: 1, pnl: 100, quantity: 100 },
      { id: 2, pnl: -100, quantity: 1000 },
      { id: 3, pnl: 0, quantity: 200 },
    ];
    expect(averagePnlPerShare(trades.map((trade) => ({ id: trade.id, perShare: trade.pnl / trade.quantity })))).toBeCloseTo(0.3);
  });

  it("combines a multi-session trade before averaging it with other trades", () => {
    expect(averagePnlPerShare([
      { id: 1, perShare: 0.1 }, { id: 2, perShare: -0.2 }, { id: 1, perShare: 0.3 },
    ])).toBeCloseTo(0.1);
  });

  it("excludes missing and invalid results but preserves zero", () => {
    expect(averagePnlPerShare([
      { id: 1, perShare: null }, { id: 2, perShare: NaN },
      { id: 3, perShare: Infinity }, { id: 4, perShare: 0 },
      { id: 5, perShare: -0.5 },
    ])).toBe(-0.25);
    expect(averagePnlPerShare([])).toBeNull();
    expect(averagePnlPerShare([{ id: 1, perShare: null }])).toBeNull();
  });

  it("combines uneven sessions by trade rather than averaging daily means", () => {
    const totals = sumCalendarSessions([
      session("2026-07-01", [{ id: 1, perShare: 0.1 }]),
      session("2026-07-02", [{ id: 2, perShare: 0.2 }, { id: 3, perShare: 0.3 }]),
    ]);
    expect(averagePnlPerShare(totals.perShareTrades ?? [])).toBeCloseTo(0.2);
  });

  it("uses only in-range calendar results while combining a trade across days", () => {
    const weeks = calendarWeeks({ month: "2026-07", range: { from: "2026-07-02" }, sessions: [
      session("2026-07-01", [{ id: 1, perShare: 100 }]),
      session("2026-07-02", [{ id: 2, perShare: 0.1 }, { id: 3, perShare: 0.2 }]),
      session("2026-07-03", [{ id: 2, perShare: 0.3 }]),
    ] });
    expect(averagePnlPerShare(sumCalendarSessions(weeks.map((week) => week.totals)).perShareTrades ?? [])).toBeCloseTo(0.3);
  });

  it("matches signed per-share money and preserves sub-cent results", () => {
    expect(formatPerShareMoney(0.14)).toBe("+$0.14");
    expect(formatPerShareMoney(-0.14)).toBe("−$0.14");
    expect(formatPerShareMoney(0)).toBe("$0.00");
    expect(formatPerShareMoney(0.0014)).toBe("+$0.0014");
    expect(formatPerShareMoney(null)).toBe("—");
  });
});
