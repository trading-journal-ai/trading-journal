import type { JournalPeriodScope } from "./journalPeriodLabel";

/** Only restore another view of this page, never an external destination. */
export function validArchiveReturnTo(value?: string): string | undefined {
  const path = "/analytics/momentum-archive";
  if (!value || value.length > 4096 || (value !== path && !value.startsWith(`${path}?`))) return undefined;
  const params = new URLSearchParams(value.slice(path.length + 1));
  const view = params.get("view");
  if (view && !["day", "week", "month", "range"].includes(view)) return undefined;
  params.delete("returnTo");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function validArchiveDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
}

/** Publication dates come from source health, including sessions with no movers. */
export function latestPublishedArchiveDate(today: string, dates: (string | null | undefined)[]) {
  return dates
    .map((value) => validArchiveDate(value ?? undefined))
    .filter((value): value is string => value !== undefined && value <= today)
    .sort()
    .at(-1);
}

export function archiveDayTabDate(selectedDate: string | undefined, latestDate: string) {
  return selectedDate && selectedDate <= latestDate ? selectedDate : latestDate;
}

/** Match Journal's Monday–Friday week and calendar-month boundaries. */
export function archivePeriodRange(scope: JournalPeriodScope, value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  if (scope === "day") return { from: value, to: value };
  if (scope === "week") {
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const from = date.toISOString().slice(0, 10);
    date.setUTCDate(date.getUTCDate() + 4);
    return { from, to: date.toISOString().slice(0, 10) };
  }
  date.setUTCDate(1);
  const from = date.toISOString().slice(0, 10);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return { from, to: date.toISOString().slice(0, 10) };
}

/** Change the anchor date while keeping session, sort, and other filters. */
export function archiveDateHref(href: string, date: string, scope?: JournalPeriodScope) {
  const [path, query] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("date", date);
  if (scope === "day") params.delete("view");
  else if (scope) params.set("view", scope);
  for (const key of ["page", "all", "more", "from", "to"]) params.delete(key);
  return `${path}?${params.toString()}`;
}

export function validArchiveRange(from?: string, to?: string) {
  const start = validArchiveDate(from);
  const end = validArchiveDate(to);
  return start && end && start <= end ? { from: start, to: end } : null;
}

export function archiveRangeHref(href: string, from: string, to: string) {
  const [path, query] = archiveDateHref(href, from).split("?");
  const params = new URLSearchParams(query);
  params.set("view", "range");
  params.set("from", from);
  params.set("to", to);
  return `${path}?${params.toString()}`;
}

/** Step custom ranges by their inclusive calendar-day length. */
export function shiftArchiveRange(range: { from: string; to: string }, direction: -1 | 1) {
  const start = Date.parse(`${range.from}T12:00:00Z`);
  const end = Date.parse(`${range.to}T12:00:00Z`);
  const offset = (end - start + 86_400_000) * direction;
  return {
    from: new Date(start + offset).toISOString().slice(0, 10),
    to: new Date(end + offset).toISOString().slice(0, 10),
  };
}
