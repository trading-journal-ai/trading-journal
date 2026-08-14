export type JournalPeriodScope = "day" | "week" | "month";

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const monthNameFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});

const monthYearFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
    12,
  ));
}

function weekRangeLabel(date: Date): string {
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const start = addUtcDays(date, -mondayOffset);
  const end = addUtcDays(start, 4);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && start.getUTCMonth() === end.getUTCMonth()) {
    return `${monthNameFmt.format(start)} ${start.getUTCDate()} - ${end.getUTCDate()} ${endYear}`;
  }

  if (startYear === endYear) {
    return `${monthDayFmt.format(start)} - ${monthDayFmt.format(end)} ${endYear}`;
  }

  return `${monthDayFmt.format(start)} ${startYear} - ${monthDayFmt.format(end)} ${endYear}`;
}

export function journalPeriodLabel(scope: JournalPeriodScope, date: string): string {
  const resolvedDate = utcDate(date);
  if (scope === "week") return weekRangeLabel(resolvedDate);
  if (scope === "month") return monthYearFmt.format(resolvedDate);
  return `${weekdayFmt.format(resolvedDate)}, ${monthDayFmt.format(resolvedDate)}`;
}
