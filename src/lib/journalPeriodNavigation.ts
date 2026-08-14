import type { JournalPeriodScope } from "./journalPeriodLabel";

export type JournalPeriodNavigationTarget = {
  date: string;
  href: string;
};

export type JournalPeriodNavigation = Record<
  JournalPeriodScope,
  {
    today: JournalPeriodNavigationTarget;
    previous: JournalPeriodNavigationTarget;
    next: JournalPeriodNavigationTarget;
  }
>;

function addUtcDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function addTradingDays(date: string, days: number): string {
  const direction = days < 0 ? -1 : 1;
  let remaining = Math.abs(days);
  let next = date;

  while (remaining > 0) {
    next = addUtcDays(next, direction);
    const weekday = new Date(`${next}T12:00:00Z`).getUTCDay();
    if (weekday >= 1 && weekday <= 5) remaining -= 1;
  }

  return next;
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastTargetDay = new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth() + 1,
    0,
  )).getUTCDate();

  return new Date(Date.UTC(
    targetMonth.getUTCFullYear(),
    targetMonth.getUTCMonth(),
    Math.min(day, lastTargetDay),
  )).toISOString().slice(0, 10);
}

export function shiftJournalPeriod(
  scope: JournalPeriodScope,
  date: string,
  direction: -1 | 1,
): string {
  if (scope === "week") return addUtcDays(date, direction * 7);
  if (scope === "month") return addMonths(date, direction);
  return addTradingDays(date, direction);
}

export function journalPeriodHref(
  basePath: string,
  date: string,
  scope: JournalPeriodScope,
): string {
  const params = new URLSearchParams({ date });
  if (scope !== "day") params.set("scope", scope);
  return `${basePath}?${params.toString()}`;
}

export function buildJournalPeriodNavigation(
  basePath: string,
  selectedDate: string,
  todayDate: string,
): JournalPeriodNavigation {
  const buildScope = (scope: JournalPeriodScope) => {
    const previousDate = shiftJournalPeriod(scope, selectedDate, -1);
    const nextDate = shiftJournalPeriod(scope, selectedDate, 1);

    return {
      today: {
        date: todayDate,
        href: journalPeriodHref(basePath, todayDate, scope),
      },
      previous: {
        date: previousDate,
        href: journalPeriodHref(basePath, previousDate, scope),
      },
      next: {
        date: nextDate,
        href: journalPeriodHref(basePath, nextDate, scope),
      },
    };
  };

  return {
    day: buildScope("day"),
    week: buildScope("week"),
    month: buildScope("month"),
  };
}
