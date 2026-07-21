import Link from "next/link";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { isDemoReadOnly } from "@/lib/demoMode";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { grossPnl, netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";
import ReportRangeFilter from "@/components/ReportRangeFilter";
import PeriodTabs from "@/components/PeriodTabs";
import { RowLink } from "./RowLink";

export const dynamic = "force-dynamic";

type TradeSort = "date" | "symbol" | "side" | "shares" | "execs" | "entry" | "exit" | "perShare" | "pnl";
type SortDir = "asc" | "desc";
type DatePreset = "all" | "today" | "week" | "month" | "year" | "custom";

type TradeFilters = {
  date?: string;
  preset: DatePreset;
  from?: string;
  to?: string;
  symbol?: string;
  side?: "long" | "short";
  tag?: string;
  account?: string;
  sort: TradeSort;
  dir: SortDir;
  page: number;
  perPage: number;
};

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500] as const;
const DEFAULT_PAGE_SIZE = 200;

function parseSearchParams(params: {
  date?: string;
  preset?: string;
  from?: string;
  to?: string;
  symbol?: string;
  side?: string;
  tag?: string;
  account?: string;
  sort?: string;
  dir?: string;
  page?: string;
  perPage?: string;
}): TradeFilters {
  const sortOptions = new Set<TradeSort>(["date", "symbol", "side", "shares", "execs", "entry", "exit", "perShare", "pnl"]);
  const presetOptions = new Set<DatePreset>(["all", "today", "week", "month", "year", "custom"]);
  const pageSizeOptions = new Set<number>(PAGE_SIZE_OPTIONS);
  const side = params.side === "long" || params.side === "short" ? params.side : undefined;
  const sort = sortOptions.has(params.sort as TradeSort) ? (params.sort as TradeSort) : "date";
  const dir = params.dir === "asc" ? "asc" : "desc";
  const preset = presetOptions.has(params.preset as DatePreset) ? (params.preset as DatePreset) : "month";
  const page = Number.parseInt(params.page ?? "1", 10);
  const perPage = Number.parseInt(params.perPage ?? String(DEFAULT_PAGE_SIZE), 10);
  const validDate = (value: string | undefined) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  return {
    date: validDate(params.date),
    preset,
    from: validDate(params.from),
    to: validDate(params.to),
    symbol: params.symbol?.trim().toUpperCase() || undefined,
    side,
    tag: params.tag || undefined,
    account: params.account || undefined,
    sort,
    dir,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: pageSizeOptions.has(perPage) ? perPage : DEFAULT_PAGE_SIZE,
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

const dateLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function dateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dateLabelFmt.format(new Date(Date.UTC(year, month - 1, day)));
}

function monthLabel(date: string): string {
  const [year, month] = date.split("-").map(Number);
  return monthLabelFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateRangeFor(filters: TradeFilters): { from: string; to: string } | undefined {
  if (filters.date) return { from: filters.date, to: filters.date };

  const today = currentEtDate();
  const anchor = filters.from ?? today;
  if (filters.preset === "today") return { from: anchor, to: anchor };
  if (filters.preset === "week") {
    const monday = isoAddDays(anchor, -((isoWeekday(anchor) + 6) % 7));
    return { from: monday, to: isoAddDays(monday, 4) };
  }
  if (filters.preset === "month") {
    return { from: `${anchor.slice(0, 7)}-01`, to: lastDayOfMonth(anchor) };
  }
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

async function loadTrades(filters: TradeFilters, accountId: number) {
  const { symbol, side, tag, sort, dir, perPage } = filters;
  const range = dateRangeFor(filters);
  const accountWhere = eq(schema.trades.accountId, accountId);
  const where =
    range
      ? (() => {
          const { start } = etDayRange(range.from);
          const { end } = etDayRange(range.to);
          return and(accountWhere, gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end));
        })()
      : accountWhere;

  let rows = await db
    .select()
    .from(schema.trades)
    .where(where)
    .limit(2000);

  // The epoch window has slack for DST; refine to exact ET market dates.
  if (range) {
    rows = rows.filter((t) => {
      if (t.entryAt == null) return false;
      const entryDate = etDateString(t.entryAt);
      return entryDate >= range.from && entryDate <= range.to;
    });
  }
  if (symbol) rows = rows.filter((t) => t.symbol.toUpperCase().includes(symbol));
  if (side) rows = rows.filter((t) => t.side === side);

  const execCounts = await db
    .select({ tradeId: schema.executions.tradeId, n: sql<number>`count(*)` })
    .from(schema.executions)
    .groupBy(schema.executions.tradeId);

  const countByTrade = new Map(execCounts.map((r) => [r.tradeId, r.n]));

  if (tag) {
    const taggedRows = await db
      .select({
        tradeId: schema.tradeTags.tradeId,
        name: schema.tags.name,
      })
      .from(schema.tradeTags)
      .innerJoin(schema.tags, sql`${schema.tags.id} = ${schema.tradeTags.tagId}`);
    const taggedTradeIds = new Set(taggedRows.filter((r) => r.name === tag).map((r) => r.tradeId));
    rows = rows.filter((t) => taggedTradeIds.has(t.id));
  }

  const mapped = rows.map((t) => {
    const gross = grossPnl(t);
    return {
      ...t,
      execs: countByTrade.get(t.id) ?? 0,
      pnl: netPnl(t),
      perShare: gross == null || t.quantity === 0 ? null : gross / Math.abs(t.quantity),
    };
  });
  const multiplier = dir === "asc" ? 1 : -1;
  mapped.sort((a, b) => {
    const value = (t: (typeof mapped)[number]): string | number | null => {
      switch (sort) {
        case "symbol": return t.symbol;
        case "side": return t.side;
        case "shares": return t.quantity;
        case "execs": return t.execs;
        case "entry": return t.avgEntryPrice;
        case "exit": return t.avgExitPrice;
        case "perShare": return t.perShare;
        case "pnl": return t.pnl;
        case "date":
        default: return t.entryAt ?? 0;
      }
    };
    const av = value(a);
    const bv = value(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * multiplier;
    return (Number(av) - Number(bv)) * multiplier;
  });

  const total = mapped.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(filters.page, totalPages);
  const start = (page - 1) * perPage;

  return {
    page,
    total,
    totalPages,
    trades: mapped.slice(start, start + perPage),
  };
}

async function loadTagOptions() {
  return db.select({ name: schema.tags.name }).from(schema.tags);
}

async function loadLatestTradeDate(accountId: number): Promise<string | null> {
  const row = (
    await db
      .select({ latestEntryAt: sql<number | null>`max(${schema.trades.entryAt})` })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId))
      .limit(1)
  )[0];

  return row?.latestEntryAt == null ? null : etDateString(row.latestEntryAt);
}

async function defaultLandingFilters(filters: TradeFilters, accountId: number): Promise<TradeFilters> {
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

function filterHref(filters: TradeFilters, updates: Partial<TradeFilters>) {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.date) params.set("date", next.date);
  if (next.preset !== "all") params.set("preset", next.preset);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  if (next.symbol) params.set("symbol", next.symbol);
  if (next.side) params.set("side", next.side);
  if (next.tag) params.set("tag", next.tag);
  if (next.account) params.set("account", next.account);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.perPage !== DEFAULT_PAGE_SIZE) params.set("perPage", String(next.perPage));
  params.set("sort", next.sort);
  params.set("dir", next.dir);
  return `/trades?${params.toString()}`;
}

