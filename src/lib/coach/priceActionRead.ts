export const PRICE_ACTION_READ_VERSION = "price-action-read-v1" as const;

export const PRICE_ACTION_THRESHOLDS = {
  windowBars: 12,
  comparisonBars: 12,
  minBars: 8,
  cleanEfficiency: 0.55,
  lowEfficiency: 0.42,
  cleanWickShare: 0.56,
  cleanOverlap: 0.74,
  whippyWickShare: 0.48,
  whippyOverlap: 0.64,
  expansionProgressAtr: 1.5,
  rangeExpansionRatio: 1.25,
  rangeContractionRatio: 0.75,
  volumeExpansionRatio: 1.3,
  volumeContractionRatio: 0.7,
  climaxVolumeRatio: 1.5,
  climaxMaxEfficiency: 0.35,
} as const;

export type PriceActionQuality = "chop" | "tight_grind" | "whippy_expansion" | "clean_expansion";
export type PriceActionPhase =
  | "ignition"
  | "pullback_consolidation"
  | "continuation_reclaim"
  | "exhaustion_failure"
  | "undetermined";
export type ParticipationState = "expanding" | "contracting" | "steady" | "climax_without_progress";

export type PriceActionCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  vol: number;
};

export type PriceActionMetrics = {
  directionalEfficiency: number;
  adjacentOverlap: number;
  wickShare: number;
  progressAtr: number | null;
  rangeRatio: number | null;
  volumeRatio: number | null;
  rotationCount: number;
};

export type PriceActionRead = {
  quality: PriceActionQuality;
  phase: PriceActionPhase;
  participation: ParticipationState;
  isConsolidating: boolean;
  headline: string;
  metrics: PriceActionMetrics;
  calculationVersion: typeof PRICE_ACTION_READ_VERSION;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function candleRange(candle: PriceActionCandle): number {
  return Math.max(0, candle.h - candle.l);
}

function directionalEfficiency(candles: PriceActionCandle[]): number {
  if (candles.length < 2) return 0;
  const netProgress = Math.abs(candles.at(-1)!.c - candles[0].o);
  let pathTraveled = 0;
  for (let index = 1; index < candles.length; index += 1) {
    pathTraveled += Math.abs(candles[index].c - candles[index - 1].c);
  }
  return pathTraveled > 0 ? Math.min(1, netProgress / pathTraveled) : 0;
}

function adjacentOverlap(candles: PriceActionCandle[]): number {
  const overlaps: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const previous = candles[index - 1];
    const current = candles[index];
    const smallerRange = Math.min(candleRange(previous), candleRange(current));
    if (smallerRange <= 0) continue;
    const overlap = Math.max(0, Math.min(previous.h, current.h) - Math.max(previous.l, current.l));
    overlaps.push(Math.min(1, overlap / smallerRange));
  }
  return average(overlaps) ?? 0;
}

function wickShare(candles: PriceActionCandle[]): number {
  const shares = candles.flatMap((candle) => {
    const range = candleRange(candle);
    return range > 0 ? [(range - Math.abs(candle.c - candle.o)) / range] : [];
  });
  return average(shares) ?? 0;
}

function rotationCount(candles: PriceActionCandle[]): number {
  let rotations = 0;
  let previousDirection = 0;
  for (let index = 1; index < candles.length; index += 1) {
    const direction = Math.sign(candles[index].c - candles[index - 1].c);
    if (direction === 0) continue;
    if (previousDirection !== 0 && direction !== previousDirection) rotations += 1;
    previousDirection = direction;
  }
  return rotations;
}

function comparisonRatio(current: number[], previous: number[]): number | null {
  const currentAverage = average(current);
  const previousAverage = average(previous);
  if (currentAverage == null || previousAverage == null || previousAverage <= 0) return null;
  return currentAverage / previousAverage;
}

/**
 * Causal rolling read of price movement, move phase, and participation. The
 * thresholds are versioned FYL priors and must be calibrated against labeled
 * ticker-day windows before being treated as firm setup rules.
 */
