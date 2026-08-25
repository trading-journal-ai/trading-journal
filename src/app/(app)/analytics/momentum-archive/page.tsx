import Link from "next/link";
import AnalyticsSectionTabs from "@/components/AnalyticsSectionTabs";
import MomentumArchiveTable from "@/components/MomentumArchiveTable";
import {
  createMarketArchiveClient,
  type ArchiveMoverSort,
  type ArchiveSessionLens,
  type ArchiveSortDirection,
  type ArchiveUniverse,
} from "@/lib/marketArchive";

export const dynamic = "force-dynamic";

type ArchiveView = "archive" | "day";

type SearchParameters = {
  date?: string;
  direction?: string;
  from?: string;
  q?: string;
  session?: string;
  sort?: string;
  to?: string;
  universe?: string;
  view?: string;
};

type ArchiveFilters = {
  date?: string;
  direction: ArchiveSortDirection;
  from?: string;
  query?: string;
  session: ArchiveSessionLens;
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

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseFilters(parameters: SearchParameters): ArchiveFilters {
  const sessions = new Set<ArchiveSessionLens>(["all", "premarket", "regular", "afterHours"]);
  const sorts = new Set<ArchiveMoverSort>(["dollarVolume", "gain", "price", "rvol", "symbol"]);
  return {
    date: validDate(parameters.date),
    direction: parameters.direction === "asc" ? "asc" : "desc",
    from: validDate(parameters.from),
    query: parameters.q?.trim() || undefined,
    session: sessions.has(parameters.session as ArchiveSessionLens)
      ? parameters.session as ArchiveSessionLens
      : "all",
    sort: sorts.has(parameters.sort as ArchiveMoverSort) ? parameters.sort as ArchiveMoverSort : "gain",
    to: validDate(parameters.to),
    universe: parameters.universe === "raw" ? "raw" : "core",
    view: parameters.view === "archive" ? "archive" : "day",
  };
}

function archiveHref(filters: ArchiveFilters, updates: Partial<ArchiveFilters>) {
  const next = { ...filters, ...updates };
  const parameters = new URLSearchParams();
  if (next.view !== "day") parameters.set("view", next.view);
  if (next.date) parameters.set("date", next.date);
  if (next.universe !== "core") parameters.set("universe", next.universe);
  if (next.session !== "all") parameters.set("session", next.session);
  if (next.sort !== "gain") parameters.set("sort", next.sort);
  if (next.direction !== "desc") parameters.set("direction", next.direction);
  if (next.query) parameters.set("q", next.query);
  if (next.from) parameters.set("from", next.from);
  if (next.to) parameters.set("to", next.to);
  const query = parameters.toString();
  return query ? `/analytics/momentum-archive?${query}` : "/analytics/momentum-archive";
}

function formattedDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function compact(value: number) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value);
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

