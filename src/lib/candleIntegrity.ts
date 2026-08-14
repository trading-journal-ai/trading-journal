type CandleTime = { t: number };

export const CANDLE_TIMEFRAME_SECONDS = 60;

/** Map an execution timestamp to the one-minute bar that contains it. */
export function executionMinute(epochSeconds: number): number {
  return Math.floor(epochSeconds / CANDLE_TIMEFRAME_SECONDS) * CANDLE_TIMEFRAME_SECONDS;
}

/**
 * Return execution minutes that have no matching market candle.
 *
 * Broker timestamps are authoritative. Price is deliberately excluded: a
 * matching price at another time must never be used to relocate an execution.
 */
export function missingExecutionMinutes(
  candles: CandleTime[],
  executionTimes: number[],
): number[] {
  const candleMinutes = new Set(candles.map((candle) => candle.t));
  const requiredMinutes = new Set(
    executionTimes
      .filter(Number.isFinite)
      .map(executionMinute),
  );

  return [...requiredMinutes]
    .filter((minute) => !candleMinutes.has(minute))
    .sort((left, right) => left - right);
}
