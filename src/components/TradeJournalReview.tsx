import type { ReactNode } from "react";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import Link from "next/link";
import { generateCoachReviewAction, saveDraftCoachReviewAction } from "@/app/coach/actions";
import { saveCoachExperimentAction } from "@/app/journal/actions";
import { db, schema } from "@/lib/db";
import { listAccounts } from "@/lib/accountScope";
import { parseCoachStoredReview, type CoachStoredReview } from "@/lib/coach/generatedReview";
import CoachOutputTabs from "@/components/CoachOutputTabs";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { buildSessionFactPack, type SessionFactPack } from "@/lib/coach/reviewEngine";
import type { TradeOpportunityContext } from "@/lib/coach/opportunityContext";
import { opportunityContextsForTrades } from "@/lib/coach/opportunityContextService";
import { isDemoReadOnly } from "@/lib/demoMode";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";
import ArchiveSidebar, { type ArchiveSidebarMonth } from "@/components/ArchiveSidebar";
import Breadcrumbs, { originCrumbFromHref } from "@/components/Breadcrumbs";
import InlineImportPrompt from "@/components/InlineImportPrompt";
import JournalReviewModule, {
  type JournalComparisonData,
  type JournalChartReadSummary,
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
type MarketContextRow = typeof schema.marketContextDays.$inferSelect;

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

type JournalMarketContext = {
  available: boolean;
  badge: string;
  headline: string;
  shortLabel: string;
  detail: string;
  caveat: string;
};

type ReviewData = {
  day: ReviewDay;
  tickerRows: TickerRow[];
  tradeRows: JournalDayTradeRow[];
  taggedTrades: number;
  pnlPoints: PnlPoint[];
  coachRead: SessionFactPack;
  chartRead: JournalChartReadSummary;
  marketContext: JournalMarketContext;
};

type ReviewWeek = ReviewSummary & {
  key: string;
  label: string;
  displayDate: string;
  days: ReviewData[];
  chartRead: JournalChartReadSummary;
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
  chartRead: JournalChartReadSummary;
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

function chartReadHeadline(summary: Omit<JournalChartReadSummary, "headline">): string {
  if (summary.readable === 0) {
    return summary.total > 0
      ? "Chart evidence was unavailable, so no trend judgment was made."
      : "No trades were available for a chart read.";
  }
  if (summary.contradicted > 0 && summary.supported > summary.contradicted) {
    return `Most readable entries followed the chart, but ${summary.contradicted} fought its established direction.`;
  }
  if (summary.contradicted > 0) {
    return `${summary.contradicted} of ${summary.readable} readable entries fought the chart's established direction.`;
  }
  if (summary.supported > 0 && summary.unclear > 0) {
    return `${summary.supported} entries followed the chart's established direction; ${summary.unclear} did not have enough agreement for a directional call.`;
  }
  if (summary.supported > 0) {
    return `${summary.supported} readable entries followed the chart's established direction.`;
  }
  return "The chart did not provide enough agreement to support a directional read.";
}

function summarizeChartContexts(
  total: number,
  contexts: Array<TradeOpportunityContext | undefined>,
): JournalChartReadSummary {
  const readableContexts = contexts.flatMap((context) => context?.atEntry ? [context.atEntry] : []);
  const counts = {
    total,
    readable: readableContexts.length,
    supported: readableContexts.filter((entry) => entry.fylDirectionalOpportunity.status === "supported").length,
    contradicted: readableContexts.filter((entry) => entry.fylDirectionalOpportunity.status === "contradicted").length,
    unclear: readableContexts.filter((entry) => entry.fylDirectionalOpportunity.status === "insufficient_evidence").length,
    consolidating: readableContexts.filter((entry) => entry.priceActionRead?.isConsolidating).length,
    exhaustion: readableContexts.filter((entry) => entry.priceActionRead?.phase === "exhaustion_failure").length,
    cleanExpansion: readableContexts.filter((entry) => entry.priceActionRead?.quality === "clean_expansion").length,
    whippyExpansion: readableContexts.filter((entry) => entry.priceActionRead?.quality === "whippy_expansion").length,
  };
  return { ...counts, headline: chartReadHeadline(counts) };
}

function combineChartReads(reads: JournalChartReadSummary[]): JournalChartReadSummary {
  const counts = reads.reduce(
    (sum, read) => ({
      total: sum.total + read.total,
      readable: sum.readable + read.readable,
      supported: sum.supported + read.supported,
      contradicted: sum.contradicted + read.contradicted,
      unclear: sum.unclear + read.unclear,
      consolidating: sum.consolidating + read.consolidating,
      exhaustion: sum.exhaustion + read.exhaustion,
      cleanExpansion: sum.cleanExpansion + read.cleanExpansion,
      whippyExpansion: sum.whippyExpansion + read.whippyExpansion,
    }),
    { total: 0, readable: 0, supported: 0, contradicted: 0, unclear: 0, consolidating: 0, exhaustion: 0, cleanExpansion: 0, whippyExpansion: 0 },
  );
  return { ...counts, headline: chartReadHeadline(counts) };
}

function unavailableMarketContext(): JournalMarketContext {
  return {
    available: false,
    badge: "Coverage unavailable",
    headline: "Scanner and retrospective coverage are unavailable for this session.",
    shortLabel: "Unavailable",
    detail: "The journal will not infer whether the market was hot, selective, or slow from trade activity alone.",
    caveat: "Run the Massive historical backfill or connect a captured Stock Info daily summary to add this evidence.",
  };
}

function finitePayloadNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function marketHeatLabel(over50Pct: number, over100Pct: number): string {
  if (over100Pct >= 2) return "Hot day";
  if (over100Pct === 1) return "One true leader";
  if (over50Pct >= 2) return "Active · no 100% leader";
  if (over50Pct === 1) return "Thin / selective";
  return "No +50% mover found";
}

function buildMarketContext(row: MarketContextRow | undefined, trades: TradeRow[]): JournalMarketContext {
  if (!row || row.coverageStatus === "unavailable") return unavailableMarketContext();

  try {
    const payload = JSON.parse(row.payloadJson) as Record<string, unknown>;
    const counts = payload.counts && typeof payload.counts === "object"
      ? payload.counts as Record<string, unknown>
      : {};
    const over50Pct = finitePayloadNumber(counts.over50Pct);
    const over100Pct = finitePayloadNumber(counts.over100Pct);
    const over200Pct = finitePayloadNumber(counts.over200Pct);
    const strongest = payload.strongestMover && typeof payload.strongestMover === "object"
      ? payload.strongestMover as Record<string, unknown>
      : null;
    const strongestSymbol = typeof strongest?.symbol === "string" ? strongest.symbol : null;
    const strongestMove = finitePayloadNumber(strongest?.maximumMovePct);
    const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
    const candidateSymbols = new Set(
      candidates.flatMap((candidate) => {
        if (!candidate || typeof candidate !== "object") return [];
        const symbol = (candidate as Record<string, unknown>).symbol;
        return typeof symbol === "string" ? [symbol] : [];
      }),
    );
    const tradedSymbols = new Set(trades.map((trade) => trade.symbol));
    const participated = [...candidateSymbols].filter((symbol) => tradedSymbols.has(symbol)).length;
    const heat = marketHeatLabel(over50Pct, over100Pct);
    const provenanceLabel = row.provenance === "scanner-captured" ? "Scanner captured" : "Retrospective";
    const coverageLabel = row.coverageStatus === "full" ? "full coverage" : "partial coverage";
    const moverNoun = over50Pct === 1 ? "stock rose" : "stocks rose";
    const participation = over50Pct > 0 && trades.length > 0
      ? ` You traded ${participated} of those ${over50Pct} movers.`
      : "";
    const leader = strongestSymbol && strongestMove > 0
      ? ` ${strongestSymbol} led at +${strongestMove.toLocaleString("en-US", { maximumFractionDigits: 1 })}%.`
      : "";

    return {
      available: true,
      badge: `${provenanceLabel} · ${coverageLabel}`,
      headline: `${heat} · ${over100Pct} cleared +100%`,
      shortLabel: `${heat} · ${over100Pct} ≥100%`,
      detail: `${over50Pct} $1–$20 ${moverNoun} at least 50% from the prior close to the day high; ${over200Pct} cleared 200%.${leader}${participation}`,
      caveat: row.provenance === "scanner-captured"
        ? "Captured scanner context preserves what the system observed during the session."
        : "This backfill describes the completed session. It does not reconstruct scanner timing, RVOL, float, catalysts, or what was known before entry.",
    };
  } catch {
    return unavailableMarketContext();
  }
}

async function loadMarketContextRows(from: string, to: string): Promise<MarketContextRow[]> {
  try {
    return await db
      .select()
      .from(schema.marketContextDays)
      .where(and(gte(schema.marketContextDays.sessionDateEt, from), lte(schema.marketContextDays.sessionDateEt, to)));
  } catch (error) {
    if (isOptionalCoachReadError(error)) return [];
    throw error;
  }
}

function buildDayData(
  date: string,
  trades: TradeRow[],
  executions: ExecutionRow[],
  notedTickerKeys: Set<string>,
  taggedTradeIds: Set<number>,
  entryContexts?: Map<number, TradeOpportunityContext>,
  marketContextRow?: MarketContextRow,
): ReviewData {
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

  const chartRead = summarizeChartContexts(
    trades.length,
    trades.map((trade) => entryContexts?.get(trade.id)),
  );

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
    chartRead,
    marketContext: buildMarketContext(marketContextRow, trades),
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
  const [tradeRowsForRange, baselineRows, marketContextRows] = await Promise.all([
    db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt)),
    db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, baselineStart), lte(schema.trades.entryAt, baselineEnd)))
      .orderBy(asc(schema.trades.entryAt)),
    loadMarketContextRows(range.from, range.to),
  ]);
  const trades = tradeRowsForRange.filter((trade) => {
    if (trade.entryAt == null) return false;
    const entryDate = etDateString(trade.entryAt);
    return entryDate >= range.from && entryDate <= range.to;
  });
  const baselineTrades = baselineRows.filter((trade) => {
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
  const marketContextByDate = new Map(marketContextRows.map((row) => [row.sessionDateEt, row]));

  trades.forEach((trade) => {
    if (trade.entryAt == null) return;
    const key = etDateString(trade.entryAt);
    tradesByDate.set(key, [...(tradesByDate.get(key) ?? []), trade]);
  });
  executions.forEach((execution) => {
    const key = etDateString(execution.executedAt);
    executionsByDate.set(key, [...(executionsByDate.get(key) ?? []), execution]);
  });

  // Chart-evidence entry context for every rendered day. Archive/month
  // renders are cache-only so missing candle days (delisted symbols) degrade
  // instantly instead of re-attempting rate-limited fetches per render.
  const entryContexts = trades.length > 0
    ? await opportunityContextsForTrades(
        trades.map((trade) => ({
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          entryAt: trade.entryAt,
          exitAt: trade.exitAt,
          entryPrice: trade.avgEntryPrice,
          quantity: trade.quantity,
          pnl: netPnl(trade),
          setup: trade.setup,
        })),
        { cachedOnly: preset !== "today" },
      )
    : undefined;

  const days = reviewDatesForRange(preset, range).flatMap((entryDate) => {
    const dayTrades = tradesByDate.get(entryDate) ?? [];
    if (dayTrades.length === 0) return [];
    return [
      buildDayData(
        entryDate,
        dayTrades,
        executionsByDate.get(entryDate) ?? [],
        notedTickerKeys,
        taggedTradeIds,
        entryContexts,
        marketContextByDate.get(entryDate),
      ),
    ];
  });
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
      chartRead: combineChartReads(weekDays.map((day) => day.chartRead)),
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
    chartRead: combineChartReads(days.map((day) => day.chartRead)),
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
    marketContextLabel: day.marketContext.shortLabel,
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
      key: weekStartFor(week.anchor),
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
      marketContextCoverage: {
        available: week.days.filter((day) => day.marketContext.available).length,
        sessions: week.days.length,
      },
      chartRead: week.chartRead,
      coach: comparisonCoach(week.coachRead, "No weekly contradiction cleared the evidence gate."),
    },
    month: {
      key: month.anchor.slice(0, 7),
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
      chartRead: month.chartRead,
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

function buildDayReviewPresentation(data: ReviewData) {
  const { chartRead, coachRead } = data;
  const topSurprise = coachRead.surprises[0];
  const verdictText = topSurprise
    ? topSurprise.description
    : "No outcome contradiction cleared the evidence gate. The chart read below shows what was knowable at entry.";
  const chartFacts: JournalDayProcessFact[] = [
    {
      label: "Direction at entry",
      value: `${chartRead.supported} with trend · ${chartRead.contradicted} against · ${chartRead.unclear} unclear`,
      detail: "Compares each trade direction with the EMA 9/20 order, slope, VWAP position, and price structure at entry.",
      tone: chartRead.contradicted > chartRead.supported ? "negative" : chartRead.supported > 0 ? "positive" : "neutral",
    },
    {
      label: "Price behavior",
      value: `${chartRead.cleanExpansion} clean · ${chartRead.whippyExpansion} loose`,
      detail: "Clean expansion has orderly candles and rail behavior; loose expansion is moving but harder to manage cleanly.",
    },
    {
      label: "Pauses and pressure",
      value: `${chartRead.consolidating} tightening · ${chartRead.exhaustion} stalled`,
      detail: "Flags entries made during compression and moves showing possible exhaustion or failure.",
    },
    {
      label: "Chart coverage",
      value: `${chartRead.readable} of ${chartRead.total} trades readable`,
      detail: "Trades without enough candle history stay unjudged instead of being forced into a trend label.",
    },
  ];

  return { topSurprise, verdictText, chartFacts };
}

type ModuleCoachSlots = { day?: React.ReactNode; week?: React.ReactNode; month?: React.ReactNode };

/** Everything a day entry needs to render its own coach review section. */
type DayCoachPanelData = {
  reviewScope: ReviewScope;
  savedReview: SavedCoachReview | null;
  savedExperiment: SavedCoachExperiment | null;
  recapNote: ScopedRecapNote | null;
  readOnly: boolean;
};

function DayCoachReview({ data, dayCoach }: { data: ReviewData; dayCoach: DayCoachPanelData }) {
  const notedTickers = data.tickerRows.filter((row) => row.noted).length;
  const basedOnParts = [
    `${data.day.trades} trades`,
    ...(hasRecapContent(dayCoach.recapNote) ? ["day note"] : []),
    ...(notedTickers > 0 ? [`${notedTickers} ticker note${notedTickers === 1 ? "" : "s"}`] : []),
    ...(data.taggedTrades > 0 ? [`${data.taggedTrades} trades tagged`] : []),
  ];
  const basedOn = `Based on: ${basedOnParts.join(" · ")}`;
  return (
    <CoachOutputTabs
      hasAiReview={Boolean(
        dayCoach.savedReview?.storedReview &&
        "review" in dayCoach.savedReview.storedReview,
      )}
      deterministic={
        <StarterCoachRead
          factPack={data.coachRead}
          chartRead={data.chartRead}
          reviewScope={dayCoach.reviewScope}
          savedExperiment={dayCoach.savedExperiment}
          savedReview={dayCoach.savedReview}
          readOnly={dayCoach.readOnly}
          showReviewActions={false}
          output="deterministic"
        />
      }
      ai={
        <div>
          <CoachContextFlow
            data={data}
            reviewScope={dayCoach.reviewScope}
            recapNote={dayCoach.recapNote}
            savedReview={dayCoach.savedReview}
            readOnly={dayCoach.readOnly}
          />
          <div className="mt-6">
            <StarterCoachRead
              factPack={data.coachRead}
              chartRead={data.chartRead}
              reviewScope={dayCoach.reviewScope}
              savedExperiment={dayCoach.savedExperiment}
              savedReview={dayCoach.savedReview}
              readOnly={dayCoach.readOnly}
              showReviewActions={false}
              output="ai"
              basedOn={basedOn}
            />
          </div>
        </div>
      }
    />
  );
}

function RangeCoachReview({
  factPack,
  chartRead,
  reviewScope,
  savedExperiment,
  savedReview,
  readOnly,
}: {
  factPack: SessionFactPack;
  chartRead: JournalChartReadSummary;
  reviewScope: ReviewScope;
  savedExperiment: SavedCoachExperiment | null;
  savedReview: SavedCoachReview | null;
  readOnly: boolean;
}) {
  const hasAiReview = Boolean(savedReview?.storedReview && "review" in savedReview.storedReview);
  return (
    <CoachOutputTabs
      hasAiReview={hasAiReview}
      deterministic={
        <StarterCoachRead
          factPack={factPack}
          chartRead={chartRead}
          reviewScope={reviewScope}
          savedExperiment={savedExperiment}
          savedReview={savedReview}
          readOnly={readOnly}
          showReviewActions={false}
          output="deterministic"
        />
      }
      ai={
        <StarterCoachRead
          factPack={factPack}
          chartRead={chartRead}
          reviewScope={reviewScope}
          savedExperiment={savedExperiment}
          savedReview={savedReview}
          readOnly={readOnly}
          showReviewActions
          output="ai"
        />
      }
    />
  );
}

function JournalReviewModuleForDay({
  data,
  returnTo,
  comparisonData,
  coachSlots,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData: JournalComparisonData;
  coachSlots?: ModuleCoachSlots;
}) {
  const { day, tickerRows, tradeRows, taggedTrades, pnlPoints, coachRead } = data;
  const { topSurprise, chartFacts } = buildDayReviewPresentation(data);

  return (
    <div className="max-w-[800px]">
      <JournalReviewModule
        key={day.date}
        comparisons={comparisonData}
        date={day.date}
        returnTo={returnTo}
        dayCoachSlot={coachSlots?.day}
        weekCoachSlot={coachSlots?.week}
        monthCoachSlot={coachSlots?.month}
        summary={{
          trades: day.trades,
          accuracy: day.accuracy,
          profitFactor: day.profitFactor,
          pnl: day.pnl,
          taggedTrades,
        }}
        tradeRows={tradeRows}
        processFacts={chartFacts}
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
  coachSlots,
  dayCoach,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showContextDetails?: boolean;
  showLegacyPnl?: boolean;
  coachSlots?: ModuleCoachSlots;
  dayCoach?: DayCoachPanelData;
}) {
  const { day, tickerRows, pnlPoints, coachRead, chartRead, marketContext } = data;
  const { verdictText } = buildDayReviewPresentation(data);
  const resolvedCoachSlots = dayCoach
    ? { ...coachSlots, day: <DayCoachReview data={data} dayCoach={dayCoach} /> }
    : coachSlots;

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
                      {marketContext.badge}
                    </span>
                  </div>
                  <p className="mt-4 text-[14.5px] font-semibold leading-6 text-[var(--foreground)]">
                    {marketContext.headline}
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[var(--body)]">
                    {marketContext.detail}
                  </p>
                  <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
                    {marketContext.caveat}
                  </p>
                </section>

                <section>
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                    Chart read
                  </h3>
                  <p className="mt-4 text-[14.5px] leading-6 text-[var(--body)]">
                    {chartRead.headline}
                  </p>
                  <div className="mt-4 border-y border-[var(--hairline)] py-3 font-mono text-[12px] leading-6 text-[var(--muted)] tabular-nums">
                    <div>{chartRead.supported} with trend · {chartRead.contradicted} against · {chartRead.unclear} unclear</div>
                    <div>{chartRead.consolidating} tightening · {chartRead.exhaustion} stalled</div>
                    <div>{chartRead.readable} of {chartRead.total} trades readable</div>
                  </div>
                </section>
              </div>
            ) : chartRead.readable > 0 ? (
              <div className="mt-8 border-t border-[var(--hairline)] pt-4">
                <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
                  Chart read
                </div>
                <p className="mt-3 text-[14px] leading-6 text-[var(--body)]">{chartRead.headline}</p>
              </div>
            ) : null}
          </div>

          {showReviewModule && comparisonData ? (
            <div className="mb-12">
              <JournalReviewModuleForDay
                data={data}
                returnTo={returnTo}
                comparisonData={comparisonData}
                coachSlots={resolvedCoachSlots}
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
  showContextDetails = false,
  showLegacyPnl = true,
  coachSlots,
  dayCoachData,
}: {
  week: ReviewWeek;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showContextDetails?: boolean;
  showLegacyPnl?: boolean;
  coachSlots?: ModuleCoachSlots;
  dayCoachData?: Map<string, DayCoachPanelData>;
}) {
  return (
    <section id={journalWeekSectionId(week.key)} className="scroll-mt-8 space-y-8">
      <ScopeHeader>
        <WeekHeader label={week.label} displayDate={week.displayDate} />
      </ScopeHeader>

      <div className="space-y-20">
        {week.days.map((dayData) => (
          <ReviewDayRangeSection
            key={dayData.day.date}
            data={dayData}
            returnTo={returnTo}
            comparisonData={comparisonData}
            showReviewModule={showReviewModule}
            showContextDetails={showContextDetails}
            showLegacyPnl={showLegacyPnl}
            coachSlots={coachSlots}
            dayCoach={dayCoachData?.get(dayData.day.date)}
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
  coachSlots,
  dayCoach,
}: {
  data: ReviewData;
  returnTo: string;
  comparisonData?: JournalComparisonData;
  showReviewModule?: boolean;
  showContextDetails?: boolean;
  showLegacyPnl?: boolean;
  coachSlots?: ModuleCoachSlots;
  dayCoach?: DayCoachPanelData;
}) {
  return (
    <DayReviewSection
      data={data}
      returnTo={returnTo}
      comparisonData={comparisonData}
      showReviewModule={showReviewModule}
      showContextDetails={showContextDetails}
      showLegacyPnl={showLegacyPnl}
      coachSlots={coachSlots}
      dayCoach={dayCoach}
    />
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
  readOnly,
  accountName,
}: {
  brokerDataAvailable: boolean;
  reviewScope: ReviewScope;
  readOnly: boolean;
  accountName?: string | null;
}) {
  const accountSuffix = accountName ? ` on ${accountName}` : "";
  if (!brokerDataAvailable) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">No broker import found{accountSuffix}</h2>
        <p className="max-w-[500px] text-sm leading-6 text-[var(--body)]">
          Import executions before the journal can build the session path, trade list, and deterministic Coach facts.
          {accountName ? " If you expected data here, check the account selector in the top-right menu." : ""}
        </p>
        <InlineImportPrompt readOnly={readOnly} />
      </section>
    );
  }

  const calendarMonth = reviewScope.scope === "month"
    ? reviewScope.scopeKey
    : reviewScope.scopeKey.slice(0, 7);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--foreground)]">
        No imported trade days in this selection{accountSuffix}
      </h2>
      <p className="max-w-[520px] text-sm leading-6 text-[var(--body)]">
        Journal only shows sessions with imported trades. Use Calendar to confirm intentional no-trade days or spot missing imports.
      </p>
      <Link
        href={`/calendar?m=${calendarMonth}`}
        className="inline-flex text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
      >
        Review Calendar
      </Link>
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
              <PendingSubmitButton
                label={generated ? "Regenerate coach review" : "Generate coach review"}
                pendingLabel="Generating — asking the coach…"
                className="h-9 rounded-md bg-[var(--foreground)] px-4 text-[12px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
              />
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

const COACH_FIGURE_RE = /-?\$\d[\d,]*(?:\.\d+)?/g;

/** Wrap dollar figures in mono spans colored by sign (red negative, green positive). */
function coachFigureNodes(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let index = 0;
  for (const match of text.matchAll(COACH_FIGURE_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(text.slice(cursor, start));
    const figure = match[0];
    nodes.push(
      <span
        key={`${keyPrefix}-fig${index}`}
        className={`font-mono text-[0.85em] tabular-nums ${figure.startsWith("-") ? "text-[var(--red)]" : "text-[var(--green)]"}`}
      >
        {figure}
      </span>,
    );
    cursor = start + figure.length;
    index += 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** Coach prose: **bold** phrases in ink, dollar figures mono and sign-colored. */
function coachInline(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  const nodes: ReactNode[] = [];

  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      nodes.push(
        <strong key={`bold${index}`} className="font-bold text-[var(--foreground)]">
          {coachFigureNodes(part, `bold${index}`)}
        </strong>,
      );
      return;
    }
    nodes.push(...coachFigureNodes(part, `text${index}`));
  });

  return nodes;
}

function CoachProse({ text, className }: { text: string; className: string }) {
  return <p className={`${className} [text-wrap:pretty]`}>{coachInline(text)}</p>;
}

function CoachReviewSection({
  title,
  className = "mt-8",
  headingMarginClass = "mb-3.5",
  children,
}: {
  title: string;
  className?: string;
  headingMarginClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${className} border-t border-[var(--border)] pt-7`}>
      <div className={`${headingMarginClass} text-[17px] font-semibold tracking-[-0.01em] text-[var(--foreground)]`}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CoachParagraphs({ items, empty = "No clear signal yet." }: { items: string[]; empty?: string }) {
  if (items.length === 0) {
    return <p className="text-[13px] leading-[1.65] text-[var(--muted)]">{empty}</p>;
  }
  return (
    <div className="flex max-w-[72ch] flex-col gap-3">
      {items.map((item) => (
        <CoachProse key={item} text={item} className="text-[14.5px] leading-[1.7] text-[var(--body)]" />
      ))}
    </div>
  );
}

function DayCoachSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-7 border-t border-[var(--border)] pt-6">
      <div className="mb-2.5 text-[16px] font-semibold text-[var(--foreground)]">{title}</div>
      {items.length === 0 ? (
        <p className="text-[13px] leading-[1.65] text-[var(--muted)]">No clear signal yet.</p>
      ) : (
        <div className="flex max-w-[72ch] flex-col gap-2.5">
          {items.map((item) => (
            <CoachProse key={item} text={item} className="text-[14.5px] leading-[1.7] text-[var(--body)]" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Ledger money: no leading plus, sign carried by color. */
function ledgerMoney(value: number | null): string {
  if (value == null) return "—";
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ledgerRatio(value: number | null): string {
  return value == null ? "—" : value.toFixed(2);
}

type LedgerTone = "ink" | "pos" | "neg" | "muted";

function moneyTone(value: number | null): LedgerTone {
  if (value == null) return "muted";
  if (value > 0) return "pos";
  if (value < 0) return "neg";
  return "ink";
}

function ledgerToneClass(tone: LedgerTone): string {
  if (tone === "pos") return "text-[var(--green)]";
  if (tone === "neg") return "text-[var(--red)]";
  if (tone === "muted") return "text-[var(--muted)]";
  return "text-[var(--foreground)]";
}

function LedgerRow({
  label,
  value,
  tone = "ink",
  strong = false,
  last = false,
}: {
  label: string;
  value: string;
  tone?: LedgerTone;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between py-[9px] ${last ? "" : "border-b border-[var(--hairline)]"}`}>
      <span className="text-[13px] text-[var(--muted)]">{label}</span>
      <span className={`font-mono text-[13px] tabular-nums ${strong ? "font-semibold" : ""} ${ledgerToneClass(tone)}`}>
        {value}
      </span>
    </div>
  );
}

