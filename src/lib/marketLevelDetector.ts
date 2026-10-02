import type { CurlDay } from "./marketInsights";
import type { LevelDetection, LevelEvidence, LevelProposal, LevelRole } from "./marketLevelReview";

type Bar = CurlDay["bars"][number];
type Pivot = LevelEvidence & { index: number; tolerance: number };

const DETECTOR = "wick-levels:v2";
const PARAMETERS = {
  candleSeconds: 60,
  leftBars: 2,
  rightBars: 2,
  rangeLookbackBars: 20,
  rangeToleranceFraction: 0.5,
  minAbsoluteTolerance: 0.01,
  minPriceToleranceFraction: 0.001,
  maxPriceToleranceFraction: 0.015,
  minSwingExcursionRanges: 1,
  minTestSeparationBars: 5,
  minTests: 2,
  departureToleranceMultiple: 2,
  bandPaddingFraction: 0.25,
};

function validateBars(day: CurlDay): void {
  if (!day || typeof day.id !== "string" || !day.id || !Array.isArray(day.bars)) {
    throw new Error("Level detection requires an identified candle day.");
  }
  for (let i = 0; i < day.bars.length; i++) {
    const bar = day.bars[i];
    if (!Array.isArray(bar) || bar.length !== 6 || !bar.every(Number.isFinite)) {
      throw new Error("Level detection requires finite OHLCV candles.");
    }
    const [t, open, high, low, close, volume] = bar;
    if (!Number.isSafeInteger(t) || t < 0 || Math.min(open, high, low, close) <= 0
      || low > Math.min(open, close) || high < Math.max(open, close) || volume < 0) {
      throw new Error("Level detection received invalid candle geometry or time.");
    }
    if (i && (t <= day.bars[i - 1][0] || (t - day.bars[i - 1][0]) % PARAMETERS.candleSeconds !== 0)) {
      throw new Error("Level detection requires ordered one-minute candle timestamps.");
    }
  }
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function findPivots(bars: Bar[]): Pivot[] {
  const pivots: Pivot[] = [];
  let segmentStart = 0;
  for (let i = 0; i < bars.length; i++) {
    if (i && bars[i][0] - bars[i - 1][0] !== PARAMETERS.candleSeconds) segmentStart = i;
    if (i - segmentStart < PARAMETERS.leftBars || i + PARAMETERS.rightBars >= bars.length) continue;
    const right = bars.slice(i + 1, i + PARAMETERS.rightBars + 1);
    if (right.some((bar, offset) => bar[0] !== bars[i][0] + (offset + 1) * PARAMETERS.candleSeconds)) continue;
    const left = bars.slice(i - PARAMETERS.leftBars, i);
    const local = bars.slice(Math.max(segmentStart, i - PARAMETERS.rangeLookbackBars + 1), i + 1);
    const typicalRange = median(local.map((bar) => bar[2] - bar[3]));
    if (bars[i][2] === bars[i][3]) continue;
    const add = (role: LevelRole, price: number) => {
      pivots.push({
        index: i, t: bars[i][0], price, role, basis: "wick",
        // Input timestamps identify candle opens; a confirming candle must close.
        confirmedAt: right[right.length - 1][0] + PARAMETERS.candleSeconds,
        tolerance: Math.min(price * PARAMETERS.maxPriceToleranceFraction,
          Math.max(PARAMETERS.minAbsoluteTolerance, price * PARAMETERS.minPriceToleranceFraction, typicalRange * PARAMETERS.rangeToleranceFraction)),
      });
    };
    // Require observed excursion on both sides, relative to recent candle range.
    const excursion = typicalRange * PARAMETERS.minSwingExcursionRanges;
    const high = bars[i][2], low = bars[i][3];
    // Resolve equal-price plateaus to the final candle; never synthesize endpoints.
    if (left.every((bar) => high >= bar[2]) && right.every((bar) => high > bar[2])
      && high - Math.min(...left.map((bar) => bar[3])) >= excursion
      && high - Math.min(...right.map((bar) => bar[3])) >= excursion) add("resistance", high);
    if (left.every((bar) => low <= bar[3]) && right.every((bar) => low < bar[3])
      && Math.max(...left.map((bar) => bar[2])) - low >= excursion
      && Math.max(...right.map((bar) => bar[2])) - low >= excursion) add("support", low);
  }
  return pivots;
}

function comparePivots(a: Pivot, b: Pivot): number {
  return a.t - b.t || a.price - b.price || a.role.localeCompare(b.role);
}

function separatedTests(pivots: Pivot[], bars: Bar[]): Pivot[] {
  const tests: Pivot[] = [];
  for (const pivot of [...pivots].sort(comparePivots)) {
    const prior = tests[tests.length - 1];
    if (!prior) { tests.push(pivot); continue; }
    if (pivot.index - prior.index < PARAMETERS.minTestSeparationBars) continue;
    // A return visit needs observed movement away, not merely neighboring wicks.
    const departure = Math.max(prior.tolerance, pivot.tolerance) * PARAMETERS.departureToleranceMultiple;
    const movedAway = bars.slice(prior.index + 1, pivot.index).some((bar) => {
      const above = bar[4] > Math.max(prior.price, pivot.price) + departure;
      const below = bar[4] < Math.min(prior.price, pivot.price) - departure;
      // Opposite roles can be separated by a breakout/reclaim, not only a rejection.
      return prior.role !== pivot.role ? above || below : prior.role === "support" ? above : below;
    });
    if (movedAway) tests.push(pivot);
  }
  return tests;
}

function evidenceId(dayId: string, evidence: LevelEvidence[]): string {
  const text = JSON.stringify([DETECTOR, dayId, evidence]);
  // Non-security identity only. Two seeds reduce accidental collisions without a runtime dependency.
  const hash = (seed: number) => {
    let value = seed;
    for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
    return (value >>> 0).toString(16).padStart(8, "0");
  };
  return `level-${hash(2166136261)}${hash(2246822507)}`;
}

function makeProposal(day: CurlDay, pivots: Pivot[]): LevelProposal | null {
  const tests = separatedTests(pivots, day.bars);
  if (tests.length < PARAMETERS.minTests) return null;
  const evidence: LevelEvidence[] = tests.map(({ t, price, role, basis, confirmedAt }) => ({ t, price, role, basis, confirmedAt }));
  const prices = tests.map((test) => test.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const tolerance = pivots[0].tolerance;
  // Padding fits inside the same diameter limit as the evidence cluster.
  const padding = Math.max(0, Math.min(tolerance * PARAMETERS.bandPaddingFraction, (tolerance - (max - min)) / 2));
  const role = tests[tests.length - 1].role;
  return {
    id: evidenceId(day.id, evidence), role, center: median(prices),
    low: min - padding, high: max + padding,
    startT: tests[0].t, endT: day.bars[day.bars.length - 1][0], evidence,
    explanation: `${tests.length} separated wick tests; latest test is ${role}. Each pivot uses ${PARAMETERS.leftBars} preceding and ${PARAMETERS.rightBars} following candles. Completed-chart grouping; not a forecast.`,
  };
}

/**
 * Completed-chart proposals, not replay signals. Pivot availability is recorded,
 * but cluster membership and the final role use the full input. No volume-based
 * strength claim is made. Input bars must represent completed one-minute candles.
 */
export function detectMarketLevels(day: CurlDay): LevelDetection {
  validateBars(day);
  const pivots = findPivots(day.bars).sort((a, b) => a.price - b.price || comparePivots(a, b));
  const clusters: Pivot[][] = [];
  for (const pivot of pivots) {
    const cluster = clusters[clusters.length - 1];
    // Bound the complete cluster diameter, rather than chaining nearby neighbors.
    if (cluster && pivot.price - cluster[0].price <= cluster[0].tolerance) {
      cluster.push(pivot);
    } else {
      clusters.push([pivot]);
    }
  }
  const proposals = clusters.map((cluster) => makeProposal(day, cluster))
    .filter((proposal): proposal is LevelProposal => proposal !== null)
    .sort((a, b) => a.center - b.center || a.startT - b.startT);
  // Display padding must not visually merge shelves whose evidence stayed separate.
  for (let i = 1; i < proposals.length; i++) {
    const previous = proposals[i - 1], next = proposals[i];
    if (previous.high > next.low) {
      const boundary = (Math.max(...previous.evidence.map((item) => item.price))
        + Math.min(...next.evidence.map((item) => item.price))) / 2;
      previous.high = Math.min(previous.high, boundary);
      next.low = Math.max(next.low, boundary);
    }
  }
  // Geometry is an editable display band; retain unrounded source wick evidence.
  for (const proposal of proposals) {
    proposal.low = Number(proposal.low.toFixed(4));
    proposal.high = Number(proposal.high.toFixed(4));
    proposal.center = Number(proposal.center.toFixed(4));
  }
  return { detector: DETECTOR, parameters: { ...PARAMETERS }, proposals };
}
