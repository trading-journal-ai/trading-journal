import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { generateCoachReviewAction, saveDraftCoachReviewAction } from "@/app/coach/actions";
import { saveCoachExperimentAction } from "@/app/journal/actions";
import { db, schema } from "@/lib/db";
import { parseCoachStoredReview, type CoachStoredReview } from "@/lib/coach/generatedReview";
import CollapsibleSection from "@/components/CollapsibleSection";
import { buildSessionFactPack, type SessionFactPack } from "@/lib/coach/reviewEngine";
import { shortEntryReason, type TradeOpportunityContext } from "@/lib/coach/opportunityContext";
import { opportunityContextsForTrades } from "@/lib/coach/opportunityContextService";
import { isDemoReadOnly } from "@/lib/demoMode";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";
import ArchiveSidebar, { type ArchiveSidebarMonth } from "@/components/ArchiveSidebar";
import Breadcrumbs, { originCrumbFromHref } from "@/components/Breadcrumbs";
import InlineImportPrompt from "@/components/InlineImportPrompt";
import JournalReviewModule, {
  type JournalComparisonData,
  type JournalDayProcessFact,
  type JournalDayTradeRow,
} from "@/components/JournalDayDataViews";
import RecapNote from "@/components/RecapNote";
import TickerReviewRail from "@/components/TickerReviewRail";

export type JournalReviewPreset = "today" | "week" | "month";
export type JournalReviewSearchParams = {
  date?: string;
  preset?: string;
  from?: string;
  month?: string;
};

type TradeRow = typeof schema.trades.$inferSelect;
type ExecutionRow = typeof schema.executions.$inferSelect;

type TickerRow = {
  symbol: string;
  pnl: number;
  trades: number;
  noted: boolean;
};

type ReviewSummary = {
  trades: number;
  fills: number;
  wins: number;
  losses: number;
  grossWins: number;
  grossLosses: number;
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
};

type ReviewDay = ReviewSummary & {
  date: string;
  label: string;
  displayDate: string;
};

type PnlPoint = {
  time: string;
  value: number;
};

type KeyTradePrompt = {
  key: string;
  label: string;
  symbol: string;
  pnl: number;
  href: string;
  /** Chart-evidence entry read, e.g. "entered 38 min past the high, 2.1 ATR extended". */
  entryReason: string | null;
};

type WorstTradeCardData = {
  symbol: string;
  side: "long" | "short";
  shares: number;
  timeRange: string;
  pnl: number;
  fills: number;
  href: string;
  entryReason: string | null;
};

type ReviewData = {
  day: ReviewDay;
  tickerRows: TickerRow[];
  tradeRows: JournalDayTradeRow[];
  taggedTrades: number;
  pnlPoints: PnlPoint[];
  coachRead: SessionFactPack;
  keyTradePrompts: KeyTradePrompt[];
  worstTrade: WorstTradeCardData | null;
};

type ReviewWeek = ReviewSummary & {
  key: string;
  label: string;
  displayDate: string;
  days: ReviewData[];
};

type ReviewRange = ReviewSummary & {
  preset: JournalReviewPreset;
  anchor: string;
  title: string;
  eyebrow: string;
  displayDate: string;
  days: ReviewData[];
  weeks: ReviewWeek[];
  coachRead: SessionFactPack;
};

type ReviewArchive = {
  months: ArchiveSidebarMonth[];
  years: {
    key: string;
    label: string;
    href: string;
  }[];
};

type ReviewScope = {
  scope: "day" | "week" | "month";
  scopeKey: string;
};

type SavedCoachExperiment = {
  action: string;
  trigger: string;
  updatedAt: Date;
};

type SavedCoachReview = {
  status: string;
  updatedAt: Date;
  storedReview: CoachStoredReview | null;
};

