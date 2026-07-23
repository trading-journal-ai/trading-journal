import type { ChartCandle } from "@/components/TradeChart";
import type { TradeSide } from "@/lib/executionAnalysis";

export type TradeExcursionWindow = {
  side: TradeSide;
  entryAt: number;
  exitAt: number;
  entryPrice: number;
  exitPrice: number;
};

export type TradeExcursion = {
  adverseAt: number;
  adversePct: number;
  adversePrice: number;
  barCount: number;
  capturePct: number | null;
  confirmedAdversePct: number;
  confirmedFavorablePct: number;
  entryAt: number;
  entryPrice: number;
  exitAt: number;
  exitPrice: number;
  favorableAt: number;
  favorablePct: number;
  favorablePrice: number;
  realizedPct: number;
};

export type TradeHeldCandle = {
  closePct: number;
  closePrice: number;
  openPct: number;
  openPrice: number;
  maximumPct: number;
  maximumPrice: number;
  minimumPct: number;
  minimumPrice: number;
  phase: "single" | "entry" | "held" | "exit";
  startedAt: number;
};

type TradeMinuteWindow = {
  entryAt?: number | null;
  exitAt?: number | null;
  tradeNumber: number;
};

function candleMinute(epochSeconds: number): number {
  return Math.floor(epochSeconds / 60) * 60;
}

export function tradeNumberForCandleMinute(
  trades: TradeMinuteWindow[],
  minute: number,
  preferredTradeNumber: number | null = null,
) {
  const matchingTrades = trades
    .filter((trade) => (
      trade.entryAt != null
      && trade.exitAt != null
      && minute >= candleMinute(trade.entryAt)
      && minute <= candleMinute(trade.exitAt)
    ))
    .toSorted((left, right) => (left.entryAt ?? 0) - (right.entryAt ?? 0));
  return matchingTrades.find((trade) => trade.tradeNumber === preferredTradeNumber)?.tradeNumber
    ?? matchingTrades[0]?.tradeNumber
    ?? null;
}

/**
 * Estimate a trade's excursion from the one-minute bars intersecting its hold.
 * The result intentionally stays bar-bounded: it cannot establish whether a
 * minute's high or low happened before or after an intraminute execution.
 */
export function tradeExcursionFromCandles(
  candles: ChartCandle[],
  trade: TradeExcursionWindow,
): TradeExcursion | null {
  if (
    !Number.isFinite(trade.entryAt)
    || !Number.isFinite(trade.exitAt)
    || !Number.isFinite(trade.entryPrice)
    || !Number.isFinite(trade.exitPrice)
    || trade.entryPrice <= 0
    || trade.exitAt < trade.entryAt
  ) {
    return null;
  }

  const from = candleMinute(trade.entryAt);
  const to = candleMinute(trade.exitAt);
  const heldCandles = candles.filter((candle) => candle.t >= from && candle.t <= to);
  if (heldCandles.length === 0) return null;

  let lowCandle = heldCandles[0];
  let highCandle = heldCandles[0];
  for (const candle of heldCandles.slice(1)) {
    if (candle.l < lowCandle.l) lowCandle = candle;
    if (candle.h > highCandle.h) highCandle = candle;
  }

  const adverseCandle = trade.side === "long" ? lowCandle : highCandle;
  const favorableCandle = trade.side === "long" ? highCandle : lowCandle;
  const adverseCandidate = trade.side === "long" ? adverseCandle.l : adverseCandle.h;
  const favorableCandidate = trade.side === "long" ? favorableCandle.h : favorableCandle.l;
  const adversePrice = trade.side === "long"
    ? Math.min(trade.entryPrice, adverseCandidate)
    : Math.max(trade.entryPrice, adverseCandidate);
  const favorablePrice = trade.side === "long"
    ? Math.max(trade.entryPrice, favorableCandidate)
    : Math.min(trade.entryPrice, favorableCandidate);
  const direction = trade.side === "long" ? 1 : -1;
  const directionalPercent = (price: number) => (
    direction * ((price - trade.entryPrice) / trade.entryPrice) * 100
  );
  const adversePct = Math.min(0, directionalPercent(adversePrice));
  const favorablePct = Math.max(0, directionalPercent(favorablePrice));
  const realizedPct = directionalPercent(trade.exitPrice);
  let confirmedAdversePct = Math.min(0, realizedPct);
  let confirmedFavorablePct = Math.max(0, realizedPct);
  for (const candle of heldCandles) {
    if (candle.t <= from || candle.t >= to) continue;
    const firstExtreme = directionalPercent(candle.l);
    const secondExtreme = directionalPercent(candle.h);
    confirmedAdversePct = Math.min(confirmedAdversePct, firstExtreme, secondExtreme);
    confirmedFavorablePct = Math.max(confirmedFavorablePct, firstExtreme, secondExtreme);
  }

  return {
    adverseAt: adversePrice === trade.entryPrice ? trade.entryAt : adverseCandle.t,
    adversePct,
    adversePrice,
    barCount: heldCandles.length,
    capturePct: favorablePct > 0 ? (realizedPct / favorablePct) * 100 : null,
    confirmedAdversePct,
    confirmedFavorablePct,
    entryAt: trade.entryAt,
    entryPrice: trade.entryPrice,
    exitAt: trade.exitAt,
    exitPrice: trade.exitPrice,
    favorableAt: favorablePrice === trade.entryPrice ? trade.entryAt : favorableCandle.t,
    favorablePct,
    favorablePrice,
    realizedPct,
  };
}

/** One-minute bars touched by the trade, in chronological order. */
export function tradeCandlesDuringHold(
  candles: ChartCandle[],
  trade: TradeExcursionWindow,
): TradeHeldCandle[] {
  if (
    !Number.isFinite(trade.entryAt)
    || !Number.isFinite(trade.exitAt)
    || !Number.isFinite(trade.entryPrice)
    || trade.entryPrice <= 0
    || trade.exitAt < trade.entryAt
  ) {
    return [];
  }

  const entryMinute = candleMinute(trade.entryAt);
  const exitMinute = candleMinute(trade.exitAt);
  const direction = trade.side === "long" ? 1 : -1;
  const directionalPercent = (price: number) => (
    direction * ((price - trade.entryPrice) / trade.entryPrice) * 100
  );

  return candles
    .filter((candle) => candle.t >= entryMinute && candle.t <= exitMinute)
    .toSorted((left, right) => left.t - right.t)
    .map((candle) => {
      const lowPct = directionalPercent(candle.l);
      const highPct = directionalPercent(candle.h);
      return {
        closePct: directionalPercent(candle.c),
        closePrice: candle.c,
        openPct: directionalPercent(candle.o),
        openPrice: candle.o,
        maximumPct: Math.max(lowPct, highPct),
        maximumPrice: trade.side === "long" ? candle.h : candle.l,
        minimumPct: Math.min(lowPct, highPct),
        minimumPrice: trade.side === "long" ? candle.l : candle.h,
        phase: entryMinute === exitMinute
          ? "single"
          : candle.t === entryMinute
            ? "entry"
            : candle.t === exitMinute ? "exit" : "held",
        startedAt: candle.t,
      } satisfies TradeHeldCandle;
    });
}