function rangeSummary(filters: TradeFilters, shownCount: number, totalCount: number, page: number): { title: string; detail: string } {
  const range = dateRangeFor(filters);
  const firstShown = totalCount === 0 ? 0 : (page - 1) * filters.perPage + 1;
  const lastShown = firstShown + shownCount - 1;
  const countLabel =
    totalCount > shownCount
      ? `Showing ${firstShown.toLocaleString()}-${lastShown.toLocaleString()} of ${totalCount.toLocaleString()}`
      : shownCount === 1 ? "Showing 1" : `Showing ${shownCount.toLocaleString()}`;

  if (!range) {
    return {
      title: "All trades",
      detail: countLabel,
    };
  }

  if (range.from === range.to) {
    return { title: dateLabel(range.from), detail: countLabel };
  }

  if (filters.preset === "month") {
    return { title: monthLabel(range.from), detail: countLabel };
  }

  if (filters.preset === "year") {
    return { title: range.from.slice(0, 4), detail: countLabel };
  }

  return { title: `${dateLabel(range.from)} to ${dateLabel(range.to)}`, detail: countLabel };
}

function paginationItems(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b);

  return pages.flatMap((item, index) => {
    const previous = pages[index - 1];
    return previous && item - previous > 1 ? ["..." as const, item] : [item];
  });
}

