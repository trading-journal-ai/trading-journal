import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { etDateString } from "@/lib/time";
import { tradeDayActivities } from "@/lib/tradeActivity";
import { fmtMoney } from "@/lib/format";
import { isDemoReadOnly } from "@/lib/demoMode";
import CalendarRangeFilter from "@/components/CalendarRangeFilter";
import PeriodTabs from "@/components/ui/PeriodTabs";

import MonthCalendar from "@/components/MonthCalendar";
import type { CalendarTotals } from "@/lib/monthCalendar";

export const dynamic = "force-dynamic";

type DayAgg = CalendarTotals;
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

async function dailyAgg(accountId: number): Promise<{
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  periods: Set<string>;
  today: string;
}> {
  const [trades, executions, noTradeRows] = await Promise.all([
    db
      .select({
        id: schema.trades.id,
        symbol: schema.trades.symbol,
        side: schema.trades.side,
        quantity: schema.trades.quantity,
        avgEntryPrice: schema.trades.avgEntryPrice,
        avgExitPrice: schema.trades.avgExitPrice,
        fees: schema.trades.fees,
        entryAt: schema.trades.entryAt,
        exitAt: schema.trades.exitAt,
      })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId)),
    db
      .select({
        tradeId: schema.executions.tradeId,
        executedAt: schema.executions.executedAt,
        side: schema.executions.side,
        quantity: schema.executions.quantity,
        price: schema.executions.price,
        fees: schema.executions.fees,
      })
      .from(schema.executions)
      .where(eq(schema.executions.accountId, accountId)),
    db
      .select({ date: schema.journalDayStatuses.date })
      .from(schema.journalDayStatuses)
      .where(eq(schema.journalDayStatuses.accountId, accountId)),
  ]);

  const byDate = new Map<string, DayAgg>();
  const noTradeDates = new Set(noTradeRows.map((row) => row.date));
  const periods = new Set<string>();
  noTradeDates.forEach((date) => periods.add(date.slice(0, 7)));
  const executionsByTradeId = new Map<number, typeof executions>();
  for (const execution of executions) {
    if (execution.tradeId == null) continue;
    executionsByTradeId.set(
      execution.tradeId,
      [...(executionsByTradeId.get(execution.tradeId) ?? []), execution],
    );
  }
  for (const trade of trades) {
    for (const activity of tradeDayActivities(
      trade,
      executionsByTradeId.get(trade.id) ?? [],
    )) {
      periods.add(activity.date.slice(0, 7));
      const pnl = activity.realizedPnl;
      const cur = byDate.get(activity.date) ?? {
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
      byDate.set(activity.date, cur);
    }
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
  accountId,
  ym,
  byDate,
  noTradeDates,
  readOnly,
  today,
  params,
}: {
  accountId: number;
  ym: string;
  byDate: Map<string, DayAgg>;
  noTradeDates: Set<string>;
  readOnly: boolean;
  today: string;
  params: CalendarSearch;
}) {
  const [year, month] = ym.split("-").map(Number);
  const monthLabel = monthFmt.format(new Date(Date.UTC(year, month - 1, 1)));
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

      <MonthCalendar
        data={{ accountId, month: ym, today, sessions: [...byDate].filter(([date]) => date.startsWith(`${ym}-`)).map(([date, totals]) => ({ date, ...totals })), noTradeDates: [...noTradeDates].filter((date) => date.startsWith(`${ym}-`)), readOnly, range: { from: params.from, to: params.to } }}
        returnTo={calendarHref(params)}
      />
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
  return <MonthView accountId={activeAccount.id} ym={ym} byDate={byDate} noTradeDates={noTradeDates} readOnly={readOnly} today={today} params={{ ...params, m: ym, view: undefined, y: undefined }} />;
}
