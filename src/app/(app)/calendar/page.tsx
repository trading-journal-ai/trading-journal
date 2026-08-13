import Link from "next/link";
import { eq } from "drizzle-orm";
import { Fragment } from "react";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { netPnl } from "@/lib/pnl";
import { etDateString } from "@/lib/time";
import { fmtMoney } from "@/lib/format";
import { isDemoReadOnly } from "@/lib/demoMode";
import { journalDayState } from "@/lib/journalDayStatus";
import {
  formatCalendarAccuracy,
  formatCalendarProfitFactor,
} from "@/lib/calendarMetrics";
import CalendarRangeFilter from "@/components/CalendarRangeFilter";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import PeriodTabs from "@/components/ui/PeriodTabs";
import { setNoTradeDayAction } from "@/app/journal/actions";

export const dynamic = "force-dynamic";

type DayAgg = {
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
};
type CalendarSearch = {
  m?: string;
  y?: string;
  view?: string;
  range?: string;
  from?: string;
  to?: string;
};

const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const monthShortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});
const YEAR_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

function shiftYear(year: number, delta: number): number {
  return year + delta;
}

/** Calendar cells for a month: leading blanks + day numbers, padded to weeks. */
function monthMatrix(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function calendarHref(params: CalendarSearch): string {
  const search = new URLSearchParams();
  if (params.m) search.set("m", params.m);
  if (params.view) search.set("view", params.view);
  if (params.y) search.set("y", params.y);
  if (params.range) search.set("range", params.range);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  const query = search.toString();
  return query ? `/calendar?${query}` : "/calendar";
}

function filterByRange(byDate: Map<string, DayAgg>, from: string | undefined, to: string | undefined) {
  if (!from && !to) return byDate;
  const filtered = new Map<string, DayAgg>();
  for (const [date, agg] of byDate) {
    if (from && date < from) continue;
    if (to && date > to) continue;
    filtered.set(date, agg);
  }
  return filtered;
}

function filterDatesByRange(dates: Set<string>, from: string | undefined, to: string | undefined) {
  if (!from && !to) return dates;
  return new Set(
    [...dates].filter((date) => (!from || date >= from) && (!to || date <= to)),
  );
}

type WorkweekDay = {
  date: string;
  day: number;
  inMonth: boolean;
  agg: DayAgg | undefined;
};

type Workweek = {
  days: WorkweekDay[];
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
};

function workweeksForMonth(year: number, month: number, byDate: Map<string, DayAgg>): Workweek[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  let cursor = addUtcDays(first, -mondayOffset);
  const weeks: Workweek[] = [];

  while (cursor <= last) {
    const days: WorkweekDay[] = [];
    let pnl = 0;
    let trades = 0;
    let wins = 0;
    let losses = 0;

    for (let i = 0; i < 5; i += 1) {
      const dayDate = addUtcDays(cursor, i);
      const date = isoDate(dayDate);
      const inMonth = dayDate.getUTCFullYear() === year && dayDate.getUTCMonth() === month - 1;
      const agg = inMonth ? byDate.get(date) : undefined;
      if (agg) {
        pnl += agg.pnl;
        trades += agg.trades;
        wins += agg.wins;
        losses += agg.losses;
      }
      days.push({ date, day: dayDate.getUTCDate(), inMonth, agg });
    }

    if (days.some((d) => d.inMonth)) weeks.push({ days, pnl, trades, wins, losses });
    cursor = addUtcDays(cursor, 7);
  }

  return weeks;
}

async function dailyAgg(accountId: number): Promise<{
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  periods: Set<string>;
  today: string;
}> {
  const [trades, noTradeRows] = await Promise.all([
    db
      .select({
        side: schema.trades.side,
        quantity: schema.trades.quantity,
        avgEntryPrice: schema.trades.avgEntryPrice,
        avgExitPrice: schema.trades.avgExitPrice,
        fees: schema.trades.fees,
        entryAt: schema.trades.entryAt,
      })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId)),
    db
      .select({ date: schema.journalDayStatuses.date })
      .from(schema.journalDayStatuses)
      .where(eq(schema.journalDayStatuses.accountId, accountId)),
  ]);

  const byDate = new Map<string, DayAgg>();
  const noTradeDates = new Set(noTradeRows.map((row) => row.date));
  const periods = new Set<string>();
  noTradeDates.forEach((date) => periods.add(date.slice(0, 7)));
  for (const t of trades) {
    if (t.entryAt == null) continue;
    const date = etDateString(t.entryAt);
    periods.add(date.slice(0, 7));
    const pnl = netPnl(t) ?? 0;
    const cur = byDate.get(date) ?? {
      pnl: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      grossProfit: 0,
      grossLoss: 0,
    };
    cur.pnl += pnl;
    cur.trades += 1;
    if (pnl > 0) {
      cur.wins += 1;
      cur.grossProfit += pnl;
    } else if (pnl < 0) {
      cur.losses += 1;
      cur.grossLoss += Math.abs(pnl);
    }
    byDate.set(date, cur);
  }
  return {
    byDate,
    noTradeDates,
    periods,
    today: etDateString(Math.floor(Date.now() / 1000)),
  };
}