type ScopedRecapNote = {
  text: string;
  thesis: string;
  whatWentWell: string;
  whatWentWrong: string;
  emotionalState: string;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const monthNameFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

function utcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function formatPercent(value: number | null) {
  return value == null ? "-" : `${(value * 100).toFixed(1)}%`;
}

function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-[var(--muted)]";
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function formatTime(epochSeconds: number): string {
  return timeFmt.format(new Date(epochSeconds * 1000)).replace(/^24:/, "00:");
}

function formatHold(entryAt: number | null, exitAt: number | null): string {
  if (entryAt == null || exitAt == null || exitAt < entryAt) return "Open";
  const seconds = exitAt - entryAt;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function validMonth(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

export function parseJournalReviewSearchParams(params: JournalReviewSearchParams): {
  preset: JournalReviewPreset;
  date?: string;
  from?: string;
  month?: string;
} {
  const presetOptions = new Set<JournalReviewPreset>(["today", "week", "month"]);
  const date = validDate(params.date);
  return {
    preset: date
      ? "today"
      : presetOptions.has(params.preset as JournalReviewPreset)
        ? (params.preset as JournalReviewPreset)
        : "month",
    date,
    from: validDate(params.from),
    month: validMonth(params.month),
  };
}

export function journalReviewHref(
  basePath: string,
  {
    preset,
    date,
    from,
    month,
  }: {
    preset: JournalReviewPreset;
    date?: string;
    from?: string;
    month?: string;
  },
) {
  const params = new URLSearchParams();
  if (preset !== "month") params.set("preset", preset);
  if (date) params.set("date", date);
  if (from) params.set("from", from);
  if (month) params.set("month", month);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function isoAddDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isoWeekday(date: string): number {
  return utcDate(date).getUTCDay();
}

function weekStartFor(date: string): string {
  return isoAddDays(date, -((isoWeekday(date) + 6) % 7));
}

function lastDayOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

function weekRangeLabel(weekStart: string): string {
  const weekEnd = isoAddDays(weekStart, 4);
  const start = utcDate(weekStart);
  const end = utcDate(weekEnd);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  if (startYear === endYear && start.getUTCMonth() === end.getUTCMonth()) {
    return `${monthNameFmt.format(start)} ${start.getUTCDate()} - ${end.getUTCDate()} ${endYear}`;
  }

  if (startYear === endYear) {
    return `${monthDayFmt.format(start)} - ${monthDayFmt.format(end)} ${endYear}`;
  }

  return `${monthDayFmt.format(start)} ${startYear} - ${monthDayFmt.format(end)} ${endYear}`;
}

function archiveWeekLabel(monthKey: string, weekStart: string): string {
  const firstWeekStart = weekStartFor(`${monthKey}-01`);
  const daysFromFirstWeek = Math.round((Date.parse(`${weekStart}T00:00:00Z`) - Date.parse(`${firstWeekStart}T00:00:00Z`)) / 86400000);
  return `Week ${Math.floor(daysFromFirstWeek / 7) + 1}`;
}

function archiveWeekRangeLabel(weekStart: string, monthKey: string): string {
  const start = weekStart < `${monthKey}-01` ? `${monthKey}-01` : weekStart;
  const endOfWeek = isoAddDays(weekStart, 4);
  const endOfMonth = lastDayOfMonth(`${monthKey}-01`);
  const end = endOfWeek > endOfMonth ? endOfMonth : endOfWeek;
  return `${Number(start.slice(-2))}-${Number(end.slice(-2))}`;
}

function journalWeekSectionId(weekKey: string): string {
  return `journal-week-${weekKey}`;
}

function journalWeekSectionHref(basePath: string, monthKey: string, weekKey: string): string {
  return `${journalReviewHref(basePath, { preset: "month", from: `${monthKey}-01` })}#${journalWeekSectionId(weekKey)}`;
}

type ArchiveLinkMode = "legacy" | "review-module";

/** One-line status for the collapsed coach section: automatic tier + AI tier. */
function coachSectionStatus(savedReview: SavedCoachReview | null): string {
  const auto = "automatic review ready";
  if (savedReview?.status === "generated" && savedReview.storedReview && "review" in savedReview.storedReview) {
    return `${auto} · AI review generated`;
  }
  if (savedReview?.status === "draft") return `${auto} · draft payload saved, no AI review yet`;
  if (savedReview?.status === "stale") return `${auto} · last AI generation failed`;
  return `${auto} · no AI review yet`;
}

function journalReviewModuleHref(
  basePath: string,
  date: string,
): string {
  const params = new URLSearchParams({ date });
  return `${basePath}?${params.toString()}`;
}

function archiveWeeks(
  monthKey: string,
  activeWeekKey: string | undefined,
  basePath: string,
  linkMode: ArchiveLinkMode,
  latestDate?: string,
): ArchiveSidebarMonth["weeks"] {
  const monthStart = `${monthKey}-01`;
  const monthEnd = lastDayOfMonth(monthStart);
  let weekStart = weekStartFor(monthStart);
  const weeks: ArchiveSidebarMonth["weeks"] = [];

  const lastVisibleDate = latestDate && latestDate.slice(0, 7) === monthKey
    ? latestDate
    : monthEnd;

  while (weekStart <= monthEnd && weekStart <= lastVisibleDate) {
    const weekEnd = isoAddDays(weekStart, 4);
    const intersectsMonth = weekEnd >= monthStart && weekStart <= monthEnd;
    if (intersectsMonth) {
      weeks.push({
        key: weekStart,
        label: archiveWeekLabel(monthKey, weekStart),
        rangeLabel: archiveWeekRangeLabel(weekStart, monthKey),
        active: weekStart === activeWeekKey,
        href: linkMode === "review-module"
          ? `${basePath}?month=${monthKey}#${journalWeekSectionId(weekStart)}`
          : journalWeekSectionHref(basePath, monthKey, weekStart),
        sectionId: journalWeekSectionId(weekStart),
      });
    }
    weekStart = isoAddDays(weekStart, 7);
  }

  return weeks;
}

function isOptionalCoachReadError(error: unknown): boolean {
  let current: unknown = error;

  while (current instanceof Error) {
    if (/no such (table|column)|SQLITE_ERROR|SQLITE_UNKNOWN|libsql/i.test(current.message)) {
      return true;
    }
    current = current.cause;
  }

  return false;
}

function summarizeTrades(trades: TradeRow[], fills: number): ReviewSummary {
  const pnls = trades.map((trade) => netPnl(trade) ?? 0);
  const winners = pnls.filter((pnl) => pnl > 0);
  const losers = pnls.filter((pnl) => pnl < 0);
  const grossWins = winners.reduce((sum, value) => sum + value, 0);
  const grossLosses = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  const counted = winners.length + losers.length;
  const pnl = pnls.reduce((sum, value) => sum + value, 0);

  return {
    trades: trades.length,
    fills,
    wins: winners.length,
    losses: losers.length,
    grossWins,
    grossLosses,
    accuracy: counted === 0 ? null : Math.round((winners.length / counted) * 100),
    profitFactor: grossLosses === 0 ? null : grossWins / grossLosses,
    pnl,
  };
}

function summarizeDays(days: ReviewData[]): ReviewSummary {
  const summary = days.reduce(
    (acc, data) => {
      acc.trades += data.day.trades;
      acc.fills += data.day.fills;
      acc.wins += data.day.wins;
      acc.losses += data.day.losses;
      acc.grossWins += data.day.grossWins;
      acc.grossLosses += data.day.grossLosses;
      acc.pnl += data.day.pnl;
      return acc;
    },
    { trades: 0, fills: 0, wins: 0, losses: 0, grossWins: 0, grossLosses: 0, pnl: 0 },
  );
  const counted = summary.wins + summary.losses;

  return {
    ...summary,
    accuracy: counted === 0 ? null : Math.round((summary.wins / counted) * 100),
    profitFactor: summary.grossLosses === 0 ? null : summary.grossWins / summary.grossLosses,
  };
}

function currentEtDate(): string {
  return etDateString(Math.floor(Date.now() / 1000));
}

function rangeForPreset(preset: JournalReviewPreset, anchor: string): { from: string; to: string } {
  if (preset === "today") return { from: anchor, to: anchor };
  if (preset === "week") {
    const weekStart = weekStartFor(anchor);
    return { from: weekStart, to: isoAddDays(weekStart, 4) };
  }

  return { from: `${anchor.slice(0, 7)}-01`, to: lastDayOfMonth(anchor) };
}

function reviewDatesForRange(
  preset: JournalReviewPreset,
  range: { from: string; to: string },
): string[] {
  if (preset === "today") return [range.from];

  const dates: string[] = [];
  for (let date = range.from; date <= range.to; date = isoAddDays(date, 1)) {
    const weekday = isoWeekday(date);
    if (weekday >= 1 && weekday <= 5) dates.push(date);
  }
  return dates;
}

function buildDayData(
  date: string,
  trades: TradeRow[],
  executions: ExecutionRow[],
  notedTickerKeys: Set<string>,
  taggedTradeIds: Set<number>,
  entryContexts?: Map<number, TradeOpportunityContext>,
): ReviewData {
  const entryReasonFor = (tradeId: number): string | null => {
    const ctx = entryContexts?.get(tradeId);
    return ctx ? shortEntryReason(ctx) : null;
  };
  const executionCountByTrade = new Map<number, number>();
  executions.forEach((execution) => {
    if (execution.tradeId == null) return;
    executionCountByTrade.set(execution.tradeId, (executionCountByTrade.get(execution.tradeId) ?? 0) + 1);
  });

  const summary = summarizeTrades(
    trades,
    trades.reduce((sum, trade) => sum + (executionCountByTrade.get(trade.id) ?? 0), 0),
  );
  const tickers = new Map<string, TickerRow>();

  trades.forEach((trade) => {
    const current = tickers.get(trade.symbol) ?? {
      symbol: trade.symbol,
      pnl: 0,
      trades: 0,
      noted: notedTickerKeys.has(`${date}:${trade.symbol}`),
    };
    current.pnl += netPnl(trade) ?? 0;
    current.trades += 1;
    tickers.set(trade.symbol, current);
  });

  const { start } = etDayRange(date);
  let cumulative = 0;
  const pnlPoints: PnlPoint[] = [{ time: formatTime(trades[0]?.entryAt ?? start), value: 0 }];
  trades
    .filter((trade) => trade.exitAt != null)
    .sort((a, b) => (a.exitAt ?? 0) - (b.exitAt ?? 0))
    .forEach((trade) => {
      cumulative += netPnl(trade) ?? 0;
      pnlPoints.push({ time: formatTime(trade.exitAt ?? trade.entryAt ?? start), value: cumulative });
    });

  if (pnlPoints.length === 1) {
    pnlPoints.push({ time: formatTime(trades.at(-1)?.entryAt ?? start), value: summary.pnl });
  }

  const closedTrades = trades
    .map((trade) => ({ trade, pnl: netPnl(trade) ?? 0 }))
    .filter(({ trade }) => trade.exitAt != null);
  const bestTrade = [...closedTrades].sort((a, b) => b.pnl - a.pnl)[0];
  const worstTrade = [...closedTrades].sort((a, b) => a.pnl - b.pnl)[0];
  const biggestTicker = [...tickers.values()].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))[0];
  const keyTradePrompts: KeyTradePrompt[] = [];

  if (bestTrade) {
    keyTradePrompts.push({
      key: `best-${bestTrade.trade.id}`,
      label: "Best trade",
      symbol: bestTrade.trade.symbol,
      pnl: bestTrade.pnl,
      href: `/trades/review?date=${date}&symbol=${bestTrade.trade.symbol}&trade=${bestTrade.trade.id}&returnTo=${encodeURIComponent(journalReviewModuleHref("/journal", date))}`,
      entryReason: entryReasonFor(bestTrade.trade.id),
    });
  }
  if (worstTrade && worstTrade.trade.id !== bestTrade?.trade.id) {
    keyTradePrompts.push({
      key: `worst-${worstTrade.trade.id}`,
      label: "Worst trade",
      symbol: worstTrade.trade.symbol,
      pnl: worstTrade.pnl,
      href: `/trades/review?date=${date}&symbol=${worstTrade.trade.symbol}&trade=${worstTrade.trade.id}&returnTo=${encodeURIComponent(journalReviewModuleHref("/journal", date))}`,
      entryReason: entryReasonFor(worstTrade.trade.id),
    });
  }
  if (biggestTicker && biggestTicker.trades > 1) {
    keyTradePrompts.push({
      key: `ticker-${biggestTicker.symbol}`,
      label: "Ticker to explain",
      symbol: biggestTicker.symbol,
      pnl: biggestTicker.pnl,
      href: `/trades/review?date=${date}&symbol=${biggestTicker.symbol}&returnTo=${encodeURIComponent(journalReviewModuleHref("/journal", date))}`,
      entryReason: null,
    });
  }

  const dayReturnTo = journalReviewModuleHref("/journal", date);
  const worstTradeCard: WorstTradeCardData | null =
    worstTrade && worstTrade.pnl < 0
      ? {
          symbol: worstTrade.trade.symbol,
          side: worstTrade.trade.side,
          shares: worstTrade.trade.quantity,
          timeRange:
            worstTrade.trade.entryAt != null && worstTrade.trade.exitAt != null
              ? `${formatTime(worstTrade.trade.entryAt)} – ${formatTime(worstTrade.trade.exitAt)}`
              : "",
          pnl: worstTrade.pnl,
          fills: executionCountByTrade.get(worstTrade.trade.id) ?? 0,
          href: `/trades/review?date=${date}&symbol=${worstTrade.trade.symbol}&trade=${worstTrade.trade.id}&returnTo=${encodeURIComponent(dayReturnTo)}`,
          entryReason: entryReasonFor(worstTrade.trade.id),
        }
      : null;

  return {
    day: {
      date,
      label: dayFmt.format(utcDate(date)),
      displayDate: dateFmt.format(utcDate(date)),
      ...summary,
    },
    tickerRows: [...tickers.values()].sort((a, b) => b.pnl - a.pnl),
    tradeRows: trades.map((trade) => ({
      id: trade.id,
      time: trade.entryAt == null ? "—" : formatTime(trade.entryAt),
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      hold: formatHold(trade.entryAt, trade.exitAt),
      setup: trade.setup,
      tagged: taggedTradeIds.has(trade.id),
      pnl: netPnl(trade) ?? 0,
    })),
    taggedTrades: trades.filter((trade) => taggedTradeIds.has(trade.id)).length,
    pnlPoints,
    coachRead: buildSessionFactPack(trades),
    keyTradePrompts,
    worstTrade: worstTradeCard,
  };
}

function reviewScopeFor(preset: JournalReviewPreset, range: { from: string }): ReviewScope {
  if (preset === "today") return { scope: "day", scopeKey: range.from };
  if (preset === "week") return { scope: "week", scopeKey: range.from };
  return { scope: "month", scopeKey: range.from.slice(0, 7) };
}

async function loadReviewRange({
  preset,
  date,
  from,
  month,
  accountId,
}: {
  preset: JournalReviewPreset;
  date?: string;
  from?: string;
  month?: string;
  accountId: number;
}): Promise<ReviewRange> {
  const explicitDate = validDate(date);
  const anchor = explicitDate ?? validDate(from) ?? currentEtDate();
  const range = rangeForPreset(preset, anchor);
  const selectedMonthKey = month ?? range.from.slice(0, 7);
  const { start } = etDayRange(range.from);
  const { end } = etDayRange(range.to);
  const baselineFrom = isoAddDays(range.from, -30);
  const baselineTo = isoAddDays(range.from, -1);
  const { start: baselineStart } = etDayRange(baselineFrom);
  const { start: baselineEnd } = etDayRange(range.from);
  const trades = (
    await db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => {
    if (trade.entryAt == null) return false;
    const entryDate = etDateString(trade.entryAt);
    return entryDate >= range.from && entryDate <= range.to;
  });
  const baselineTrades = (
    await db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, baselineStart), lte(schema.trades.entryAt, baselineEnd)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => {
    if (trade.entryAt == null) return false;
    const entryDate = etDateString(trade.entryAt);
    return entryDate >= baselineFrom && entryDate <= baselineTo;
  });

  const tradeIds = trades.map((trade) => trade.id);
  const tickerScopeKeys = [...new Set(trades.map((trade) => `${etDateString(trade.entryAt ?? start)}:${trade.symbol}`))];
  const [executions, tickerNotes, tradeTagRows] = tradeIds.length > 0
    ? await Promise.all([
        db
          .select()
          .from(schema.executions)
          .where(inArray(schema.executions.tradeId, tradeIds))
          .orderBy(asc(schema.executions.executedAt)),
        tickerScopeKeys.length > 0
          ? db
              .select({ scopeKey: schema.journalEntries.scopeKey })
              .from(schema.journalEntries)
              .where(
                and(
                  eq(schema.journalEntries.accountId, accountId),
                  eq(schema.journalEntries.scope, "ticker"),
                  inArray(schema.journalEntries.scopeKey, tickerScopeKeys),
                ),
              )
          : Promise.resolve([]),
        db
          .select({ tradeId: schema.tradeTags.tradeId })
          .from(schema.tradeTags)
          .where(inArray(schema.tradeTags.tradeId, tradeIds)),
      ])
    : [[], [], []];
  const notedTickerKeys = new Set(tickerNotes.flatMap((row) => (row.scopeKey ? [row.scopeKey] : [])));
  const taggedTradeIds = new Set(tradeTagRows.map((row) => row.tradeId));
  const tradesByDate = new Map<string, TradeRow[]>();
  const executionsByDate = new Map<string, ExecutionRow[]>();

  trades.forEach((trade) => {
    if (trade.entryAt == null) return;
    const key = etDateString(trade.entryAt);
    tradesByDate.set(key, [...(tradesByDate.get(key) ?? []), trade]);
  });
  executions.forEach((execution) => {
    const key = etDateString(execution.executedAt);
    executionsByDate.set(key, [...(executionsByDate.get(key) ?? []), execution]);
  });

  // Chart-evidence entry context for the focused day view only — week/month
  // archives stay lean (one candle join per traded symbol-day).
  const entryContexts = preset === "today" && trades.length > 0
    ? await opportunityContextsForTrades(trades.map((trade) => ({
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side,
        entryAt: trade.entryAt,
        exitAt: trade.exitAt,
        entryPrice: trade.avgEntryPrice,
        quantity: trade.quantity,
        pnl: netPnl(trade),
        setup: trade.setup,
      })))
    : undefined;

  const days = reviewDatesForRange(preset, range)
    .map((entryDate) =>
      buildDayData(
        entryDate,
        tradesByDate.get(entryDate) ?? [],
        executionsByDate.get(entryDate) ?? [],
        notedTickerKeys,
        taggedTradeIds,
        entryContexts,
      ),
    );
  const weeksByStart = new Map<string, ReviewData[]>();

  days.forEach((day) => {
    const key = weekStartFor(day.day.date);
    weeksByStart.set(key, [...(weeksByStart.get(key) ?? []), day]);
  });

  const weeks: ReviewWeek[] = [...weeksByStart.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, weekDays]) => ({
      key,
      label: archiveWeekLabel(preset === "month" ? range.from.slice(0, 7) : selectedMonthKey, key),
      displayDate: weekRangeLabel(key),
      days: weekDays,
      ...summarizeDays(weekDays),
    }));
  const summary = summarizeDays(days);
  const firstDay = days[0]?.day;

  return {
    ...summary,
    preset,
    anchor,
    title:
      preset === "month"
        ? monthFmt.format(utcDate(range.from))
        : preset === "week"
          ? archiveWeekLabel(selectedMonthKey, range.from)
          : firstDay?.label ?? dayFmt.format(utcDate(anchor)),
    eyebrow: "Trade Journal",
    displayDate:
      preset === "month"
        ? monthFmt.format(utcDate(range.from))
        : preset === "week"
          ? weekRangeLabel(range.from)
          : firstDay?.displayDate ?? dateFmt.format(utcDate(anchor)),
    days,
    weeks,
    coachRead: buildSessionFactPack(trades, { baselineTrades, baselineLabel: "Prior 30 days" }),
  };
}

