import Link from "next/link";
import AnalyticsSectionTabs from "@/components/AnalyticsSectionTabs";
import MomentumArchiveKeyboardNav from "@/components/MomentumArchiveKeyboardNav";
import MomentumArchiveLinkSelect from "@/components/MomentumArchiveLinkSelect";
import MomentumArchiveTable from "@/components/MomentumArchiveTable";
import {
  createMarketArchiveClient,
  type ArchiveMoverSort,
  type ArchivePeakSession,
  type ArchiveSortDirection,
  type ArchiveUniverse,
} from "@/lib/marketArchive";

export const dynamic = "force-dynamic";

type ArchiveView = "archive" | "day";

const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
/** "Show more" reaches down to here — near-misses worth a glance, without a data dump. */
const CONTEXT_FLOOR = 30;
const ARCHIVE_THRESHOLD = 50;

/** Columns whose first click should show the biggest values, not the smallest. */
const DESC_FIRST = new Set<ArchiveMoverSort>(["date", "dollarVolume", "gain", "high", "rvol", "volume"]);

const SORTS = new Set<ArchiveMoverSort>([
  "date", "dollarVolume", "gain", "high", "name", "price", "rvol", "symbol", "volume",
]);

type SearchParameters = {
  date?: string;
  direction?: string;
  from?: string;
  minGain?: string;
  minRvol?: string;
  page?: string;
  more?: string;
  q?: string;
  session?: string;
  size?: string;
  sort?: string;
  to?: string;
  universe?: string;
  view?: string;
};

type ArchiveFilters = {
  date?: string;
  direction: ArchiveSortDirection;
  from?: string;
  minGain?: number;
  minRvol?: number;
  page: number;
  pageSize: number;
  showContext: boolean;
  query?: string;
  peakSession: ArchivePeakSession;
  sort: ArchiveMoverSort;
  to?: string;
  universe: ArchiveUniverse;
  view: ArchiveView;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function positiveNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseFilters(parameters: SearchParameters): ArchiveFilters {
  const sessions = new Set<ArchivePeakSession>(["all", "premarket", "regular", "afterHours"]);
  const size = Number(parameters.size);
  const page = Number(parameters.page);
  return {
    date: validDate(parameters.date),
    direction: parameters.direction === "asc" ? "asc" : "desc",
    from: validDate(parameters.from),
    minGain: positiveNumber(parameters.minGain),
    minRvol: positiveNumber(parameters.minRvol),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    query: parameters.q?.trim() || undefined,
    showContext: parameters.more === "1",
    peakSession: sessions.has(parameters.session as ArchivePeakSession)
      ? parameters.session as ArchivePeakSession
      : "all",
    sort: SORTS.has(parameters.sort as ArchiveMoverSort) ? parameters.sort as ArchiveMoverSort : "gain",
    to: validDate(parameters.to),
    universe: parameters.universe === "raw" ? "raw" : "core",
    view: parameters.view === "archive" ? "archive" : "day",
  };
}

function archiveQuery(filters: ArchiveFilters, updates: Partial<ArchiveFilters>) {
  const next = { ...filters, ...updates };
  const parameters = new URLSearchParams();
  if (next.view !== "day") parameters.set("view", next.view);
  if (next.date) parameters.set("date", next.date);
  if (next.universe !== "core") parameters.set("universe", next.universe);
  if (next.peakSession !== "all") parameters.set("session", next.peakSession);
  if (next.sort !== "gain") parameters.set("sort", next.sort);
  if (next.direction !== "desc") parameters.set("direction", next.direction);
  if (next.query) parameters.set("q", next.query);
  if (next.from) parameters.set("from", next.from);
  if (next.to) parameters.set("to", next.to);
  if (next.minGain !== undefined) parameters.set("minGain", String(next.minGain));
  if (next.minRvol !== undefined) parameters.set("minRvol", String(next.minRvol));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) parameters.set("size", String(next.pageSize));
  if (next.page > 1) parameters.set("page", String(next.page));
  if (next.showContext) parameters.set("more", "1");
  return parameters.toString();
}

