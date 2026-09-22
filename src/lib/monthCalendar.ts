import type { TradePerShareResult } from "@/lib/averagePnlPerShare";
import { tradingCalendarWeeks } from "@/lib/journalPnlViews";

export type CalendarTotals = {
  perShareTrades?: TradePerShareResult[];
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
};
export type CalendarSession = CalendarTotals & { date: string };
export type CalendarMonthData = {
  accountId: number;
  month: string;
  today: string;
  sessions: CalendarSession[];
  noTradeDates: string[];
  readOnly: boolean;
  range?: { from?: string; to?: string };
};
export type CalendarTradeRow = {
  id: number;
  symbol: string;
  time: string;
  pnl: number;
  tags: string[];
};
export type CalendarDayDetail = { accountId: number; date: string; rows: CalendarTradeRow[] };

export function sumCalendarSessions(sessions: readonly CalendarTotals[]): CalendarTotals {
  return sessions.reduce<CalendarTotals>((total, session) => ({
    perShareTrades: [...(total.perShareTrades ?? []), ...(session.perShareTrades ?? [])],
    pnl: total.pnl + session.pnl, trades: total.trades + session.trades,
    wins: total.wins + session.wins, losses: total.losses + session.losses,
    grossProfit: total.grossProfit + session.grossProfit, grossLoss: total.grossLoss + session.grossLoss,
  }), { pnl: 0, trades: 0, wins: 0, losses: 0, grossProfit: 0, grossLoss: 0 });
}

export function calendarWeeks(data: Pick<CalendarMonthData, "month" | "sessions" | "range">) {
  const byDate = new Map(data.sessions.filter((row) => row.trades > 0).map((row) => [row.date, row]));
  return tradingCalendarWeeks(data.month).map((week) => {
    const days = week.map((day) => ({
      ...day,
      session: day.inMonth ? byDate.get(day.date) : undefined,
      inRange: (!data.range?.from || day.date >= data.range.from) && (!data.range?.to || day.date <= data.range.to),
    }));
    return { days, totals: sumCalendarSessions(days.flatMap((day) => day.inRange && day.session ? [day.session] : [])) };
  });
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isCalendarDayDetail(value: unknown): value is CalendarDayDetail {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return Number.isInteger(data.accountId) && typeof data.date === "string" && isCalendarDate(data.date)
    && Array.isArray(data.rows) && data.rows.every((row: unknown) => {
      if (typeof row !== "object" || row === null) return false;
      const trade = row as Record<string, unknown>;
      return Number.isInteger(trade.id) && typeof trade.symbol === "string" && typeof trade.time === "string"
        && typeof trade.pnl === "number" && Number.isFinite(trade.pnl)
        && Array.isArray(trade.tags) && trade.tags.every((tag: unknown) => typeof tag === "string");
    });
}
