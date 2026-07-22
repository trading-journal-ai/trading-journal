export type IndicatorCandle = {
  t: number;
  h: number;
  l: number;
  c: number;
  vol: number;
};

export type IndicatorPoint = {
  t: number;
  value: number;
};

export type MarketIndicatorSeries = {
  ema9: IndicatorPoint[];
  ema20: IndicatorPoint[];
  vwap: IndicatorPoint[];
};

/**
 * Calculate a causal EMA series. Values are withheld until `period` bars have
 * been observed, matching the chart's historical warmup behavior.
 * Candles must be ordered oldest to newest.
 */
export function emaSeries(candles: IndicatorCandle[], period: number): IndicatorPoint[] {
  if (!Number.isInteger(period) || period <= 0) {
    throw new RangeError("EMA period must be a positive integer");
  }

  const multiplier = 2 / (period + 1);
  let ema: number | null = null;
  const points: IndicatorPoint[] = [];

  candles.forEach((candle, index) => {
    ema = ema == null ? candle.c : candle.c * multiplier + ema * (1 - multiplier);
    if (index >= period - 1) points.push({ t: candle.t, value: ema });
  });

  return points;
}

/**
 * Calculate typical-price VWAP from an explicit session anchor. Candles before
 * the anchor are ignored. Without an anchor, the first supplied candle starts
 * the session, preserving the chart's existing behavior.
 */
export function vwapSeries(
  candles: IndicatorCandle[],
  options?: { anchorTime?: number },
): IndicatorPoint[] {
  const anchorTime = options?.anchorTime ?? Number.NEGATIVE_INFINITY;
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  const points: IndicatorPoint[] = [];

  for (const candle of candles) {
    if (candle.t < anchorTime) continue;
    const volume = Math.max(0, candle.vol);
    cumulativeTypicalVolume += ((candle.h + candle.l + candle.c) / 3) * volume;
    cumulativeVolume += volume;
    if (cumulativeVolume > 0) {
      points.push({ t: candle.t, value: cumulativeTypicalVolume / cumulativeVolume });
    }
  }

  return points;
}

/** Shared indicator bundle used by rendered charts and deterministic reviews. */
export function marketIndicatorSeries(
  candles: IndicatorCandle[],
  options?: { vwapAnchorTime?: number },
): MarketIndicatorSeries {
  return {
    ema9: emaSeries(candles, 9),
    ema20: emaSeries(candles, 20),
    vwap: vwapSeries(candles, { anchorTime: options?.vwapAnchorTime }),
  };
}
