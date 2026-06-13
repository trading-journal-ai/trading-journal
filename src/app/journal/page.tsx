import Link from "next/link";
import { and, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fmtMoney } from "@/lib/format";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";
import MonthPicker from "@/components/MonthPicker";
import RecapNote from "@/components/RecapNote";
import TradeJournalNote from "@/components/TradeJournalNote";

export const dynamic = "force-dynamic";

type DatePreset = "all" | "today" | "week" | "month" | "custom";

type JournalFilters = {
  date?: string;
  preset: DatePreset;
  from?: string;
  to?: string;
};

type JournalTrade = typeof schema.trades.$inferSelect & {
  pnl: number | null;
  notes: {
    id: number;
    text: string;
    emotionalState: string | null;
  }[];
};

type DailySymbolSummary = {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
};

type JournalDay = {
  date: string;
  trades: JournalTrade[];
  pnl: number;
  noteCount: number;
};

type JournalWeek = {
  key: string;
  label: string;
  rangeLabel: string;
  days: JournalDay[];
  pnl: number;
  trades: number;
  noteCount: number;
};

type JournalMonth = {
  key: string;
  label: string;
  weeks: JournalWeek[];
  pnl: number;
  trades: number;
  noteCount: number;
};

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function parseSearchParams(params: {
  date?: string;
  preset?: string;
  from?: string;
  to?: string;
}): JournalFilters {
  const presetOptions = new Set<DatePreset>(["all", "today", "week", "month", "custom"]);
  return {
    date: validDate(params.date),
    preset: presetOptions.has(params.preset as DatePreset) ? (params.preset as DatePreset) : "month",
    from: validDate(params.from),
    to: validDate(params.to),
  };
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

function dateRangeFor(filters: JournalFilters): { from: string; to: string } | undefined {
  if (filters.date) return { from: filters.date, to: filters.date };

  const today = currentEtDate();
  const anchor = filters.from ?? today;
  if (filters.preset === "today") return { from: anchor, to: anchor };
  if (filters.preset === "week") {
    const monday = isoAddDays(anchor, -((isoWeekday(anchor) + 6) % 7));
    return { from: monday, to: isoAddDays(monday, 4) };
  }
  if (filters.preset === "month") return { from: `${anchor.slice(0, 7)}-01`, to: lastDayOfMonth(anchor) };
  if (filters.preset === "custom") {
    if (!filters.from && !filters.to) return undefined;
    return {
      from: filters.from ?? "0000-01-01",
      to: filters.to ?? "9999-12-31",
    };
  }
  return undefined;
}

function filterHref(filters: JournalFilters, updates: Partial<JournalFilters>) {
  const next = { ...filters, ...updates };
  const params = new URLSearchParams();
  if (next.date) params.set("date", next.date);
  if (next.preset !== "all") params.set("preset", next.preset);
  if (next.from) params.set("from", next.from);
  if (next.to) params.set("to", next.to);
  const query = params.toString();
  return query ? `/journal?${query}` : "/journal";
}

const dateLabelNoYearFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const monthLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const dayOnlyLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const weekdayLabelFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

function dateLabelNoYear(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dateLabelNoYearFmt.format(new Date(Date.UTC(year, month - 1, day)));
}

function dateYear(date: string): string {
  return date.slice(0, 4);
}

function weekRangeLabel(weekStart: string): string {
  const weekEnd = isoAddDays(weekStart, 4);
  return `${dateLabelNoYear(weekStart)} to ${dateLabelNoYear(weekEnd)}, ${dateYear(weekEnd)}`;
}

function dayOnlyLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dayOnlyLabelFmt.format(new Date(Date.UTC(year, month - 1, day)));
}

function weekdayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return weekdayLabelFmt.format(new Date(Date.UTC(year, month - 1, day)));
}

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return monthLabelFmt.format(new Date(Date.UTC(year, month - 1, 1)));
}

function weekKeyFor(date: string): string {
  return isoAddDays(date, -((isoWeekday(date) + 6) % 7));
}

function weekLabel(weekStart: string): string {
  const monthStart = `${weekStart.slice(0, 7)}-01`;
  const firstWeekStart = weekKeyFor(monthStart);
  const daysFromFirstWeek = Math.round((Date.parse(`${weekStart}T00:00:00Z`) - Date.parse(`${firstWeekStart}T00:00:00Z`)) / 86400000);
  return `Week ${Math.floor(daysFromFirstWeek / 7) + 1}`;
}

