import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { getCandles } from "@/lib/candles";
import { fallbackCandlesFromExecutions } from "@/lib/candles/fallback";
import LightweightTradeChart from "@/components/LightweightTradeChart";
import ReviewHeader from "@/components/ReviewHeader";
import { fmtDate, fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const DEFAULT_TRADE_ID = 9781;

function holdingPeriod(from: number, to: number): string {
  const seconds = Math.max(0, to - from);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default async function LightweightPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ tradeId?: string }>;
}) {
  const params = await searchParams;
  const tradeId = Number(params.tradeId ?? DEFAULT_TRADE_ID);
  if (!Number.isInteger(tradeId)) notFound();

  const activeAccount = await getActiveAccount();
  const trade = (
    await db.select().from(schema.trades).where(eq(schema.trades.id, tradeId)).limit(1)
  )[0];

  if (!trade || trade.accountId !== activeAccount.id) notFound();

  const execs = await db
    .select()
    .from(schema.executions)
    .where(eq(schema.executions.tradeId, tradeId))
    .orderBy(asc(schema.executions.executedAt));

  const lastAt = trade.exitAt ?? execs.at(-1)?.executedAt ?? trade.entryAt ?? 0;
  const firstAt = trade.entryAt ?? execs[0]?.executedAt ?? lastAt;
  const candleFrom = firstAt - 20 * 60;
  const candleTo = lastAt + 20 * 60;
  const { candles, error } = await getCandles(trade.symbol, candleFrom, candleTo);
  const chartCandles = candles.length > 0 ? candles : fallbackCandlesFromExecutions(execs, candleFrom, candleTo);

  const dir = trade.side === "long" ? 1 : -1;
  const gross =
    trade.avgEntryPrice != null && trade.avgExitPrice != null
      ? (trade.avgExitPrice - trade.avgEntryPrice) * dir * trade.quantity
      : null;
  const net = gross == null ? null : gross - trade.fees;
  const perShare = net == null || trade.quantity === 0 ? null : net / trade.quantity;

  return (
    <div className="mx-auto max-w-[1180px] space-y-8">
      <div className="font-mono text-[13px] text-[var(--muted)]">
        <Link href={`/trades/${trade.id}`} className="text-[var(--blue)] hover:underline">
          Current trade detail
        </Link>
        <span className="px-2">/</span>
        Lightweight Charts prototype
      </div>

      <ReviewHeader
        title={trade.symbol}
        date={fmtDate(trade.entryAt)}
        metrics={[
          { label: `${trade.quantity.toLocaleString()} shares` },
          { label: trade.exitAt ? `${holdingPeriod(firstAt, trade.exitAt)} held` : "Open" },
          {
            label: `P&L ${net == null ? "—" : fmtMoney(net)}`,
            className: net == null ? undefined : net >= 0 ? "text-[var(--green)]" : "text-[var(--red)]",
          },
          {
            label: `Per share ${perShare == null ? "—" : fmtMoney(perShare)}`,
            className:
              perShare == null ? undefined : perShare >= 0 ? "text-[var(--green)]" : "text-[var(--red)]",
          },
        ]}
      />

      {chartCandles.length > 0 ? (
        <LightweightTradeChart
          candles={chartCandles}
          markers={execs.map((execution) => ({
            t: execution.executedAt,
            price: execution.price,
            side: execution.side as "buy" | "sell",
          }))}
        />
      ) : error ? (
        <div className="rounded-[6px] border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
          Candle data is unavailable for this trade.
        </div>
      ) : (
        <LightweightTradeChart candles={[]} markers={[]} />
      )}
    </div>
  );
}
