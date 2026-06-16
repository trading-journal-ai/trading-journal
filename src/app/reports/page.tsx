import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { fmtMoney } from "@/lib/format";
import { grossPnl, netPnl } from "@/lib/pnl";
import { etDateString, etDayRange, MARKET_TZ, timeZoneParts } from "@/lib/time";
import ReportRangeFilter from "@/components/ReportRangeFilter";

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
};

type ReportTrade = typeof schema.trades.$inferSelect & {
  pnl: number | null;
  gross: number | null;
};

type Bucket = {
  label: string;
  count: number;
  pnl: number;
};

type Stat = { label: string; value: string };
type StatSection = { title: string; stats: Stat[] };

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
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
}): ReportFilters {
  const presetOptions = new Set<DatePreset>(["all", "today", "week", "month", "year", "custom"]);
  return {
    date: validDate(params.date),
    preset: presetOptions.has(params.preset as DatePreset) ? (params.preset as DatePreset) : "month",
    from: validDate(params.from),
    to: validDate(params.to),
    symbol: params.symbol?.trim().toUpperCase() || undefined,
    side: params.side === "long" || params.side === "short" ? params.side : undefined,
    tag: params.tag || undefined,
    account: params.account || undefined,
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

function yearRange(date: string): { from: string; to: string } {
  const year = date.slice(0, 4);
  return { from: `${year}-01-01`, to: `${year}-12-31` };
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

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  if (day % 10 === 1) return `${day}st`;
  if (day % 10 === 2) return `${day}nd`;
  if (day % 10 === 3) return `${day}rd`;
  return `${day}th`;
}

function monthDayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const monthName = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
  return `${monthName} ${ordinalDay(day)}`;
}

function rangeDateLabel(date: string): string {
  return `${monthDayLabel(date)}, ${date.slice(0, 4)}`;
}

function dateRangeLabel(from: string, to: string): string {
  const fromYear = from.slice(0, 4);
  const toYear = to.slice(0, 4);
  if (fromYear === toYear) return `${monthDayLabel(from)} to ${monthDayLabel(to)}, ${toYear}`;
  return `${rangeDateLabel(from)} to ${rangeDateLabel(to)}`;
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
  if (range.from === range.to) return dateLabel(range.from);
  if (filters.preset === "month") return monthLabel(range.from);
  if (filters.preset === "year") return range.from.slice(0, 4);
  return dateRangeLabel(range.from, range.to);
}

function filterHref(filters: ReportFilters, updates: Partial<ReportFilters>) {
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
  const query = params.toString();
  return query ? `/reports?${query}` : "/reports";
}

async function loadTagOptions() {
  return db.select({ name: schema.tags.name }).from(schema.tags);
}

async function loadTrades(filters: ReportFilters, accountId: number): Promise<ReportTrade[]> {
  let rows = await db
    .select()
    .from(schema.trades)
    .where(eq(schema.trades.accountId, accountId))
    .limit(5000);
  const range = dateRangeFor(filters);

  if (range) {
    const { start } = etDayRange(range.from);
    const { end } = etDayRange(range.to);
    rows = rows.filter((t) => {
      if (t.entryAt == null || t.entryAt < start || t.entryAt > end) return false;
      const entryDate = etDateString(t.entryAt);
      return entryDate >= range.from && entryDate <= range.to;
    });
  }
  if (filters.symbol) rows = rows.filter((t) => t.symbol.toUpperCase().includes(filters.symbol!));
  if (filters.side) rows = rows.filter((t) => t.side === filters.side);

  if (filters.tag) {
    const taggedRows = await db
      .select({ tradeId: schema.tradeTags.tradeId, name: schema.tags.name })
      .from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId));
    const taggedTradeIds = new Set(taggedRows.filter((r) => r.name === filters.tag).map((r) => r.tradeId));
    rows = rows.filter((t) => taggedTradeIds.has(t.id));
  }

  return rows
    .map((t) => ({ ...t, pnl: netPnl(t), gross: grossPnl(t) }))
    .sort((a, b) => (a.entryAt ?? 0) - (b.entryAt ?? 0));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function moneyOrDash(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? "-" : fmtMoney(value);
}

