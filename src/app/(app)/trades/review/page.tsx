import Link from "next/link";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { upsertTickerReviewAction } from "@/app/journal/actions";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { getCandles } from "@/lib/candles";
import { fallbackCandlesFromExecutions } from "@/lib/candles/fallback";
import Breadcrumbs, { originCrumbFromHref } from "@/components/Breadcrumbs";
import SharedNoteComposer from "@/components/SharedNoteComposer";
import LightweightTradeChart from "@/components/LightweightTradeChart";
import ReviewHeader from "@/components/ReviewHeader";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { isDemoReadOnly } from "@/lib/demoMode";
import { demoTickerNoteKey } from "@/lib/demoLocalNotes";
import { netPnl } from "@/lib/pnl";
import { etDayRange, etDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

type ExecutionRow = typeof schema.executions.$inferSelect;
type TradeRow = typeof schema.trades.$inferSelect;
type JournalEntryRow = typeof schema.journalEntries.$inferSelect;
type TradeCycle = {
  id: string;
  executions: ExecutionRow[];
  openedAt: number;
  closedAt: number | null;
  pnl: number | null;
  sharesTraded: number;
  netQuantity: number;
  tradeIds: number[];
};

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const fmtTime = (t: number) => timeFmt.format(new Date(t * 1000));

function formatTradeTime(value: number | null): string {
  return value == null ? "--:--" : fmtTime(value).slice(0, 5);
}

function journalNoteBody(note: JournalEntryRow): string {
  return note.lessons || note.thesis || "No note text.";
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

function pnlClass(value: number | null): string {
  if (value == null) return "text-[var(--muted)]";
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function executionSignedQuantity(execution: ExecutionRow): number {
  const quantity = Math.abs(Number(execution.quantity) || 0);
  const side = execution.side.toLowerCase();

  if (side === "buy") return quantity;
  if (side === "sell") return -quantity;
  return 0;
}

function executionCashflow(execution: ExecutionRow): number {
  const quantity = Math.abs(Number(execution.quantity) || 0);
  const price = Number(execution.price) || 0;
  const side = execution.side.toLowerCase();

  if (side === "buy") return -quantity * price;
  if (side === "sell") return quantity * price;
  return 0;
}

function buildTradeCycles(executions: ExecutionRow[]): TradeCycle[] {
  const cycles: TradeCycle[] = [];
  let current: TradeCycle | null = null;
  let position = 0;
  let cashflow = 0;

  executions.forEach((execution, index) => {
    if (!current) {
      current = {
        id: `cycle-${index}`,
        executions: [],
        openedAt: execution.executedAt,
        closedAt: null,
        pnl: null,
        sharesTraded: 0,
        netQuantity: 0,
        tradeIds: [],
      };
      position = 0;
      cashflow = 0;
    }

    const quantity = Math.abs(Number(execution.quantity) || 0);
    position += executionSignedQuantity(execution);
    cashflow += executionCashflow(execution);

    current.executions.push(execution);
    current.sharesTraded += quantity;
    current.netQuantity = position;
    if (execution.tradeId != null && !current.tradeIds.includes(execution.tradeId)) {
      current.tradeIds.push(execution.tradeId);
    }

    if (Math.abs(position) < 0.000001) {
      current.closedAt = execution.executedAt;
      current.pnl = cashflow;
      cycles.push(current);
      current = null;
    }
  });

  if (current) {
    cycles.push(current);
  }

  return cycles;
}

function tradeReviewHref(date: string, symbol: string, backHref: string): string {
  return `/trades/review?date=${date}&symbol=${symbol}&returnTo=${encodeURIComponent(backHref)}`;
}

function TradeCycleRail({
  cycles,
  date,
  symbol,
  backHref,
}: {
  cycles: TradeCycle[];
  date: string;
  symbol: string;
  backHref: string;
}) {
  const returnTo = tradeReviewHref(date, symbol, backHref);

  return (
    <aside className="w-full lg:w-[260px] lg:justify-self-end">
      <section className="h-auto px-1 py-1 lg:h-[480px]">
        <div className="h-full space-y-5 overflow-y-auto pr-1 pt-1">
          {cycles.length > 0 ? (
            cycles.map((cycle, index) => (
              <article
                key={cycle.id}
                className="border-b border-[var(--hairline)] pb-5 text-[12px] last:border-b-0"
              >
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1">
                  <h2 className="text-[13px] font-semibold text-[var(--foreground)]">Trade {index + 1}</h2>
                  <span className={`justify-self-end text-right text-[13px] font-semibold tabular-nums ${pnlClass(cycle.pnl)}`}>
                    {cycle.pnl == null ? "Open" : fmtMoney(cycle.pnl)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-x-2 gap-y-1.5">
                  <div className="pb-0.5 text-[11px] text-[var(--muted)]">Time</div>
                  <div className="pb-0.5 text-center text-[11px] text-[var(--muted)]">Side</div>
                  <div className="pb-0.5 text-center text-[11px] text-[var(--muted)]">Shares</div>
                  <div className="pb-0.5 text-right text-[11px] text-[var(--muted)]">Price</div>
                  {cycle.executions.map((execution) => (
                    <div key={execution.id} className="contents">
                      <div className="font-mono tabular-nums text-[var(--foreground)]">{fmtTime(execution.executedAt).slice(0, 5)}</div>
                      <div className="text-center" style={{ color: execution.side.toLowerCase() === "buy" ? "var(--green)" : "var(--red)" }}>
                        {execution.side.toUpperCase().slice(0, 1)}
                      </div>
                      <div className="text-center font-mono tabular-nums text-[var(--foreground)]">{execution.quantity.toLocaleString()}</div>
                      <div className="text-right font-mono tabular-nums text-[var(--foreground)]">{fmtPrice(execution.price)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  {cycle.tradeIds.length > 0 ? (
                    <div className="flex flex-wrap gap-x-2 gap-y-1">
                      {cycle.tradeIds.map((tradeId, tradeIndex) => (
                        <Link
                          key={tradeId}
                          href={`/trades/${tradeId}?returnTo=${encodeURIComponent(returnTo)}`}
                          className="text-[var(--accent)] hover:underline"
                        >
                          {cycle.tradeIds.length === 1 ? "View trade ->" : `Trade ${tradeIndex + 1} ->`}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="py-1 text-[13px] text-[var(--muted)]">No trade cycles</div>
          )}
        </div>
      </section>
    </aside>
  );
}

function TickerReviewPanel({
  date,
  symbol,
  note,
  tradeNotes,
  stats,
  returnTo,
  readOnly,
}: {
  date: string;
  symbol: string;
  note: JournalEntryRow | null;
  tradeNotes: { trade: TradeRow; note: JournalEntryRow; index: number }[];
  stats: { label: string; value: string; className?: string }[];
  returnTo: string;
  readOnly: boolean;
}) {
  const placeholder = `How did I trade ${symbol}? What was the setup, where did I chase, and what should I repeat or avoid next time?`;
  const scopeKey = tickerReviewKey(date, symbol);

  return (
    <section className="mt-6 rounded-md border border-[var(--hairline)] bg-[var(--surface)]/35 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold text-[var(--muted)]">
            Ticker review
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--foreground)]">
            How did I trade {symbol}?
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-[var(--muted)]">{stat.label}</div>
              <div className={`mt-1 font-mono tabular-nums text-[var(--foreground)] ${stat.className ?? ""}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      <form action={upsertTickerReviewAction} className="mt-4">
        <input type="hidden" name="scopeKey" value={scopeKey} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <SharedNoteComposer
          name="body"
          defaultValue={note?.lessons ?? ""}
          placeholder={placeholder}
          submitLabel="Save ticker review"
          helper="Use this for the pattern across the ticker. Individual trade notes show below when present."
          showSetupPatternCues
          localStorageKey={readOnly ? demoTickerNoteKey(scopeKey) : undefined}
        />
      </form>

      <div className="mt-5 border-t border-[var(--hairline)] pt-4">
        <div className="text-[13px] font-semibold text-[var(--muted)]">
          Noted trades
        </div>
        {tradeNotes.length > 0 ? (
          <div className="mt-3 space-y-3">
            {tradeNotes.map(({ trade, note: tradeNote, index }) => (
              <article key={tradeNote.id} className="rounded-md border border-[var(--hairline)] px-3 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="text-[13px] font-semibold text-[var(--foreground)]">
                    Trade {index + 1}
                  </div>
                  <div className={`font-mono text-[12px] tabular-nums ${pnlClass(netPnl(trade))}`}>
                    {formatTradeTime(trade.entryAt)} · {fmtMoney(netPnl(trade) ?? 0)}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">{journalNoteBody(tradeNote)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            No individual trade notes yet. Add notes on specific trades and they will surface here as evidence.
          </p>
        )}
      </div>
    </section>
  );
}

export default async function TickerDayReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; symbol?: string; returnTo?: string }>;
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
          .orderBy(asc(schema.executions.executedAt))
      : [];
  const [tickerReviewNote, tradeNoteRows] = await Promise.all([
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
    tradeIds.length > 0
      ? db
          .select()
          .from(schema.journalEntries)
          .where(
            and(
              eq(schema.journalEntries.accountId, activeAccount.id),
              eq(schema.journalEntries.scope, "trade"),
              inArray(schema.journalEntries.tradeId, tradeIds),
            ),
          )
      : Promise.resolve([]),
  ]);

  const firstAt = execs[0]?.executedAt ?? trades[0]?.entryAt ?? start;
  const lastAt = execs.at(-1)?.executedAt ?? trades.at(-1)?.exitAt ?? firstAt;
  const pad = 20 * 60;
  const candleFrom = firstAt - pad;
  const candleTo = lastAt + pad;
  const { candles, error } = await getCandles(symbol, candleFrom, candleTo);
  const chartCandles = candles.length > 0 ? candles : fallbackCandlesFromExecutions(execs, candleFrom, candleTo);

  const totalPnl = trades.reduce((sum, trade) => sum + (netPnl(trade) ?? 0), 0);
  const totalShares = trades.reduce((sum, trade) => sum + Math.abs(trade.quantity), 0);
  const tradePnls = trades.map((trade) => netPnl(trade) ?? 0);
  const wins = tradePnls.filter((pnl) => pnl > 0).length;
  const losses = tradePnls.filter((pnl) => pnl < 0).length;
  const counted = wins + losses;
  const tradeCycles = buildTradeCycles(execs);
  const tradeLabel = trades.length === 1 ? "trade" : "trades";
  const shareLabel = totalShares === 1 ? "share" : "shares";
  const currentHref = tradeReviewHref(date, symbol, backHref);
  const readOnly = isDemoReadOnly();
  const tradeIndexById = new Map(trades.map((trade, index) => [trade.id, index]));
  const tradeById = new Map(trades.map((trade) => [trade.id, trade]));
  const tradeNotes = tradeNoteRows
    .flatMap((note) => {
      if (note.tradeId == null) return [];
      const trade = tradeById.get(note.tradeId);
      const index = tradeIndexById.get(note.tradeId);
      if (!trade || index == null) return [];
      return [{ trade, note, index }];
    })
    .sort((a, b) => a.index - b.index);

  const summaryStats = [
    { label: `${trades.length.toLocaleString()} ${tradeLabel}` },
    { label: `${totalShares.toLocaleString()} ${shareLabel}` },
    { label: counted === 0 ? "— win" : `${Math.round((wins / counted) * 100)}% win` },
    { label: `P&L ${fmtMoney(totalPnl)}`, className: pnlClass(totalPnl) },
  ];
  const tickerReviewStats = [
    { label: "Trades", value: trades.length.toLocaleString() },
    { label: "Executions", value: execs.length.toLocaleString() },
    { label: "First", value: formatTradeTime(firstAt) },
    { label: "Last", value: formatTradeTime(lastAt) },
  ];
  const originCrumb = originCrumbFromHref(backHref, "/trades");
  const isJournalOrigin = originCrumb.label === "Journal";
  const isCalendarOrigin = originCrumb.label === "Calendar";
  const sectionCrumbs = originCrumb.label === "Trades" || isJournalOrigin || isCalendarOrigin ? [] : [{ label: "Trades", href: "/trades" }];
  const breadcrumbCurrent = symbol;

  return (
    <div className="mx-auto max-w-[1280px]">
      <Breadcrumbs
        back={originCrumb}
        items={sectionCrumbs}
        current={breadcrumbCurrent}
        className="mb-12"
      />

      <div className="mb-0 grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <ReviewHeader
            eyebrow="Ticker review"
            title={symbol}
            date={fmtDate(start)}
            metrics={summaryStats}
            action={(
              <Link
                href={backHref}
                className="text-[var(--accent)] hover:underline"
              >
                {"<-"} Back
              </Link>
            )}
          />
        </div>
      </div>

      <section className="mb-8 grid gap-8 pt-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0">
          {chartCandles.length > 0 ? (
            <LightweightTradeChart
              candles={chartCandles}
              enableFullscreen
              markers={execs.map((execution) => ({
                t: execution.executedAt,
                price: execution.price,
                side: execution.side as "buy" | "sell",
              }))}
            />
          ) : error ? (
            <div className="rounded-[6px] border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
              Candle data is unavailable for this ticker.
            </div>
          ) : (
            <LightweightTradeChart candles={[]} markers={[]} />
          )}
          <TickerReviewPanel
            date={date}
            symbol={symbol}
            note={tickerReviewNote[0] ?? null}
            tradeNotes={tradeNotes}
            stats={tickerReviewStats}
            returnTo={currentHref}
            readOnly={readOnly}
          />
        </div>
        <TradeCycleRail cycles={tradeCycles} date={date} symbol={symbol} backHref={backHref} />
      </section>
    </div>
  );
}