function SortHeader({
  label,
  sort,
  filters,
}: {
  label: string;
  sort: TradeSort;
  filters: TradeFilters;
}) {
  const active = filters.sort === sort;
  const nextDir: SortDir = active && filters.dir === "asc" ? "desc" : "asc";
  return (
    <Link
      href={filterHref(filters, { sort, dir: nextDir, page: 1 })}
      className="inline-flex items-center gap-1 hover:text-[var(--foreground)]"
    >
      {label}
      <span className="text-[5px] leading-none">{active && filters.dir === "asc" ? "▲" : "▼"}</span>
    </Link>
  );
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    preset?: string;
    from?: string;
    to?: string;
    symbol?: string;
    side?: string;
    tag?: string;
    account?: string;
    sort?: string;
    dir?: string;
    page?: string;
    perPage?: string;
  }>;
}) {
  const rawSearchParams = await searchParams;
  const parsedFilters = parseSearchParams(rawSearchParams);
  const activeAccount = await getActiveAccount();
  const filters = hasExplicitDateScope(rawSearchParams)
    ? parsedFilters
    : await defaultLandingFilters(parsedFilters, activeAccount.id);
  const { trades, total, page, totalPages } = await loadTrades(filters, activeAccount.id);
  const tagOptions = await loadTagOptions();
  const date = filters.date;
  const activePreset: DatePreset = date ? "custom" : filters.preset;
  const pageFilters = { ...filters, page };
  const currentHref = filterHref(pageFilters, {});
  const summary = rangeSummary(filters, trades.length, total, page);
  const presetBase = { date: undefined, from: undefined, to: undefined };
  const navButtonClass = "flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]";
  const disabledNavButtonClass = "flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] opacity-40";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <form action="/trades" className="space-y-4">
        <input type="hidden" name="sort" value={filters.sort} />
        <input type="hidden" name="dir" value={filters.dir} />
        <input type="hidden" name="page" value="1" />
        <input type="hidden" name="perPage" value={filters.perPage} />

        <input type="hidden" name="preset" value={activePreset} />
        {filters.date && <input type="hidden" name="date" value={filters.date} />}
        {filters.from && <input type="hidden" name="from" value={filters.from} />}
        {filters.to && <input type="hidden" name="to" value={filters.to} />}

        <div className="relative space-y-2">
          <span className="block text-sm font-semibold text-[var(--muted)]">Date range</span>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <PeriodTabs
              ariaLabel="Trade date range"
              items={[
                { value: "today", label: "Day", href: filterHref(filters, { ...presetBase, preset: "today", page: 1 }) },
                { value: "week", label: "Week", href: filterHref(filters, { ...presetBase, preset: "week", page: 1 }) },
                { value: "month", label: "Month", href: filterHref(filters, { ...presetBase, preset: "month", page: 1 }) },
                { value: "year", label: "Year", href: filterHref(filters, { ...presetBase, preset: "year", page: 1 }) },
              ]}
              value={activePreset}
              className="border-b border-[var(--hairline)]"
            />
            <div className="flex flex-wrap gap-2">
              <ReportRangeFilter from={filters.from} to={filters.to} clearHref="/trades" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
          <label className="space-y-1">
            <span className="block text-sm font-semibold text-[var(--muted)]">Symbol</span>
            <input
              name="symbol"
              defaultValue={filters.symbol ?? ""}
              placeholder="Symbol"
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            />
          </label>

          <label className="space-y-1">
            <span className="block text-sm font-semibold text-[var(--muted)]">Tag</span>
            <select
              name="tag"
              defaultValue={filters.tag ?? ""}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">All tags</option>
              {tagOptions.map((tagOption) => (
                <option key={tagOption.name} value={tagOption.name}>
                  {tagOption.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="block text-sm font-semibold text-[var(--muted)]">Side</span>
            <select
              name="side"
              defaultValue={filters.side ?? ""}
              className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">All sides</option>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="h-10 rounded-md border border-[var(--accent)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-wrap items-baseline justify-between gap-3 pt-6">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{summary.title}</h1>
        </div>
        <span className="text-sm font-semibold text-[var(--muted)]">{summary.detail}</span>
      </div>

      <div className="overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]">
        <table className="w-full bg-[var(--surface)] text-sm">
          <thead style={{ backgroundColor: "var(--background)" }}>
            <tr className="border-b border-[var(--hairline)] text-left font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Date" sort="date" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Symbol" sort="symbol" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Side" sort="side" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Shares" sort="shares" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Execs" sort="execs" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Entry" sort="entry" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Exit" sort="exit" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="Per Share" sort="perShare" filters={filters} /></th>
              <th className="px-3 py-3 font-semibold whitespace-nowrap"><SortHeader label="P&L" sort="pnl" filters={filters} /></th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-[var(--muted)]">
                  {date ? `No trades on ${fmtDate(etDayRange(date).start)} match these filters.` : "No trades match these filters."}
                </td>
              </tr>
            ) : trades.map((t) => {
              const net = t.pnl;
              const pos = (net ?? 0) >= 0;
              const perSharePos = (t.perShare ?? 0) >= 0;
              return (
                <RowLink
                  key={t.id}
                  href={t.entryAt == null
                    ? currentHref
                    : `/trades/review?date=${etDateString(t.entryAt)}&symbol=${t.symbol}&trade=${t.id}&returnTo=${encodeURIComponent(currentHref)}`}
                  className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)] cursor-pointer"
                >
                  <td className="px-3 py-3 whitespace-nowrap">{fmtDate(t.entryAt)}</td>
                  <td className="px-3 py-3 font-medium">
                    {t.entryAt == null ? (
                      t.symbol
                    ) : (
                      <Link
                        href={`/trades/review?date=${etDateString(t.entryAt)}&symbol=${t.symbol}&trade=${t.id}&returnTo=${encodeURIComponent(currentHref)}`}
                        className="hover:text-[var(--accent)] hover:underline"
                      >
                        {t.symbol}
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-3 text-[var(--muted)] capitalize">{t.side}</td>
                  <td className="px-3 py-3 tabular-nums">{t.quantity.toLocaleString()}</td>
                  <td className="px-3 py-3 tabular-nums">{t.execs}</td>
                  <td className="px-3 py-3 tabular-nums">{fmtPrice(t.avgEntryPrice)}</td>
                  <td className="px-3 py-3 tabular-nums">{fmtPrice(t.avgExitPrice)}</td>
                  <td
                    className="px-3 py-3 tabular-nums"
                    style={{ color: perSharePos ? "var(--green)" : "var(--red)" }}
                  >
                    {t.perShare == null ? "—" : fmtMoney(t.perShare)}
                  </td>
                  <td
                    className="px-3 py-3 tabular-nums"
                    style={{ color: pos ? "var(--green)" : "var(--red)" }}
                  >
                    {net == null ? "—" : fmtMoney(net)}
                  </td>
                </RowLink>
              );
            })}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <nav className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]" aria-label="Trade pages">
          <div className="text-sm font-semibold text-[var(--muted)]">
            Page {page} of {totalPages}
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {page > 1 ? (
                <Link href={filterHref(filters, { page: page - 1 })} className={navButtonClass}>
                  Previous
                </Link>
              ) : (
                <span aria-disabled="true" className={disabledNavButtonClass}>Previous</span>
              )}

              {paginationItems(page, totalPages).map((item, index) => (
                item === "..." ? (
                  <span key={`ellipsis-${index}`} className="flex h-10 items-center px-2 text-sm font-semibold text-[var(--muted)]">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={filterHref(filters, { page: item })}
                    className={`flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-semibold ${
                      item === page
                        ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {item}
                  </Link>
                )
              ))}

              {page < totalPages ? (
                <Link href={filterHref(filters, { page: page + 1 })} className={navButtonClass}>
                  Next
                </Link>
              ) : (
                <span aria-disabled="true" className={disabledNavButtonClass}>Next</span>
              )}
            </div>
          ) : (
            <div />
          )}
          <form action="/trades" className="flex items-center justify-start gap-2 md:justify-end">
            <input type="hidden" name="sort" value={filters.sort} />
            <input type="hidden" name="dir" value={filters.dir} />
            <input type="hidden" name="page" value="1" />
            {filters.date && <input type="hidden" name="date" value={filters.date} />}
            {filters.preset !== "all" && <input type="hidden" name="preset" value={filters.preset} />}
            {filters.from && <input type="hidden" name="from" value={filters.from} />}
            {filters.to && <input type="hidden" name="to" value={filters.to} />}
            {filters.symbol && <input type="hidden" name="symbol" value={filters.symbol} />}
            {filters.side && <input type="hidden" name="side" value={filters.side} />}
            {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
            {filters.account && <input type="hidden" name="account" value={filters.account} />}
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
              Show
              <select
                name="perPage"
                defaultValue={String(filters.perPage)}
                className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              Apply
            </button>
          </form>
        </nav>
      )}
    </div>
  );
}
