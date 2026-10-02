import type { ReviewObservation } from "@/lib/marketChartReview";
/**
 * Market Context Insights prototype: data contract and pure helpers.
 *
 * The dataset is built offline by scripts/market-context-research/build-insights.py into the
 * gitignored data/evals/market-insights/insights.json. Each case keeps two timelines apart:
 * `asOf` uses only candles up to the decision candle; `outcome` is hindsight.
 */

export type InsightSession = "premarket" | "regular" | "after-hours";

export type InsightCase = {
  id: string;
  sym: string;
  date: string;
  pc: number;
  /** Decision candle, ET minutes after midnight. */
  time: number;
  /** Session of the first pop's high. */
  session: InsightSession;
  hasChart: boolean;
  asOf: {
    popPct: number;
    depth: number;
    sellVsBuy: number;
    bigRed: number;
    triggerVol: number;
    volSinceLow: number;
    highClose: number;
    minutesSinceHigh: number;
    stopCents: number;
  };
  outcome: {
    recovered: boolean;
    minutesToHigh: number | null;
    peakAfter: number;
    r: number;
  };
};

export type InsightChart = {
  /** [epochSeconds, open, high, low, close, volume] */
  bars: [number, number, number, number, number, number][];
  decisionT: number;
  decisionPrice: number;
  stop: number;
  highT: number;
  high: number;
  base: number;
};

export type InsightsData = {
  meta: { generatedAt: string; gainerDays: number; from: string; to: string; cases: number; decision: string; window: string };
  cases: InsightCase[];
  charts: Record<string, InsightChart>;
  hindsight: {
    recover: Record<"held" | "flush", { n: number; pct: number[]; retest: number; median: number }>;
    volume: Record<"recovered" | "flushed", { n: number; minutes: number[]; median: number[] }>;
  };
  gap?: { n: number; quadrants: Partial<Record<"gapDied" | "gapContinued" | "quietPremarket", number>>; points: [number, number][] };
};

export type SignalKey = keyof Pick<InsightCase["asOf"],
  "volSinceLow" | "triggerVol" | "depth" | "sellVsBuy" | "minutesSinceHigh" | "highClose" | "bigRed">;

export type SignalDefinition = {
  key: SignalKey;
  label: string;
  /** Plain description of what "strong" means at the time. */
  strongWhen: (threshold: string) => string;
  higherIsStrong: boolean;
  min: number;
  max: number;
  step: number;
  initial: number;
  format: (value: number) => string;
};

const times = (v: number) => `${v.toFixed(v < 10 ? 1 : 0)}×`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SIGNALS: SignalDefinition[] = [
  { key: "volSinceLow", label: "Volume since the low", strongWhen: (t) => `volume since the pullback low is at least ${t} the pre-high pace`, higherIsStrong: true, min: 0.5, max: 4, step: 0.1, initial: 1.5, format: times },
  { key: "triggerVol", label: "Trigger candle volume", strongWhen: (t) => `the trigger candle trades at least ${t} the pre-high pace`, higherIsStrong: true, min: 0.25, max: 4, step: 0.05, initial: 1, format: times },
  { key: "depth", label: "Pullback depth so far", strongWhen: (t) => `the pullback has given back no more than ${t} of the move`, higherIsStrong: false, min: 0.5, max: 1, step: 0.01, initial: 0.62, format: pct },
  { key: "sellVsBuy", label: "Selling vs buying volume", strongWhen: (t) => `red-candle volume is under ${t} the volume that built the move`, higherIsStrong: false, min: 0.1, max: 3, step: 0.05, initial: 0.5, format: times },
  { key: "minutesSinceHigh", label: "Minutes since the high", strongWhen: (t) => `the trigger comes within ${t} of the high`, higherIsStrong: false, min: 1, max: 45, step: 1, initial: 8, format: (v) => `${v} min` },
  { key: "highClose", label: "High-candle close", strongWhen: (t) => `the high candle closed at or above ${t} of the move`, higherIsStrong: true, min: 0, max: 1, step: 0.01, initial: 0.8, format: pct },
  { key: "bigRed", label: "Big red candles", strongWhen: (t) => `the pullback has no more than ${t} big red candles`, higherIsStrong: false, min: 0, max: 8, step: 1, initial: 2, format: (v) => String(v) },
];

export type MatrixBox = "strongRecovered" | "strongFailed" | "weakRecovered" | "weakFailed";

export function isStrong(value: number, signal: SignalDefinition, threshold: number): boolean {
  return signal.higherIsStrong ? value >= threshold : value <= threshold;
}