export function evaluatePriceActionRead(
  candles: PriceActionCandle[],
  options: {
    atr: number | null;
    structure: "hh_hl" | "lh_ll" | "compression" | "range" | "transitioning";
  },
): PriceActionRead | null {
  const thresholds = PRICE_ACTION_THRESHOLDS;
  if (candles.length < thresholds.minBars) return null;

  const current = candles.slice(-thresholds.windowBars);
  const previous = candles.slice(
    -(thresholds.windowBars + thresholds.comparisonBars),
    -thresholds.windowBars,
  );
  const efficiency = directionalEfficiency(current);
  const overlap = adjacentOverlap(current);
  const wicks = wickShare(current);
  const progress = Math.abs(current.at(-1)!.c - current[0].o);
  const progressAtr = options.atr != null && options.atr > 0 ? progress / options.atr : null;
  const rangeRatio = comparisonRatio(current.map(candleRange), previous.map(candleRange));
  const volumeRatio = comparisonRatio(
    current.map((candle) => Math.max(0, candle.vol)),
    previous.map((candle) => Math.max(0, candle.vol)),
  );
  const rotations = rotationCount(current);

  const highEnergy = (progressAtr != null && progressAtr >= thresholds.expansionProgressAtr)
    || (rangeRatio != null && rangeRatio >= thresholds.rangeExpansionRatio);
  let quality: PriceActionQuality;
  if (
    highEnergy
    && efficiency >= thresholds.cleanEfficiency
    && wicks < thresholds.cleanWickShare
    && overlap < thresholds.cleanOverlap
  ) {
    quality = "clean_expansion";
  } else if (
    highEnergy
    && (efficiency < thresholds.cleanEfficiency
      || wicks >= thresholds.whippyWickShare
      || overlap >= thresholds.whippyOverlap)
  ) {
    quality = "whippy_expansion";
  } else if (efficiency >= thresholds.cleanEfficiency) {
    quality = "tight_grind";
  } else {
    quality = "chop";
  }

  const participation: ParticipationState = volumeRatio != null
    && volumeRatio >= thresholds.climaxVolumeRatio
    && efficiency <= thresholds.climaxMaxEfficiency
    ? "climax_without_progress"
    : volumeRatio != null && volumeRatio >= thresholds.volumeExpansionRatio
      ? "expanding"
      : volumeRatio != null && volumeRatio <= thresholds.volumeContractionRatio
        ? "contracting"
        : "steady";

  const rangeContracting = rangeRatio != null && rangeRatio <= thresholds.rangeContractionRatio;
  const volumeContracting = volumeRatio != null && volumeRatio <= thresholds.volumeContractionRatio;
  const isConsolidating = options.structure === "compression"
    || (rangeContracting && volumeContracting && rotations >= 3);

  let phase: PriceActionPhase = "undetermined";
  if (participation === "climax_without_progress") {
    phase = "exhaustion_failure";
  } else if (isConsolidating) {
    phase = "pullback_consolidation";
  } else if (quality === "clean_expansion" && participation === "expanding") {
    phase = "ignition";
  } else if (
    (options.structure === "hh_hl" || options.structure === "lh_ll")
    && efficiency >= thresholds.lowEfficiency
  ) {
    phase = "continuation_reclaim";
  }

  const headline = phase === "ignition"
    ? "Price was expanding with fresh participation."
    : phase === "pullback_consolidation"
      ? "Price was tightening into a smaller range."
      : phase === "continuation_reclaim"
        ? "The trend was making controlled progress."
        : phase === "exhaustion_failure"
          ? "Volume increased, but price stopped making progress."
          : quality === "chop"
            ? "Price was overlapping without a clean direction."
            : quality === "whippy_expansion"
              ? "Price was moving, but the action was loose and hard to trust."
              : "Price was making steady progress.";

  return {
    quality,
    phase,
    participation,
    isConsolidating,
    headline,
    metrics: {
      directionalEfficiency: efficiency,
      adjacentOverlap: overlap,
      wickShare: wicks,
      progressAtr,
      rangeRatio,
      volumeRatio,
      rotationCount: rotations,
    },
    calculationVersion: PRICE_ACTION_READ_VERSION,
  };
}