function ratioOrDash(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(2);
}

function percentOrDash(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(1)}%`;
}

function minutesLabel(minutes: number | null): string {
  if (minutes == null || !Number.isFinite(minutes)) return "-";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 60 * 24) {
    const hours = minutes / 60;
    return `${hours < 2 ? "about " : ""}${hours.toFixed(hours < 10 ? 1 : 0)} hours`;
  }
  return `${(minutes / (60 * 24)).toFixed(1)} days`;
}

function maxStreak(values: number[], predicate: (value: number) => boolean): number {
  let best = 0;
  let current = 0;
  for (const value of values) {
    if (predicate(value)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function countWithPercent(count: number, total: number): string {
  return total === 0 ? "0" : `${count} (${((count / total) * 100).toFixed(1)}%)`;
}

function buildStats(trades: ReportTrade[]) {
  const closed = trades.filter((t) => t.pnl != null);
  const pnls = closed.map((t) => t.pnl as number);
  const winners = pnls.filter((pnl) => pnl > 0);
  const losers = pnls.filter((pnl) => pnl < 0);
  const scratches = pnls.filter((pnl) => pnl === 0);
  const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const grossWins = winners.reduce((sum, pnl) => sum + pnl, 0);
  const grossLosses = Math.abs(losers.reduce((sum, pnl) => sum + pnl, 0));
  const grossValues = closed.map((t) => t.gross ?? 0);
  const totalGross = grossValues.reduce((sum, pnl) => sum + pnl, 0);
  const totalShares = closed.reduce((sum, t) => sum + t.quantity, 0);
  const shareSizes = closed.map((t) => Math.abs(t.quantity));
  const perShareValues = closed
    .filter((t) => t.quantity !== 0)
    .map((t) => ({
      pnl: t.pnl as number,
      value: (t.gross ?? t.pnl ?? 0) / Math.abs(t.quantity),
    }));
  const winningPerShare = perShareValues
    .filter((t) => t.pnl > 0)
    .map((t) => t.value);
  const losingPerShare = perShareValues
    .filter((t) => t.pnl < 0)
    .map((t) => t.value);
  const dailyPnl = [...closed.reduce((map, trade) => {
    if (trade.entryAt == null) return map;
    const date = etDateString(trade.entryAt);
    map.set(date, (map.get(date) ?? 0) + (trade.pnl ?? 0));
    return map;
  }, new Map<string, number>()).values()];
  const holdMinutesFor = (predicate: (pnl: number) => boolean) => closed
    .filter((t) => t.entryAt != null && t.exitAt != null && t.pnl != null && predicate(t.pnl))
    .map((t) => ((t.exitAt as number) - (t.entryAt as number)) / 60);
  const avgTrade = average(pnls);
  const winRate = winners.length + losers.length === 0 ? null : winners.length / (winners.length + losers.length);
  const avgWinner = average(winners);
  const avgLoser = average(losers);
  const payoffRatio = avgWinner == null || avgLoser == null || avgLoser === 0 ? null : avgWinner / Math.abs(avgLoser);

  return [
    {
      title: "Performance",
      stats: [
        { label: "Total Gain/Loss", value: fmtMoney(totalPnl) },
        { label: "Average Daily Gain/Loss", value: moneyOrDash(average(dailyPnl)) },
        { label: "Average Trade Gain/Loss", value: moneyOrDash(avgTrade) },
        { label: "Largest Gain", value: moneyOrDash(winners.length ? Math.max(...winners) : null) },
        { label: "Largest Loss", value: moneyOrDash(losers.length ? Math.min(...losers) : null) },
      ],
    },
    {
      title: "Accuracy",
      stats: [
        { label: "Win Rate", value: percentOrDash(winRate) },
        { label: "Number of Winning Trades", value: countWithPercent(winners.length, closed.length) },
        { label: "Number of Losing Trades", value: countWithPercent(losers.length, closed.length) },
        { label: "Average Winning Trade", value: moneyOrDash(avgWinner) },
        { label: "Average Losing Trade", value: moneyOrDash(avgLoser) },
        { label: "Payoff Ratio", value: ratioOrDash(payoffRatio) },
        { label: "Profit Factor", value: ratioOrDash(grossLosses === 0 ? null : grossWins / grossLosses) },
        { label: "Max Consecutive Wins", value: String(maxStreak(pnls, (pnl) => pnl > 0)) },
        { label: "Max Consecutive Losses", value: String(maxStreak(pnls, (pnl) => pnl < 0)) },
      ],
    },
    {
      title: "Sizing",
      stats: [
        { label: "Average Share Size", value: shareSizes.length ? Math.round(average(shareSizes) ?? 0).toLocaleString() : "-" },
        { label: "Median Share Size", value: shareSizes.length ? Math.round(median(shareSizes) ?? 0).toLocaleString() : "-" },
        { label: "Total Shares Traded", value: totalShares.toLocaleString() },
        { label: "Average Daily Volume", value: dailyPnl.length ? Math.round(totalShares / dailyPnl.length).toLocaleString() : "-" },
        { label: "Average Per-share Gain/Loss", value: totalShares > 0 ? fmtMoney(totalGross / totalShares) : "-" },
        { label: "High Winning Per-share", value: moneyOrDash(winningPerShare.length ? Math.max(...winningPerShare) : null) },
        { label: "Average Winning Per-share", value: moneyOrDash(average(winningPerShare)) },
        { label: "Average Losing Per-share", value: moneyOrDash(average(losingPerShare)) },
        { label: "Worst Losing Per-share", value: moneyOrDash(losingPerShare.length ? Math.min(...losingPerShare) : null) },
      ],
    },
    {
      title: "Timing",
      stats: [
        { label: "Number of Scratch Trades", value: countWithPercent(scratches.length, closed.length) },
        { label: "Average Hold Time (winning trades)", value: minutesLabel(average(holdMinutesFor((pnl) => pnl > 0))) },
        { label: "Average Hold Time (losing trades)", value: minutesLabel(average(holdMinutesFor((pnl) => pnl < 0))) },
      ],
    },
  ] satisfies StatSection[];
}

function emptyBuckets(labels: string[]): Bucket[] {
  return labels.map((label) => ({ label, count: 0, pnl: 0 }));
}

function addToBucket(bucket: Bucket, trade: ReportTrade) {
  bucket.count += 1;
  bucket.pnl += trade.pnl ?? 0;
}

function buildDayBuckets(trades: ReportTrade[]): Bucket[] {
  const buckets = emptyBuckets(dayLabels);
  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const parts = timeZoneParts(trade.entryAt * 1000, MARKET_TZ);
    const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
    addToBucket(buckets[weekday], trade);
  }
  return buckets;
}

function buildHourBuckets(trades: ReportTrade[]): Bucket[] {
  const firstHour = 7;
  const lastHour = 19;
  const buckets = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => ({
    label: `${String(i + firstHour).padStart(2, "0")}:00`,
    count: 0,
    pnl: 0,
  }));
  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const parts = timeZoneParts(trade.entryAt * 1000, MARKET_TZ);
    if (parts.hour < firstHour || parts.hour > lastHour) continue;
    addToBucket(buckets[parts.hour - firstHour], trade);
  }
  return buckets;
}

function buildMonthBuckets(trades: ReportTrade[]): Bucket[] {
  const buckets = emptyBuckets(monthLabels);
  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const parts = timeZoneParts(trade.entryAt * 1000, MARKET_TZ);
    addToBucket(buckets[parts.month - 1], trade);
  }
  return buckets;
}

function buildDurationBuckets(trades: ReportTrade[]): Bucket[] {
  const buckets = [
    { label: "< 1m", count: 0, pnl: 0 },
    { label: "1-5m", count: 0, pnl: 0 },
    { label: "5-15m", count: 0, pnl: 0 },
    { label: "15-60m", count: 0, pnl: 0 },
    { label: "1h+", count: 0, pnl: 0 },
  ];
  for (const trade of trades) {
    if (trade.entryAt == null || trade.exitAt == null) continue;
    const minutes = (trade.exitAt - trade.entryAt) / 60;
    const index = minutes < 1 ? 0 : minutes < 5 ? 1 : minutes < 15 ? 2 : minutes < 60 ? 3 : 4;
    addToBucket(buckets[index], trade);
  }
  return buckets;
}

function buildDailyPnl(trades: ReportTrade[]) {
  const byDate = new Map<string, number>();
  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const date = etDateString(trade.entryAt);
    byDate.set(date, (byDate.get(date) ?? 0) + (trade.pnl ?? 0));
  }

  let cumulative = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl, cumulative };
    });
}

function FilterBar({ filters, tagOptions }: { filters: ReportFilters; tagOptions: { name: string }[] }) {
  const activePreset: DatePreset = filters.date ? "custom" : filters.preset;
  const presetBase = { date: undefined, from: undefined, to: undefined };
  const presetButtonClass = (preset: DatePreset) =>
    `flex h-8 min-w-16 items-center justify-center rounded px-3 text-sm font-semibold transition-colors ${
      activePreset === preset
        ? "bg-[var(--surface-2)] text-[var(--foreground)]"
        : "text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <form action="/reports" className="space-y-4">
      <input type="hidden" name="preset" value={activePreset} />
      {filters.date && <input type="hidden" name="date" value={filters.date} />}
      {filters.from && <input type="hidden" name="from" value={filters.from} />}
      {filters.to && <input type="hidden" name="to" value={filters.to} />}
      <div className="relative mb-4 space-y-2">
        <span className="block text-sm font-semibold text-[var(--muted)]">Date range</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div className="inline-flex h-10 items-center rounded-md border border-[var(--border)] p-1">
            <Link href={filterHref(filters, { ...presetBase, preset: "today" })} className={presetButtonClass("today")}>Today</Link>
            <Link href={filterHref(filters, { ...presetBase, preset: "week" })} className={presetButtonClass("week")}>Week</Link>
            <Link href={filterHref(filters, { ...presetBase, preset: "month" })} className={presetButtonClass("month")}>Month</Link>
            <Link href={filterHref(filters, { ...presetBase, preset: "year" })} className={presetButtonClass("year")}>Year</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <ReportRangeFilter from={filters.from} to={filters.to} clearHref="/reports" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Symbol</span>
          <input name="symbol" defaultValue={filters.symbol ?? ""} placeholder="Symbol" className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#58a6ff]" />
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Tag</span>
          <select name="tag" defaultValue={filters.tag ?? ""} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#58a6ff]">
            <option value="">All tags</option>
            {tagOptions.map((tagOption) => <option key={tagOption.name} value={tagOption.name}>{tagOption.name}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-sm font-semibold text-[var(--muted)]">Side</span>
          <select name="side" defaultValue={filters.side ?? ""} className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none focus:border-[#58a6ff]">
            <option value="">All sides</option>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className="h-10 rounded-md border border-[#58a6ff] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]">Apply</button>
        </div>
      </div>
    </form>
  );
}

const pairedStatLabels = [
  [
    ["Total Gain/Loss", "Average Daily Gain/Loss"],
    ["Average Trade Gain/Loss", "Average Per-share Gain/Loss"],
    ["Profit Factor", "Payoff Ratio"],
  ],
  [
    ["Number of Winning Trades", "Number of Losing Trades"],
    ["Average Winning Trade", "Average Losing Trade"],
    ["Largest Gain", "Largest Loss"],
    ["Max Consecutive Wins", "Max Consecutive Losses"],
    ["Average Hold Time (winning trades)", "Average Hold Time (losing trades)"],
    ["High Winning Per-share", "Worst Losing Per-share"],
    ["Average Winning Per-share", "Average Losing Per-share"],
  ],
  [
    ["Average Share Size", "Median Share Size"],
    ["Average Daily Volume", "Number of Scratch Trades"],
  ],
];

function findStat(sections: StatSection[], label: string) {
  return sections.flatMap((section) => section.stats).find((stat) => stat.label === label);
}

const signedStatLabels = new Set([
  "Total Gain/Loss",
  "Average Daily Gain/Loss",
  "Average Trade Gain/Loss",
  "Average Per-share Gain/Loss",
]);

const greenStatLabels = new Set([
  "Number of Winning Trades",
  "Average Winning Trade",
  "Largest Gain",
  "High Winning Per-share",
  "Average Winning Per-share",
]);

const redStatLabels = new Set([
  "Number of Losing Trades",
  "Average Losing Trade",
  "Largest Loss",
  "Worst Losing Per-share",
  "Average Losing Per-share",
]);

function statValueColor(stat: Stat) {
  if (stat.value.trim() === "-") return undefined;
  if (greenStatLabels.has(stat.label)) return "var(--green)";
  if (redStatLabels.has(stat.label)) return "var(--red)";
  if (!signedStatLabels.has(stat.label)) return undefined;
  if (stat.value.trim().startsWith("-")) return "var(--red)";
  if (stat.value !== "-" && !stat.value.startsWith("$0.00")) return "var(--green)";
  return undefined;
}

function StatCell({ stat }: { stat: Stat }) {
  const valueColor = statValueColor(stat);
  const countValue = stat.value.match(/^(\d+)\s+\(([^)]+)\)$/);

  return (
    <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
      <div className="text-sm font-medium leading-snug text-[var(--body)]">{stat.label}</div>
      <div className="whitespace-nowrap text-right font-mono text-sm font-semibold tabular-nums text-[var(--foreground)]">
        {countValue ? (
          <span className="inline-flex items-baseline gap-2">
            <span style={{ color: valueColor }}>{countValue[1]}</span>
            <span className="text-sm font-semibold text-[var(--muted)]">/</span>
            <span className="text-sm font-semibold text-[var(--foreground)]">{countValue[2]}</span>
          </span>
        ) : (
          <span style={{ color: valueColor }}>{stat.value}</span>
        )}
      </div>
    </div>
  );
}

function StatsGrid({ sections }: { sections: StatSection[] }) {
  const groups = pairedStatLabels
    .map((group) =>
      group
        .map((row) => row.map((label) => findStat(sections, label)).filter((stat): stat is Stat => Boolean(stat)))
        .filter((row) => row.length > 0),
    )
    .filter((group) => group.length > 0);

  return (
    <section>
      <h2 className="mb-8 text-xl font-semibold tracking-tight text-[var(--foreground)]">
        Stats
      </h2>

      <div className="grid gap-[2px] overflow-hidden rounded-[2px] bg-black p-[2px]">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="grid gap-[2px]">
            {group.map((row, rowIndex) => (
              <div key={rowIndex} className="grid gap-[2px] md:grid-cols-2">
                {row.map((stat) => (
                  <div key={stat.label} className="flex min-h-14 items-center bg-[#14171a] px-12 py-3">
                    <StatCell stat={stat} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function CountChart({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <section>
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">{title}</h2>
      <div className="mb-4 mt-4 border-t border-[var(--hairline)]" />
      <div className="space-y-2">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="grid grid-cols-[64px_1fr_56px] items-center gap-3 text-sm">
            <div className="text-[var(--muted)]">{bucket.label}</div>
            <div className="h-2 bg-[#14171a]" style={{ borderRadius: 2 }}>
              <div
                className="h-2 bg-[var(--green)]"
                style={{ width: `${Math.max(2, (bucket.count / max) * 100)}%`, borderRadius: 2 }}
              />
            </div>
            <div className="text-right tabular-nums text-[var(--muted)]">{bucket.count}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PnlChart({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const maxAbs = Math.max(1, ...buckets.map((bucket) => Math.abs(bucket.pnl)));
  return (
    <section>
      <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">{title}</h2>
      <div className="mb-4 mt-4 border-t border-[var(--hairline)]" />
      <div className="space-y-2">
        {buckets.map((bucket) => {
          const pos = bucket.pnl >= 0;
          return (
            <div key={bucket.label} className="grid grid-cols-[64px_1fr_80px] items-center gap-3 text-sm">
              <div className="text-[var(--muted)]">{bucket.label}</div>
              <div className="grid h-2 grid-cols-2 bg-[#14171a]" style={{ borderRadius: 2 }}>
                <div className="flex justify-end">
                  {!pos && (
                    <div
                      className="h-2 bg-[var(--red)]"
                      style={{ width: `${Math.max(2, (Math.abs(bucket.pnl) / maxAbs) * 100)}%`, borderRadius: 2 }}
                    />
                  )}
                </div>
                <div>
                  {pos && (
                    <div
                      className="h-2 bg-[var(--green)]"
                      style={{ width: `${Math.max(2, (bucket.pnl / maxAbs) * 100)}%`, borderRadius: 2 }}
                    />
                  )}
                </div>
              </div>
              <div
                className="text-right tabular-nums text-[var(--foreground)]"
                style={{ color: bucket.pnl > 0 ? "var(--green)" : bucket.pnl < 0 ? "var(--red)" : undefined }}
              >
                {fmtMoney(bucket.pnl)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CumulativePnlLine({ points }: { points: { date: string; cumulative: number }[] }) {
  const width = 560;
  const height = 240;
  const padTop = 18;
  const padRight = 18;
  const padBottom = 26;
  const padLeft = 64;
  const values = points.map((point) => point.cumulative);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  const rawSpan = rawMax - rawMin || 1;
  const stepBase = 10 ** Math.floor(Math.log10(rawSpan / 5));
  const stepRatio = rawSpan / 5 / stepBase;
  const step = (stepRatio <= 1 ? 1 : stepRatio <= 2 ? 2 : stepRatio <= 5 ? 5 : 10) * stepBase;
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const span = max - min || 1;
  const yTicks = Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => min + index * step);
  const axisMoney = (value: number) => {
    const sign = value < 0 ? "-" : "";
    return `${sign}$${Math.abs(Math.round(value)).toLocaleString()}`;
  };
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const yFor = (value: number) => padTop + ((max - value) / span) * plotHeight;
  const path = points.map((point, index) => {
    const x = padLeft + (points.length === 1 ? 0 : (index / (points.length - 1)) * plotWidth);
    const y = yFor(point.cumulative);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  const ticks = points.length <= 8 ? points : points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 4) === 0);
  const final = values.at(-1) ?? 0;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <span
          className="text-sm font-semibold tabular-nums text-[var(--foreground)]"
          style={{ color: final > 0 ? "var(--green)" : final < 0 ? "var(--red)" : undefined }}
        >
          {fmtMoney(final)}
        </span>
      </div>
      {points.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[var(--muted)]">No closed trades in range.</div>
      ) : (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label="P&L over selected range">
            {yTicks.map((tick) => {
              const y = yFor(tick);
              return (
                <g key={tick}>
                  <text
                    x={0}
                    y={y}
                    dy="0.35em"
                    fill="var(--muted)"
                    fontFamily="var(--font-mono)"
                    fontSize="12"
                    fontWeight="400"
                    textAnchor="start"
                  >
                    {axisMoney(tick)}
                  </text>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke="var(--muted)"
                    strokeOpacity={tick === 0 ? "0.55" : "0.28"}
                  />
                </g>
              );
            })}
            <path d={path} fill="none" stroke={final >= 0 ? "var(--green)" : "var(--red)"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="mt-3 flex justify-between text-xs text-[var(--muted)]">
            {ticks.map((point) => <span key={point.date}>{point.date.slice(5)}</span>)}
          </div>
        </div>
      )}
    </>
  );
}

const performanceSnapshotLabels = [
  { source: "Profit Factor", label: "Profit Factor" },
  { source: "Win Rate", label: "Win Rate" },
  { source: "Number of Winning Trades", label: "Winning Trades" },
  { source: "Number of Losing Trades", label: "Losing Trades" },
  { source: "Largest Gain", label: "Largest Gain" },
  { source: "Largest Loss", label: "Largest Loss" },
];

function PerformanceSnapshot({ sections }: { sections: StatSection[] }) {
  const stats = performanceSnapshotLabels
    .map(({ source, label }) => {
      const stat = findStat(sections, source);
      return stat ? { ...stat, label } : null;
    })
    .filter((stat): stat is Stat => Boolean(stat));
  const valueColor = (label: string) => {
    if (label === "Win Rate" || label === "Winning Trades" || label === "Largest Gain") return "var(--green)";
    if (label === "Losing Trades" || label === "Largest Loss") return "var(--red)";
    return undefined;
  };

  return (
    <div className="flex h-full flex-col">
      <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">At a glance</h3>
      <div className="grid flex-1 auto-rows-fr grid-cols-2 gap-[2px] overflow-hidden rounded-[2px] bg-black p-[2px]">
        {stats.map((stat) => {
          const countValue = stat.value.match(/^(\d+)\s+\(([^)]+)\)$/);
          return (
            <div key={stat.label} className="flex min-h-24 flex-col justify-center bg-[#14171a] px-4 py-4">
              <div className="text-xs font-medium leading-snug text-[var(--muted)]">{stat.label}</div>
              <div className="mt-3 font-mono text-xl font-semibold leading-none tabular-nums text-[var(--foreground)]">
                {countValue ? (
                  <span className="inline-flex items-baseline gap-2">
                    <span style={{ color: valueColor(stat.label) }}>{countValue[1]}</span>
                    <span className="text-xs font-medium text-[var(--muted)]">{countValue[2]}</span>
                  </span>
                ) : (
                  <span style={{ color: valueColor(stat.label) }}>{stat.value}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PnlModule({
  points,
  rangeLabel,
  sections,
}: {
  points: { date: string; pnl: number; cumulative: number }[];
  rangeLabel: string;
  sections: StatSection[];
}) {
  return (
    <section>
      <h2 className="mb-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
          Performance
        </span>
        {" "}
        {rangeLabel !== "All dates" ? (
          <span className="font-mono text-base text-[var(--muted)]">{rangeLabel}</span>
        ) : null}
      </h2>
      <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex h-full flex-col">
          <h3 className="mb-4 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
            Cumulative P&L
          </h3>
          <div className="flex-1 overflow-hidden rounded-[2px] bg-black p-[2px]">
            <div className="h-full bg-[#14171a] px-6 py-5">
              <CumulativePnlLine points={points} />
            </div>
          </div>
        </div>
        <PerformanceSnapshot sections={sections} />
      </div>
    </section>
  );
}

export default async function ReportsPage({
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
  }>;
}) {
  const filters = parseSearchParams(await searchParams);
  const activeAccount = await getActiveAccount();
  const [trades, tagOptions] = await Promise.all([loadTrades(filters, activeAccount.id), loadTagOptions()]);
  const statSections = buildStats(trades);
  const dayBuckets = buildDayBuckets(trades);
  const hourBuckets = buildHourBuckets(trades);
  const monthBuckets = buildMonthBuckets(trades);
  const durationBuckets = buildDurationBuckets(trades);
  const dailyPnl = buildDailyPnl(trades);
  const rangeLabel = reportRangeLabel(filters);

  return (
    <div className="mx-auto max-w-6xl">
      <FilterBar filters={filters} tagOptions={tagOptions} />

      <div className="mt-10">
        <PnlModule points={dailyPnl} rangeLabel={rangeLabel} sections={statSections} />
      </div>

      <div className="mt-16">
        <StatsGrid sections={statSections} />
      </div>

      <div className="mt-24">
        <h2 className="mb-8 text-xl font-semibold tracking-tight text-[var(--foreground)]">Breakdowns</h2>
        <div className="grid gap-x-24 gap-y-16 md:grid-cols-2">
          <CountChart title="Trade Distribution by Duration" buckets={durationBuckets} />
          <PnlChart title="Performance by Duration" buckets={durationBuckets} />
          <CountChart title="Trade Distribution by Day of Week" buckets={dayBuckets} />
          <PnlChart title="Performance by Day of Week" buckets={dayBuckets} />
          <CountChart title="Trade Distribution by Hour of Day" buckets={hourBuckets} />
          <PnlChart title="Performance by Hour of Day" buckets={hourBuckets} />
          <CountChart title="Trade Distribution by Month" buckets={monthBuckets} />
          <PnlChart title="Performance by Month" buckets={monthBuckets} />
        </div>
      </div>
    </div>
  );
}