function UnavailableArchive({ reason }: { reason: string }) {
  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsSectionTabs active="momentum" />
      <div className="max-w-2xl border-l-2 border-[var(--accent)] py-2 pl-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">Private research data</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">Momentum Archive</h1>
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
  const result = client.listMovers({
    date: filters.view === "day" ? selectedDate : undefined,
    direction: filters.direction,
    from: filters.view === "archive" ? filters.from : undefined,
    limit: filters.view === "archive" ? 100 : 200,
    query: filters.query,
    session: filters.session,
    sort: filters.sort,
    to: filters.view === "archive" ? filters.to : undefined,
    universe: filters.universe,
  });
  const dayIndex = days.findIndex((day) => day.date === selectedDate);
  const olderDay = dayIndex >= 0 ? days[dayIndex + 1]?.date : undefined;
  const newerDay = dayIndex > 0 ? days[dayIndex - 1]?.date : undefined;
  const sortLabels: Record<ArchiveMoverSort, string> = {
    dollarVolume: "Dollar volume",
    gain: "Gain",
    price: "Prior close",
    rvol: "RVOL",
    symbol: "Symbol",
  };

  return (
    <div className="mx-auto max-w-7xl">
      <AnalyticsSectionTabs active="momentum" />

      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">Private research data · Massive historical archive</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-[var(--foreground)] sm:text-5xl">Momentum Archive</h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-6 text-[var(--body)]">
            Point-in-time top gainers with Core common-stock normalization, session-specific evidence, and one-minute charts loaded only when you open a row.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-7 gap-y-3 border-l border-[var(--hairline)] pl-6 text-right">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">Core movers</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--foreground)]">{compact(health.counts.coreMovers)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">Trading days</dt>
            <dd className="mt-1 font-mono text-base font-semibold tabular-nums text-[var(--foreground)]">{health.counts.archiveDates}</dd>
          </div>
          <div className="col-span-2 border-t border-[var(--hairline)] pt-2">
            <dt className="sr-only">Coverage</dt>
            <dd className="font-mono text-[10px] tabular-nums text-[var(--muted)]">{health.coverage.from} → {health.coverage.to}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-10" aria-label="Archive controls">
        <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[var(--hairline)] py-3">
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedLinks
              ariaLabel="Archive view"
              items={[
                { active: filters.view === "day", href: archiveHref(activeFilters, { view: "day" }), label: "Day" },
                { active: filters.view === "archive", href: archiveHref(activeFilters, { view: "archive" }), label: "Full archive" },
              ]}
            />
            <SegmentedLinks
              ariaLabel="Instrument universe"
              items={[
                { active: filters.universe === "core", href: archiveHref(activeFilters, { universe: "core" }), label: "Core common stock" },
                { active: filters.universe === "raw", href: archiveHref(activeFilters, { universe: "raw" }), label: "Raw evidence" },
              ]}
            />
          </div>
          <SegmentedLinks
            ariaLabel="Market session lens"
            items={[
              { active: filters.session === "all", href: archiveHref(activeFilters, { session: "all" }), label: "All" },
              { active: filters.session === "premarket", href: archiveHref(activeFilters, { session: "premarket" }), label: "Premarket" },
              { active: filters.session === "regular", href: archiveHref(activeFilters, { session: "regular" }), label: "Regular" },
              { active: filters.session === "afterHours", href: archiveHref(activeFilters, { session: "afterHours" }), label: "After-hours" },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex min-w-[280px] items-center gap-3">
            {filters.view === "day" ? (
              <>
                {olderDay ? (
                  <Link aria-label="Older trading day" href={archiveHref(activeFilters, { date: olderDay })} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]">‹</Link>
                ) : <span className="h-9 w-9" />}
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">Trading day</p>
                  <h2 className="mt-0.5 truncate text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{formattedDate(selectedDate)}</h2>
                </div>
                {newerDay ? (
                  <Link aria-label="Newer trading day" href={archiveHref(activeFilters, { date: newerDay })} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]">›</Link>
                ) : <span className="h-9 w-9" />}
              </>
            ) : (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">Archive results</p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]">{result.total.toLocaleString()} movers</h2>
              </div>
            )}
          </div>

          <form className="flex flex-wrap items-center justify-end gap-2" action="/analytics/momentum-archive">
            {filters.view === "archive" ? <input type="hidden" name="view" value="archive" /> : null}
            {filters.view === "day" ? <input type="hidden" name="date" value={selectedDate} /> : null}
            {filters.universe === "raw" ? <input type="hidden" name="universe" value="raw" /> : null}
            {filters.session !== "all" ? <input type="hidden" name="session" value={filters.session} /> : null}
            <label className="sr-only" htmlFor="archive-search">Search symbol or name</label>
            <input
              id="archive-search"
              name="q"
              defaultValue={filters.query}
              placeholder="Search symbol or name"
              className="h-9 w-52 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            />
            <label className="sr-only" htmlFor="archive-sort">Sort results</label>
            <select id="archive-sort" name="sort" defaultValue={filters.sort} className="h-9 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] text-[var(--body)] outline-none focus:border-[var(--accent)]">
              {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <input type="hidden" name="direction" value={filters.direction} />
            <button type="submit" className="h-9 rounded-md bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-85">Apply</button>
          </form>
        </div>
      </section>

      <MomentumArchiveTable movers={result.movers} session={filters.session} universe={filters.universe} view={filters.view} />

      {result.total > result.movers.length ? (
        <p className="mt-3 text-right text-[11px] text-[var(--muted)]">Showing the first {result.movers.length.toLocaleString()} of {result.total.toLocaleString()} results.</p>
      ) : null}

      <aside className="mt-10 grid gap-5 border-t border-[var(--hairline)] pt-6 text-[12px] leading-5 text-[var(--muted)] md:grid-cols-3">
        <p><span className="font-semibold text-[var(--foreground)]">Core</span> requires point-in-time Massive type CS, a prior regular close of at least $1, a prior-close gap of seven calendar days or less, and no known split execution date.</p>
        <p><span className="font-semibold text-[var(--foreground)]">Raw evidence</span> retains qualifying source observations that Core excludes, with the controlling exclusion shown in the row.</p>
        <p><span className="font-semibold text-[var(--foreground)]">Anomalies remain visible.</span> Extreme gains are not capped; split dates and instrument type are used to distinguish evidence from the Core trading universe.</p>
      </aside>
    </div>
  );
}