function archiveHref(filters: ArchiveFilters, updates: Partial<ArchiveFilters>) {
  const query = archiveQuery(filters, updates);
  return query ? `/analytics/momentum-archive?${query}` : "/analytics/momentum-archive";
}

/** Every sortable column's link: toggle when active, sensible default when not. */
function sortHrefs(filters: ArchiveFilters) {
  const entries = [...SORTS].map((sort) => {
    const direction: ArchiveSortDirection = filters.sort === sort
      ? (filters.direction === "asc" ? "desc" : "asc")
      : (DESC_FIRST.has(sort) ? "desc" : "asc");
    return [sort, archiveHref(filters, { direction, page: 1, sort })] as const;
  });
  return Object.fromEntries(entries) as Partial<Record<ArchiveMoverSort, string>>;
}

function dateValue(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function formattedDate(date: string) {
  return dateFormatter.format(dateValue(date));
}

function shortDate(date: string) {
  return shortDateFormatter.format(dateValue(date));
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

const controlClass = "h-10 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--body)] outline-none transition-colors focus:border-[var(--accent)]";
const fieldClass = "grid min-w-0 gap-1.5 text-[12px] font-medium text-[var(--muted)]";
const quietButtonClass = "inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--body)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

function ArchiveViewButtons({ filters }: { filters: ArchiveFilters }) {
  const items = [
    {
      active: filters.view === "day",
      href: archiveHref(filters, {
        direction: "desc",
        from: undefined,
        minGain: undefined,
        minRvol: undefined,
        page: 1,
        query: undefined,
        sort: "gain",
        to: undefined,
        view: "day",
      }),
      label: "Day by day",
    },
    {
      active: filters.view === "archive",
      href: archiveHref(filters, { page: 1, view: "archive" }),
      label: "Full archive",
    },
  ];
  return (
    <div className="flex flex-wrap gap-2 pt-7 pb-2">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`inline-flex h-10 items-center rounded-md border px-4 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            item.active
              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
              : "border-[var(--border)] bg-[var(--surface)] text-[var(--body)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function SegmentedLinks({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: Array<{ active: boolean; href: string; label: string }>;
}) {
  return (
    <div aria-label={ariaLabel} className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-[4px] px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
            item.active
              ? "bg-[var(--foreground)] text-[var(--background)] shadow-sm"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Filters which movers appear by where the day's high happened. */
function PeakSessionControl({ filters }: { filters: ArchiveFilters }) {
  return (
    <SegmentedLinks
      ariaLabel="Peak session"
      items={[
        { active: filters.peakSession === "all", href: archiveHref(filters, { page: 1, peakSession: "all" }), label: "All" },
        { active: filters.peakSession === "premarket", href: archiveHref(filters, { page: 1, peakSession: "premarket" }), label: "Premarket" },
        { active: filters.peakSession === "regular", href: archiveHref(filters, { page: 1, peakSession: "regular" }), label: "Regular" },
        { active: filters.peakSession === "afterHours", href: archiveHref(filters, { page: 1, peakSession: "afterHours" }), label: "After-hours" },
      ]}
    />
  );
}

function StatStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="flex flex-wrap border-b border-[var(--hairline)]">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-32 py-4 pr-8 ${index === 0 ? "" : "border-l border-[var(--hairline)] pl-8"}`}
        >
          <dt className="text-[11px] font-medium text-[var(--muted)]">{item.label}</dt>
          <dd className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--foreground)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NavigationButton({ href, children }: { href?: string; children: string }) {
  if (!href) return <span aria-disabled="true" className={`${quietButtonClass} cursor-not-allowed opacity-40`}>{children}</span>;
  return <Link href={href} className={quietButtonClass}>{children}</Link>;
}

function UnavailableArchive({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsSectionTabs active="momentum" className="mb-0" />
      <div className="max-w-2xl py-10">
        <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Momentum Archive</h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--body)]">
          The Journal-owned archive is not available on this machine ({reason}). Run the local archive migration and verification scripts, then reload this page.
        </p>
      </div>
    </div>
  );
}

