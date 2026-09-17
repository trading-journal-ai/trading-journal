/**
 * Raw, descriptive features for completed one-minute OHLCV windows.
 *
 * The caller supplies bars for one symbol and trading date in timestamp order.
 * Each timestamp is the minute's START time in epoch milliseconds. The
 * exclusive windowEndTimestamp is when its last minute has completed. This
 * module does not infer ET session boundaries or fill
 * missing minutes. Invalid OHLCV, absent session, and an
 * interrupted bar break a run. The feature names and calculations are versioned
 * so later research can compare like with like.
 */
export const FEATURE_SCHEMA_VERSION = "market-context-window-features-v1";
export const BAR_TIMESTAMP_CONVENTION = "start";

const MINUTE_MS = 60_000;
const SUPPORTED_HORIZONS = new Set([1, 3, 5]);

/** @typedef {{timestamp: number, open: number, high: number, low: number, close: number, volume: number, session: string, interrupted?: boolean}} MinuteBar */

/**
 * @param {unknown} value
 * @returns {value is MinuteBar}
 */
function isUsableBar(value) {
  if (value === null || typeof value !== "object") return false;
  const bar = /** @type {Partial<MinuteBar>} */ (value);
  const { open, high, low, close, volume, session } = bar;
  return (
    (bar.interrupted === undefined || bar.interrupted === false) &&
    typeof session === "string" && session.trim().length > 0 &&
    [open, high, low, close].every((price) =>
      typeof price === "number" && Number.isFinite(price) && price > 0
    ) &&
    typeof volume === "number" && Number.isFinite(volume) && volume >= 0 &&
    /** @type {number} */ (low) <= /** @type {number} */ (high) &&
    /** @type {number} */ (open) >= /** @type {number} */ (low) &&
    /** @type {number} */ (open) <= /** @type {number} */ (high) &&
    /** @type {number} */ (close) >= /** @type {number} */ (low) &&
    /** @type {number} */ (close) <= /** @type {number} */ (high)
  );
}

/**
 * @param {MinuteBar[]} window
 * @param {MinuteBar | null} precedingBar
 */
function describeWindow(window, precedingBar) {
  const first = window[0];
  const last = window[window.length - 1];
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  let bodyShareTotal = 0;
  let bodyObservationCount = 0;
  let overlapTotal = 0;
  let overlapObservationCount = 0;
  let shareVolume = 0;
  let dollarVolumeProxy = 0;
  let reversalCount = 0;
  let changeObservationCount = 0;
  let priorChangeSign = 0;

  for (let i = 0; i < window.length; i += 1) {
    const bar = window[i];
    highestHigh = Math.max(highestHigh, bar.high);
    lowestLow = Math.min(lowestLow, bar.low);
    const range = bar.high - bar.low;
    if (range > 0) {
      bodyShareTotal += Math.abs(bar.close - bar.open) / range;
      bodyObservationCount += 1;
    }
    shareVolume += bar.volume;
    // Arithmetic mean of OHLC is an explicit traded-value proxy, not measured VWAP.
    dollarVolumeProxy += (bar.open / 4 + bar.high / 4 + bar.low / 4 + bar.close / 4) * bar.volume;

    if (i === 0) continue;
    const previous = window[i - 1];
    const previousRange = previous.high - previous.low;
    if (range > 0 && previousRange > 0) {
      const intersection = Math.max(
        0,
        Math.min(previous.high, bar.high) - Math.max(previous.low, bar.low)
      );
      overlapTotal += intersection / Math.min(previousRange, range);
      overlapObservationCount += 1;
    }

    const change = bar.close - previous.close;
    if (change !== 0) {
      const sign = Math.sign(change);
      if (priorChangeSign !== 0 && sign !== priorChangeSign) reversalCount += 1;
      priorChangeSign = sign;
      changeObservationCount += 1;
    }
  }

  let closePathEfficiency = null;
  if (window.length > 1 && precedingBar !== null) {
    let pathLength = Math.abs(first.close - precedingBar.close);
    for (let i = 1; i < window.length; i += 1) {
      pathLength += Math.abs(window[i].close - window[i - 1].close);
    }
    if (pathLength > 0) {
      closePathEfficiency = Math.abs(last.close - precedingBar.close) / pathLength;
    }
  }

  const rangeDollars = highestHigh - lowestLow;
  const signedProgressDollars = last.close - first.open;
  return {
    windowStartTimestamp: first.timestamp,
    windowEndTimestamp: last.timestamp + MINUTE_MS,
    horizon: window.length,
    session: first.session,
    rangeDollars,
    rangePct: (100 * rangeDollars) / first.open,
    signedProgressDollars,
    signedProgressPct: (100 * signedProgressDollars) / first.open,
    averageBodyShare: bodyObservationCount > 0 ? bodyShareTotal / bodyObservationCount : null,
    bodyObservationCount,
    closePathEfficiency,
    adjacentOverlap: overlapObservationCount > 0 ? overlapTotal / overlapObservationCount : null,
    overlapObservationCount,
    reversalCount,
    // Number of nonzero changes between adjacent closes inside this window.
    changeObservationCount,
    shareVolume,
    dollarVolumeProxy,
  };
}

