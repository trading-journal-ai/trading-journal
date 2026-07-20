import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import type { ReviewTagOption } from "@/components/TickerReviewTradeExtras";
import type { TickerReviewTrade } from "@/components/TickerReviewWorkspace";
import { db, schema } from "@/lib/db";
import { getCandles } from "@/lib/candles";
import { fallbackCandlesFromExecutions } from "@/lib/candles/fallback";
import { fmtMoney } from "@/lib/format";
import { analyzeTradeExecutions } from "@/lib/executionAnalysis";
import { isDemoReadOnly } from "@/lib/demoMode";
import { netPnl } from "@/lib/pnl";
import { etDayRange, etDateString, reviewSessionRange } from "@/lib/time";

const DEFAULT_REVIEW_TAGS = ["No setup", "VWAP reclaim", "HOD retest", "Late entry", "EMA rail", "Extension chase"];

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export type InlineTradeReviewData = {
  availableTags: ReviewTagOption[];
  candleError?: string;
  candles: ChartCandle[];
  initialFocusTime?: number;
  initialTradeId: number;
  markers: ChartMarker[];
  readOnly: boolean;
  tickerNote: string;
  tickerTags: string[];
  trades: TickerReviewTrade[];
};

function formatTradeTime(value: number | null): string {
  return value == null ? "--:--" : timeFormatter.format(new Date(value * 1000)).slice(0, 5);
}

