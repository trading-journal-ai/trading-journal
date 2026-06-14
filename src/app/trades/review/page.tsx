import Link from "next/link";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCandles } from "@/lib/candles";
import TradeChart from "@/components/TradeChart";
import RecapNote from "@/components/RecapNote";
import { fmtDate, fmtMoney, fmtPrice } from "@/lib/format";
import { netPnl } from "@/lib/pnl";
import { etDayRange, etDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

type ExecutionRow = typeof schema.executions.$inferSelect;
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

export default async function TickerDayReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; symbol?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const date = validDate(params.date);
  const symbol = params.symbol?.trim().toUpperCase();
  const backHref = safeReturnTo(params.returnTo, "/trades");

  if (!symbol || !date) {
    return (
      <div className="mx-auto max-w-[860px] space-y-6">
        <Link href={backHref} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
          Back
        </Link>
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          Select a ticker and date to review its trades for the day.
        </div>
      </div>
    );
  }

  const { start, end } = etDayRange(date);
  let trades = await db
    .select()
    .from(schema.trades)
    .where(
      and(
        eq(schema.trades.symbol, symbol),
        gte(schema.trades.entryAt, start),
        lte(schema.trades.entryAt, end),
      ),
    )
    .orderBy(asc(schema.trades.entryAt));

  trades = trades.filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) === date);
  const tradeIds = trades.map((trade) => trade.id);

  const execs =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.executions)
          .where(inArray(schema.executions.tradeId, tradeIds))
          .orderBy(asc(schema.executions.executedAt))
      : [];

  const dayNote = (
    await db
      .select()
      .from(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.scope, "day"),
          eq(schema.journalEntries.scopeKey, date),
        ),
      )
      .limit(1)
  )[0];

  const tradeNotes =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.journalEntries)
          .where(inArray(schema.journalEntries.tradeId, tradeIds))
          .orderBy(asc(schema.journalEntries.createdAt))
      : [];
  const noteByTradeId = new Map<number, typeof schema.journalEntries.$inferSelect>();
  tradeNotes.forEach((note) => {
    if (note.tradeId != null) {
      noteByTradeId.set(note.tradeId, note);
    }
  });

  const firstAt = execs[0]?.executedAt ?? trades[0]?.entryAt ?? start;
  const lastAt = execs.at(-1)?.executedAt ?? trades.at(-1)?.exitAt ?? firstAt;
  const pad = 20 * 60;
  const { candles, error } = await getCandles(symbol, firstAt - pad, lastAt + pad);

  const totalPnl = trades.reduce((sum, trade) => sum + (netPnl(trade) ?? 0), 0);
  const totalShares = trades.reduce((sum, trade) => sum + Math.abs(trade.quantity), 0);
  const wins = trades.filter((trade) => (netPnl(trade) ?? 0) > 0).length;
  const losses = trades.filter((trade) => (netPnl(trade) ?? 0) < 0).length;
  const counted = wins + losses;
  const tradeCycles = buildTradeCycles(execs);

  const summaryStats = [
    { value: `${trades.length.toLocaleString()} trades` },
    { value: `${execs.length.toLocaleString()} fills` },
    { value: `${totalShares.toLocaleString()} shares` },
    { value: counted === 0 ? "— win" : `${Math.round((wins / counted) * 100)}% win` },
    { value: `P&L ${fmtMoney(totalPnl)}`, className: pnlClass(totalPnl) },
  ];

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-12">
        <Link href={backHref} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
          Back
        </Link>
      </div>

      <div className="mb-7 space-y-4">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Ticker Review
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {symbol}
            </h1>
            <span className="font-mono text-base text-[var(--muted)]">{fmtDate(start)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[13px] font-medium text-[var(--muted)]">
            {summaryStats.map((stat, index) => (
              <span key={stat.value} className="flex items-center gap-x-3">
                {index > 0 ? <span className="text-[var(--faint)]">·</span> : null}
                <span className={`tabular-nums ${stat.className ?? ""}`}>{stat.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-10 border-t border-[var(--hairline)] pt-7 xl:grid-cols-[820px_420px] xl:items-start">
        <div className="min-w-0">
          {error ? (
            <div className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
              Couldn&apos;t load candles: {error}
            </div>
          ) : (
            <TradeChart
              candles={candles}
              markers={execs.map((execution) => ({
                t: execution.executedAt,
                price: execution.price,
                side: execution.side as "buy" | "sell",
              }))}
              variant="review"
            />
          )}
        </div>

        <aside className="space-y-8">
          <section className="space-y-3">
            <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Daily Note
            </h2>
            <div className="text-sm leading-6">
              <RecapNote
                scope="day"
                scopeKey={date}
                text={dayNote?.lessons ?? ""}
                placeholder="Add a daily note: market read, plan, execution, emotions, what worked, what to fix tomorrow."
              />
            </div>
          </section>
        </aside>
      </section>

      <section className="max-w-[820px]">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Trade Cycles
        </h2>
        <div className="border-y border-[var(--hairline)]">
          {tradeCycles.length > 0 ? (
            <div className="divide-y divide-[var(--hairline)]">
              {tradeCycles.map((cycle, index) => (
                <article key={cycle.id} className="py-5">
                  {(() => {
                    const cycleNotes = cycle.tradeIds
                      .map((tradeId) => ({ tradeId, note: noteByTradeId.get(tradeId) }))
                      .filter((item): item is { tradeId: number; note: typeof schema.journalEntries.$inferSelect } => item.note != null);

                    return (
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                            <h3 className="text-base font-semibold text-[var(--foreground)]">
                              Trade {index + 1}
                            </h3>
                            {cycleNotes.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-3">
                                {cycleNotes.map(({ tradeId }, noteIndex) => (
                                  <Link
                                    key={tradeId}
                                    href={`/trades/${tradeId}?returnTo=${encodeURIComponent(`/trades/review?date=${date}&symbol=${symbol}&returnTo=${encodeURIComponent(backHref)}`)}`}
                                    className="font-mono text-[12px] text-[var(--blue)] hover:underline"
                                  >
                                    {cycleNotes.length === 1 ? "Trade note" : `Trade note ${noteIndex + 1}`}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[12px] text-[var(--muted)]">
                            <span className="tabular-nums">{cycle.executions.length} fills</span>
                            <span className="text-[var(--faint)]">·</span>
                            <span className="tabular-nums">{cycle.sharesTraded.toLocaleString()} shares</span>
                            <span className="text-[var(--faint)]">·</span>
                            <span className={`tabular-nums ${pnlClass(cycle.pnl)}`}>
                              {cycle.pnl == null ? "Open" : fmtMoney(cycle.pnl)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid gap-y-2 font-mono text-[12px] sm:grid-cols-[1fr_72px_84px_92px_1fr]">
                    <div className="hidden pb-1 uppercase tracking-[0.24em] text-[var(--muted)] sm:block">Time (ET)</div>
                    <div className="hidden pb-1 uppercase tracking-[0.24em] text-[var(--muted)] sm:block">Side</div>
                    <div className="hidden pb-1 uppercase tracking-[0.24em] text-[var(--muted)] sm:block">Shares</div>
                    <div className="hidden pb-1 uppercase tracking-[0.24em] text-[var(--muted)] sm:block">Price</div>
                    <div className="hidden pb-1 uppercase tracking-[0.24em] text-[var(--muted)] sm:block">Effect</div>
                    {cycle.executions.map((execution) => (
                      <div key={execution.id} className="contents">
                        <div className="tabular-nums text-[var(--foreground)]">{fmtTime(execution.executedAt)}</div>
                        <div style={{ color: execution.side.toLowerCase() === "buy" ? "var(--green)" : "var(--red)" }}>
                          {execution.side.toUpperCase()}
                        </div>
                        <div className="tabular-nums text-[var(--foreground)]">{execution.quantity.toLocaleString()}</div>
                        <div className="tabular-nums text-[var(--foreground)]">{fmtPrice(execution.price)}</div>
                        <div className="text-[var(--muted)]">{execution.posEffect ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-3 py-6 text-center text-sm text-[var(--muted)]">
              No executions found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