function RobustnessStat({ label, value, tone }: { label: string; value: string; tone: LedgerTone }) {
  return (
    <div>
      <div className="mb-0.5 text-[12px] text-[var(--muted)]">{label}</div>
      <div className={`font-mono text-[15px] tabular-nums ${ledgerToneClass(tone)}`}>{value}</div>
    </div>
  );
}

function StatisticalLedger({ factPack, closing }: { factPack: SessionFactPack; closing: string }) {
  const session = factPack.session;
  const robustness = factPack.robustness;
  const tickerDrags = [...factPack.segments.byTicker]
    .filter((segment) => segment.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 3);
  const bandDrag = [...factPack.segments.byPriceBand]
    .filter((segment) => segment.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)[0];
  const dragRows = [
    ...tickerDrags.map((segment) => ({ label: segment.label, trades: segment.trades, pnl: segment.pnl })),
    ...(bandDrag ? [{ label: `${bandDrag.label} band`, trades: bandDrag.trades, pnl: bandDrag.pnl }] : []),
  ];

  return (
    <div>
      <div className="grid gap-x-16 sm:grid-cols-2">
        <div className="flex flex-col">
          <LedgerRow label="Trades" value={String(session.trades)} />
          <LedgerRow label="Net P&L" value={ledgerMoney(session.netPnl)} tone={moneyTone(session.netPnl)} strong />
          <LedgerRow label="Gross wins" value={ledgerMoney(session.grossWins)} tone={moneyTone(session.grossWins)} />
          <LedgerRow
            label="Gross losses"
            value={ledgerMoney(session.grossLosses === 0 ? 0 : -session.grossLosses)}
            tone={moneyTone(session.grossLosses === 0 ? 0 : -session.grossLosses)}
          />
          <LedgerRow label="Avg winner" value={ledgerMoney(session.avgWinner)} tone={moneyTone(session.avgWinner)} />
          <LedgerRow label="Avg loser" value={ledgerMoney(session.avgLoser)} tone={moneyTone(session.avgLoser)} last />
        </div>
        <div className="flex flex-col">
          <LedgerRow label="Win rate" value={ledgerRatio(session.winRate)} />
          <LedgerRow label="Breakeven win rate" value={ledgerRatio(session.breakevenWinRate)} />
          <LedgerRow label="Profit factor" value={ledgerRatio(session.profitFactor)} />
          <LedgerRow label="Payoff ratio" value={ledgerRatio(session.payoffRatio)} />
          <LedgerRow
            label="Expectancy / trade"
            value={ledgerMoney(session.expectancyPerTrade)}
            tone={moneyTone(session.expectancyPerTrade)}
            strong
          />
          <LedgerRow label="Retention" value={ledgerRatio(robustness.retention)} last />
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[14.5px] font-semibold text-[var(--foreground)]">
          Robustness — {robustness.distributionLabel}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-10 gap-y-3">
          <RobustnessStat
            label="Trim-one net P&L"
            value={ledgerMoney(robustness.trimOneNetPnl)}
            tone={moneyTone(robustness.trimOneNetPnl)}
          />
          <RobustnessStat
            label="Trim-tail net P&L"
            value={ledgerMoney(robustness.trimTailNetPnl)}
            tone={moneyTone(robustness.trimTailNetPnl)}
          />
          <RobustnessStat label="Retention" value={ledgerRatio(robustness.retention)} tone="ink" />
        </div>
      </div>

      {dragRows.length > 0 ? (
        <div className="mt-6">
          <div className="mb-1.5 text-[14.5px] font-semibold text-[var(--foreground)]">Largest drags</div>
          <div className="flex flex-col">
            {dragRows.map((row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-[120px_1fr_110px] items-baseline py-[8px] ${
                  index === dragRows.length - 1 ? "" : "border-b border-[var(--hairline)]"
                }`}
              >
                <span className="font-mono text-[13px] font-semibold text-[var(--foreground)]">{row.label}</span>
                <span className="text-[13px] text-[var(--muted)]">{row.trades} trades</span>
                <span className={`text-right font-mono text-[13px] tabular-nums ${ledgerToneClass(moneyTone(row.pnl))}`}>
                  {ledgerMoney(row.pnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {closing ? (
        <CoachProse text={closing} className="mt-6 max-w-[70ch] text-[14.5px] leading-[1.7] text-[var(--body)]" />
      ) : null}
    </div>
  );
}

function StarterCoachRead({
  factPack,
  chartRead,
  reviewScope,
  savedExperiment,
  savedReview,
  readOnly,
  showReviewActions = true,
  output = "full",
  basedOn,
}: {
  factPack: SessionFactPack;
  chartRead?: JournalChartReadSummary;
  reviewScope: ReviewScope;
  savedExperiment: SavedCoachExperiment | null;
  savedReview: SavedCoachReview | null;
  readOnly: boolean;
  showReviewActions?: boolean;
  /** "deterministic" = fact sections only; "ai" = payload/review only. */
  output?: "full" | "deterministic" | "ai";
  /** Day scope: "Based on: …" payload provenance line under "One thing to try". */
  basedOn?: string;
}) {
  const scopeLabel = reviewScope.scope === "day" ? "day" : reviewScope.scope === "week" ? "week" : "month";
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
      {output !== "ai" ? (<>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[13px] font-semibold text-[var(--coach)]">✳ Automatic {scopeLabel} review</h2>
          <span className="text-[12px] text-[var(--muted)]">
            computed from your trades, no AI
          </span>
        </div>
        <span className={`text-[12px] font-semibold ${confidenceClass(factPack.confidence.label)}`}>
          {factPack.confidence.label} confidence
        </span>
      </div>

      {chartRead ? (
        <div className="mt-5 border-l border-[var(--coach)] pl-4">
          <div className="text-[12px] text-[var(--muted)]">Chart read at entry</div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">
            {chartRead.headline}
          </p>
          <p className="mt-2 font-mono text-[12px] leading-5 text-[var(--muted)] tabular-nums">
            {chartRead.supported} with trend · {chartRead.contradicted} against · {chartRead.unclear} unclear · {chartRead.consolidating} tightening · {chartRead.exhaustion} stalled
          </p>
        </div>
      ) : null}

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
      </>) : null}

      {output !== "deterministic" ? (
      <div className={`border-t border-[var(--hairline)] pt-4 ${output === "ai" ? "border-t-0 pt-0" : "mt-5"}`}>
        {reviewScope.scope !== "day" ? (
          <div className="flex flex-col gap-1.5">
            <div className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">
              Coach review payload
            </div>
            <p className="max-w-[64ch] text-[13px] leading-[1.6] text-[var(--muted)]">
              This uses the exact context package: playbook, rubric, deterministic facts,
              daily context, and annotated trade notes.
            </p>
            {showReviewActions && !readOnly ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                <form action={generateCoachReviewAction}>
                  <input type="hidden" name="scope" value={reviewScope.scope} />
                  <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
                  <PendingSubmitButton
                    label={generatedReview ? "Regenerate coach review" : "Ask Coach"}
                    pendingLabel="Generating — asking the coach…"
                    className="rounded-full bg-[var(--foreground)] px-[18px] py-[8px] text-[13px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
                  />
                </form>
                <form action={saveDraftCoachReviewAction}>
                  <input type="hidden" name="scope" value={reviewScope.scope} />
                  <input type="hidden" name="scopeKey" value={reviewScope.scopeKey} />
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--border)] px-[18px] py-[7px] text-[13px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  >
                    {savedReview ? "Refresh draft" : "Save draft"}
                  </button>
                </form>
                {savedReview ? (
                  <span className="text-[12px] text-[var(--faint)]">
                    Saved as {savedReview.status}
                  </span>
                ) : null}
              </div>
            ) : showReviewActions && readOnly ? (
              <p className="mt-2.5 max-w-[64ch] text-[13px] leading-5 text-[var(--muted)]">
                Read-only demo: coach reviews are loaded from approved static fixtures,
                not generated live.
              </p>
            ) : null}
          </div>
        ) : null}

        {generationError ? (
          <p className="mt-4 max-w-[72ch] border-l border-[var(--red)] pl-4 text-sm leading-6 text-[var(--body)]">
            Coach review could not be generated. Check Coach settings and try again; your notes and draft are still saved.
          </p>
        ) : null}

        {generatedReview ? (
          reviewScope.scope === "day" ? (
            <div>
              <div className="border-l-[3px] border-[var(--coach)] pl-5">
                <CoachProse
                  text={generatedReview.review.dayVerdict}
                  className="max-w-[64ch] text-[18px] font-medium leading-[1.55] tracking-[-0.005em] text-[var(--foreground)]"
                />
                <div className="mt-3 font-mono text-[12px] text-[var(--faint)]">
                  {readOnly ? "Static demo coach verdict" : "Coach verdict"} · {generatedReview.model}
                </div>
              </div>

              <DayCoachSection title="What worked" items={generatedReview.review.whatMatchedPlaybook} />
              <DayCoachSection title="What cost you" items={generatedReview.review.whatDriftedFromPlaybook} />

              <div className="mt-7 border-t border-[var(--border)] pt-6">
                <div className="mb-2.5 text-[16px] font-semibold text-[var(--foreground)]">One thing to try</div>
                <p className="max-w-[60ch] text-[19px] font-bold leading-[1.45] text-[var(--foreground)] [text-wrap:pretty]">
                  {generatedReview.review.oneExperiment.action}
                </p>
                {basedOn ? (
                  <div className="mt-3.5 font-mono text-[12px] text-[var(--faint)]">{basedOn}</div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-8">
              <div className="border-l-[3px] border-[var(--coach)] pl-5">
                <CoachProse
                  text={generatedReview.review.dayVerdict}
                  className="text-[20px] font-medium leading-[1.55] tracking-[-0.005em] text-[var(--foreground)]"
                />
                <div className="mt-3 font-mono text-[12px] text-[var(--faint)]">
                  {readOnly ? "Static demo coach verdict" : "Coach verdict"} · {generatedReview.model}
                </div>
              </div>

              <CoachReviewSection title="Matched playbook" className="mt-10">
                <CoachParagraphs items={generatedReview.review.whatMatchedPlaybook} />
              </CoachReviewSection>

              <CoachReviewSection title="Drifted">
                <CoachParagraphs items={generatedReview.review.whatDriftedFromPlaybook} />
              </CoachReviewSection>

              <CoachReviewSection title="Key trade to study">
                <p className="max-w-[72ch] text-[14.5px] leading-[1.7] text-[var(--body)] [text-wrap:pretty]">
                  <strong className="font-bold text-[var(--foreground)]">
                    {generatedReview.review.keyTradeToStudy.symbol ?? "Trade"}:
                  </strong>{" "}
                  {coachInline(generatedReview.review.keyTradeToStudy.reason)}
                </p>
              </CoachReviewSection>

              <CoachReviewSection title="Behavior pattern">
                <CoachProse
                  text={generatedReview.review.behaviorPattern}
                  className="max-w-[72ch] text-[14.5px] leading-[1.7] text-[var(--body)]"
                />
              </CoachReviewSection>

              <CoachReviewSection title="Statistical read" headingMarginClass="mb-4">
                <StatisticalLedger factPack={factPack} closing={generatedReview.review.statisticalRead} />
              </CoachReviewSection>

              <CoachReviewSection title="Coach experiment">
                <p className="max-w-[60ch] text-[20px] font-bold leading-[1.45] text-[var(--foreground)] [text-wrap:pretty]">
                  {generatedReview.review.oneExperiment.action}
                </p>
                <div className="mt-4 flex max-w-[66ch] flex-col gap-1.5">
                  <p className="text-[14px] leading-[1.6] text-[var(--muted)]">
                    <strong className="font-bold text-[var(--foreground)]">Trigger</strong> —{" "}
                    {generatedReview.review.oneExperiment.trigger}
                  </p>
                  <p className="text-[14px] leading-[1.6] text-[var(--muted)]">
                    <strong className="font-bold text-[var(--foreground)]">Measure</strong> —{" "}
                    {generatedReview.review.oneExperiment.measure.join(", ")}.
                  </p>
                </div>
              </CoachReviewSection>

              <CoachReviewSection title="Confidence / missing context">
                <div className="flex max-w-[72ch] flex-col gap-2.5">
                  {generatedReview.review.confidenceAndMissingContext.length > 0 ? (
                    generatedReview.review.confidenceAndMissingContext.map((item) => (
                      <CoachProse key={item} text={item} className="text-[13px] leading-[1.65] text-[var(--muted)]" />
                    ))
                  ) : (
                    <p className="text-[13px] leading-[1.65] text-[var(--muted)]">No clear signal yet.</p>
                  )}
                </div>
              </CoachReviewSection>
            </div>
          )
        ) : readOnly ? (
          <p className="mt-4 max-w-[72ch] border-l border-[var(--hairline)] pl-4 text-sm leading-6 text-[var(--body)]">
            No approved static coach review is seeded for this period yet.
          </p>
        ) : output === "ai" ? (
          <p className="mt-4 max-w-[72ch] border-l border-[var(--hairline)] pl-4 text-sm leading-6 text-[var(--body)]">
            No AI review yet for this day. Add context above (or generate as-is) —
            the review will say plainly what it could and couldn&apos;t judge.
          </p>
        ) : null}
      </div>
      ) : null}
    </section>
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
  // The active account changes everything the journal shows — make it part of
  // the surface's identity so a silent switch can't masquerade as lost data
  // (JOURNAL_NAVIGATION_DECISION.md decision #5).
  const accounts = await listAccounts();
  const activeAccount = accounts.find((account) => account.id === accountId) ?? null;
  const showAccountIdentity = accounts.length > 1 && activeAccount != null;
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
  const [savedExperiment, savedReview] = await Promise.all([
    loadSavedCoachExperiment(accountId, reviewScope),
    loadSavedCoachReview(accountId, reviewScope),
  ]);
  // Week/month coach reviews are homed in the day module's Week/Month → Coach
  // tabs (JOURNAL_NAVIGATION_DECISION.md migration requirement #1).
  const moduleCoachScopes = preset === "today" && comparisonRanges
    ? {
        week: reviewScopeFor("week", rangeForPreset("week", archiveAnchor)),
        month: reviewScopeFor("month", rangeForPreset("month", archiveAnchor)),
      }
    : null;
  const [weekSavedExperiment, weekSavedReview, monthSavedExperiment, monthSavedReview] =
    moduleCoachScopes
      ? await Promise.all([
          loadSavedCoachExperiment(accountId, moduleCoachScopes.week),
          loadSavedCoachReview(accountId, moduleCoachScopes.week),
          loadSavedCoachExperiment(accountId, moduleCoachScopes.month),
          loadSavedCoachReview(accountId, moduleCoachScopes.month),
        ])
      : [null, null, null, null];
  const readOnly = isDemoReadOnly();
  // Every rendered day carries its own coach section — the URL only chooses
  // which days are on screen, never which UI they get (JOURNAL_NAVIGATION_DECISION.md).
  const dayCoachData = new Map<string, DayCoachPanelData>(
    usesReviewModule
      ? await Promise.all(
          range.days
            .filter((dayData) => dayData.day.trades > 0)
            .map(async (dayData) => {
              const scope: ReviewScope = { scope: "day", scopeKey: dayData.day.date };
              const [experiment, review, note] = await Promise.all([
                loadSavedCoachExperiment(accountId, scope),
                loadSavedCoachReview(accountId, scope),
                loadScopedRecapNote(accountId, scope),
              ]);
              return [
                dayData.day.date,
                { reviewScope: scope, savedReview: review, savedExperiment: experiment, recapNote: note, readOnly },
              ] as const;
            }),
        )
      : [],
  );
  // Month view: per-week module slots (weekly fact pack + saved review) and a
  // shared month slot, so each day's module matches the focused-day module.
  const monthModuleSlots = new Map<string, ModuleCoachSlots>();
  if (usesReviewModule && preset === "month" && weekComparisonRanges.length > 0) {
    const monthScope = reviewScopeFor("month", rangeForPreset("month", range.anchor));
    const [monthExperiment, monthReview] = await Promise.all([
      loadSavedCoachExperiment(accountId, monthScope),
      loadSavedCoachReview(accountId, monthScope),
    ]);
    const monthSlot = (
      <RangeCoachReview
        factPack={range.coachRead}
        chartRead={range.chartRead}
        reviewScope={monthScope}
        savedExperiment={monthExperiment}
        savedReview={monthReview}
        readOnly={readOnly}
      />
    );
    await Promise.all(
      weekComparisonRanges.map(async (weekRange) => {
        const weekKey = weekStartFor(weekRange.anchor);
        const weekScope: ReviewScope = { scope: "week", scopeKey: weekKey };
        const [weekExperiment, weekReview] = await Promise.all([
          loadSavedCoachExperiment(accountId, weekScope),
          loadSavedCoachReview(accountId, weekScope),
        ]);
        monthModuleSlots.set(weekKey, {
          week: (
            <RangeCoachReview
              factPack={weekRange.coachRead}
              chartRead={weekRange.chartRead}
              reviewScope={weekScope}
              savedExperiment={weekExperiment}
              savedReview={weekReview}
              readOnly={readOnly}
            />
          ),
          month: monthSlot,
        });
      }),
    );
  }
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
          {showAccountIdentity ? (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-[12px] font-semibold text-[var(--foreground)]">
                {activeAccount!.name}
              </span>
              <span className="text-[12px] text-[var(--muted)]">
                the journal shows this account&apos;s trades only
              </span>
            </div>
          ) : null}

          {preset === "week" ? (
            <ScopeHeader>
              <WeekHeader label={range.title} displayDate={range.displayDate} />
            </ScopeHeader>
          ) : null}

          {!brokerDataAvailable || range.trades === 0 ? (
            <EmptyReviewState
              brokerDataAvailable={brokerDataAvailable}
              reviewScope={reviewScope}
              readOnly={readOnly}
              accountName={showAccountIdentity ? activeAccount!.name : null}
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
                  showContextDetails
                  showLegacyPnl={false}
                  coachSlots={monthModuleSlots.get(week.key)}
                  dayCoachData={dayCoachData}
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
              coachSlots={moduleCoachScopes && comparisonRanges ? {
                week: (
                  <RangeCoachReview
                    factPack={comparisonRanges[0].coachRead}
                    chartRead={comparisonRanges[0].chartRead}
                    reviewScope={moduleCoachScopes.week}
                    savedExperiment={weekSavedExperiment}
                    savedReview={weekSavedReview}
                    readOnly={readOnly}
                  />
                ),
                month: (
                  <RangeCoachReview
                    factPack={comparisonRanges[1].coachRead}
                    chartRead={comparisonRanges[1].chartRead}
                    reviewScope={moduleCoachScopes.month}
                    savedExperiment={monthSavedExperiment}
                    savedReview={monthSavedReview}
                    readOnly={readOnly}
                  />
                ),
              } : undefined}
              dayCoach={dayCoachData.get(range.days[0].day.date)}
            />
          ) : preset === "month" ? (
            <div className="space-y-14">
              {range.weeks.map((week) => (
                <WeekSection key={week.key} week={week} returnTo={currentHref} />
              ))}
            </div>
          ) : preset === "week" ? (
            <div className="space-y-20">
              {range.days.map((dayData) => (
                <ReviewDayRangeSection
                  key={dayData.day.date}
                  data={dayData}
                  returnTo={currentHref}
                />
              ))}
            </div>
          ) : null}

          {range.trades > 0 && !usesReviewModule ? (
            <StarterCoachRead
              factPack={range.coachRead}
              chartRead={range.chartRead}
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
