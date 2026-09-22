export type TradePerShareResult = { id: number; perShare: number | null };

/** Combine each trade's session results before taking an equal-weighted mean. */
export function averagePnlPerShare(trades: readonly TradePerShareResult[]): number | null {
  const results = new Map<number, number>();
  for (const trade of trades) {
    if (trade.perShare != null && Number.isFinite(trade.perShare)) {
      results.set(trade.id, (results.get(trade.id) ?? 0) + trade.perShare);
    }
  }
  if (results.size === 0) return null;
  return [...results.values()].reduce((total, result) => total + result, 0) / results.size;
}

export function formatPerShareMoney(value: number | null): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const precision = Math.abs(value) > 0 && Math.abs(value) < 0.01 ? 4 : 2;
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

export const AVERAGE_PNL_PER_SHARE_DESCRIPTION =
  "Average net P&L per share per trade in this period. Each trade is weighted equally; its session results are combined first. Trades without a valid per-share result are excluded.";
