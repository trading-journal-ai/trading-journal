import { MarketHistoryUnavailableError } from "@/lib/marketArchive";
import Link from "next/link";
import PeriodTabs from "@/components/ui/PeriodTabs";
import MomentumArchiveDateNavigation from "@/components/MomentumArchiveDateNavigation";
import { archiveDateHref, archiveDayTabDate, archivePeriodRange, latestPublishedArchiveDate, archiveRangeHref, shiftArchiveRange, validArchiveDate, validArchiveRange, validArchiveReturnTo } from "@/lib/momentumArchiveDates";
import { journalPeriodLabel, type JournalPeriodScope } from "@/lib/journalPeriodLabel";
import { shiftJournalPeriod } from "@/lib/journalPeriodNavigation";
import { etDateString } from "@/lib/time";
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
  type CandidateDayContext,
} from "@/lib/marketArchive";

export const dynamic = "force-dynamic";

type ArchiveView = "archive" | "range" | JournalPeriodScope;

const PAGE_SIZES = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_DAY_ROWS = 10;
/** "Show more" reaches down to here — near-misses worth a glance, without a data dump. */
const CONTEXT_FLOOR = 30;
const ARCHIVE_THRESHOLD = 50;

/** Columns whose first click should show the biggest values, not the smallest. */
const DESC_FIRST = new Set<ArchiveMoverSort>(["date", "dollarVolume", "gain", "high", "rvol", "volume"]);

const SORTS = new Set<ArchiveMoverSort>([
  "date", "dollarVolume", "gain", "high", "name", "price", "rvol", "symbol", "volume",
]);

type SearchParameters = {
  returnTo?: string;
  all?: string;
  date?: string;
  direction?: string;
  from?: string;
  minGain?: string;
  minRvol?: string;
  minPreviousClose?: string;
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
  returnTo?: string;
  date?: string;
  direction: ArchiveSortDirection;
  from?: string;
  minGain?: number;
  minRvol?: number;
  minPreviousClose?: number;
  page: number;
  pageSize: number;
  showAll: boolean;
  showContext: boolean;
  query?: string;
  peakSession: ArchivePeakSession;
  sort: ArchiveMoverSort;
  to?: string;
  universe: ArchiveUniverse;
  view: ArchiveView;
};

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

const freshnessFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "America/New_York",
  timeZoneName: "short",
  year: "numeric",
});

function positiveNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseFilters(parameters: SearchParameters): ArchiveFilters {
  const sessions = new Set<ArchivePeakSession>(["all", "premarket", "regular", "afterHours"]);
  const fullArchive = parameters.view === "archive";
  const size = Number(parameters.size);
  const page = Number(parameters.page);
  return {
    returnTo: validArchiveReturnTo(parameters.returnTo),
    date: validArchiveDate(parameters.date),
    direction: parameters.direction === "asc" ? "asc" : "desc",
    from: validArchiveDate(parameters.from),
    minGain: fullArchive ? positiveNumber(parameters.minGain) : undefined,
    minPreviousClose: fullArchive ? positiveNumber(parameters.minPreviousClose) : undefined,
    minRvol: fullArchive ? positiveNumber(parameters.minRvol) : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    query: parameters.q?.trim() || undefined,
    showAll: parameters.all === "1",
    showContext: parameters.more === "1",
    peakSession: sessions.has(parameters.session as ArchivePeakSession)
      ? parameters.session as ArchivePeakSession
      : "all",
    sort: SORTS.has(parameters.sort as ArchiveMoverSort) ? parameters.sort as ArchiveMoverSort : "gain",
    to: validArchiveDate(parameters.to),
    universe: fullArchive && parameters.universe === "raw" ? "raw" : "core",
    view: parameters.view === "range" && validArchiveRange(parameters.from, parameters.to)
      ? "range"
      : parameters.view === "archive" || parameters.view === "week" || parameters.view === "month" ? parameters.view : "day",
  };
}

