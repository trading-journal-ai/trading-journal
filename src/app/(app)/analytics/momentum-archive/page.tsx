import Link from "next/link";
import AnalyticsSectionTabs from "@/components/AnalyticsSectionTabs";
import MomentumArchiveDaySelect from "@/components/MomentumArchiveDaySelect";
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

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
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

function dateValue(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function formattedDate(date: string) {
  return dateFormatter.format(dateValue(date));
}

function shortDate(date: string) {
  return shortDateFormatter.format(dateValue(date));
}

function compact(value: number) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function ArchiveViewTabs({ filters }: { filters: ArchiveFilters }) {
  const items = [
    {
      active: filters.view === "day",
      href: archiveHref(filters, {
        direction: "desc",
        from: undefined,
        query: undefined,
        sort: "gain",
        to: undefined,
        view: "day",
      }),
      label: "Day by day",
    },
    { active: filters.view === "archive", href: archiveHref(filters, { view: "archive" }), label: "Full archive" },
  ];
  return (
    <nav aria-label="Archive view" className="border-b border-[var(--hairline)]">
      <div className="flex gap-1">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`-mb-px min-h-11 border-b-2 px-4 py-3 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              item.active
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
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

function EvidenceControls({ filters }: { filters: ArchiveFilters }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] py-4">
      <SegmentedLinks
        ariaLabel="Instrument universe"
        items={[
          { active: filters.universe === "core", href: archiveHref(filters, { universe: "core" }), label: "Core common stock" },
          { active: filters.universe === "raw", href: archiveHref(filters, { universe: "raw" }), label: "Raw evidence" },
        ]}
      />
      <SegmentedLinks
        ariaLabel="Market session lens"
        items={[
          { active: filters.session === "all", href: archiveHref(filters, { session: "all" }), label: "All" },
          { active: filters.session === "premarket", href: archiveHref(filters, { session: "premarket" }), label: "Premarket" },
          { active: filters.session === "regular", href: archiveHref(filters, { session: "regular" }), label: "Regular" },
          { active: filters.session === "afterHours", href: archiveHref(filters, { session: "afterHours" }), label: "After-hours" },
        ]}
      />
    </div>
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
  const className = "inline-flex h-10 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[12px] font-medium text-[var(--body)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
  if (!href) return <span aria-disabled="true" className={`${className} cursor-not-allowed opacity-40`}>{children}</span>;
  return <Link href={href} className={className}>{children}</Link>;
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
  const result = client.listMovers({
    date: filters.view === "day" ? selectedDate : undefined,
    direction: filters.view === "day" ? "desc" : filters.direction,
    from: filters.view === "archive" ? filters.from : undefined,
    limit: filters.view === "archive" ? 100 : 200,
    query: filters.view === "archive" ? filters.query : undefined,
    session: filters.session,
    sort: filters.view === "day" ? "gain" : filters.sort,
    to: filters.view === "archive" ? filters.to : undefined,
    universe: filters.universe,
  });
  const dayIndex = days.findIndex((day) => day.date === selectedDate);
  const olderDay = dayIndex >= 0 ? days[dayIndex + 1]?.date : undefined;
  const newerDay = dayIndex > 0 ? days[dayIndex - 1]?.date : undefined;
  const dayAllMovers = filters.view === "day" && filters.session === "all"
    ? result.movers
    : filters.view === "day"
      ? client.listMovers({ date: selectedDate, limit: 200, session: "all", sort: "gain", universe: filters.universe }).movers
      : [];
  const regularMovers = filters.view === "day" && filters.session === "regular"
    ? result.movers
    : filters.view === "day"
      ? client.listMovers({ date: selectedDate, limit: 200, session: "regular", sort: "gain", universe: filters.universe }).movers
      : [];
  const dayGains = dayAllMovers
    .map((mover) => mover.lens.gainPercent)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const largestDayGain = dayGains.length > 0 ? Math.max(...dayGains) : null;
  const medianDayGain = median(dayGains);
  const regularDollarVolume = regularMovers.reduce((sum, mover) => sum + mover.lens.dollarVolume, 0);
  const shownGains = result.movers
    .map((mover) => mover.lens.gainPercent)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  const largestShownGain = shownGains.length > 0 ? Math.max(...shownGains) : null;
  const medianShownGain = median(shownGains);
  const sortLabels: Record<ArchiveMoverSort, string> = {
    dollarVolume: "Dollar volume",
    gain: "Gain",
    price: "Previous close",
    rvol: "RVOL",
    symbol: "Symbol",
  };
  const dayOptions = days.map((day) => ({
    href: archiveHref(activeFilters, { date: day.date }),
    label: `${shortDate(day.date)} · ${day.moverCount}`,
    value: day.date,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsSectionTabs active="momentum" className="mb-0" />
      <ArchiveViewTabs filters={activeFilters} />

      {filters.view === "day" ? (
        <section aria-label="Session review" className="pt-8">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5 border-b border-[var(--hairline)] pb-4">
            <div>
              <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-[36px]">
                {formattedDate(selectedDate)}
              </h1>
              <p className="mt-2 text-[14px] text-[var(--muted)]">
                {dayAllMovers.length > 0
                  ? `${dayAllMovers.length} ${dayAllMovers.length === 1 ? "symbol" : "symbols"} cleared 50% from the prior close, largest ${formatPercent(largestDayGain)}.`
                  : "No qualified movers on this session."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <MomentumArchiveDaySelect options={dayOptions} value={selectedDate} />
              <NavigationButton href={olderDay ? archiveHref(activeFilters, { date: olderDay }) : undefined}>Previous day</NavigationButton>
              <NavigationButton href={newerDay ? archiveHref(activeFilters, { date: newerDay }) : undefined}>Next day</NavigationButton>
            </div>
          </div>

          <StatStrip items={[
            { label: "Movers", value: dayAllMovers.length.toLocaleString() },
            { label: "Largest peak", value: formatPercent(largestDayGain) },
            { label: "Median peak", value: formatPercent(medianDayGain) },
            { label: "Regular-session $ volume", value: regularDollarVolume > 0 ? `$${compact(regularDollarVolume)}` : "—" },
          ]} />
          <EvidenceControls filters={activeFilters} />
          <MomentumArchiveTable movers={result.movers} session={filters.session} universe={filters.universe} view="day" />
          <p className="mt-3 font-mono text-[11px] tabular-nums text-[var(--faint)]">
            Session {days.length - Math.max(dayIndex, 0)} of {days.length} · use Previous day and Next day to step through sessions
          </p>
        </section>
      ) : (
        <section aria-label="Full archive" className="pt-8">
          <div className="pb-5">
            <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-[36px]">Full archive</h1>
            <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
              Every captured 50%+ previous-close-to-high mover, with session price action, relative volume, liquidity, and security structure in one sortable record.
            </p>
          </div>
          <StatStrip items={[
            { label: "Trading days", value: days.length.toLocaleString() },
            { label: "Qualified moves", value: result.total.toLocaleString() },
            { label: "Rows shown", value: result.movers.length.toLocaleString() },
            { label: "Largest shown", value: formatPercent(largestShownGain) },
            { label: "Median shown", value: formatPercent(medianShownGain) },
          ]} />
          <EvidenceControls filters={activeFilters} />

          <form className="grid items-end gap-3 border-b border-[var(--hairline)] py-5 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_150px_150px_150px_auto_auto]" action="/analytics/momentum-archive">
            <input type="hidden" name="view" value="archive" />
            {filters.universe === "raw" ? <input type="hidden" name="universe" value="raw" /> : null}
            {filters.session !== "all" ? <input type="hidden" name="session" value={filters.session} /> : null}
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--muted)]" htmlFor="archive-search">
              Symbol or company
              <input id="archive-search" name="q" defaultValue={filters.query} placeholder="e.g. AMIX" className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--foreground)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--accent)]" />
            </label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--muted)]" htmlFor="archive-from">
              From
              <input id="archive-from" name="from" type="date" defaultValue={filters.from} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--body)] outline-none focus:border-[var(--accent)]" />
            </label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--muted)]" htmlFor="archive-to">
              To
              <input id="archive-to" name="to" type="date" defaultValue={filters.to} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--body)] outline-none focus:border-[var(--accent)]" />
            </label>
            <label className="grid gap-1.5 text-[12px] font-medium text-[var(--muted)]" htmlFor="archive-sort">
              Sort by
              <select id="archive-sort" name="sort" defaultValue={filters.sort} className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-normal text-[var(--body)] outline-none focus:border-[var(--accent)]">
                {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <input type="hidden" name="direction" value={filters.direction} />
            <Link href={archiveHref(activeFilters, { direction: "desc", from: undefined, query: undefined, sort: "gain", to: undefined })} className="inline-flex h-10 items-center justify-center px-3 text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)]">Reset</Link>
            <button type="submit" className="h-10 rounded-md bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-85">Apply</button>
          </form>

          <p role="status" className="py-3 font-mono text-[11px] tabular-nums text-[var(--muted)]">
            {result.total.toLocaleString()} rows · {days.length.toLocaleString()} days · showing {result.movers.length.toLocaleString()}
          </p>
          <MomentumArchiveTable movers={result.movers} session={filters.session} universe={filters.universe} view="archive" />
        </section>
      )}

      <footer className="grid gap-8 border-t border-[var(--hairline)] py-12 md:grid-cols-2 md:gap-12">
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">How to read it</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            Peak change is measured from the prior regular-session close to the highest eligible minute bar. The active session buttons replace the matching gain, RVOL, liquidity, and high columns.
          </p>
        </div>
        <div>
          <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[var(--foreground)]">Evidence boundaries</h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
            Core excludes known split dates, non-common-stock instrument types, stale reference closes, and prior closes below $1. Raw evidence retains those observations and shows why each sits outside Core.
          </p>
        </div>
      </footer>
    </div>
  );
}