/**
 * Compute rolling 1-, 3-, and 5-minute raw features. Output order follows the
 * increasing windowEndTimestamp, then the caller's horizon order. Windows slide
 * by one minute. Each row uses only bars completed by its exclusive
 * windowEndTimestamp, so append-only future bars cannot change it. For an
 * as-of cutoff, retain rows with windowEndTimestamp <= cutoff; the caller is
 * responsible for providing only completed bars and session labels.
 *
 * Invalid prices, OHLC geometry, volume, session, and interrupted bars are
 * barriers: no window includes or crosses them. Timestamps must be finite
 * integer epoch milliseconds, strictly ascending; bad/duplicate order throws.
 * A gap other than exactly 60,000 ms, or a session change, also breaks a run.
 *
 * Body share ignores zero-range candles and is null if none has positive range.
 * Adjacent overlap ignores pairs with either zero range and is null if no pair
 * qualifies. Reversals compare the signs of nonzero adjacent close changes
 * within the window; flat changes are skipped, and changeObservationCount is
 * the number of such nonzero changes. Efficiency for 3/5-minute windows uses
 * the immediately preceding valid same-session minute close as c0; it is null
 * when c0 is missing or the full close path has zero length. For one minute it
 * is always null. None of these measures is an execution or trade signal.
 *
 * @param {MinuteBar[]} bars Bars for one symbol-date, sorted by minute-start epoch ms.
 * @param {{horizons?: number[]}} [options]
 * @returns {Array<ReturnType<typeof describeWindow>>}
 */
export function computeWindowFeatures(bars, { horizons = [1, 3, 5] } = {}) {
  if (!Array.isArray(bars)) throw new TypeError("bars must be an array");
  if (!Array.isArray(horizons) || horizons.length === 0 ||
      horizons.some((horizon) => !SUPPORTED_HORIZONS.has(horizon)) ||
      new Set(horizons).size !== horizons.length) {
    throw new RangeError("horizons must be a unique, nonempty subset of [1, 3, 5]");
  }

  /** @type {MinuteBar[]} */
  let run = [];
  const windows = [];
  let previousTimestamp = -Infinity;
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (bar === null || typeof bar !== "object" ||
        !Number.isSafeInteger(bar.timestamp)) {
      throw new TypeError(`bar ${index} must have a safe integer epoch-ms timestamp`);
    }
    if (bar.timestamp <= previousTimestamp) {
      throw new RangeError(`bar ${index} timestamp must be strictly later than the previous bar`);
    }
    const contiguous = bar.timestamp - previousTimestamp === MINUTE_MS;
    previousTimestamp = bar.timestamp;
    if (!isUsableBar(bar)) {
      run = [];
      continue;
    }
    if (!contiguous || (run.length > 0 && run[run.length - 1].session !== bar.session)) {
      run = [];
    }
    run.push(bar);
    // The extra c0 observation requires at most six retained bars.
    if (run.length > 6) run.shift();
    for (const horizon of horizons) {
      if (run.length < horizon) continue;
      const window = run.slice(-horizon);
      const precedingBar = run.length > horizon ? run[run.length - horizon - 1] : null;
      windows.push(describeWindow(window, precedingBar));
    }
  }
  return windows;
}