function formatHorizonValue(key: SessionFactPack["history"]["signals"][number]["key"], label: string, value: number | null) {
  if (value == null) return "—";
  if (key === "win_rate") return `${(value * 100).toFixed(1)}%`;
  if (key === "profit_factor") return value.toFixed(2);
  if (key === "expectancy" && label === "E[R]") return `${value.toFixed(2)}R`;
  return formatMoney(value);
}

function comparisonCoach(factPack: SessionFactPack, emptyDiagnosis: string): JournalComparisonData["week"]["coach"] {
  const topSurprise = factPack.surprises[0];
  return {
    diagnosis: topSurprise?.title ?? factPack.mechanism.label ?? emptyDiagnosis,
    evidence:
      topSurprise?.evidence.join(" ") ||
      factPack.mechanism.evidence.join(" ") ||
      "The current range does not contain enough contradictory evidence for a stronger diagnosis.",
    action: factPack.experiment.action,
    confidence: factPack.confidence.label,
  };
}

function sessionRows(range: ReviewRange) {
  const tradeCounts = range.days
    .map((day) => day.day.trades)
    .filter((trades) => trades > 0)
    .sort((a, b) => a - b);
  const midpoint = Math.floor(tradeCounts.length / 2);
  const medianTrades = tradeCounts.length === 0
    ? 0
    : tradeCounts.length % 2 === 0
      ? (tradeCounts[midpoint - 1] + tradeCounts[midpoint]) / 2
      : tradeCounts[midpoint];

  return range.days.map((day) => ({
    date: day.day.date,
    label: `${day.day.label} · ${monthDayFmt.format(utcDate(day.day.date))}`,
    trades: day.day.trades,
    accuracy: day.day.accuracy,
    profitFactor: day.day.profitFactor,
    pnl: day.day.pnl,
    activityRead:
      day.day.trades === 0
        ? "No trades imported"
        : day.day.trades > medianTrades
        ? "Above weekly median"
        : day.day.trades < medianTrades
          ? "Below weekly median"
          : "At weekly median",
  }));
}

function buildJournalComparisonData(week: ReviewRange, month: ReviewRange): JournalComparisonData {
  const weekTrades = week.days.flatMap((day) => day.tradeRows);
  const setupBuckets = new Map<string, { trades: number; wins: number; grossWins: number; grossLosses: number; pnl: number }>();

  weekTrades.forEach((trade) => {
    const label = trade.setup?.trim() || "Not captured";
    const bucket = setupBuckets.get(label) ?? { trades: 0, wins: 0, grossWins: 0, grossLosses: 0, pnl: 0 };
    bucket.trades += 1;
    bucket.wins += trade.pnl > 0 ? 1 : 0;
    bucket.grossWins += trade.pnl > 0 ? trade.pnl : 0;
    bucket.grossLosses += trade.pnl < 0 ? Math.abs(trade.pnl) : 0;
    bucket.pnl += trade.pnl;
    setupBuckets.set(label, bucket);
  });

  const monthLossDays = month.days
    .filter((day) => day.day.pnl < 0)
    .sort((a, b) => a.day.pnl - b.day.pnl);
  const grossSessionLoss = monthLossDays.reduce((sum, day) => sum + Math.abs(day.day.pnl), 0);
  const sortedActivity = month.days
    .map((day) => day.day.trades)
    .filter((trades) => trades > 0)
    .sort((a, b) => a - b);
  const activityMidpoint = Math.floor(sortedActivity.length / 2);
  const medianActivity = sortedActivity.length === 0
    ? 0
    : sortedActivity.length % 2 === 0
      ? (sortedActivity[activityMidpoint - 1] + sortedActivity[activityMidpoint]) / 2
      : sortedActivity[activityMidpoint];
  const highActivityLoss = monthLossDays
    .filter((day) => day.day.trades > medianActivity)
    .reduce((sum, day) => sum + Math.abs(day.day.pnl), 0);
  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  month.days.forEach((day) => {
    cumulative += day.day.pnl;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.min(maxDrawdown, cumulative - peak);
  });

  const weekTaggedTrades = week.days.reduce((sum, day) => sum + day.taggedTrades, 0);
  return {
    week: {
      summary: {
        label: week.displayDate,
        sessions: week.days.filter((day) => day.day.trades > 0).length,
        trades: week.trades,
        accuracy: week.accuracy,
        profitFactor: week.profitFactor,
        pnl: week.pnl,
      },
      sessions: sessionRows(week),
      edgeRows: [...setupBuckets.entries()]
        .map(([label, bucket]) => ({
          label,
          trades: bucket.trades,
          winRate: bucket.trades === 0 ? null : Math.round((bucket.wins / bucket.trades) * 100),
          profitFactor: bucket.grossLosses === 0 ? null : bucket.grossWins / bucket.grossLosses,
          expectancy: bucket.trades === 0 ? 0 : bucket.pnl / bucket.trades,
          pnl: bucket.pnl,
        }))
        .sort((a, b) => b.trades - a.trades),
      taggedCoverage: week.trades === 0 ? null : Math.round((weekTaggedTrades / week.trades) * 100),
      plannedRiskCoverage: week.coachRead.session.rCoverage,
      coach: comparisonCoach(week.coachRead, "No weekly contradiction cleared the evidence gate."),
    },
    month: {
      summary: {
        label: month.displayDate,
        sessions: month.days.filter((day) => day.day.trades > 0).length,
        trades: month.trades,
        accuracy: month.accuracy,
        profitFactor: month.profitFactor,
        pnl: month.pnl,
      },
      sessions: sessionRows(month),
      horizonRows: month.coachRead.history.signals.map((signal) => ({
        metric: signal.label,
        current: formatHorizonValue(signal.key, signal.label, signal.current),
        baseline: formatHorizonValue(signal.key, signal.label, signal.baseline),
        read: signal.vote > 0 ? "Improving" : signal.vote < 0 ? "Fading" : "Stable / unclear",
        tone: signal.vote > 0 ? "positive" : signal.vote < 0 ? "negative" : "neutral",
      })),
      risk: {
        maxDrawdown,
        worstDay: monthLossDays[0]?.day.pnl ?? null,
        worstTwoLossShare: grossSessionLoss === 0
          ? null
          : Math.round((monthLossDays.slice(0, 2).reduce((sum, day) => sum + Math.abs(day.day.pnl), 0) / grossSessionLoss) * 100),
        highActivityLossShare: grossSessionLoss === 0 ? null : Math.round((highActivityLoss / grossSessionLoss) * 100),
        redDays: monthLossDays.length,
      },
      coach: comparisonCoach(month.coachRead, "No monthly contradiction cleared the evidence gate."),
    },
  };
}