function profitColor(value: number): string {
  if (value > 0) return "var(--green)";
  if (value < 0) return "var(--red)";
  return "var(--muted)";
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function dayAccuracy(trades: JournalTrade[]): string {
  const wins = trades.filter((trade) => (trade.pnl ?? 0) > 0).length;
  const losses = trades.filter((trade) => (trade.pnl ?? 0) < 0).length;
  const counted = wins + losses;
  return counted === 0 ? "—" : formatPercent((wins / counted) * 100);
}

function dayProfitFactor(trades: JournalTrade[]): string {
  const grossWin = trades.reduce((sum, trade) => sum + Math.max(trade.pnl ?? 0, 0), 0);
  const grossLoss = Math.abs(trades.reduce((sum, trade) => sum + Math.min(trade.pnl ?? 0, 0), 0));
  if (grossWin === 0 && grossLoss === 0) return "—";
  if (grossLoss === 0) return "∞";
  return (grossWin / grossLoss).toFixed(2);
}

function tradeNoteText(note: typeof schema.journalEntries.$inferSelect): string {
  return note.lessons || note.thesis || note.whatWentWell || note.whatWentWrong || "";
}

/** Scoped recap notes (day/week/month) keyed by `${scope}:${scopeKey}`. */
async function loadRecaps(): Promise<Map<string, string>> {
  const rows = await db
    .select({
      scope: schema.journalEntries.scope,
      scopeKey: schema.journalEntries.scopeKey,
      lessons: schema.journalEntries.lessons,
    })
    .from(schema.journalEntries)
    .where(inArray(schema.journalEntries.scope, ["day", "week", "month"]));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.scopeKey) map.set(`${row.scope}:${row.scopeKey}`, row.lessons ?? "");
  }
  return map;
}

async function loadJournalTrades(filters: JournalFilters): Promise<JournalTrade[]> {
  const range = dateRangeFor(filters);
  const where =
    range
      ? (() => {
          const { start } = etDayRange(range.from);
          const { end } = etDayRange(range.to);
          return and(gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end));
        })()
      : undefined;

  let rows = await db.select().from(schema.trades).where(where).limit(2000);

  if (range) {
    rows = rows.filter((trade) => {
      if (trade.entryAt == null) return false;
      const entryDate = etDateString(trade.entryAt);
      return entryDate >= range.from && entryDate <= range.to;
    });
  }

  const noteRows = await db
    .select()
    .from(schema.journalEntries)
    .orderBy(schema.journalEntries.createdAt);
  const notesByTrade = new Map<number, JournalTrade["notes"]>();
  for (const note of noteRows) {
    if (note.tradeId == null) continue; // standalone day/week/month notes aren't trade notes
    const text = tradeNoteText(note);
    const notes = notesByTrade.get(note.tradeId) ?? [];
    notes.push({
      id: note.id,
      text: text || "No note text.",
      emotionalState: note.emotionalState,
    });
    notesByTrade.set(note.tradeId, notes);
  }

  return rows
    .map((trade) => ({ ...trade, pnl: netPnl(trade), notes: notesByTrade.get(trade.id) ?? [] }))
    .sort((a, b) => (a.entryAt ?? 0) - (b.entryAt ?? 0));
}

function buildDailySymbolSummary(trades: JournalTrade[]): DailySymbolSummary[] {
  const bySymbol = new Map<string, DailySymbolSummary>();

  for (const trade of trades) {
    const pnl = trade.pnl ?? 0;
    const row = bySymbol.get(trade.symbol) ?? {
      symbol: trade.symbol,
      trades: 0,
      wins: 0,
      losses: 0,
      pnl: 0,
    };
    row.trades += 1;
    row.pnl += pnl;
    if (pnl > 0) row.wins += 1;
    if (pnl < 0) row.losses += 1;
    bySymbol.set(trade.symbol, row);
  }

  return [...bySymbol.values()].sort((a, b) => b.pnl - a.pnl);
}