function archiveQuery(filters: ArchiveFilters, updates: Partial<ArchiveFilters>) {
  const next = { ...filters, ...updates };
  const parameters = new URLSearchParams();
  if (next.view !== "day") parameters.set("view", next.view);
  if (next.view === "archive" && next.returnTo) parameters.set("returnTo", next.returnTo);
  if (next.date) parameters.set("date", next.date);
  if (next.universe !== "core") parameters.set("universe", next.universe);
  if (next.peakSession !== "all") parameters.set("session", next.peakSession);
  if (next.sort !== "gain") parameters.set("sort", next.sort);
  if (next.direction !== "desc") parameters.set("direction", next.direction);
  if (next.query) parameters.set("q", next.query);
  if (next.from) parameters.set("from", next.from);
  if (next.to) parameters.set("to", next.to);
  if (next.minGain !== undefined) parameters.set("minGain", String(next.minGain));
  if (next.minPreviousClose !== undefined) parameters.set("minPreviousClose", String(next.minPreviousClose));
  if (next.minRvol !== undefined) parameters.set("minRvol", String(next.minRvol));
  if (next.pageSize !== DEFAULT_PAGE_SIZE) parameters.set("size", String(next.pageSize));
  if (next.page > 1) parameters.set("page", String(next.page));
  if (next.showAll) parameters.set("all", "1");
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

function shortDate(date: string) {
  return shortDateFormatter.format(dateValue(date));
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function formatFreshness(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : freshnessFormatter.format(timestamp);
}

const controlClass = "h-10 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-[13px] font-normal text-[var(--body)] outline-none transition-colors focus:border-[var(--accent)]";
const fieldClass = "grid min-w-0 gap-1.5 text-[12px] font-medium text-[var(--muted)]";
const buttonBaseClass = "inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-[12px] font-medium text-[var(--body)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const quietButtonClass = `${buttonBaseClass} bg-[var(--surface)]`;

function SymbolSearch({ filters }: { filters: ArchiveFilters }) {
  const preserved = new URLSearchParams(archiveQuery(filters, { query: undefined, page: 1, showAll: false, showContext: false }));
  return <form aria-label="Symbol search" action="/analytics/momentum-archive" className="flex max-w-full flex-wrap items-end gap-2">
    {[...preserved].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    <label className={`${fieldClass} w-52 max-w-full`} htmlFor="review-symbol">
      Symbol
      <input key={filters.query ?? ""} id="review-symbol" type="search" name="q" defaultValue={filters.query} placeholder="e.g. AMIX" className={controlClass} />
    </label>
    <button type="submit" className={`${buttonBaseClass} cursor-pointer bg-[var(--background)]`}>Search</button>
    {filters.query ? <Link href={archiveHref(filters, { query: undefined, page: 1, showAll: false, showContext: false })}
      className="inline-flex h-10 items-center rounded-md px-3 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Clear</Link> : null}
  </form>;
}

function ArchiveViewButtons({ filters, latestDate }: { filters: ArchiveFilters; latestDate: string }) {
  return <PeriodTabs
    ariaLabel="Archive period"
    className="shrink-0 [&_[aria-selected=true]]:border-[var(--accent)]"
    value={filters.view}
    items={([...(["day", "week", "month"] as const), ...(filters.view === "range" ? ["range" as const] : [])]).map((view) => ({
      value: view,
      label: view === "range" ? "Custom" : view[0].toUpperCase() + view.slice(1),
      href: archiveHref(filters, { view, date: view === "day" ? archiveDayTabDate(filters.date, latestDate) : filters.date, page: 1, from: view === "range" ? filters.from : undefined, to: view === "range" ? filters.to : undefined, showAll: false, showContext: false }),
    }))}
  />;
}

function SegmentedLinks({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: Array<{ active: boolean; href: string; label: string }>;
}) {
  return (
    <div aria-label={ariaLabel} className="inline-flex rounded-md border border-[var(--border)] bg-[var(--background)] p-0.5">
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
        { active: filters.peakSession === "premarket", href: archiveHref(filters, { page: 1, peakSession: "premarket" }), label: "Pre-Market" },
        { active: filters.peakSession === "regular", href: archiveHref(filters, { page: 1, peakSession: "regular" }), label: "Regular" },
        { active: filters.peakSession === "afterHours", href: archiveHref(filters, { page: 1, peakSession: "afterHours" }), label: "After Hours" },
      ]}
    />
  );
}

function StatStrip({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="flex flex-wrap gap-y-2">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`min-w-24 py-2 pr-5 ${index === 0 ? "" : "pl-5"}`}
        >
          <dt className="text-[11px] font-medium text-[var(--muted)]">{item.label}</dt>
          <dd className="mt-1 font-mono text-[18px] font-semibold tabular-nums text-[var(--foreground)]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CandidateCoverageDisclosure({ context }: { context: CandidateDayContext }) {
  const partial = context.state === "partial";
  const minutesReady = ["complete", "verified-candidates"].includes(context.sourceCoverage.candidateMinutes.completeness);
  const referenceMissing = context.sourceCoverage.candidateReference.completeness === "partial";
  const missingData = !minutesReady && referenceMissing
    ? "Some minute-by-minute prices and stock details needed to confirm movers are missing."
    : !minutesReady
      ? "Some minute-by-minute prices are missing."
      : referenceMissing
        ? "Some stock details needed to confirm movers are missing."
        : "Some information needed to check movers is missing.";
  return (
    <details className="mt-3 max-w-3xl text-[12px] leading-5 text-[var(--muted)]">
      <summary className="cursor-pointer rounded-sm text-[var(--body)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
        <span className="font-semibold">{partial ? "Some market data is missing for this day." : "Data is ready for the stocks found."}</span>{" "}
        {partial
          ? "This mover list may be incomplete."
          : "Other movers may still be missing."}
      </summary>
      <dl className="mt-3 grid gap-2 pl-4">
        <div>
          <dt className="font-medium text-[var(--body)]">Prices checked</dt>
          <dd>We used minute-by-minute prices for the stocks our sources found.</dd>
        </div>
        {partial ? <div>
          <dt className="font-medium text-[var(--body)]">What is missing</dt>
          <dd>{missingData}</dd>
        </div> : null}
        <div>
          <dt className="font-medium text-[var(--body)]">What this means</dt>
          <dd>{partial
            ? "An empty list does not prove there were no movers. Our sources may also miss stocks outside their coverage."
            : "This list covers stocks our sources found, not every stock in the market."}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="font-medium text-[var(--body)]">Last updated</dt>
          <dd><time dateTime={context.publishedAt}>{formatFreshness(context.publishedAt)}</time></dd>
        </div>
      </dl>
    </details>
  );
}

function NavigationButton({ href, children }: { href?: string; children: string }) {
  if (!href) return <span aria-disabled="true" className={`${quietButtonClass} cursor-not-allowed opacity-40`}>{children}</span>;
  return <Link href={href} className={quietButtonClass}>{children}</Link>;
}

function UnavailableArchive({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-4">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">Top Gainers</h1>
      </header>
      <AnalyticsSectionTabs active="momentum" className="mb-6" />
      <div className="max-w-2xl">
        <p className="mt-4 text-[15px] leading-7 text-[var(--body)]">
          Market history is currently unavailable. {reason}
        </p>
      </div>
    </div>
  );
}

async function MomentumArchiveContent({
  searchParams,
}: {
  searchParams: Promise<SearchParameters>;
}) {
  const filters = parseFilters(await searchParams);
  const client = createMarketArchiveClient();
  const health = await client.health();
  if (!health.available || !health.coverage || !health.counts) {
    return <UnavailableArchive reason={health.reason === "server_unavailable" ? "Trading Server is offline. Use Start Server in Trading Monitor; saved history is preserved." : health.reason?.replaceAll("_", " ") ?? "invalid archive"} />;
  }

  // This force-dynamic server page resolves Today at request time, never during client rendering.
  // eslint-disable-next-line react-hooks/purity
  const today = etDateString(Date.now() / 1000);
  const latestDate = latestPublishedArchiveDate(today, [
    health.coverage.to,
    health.candidateContext?.available ? health.candidateContext.lastDate : null,
  ]);
  if (!latestDate) return <UnavailableArchive reason="No published archive sessions are available yet." />;
  const defaultDate = filters.view === "day" || filters.view === "archive" ? latestDate : today;
  const selectedDate = (filters.view === "range" ? filters.from : filters.date) ?? defaultDate;
  const activeFilters = { ...filters, date: selectedDate };
  const isDay = filters.view === "day";
  const isFullArchive = filters.view === "archive";
  const periodScope = filters.view === "archive" || filters.view === "range" ? null : filters.view;
  const customRange = filters.view === "range" ? validArchiveRange(filters.from, filters.to) : null;
  const period = periodScope ? archivePeriodRange(periodScope, selectedDate) : customRange;
  const currentHref = archiveHref(activeFilters, {});
  const shiftedRangeHref = (direction: -1 | 1) => {
    if (!customRange) return undefined;
    const range = shiftArchiveRange(customRange, direction);
    return archiveRangeHref(currentHref, range.from, range.to);
  };
  const navigation = {
    current: currentHref,
    previous: periodScope
      ? archiveDateHref(currentHref, shiftJournalPeriod(periodScope, selectedDate, -1))
      : shiftedRangeHref(-1),
    next: periodScope
      ? archiveDateHref(currentHref, shiftJournalPeriod(periodScope, selectedDate, 1))
      : shiftedRangeHref(1),
  };
  const dateControls = <div className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-[var(--hairline)] py-4 ${isFullArchive ? "border-b" : ""}`}>
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-3">
      <ArchiveViewButtons filters={activeFilters} latestDate={latestDate} />
      <MomentumArchiveDateNavigation
        from={period?.from ?? filters.from ?? selectedDate}
        to={period?.to ?? filters.to ?? selectedDate}
        today={today} href={navigation} />
    </div>
    {!isFullArchive ? <div className="ml-auto max-w-full"><SymbolSearch filters={activeFilters} /></div> : null}
  </div>;

  // Main review views use Core; advanced criteria and Raw evidence belong to Full archive.
  const scope = isDay
    ? { date: selectedDate, peakSession: filters.peakSession, query: filters.query, universe: "core" as ArchiveUniverse }
    : {
      from: period?.from ?? filters.from,
      minGain: filters.minGain,
      minRvol: filters.minRvol,
      minPreviousClose: filters.minPreviousClose,
      peakSession: filters.peakSession,
      query: filters.query,
      to: period?.to ?? filters.to,
      universe: filters.universe,
    };

  const [summary, marketDay] = await Promise.all([
    client.summarizeMovers(scope),
    isDay ? client.getDay(selectedDate) : Promise.resolve(null),
  ]);
  const peakItems = [
    { label: "Largest peak", value: formatPercent(summary.largestGain) },
    { label: "Median peak", value: formatPercent(summary.medianGain) },
  ];
  const summaryItems = isDay
    ? [{ label: "Number of movers", value: summary.total.toLocaleString() }, ...peakItems]
    : [
      { label: "Days with movers", value: summary.days.toLocaleString() },
      { label: "Qualified moves", value: summary.total.toLocaleString() },
      { label: "Unique symbols", value: summary.symbols.toLocaleString() },
      ...peakItems,
    ];
  const statsAndSession = <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
    <StatStrip items={summaryItems} />
    <div className="ml-auto max-w-full"><PeakSessionControl filters={activeFilters} /></div>
  </div>;
  const candidateContext = marketDay?.candidateContext ?? null;
  const pageCount = Math.max(1, Math.ceil(summary.total / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const result = await client.listMovers({
    ...scope,
    direction: filters.direction,
    limit: isDay ? 200 : filters.pageSize,
    offset: isDay ? 0 : (page - 1) * filters.pageSize,
    sort: filters.sort,
  });

  // The header sentence describes the whole session, not the active peak-session filter.
  const daySummary = isDay
    ? await client.summarizeMovers({ date: selectedDate, universe: "core" })
    : null;

  const contextMovers = isDay && filters.showContext
    ? await client.listMovers({
      belowThreshold: true,
      date: selectedDate,
      direction: "desc",
      limit: 100,
      maxGain: ARCHIVE_THRESHOLD,
      minGain: CONTEXT_FLOOR,
      peakSession: filters.peakSession,
      query: filters.query,
      sort: "gain",
      universe: "core",
    })
    : null;
  const contextAvailable = isDay && !filters.showContext
    ? (await client.summarizeMovers({
      belowThreshold: true,
      date: selectedDate,
      maxGain: ARCHIVE_THRESHOLD,
      minGain: CONTEXT_FLOOR,
      peakSession: filters.peakSession,
      query: filters.query,
      universe: "core",
    })).total
    : 0;

  const resetHref = archiveHref(activeFilters, {
    direction: "desc",
    from: customRange?.from,
    universe: "core",
    minGain: undefined,
    minRvol: undefined,
    minPreviousClose: undefined,
    page: 1,
    query: undefined,
    showAll: false,
    sort: "gain",
    to: customRange?.to,
  });
  const exportHref = `/api/analytics/momentum-archive/export?${archiveQuery(activeFilters, { page: 1, returnTo: undefined, ...(period ?? {}) })}`;
  // Near-misses belong after every qualifier, so expanding context also expands
  // the qualified tier rather than placing 30–50% rows ahead of hidden 50%+ rows.
  const dayMovers = isDay && !filters.showAll && !filters.showContext
    ? result.movers.slice(0, DEFAULT_DAY_ROWS)
    : result.movers;
  const hiddenQualifiedMovers = isDay ? Math.max(0, result.movers.length - dayMovers.length) : 0;
  const evidenceNotPublished = isDay && marketDay?.massive.available === false && candidateContext === null;

  return (
    <div className="mx-auto max-w-6xl">
      <MomentumArchiveKeyboardNav olderHref={navigation.previous} newerHref={navigation.next} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">
          {periodScope ? journalPeriodLabel(periodScope, selectedDate) : customRange ? `${shortDate(customRange.from)} – ${shortDate(customRange.to)}` : "Full archive"}
        </h1>
        <Link
          href={isFullArchive
            ? filters.returnTo ?? archiveHref(activeFilters, { view: "day", date: archiveDayTabDate(selectedDate, latestDate), page: 1, from: undefined, to: undefined, showAll: false, showContext: false })
            : archiveHref(activeFilters, { view: "archive", returnTo: currentHref, page: 1, from: undefined, to: undefined, showAll: false, showContext: false })}
          className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >{isFullArchive ? filters.returnTo ? "Back to previous view" : "Back to day view" : "Full archive"}</Link>
      </div>
      <AnalyticsSectionTabs active="momentum" className="mb-6" />

      {isDay ? (
        <section aria-label="Session review">
          <div className="pb-1">
            <div>
              <p className="mt-2 text-[14px] text-[var(--muted)]">
                {evidenceNotPublished
                  ? "Market data for this day has not been published yet."
                  : daySummary && daySummary.total > 0
                  ? `${daySummary.total} ${daySummary.total === 1 ? "symbol" : "symbols"} cleared 50% from the prior close, largest ${formatPercent(daySummary.largestGain)}.`
                  : candidateContext?.state === "partial"
                    ? "No movers found in the data available so far."
                    : candidateContext
                      ? "No movers found in the published data for this day."
                      : "No movers found for this day."}
              </p>
              {candidateContext ? (
                <CandidateCoverageDisclosure context={candidateContext} />
              ) : null}
            </div>
          </div>

          {statsAndSession}
          {dateControls}

          <MomentumArchiveTable
            contextLabel={`Below the ${ARCHIVE_THRESHOLD}% threshold · ${CONTEXT_FLOOR}–${ARCHIVE_THRESHOLD}%`}
            contextMovers={contextMovers?.movers}
            direction={filters.direction}
            movers={dayMovers}
            sort={filters.sort}
            sortHrefs={sortHrefs(activeFilters)}
            universe="core"
            view="day"
          />
          {hiddenQualifiedMovers > 0 ? (
            <div className="pt-3">
              <Link href={archiveHref(activeFilters, { showAll: true })} className={quietButtonClass}>
                {`Show ${hiddenQualifiedMovers.toLocaleString()} more qualified ${hiddenQualifiedMovers === 1 ? "mover" : "movers"}`}
              </Link>
            </div>
          ) : null}
          {filters.showAll && !filters.showContext && result.movers.length > DEFAULT_DAY_ROWS ? (
            <div className="pt-3">
              <Link href={archiveHref(activeFilters, { showAll: false })} className={quietButtonClass}>
                Show {DEFAULT_DAY_ROWS} qualified movers
              </Link>
            </div>
          ) : null}
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
        </section>
      ) : (
        <section aria-label={isFullArchive ? "Full archive" : "Period review"}>
          <div className="pb-5">
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
              {isFullArchive
                ? "Every captured 50%+ previous-close-to-high mover, with session price action, relative volume, liquidity, and security structure in one sortable record."
                : `Captured 50%+ movers for ${shortDate(period!.from)} – ${shortDate(period!.to)}.`}
            </p>
          </div>
          {!isFullArchive ? <p className="mb-4 text-[13px] leading-5 text-[var(--muted)]">
            Market data can be incomplete for some dates, so an empty list does not prove there were no movers.
            {health.candidateContext?.available ? " Choose a day to see what data is available for it." : ""}
          </p> : null}
          {statsAndSession}
          {dateControls}

          {isFullArchive ? <form className="grid items-end gap-3 py-5 sm:grid-cols-2 lg:grid-cols-[minmax(140px,1.4fr)_repeat(6,minmax(100px,1fr))_auto_auto]" action="/analytics/momentum-archive">
            <input type="hidden" name="view" value={filters.view} />
            {isFullArchive && filters.returnTo ? <input type="hidden" name="returnTo" value={filters.returnTo} /> : null}
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
            <label className={fieldClass} htmlFor="archive-min-price">
              Min prior close $
              <input id="archive-min-price" name="minPreviousClose" type="number" min="0" step="0.01" placeholder="Any" defaultValue={filters.minPreviousClose} className={controlClass} />
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
          </form> : null}

          <MomentumArchiveTable
            emptyHint={isFullArchive ? undefined : "Try another date range or session, or clear the symbol search."}
            direction={filters.direction}
            movers={result.movers}
            sort={filters.sort}
            sortHrefs={sortHrefs(activeFilters)}
            universe={filters.universe}
            view="archive"
          />

          <nav aria-label="Archive pagination" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[var(--hairline)] py-3 pl-3">
            <span className="font-mono text-[11px] tabular-nums text-[var(--muted)]">
              Page {page.toLocaleString()} of {pageCount.toLocaleString()}
            </span>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
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
          <div className="flex justify-end pt-3">
            <a href={exportHref} className={quietButtonClass} download>Export filtered CSV</a>
          </div>
        </section>
      )}

      <footer className="py-8">
        <details>
          <summary className="cursor-pointer rounded-sm text-[14px] font-semibold text-[var(--body)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]">About this archive</summary>
          <div className="mt-6 grid gap-8 lg:grid-cols-3 lg:gap-10">
            <section aria-labelledby="archive-reading-heading">
              <h2 id="archive-reading-heading" className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">Reading the numbers</h2>
              <dl className="mt-3 space-y-3 text-[13px] leading-6 text-[var(--muted)]">
                <div><dt className="font-semibold text-[var(--body)]">Gain</dt><dd>Previous regular-session close → highest recorded price across premarket, regular trading, and after hours.</dd></div>
                <div><dt className="font-semibold text-[var(--body)]">PM · Cont. · AH</dt><dd className="space-y-1">
                  <p>PM: previous regular close → premarket high.</p>
                  <p>Cont.: premarket high → regular-session high; uses the previous close if there is no premarket high.</p>
                  <p>AH: that day&apos;s regular close → after-hours high.</p>
                </dd></div>
                <div><dt className="font-semibold text-[var(--body)]">RVOL</dt><dd>The highest session volume ratio for the day. Each session is compared with its average volume over the prior 20 matching sessions.</dd></div>
                <div><dt className="font-semibold text-[var(--body)]">Volume · $ volume</dt><dd>Shares traded across all three sessions, and their estimated dollar value.</dd></div>
              </dl>
              <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">The percentages use different starting prices, so they do not add up. They measure moves to a high, not closing returns. A dash means the data or comparison history is unavailable.</p>
            </section>
            <section aria-labelledby="archive-inclusion-heading">
              <h2 id="archive-inclusion-heading" className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">Which stocks appear</h2>
              <ul className="mt-3 list-disc space-y-3 pl-4 text-[13px] leading-6 text-[var(--muted)]">
                <li><strong className="font-semibold text-[var(--body)]">Core requires a gain of at least 50%</strong> from the previous regular close to the day&apos;s high. Stocks with a previous close below $1 are included; Full archive offers an optional minimum prior-close filter.</li>
                <li><strong className="font-semibold text-[var(--body)]">Core includes common shares and common-stock ADRs</strong> (U.S.-traded receipts for foreign shares). It excludes ETFs, preferred shares, warrants, rights, and units. An excluded stock can still be a stock you trade.</li>
                <li>Known stock-split dates are excluded, as are records with a missing or nonpositive prior close, or one more than seven calendar days old.</li>
                <li><strong className="font-semibold text-[var(--body)]">Session buttons select when the day&apos;s high occurred.</strong> After Hours does not show every stock that rose after the close. The numbers keep the same meaning when you switch sessions.</li>
              </ul>
              <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">Full archive → Raw evidence shows retained movers outside Core and their exclusion reasons. Raw evidence is not a list of every stock.</p>
            </section>
            <section aria-labelledby="archive-coverage-heading">
              <h2 id="archive-coverage-heading" className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">Data sources and coverage</h2>
              <ul className="mt-3 list-disc space-y-3 pl-4 text-[13px] leading-6 text-[var(--muted)]">
                <li><strong className="font-semibold text-[var(--body)]">Trading Server stores the shared history.</strong> This page reads its published results.</li>
                <li><strong className="font-semibold text-[var(--body)]">Massive supplies minute-by-minute prices.</strong> Older dates come from the broad market archive. Recovered dates cover selected stocks found through daily price data, DTS scanner observations, and retained research.</li>
                <li><strong className="font-semibold text-[var(--body)]">DTS helps find stocks to check.</strong> It records names observed by the scanner while capture is running. Stocks the scanner never shows can be missed.</li>
                <li><strong className="font-semibold text-[var(--body)]">Coverage varies by date.</strong> An empty list does not prove there were no movers. Open Day view&apos;s coverage details for missing data and the last update. Verified prices for selected stocks do not mean the whole market was checked.</li>
              </ul>
            </section>
            <p className="text-[13px] leading-6 text-[var(--muted)] lg:col-span-3"><strong className="font-semibold text-[var(--body)]">Missing a mover or seeing a suspicious value?</strong> Check the date, symbol search, session filter, and Raw evidence first. For review, note the symbol, date, session, expected price or move, and a chart or source to compare. A stock may be filtered out, not yet discovered, or missing usable data.</p>
          </div>
        </details>
      </footer>
    </div>
  );
}

export default async function MomentumArchivePage(props: { searchParams: Promise<SearchParameters> }) {
  try { return await MomentumArchiveContent(props); }
  catch (error) {
    if (!(error instanceof MarketHistoryUnavailableError)) throw error;
    return <UnavailableArchive reason="Trading Server is offline. Use Start Server in Trading Monitor; saved history is preserved." />;
  }
}