function formatHoldDuration(entryAt: number | null, exitAt: number | null): string | null {
  if (entryAt == null || exitAt == null) return null;
  const seconds = Math.max(0, exitAt - entryAt);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatSignedMoney(value: number): string {
  return `${value > 0 ? "+" : ""}${fmtMoney(value)}`;
}

function formatLedgerPrice(value: number | null): string {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

function pnlTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export async function loadInlineTradeReview({
  accountId,
  date,
  symbol,
  tradeId,
}: {
  accountId: number;
  date: string;
  symbol: string;
  tradeId: number;
}): Promise<InlineTradeReviewData | null> {
  const { start, end } = etDayRange(date);
  const dayTrades = (
    await db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) === date);
  const trades = dayTrades.filter((trade) => trade.symbol === symbol);
  const selectedTrade = trades.find((trade) => trade.id === tradeId);
  if (!selectedTrade) return null;

  const tradeIds = trades.map((trade) => trade.id);
  const executions = await db
    .select()
    .from(schema.executions)
    .where(inArray(schema.executions.tradeId, tradeIds))
    .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id));

  const [tickerReviewNote, tagOptions, tradeTagRows, tickerTagRows, attachmentRows] = await Promise.all([
    db
      .select()
      .from(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.accountId, accountId),
          eq(schema.journalEntries.scope, "ticker"),
          eq(schema.journalEntries.scopeKey, `${date}:${symbol}`),
        ),
      )
      .limit(1),
    db
      .select({
        id: schema.tags.id,
        name: schema.tags.name,
        uses: count(schema.tradeTags.tradeId),
      })
      .from(schema.tags)
      .leftJoin(schema.tradeTags, eq(schema.tradeTags.tagId, schema.tags.id))
      .groupBy(schema.tags.id)
      .orderBy(asc(schema.tags.name)),
    db
      .select({ tradeId: schema.tradeTags.tradeId, name: schema.tags.name })
      .from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId))
      .where(inArray(schema.tradeTags.tradeId, tradeIds)),
    db
      .select({ name: schema.tags.name })
      .from(schema.journalEntryTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.journalEntryTags.tagId))
      .innerJoin(schema.journalEntries, eq(schema.journalEntries.id, schema.journalEntryTags.journalEntryId))
      .where(
        and(
          eq(schema.journalEntries.accountId, accountId),
          eq(schema.journalEntries.scope, "ticker"),
          eq(schema.journalEntries.scopeKey, `${date}:${symbol}`),
        ),
      ),
    db
      .select()
      .from(schema.attachments)
      .where(inArray(schema.attachments.tradeId, tradeIds))
      .orderBy(asc(schema.attachments.id)),
  ]);

  const executionCountByTradeId = new Map<number, number>();
  const executionsByTradeId = new Map<number, typeof executions>();
  for (const execution of executions) {
    if (execution.tradeId == null) continue;
    executionCountByTradeId.set(execution.tradeId, (executionCountByTradeId.get(execution.tradeId) ?? 0) + 1);
    executionsByTradeId.set(execution.tradeId, [...(executionsByTradeId.get(execution.tradeId) ?? []), execution]);
  }
  const executionAnalysisByTradeId = new Map(trades.map((trade) => [
    trade.id,
    analyzeTradeExecutions(
      trade.side,
      (executionsByTradeId.get(trade.id) ?? []).map((execution) => ({
        id: execution.id,
        executedAt: execution.executedAt,
        price: execution.price,
        quantity: execution.quantity,
        side: execution.side,
        posEffect: execution.posEffect,
        brokerOrderKey: execution.brokerOrderKey,
      })),
    ),
  ]));

  const tradeNumberById = new Map(trades.map((trade, index) => [trade.id, index + 1]));
  const tradePnlById = new Map(trades.map((trade) => [trade.id, netPnl(trade)]));
  const tradePerShareById = new Map(trades.map((trade) => {
    const tradePnl = tradePnlById.get(trade.id);
    return [trade.id, tradePnl == null || trade.quantity === 0 ? null : tradePnl / Math.abs(trade.quantity)];
  }));

  const workspaceTrades: TickerReviewTrade[] = trades.map((trade, index) => {
    const tradePnl = tradePnlById.get(trade.id) ?? null;
    const perShare = tradePerShareById.get(trade.id) ?? null;
    return {
      id: trade.id,
      number: index + 1,
      entryTime: formatTradeTime(trade.entryAt),
      shares: Math.abs(trade.quantity).toLocaleString("en-US"),
      executions: (executionCountByTradeId.get(trade.id) ?? 0).toLocaleString("en-US"),
      entryPrice: formatLedgerPrice(trade.avgEntryPrice),
      exitPrice: formatLedgerPrice(trade.avgExitPrice),
      holdDuration: formatHoldDuration(trade.entryAt, trade.exitAt),
      pnl: tradePnl == null ? "Open" : fmtMoney(tradePnl),
      pnlValue: tradePnl,
      pnlTone: pnlTone(tradePnl),
      perShare: perShare == null ? "—" : formatSignedMoney(perShare),
      perShareValue: perShare,
      perShareTone: pnlTone(perShare),
      executionAnalysis: executionAnalysisByTradeId.get(trade.id),
      tags: tradeTagRows.filter((row) => row.tradeId === trade.id).map((row) => row.name),
      attachments: attachmentRows
        .filter((attachment) => attachment.tradeId === trade.id)
        .map((attachment) => ({
          id: attachment.id,
          filePath: attachment.filePath,
          caption: attachment.caption,
        })),
    };
  });

  const { start: candleFrom, end: candleTo } = reviewSessionRange(date);
  const candleResult = await getCandles(symbol, candleFrom, candleTo);
  const candles = candleResult.candles.length > 0
    ? candleResult.candles
    : fallbackCandlesFromExecutions(executions, candleFrom, candleTo);
  const availableTags = new Map(tagOptions.map((tag) => [tag.name, { name: tag.name, uses: tag.uses }]));
  for (const tagName of DEFAULT_REVIEW_TAGS) {
    if (!availableTags.has(tagName)) availableTags.set(tagName, { name: tagName, uses: 0 });
  }

  return {
    availableTags: [...availableTags.values()],
    candleError: candleResult.error,
    candles,
    initialFocusTime: selectedTrade.entryAt ?? undefined,
    initialTradeId: tradeId,
    markers: trades.flatMap((trade) => (
      (executionAnalysisByTradeId.get(trade.id)?.executions ?? []).map((execution) => ({
        id: execution.id,
        t: execution.executedAt,
        price: execution.price,
        side: execution.side,
        quantity: execution.quantity,
        tradeNumber: tradeNumberById.get(trade.id),
        executionLifecycle: execution.lifecycle,
        addedAgainstPosition: execution.addedAgainstPosition,
      }))
    )),
    readOnly: isDemoReadOnly(),
    tickerNote: tickerReviewNote[0]?.lessons ?? "",
    tickerTags: tickerTagRows.map((row) => row.name),
    trades: workspaceTrades,
  };
}
