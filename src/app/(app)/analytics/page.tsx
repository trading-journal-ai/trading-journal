import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { isDemoReadOnly } from "@/lib/demoMode";
import { etDateString } from "@/lib/time";
import { loadAnalyticsReview } from "@/lib/loadAnalyticsReview";
import AnalyticsWorkspace from "@/components/analytics/AnalyticsWorkspace";
import AnalyticsRangePicker from "@/components/analytics/AnalyticsRangePicker";
import { journalPeriodLabel } from "@/lib/journalPeriodLabel";
import PeriodTabs from "@/components/ui/PeriodTabs";
import AnalyticsSectionTabs from "@/components/AnalyticsSectionTabs";
import styles from "@/components/analytics/AnalyticsWorkspace.module.css";

export const dynamic = "force-dynamic";

type DatePreset = "all" | "today" | "week" | "month" | "year" | "custom";

type ReportFilters = {
  date?: string;
  preset: DatePreset;
  from?: string;
  to?: string;
  symbol?: string;
  side?: "long" | "short";
  tag?: string;
  account?: string;
  view?: string; basis?: string; price?: string; a?: string; b?: string; ca?: string; cb?: string; breakdown?: string;
};

function validDate(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

function parseSearchParams(params: {
  date?: string;
  preset?: string;
  from?: string;
  to?: string;
  symbol?: string;
  side?: string;
  tag?: string;
  account?: string;
  view?: string; basis?: string; price?: string; a?: string; b?: string; ca?: string; cb?: string; breakdown?: string;
}): ReportFilters {
  const presetOptions = new Set<DatePreset>(["all", "today", "week", "month", "year", "custom"]);
  return {
    date: validDate(params.date),
    preset: presetOptions.has(params.preset as DatePreset) ? (params.preset as DatePreset) : "month",
    from: validDate(params.from),
    to: validDate(params.to),
    symbol: params.symbol?.trim().toUpperCase() || undefined,
    side: params.side === "short" ? "short" : "long",
    tag: params.tag || undefined,
    account: params.account || undefined,
    ca: params.ca, cb: params.cb, breakdown: params.breakdown, view: params.view, basis: params.basis, price: params.price, a: params.a, b: params.b,
  };
}

function hasExplicitDateScope(params: {
  date?: string;
  preset?: string;
  from?: string;
  to?: string;
}): boolean {
  return Boolean(params.date || params.preset || params.from || params.to);
}

function isoAddDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function currentEtDate(): string {
  return etDateString(Math.floor(Date.now() / 1000));
}

function lastDayOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

function yearRange(date: string): { from: string; to: string } {
  const year = date.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function weekRange(date: string): { from: string; to: string } {
  const monday = isoAddDays(date, -((isoWeekday(date) + 6) % 7));
  return { from: monday, to: isoAddDays(monday, 4) };
}

const monthLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function dateRangeLabel(from: string, to: string): string {
  const format = (date: string, includeYear: boolean) => new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(new Date(`${date}T12:00:00Z`));
  if (from.slice(0, 7) === to.slice(0, 7)) return `${format(from, false)}–${Number(to.slice(8))}, ${to.slice(0, 4)}`;
  return `${format(from, from.slice(0, 4) !== to.slice(0, 4))} – ${format(to, true)}`;
}

function monthLabel(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return monthLabelFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateRangeFor(filters: ReportFilters): { from: string; to: string } | undefined {
  if (filters.date) return { from: filters.date, to: filters.date };

  const today = currentEtDate();
  const anchor = filters.from ?? today;
  if (filters.preset === "today") return { from: anchor, to: anchor };
  if (filters.preset === "week") {
    const monday = isoAddDays(anchor, -((isoWeekday(anchor) + 6) % 7));
    return { from: monday, to: isoAddDays(monday, 4) };
  }
  if (filters.preset === "month") return { from: `${anchor.slice(0, 7)}-01`, to: lastDayOfMonth(anchor) };
  if (filters.preset === "year") return yearRange(anchor);
  if (filters.preset === "custom") {
    if (!filters.from && !filters.to) return undefined;
    return {
      from: filters.from ?? "0000-01-01",
      to: filters.to ?? "9999-12-31",
    };
  }

  return undefined;
}

function reportRangeLabel(filters: ReportFilters): string {
  const range = dateRangeFor(filters);
  if (!range) return "All dates";
  if (range.from === range.to) return journalPeriodLabel("day", range.from);
  if (filters.preset === "week") return journalPeriodLabel("week", range.from);
  if (filters.preset === "month") return monthLabel(range.from);
  if (filters.preset === "year") return range.from.slice(0, 4);
  return dateRangeLabel(range.from, range.to);
}

function filterHref(filters: ReportFilters, updates: Partial<ReportFilters>) {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.date) params.set("date", next.date);
  params.set("preset", next.preset);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.symbol) params.set("symbol", next.symbol);
  if (next.side) params.set("side", next.side);
  if (next.tag) params.set("tag", next.tag);
  if (next.account) params.set("account", next.account);
  for (const key of ["view", "basis", "price", "a", "b", "ca", "cb", "breakdown"] as const) { if (next[key]) params.set(key, next[key]!); }
  const query = params.toString();
  return query ? `/analytics?${query}` : "/analytics";
}

async function loadLatestTradeDate(accountId: number): Promise<string | null> {
  const row = (
    await db
      .select({ latestExecutionAt: sql<number | null>`max(${schema.executions.executedAt})` })
      .from(schema.executions)
      .where(eq(schema.executions.accountId, accountId))
      .limit(1)
  )[0];

  return row?.latestExecutionAt == null ? null : etDateString(row.latestExecutionAt);
}

async function defaultLandingFilters(filters: ReportFilters, accountId: number): Promise<ReportFilters> {
  if (isDemoReadOnly()) return { ...filters, preset: "year" };

  const latestTradeDate = await loadLatestTradeDate(accountId);
  if (!latestTradeDate) return { ...filters, preset: "year" };

  const today = currentEtDate();
  if (latestTradeDate === today) return { ...filters, preset: "today" };

  const currentWeek = weekRange(today);
  if (latestTradeDate >= currentWeek.from && latestTradeDate <= currentWeek.to) {
    return { ...filters, preset: "week" };
  }

  if (latestTradeDate.slice(0, 7) === today.slice(0, 7)) {
    return { ...filters, preset: "month" };
  }

  return { ...filters, preset: "year", from: latestTradeDate };
}

function DateShortcuts({ filters }: { filters: ReportFilters }) {
  const activePreset: DatePreset = filters.date ? "custom" : filters.preset;
  const presetBase = { date: undefined, from: undefined, to: undefined };
  return (
          <PeriodTabs
            ariaLabel="Analytics date range"
            items={[
              { value: "today", label: "Day", href: filterHref(filters, { ...presetBase, preset: "today" }) },
              { value: "week", label: "Week", href: filterHref(filters, { ...presetBase, preset: "week" }) },
              { value: "month", label: "Month", href: filterHref(filters, { ...presetBase, preset: "month" }) },
              { value: "year", label: "Year", href: filterHref(filters, { ...presetBase, preset: "year" }) },
              { value: "all", label: "All", href: filterHref(filters, { ...presetBase, preset: "all" }) },
            ]}
            value={activePreset}
            className={styles.dateShortcuts}
          />
  );
}

function TradeFilters({ filters, tagOptions, view, basis }: { filters: ReportFilters; tagOptions: { name: string }[]; view?: string; basis?: string }) {
  const activePreset: DatePreset = filters.date ? "custom" : filters.preset;
  return (
    <form action="/analytics" className={styles.filterPanel}>
      <input type="hidden" name="preset" value={activePreset} />
      <input type="hidden" name="view" value={view ?? "performance"} />
      <input type="hidden" name="basis" value={basis ?? "net"} />
      {(["price", "a", "b", "ca", "cb", "breakdown"] as const).map(key => filters[key] ? <input key={key} type="hidden" name={key} value={filters[key]} /> : null)}
      {filters.date && <input type="hidden" name="date" value={filters.date} />}
      {filters.from && <input type="hidden" name="from" value={filters.from} />}
      {filters.to && <input type="hidden" name="to" value={filters.to} />}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Symbol</span>
          <input name="symbol" defaultValue={filters.symbol ?? ""} placeholder="Symbol" className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Tag</span>
          <select name="tag" defaultValue={filters.tag ?? ""} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]">
            <option value="">All tags</option>
            {tagOptions.map((tagOption) => <option key={tagOption.name} value={tagOption.name}>{tagOption.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Side</span>
          <select name="side" defaultValue={filters.side ?? ""} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]">

            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="h-10 rounded-md border border-[var(--accent)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]">Apply</button>
        </div>
      </div>
    </form>
  );
}

export default async function AnalyticsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const params: Record<string, string | undefined> = Object.fromEntries(Object.entries(rawParams).map(([key,value]) => [key, typeof value === "string" ? value : undefined]));
  const account = await getActiveAccount();
  const parsed = parseSearchParams(params);
  const filters = hasExplicitDateScope(params) ? parsed : await defaultLandingFilters(parsed, account.id);
  const data = await loadAnalyticsReview(account.id);
  const range = dateRangeFor(filters);
  const history = data.rows.filter(t => (!filters.symbol || t.symbol.toUpperCase().includes(filters.symbol))
    && t.side === filters.side && (!filters.tag || t.tags.includes(filters.tag)));
  const rows = history.filter(t => !range || (t.date >= range.from && t.date <= range.to));
  const dates = history.map(t=>t.date).sort();
  const comparisonRange = {
    from: range?.from && range.from >= "1900-01-01" ? range.from : dates[0] ?? currentEtDate(),
    to: range?.to && range.to !== "9999-12-31" ? range.to : dates.at(-1) ?? currentEtDate(),
  };
  const comparing = params.view === "compare";
  const tags = [...new Set(data.rows.flatMap(t => t.tags))].sort().map(name => ({ name }));
  return <div className="mx-auto max-w-6xl">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-1">
      {comparing ? <h1 className="py-2 text-2xl font-semibold tracking-tight">Compare</h1> : <>
        <h1 className="sr-only">{reportRangeLabel(filters)}</h1>
        <AnalyticsRangePicker from={comparisonRange.from} to={comparisonRange.to} today={currentEtDate()} href={filterHref(filters, {})} label={reportRangeLabel(filters)} />
      </>}
      <AnalyticsSectionTabs active="performance" compact className="ml-auto" />
    </header>
    {!comparing && range && range.from > range.to ? <p role="alert" className="mt-5 text-sm text-[var(--red)]">Start date must be on or before end date.</p> : null}
    <AnalyticsWorkspace key={`${account.id}:${range?.from}:${range?.to}:${filters.symbol}:${filters.side}:${filters.tag}`} trades={rows} history={history} range={comparisonRange} today={currentEtDate()} dateControls={<DateShortcuts filters={filters} />} activeFilterCount={Number(Boolean(filters.symbol)) + Number(Boolean(filters.tag)) + Number(filters.side === "short")} tradeFilters={<TradeFilters filters={filters} tagOptions={tags} view={params.view} basis={params.basis} />} excluded={data.excluded} open={data.open} />
  </div>;
}
