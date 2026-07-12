import { and, asc, count, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { getCandles } from "@/lib/candles";
import { fallbackCandlesFromExecutions } from "@/lib/candles/fallback";
import Breadcrumbs, { originCrumbFromHref } from "@/components/Breadcrumbs";
import LightweightTradeChart from "@/components/LightweightTradeChart";
import ReviewHeader from "@/components/ReviewHeader";
import TickerReviewWorkspace from "@/components/TickerReviewWorkspace";
import { fmtDate, fmtMoney } from "@/lib/format";
import { isDemoReadOnly } from "@/lib/demoMode";
import { netPnl } from "@/lib/pnl";
import { etDayRange, etDateString, reviewSessionRange } from "@/lib/time";

export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const fmtTime = (t: number) => timeFmt.format(new Date(t * 1000));
const DEFAULT_REVIEW_TAGS = ["No setup", "VWAP reclaim", "HOD retest", "Late entry", "EMA rail", "Extension chase"];

function formatTradeTime(value: number | null): string {
  return value == null ? "--:--" : fmtTime(value).slice(0, 5);
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

function tickerReviewKey(date: string, symbol: string): string {
  return `${date}:${symbol}`;
}
function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function safeReturnTo(value: string | undefined, fallback: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function pnlTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value == null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export default async function TickerDayReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; symbol?: string; trade?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const date = validDate(params.date);
  const symbol = params.symbol?.trim().toUpperCase();
  const backHref = safeReturnTo(params.returnTo, "/trades");
  const activeAccount = await getActiveAccount();

  if (!symbol || !date) {
    return (
      <div className="mx-auto max-w-[860px] space-y-6">
        <Breadcrumbs back={originCrumbFromHref(backHref, "/trades")} current="Ticker review" />
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Select a ticker and date to review its trades for the day.
        </div>
      </div>
    );
  }

  const { start, end } = etDayRange(date);
  const dayTrades = (
    await db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, activeAccount.id), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) === date);

  const trades = dayTrades.filter((trade) => trade.symbol === symbol);
  const tradeIds = trades.map((trade) => trade.id);

  const execs =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.executions)
          .where(inArray(schema.executions.tradeId, tradeIds))
          .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id))
      : [];
  const [tickerReviewNote, tickerReviewState, tagOptions, tradeTagRows, attachmentRows] = await Promise.all([
    db
      .select()
      .from(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.accountId, activeAccount.id),
          eq(schema.journalEntries.scope, "ticker"),
          eq(schema.journalEntries.scopeKey, tickerReviewKey(date, symbol)),
        ),
      )
      .limit(1),
    db
      .select({ id: schema.tickerReviews.id })
      .from(schema.tickerReviews)
      .where(
        and(
          eq(schema.tickerReviews.accountId, activeAccount.id),
          eq(schema.tickerReviews.date, date),
          eq(schema.tickerReviews.symbol, symbol),
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
    tradeIds.length > 0
      ? db
          .select({ tradeId: schema.tradeTags.tradeId, name: schema.tags.name })
          .from(schema.tradeTags)
          .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId))
          .where(inArray(schema.tradeTags.tradeId, tradeIds))
      : Promise.resolve([]),
    tradeIds.length > 0
      ? db
          .select()
          .from(schema.attachments)
          .where(inArray(schema.attachments.tradeId, tradeIds))
          .orderBy(asc(schema.attachments.id))
      : Promise.resolve([]),
  ]);

  const { start: candleFrom, end: candleTo } = reviewSessionRange(date);
  const { candles, error } = await getCandles(symbol, candleFrom, candleTo);
  const chartCandles = candles.length > 0 ? candles : fallbackCandlesFromExecutions(execs, candleFrom, candleTo);

  const totalPnl = trades.reduce((sum, trade) => sum + (netPnl(trade) ?? 0), 0);
  const totalShares = trades.reduce((sum, trade) => sum + Math.abs(trade.quantity), 0);
  const tradePnls = trades.map((trade) => netPnl(trade) ?? 0);
  const wins = tradePnls.filter((pnl) => pnl > 0).length;
  const losses = tradePnls.filter((pnl) => pnl < 0).length;
  const counted = wins + losses;
  const tradeLabel = trades.length === 1 ? "trade" : "trades";
  const shareLabel = totalShares === 1 ? "share" : "shares";
  const readOnly = isDemoReadOnly();
  const tradeById = new Map(trades.map((trade) => [trade.id, trade]));
  const executionCountByTradeId = new Map<number, number>();
  for (const execution of execs) {
    if (execution.tradeId == null) continue;
    executionCountByTradeId.set(execution.tradeId, (executionCountByTradeId.get(execution.tradeId) ?? 0) + 1);
  }
  const tradeNumberById = new Map(trades.map((trade, index) => [trade.id, index + 1]));
  const tradePnlById = new Map(trades.map((trade) => [trade.id, netPnl(trade)]));
  const tradePerShareById = new Map(trades.map((trade) => {
    const tradePnl = tradePnlById.get(trade.id);
    return [trade.id, tradePnl == null || trade.quantity === 0 ? null : tradePnl / Math.abs(trade.quantity)];
  }));
  const requestedTradeId = Number(params.trade);
  const initialTradeId = Number.isInteger(requestedTradeId) && tradeById.has(requestedTradeId)
    ? requestedTradeId
    : null;
  const workspaceTrades = trades.map((trade, index) => {
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

  const summaryStats = [
    { label: `${trades.length.toLocaleString()} ${tradeLabel}` },
    { label: `${totalShares.toLocaleString()} ${shareLabel}` },
    { label: counted === 0 ? "— win" : `${Math.round((wins / counted) * 100)}% win` },
  ];
  const originCrumb = originCrumbFromHref(backHref, "/trades");
  const isJournalOrigin = originCrumb.label === "Journal";
  const isCalendarOrigin = originCrumb.label === "Calendar";
  const sectionCrumbs = originCrumb.label === "Trades" || isJournalOrigin || isCalendarOrigin ? [] : [{ label: "Trades", href: "/trades" }];
  const breadcrumbCurrent = symbol;
  const tagOptionMap = new Map(tagOptions.map((tag) => [tag.name, { name: tag.name, uses: tag.uses }]));
  for (const tagName of DEFAULT_REVIEW_TAGS) {
    if (!tagOptionMap.has(tagName)) tagOptionMap.set(tagName, { name: tagName, uses: 0 });
  }

  return (
    <div className="mx-auto max-w-[1280px]">
      <Breadcrumbs
        back={originCrumb}
        items={sectionCrumbs}
        current={breadcrumbCurrent}
        className="mb-12"
      />

      <div className="mb-0">
        <div className="min-w-0">
          <ReviewHeader
            title={symbol}
            date={fmtDate(start)}
            pnl={{ value: totalPnl, formatted: `${totalPnl > 0 ? "+" : ""}${fmtMoney(totalPnl)}` }}
            metrics={summaryStats}
          />
        </div>
      </div>

      <section className="mb-8 pt-5">
        <div className="min-w-0">
          {chartCandles.length > 0 ? (
            <LightweightTradeChart
              candles={chartCandles}
              enableFullscreen
              initialFocusTime={trades[0]?.entryAt ?? undefined}
              markers={execs.map((execution) => ({
                id: execution.id,
                t: execution.executedAt,
                price: execution.price,
                side: execution.side as "buy" | "sell",
                quantity: execution.quantity,
                tradeNumber: execution.tradeId == null ? undefined : tradeNumberById.get(execution.tradeId),
                pnl: execution.side === "sell" && execution.tradeId != null
                  ? tradePnlById.get(execution.tradeId) ?? undefined
                  : undefined,
                perShare: execution.side === "sell" && execution.tradeId != null
                  ? tradePerShareById.get(execution.tradeId) ?? undefined
                  : undefined,
              }))}
            />
          ) : error ? (
            <div className="rounded-[6px] border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
              Candle data is unavailable for this ticker.
            </div>
          ) : (
            <LightweightTradeChart candles={[]} markers={[]} />
          )}
          <TickerReviewWorkspace
            key={`${date}:${symbol}:${tickerReviewNote[0]?.lessons ?? ""}`}
            date={date}
            symbol={symbol}
            returnTo={backHref}
            tickerNote={tickerReviewNote[0]?.lessons ?? ""}
            trades={workspaceTrades}
            availableTags={[...tagOptionMap.values()]}
            readyForCoach={tickerReviewState.length > 0}
            readOnly={readOnly}
            initialTradeId={initialTradeId}
          />
        </div>
      </section>
    </div>
  );
}