export default async function MomentumArchivePage({
  searchParams,
}: {
  searchParams: Promise<SearchParameters>;
}) {
  const filters = parseFilters(await searchParams);
  const client = createMarketArchiveClient();
  const health = client.health();
  if (!health.available || !health.coverage || !health.counts) {
    return <UnavailableArchive reason={health.reason?.replaceAll("_", " ") ?? "invalid archive"} />;
  }

  const days = client.listTradingDays(filters.universe);
  const selectedDate = filters.date ?? days[0]?.date ?? health.coverage.to;
  const activeFilters = { ...filters, date: selectedDate };
  const isDay = filters.view === "day";

  // Day by day is always the Core universe; Raw evidence is a Full archive diagnostic.
  const scope = isDay
    ? { date: selectedDate, peakSession: filters.peakSession, universe: "core" as ArchiveUniverse }
    : {
      from: filters.from,
      minGain: filters.minGain,
      minRvol: filters.minRvol,
      peakSession: filters.peakSession,
      query: filters.query,
      to: filters.to,
      universe: filters.universe,
    };

  const summary = client.summarizeMovers(scope);
  const pageCount = Math.max(1, Math.ceil(summary.total / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const result = client.listMovers({
    ...scope,
    direction: filters.direction,
    limit: isDay ? 200 : filters.pageSize,
    offset: isDay ? 0 : (page - 1) * filters.pageSize,
    sort: filters.sort,
  });

  const dayIndex = days.findIndex((day) => day.date === selectedDate);
  const olderDay = dayIndex >= 0 ? days[dayIndex + 1]?.date : undefined;
  const newerDay = dayIndex > 0 ? days[dayIndex - 1]?.date : undefined;
  const olderHref = olderDay ? archiveHref(activeFilters, { date: olderDay, page: 1 }) : undefined;
  const newerHref = newerDay ? archiveHref(activeFilters, { date: newerDay, page: 1 }) : undefined;
  const latestDay = days[0]?.date;
  const latestHref = latestDay && latestDay !== selectedDate
    ? archiveHref(activeFilters, { date: latestDay, page: 1 })
    : undefined;

  // The header sentence describes the whole session, not the active peak-session filter.
  const daySummary = isDay
    ? client.summarizeMovers({ date: selectedDate, universe: "core" })
    : null;

  const contextMovers = isDay && filters.showContext
    ? client.listMovers({
      belowThreshold: true,
      date: selectedDate,
      direction: "desc",
      limit: 100,
      maxGain: ARCHIVE_THRESHOLD,
      minGain: CONTEXT_FLOOR,
      peakSession: filters.peakSession,
      sort: "gain",
      universe: "core",
    })
    : null;
  const contextAvailable = isDay && !filters.showContext
    ? client.summarizeMovers({
      belowThreshold: true,
      date: selectedDate,
      maxGain: ARCHIVE_THRESHOLD,
      minGain: CONTEXT_FLOOR,
      peakSession: filters.peakSession,
      universe: "core",
    }).total
    : 0;

  const dayOptions = days.map((day) => ({
    href: archiveHref(activeFilters, { date: day.date, page: 1 }),
    label: `${shortDate(day.date)} · ${day.moverCount}`,
    value: day.date,
  }));
  const resetHref = archiveHref(activeFilters, {
    direction: "desc",
    from: undefined,
    universe: "core",
    minGain: undefined,
    minRvol: undefined,
    page: 1,
    query: undefined,
    sort: "gain",
    to: undefined,
  });
  const exportHref = `/api/analytics/momentum-archive/export?${archiveQuery(activeFilters, { page: 1 })}`;
  const firstRow = summary.total === 0 ? 0 : (page - 1) * filters.pageSize + 1;
  const lastRow = (page - 1) * filters.pageSize + result.movers.length;

  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsSectionTabs active="momentum" className="mb-0" />
      <ArchiveViewButtons filters={activeFilters} />

      {isDay ? (
        <section aria-label="Session review" className="pt-4">
          <MomentumArchiveKeyboardNav newerHref={newerHref} olderHref={olderHref} />
          <div className="pb-1">
            <div>
              <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-[36px]">
                {formattedDate(selectedDate)}
              </h1>
              <p className="mt-2 text-[14px] text-[var(--muted)]">
                {daySummary && daySummary.total > 0
                  ? `${daySummary.total} ${daySummary.total === 1 ? "symbol" : "symbols"} cleared 50% from the prior close, largest ${formatPercent(daySummary.largestGain)}.`
                  : "No qualified movers on this session."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] py-4">
            <div className="flex flex-wrap items-center gap-2">
              <NavigationButton href={latestHref}>Latest</NavigationButton>
              <NavigationButton href={olderHref}>Previous day</NavigationButton>
              <NavigationButton href={newerHref}>Next day</NavigationButton>
              <MomentumArchiveLinkSelect ariaLabel="Jump to session" options={dayOptions} value={selectedDate} />
            </div>
            <PeakSessionControl filters={activeFilters} />
          </div>

          <MomentumArchiveTable
            contextLabel={`Below the ${ARCHIVE_THRESHOLD}% threshold · ${CONTEXT_FLOOR}–${ARCHIVE_THRESHOLD}%`}
            contextMovers={contextMovers?.movers}
            direction={filters.direction}
            movers={result.movers}
            sort={filters.sort}
            sortHrefs={sortHrefs(activeFilters)}
            universe="core"
            view="day"
          />
          {contextAvailable > 0 ? (
            <div className="pt-3">
              <Link href={archiveHref(activeFilters, { showContext: true })} className={quietButtonClass}>
                {`Show ${contextAvailable.toLocaleString()} more between ${CONTEXT_FLOOR}% and ${ARCHIVE_THRESHOLD}%`}
              </Link>
            </div>
          ) : null}
          {filters.showContext ? (
            <div className="pt-3">
              <Link href={archiveHref(activeFilters, { showContext: false })} className={quietButtonClass}>
                Show qualified movers only
              </Link>
            </div>
          ) : null}
          <p className="mt-3 font-mono text-[11px] tabular-nums text-[var(--faint)]">
            Session {days.length - Math.max(dayIndex, 0)} of {days.length} · use ← and → to step through sessions
          </p>
        </section>
      ) : (
        <section aria-label="Full archive" className="pt-4">
          <div className="pb-5">
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-[36px]">Full archive</h1>
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
              Every captured 50%+ previous-close-to-high mover, with session price action, relative volume, liquidity, and security structure in one sortable record.
            </p>
          </div>
          <StatStrip items={[
            { label: "Trading days", value: summary.days.toLocaleString() },
            { label: "Qualified moves", value: summary.total.toLocaleString() },
            { label: "Unique symbols", value: summary.symbols.toLocaleString() },
            { label: "Largest peak", value: formatPercent(summary.largestGain) },
            { label: "Median peak", value: formatPercent(summary.medianGain) },
          ]} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] py-4">
            <PeakSessionControl filters={activeFilters} />
          </div>

          <form className="grid items-end gap-3 border-b border-[var(--hairline)] py-5 sm:grid-cols-2 lg:grid-cols-[minmax(170px,1fr)_repeat(5,140px)_auto_auto]" action="/analytics/momentum-archive">
            <input type="hidden" name="view" value="archive" />
            {filters.peakSession !== "all" ? <input type="hidden" name="session" value={filters.peakSession} /> : null}
            {filters.sort !== "gain" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
            {filters.direction !== "desc" ? <input type="hidden" name="direction" value={filters.direction} /> : null}
            {filters.pageSize !== DEFAULT_PAGE_SIZE ? <input type="hidden" name="size" value={filters.pageSize} /> : null}
            <label className={fieldClass} htmlFor="archive-search">
              Symbol or company
              <input id="archive-search" name="q" defaultValue={filters.query} placeholder="e.g. AMIX" className={`${controlClass} text-[var(--foreground)] placeholder:text-[var(--faint)]`} />
            </label>
            <label className={fieldClass} htmlFor="archive-from">
              From
              <input id="archive-from" name="from" type="date" defaultValue={filters.from} className={controlClass} />
            </label>
            <label className={fieldClass} htmlFor="archive-to">
              To
              <input id="archive-to" name="to" type="date" defaultValue={filters.to} className={controlClass} />
            </label>
            <label className={fieldClass} htmlFor="archive-min-gain">
              Min peak %
              <input id="archive-min-gain" name="minGain" type="number" min="0" step="10" placeholder="50" defaultValue={filters.minGain} className={controlClass} />
            </label>
            <label className={fieldClass} htmlFor="archive-min-rvol">
              Min RVOL
              <input id="archive-min-rvol" name="minRvol" type="number" min="0" step="0.5" placeholder="Any" defaultValue={filters.minRvol} className={controlClass} />
            </label>
            <label className={fieldClass} htmlFor="archive-universe">
              Universe
              <select id="archive-universe" name="universe" defaultValue={filters.universe} className={controlClass}>
                <option value="core">Core</option>
                <option value="raw">Raw evidence</option>
              </select>
            </label>
            <Link href={resetHref} className="inline-flex h-10 items-center justify-center px-3 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">Reset</Link>
            <button type="submit" className="h-10 rounded-md bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-85">Apply</button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p role="status" className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              {summary.total.toLocaleString()} rows · {summary.days.toLocaleString()} days · {summary.symbols.toLocaleString()} symbols
              {summary.total > 0 ? ` · showing ${firstRow.toLocaleString()}–${lastRow.toLocaleString()}` : ""}
            </p>
            <a href={exportHref} className={quietButtonClass} download>Export filtered CSV</a>
          </div>

          <MomentumArchiveTable
            direction={filters.direction}
            movers={result.movers}
            sort={filters.sort}
            sortHrefs={sortHrefs(activeFilters)}
            universe={filters.universe}
            view="archive"
          />

          <nav aria-label="Archive pagination" className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--hairline)] py-3">
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              Page {page.toLocaleString()} of {pageCount.toLocaleString()}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-[var(--muted)]">Rows per page</span>
              <MomentumArchiveLinkSelect
                ariaLabel="Rows per page"
                className="h-9 w-[84px]"
                options={PAGE_SIZES.map((size) => ({
                  href: archiveHref(activeFilters, { page: 1, pageSize: size }),
                  label: String(size),
                  value: String(size),
                }))}
                value={String(filters.pageSize)}
              />
              <NavigationButton href={page > 1 ? archiveHref(activeFilters, { page: page - 1 }) : undefined}>Previous</NavigationButton>
              <NavigationButton href={page < pageCount ? archiveHref(activeFilters, { page: page + 1 }) : undefined}>Next</NavigationButton>
            </div>
          </nav>
        </section>
      )}

      <footer className="grid gap-8 border-t border-[var(--hairline)] py-12 md:grid-cols-2 md:gap-12">
        <div>
          <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">How to read it</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            Peak % is measured from the prior regular-session close to the highest eligible minute bar of the day, so it is always the qualifying move. The Premarket, Regular and After-hours columns split that same peak by session — exactly one of them equals it. The session buttons filter which movers appear, by where the high landed. RVOL compares a completed session with the prior 20 same-session volumes; an em dash means the baseline was not yet sufficient.
          </p>
        </div>
        <div>
          <h2 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">Evidence boundaries</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            Core excludes known split dates, non-common-stock instrument types, stale reference closes, and prior closes below $1 — mostly reverse-split arithmetic rather than tradable moves. Raw evidence, available as a Universe filter here, retains those observations and shows why each sits outside Core. Dollar volume is estimated from minute OHLC4 because the flat-file minute bars carry no VWAP.
          </p>
        </div>
      </footer>
    </div>
  );
}