async function loadSavedCoachExperiment(
  accountId: number,
  reviewScope: ReviewScope,
): Promise<SavedCoachExperiment | null> {
  try {
    const row = await db
      .select({
        action: schema.coachExperiments.action,
        trigger: schema.coachExperiments.trigger,
        updatedAt: schema.coachExperiments.updatedAt,
      })
      .from(schema.coachExperiments)
      .where(
        and(
          eq(schema.coachExperiments.accountId, accountId),
          eq(schema.coachExperiments.scope, reviewScope.scope),
          eq(schema.coachExperiments.scopeKey, reviewScope.scopeKey),
        ),
      )
      .limit(1)
      .get();

    return row ?? null;
  } catch (error) {
    if (isOptionalCoachReadError(error)) return null;
    throw error;
  }
}

async function loadSavedCoachReview(
  accountId: number,
  reviewScope: ReviewScope,
): Promise<SavedCoachReview | null> {
  try {
    const row = await db
      .select({
        status: schema.coachReviews.status,
        reviewJson: schema.coachReviews.reviewJson,
        updatedAt: schema.coachReviews.updatedAt,
      })
      .from(schema.coachReviews)
      .where(
        and(
          eq(schema.coachReviews.accountId, accountId),
          eq(schema.coachReviews.scope, reviewScope.scope),
          eq(schema.coachReviews.scopeKey, reviewScope.scopeKey),
        ),
      )
      .limit(1)
      .get();

    return row
      ? {
          status: row.status,
          updatedAt: row.updatedAt,
          storedReview: row.reviewJson ? parseCoachStoredReview(row.reviewJson) : null,
        }
      : null;
  } catch (error) {
    if (isOptionalCoachReadError(error)) return null;
    throw error;
  }
}

async function loadScopedRecapNote(
  accountId: number,
  reviewScope: ReviewScope,
): Promise<ScopedRecapNote | null> {
  const row = await db
    .select({
      text: schema.journalEntries.lessons,
      thesis: schema.journalEntries.thesis,
      whatWentWell: schema.journalEntries.whatWentWell,
      whatWentWrong: schema.journalEntries.whatWentWrong,
      emotionalState: schema.journalEntries.emotionalState,
    })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.accountId, accountId),
        eq(schema.journalEntries.scope, reviewScope.scope),
        eq(schema.journalEntries.scopeKey, reviewScope.scopeKey),
      ),
    )
    .limit(1)
    .get();

  return row
    ? {
        text: row.text ?? "",
        thesis: row.thesis ?? "",
        whatWentWell: row.whatWentWell ?? "",
        whatWentWrong: row.whatWentWrong ?? "",
        emotionalState: row.emotionalState ?? "",
      }
    : null;
}

async function hasBrokerData(accountId: number): Promise<boolean> {
  const [batch, trade] = await Promise.all([
    db
      .select({ id: schema.importBatches.id })
      .from(schema.importBatches)
      .where(
        and(
          eq(schema.importBatches.accountId, accountId),
          eq(schema.importBatches.kind, "executions"),
        ),
      )
      .limit(1)
      .get(),
    db
      .select({ id: schema.trades.id })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId))
      .limit(1)
      .get(),
  ]);

  return Boolean(batch || trade);
}

async function loadReviewArchive(
  anchor: string,
  accountId: number,
  basePath: string,
  month: string | undefined,
  linkMode: ArchiveLinkMode,
): Promise<ReviewArchive> {
  const selectedMonthKey = month ?? anchor.slice(0, 7);
  const selectedWeekKey = weekStartFor(anchor);
  const rows = await db
    .select({ entryAt: schema.trades.entryAt })
    .from(schema.trades)
    .where(eq(schema.trades.accountId, accountId))
    .limit(10000);
  const latestDate = rows.reduce<string | undefined>((latest, row) => {
    if (row.entryAt == null) return latest;
    const date = etDateString(row.entryAt);
    return !latest || date > latest ? date : latest;
  }, undefined);

  const monthKeys = new Set<string>([selectedMonthKey]);
  const yearKeys = new Set<string>();

  for (const row of rows) {
    if (row.entryAt == null) continue;
    const date = etDateString(row.entryAt);
    const year = date.slice(0, 4);
    if (year === selectedMonthKey.slice(0, 4)) {
      monthKeys.add(date.slice(0, 7));
    } else {
      yearKeys.add(year);
    }
  }

  const months = [...monthKeys]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      key,
      label: monthFmt.format(utcDate(`${key}-01`)).replace(/\s+\d{4}$/, ""),
      active: key === selectedMonthKey,
      href: linkMode === "review-module"
        ? `${basePath}?month=${key}`
        : journalReviewHref(basePath, { preset: "month", from: `${key}-01` }),
      weeks: key === selectedMonthKey
        ? archiveWeeks(key, selectedWeekKey, basePath, linkMode, latestDate)
        : [],
    }));

  const years = [...yearKeys].sort((a, b) => b.localeCompare(a)).map((year) => ({
    key: year,
    label: year,
    href: linkMode === "review-module"
      ? `${basePath}?month=${year}-01`
      : journalReviewHref(basePath, { preset: "month", from: `${year}-01-01` }),
  }));

  return { months, years };
}