export function buildMatrix(cases: InsightCase[], signal: SignalDefinition, threshold: number) {
  const boxes: Record<MatrixBox, InsightCase[]> = { strongRecovered: [], strongFailed: [], weakRecovered: [], weakFailed: [] };
  for (const item of cases) {
    const strong = isStrong(item.asOf[signal.key], signal, threshold);
    const box: MatrixBox = strong
      ? item.outcome.recovered ? "strongRecovered" : "strongFailed"
      : item.outcome.recovered ? "weakRecovered" : "weakFailed";
    boxes[box].push(item);
  }
  const rate = (a: InsightCase[], b: InsightCase[]) => (a.length + b.length ? a.length / (a.length + b.length) : null);
  return {
    boxes,
    strongRate: rate(boxes.strongRecovered, boxes.strongFailed),
    weakRate: rate(boxes.weakRecovered, boxes.weakFailed),
    baseRate: cases.length ? cases.filter((item) => item.outcome.recovered).length / cases.length : null,
  };
}

export function etClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = String(minutes % 60).padStart(2, "0");
  return `${h > 12 ? h - 12 : h}:${m}${h >= 12 ? "pm" : "am"}`;
}

/* ── Curl labeling ─────────────────────────────────────────────────────────
 * Built by scripts/market-context-research/build-curl-days.py into the gitignored
 * data/evals/market-insights/curl-days.json. Justin's labels are the ground truth;
 * the rule below is a draft to compare against them, not a trading signal.
 */

export type CurlZone = "momentum" | "chop" | "between";

export type Curl = {
  n: number;
  /** Stable identity: the low candle's epoch seconds. */
  key: string;
  lowT: number;
  highT: number;
  low: number;
  high: number;
  movePct: number;
  candles: number;
  rangeCents: number;
  rangeBefore: number;
  expansion: number | null;
  triggerT: number | null;
  triggerPrice: number | null;
  triggerVol: number | null;
  higherLow: boolean;
  doubleBottom: boolean;
  zone: CurlZone;
  dollars: number;
  /** Share of volume on red candles, 10 candles before the low through the high. */
  redShare: number;
  /** The heaviest-volume candle in that window closed red. */
  heaviestRed: boolean;
  /** Last two pullback candles' average volume / the first pullback candle's. Under 1 = selling drying up. */
  pullbackFade: number | null;
  /** Heaviest pullback candle / heaviest candle in the push before it. */
  pullVsPush: number | null;
};

export type ZoneRole = "support" | "resistance" | "flip";

/** Detector candidate: swing highs/lows within max(10¢, 1.5%) of each other, 2+ touches. */
export type PriceZoneCandidate = {
  id: string;
  low: number;
  high: number;
  center: number;
  role: ZoneRole;
  touches: { t: number; kind: "support" | "resistance"; price: number }[];
  brokeT: number | null;
  flipT: number | null;
};

export type CurlDay = {
  id: string;
  sym: string;
  date: string;
  pc: number;
  /** [epochSeconds, open, high, low, close, volume] */
  bars: [number, number, number, number, number, number][];
  zones: { start: number; medianCents: number; volume: number; zone: CurlZone }[];
  priceZones: PriceZoneCandidate[];
  curls: Curl[];
};

export type CurlDaySummary = Pick<CurlDay, "id" | "sym" | "date" | "pc"> & { curls: number };

export type CurlLabelValue = "yes" | "strong" | "maybe" | "no" | "no-entry";

export const CURL_LABELS: { value: CurlLabelValue; label: string }[] = [
  { value: "strong", label: "Strong" },
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
  { value: "no-entry", label: "No entry" },
];

export type CurlLabel = { label: CurlLabelValue; comment?: string; at: string };

export type MissedCurl = { id: string; low: string; high: string; label: CurlLabelValue; comment?: string; at: string };

/** Justin's review of a detector zone; low/high override the detected edges when he adjusts them. */
export type ZoneDecision = { verdict: "keep" | "reject"; role?: ZoneRole; low?: number; high?: number; at: string };

/** A zone Justin drew that the detector did not propose. */
export type AddedZone = { id: string; low: number; high: number; role: ZoneRole; comment?: string; at: string };

export type DayZoneLabels = { decisions: Record<string, ZoneDecision>; added: AddedZone[] };

export type CurlLabels = {
  schema: "curl-labels:v1";
  criteria: string[];
  days: Record<string, { curls: Record<string, CurlLabel>; missed: MissedCurl[]; zones?: DayZoneLabels; observations?: ReviewObservation[] }>;
};

export type ResolvedZone = { id: string; low: number; high: number; role: ZoneRole; source: "kept" | "added" | "detector" };