function groupJournal(trades: JournalTrade[], filters: JournalFilters): JournalMonth[] {
  const monthMap = new Map<string, JournalMonth>();
  const groupByWeekStart = !filters.date && filters.preset === "week";

  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const date = etDateString(trade.entryAt);
    const weekKey = weekKeyFor(date);
    const monthKey = groupByWeekStart ? weekKey.slice(0, 7) : date.slice(0, 7);
    const pnl = trade.pnl ?? 0;
    const noteCount = trade.notes.length;

    let month = monthMap.get(monthKey);
    if (!month) {
      month = { key: monthKey, label: monthLabel(monthKey), weeks: [], pnl: 0, trades: 0, noteCount: 0 };
      monthMap.set(monthKey, month);
    }

    let week = month.weeks.find((item) => item.key === weekKey);
    if (!week) {
      week = {
        key: weekKey,
        label: weekLabel(weekKey),
        rangeLabel: weekRangeLabel(weekKey),
        days: [],
        pnl: 0,
        trades: 0,
        noteCount: 0,
      };
      month.weeks.push(week);
    }

    let day = week.days.find((item) => item.date === date);
    if (!day) {
      day = { date, trades: [], pnl: 0, noteCount: 0 };
      week.days.push(day);
    }

    day.trades.push(trade);
    day.pnl += pnl;
    day.noteCount += noteCount;
    week.pnl += pnl;
    week.trades += 1;
    week.noteCount += noteCount;
    month.pnl += pnl;
    month.trades += 1;
    month.noteCount += noteCount;
  }

  return [...monthMap.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((month) => ({
      ...month,
      weeks: month.weeks
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((week) => ({
          ...week,
          days: week.days.sort((a, b) => a.date.localeCompare(b.date)),
        })),
    }));
}