function RunningPnlChart({ day, pnlPoints }: { day: ReviewDay; pnlPoints: PnlPoint[] }) {
  const width = 940;
  const height = 440;
  const pad = { top: 24, right: 26, bottom: 58, left: 128 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = pnlPoints.map((point) => point.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = Math.max(1, maxValue - minValue);
  const min = minValue - range * 0.18;
  const max = maxValue + range * 0.18;
  const y = (value: number) => pad.top + ((max - value) / (max - min)) * plotH;
  const x = (index: number) => pad.left + (index / Math.max(1, pnlPoints.length - 1)) * plotW;
  const line = pnlPoints.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${pad.left},${y(0)} ${line} ${x(pnlPoints.length - 1)},${y(0)}`;
  const ticks = [minValue, minValue + range / 2, maxValue];
  const labelIndexes = Array.from(
    new Set([
      0,
      Math.floor((pnlPoints.length - 1) * 0.33),
      Math.floor((pnlPoints.length - 1) * 0.66),
      pnlPoints.length - 1,
    ]),
  );
  const zeroY = y(0);
  const positiveFillId = `pnlPositiveFill-${day.date}`;
  const negativeFillId = `pnlNegativeFill-${day.date}`;
  const positiveClipId = `pnlPositiveClip-${day.date}`;
  const negativeClipId = `pnlNegativeClip-${day.date}`;

  return (
    <section className="flex h-[380px] flex-col rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Daily P&L</h2>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pnlClass(day.pnl)}`}>
          {formatMoney(day.pnl)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-h-0 flex-1" role="img" aria-label="Daily P&L by time of day">
        <defs>
          <linearGradient id={positiveFillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--green-chart)" stopOpacity="0.36" />
            <stop offset="100%" stopColor="var(--green-chart)" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id={negativeFillId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--red-chart)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--red-chart)" stopOpacity="0.36" />
          </linearGradient>
          <clipPath id={positiveClipId}>
            <rect x={pad.left} y={pad.top} width={plotW} height={Math.max(0, zeroY - pad.top)} />
          </clipPath>
          <clipPath id={negativeClipId}>
            <rect x={pad.left} y={zeroY} width={plotW} height={Math.max(0, height - pad.bottom - zeroY)} />
          </clipPath>
        </defs>
        {ticks.map((tick, index) => (
          <g key={`${tick}-${index}`}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" />
            <text
              x={pad.left - 10}
              y={y(tick) + 5}
              fill="var(--muted)"
              fontFamily="var(--font-mono)"
              fontSize="19"
              fontWeight="500"
              textAnchor="end"
            >
              {formatMoney(tick).replace("+", "")}
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--muted)"
          strokeDasharray="5 7"
          strokeOpacity="0.7"
        />
        <polygon points={area} fill={`url(#${positiveFillId})`} clipPath={`url(#${positiveClipId})`} />
        <polygon points={area} fill={`url(#${negativeFillId})`} clipPath={`url(#${negativeClipId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="var(--green-chart)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          clipPath={`url(#${positiveClipId})`}
        />
        <polyline
          points={line}
          fill="none"
          stroke="var(--red-chart)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          clipPath={`url(#${negativeClipId})`}
        />
        {labelIndexes.map((index) => (
          <text
            key={`${index}-${pnlPoints[index].time}`}
            x={x(index)}
            y={height - 16}
            fill="var(--muted)"
            fontFamily="var(--font-sans)"
            fontSize="19"
            fontWeight="500"
            textAnchor="middle"
          >
            {pnlPoints[index].time}
          </text>
        ))}
      </svg>
    </section>
  );
}

function KeyTradePrompts({ prompts }: { prompts: KeyTradePrompt[] }) {
  if (prompts.length === 0) return null;

  return (
    <section className="max-w-[800px] border-t border-[var(--hairline)] pt-4">
      <div className="text-[14px] font-semibold text-[var(--muted)]">
        Trades to annotate before coach
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {prompts.map((prompt) => (
          <a
            key={prompt.key}
            href={prompt.href}
            className="rounded-md border border-[var(--hairline)] px-3 py-3 transition-colors hover:border-[var(--accent)]"
          >
            <div className="text-[12px] text-[var(--muted)]">
              {prompt.label}
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-[var(--foreground)]">{prompt.symbol}</span>
              <span className={`font-mono text-[12px] tabular-nums ${pnlClass(prompt.pnl)}`}>
                {formatMoney(prompt.pnl)}
              </span>
            </div>
            {prompt.entryReason ? (
              <div className="mt-1.5 text-[11px] leading-4 text-[var(--muted)]">
                {prompt.entryReason}
              </div>
            ) : null}
          </a>
        ))}
      </div>
    </section>
  );
}

function buildDayReviewPresentation(data: ReviewData) {
  const { day, taggedTrades, keyTradePrompts, worstTrade, coachRead } = data;
  const topSurprise = coachRead.surprises[0];
  const verdictText = topSurprise
    ? topSurprise.description
    : "Clean session — nothing contradicted your baseline. Add the day's context so the coach read can go deeper.";

  const bestPrompt = keyTradePrompts.find((prompt) => prompt.label === "Best trade");
  const aligned: string[] = [];
  if (bestPrompt && bestPrompt.pnl > 0) {
    aligned.push(`Concentrated on ${bestPrompt.symbol}, the day's strongest trade.`);
  }
  if (
    coachRead.session.winRate != null &&
    coachRead.session.breakevenWinRate != null &&
    coachRead.session.winRate > coachRead.session.breakevenWinRate
  ) {
    aligned.push("Win rate cleared the breakeven line.");
  }
  coachRead.history.signals
    .filter((signal) => signal.vote > 0)
    .slice(0, 1)
    .forEach((signal) => aligned.push(`${signal.label} improved versus your baseline.`));

  const unresolved: string[] = [];
  if (worstTrade) {
    unresolved.push(
      worstTrade.entryReason
        ? `${worstTrade.symbol}: ${worstTrade.entryReason} — what did you see?`
        : `${worstTrade.symbol} was the session's clearest red mark.`,
    );
  }
  coachRead.surprises.slice(0, 2).forEach((surprise) => unresolved.push(surprise.description));

  const processFacts: JournalDayProcessFact[] = [
    {
      label: "Outcome distribution",
      value: coachRead.robustness.distributionLabel,
      detail: "Classifies whether the result was broad, top-heavy, or driven by the losing tail.",
      tone: day.pnl > 0 ? "positive" : day.pnl < 0 ? "negative" : "neutral",
    },
    {
      label: "Baseline trend",
      value: coachRead.history.trendLabel,
      detail: `${coachRead.history.baselineTrades} prior trades in ${coachRead.history.baselineLabel}.`,
      tone:
        coachRead.history.trendLabel === "improvement"
          ? "positive"
          : coachRead.history.trendLabel === "deterioration"
            ? "negative"
            : "neutral",
    },
    {
      label: "Risk basis",
      value: coachRead.confidence.riskModel === "r-multiple" ? "R-multiple" : "Dollar fallback",
      detail: `${formatPercent(coachRead.session.rCoverage)} of trades have enough planned-risk data for R.`,
    },
    {
      label: "Structured context",
      value: `${taggedTrades} of ${day.trades} trades tagged`,
      detail: "Missing setup and tag context remains unresolved instead of being inferred from outcome.",
    },
  ];

  return { topSurprise, verdictText, aligned, unresolved, processFacts };
}

function JournalReviewModuleForDay({
  data,
  returnTo,
  comparisonData,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData: JournalComparisonData;
}) {
  const { day, tickerRows, tradeRows, taggedTrades, pnlPoints, coachRead } = data;
  const { topSurprise, processFacts } = buildDayReviewPresentation(data);

  return (
    <div className="max-w-[800px]">
      <JournalReviewModule
        key={day.date}
        comparisons={comparisonData}
        date={day.date}
        returnTo={returnTo}
        summary={{
          trades: day.trades,
          accuracy: day.accuracy,
          profitFactor: day.profitFactor,
          pnl: day.pnl,
          taggedTrades,
        }}
        tradeRows={tradeRows}
        processFacts={processFacts}
        coach={{
          diagnosis: topSurprise?.title ?? "No contradiction cleared the evidence gate.",
          evidence:
            topSurprise?.evidence.join(" ") ??
            "Add setup, stop, and journal context before treating the absence of a signal as a clean process read.",
          action: coachRead.experiment.action,
          confidence: coachRead.confidence.label,
        }}
        pnlContent={day.trades > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <RunningPnlChart day={day} pnlPoints={pnlPoints} />
            <TickerReviewRail
              rows={tickerRows.map((row) => ({
                symbol: row.symbol,
                pnl: row.pnl,
                noted: row.noted,
                href: `/trades/review?date=${day.date}&symbol=${row.symbol}&returnTo=${encodeURIComponent(returnTo)}`,
              }))}
              accuracy={day.accuracy}
              profitFactor={day.profitFactor}
              pnl={day.pnl}
            />
          </div>
        ) : (
          <p className="py-8 text-sm text-[var(--muted)]">No trades imported</p>
        )}
      />
    </div>
  );
}

function DayReviewSection({
  data,
  returnTo,
  comparisonData,
  showReviewModule = false,
  showContextDetails = false,
  showLegacyPnl = true,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showContextDetails?: boolean;
  showLegacyPnl?: boolean;
}) {
  const { day, tickerRows, pnlPoints, keyTradePrompts, worstTrade, coachRead } = data;
  const { verdictText, aligned, unresolved } = buildDayReviewPresentation(data);

  return (
    <section>
      <div className="min-w-0">
          <div className="mb-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h2 className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
                {day.label}, {monthDayFmt.format(utcDate(day.date))}
              </h2>
              <span
                className={`font-mono text-[15px] font-semibold tabular-nums ${pnlClass(day.pnl)}`}
              >
                {formatMoney(day.pnl)}
                {day.pnl !== 0 ? (
                  <span className="ml-1 text-[10px]">{day.pnl > 0 ? "▲" : "▼"}</span>
                ) : null}
              </span>
              {!showContextDetails ? (
                <a
                  href={journalReviewModuleHref("/journal", day.date)}
                  className="text-[13px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
                >
                  Open day review · coach &amp; annotations →
                </a>
              ) : null}
            </div>
            <div className="mt-4 flex">
              <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full bg-[var(--surface-2)] px-4 py-1.5 text-[13px] text-[var(--muted)] tabular-nums">
                {day.trades} trades
                <span aria-hidden="true" className="text-[var(--faint)]">·</span>
                {day.fills} fills
                {day.accuracy != null ? (
                  <>
                    <span aria-hidden="true" className="text-[var(--faint)]">·</span>
                    {day.accuracy}% win
                  </>
                ) : null}
                {day.profitFactor != null ? (
                  <>
                    <span aria-hidden="true" className="text-[var(--faint)]">·</span>
                    PF {day.profitFactor.toFixed(2)}
                  </>
                ) : null}
              </span>
            </div>
          </div>

          <div className="mb-8 max-w-[800px]">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[13px] font-semibold text-[var(--coach)]">✳ Session verdict</span>
              <span className="text-[12px] text-[var(--muted)]">
                Automatic · computed from your trades, no AI · {coachRead.confidence.label} confidence
              </span>
            </div>
            <p className="mt-3 text-[20px] font-medium leading-[1.55] tracking-[-0.005em] text-[var(--foreground)] [text-wrap:pretty]">
              {verdictText}
            </p>
            {showContextDetails ? (
              <div className="mt-9 grid gap-9 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-12">
                <section>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                      Market context
                    </h3>
                    <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[11px] font-semibold text-[var(--muted)]">
                      Coverage unavailable
                    </span>
                  </div>
                  <p className="mt-4 text-[14.5px] leading-6 text-[var(--body)]">
                    Scanner coverage is not connected, so the journal will not infer whether the market was hot, selective, or slow.
                  </p>
                  <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
                    Opportunity grade, stock leadership, and participation alignment will appear here after the Stock Info daily summary is connected.
                  </p>
                </section>

                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Process read
                  </h3>
                  <div className="mt-4 space-y-6">
                    <FindingColumn label="Aligned" tone="positive" items={aligned} />
                    <FindingColumn label="Unresolved" tone="watch" items={unresolved} />
                  </div>
                </section>
              </div>
            ) : aligned.length > 0 || unresolved.length > 0 ? (
              <div className="mt-9">
                <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Process read
                </div>
                <div className="mt-4 grid gap-x-12 gap-y-8 sm:grid-cols-2">
                  <FindingColumn label="Aligned" tone="positive" items={aligned} />
                  <FindingColumn label="Unresolved" tone="watch" items={unresolved} />
                </div>
              </div>
            ) : null}
          </div>

          {showReviewModule && comparisonData ? (
            <div className="mb-12">
              <JournalReviewModuleForDay
                data={data}
                returnTo={returnTo}
                comparisonData={comparisonData}
              />
            </div>
          ) : null}

          {showLegacyPnl ? (
            <div className="grid max-w-[800px] gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
              <RunningPnlChart day={day} pnlPoints={pnlPoints} />
              <TickerReviewRail
                rows={tickerRows.map((row) => ({
                  symbol: row.symbol,
                  pnl: row.pnl,
                  noted: row.noted,
                  href: `/trades/review?date=${day.date}&symbol=${row.symbol}&returnTo=${encodeURIComponent(returnTo)}`,
                }))}
                accuracy={day.accuracy}
                profitFactor={day.profitFactor}
                pnl={day.pnl}
              />
            </div>
          ) : null}
          {worstTrade ? (
            <div className="mt-14 max-w-[800px]">
              <WorstTradeCard trade={worstTrade} />
            </div>
          ) : null}

          <div className="mt-6">
            <KeyTradePrompts prompts={keyTradePrompts} />
          </div>
      </div>
    </section>
  );
}

function FindingColumn({
  label,
  tone,
  items,
}: {
  label: string;
  tone: "positive" | "watch";
  items: string[];
}) {
  if (items.length === 0) return null;
  const marker = tone === "positive" ? "+" : "?";
  const markerColor = tone === "positive" ? "text-[var(--green)]" : "text-[var(--coach)]";
  return (
    <div>
      <div className="text-[14px] font-semibold text-[var(--foreground)]">{label}</div>
      <ul className="mt-3 grid gap-2.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="grid grid-cols-[18px_1fr] text-[13.5px] leading-[1.5] text-[var(--body)]"
          >
            <span className={markerColor}>{marker}</span>
            <span className="[text-wrap:pretty]">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorstTradeCard({ trade }: { trade: WorstTradeCardData }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b border-[var(--hairline)] px-5 py-4">
        <span className="text-[20px] font-semibold text-[var(--foreground)]">{trade.symbol}</span>
        <span className="text-[13.5px] text-[var(--muted)]">
          {trade.side === "short" ? "Short" : "Long"} · {trade.shares.toLocaleString()}{" "}
          {trade.shares === 1 ? "share" : "shares"}
          {trade.timeRange ? ` · ${trade.timeRange}` : ""}
        </span>
        <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-[12px] text-[var(--muted)]">
          ⇣ Imported
        </span>
        <span className="rounded-full bg-[var(--red-tint)] px-2.5 py-0.5 text-[12px] font-semibold text-[var(--red)]">
          Worst trade
        </span>
        <span className="ml-auto font-mono text-[17px] font-semibold tabular-nums text-[var(--red)]">
          {formatMoney(trade.pnl)}
          <span className="ml-1 text-[10px]">▼</span>
        </span>
      </div>
      <div className="grid gap-6 px-5 py-5 md:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="text-[13px] font-semibold text-[var(--accent)]">✎ Your note</div>
          <p className="mt-2.5 text-[15px] leading-6 text-[var(--body)] [text-wrap:pretty]">
            {trade.entryReason
              ? `The chart says you ${trade.entryReason}. Add what you saw — the coach can't judge this entry without your side.`
              : "Worst trade of the day — the one to inspect closely. Was the entry late, was the stop respected, and did this loss influence the next trade?"}
          </p>
          <a
            href={trade.href}
            className="mt-4 inline-block text-[13px] font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
          >
            Executions &amp; calculations ({trade.fills} {trade.fills === 1 ? "fill" : "fills"}) →
          </a>
        </div>
        <div className="grid min-h-[150px] place-items-center rounded-md bg-[repeating-linear-gradient(-45deg,var(--surface-2)_0_12px,var(--panel)_12px_24px)]">
          <span className="text-[13px] text-[var(--muted)]">1-min chart · {trade.symbol}</span>
        </div>
      </div>
    </section>
  );
}

function WeekHeader({
  label,
  displayDate,
}: {
  label: string;
  displayDate: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-semibold text-[var(--muted)]">
      <h2 className="text-sm font-semibold leading-none">
        {label}
      </h2>
      <span aria-hidden="true" className="text-[var(--faint)]">·</span>
      <span>{displayDate}</span>
    </div>
  );
}

function ScopeHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {children}
      <div className="h-px bg-[var(--hairline)]" />
    </div>
  );
}

function WeekSection({
  week,
  returnTo,
  comparisonData,
  showReviewModule = false,
  showLegacyPnl = true,
}: {
  week: ReviewWeek;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showLegacyPnl?: boolean;
}) {
  return (
    <section id={journalWeekSectionId(week.key)} className="scroll-mt-8 space-y-8">
      <ScopeHeader>
        <WeekHeader label={week.label} displayDate={week.displayDate} />
      </ScopeHeader>

      <div className="space-y-12">
        {week.days.map((dayData) => (
          <ReviewDayRangeSection
            key={dayData.day.date}
            data={dayData}
            returnTo={returnTo}
            comparisonData={comparisonData}
            showReviewModule={showReviewModule}
            showLegacyPnl={showLegacyPnl}
          />
        ))}
      </div>
    </section>
  );
}

function ReviewDayRangeSection({
  data,
  returnTo,
  comparisonData,
  showReviewModule = false,
  showContextDetails = false,
  showLegacyPnl = true,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showContextDetails?: boolean;
  showLegacyPnl?: boolean;
}) {
  if (data.day.trades === 0) {
    return (
      <NoTradeDaySection
        data={data}
        returnTo={returnTo}
        comparisonData={comparisonData}
        showReviewModule={showReviewModule}
      />
    );
  }

  return (
    <DayReviewSection
      data={data}
      returnTo={returnTo}
      comparisonData={comparisonData}
      showReviewModule={showReviewModule}
      showContextDetails={showContextDetails}
      showLegacyPnl={showLegacyPnl}
    />
  );
}

function NoTradeDaySection({
  data,
  returnTo,
  comparisonData,
  showReviewModule,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule: boolean;
}) {
  const { date } = data.day;
  return (
    <section className="border-t border-[var(--hairline)] py-8 first:border-t-0 first:pt-0">
      <h2 className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
        {dayFmt.format(utcDate(date))}, {monthDayFmt.format(utcDate(date))}
      </h2>
      <p className="mt-4 font-mono text-[13px] text-[var(--muted)]">
        No trades imported
      </p>
      {showReviewModule && comparisonData ? (
        <div className="mt-8">
          <JournalReviewModuleForDay
            data={data}
            returnTo={returnTo}
            comparisonData={comparisonData}
          />
        </div>
      ) : null}
    </section>
  );
}

function TradeReviewSidebar({
  archive,
  enableWeekScrollSpy = false,
}: {
  archive: ReviewArchive;
  enableWeekScrollSpy?: boolean;
}) {
  return (
    <ArchiveSidebar
      ariaLabel="Journal archive"
      months={archive.months}
      years={archive.years}
      offsetClassName="md:pt-[5.75rem]"
      enableWeekScrollSpy={enableWeekScrollSpy}
    />
  );
}

function EmptyReviewState({
  brokerDataAvailable,
  reviewScope,
  recapNote,
  readOnly,
}: {
  brokerDataAvailable: boolean;
  reviewScope: ReviewScope;
  recapNote: ScopedRecapNote | null;
  readOnly: boolean;
}) {
  if (!brokerDataAvailable) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">No broker import found</h2>
        <p className="max-w-[500px] text-sm leading-6 text-[var(--body)]">
          Import executions before the journal can build the session path, trade list, and deterministic Coach facts.
        </p>
        <InlineImportPrompt readOnly={readOnly} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {reviewScope.scope === "day" ? "No trades taken" : "No trades in this period"}
        </h2>
        <p className="mt-2 max-w-[520px] text-sm leading-6 text-[var(--body)]">
          {reviewScope.scope === "day"
            ? "A no-trade day can be an aligned decision when the market did not provide quality. Capture what you saw and why you stayed out."
            : "Broker history is connected; this selected period simply has no recorded trades."}
        </p>
      </div>
      <RecapNote
        scope={reviewScope.scope}
        scopeKey={reviewScope.scopeKey}
        text={recapNote?.text ?? ""}
        thesis={recapNote?.thesis ?? ""}
        whatWentWell={recapNote?.whatWentWell ?? ""}
        whatWentWrong={recapNote?.whatWentWrong ?? ""}
        emotionalState={recapNote?.emotionalState ?? ""}
        placeholder={`Add a ${reviewScope.scope} note: What opportunity did the market provide, and why was no trade the right response?`}
        readOnly={readOnly}
      />
      <p className="max-w-[520px] border-l-2 border-[var(--hairline)] pl-4 text-[12px] leading-5 text-[var(--muted)]">
        Market-context coverage is not connected yet, so the journal will not label this a cold market from missing scanner data.
      </p>
    </section>
  );
}

function hasRecapContent(note: ScopedRecapNote | null): boolean {
  if (!note) return false;
  return Boolean(note.text || note.thesis || note.whatWentWell || note.whatWentWrong || note.emotionalState);
}

function CoachContextFlow({
  data,
  reviewScope,
  recapNote,
  savedReview,
  readOnly,
}: {
  data: ReviewData;
  reviewScope: ReviewScope;
  recapNote: ScopedRecapNote | null;
  savedReview: SavedCoachReview | null;
  readOnly: boolean;
}) {
  const notedTickers = data.tickerRows.filter((row) => row.noted).length;
  const dayNoteComplete = hasRecapContent(recapNote);
  const generated = savedReview?.status === "generated" && Boolean(
    savedReview.storedReview && "review" in savedReview.storedReview,
  );
  const annotated = notedTickers > 0 || data.taggedTrades > 0;
  const completeSteps = Number(annotated) + Number(dayNoteComplete) + Number(generated);

  const steps = [
    {
      label: "Note your trades",
      detail: `${notedTickers}/${data.tickerRows.length} ticker notes · ${data.taggedTrades}/${data.day.trades} trades tagged`,
      complete: annotated,
    },
    {
      label: "Add a daily note",
      detail: dayNoteComplete ? "Your session context is included" : "Explain the market, plan, and decisions",
      complete: dayNoteComplete,
    },
    {
      label: "Generate coach review",
      detail: generated ? "Coach review generated" : "Combine your context with deterministic facts",
      complete: generated,
    },
  ];

  return (
    <section className="border-t border-[var(--hairline)] pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Coach context</h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">Add what the broker data cannot explain before asking Coach.</p>
        </div>
        <span className="font-mono text-[12px] tabular-nums text-[var(--muted)]">{completeSteps} of 3 complete</span>
      </div>

      <ol className="mt-6 grid gap-5 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.label} className="border-t border-[var(--hairline)] pt-3">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[11px] text-[var(--muted)]">{index + 1}</span>
              <span className="text-[13px] font-semibold text-[var(--foreground)]">{step.label}</span>
              <span className={`ml-auto text-[11px] font-semibold ${step.complete ? "text-[var(--green)]" : "text-[var(--muted)]"}`}>
                {step.complete ? "Complete" : "Open"}
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">{step.detail}</p>
          </li>
        ))}
      </ol>

      <div className="mt-7">
        <RecapNote
          scope="day"
          scopeKey={reviewScope.scopeKey}
          text={recapNote?.text ?? ""}
          thesis={recapNote?.thesis ?? ""}
          whatWentWell={recapNote?.whatWentWell ?? ""}
          whatWentWrong={recapNote?.whatWentWrong ?? ""}
          emotionalState={recapNote?.emotionalState ?? ""}
          placeholder="Add a daily note: What was the market offering, what was your plan, and where did your decisions align or remain unresolved?"
          readOnly={readOnly}
        />
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-[var(--hairline)] pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[12px] text-[var(--muted)]">Review payload</div>
          <p className="mt-1 max-w-[470px] text-[13px] leading-5 text-[var(--body)]">
            Playbook and rubric · deterministic facts · daily note · ticker notes · trade tags
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <form action={generateCoachReviewAction}>
              <input type="hidden" name="scope" value={reviewScope.scope} />
              <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
              <button type="submit" className="h-9 rounded-md bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90">
                {generated ? "Regenerate coach review" : "Generate coach review"}
              </button>
            </form>
            <form action={saveDraftCoachReviewAction}>
              <input type="hidden" name="scope" value={reviewScope.scope} />
              <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
              <button type="submit" className="h-9 rounded-md border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]">
                {savedReview ? "Refresh draft" : "Save draft"}
              </button>
            </form>
          </div>
        ) : (
          <span className="text-[12px] text-[var(--muted)]">Read-only demo</span>
        )}
      </div>
    </section>
  );
}