function emptyState() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        No trades yet.{" "}
        <Link href="/import" className="text-[var(--accent)] hover:underline">
          Import a ThinkorSwim statement
        </Link>{" "}
        to populate the calendar.
      </p>
    </div>
  );
}

function ViewToggle({ active, monthHref, yearHref }: { active: "month" | "year"; monthHref: string; yearHref: string }) {
  return (
    <PeriodTabs
      ariaLabel="Calendar view"
      items={[
        { value: "month", label: "Month", href: monthHref },
        { value: "year", label: "Year", href: yearHref },
      ]}
      value={active}
      className="border-b border-[var(--hairline)]"
    />
  );
}

function NavButton({
  href,
  children,
  quiet = false,
}: {
  href: string;
  children: React.ReactNode;
  quiet?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex h-10 items-center rounded-md px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        quiet
          ? "text-[var(--muted)] hover:text-[var(--foreground)]"
          : "border border-[var(--border)] text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </Link>
  );
}

function MonthView({
  ym,
  byDate,
  noTradeDates,
  readOnly,
  today,
  params,
}: {
  ym: string;
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  readOnly: boolean;
  today: string;
  params: CalendarSearch;
}) {
  const [year, month] = ym.split("-").map(Number);
  const weeks = workweeksForMonth(year, month, byDate);
  const currentCalendarHref = calendarHref(params);
  let monthPnl = 0;
  let monthTrades = 0;
  let monthWins = 0;
  let monthLosses = 0;
  let monthGrossProfit = 0;
  let monthGrossLoss = 0;
  let monthSessions = 0;
  for (const week of weeks) {
    for (const day of week.days) {
      if (!day.inMonth || !day.agg) continue;
      monthSessions += 1;
      monthPnl += day.agg.pnl;
      monthTrades += day.agg.trades;
      monthWins += day.agg.wins;
      monthLosses += day.agg.losses;
      monthGrossProfit += day.agg.grossProfit;
      monthGrossLoss += day.agg.grossLoss;
    }
  }
  const monthLabel = monthFmt.format(new Date(Date.UTC(year, month - 1, 1)));
  const summaryMetrics = [
    { label: "Sessions", value: monthSessions.toLocaleString("en-US") },
    { label: "Trades", value: monthTrades.toLocaleString("en-US") },
    { label: "Accuracy", value: formatCalendarAccuracy(monthWins, monthLosses) },
    { label: "Profit factor", value: formatCalendarProfitFactor(monthGrossProfit, monthGrossLoss) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7 pt-3">
      <section aria-labelledby="calendar-month-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1
            id="calendar-month-heading"
            className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]"
          >
            {monthLabel}
          </h1>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NavButton
              quiet
              href={calendarHref({
                ...params,
                m: today.slice(0, 7),
                view: undefined,
                y: undefined,
              })}
            >
              Today
            </NavButton>
            <NavButton href={calendarHref({ ...params, m: shiftMonth(ym, -1), view: undefined, y: undefined })}>
              Previous
            </NavButton>
            <NavButton href={calendarHref({ ...params, m: shiftMonth(ym, 1), view: undefined, y: undefined })}>
              Next
            </NavButton>
            <CalendarRangeFilter
              params={params}
              clearHref={calendarHref({ ...params, range: undefined, from: undefined, to: undefined })}
            />
          </div>
        </div>
        <ViewToggle
          active="month"
          monthHref={calendarHref({ ...params, view: undefined, y: undefined, m: ym })}
          yearHref={calendarHref({ ...params, view: "year", y: String(year), m: undefined })}
        />
      </section>

      <section
        aria-label={`${monthLabel} summary`}
        className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5"
      >
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {summaryMetrics.map((metric) => (
            <div key={metric.label} className="grid gap-0.5">
              <dt className="text-[13px] font-medium text-[var(--muted)]">
                {metric.label}
              </dt>
              <dd className="text-xl font-semibold leading-[1.2] tabular-nums text-[var(--foreground)]">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-0.5 sm:justify-items-end">
          <span className="text-[13px] font-medium text-[var(--muted)]">P&amp;L</span>
          <span
            className="text-xl font-semibold leading-[1.2] tabular-nums"
            style={{ color: monthPnl >= 0 ? "var(--green)" : "var(--red)" }}
          >
            {fmtMoney(monthPnl)}
          </span>
        </div>
      </section>

      <section aria-label={`${monthLabel} trading calendar`} className="space-y-2.5">
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[940px]">
            <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_205px] gap-px pb-2 text-[12.5px] font-semibold text-[var(--muted)]">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", ""].map((day, index) => (
                <span key={`${day}-${index}`} className="px-[15px]">
                  {day}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_205px] gap-px overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]">
              {weeks.map((week, weekIndex) => (
                <Fragment key={weekIndex}>
                  {week.days.map((day) => {
                    const positive = day.agg ? day.agg.pnl >= 0 : false;
                    const isToday = day.date === today;
                    const state = journalDayState(
                      day.agg?.trades ?? 0,
                      noTradeDates.has(day.date) ? "no_trade" : null,
                    );
                    const canConfirmNoTrade = day.inMonth
                      && day.date <= today
                      && state === "unconfirmed_empty"
                      && !readOnly;
                    const content = (
                      <div
                        data-calendar-date={day.date}
                        className={`grid min-h-24 content-start gap-1 px-3.5 py-3 transition-colors ${
                          day.inMonth
                            ? state === "unconfirmed_empty" && !isToday
                              ? "bg-[color-mix(in_srgb,var(--background)_55%,var(--surface))]"
                              : "bg-[var(--background)]"
                            : "bg-[color-mix(in_srgb,var(--background)_55%,var(--surface))] opacity-35"
                        }`}
                      >
                        <span className="flex min-h-7 items-baseline gap-1.5 pb-1 text-[12.5px] font-medium leading-[1.3] tabular-nums">
                          <span className={isToday ? "text-[var(--accent)]" : "text-[var(--foreground)]"}>
                            {day.day}
                          </span>
                          {isToday ? (
                            <span className="text-[11px] font-medium text-[var(--accent)]">Today</span>
                          ) : null}
                        </span>
                        {state === "trades" ? (
                          <span>
                            <span
                              className="block text-[17px] font-medium leading-[1.25] tabular-nums"
                              style={{ color: positive ? "var(--green)" : "var(--red)" }}
                            >
                              {fmtMoney(day.agg!.pnl)}
                            </span>
                            <span className="block truncate text-[11.5px] leading-5 text-[var(--faint)] tabular-nums">
                              {day.agg!.trades.toLocaleString("en-US")} {day.agg!.trades === 1 ? "trade" : "trades"} · {formatCalendarAccuracy(day.agg!.wins, day.agg!.losses)}
                            </span>
                          </span>
                        ) : state === "no_trade" && day.inMonth ? (
                          <span className="space-y-1 text-[11.5px] leading-5 text-[var(--faint)]">
                            <span className="block">No-trade day</span>
                            {!readOnly ? (
                              <form action={setNoTradeDayAction}>
                                <input type="hidden" name="date" value={day.date} />
                                <input type="hidden" name="selected" value="false" />
                                <PendingSubmitButton
                                  label="Undo"
                                  pendingLabel="Undoing…"
                                  className="text-[11.5px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                                />
                              </form>
                            ) : null}
                          </span>
                        ) : isToday && day.inMonth ? (
                          <span className="text-[12.5px] leading-5 text-[var(--faint)]">Not imported yet</span>
                        ) : canConfirmNoTrade ? (
                          <form action={setNoTradeDayAction}>
                            <input type="hidden" name="date" value={day.date} />
                            <input type="hidden" name="selected" value="true" />
                            <PendingSubmitButton
                              label="Mark no-trade"
                              pendingLabel="Marking…"
                              className="text-left text-[11.5px] font-medium text-[var(--faint)] transition-colors hover:text-[var(--accent)]"
                            />
                          </form>
                        ) : null}
                      </div>
                    );
                    return state === "trades" ? (
                      <Link
                        key={day.date}
                        href={`/journal?date=${day.date}&returnTo=${encodeURIComponent(currentCalendarHref)}`}
                        aria-label={`${day.date}: ${fmtMoney(day.agg!.pnl)}, ${day.agg!.trades} ${day.agg!.trades === 1 ? "trade" : "trades"}, ${formatCalendarAccuracy(day.agg!.wins, day.agg!.losses)} accuracy`}
                        className="block bg-[var(--background)] transition-colors hover:bg-[var(--surface)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={day.date}>{content}</div>
                    );
                  })}

                  <div className="grid min-h-24 place-items-center bg-[var(--background)] px-3.5 py-3 text-center">
                    {week.trades > 0 ? (
                      <span className="flex items-baseline justify-center gap-2">
                        <span
                          className="text-[17px] font-medium leading-[1.25] tabular-nums"
                          style={{ color: week.pnl >= 0 ? "var(--green)" : "var(--red)" }}
                          aria-label={`Week ${weekIndex + 1} total P&L ${fmtMoney(week.pnl)}`}
                        >
                          {fmtMoney(week.pnl)}
                        </span>
                        <span className="whitespace-nowrap text-[11.5px] leading-5 text-[var(--faint)] tabular-nums">
                          {week.trades.toLocaleString("en-US")} trades · {formatCalendarAccuracy(week.wins, week.losses)}
                        </span>
                      </span>
                    ) : null}
                  </div>
                </Fragment>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[12.5px] leading-5 text-[var(--faint)]">
          Select a traded day to open its Journal review.
        </p>
      </section>
    </div>
  );
}

function MiniMonth({
  year,
  month,
  byDate,
  noTradeDates,
  params,
}: {
  year: number;
  month: number;
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  params: CalendarSearch;
}) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const cells = monthMatrix(year, month);
  let pnl = 0;
  let trades = 0;
  for (const d of cells) {
    if (d == null) continue;
    const a = byDate.get(`${ym}-${String(d).padStart(2, "0")}`);
    if (a) { pnl += a.pnl; trades += a.trades; }
  }

  return (
    <Link
      href={calendarHref({ ...params, m: ym, view: undefined, y: undefined })}
      className="block rounded-[6px] bg-[var(--surface)] p-5 ring-1 ring-transparent transition-shadow hover:ring-[var(--accent)]"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <span className="text-lg font-semibold">{monthShortFmt.format(new Date(Date.UTC(year, month - 1, 1)))}</span>
        {trades > 0 && (
          <span className="text-sm font-semibold tabular-nums" style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoney(pnl)}</span>
        )}
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1">
        {YEAR_WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-sm font-semibold text-[var(--muted)]">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} className="aspect-square" />;
          const date = `${ym}-${String(day).padStart(2, "0")}`;
          const agg = byDate.get(date);
          const noTrade = !agg && noTradeDates.has(date);
          const pos = agg ? agg.pnl >= 0 : false;
          return (
            <div
              key={i}
              className="aspect-square rounded-md flex items-center justify-center text-base font-semibold text-[var(--muted)]"
              style={{
                backgroundColor: agg
                  ? (pos ? "color-mix(in oklch, var(--green) 13%, transparent)" : "color-mix(in oklch, var(--red) 13%, transparent)")
                  : noTrade
                    ? "var(--surface-2)"
                    : undefined,
                color: agg ? (pos ? "var(--green)" : "var(--red)") : noTrade ? "var(--foreground)" : undefined,
              }}
              title={agg ? `${date}: ${fmtMoney(agg.pnl)}` : noTrade ? `${date}: No-trade day` : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function YearView({
  year,
  byDate,
  noTradeDates,
  latest,
  params,
}: {
  year: number;
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  latest: string;
  params: CalendarSearch;
}) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle
            active="year"
            monthHref={calendarHref({ ...params, m: latest, view: undefined, y: undefined })}
            yearHref={calendarHref({ ...params, view: "year", y: String(year), m: undefined })}
          />
          <NavButton href={calendarHref({ ...params, view: "year", y: String(shiftYear(year, -1)), m: undefined })}>
            Prev
          </NavButton>
          <NavButton href={calendarHref({ ...params, view: "year", y: String(shiftYear(year, 1)), m: undefined })}>
            Next
          </NavButton>
        </div>
        <CalendarRangeFilter
          params={params}
          clearHref={calendarHref({ ...params, range: undefined, from: undefined, to: undefined })}
        />
      </div>

      <div className="flex items-baseline gap-3 pt-6">
        <h1 className="text-2xl font-semibold tracking-tight">{year}</h1>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth key={i} year={year} month={i + 1} byDate={byDate} noTradeDates={noTradeDates} params={params} />
        ))}
      </div>
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearch>;
}) {
  const rawParams = await searchParams;
  const { m, y, view, range } = rawParams;
  const from = validDate(rawParams.from);
  const to = validDate(rawParams.to);
  const activeAccount = await getActiveAccount();
  const { byDate, noTradeDates, periods, today } = await dailyAgg(activeAccount.id);
  const params: CalendarSearch = {
    m,
    y,
    view,
    range,
    from,
    to,
  };
  const filteredByDate = filterByRange(byDate, from, to);
  const filteredNoTradeDates = filterDatesByRange(noTradeDates, from, to);
  const readOnly = isDemoReadOnly();

  const latest = [...periods].sort().at(-1);
  if (!latest) return emptyState();

  if (view === "year") {
    const year = /^\d{4}$/.test(y ?? "") ? Number(y) : Number(latest.slice(0, 4));
    return <YearView year={year} byDate={filteredByDate} noTradeDates={filteredNoTradeDates} latest={latest} params={{ ...params, view: "year", y: String(year), m: undefined }} />;
  }

  const ym = /^\d{4}-\d{2}$/.test(m ?? "") ? (m as string) : latest;
  return <MonthView ym={ym} byDate={filteredByDate} noTradeDates={filteredNoTradeDates} readOnly={readOnly} today={today} params={{ ...params, m: ym, view: undefined, y: undefined }} />;
}
