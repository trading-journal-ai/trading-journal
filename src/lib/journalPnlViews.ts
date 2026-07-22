export type TradingCalendarCell = {
  date: string;
  day: number;
  inMonth: boolean;
};

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function addIsoDays(date: string, days: number): string {
  const next = utcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function tradingWeekDates(weekStart: string): string[] {
  return Array.from({ length: 5 }, (_, index) => addIsoDays(weekStart, index));
}

/** Monday–Friday calendar rows for a month, with quiet adjacent-month padding. */
export function tradingCalendarWeeks(monthKey: string): TradingCalendarCell[][] {
  const first = utcDate(`${monthKey}-01`);
  const [year, month] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0, 12));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  let cursor = addIsoDays(`${monthKey}-01`, -mondayOffset);
  const weeks: TradingCalendarCell[][] = [];

  while (utcDate(cursor) <= last) {
    const days = tradingWeekDates(cursor).map((date) => ({
      date,
      day: Number(date.slice(-2)),
      inMonth: date.startsWith(`${monthKey}-`),
    }));
    if (days.some((day) => day.inMonth)) weeks.push(days);
    cursor = addIsoDays(cursor, 7);
  }

  return weeks;
}