function confidenceClass(label: SessionFactPack["confidence"]["label"]) {
  if (label === "high") return "text-[var(--green)]";
  if (label === "medium") return "text-[var(--accent)]";
  return "text-[var(--muted)]";
}

function trendClass(label: SessionFactPack["history"]["trendLabel"]) {
  if (label === "improvement") return "text-[var(--green)]";
  if (label === "deterioration") return "text-[var(--red)]";
  if (label === "mixed") return "text-[var(--accent)]";
  return "text-[var(--muted)]";
}

function formatTrendValue(value: number | null, key: string) {
  if (value == null) return "-";
  if (key === "win_rate") return formatPercent(value);
  if (key === "profit_factor") return value.toFixed(2);
  if (key === "expectancy") return value.toFixed(2);
  return formatMoney(value);
}

function StarterCoachRead({
  factPack,
  reviewScope,
  savedExperiment,
  savedReview,
  readOnly,
  showReviewActions = true,
}: {
  factPack: SessionFactPack;
  reviewScope: ReviewScope;
  savedExperiment: SavedCoachExperiment | null;
  savedReview: SavedCoachReview | null;
  readOnly: boolean;
  showReviewActions?: boolean;
}) {
  const topSurprise = factPack.surprises[0];
  const experiment = factPack.experiment;
  const strongestTrendSignal =
    [...factPack.history.signals]
      .filter((signal) => signal.vote !== 0 && signal.delta != null)
      .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))[0] ?? null;
  const generatedReview = savedReview?.storedReview && "review" in savedReview.storedReview
    ? savedReview.storedReview
    : null;
  const generationError = savedReview?.storedReview && "error" in savedReview.storedReview
    ? savedReview.storedReview.error
    : null;

  return (
    <section className="pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[13px] font-semibold text-[var(--coach)]">✳ Automatic review</h2>
          <span className="text-[12px] text-[var(--muted)]">
            computed from your trades, no AI
          </span>
        </div>
        <span className={`text-[12px] font-semibold ${confidenceClass(factPack.confidence.label)}`}>
          {factPack.confidence.label} confidence
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="text-[12px] text-[var(--muted)]">Distribution</div>
          <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {factPack.robustness.distributionLabel}
          </div>
        </div>
        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="text-[12px] text-[var(--muted)]">Mechanism</div>
          <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {factPack.mechanism.label}
          </div>
        </div>
        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="text-[12px] text-[var(--muted)]">Math basis</div>
          <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">
            {factPack.confidence.riskModel === "r-multiple" ? "R-multiple" : "Dollar fallback"}
          </div>
        </div>
        <div className="border-t border-[var(--hairline)] pt-3">
          <div className="text-[12px] text-[var(--muted)]">Trend</div>
          <div className={`mt-1 text-sm font-semibold ${trendClass(factPack.history.trendLabel)}`}>
            {factPack.history.trendLabel}
          </div>
        </div>
      </div>

      {strongestTrendSignal ? (
        <p className="mt-4 text-[12px] leading-5 text-[var(--muted)] tabular-nums">
          {strongestTrendSignal.label}: {formatTrendValue(strongestTrendSignal.current, strongestTrendSignal.key)} vs{" "}
          {formatTrendValue(strongestTrendSignal.baseline, strongestTrendSignal.key)} across{" "}
          {factPack.history.baselineTrades} prior trades.
        </p>
      ) : (
        <p className="mt-4 text-[12px] leading-5 text-[var(--muted)] tabular-nums">
          {factPack.history.baselineTrades} prior trades in {factPack.history.baselineLabel}; trend vote needs more support.
        </p>
      )}

      {topSurprise ? (
        <div className="mt-5 border-l border-[var(--hairline)] pl-4">
          <div className="text-[12px] text-[var(--muted)]">Matched evidence</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">{topSurprise.title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--body)]">{topSurprise.description}</p>
          <p className="mt-2 text-[12px] leading-5 text-[var(--muted)] tabular-nums">
            {topSurprise.evidence.join(" ")}
          </p>
        </div>
      ) : (
        <p className="mt-5 max-w-[760px] text-sm leading-6 text-[var(--body)]">
          No contradiction cleared the starter evidence gate. The next useful step is cleaner
          setup, stop, and journal context.
        </p>
      )}

      <div className="mt-5 border-t border-[var(--hairline)] pt-4">
        <div className="text-[12px] text-[var(--muted)]">One thing to try</div>
        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
          <span className="font-semibold">{experiment.action}</span>
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--body)]">
          Trigger: {experiment.trigger} Measure: {experiment.measure.join(", ")}.
        </p>
        {!readOnly ? (
          <form action={saveCoachExperimentAction} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="scope" value={reviewScope.scope} />
            <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
            <input type="hidden" name="hypothesis" value={experiment.hypothesis} />
            <input type="hidden" name="trigger" value={experiment.trigger} />
            <input type="hidden" name="action" value={experiment.action} />
            <input type="hidden" name="experimentScope" value={experiment.scope} />
            <input type="hidden" name="expires" value={experiment.expires} />
            <input type="hidden" name="measure" value={JSON.stringify(experiment.measure)} />
            <button
              type="submit"
              className="h-8 rounded-md border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {savedExperiment ? "Update saved experiment" : "Save experiment"}
            </button>
            {savedExperiment ? (
              <span className="text-[12px] text-[var(--muted)]">
                Saved: {savedExperiment.action}
              </span>
            ) : null}
          </form>
        ) : (
          <p className="mt-3 text-[12px] text-[var(--muted)]">
            Read-only demo: experiments are shown but not saved.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-2 text-[12px] leading-5 text-[var(--muted)] tabular-nums sm:grid-cols-2">
        <span>
          Win rate {formatPercent(factPack.session.winRate)} · breakeven {formatPercent(factPack.session.breakevenWinRate)}
        </span>
        <span>
          Sample {factPack.confidence.sampleSize} trades · R coverage {formatPercent(factPack.session.rCoverage)}
        </span>
      </div>

      {factPack.confidence.limitations.length > 0 ? (
        <p className="mt-3 max-w-[760px] text-[12px] leading-5 text-[var(--muted)]">
          {factPack.confidence.limitations.join(" ")}
        </p>
      ) : null}

      <div className="mt-5 border-t border-[var(--hairline)] pt-4">
        <div className="text-[12px] text-[var(--muted)]">Coach review payload</div>
        <p className="mt-2 max-w-[760px] text-sm leading-6 text-[var(--body)]">
          This uses the exact context package: playbook, rubric, deterministic facts,
          daily context, and annotated trade notes.
        </p>
        {showReviewActions && !readOnly ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <form action={generateCoachReviewAction}>
              <input type="hidden" name="scope" value={reviewScope.scope} />
              <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
              <button
                type="submit"
                className="h-8 rounded-md border border-[var(--foreground)] bg-[var(--foreground)] px-3 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
              >
                {generatedReview ? "Regenerate coach review" : "Ask Coach"}
              </button>
            </form>
            <form action={saveDraftCoachReviewAction}>
              <input type="hidden" name="scope" value={reviewScope.scope} />
              <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
              <button
                type="submit"
                className="h-8 rounded-md border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                {savedReview ? "Refresh draft" : "Save draft"}
              </button>
            </form>
            {savedReview ? (
              <span className="text-[12px] text-[var(--muted)]">
                Saved as {savedReview.status}
              </span>
            ) : null}
          </div>
        ) : showReviewActions && readOnly ? (
          <p className="mt-3 max-w-[760px] text-[12px] leading-5 text-[var(--muted)] tabular-nums">
            Read-only demo: coach reviews are loaded from approved static fixtures,
            not generated live.
          </p>
        ) : null}

        {generationError ? (
          <p className="mt-4 max-w-[760px] border-l border-[var(--red)] pl-4 text-sm leading-6 text-[var(--body)]">
            Coach review could not be generated. Check Coach settings and try again; your notes and draft are still saved.
          </p>
        ) : null}

        {generatedReview ? (
          <div className="mt-5 space-y-5">
            <div className="border-l border-[var(--coach)] pl-4">
              <div className="text-[12px] text-[var(--muted)]">
                {readOnly ? "Static demo coach verdict" : "AI coach verdict"}
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                {generatedReview.review.dayVerdict}
              </p>
              <p className="mt-2 text-[12px] text-[var(--muted)]">
                {generatedReview.model}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <CoachReviewList title="Matched playbook" items={generatedReview.review.whatMatchedPlaybook} />
              <CoachReviewList title="Drifted" items={generatedReview.review.whatDriftedFromPlaybook} />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="text-[12px] text-[var(--muted)]">Key trade to study</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  {generatedReview.review.keyTradeToStudy.symbol ?? "Trade"}: {generatedReview.review.keyTradeToStudy.reason}
                </p>
              </div>
              <div>
                <div className="text-[12px] text-[var(--muted)]">Behavior pattern</div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  {generatedReview.review.behaviorPattern}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--hairline)] pt-4">
              <div className="text-[12px] text-[var(--muted)]">Statistical read</div>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                {generatedReview.review.statisticalRead}
              </p>
            </div>

            <div className="border-t border-[var(--hairline)] pt-4">
              <div className="text-[12px] text-[var(--muted)]">Coach experiment</div>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                <span className="font-semibold">{generatedReview.review.oneExperiment.action}</span>
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--body)]">
                Trigger: {generatedReview.review.oneExperiment.trigger} Measure:{" "}
                {generatedReview.review.oneExperiment.measure.join(", ")}.
              </p>
            </div>

            <CoachReviewList title="Confidence / missing context" items={generatedReview.review.confidenceAndMissingContext} />
          </div>
        ) : readOnly ? (
          <p className="mt-4 max-w-[760px] border-l border-[var(--hairline)] pl-4 text-sm leading-6 text-[var(--body)]">
            No approved static coach review is seeded for this period yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CoachReviewList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[12px] text-[var(--muted)]">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-[var(--body)]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">No clear signal yet.</p>
      )}
    </div>
  );
}