function FilterBar({ filters }: { filters: JournalFilters }) {
  const activePreset: DatePreset = filters.date ? "custom" : filters.preset;
  const presetBase = { date: undefined, from: undefined, to: undefined };
  const buttonClass = (preset: DatePreset) =>
    `inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold transition-colors ${
      activePreset === preset
        ? "border-[var(--blue)] bg-[var(--surface)] text-[var(--foreground)]"
        : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
    }`;
  const selectedDate = dateRangeFor(filters)?.from ?? currentEtDate();

  return (
    <form action="/journal" className="space-y-3">
      <input type="hidden" name="preset" value={activePreset} />
      <div className="relative space-y-2">
        <span className="block text-sm font-semibold text-[var(--muted)]">Date range</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="flex flex-wrap gap-2">
            <Link href={filterHref(filters, { ...presetBase, preset: "today" })} className={buttonClass("today")}>Today</Link>
            <Link href={filterHref(filters, { ...presetBase, preset: "week" })} className={buttonClass("week")}>Week</Link>
            <Link href={filterHref(filters, { ...presetBase, preset: "month" })} className={buttonClass("month")}>Month</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <MonthPicker selectedDate={selectedDate} />
            <Link href="/journal" className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]">Clear</Link>
          </div>
        </div>
      </div>

    </form>
  );
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    preset?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const filters = parseSearchParams(await searchParams);
  const returnTo = filterHref(filters, {});
  const [trades, recaps] = await Promise.all([
    loadJournalTrades(filters),
    loadRecaps(),
  ]);
  const months = groupJournal(trades, filters);
  const isWeekView = !filters.date && filters.preset === "week";
  const emptyDayDate = months.length === 0 && (filters.date || filters.preset === "today")
    ? dateRangeFor(filters)?.from
    : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <FilterBar filters={filters} />

      <section className="space-y-4 pt-6">
        {emptyDayDate ? (
          <div className="space-y-6">
            <div className="space-y-3 border-b border-[var(--border)] pb-6">
              <h2 className="text-2xl font-semibold tracking-tight">
                {weekdayLabel(emptyDayDate)}
                {" "}
                <span className="align-baseline text-2xl font-semibold text-[var(--foreground)]">
                  {dayOnlyLabel(emptyDayDate)}
                </span>
              </h2>
              <RecapNote
                scope="day"
                scopeKey={emptyDayDate}
                text={recaps.get(`day:${emptyDayDate}`) ?? ""}
                placeholder="Add a daily note: market read, plan, execution, emotions, what worked, what to fix tomorrow."
              />
            </div>
            <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_max-content] md:gap-x-20">
              <div className="space-y-4">
                <p className="text-sm font-semibold text-[var(--muted)]">
                  No trades for this day.
                </p>
              </div>

              <aside className="w-max min-w-36 max-w-full justify-self-end self-start rounded bg-[var(--surface)] px-4 py-3 text-xs">
                <div className="font-semibold text-[var(--muted)]">No trades</div>
                <div className="mx-auto mt-3 w-max space-y-1 whitespace-nowrap pt-2 text-center font-semibold">
                  <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                    <span className="text-[var(--muted)]">Accuracy</span>
                    <span className="tabular-nums">—</span>
                  </div>
                  <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                    <span className="text-[var(--muted)]">Profit factor</span>
                    <span className="tabular-nums">—</span>
                  </div>
                  <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                    <span className="text-[var(--muted)]">P&L</span>
                    <span className="tabular-nums" style={{ color: profitColor(0) }}>
                      {fmtMoney(0)}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : months.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No trade notes match these filters yet. Add a note from a trade detail page to see it roll up here.
          </div>
        ) : (
          months.map((month) => (
            <article key={month.key} className="space-y-9">
              {!isWeekView && (
                <div className="space-y-3 border-b border-[var(--border)] pb-6">
                  <h2 className="text-2xl font-semibold tracking-tight">{month.label} · Month Review</h2>
                  <RecapNote
                    scope="month"
                    scopeKey={month.key}
                    text={recaps.get(`month:${month.key}`) ?? ""}
                    placeholder="Add a light monthly recap: themes, bigger-picture progress, drawdown context, what carries into next month."
                  />
                </div>
              )}

              <div className="space-y-10">
                {month.weeks.map((week) => (
                  <section key={week.key} className="space-y-5">
                    <div className="space-y-2">
                      <h3 className={`${isWeekView ? "text-2xl" : "text-xl"} font-semibold`}>
                        {week.label}
                        {" - "}
                        <span className={`align-baseline ${isWeekView ? "text-2xl" : "text-xl"} font-semibold text-[var(--foreground)]`}>
                          {week.rangeLabel}
                        </span>
                      </h3>
                      <RecapNote
                        scope="week"
                        scopeKey={week.key}
                        text={recaps.get(`week:${week.key}`) ?? ""}
                        placeholder="Add a short weekly recap: did I keep red days small, what repeated, what to focus on next week."
                      />
                    </div>

                    <div className="space-y-8">
                      {week.days.map((day) => (
                        <div key={day.date} className="border-t border-[var(--border)] pt-6">
                          <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_max-content] md:gap-x-20">
                            <div className="space-y-4">
                              <div>
                                <div className="space-y-1">
                                  <h4 className="text-xl font-semibold">
                                    {weekdayLabel(day.date)}
                                    {" "}
                                    <span className="align-baseline text-xl font-semibold text-[var(--foreground)]">
                                      {dayOnlyLabel(day.date)}
                                    </span>
                                  </h4>
                                </div>
                                <div className="mt-2">
                                  <RecapNote
                                    scope="day"
                                    scopeKey={day.date}
                                    text={recaps.get(`day:${day.date}`) ?? ""}
                                    placeholder="Add a daily note: market read, plan, execution, emotions, what worked, what to fix tomorrow."
                                  />
                                </div>
                              </div>

                              <div className="space-y-6 pt-4">
                                {day.trades.filter((trade) => trade.notes.length > 0).map((trade) => (
                                  <div key={trade.id} className="space-y-2">
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                      <h5 className="text-lg font-semibold">{trade.symbol}</h5>
                                      <Link href={`/trades/${trade.id}?returnTo=${encodeURIComponent(returnTo)}`} className="text-sm font-semibold text-[var(--foreground)] hover:underline">
                                        Link to trade
                                      </Link>
                                    </div>
                                    {trade.notes.map((note) => (
                                      <TradeJournalNote
                                        key={note.id}
                                        noteId={note.id}
                                        tradeId={trade.id}
                                        text={note.text}
                                        emotionalState={note.emotionalState}
                                      />
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <aside className="w-max min-w-36 max-w-full justify-self-end self-start rounded bg-[var(--surface)] px-4 py-3 text-xs">
                              <div className="space-y-2">
                                {buildDailySymbolSummary(day.trades).map((row) => (
                                  <div key={row.symbol} className="grid grid-cols-[max-content_1fr] items-center gap-x-4 whitespace-nowrap">
                                    <span className="font-semibold text-[var(--foreground)]">{row.symbol}</span>
                                    <span className="justify-self-end font-semibold tabular-nums" style={{ color: profitColor(row.pnl) }}>
                                      {fmtMoney(row.pnl)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="mx-auto mt-3 w-max space-y-1 whitespace-nowrap pt-2 text-center font-semibold">
                                <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                                  <span className="text-[var(--muted)]">Accuracy</span>
                                  <span className="tabular-nums">{dayAccuracy(day.trades)}</span>
                                </div>
                                <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                                  <span className="text-[var(--muted)]">Profit factor</span>
                                  <span className="tabular-nums">{dayProfitFactor(day.trades)}</span>
                                </div>
                                <div className="grid grid-cols-[max-content_max-content] items-center justify-center gap-x-3">
                                  <span className="text-[var(--muted)]">P&L</span>
                                  <span className="tabular-nums" style={{ color: profitColor(day.pnl) }}>
                                    {fmtMoney(day.pnl)}
                                  </span>
                                </div>
                              </div>
                            </aside>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