/** Zones Justin confirmed (kept, with his edits, plus added). */
export function confirmedZones(day: CurlDay, zones: DayZoneLabels | undefined): ResolvedZone[] {
  if (!zones) return [];
  const kept = day.priceZones.flatMap((zone) => {
    const decision = zones.decisions[zone.id];
    if (decision?.verdict !== "keep") return [];
    return [{ id: zone.id, low: decision.low ?? zone.low, high: decision.high ?? zone.high, role: decision.role ?? zone.role, source: "kept" as const }];
  });
  return [...kept, ...zones.added.map((zone) => ({ id: zone.id, low: zone.low, high: zone.high, role: zone.role, source: "added" as const }))];
}

/** Confirmed zones when Justin has reviewed the day, otherwise the detector's candidates. */
export function contextZones(day: CurlDay, zones: DayZoneLabels | undefined): ResolvedZone[] {
  const confirmed = confirmedZones(day, zones);
  if (confirmed.length || (zones && Object.keys(zones.decisions).length)) return confirmed;
  return day.priceZones.map((zone) => ({ id: zone.id, low: zone.low, high: zone.high, role: zone.role, source: "detector" as const }));
}

/** Structure around a curl: support under its low, and room to the next zone above its trigger. */
export function curlStructure(curl: Curl, zones: ResolvedZone[]) {
  const pad = 0.02;
  const supportUnder = zones.find((zone) => zone.role !== "resistance" && curl.low >= zone.low - pad && curl.low <= zone.high + pad) ?? null;
  const from = curl.triggerPrice ?? curl.low;
  const above = zones.filter((zone) => zone.low > from).sort((a, b) => a.low - b.low)[0] ?? null;
  return { supportUnder, nextAbove: above, roomCents: above ? Math.round((above.low - from) * 100) : null };
}

export function zoneReview(days: CurlDay[], labels: CurlLabels) {
  const result = { reviewedDays: 0, kept: 0, rejected: 0, edited: 0, added: 0 };
  for (const day of days) {
    const zones = labels.days[day.id]?.zones;
    if (!zones) continue;
    const decisions = Object.values(zones.decisions);
    if (decisions.length || zones.added.length) result.reviewedDays += 1;
    for (const decision of decisions) {
      if (decision.verdict === "keep") result.kept += 1; else result.rejected += 1;
      if (decision.low != null || decision.high != null) result.edited += 1;
    }
    result.added += zones.added.length;
  }
  return result;
}

export const emptyCurlLabels = (): CurlLabels => ({ schema: "curl-labels:v1", criteria: [], days: {} });

/**
 * Draft rule from the first labeled days (STFS July 29 and TNON Oct 2, 2026). Each threshold is shown on
 * the page. TNON added the selling-pressure check: its heaviest candles were red.
 */
export const CURL_RULE = {
  minRangeCents: 15,
  minExpansion: 1.2,
  /** Candles this large already count as momentum, so no expansion is required (AMOD, Oct 2). */
  momentumCents: 25,
  minTriggerVol: 1.75,
  /** Pullback volume fading into the low also counts as buyers in control (AMOD, Oct 2). */
  maxPullbackFade: 0.9,
} as const;

export function curlRule(curl: Curl, rule = CURL_RULE): { pass: boolean; misses: string[] } {
  const misses: string[] = [];
  if (curl.triggerT == null) misses.push("no new-high trigger");
  if (curl.rangeCents < rule.minRangeCents) misses.push(`candles under ${rule.minRangeCents}¢`);
  const expanding = curl.expansion != null && curl.expansion >= rule.minExpansion;
  if (!expanding && curl.rangeCents < rule.momentumCents) misses.push("candles not expanding");
  const volumeIn = curl.triggerVol != null && curl.triggerVol >= rule.minTriggerVol;
  const sellingFades = curl.pullbackFade != null && curl.pullbackFade <= rule.maxPullbackFade;
  if (!volumeIn && !sellingFades) misses.push("volume not coming in and pullback selling not fading");
  if (curl.heaviestRed) misses.push("heaviest candle red (selling pressure)");
  return { pass: misses.length === 0, misses };
}

export const isPositiveLabel = (value: CurlLabelValue) => value === "yes" || value === "strong";

/** Agreement between the draft rule and Justin's labels, over every labeled curl in the loaded days. */
export function curlAgreement(days: CurlDay[], labels: CurlLabels) {
  const result = { ruleYesYouYes: 0, ruleYesYouNo: 0, ruleNoYouYes: 0, ruleNoYouNo: 0, labeled: 0 };
  for (const day of days) {
    const dayLabels = labels.days[day.id]?.curls ?? {};
    for (const curl of day.curls) {
      const mark = dayLabels[curl.key];
      if (!mark) continue;
      result.labeled += 1;
      const rule = curlRule(curl).pass;
      const you = isPositiveLabel(mark.label);
      if (rule && you) result.ruleYesYouYes += 1;
      else if (rule) result.ruleYesYouNo += 1;
      else if (you) result.ruleNoYouYes += 1;
      else result.ruleNoYouNo += 1;
    }
  }
  return result;
}