export default async function TradeJournalReview({
  preset = "month",
  date,
  from,
  month,
  basePath = "/journal",
  returnTo,
  backHref,
  accountId,
  showArchiveSidebar = true,
  archiveLinkMode = "legacy",
}: {
  preset?: JournalReviewPreset;
  date?: string;
  from?: string;
  month?: string;
  basePath?: string;
  returnTo?: string;
  backHref?: string;
  accountId: number;
  showArchiveSidebar?: boolean;
  archiveLinkMode?: ArchiveLinkMode;
}) {
  const archiveAnchor = validDate(date) ?? validDate(from) ?? currentEtDate();
  const usesReviewModule = archiveLinkMode === "review-module";
  const [range, archive, brokerDataAvailable, comparisonRanges] = await Promise.all([
    loadReviewRange({ preset, date, from, month, accountId }),
    showArchiveSidebar
      ? loadReviewArchive(archiveAnchor, accountId, basePath, month, archiveLinkMode)
      : Promise.resolve(null),
    hasBrokerData(accountId),
    preset === "today"
      ? Promise.all([
          loadReviewRange({ preset: "week", from: archiveAnchor, accountId }),
          loadReviewRange({ preset: "month", from: archiveAnchor, accountId }),
        ])
      : Promise.resolve(null),
  ]);
  const comparisonData = comparisonRanges
    ? buildJournalComparisonData(comparisonRanges[0], comparisonRanges[1])
    : undefined;
  const weekComparisonRanges = usesReviewModule && preset === "month"
    ? await Promise.all(
        range.weeks.map((week) =>
          loadReviewRange({ preset: "week", from: week.key, accountId }),
        ),
      )
    : [];
  const weekComparisons = new Map(
    weekComparisonRanges.map((weekRange) => [
      weekStartFor(weekRange.anchor),
      buildJournalComparisonData(weekRange, range),
    ]),
  );
  const reviewScope = reviewScopeFor(range.preset, rangeForPreset(range.preset, range.anchor));
  const [savedExperiment, savedReview, recapNote] = await Promise.all([
    loadSavedCoachExperiment(accountId, reviewScope),
    loadSavedCoachReview(accountId, reviewScope),
    loadScopedRecapNote(accountId, reviewScope),
  ]);
  const readOnly = isDemoReadOnly();
  const currentHref = returnTo ?? journalReviewHref(basePath, { preset, date, from, month });
  const breadcrumbBack = backHref
    ? originCrumbFromHref(backHref, basePath)
    : { label: "Journal", href: basePath };

  return (
    <div className={`mx-auto w-full pb-24 ${showArchiveSidebar ? "max-w-[1040px]" : "max-w-[800px]"}`}>
      {backHref ? (
        <Breadcrumbs
          back={breadcrumbBack}
          current={range.title}
          className="mb-10"
        />
      ) : null}

      <div className={showArchiveSidebar ? "grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,800px)] xl:gap-10" : ""}>
        {showArchiveSidebar && archive ? (
          <TradeReviewSidebar
            archive={archive}
            enableWeekScrollSpy={preset === "month"}
          />
        ) : null}
        <div className="mt-8 min-w-0 space-y-8">
          {preset === "week" ? (
            <ScopeHeader>
              <WeekHeader label={range.title} displayDate={range.displayDate} />
            </ScopeHeader>
          ) : null}

          {!brokerDataAvailable ? (
            <EmptyReviewState
              brokerDataAvailable={brokerDataAvailable}
              reviewScope={reviewScope}
              recapNote={recapNote}
              readOnly={readOnly}
            />
          ) : usesReviewModule && preset === "month" ? (
            <div className="space-y-14">
              {range.weeks.map((week) => (
                <WeekSection
                  key={week.key}
                  week={week}
                  returnTo={currentHref}
                  comparisonData={weekComparisons.get(week.key)}
                  showReviewModule
                  showLegacyPnl={false}
                />
              ))}
            </div>
          ) : usesReviewModule && preset === "today" && comparisonData ? (
            <ReviewDayRangeSection
              data={range.days[0]}
              returnTo={currentHref}
              comparisonData={comparisonData}
              showReviewModule
              showContextDetails
              showLegacyPnl={false}
            />
          ) : preset === "month" ? (
            <div className="space-y-14">
              {range.weeks.map((week) => (
                <WeekSection key={week.key} week={week} returnTo={currentHref} />
              ))}
            </div>
          ) : preset === "week" ? (
            <div className="space-y-12">
              {range.days.map((dayData) => (
                <ReviewDayRangeSection
                  key={dayData.day.date}
                  data={dayData}
                  returnTo={currentHref}
                />
              ))}
            </div>
          ) : null}

          {range.trades > 0 && preset === "today" ? (
            <CollapsibleSection
              title="✳ Coach review"
              status={coachSectionStatus(savedReview)}
            >
              <CoachContextFlow
                data={range.days[0]}
                reviewScope={reviewScope}
                recapNote={recapNote}
                savedReview={savedReview}
                readOnly={readOnly}
              />
              <StarterCoachRead
                factPack={range.coachRead}
                reviewScope={reviewScope}
                savedExperiment={savedExperiment}
                savedReview={savedReview}
                readOnly={readOnly}
                showReviewActions={false}
              />
            </CollapsibleSection>
          ) : range.trades > 0 ? (
            <StarterCoachRead
              factPack={range.coachRead}
              reviewScope={reviewScope}
              savedExperiment={savedExperiment}
              savedReview={savedReview}
              readOnly={readOnly}
              showReviewActions
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
