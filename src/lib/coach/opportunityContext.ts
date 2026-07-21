/**
 * Opportunity-context calculator (fills × candles) — v1.
 *
 * Answers "was the opportunity still there when you entered?" by joining a
 * trade's executions to the ticker-day's 1-min candles. Deterministic and
 * pure: no I/O, no LLM. Spec: docs/analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md
 * (contract: docs/product/COACH_REVIEW_SCHEMA_V2.md §2.7).
 *
 * Hindsight boundary (Spec §5H): everything in `atEntry` uses only bars fully
 * closed before the entry timestamp. `postTrade` is hindsight and is labeled
 * as such; it feeds management findings, never entry grades — the single
 * exception is the explicit `good-entry-poor-management` classification,
 * which is *about* management.
 *
 * v1 is long-only by decision (2026-07-21): short trades return
 * `cannot-determine` with an explanatory missing-context note rather than
 * mirrored math. Field names stay side-neutral so LOD mirroring can be added
 * later without a schema change.
 */
import { MARKET_TZ, REVIEW_SESSION_WINDOW, zonedDateTimeToUtcMs } from "@/lib/time";
import type { Candle } from "@/lib/candles/massive";
import type { ConfidenceLabel } from "@/lib/coach/reviewEngine";
import { marketIndicatorSeries } from "@/lib/marketIndicators";
import { evaluateFylMarketRead, type FylMarketRead } from "@/lib/coach/fylMarketRead";

/**
 * Calibration v1 (2026-07-21): thresholds swept against the 2026-01→07
 * backfill corpus (4,913 usable trades; dollar-based, paper account, not
 * conditioned on market context). See scripts/opportunity-context-calibrate.mts
 * and data/opportunity-context/calibration-v1.json for the evidence.
 */
export const OPPORTUNITY_CALIBRATION = {
  atrPeriodBars: 14,
  minBarsBeforeClassifying: 15,
  /** Late-entry cut: empirically the best single extension cut in v1. */
  extensionAtr: 2.0,
  /** Mature moves die at far lower extension: ≥1 ATR once stale (joint sweep). */
  matureExtensionAtr: 1.0,
  nearDecisionAtr: 0.75,
  /** v1 sweep: separation peaks at 25 min (default was 30). */
  staleMinutes: 25,
  freshMinutes: 5,
  bandAtr: 0.25,
  volumeShortBars: 5,
  volumeLongBars: 15,
  volumeExpandRatio: 1.3,
  volumeDeclineRatio: 0.7,
  attemptConfirmBars: 2,
  swingPivotBars: 3,
  compressionAtrMult: 1.5,
  /** v1: median capture on ≥1 ATR moves was 0.16; flag only the round-trips (p25). */
  capturePoorRatio: 0.01,
  captureMinMfeAtr: 1.0,
  confidenceHigh: 0.7,
  confidenceMedium: 0.4,
} as const;

export type VolumeState = "expanding" | "stable" | "declining";

export type EmaStackState = "bullish" | "bearish" | "touching";
export type EmaCrossDirection = "bullish" | "bearish";
export type EmaRailRelationship = "above" | "inside" | "below";

export type PriceStructureLabel =
  | "hh_hl"
  | "lh_ll"
  | "compression"
  | "range"
  | "transitioning";

export type PremarketHighRelationship = "below" | "testing" | "above" | "lost-after-break";

export type OpportunityClassification =
  | "developing"
  | "still-valid"
  | "weakening"
  | "move-mature"
  | "valid-stock-late-entry"
  | "valid-setup-poor-execution"
  | "good-entry-poor-management"
  | "cannot-determine";

/** Causal read of the session as of one closed bar. */
export type AnatomyBar = {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  /** Review-window (07:00 ET+) running session high/low. */
  runningHigh: number | null;
  runningHighAt: number | null;
  runningLow: number | null;
  /** Running premarket high over 04:00–09:30 ET bars. */
  premarketHigh: number | null;
  ema9: number | null;
  ema20: number | null;
  emaStack: EmaStackState | null;
  lastEmaCross: EmaCrossDirection | null;
  barsSinceEmaCross: number | null;
  priceVsEmaRail: EmaRailRelationship | null;
  vwap: number | null;
  atr: number | null;
  volumeState: VolumeState | null;
  failedAttempts: number;
  structure: PriceStructureLabel;
  lastSwingHigh: number | null;
  lastSwingLow: number | null;
  /** Closed bars so far within the review window. */
  barsSinceOpen: number;
};

export type SessionAnatomy = {
  symbol: string;
  date: string;
  bars: AnatomyBar[];
  premarketStart: number;
  reviewStart: number;
  regularOpen: number;
  reviewEnd: number;
};

export type OpportunityAtEntry = {
  at: number;
  price: number;
  minutesSinceHigh: number | null;
  distanceFromHighPercent: number | null;
  /** ATR-normalized distance above the reference decision level; negative = at/below it. */
  extensionAtr: number | null;
  referenceLevel: { kind: "swing-low" | "swing-high" | "vwap"; price: number } | null;
  premarketHighRelationship: PremarketHighRelationship | null;
  vwapRelationship: "above" | "below" | "at" | null;
  ema9: number | null;
  ema20: number | null;
  emaStack: EmaStackState | null;
  lastEmaCross: EmaCrossDirection | null;
  barsSinceEmaCross: number | null;
  priceVsEmaRail: EmaRailRelationship | null;
  fylMarketRead: FylMarketRead;
  volumeState: VolumeState | null;
  priceStructure: PriceStructureLabel | null;
  failedAttemptCount: number | null;
  barsSinceOpen: number;
};

export type OpportunityPostTrade = {
  mfePerShare: number | null;
  maePerShare: number | null;
  mfeAtr: number | null;
  maeAtr: number | null;
  captureRatio: number | null;
  note: string;
};

export type OpportunityConfidence = {
  label: ConfidenceLabel;
  score: number;
  components: {
    coverage: number;
    warmup: number;
    thresholdMargin: number;
    intent: number;
  };
};

export type TradeOpportunityContext = {
  tradeId: number | string;
  classification: OpportunityClassification;
  plainLanguageConclusion: string;
  atEntry: OpportunityAtEntry | null;
  /** Extra at-entry snapshots for averaging-down adds (decision #2). */
  adverseAddContexts: OpportunityAtEntry[];
  postTrade: OpportunityPostTrade | null;
  intent: { setup: string | null; source: "user" | "missing" };
  confidence: OpportunityConfidence;
  missingContext: string[];
  evidence: { candleWindow: { symbol: string; timeframe: "1m"; from: number; to: number } } | null;
};

export type OpportunityTradeInput = {
  id: number | string;
  symbol: string;
  side: string;
  entryAt: number | null;
  exitAt: number | null;
  /** Average entry price. */
  entryPrice: number | null;
  /** Max position size in shares (for capture ratio). */
  quantity: number;
  pnl: number | null;
  setup?: string | null;
};

function etSeconds(date: string, time: string): number {
  return Math.round(zonedDateTimeToUtcMs(date, time, MARKET_TZ) / 1000);
}

/** Build the causal per-bar read of one ticker-day. Pure; bars need not be sorted. */
export function sessionAnatomy(symbol: string, date: string, candles: Candle[]): SessionAnatomy {
  const cal = OPPORTUNITY_CALIBRATION;
  const premarketStart = etSeconds(date, "04:00:00");
  const reviewStart = etSeconds(date, REVIEW_SESSION_WINDOW.start);
  const regularOpen = etSeconds(date, "09:30:00");
  const reviewEnd = etSeconds(date, "20:00:00");

  const dayBars = [...candles]
    .filter((c) => c.t >= premarketStart && c.t < reviewEnd)
    .sort((a, b) => a.t - b.t);
  const reviewBars = dayBars.filter((bar) => bar.t >= reviewStart);
  const indicators = marketIndicatorSeries(reviewBars, { vwapAnchorTime: reviewStart });
  const ema9ByTime = new Map(indicators.ema9.map((point) => [point.t, point.value]));
  const ema20ByTime = new Map(indicators.ema20.map((point) => [point.t, point.value]));
  const vwapByTime = new Map(indicators.vwap.map((point) => [point.t, point.value]));

  const bars: AnatomyBar[] = [];

  let runningHigh: number | null = null;
  let runningHighAt: number | null = null;
  let runningLow: number | null = null;
  let premarketHigh: number | null = null;
  let barsSinceOpen = 0;
  let failedAttempts = 0;
  let pendingAttempt: { level: number; barsLeft: number } | null = null;
  const trueRanges: number[] = [];
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  let prevClose: number | null = null;
  let lastDirectionalEmaStack: Exclude<EmaStackState, "touching"> | null = null;
  let lastEmaCross: EmaCrossDirection | null = null;
  let barsSinceEmaCross: number | null = null;

  for (let i = 0; i < dayBars.length; i += 1) {
    const bar = dayBars[i];
    const inReview = bar.t >= reviewStart;
    const inPremarket = bar.t < regularOpen;

    if (inPremarket) {
      premarketHigh = premarketHigh == null ? bar.h : Math.max(premarketHigh, bar.h);
    }

    const tr = prevClose == null
      ? bar.h - bar.l
      : Math.max(bar.h - bar.l, Math.abs(bar.h - prevClose), Math.abs(bar.l - prevClose));
    trueRanges.push(tr);
    prevClose = bar.c;
    const atr = trueRanges.length >= cal.atrPeriodBars
      ? trueRanges.slice(-cal.atrPeriodBars).reduce((a, b) => a + b, 0) / cal.atrPeriodBars
      : null;

    let volumeState: VolumeState | null = null;
    const window = cal.volumeShortBars + cal.volumeLongBars;
    if (i + 1 >= window) {
      const shortSum = dayBars.slice(i + 1 - cal.volumeShortBars, i + 1).reduce((a, b) => a + b.vol, 0);
      const longSum = dayBars
        .slice(i + 1 - window, i + 1 - cal.volumeShortBars)
        .reduce((a, b) => a + b.vol, 0);
      const longPerShort = longSum * (cal.volumeShortBars / cal.volumeLongBars);
      if (longPerShort > 0) {
        const ratio = shortSum / longPerShort;
        volumeState = ratio >= cal.volumeExpandRatio
          ? "expanding"
          : ratio <= cal.volumeDeclineRatio
            ? "declining"
            : "stable";
      }
    }

    if (inReview) {
      barsSinceOpen += 1;

      // Failed HOD-break attempts, judged against the pre-attempt high.
      const priorHigh = runningHigh;
      if (pendingAttempt) {
        if (bar.c > pendingAttempt.level) {
          pendingAttempt = null; // held above: successful break
        } else {
          pendingAttempt.barsLeft -= 1;
          if (pendingAttempt.barsLeft <= 0) {
            failedAttempts += 1;
            pendingAttempt = null;
          }
        }
      } else if (priorHigh != null && bar.h > priorHigh && bar.c <= priorHigh) {
        pendingAttempt = { level: priorHigh, barsLeft: cal.attemptConfirmBars - 1 };
        if (pendingAttempt.barsLeft <= 0) {
          failedAttempts += 1;
          pendingAttempt = null;
        }
      }

      if (runningHigh == null || bar.h > runningHigh) {
        runningHigh = bar.h;
        runningHighAt = bar.t;
      }
      runningLow = runningLow == null ? bar.l : Math.min(runningLow, bar.l);

    }

    const ema9 = ema9ByTime.get(bar.t) ?? null;
    const ema20 = ema20ByTime.get(bar.t) ?? null;
    const emaStack: EmaStackState | null = ema9 == null || ema20 == null
      ? null
      : ema9 > ema20
        ? "bullish"
        : ema9 < ema20
          ? "bearish"
          : "touching";

    if (barsSinceEmaCross != null) barsSinceEmaCross += 1;
    if (emaStack === "bullish" || emaStack === "bearish") {
      if (lastDirectionalEmaStack != null && emaStack !== lastDirectionalEmaStack) {
        lastEmaCross = emaStack;
        barsSinceEmaCross = 0;
      }
      lastDirectionalEmaStack = emaStack;
    }

    const priceVsEmaRail: EmaRailRelationship | null = ema9 == null || ema20 == null
      ? null
      : bar.c > Math.max(ema9, ema20)
        ? "above"
        : bar.c < Math.min(ema9, ema20)
          ? "below"
          : "inside";

    // Swing pivots confirmed `swingPivotBars` bars after the fact (causal).
    const k = cal.swingPivotBars;
    const pivotIdx = i - k;
    if (pivotIdx >= k) {
      const candidate = dayBars[pivotIdx];
      const left = dayBars.slice(pivotIdx - k, pivotIdx);
      const right = dayBars.slice(pivotIdx + 1, pivotIdx + 1 + k);
      if (left.every((b) => b.h < candidate.h) && right.every((b) => b.h < candidate.h)) {
        swingHighs.push(candidate.h);
      }
      if (left.every((b) => b.l > candidate.l) && right.every((b) => b.l > candidate.l)) {
        swingLows.push(candidate.l);
      }
    }

    let structure: PriceStructureLabel = "range";
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const [sh2, sh1] = swingHighs.slice(-2);
      const [sl2, sl1] = swingLows.slice(-2);
      const contracting = sh1 <= sh2 && sl1 >= sl2;
      if (contracting && atr != null && sh1 - sl1 <= cal.compressionAtrMult * atr) {
        structure = "compression";
      } else if (sh1 > sh2 && sl1 > sl2) {
        structure = "hh_hl";
      } else if (sh1 < sh2 && sl1 < sl2) {
        structure = "lh_ll";
      } else {
        structure = "transitioning";
      }
    }

    bars.push({
      t: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      vol: bar.vol,
      runningHigh,
      runningHighAt,
      runningLow,
      premarketHigh,
      ema9,
      ema20,
      emaStack,
      lastEmaCross,
      barsSinceEmaCross,
      priceVsEmaRail,
      vwap: vwapByTime.get(bar.t) ?? null,
      atr,
      volumeState,
      failedAttempts,
      structure,
      lastSwingHigh: swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : null,
      lastSwingLow: swingLows.length > 0 ? swingLows[swingLows.length - 1] : null,
      barsSinceOpen,
    });
  }

  return { symbol, date, bars, premarketStart, reviewStart, regularOpen, reviewEnd };
}

/** Last bar fully closed before `at` — the information available at that moment. */
export function anatomyAt(anatomy: SessionAnatomy, at: number): AnatomyBar | null {
  let result: AnatomyBar | null = null;
  for (const bar of anatomy.bars) {
    if (bar.t + 60 <= at) result = bar;
    else break;
  }
  return result;
}

function buildAtEntry(snap: AnatomyBar, at: number, price: number): OpportunityAtEntry {
  const cal = OPPORTUNITY_CALIBRATION;
  const band = snap.atr != null ? cal.bandAtr * snap.atr : null;

  const minutesSinceHigh = snap.runningHighAt != null
    ? Math.max(0, Math.round((at - snap.runningHighAt) / 60))
    : null;

  const distanceFromHighPercent = snap.runningHigh != null && snap.runningHigh > 0
    ? ((price - snap.runningHigh) / snap.runningHigh) * 100
    : null;

  const candidates: Array<{ kind: "swing-low" | "swing-high" | "vwap"; price: number }> = [];
  if (snap.lastSwingLow != null) candidates.push({ kind: "swing-low", price: snap.lastSwingLow });
  if (snap.lastSwingHigh != null) candidates.push({ kind: "swing-high", price: snap.lastSwingHigh });
  if (snap.vwap != null) candidates.push({ kind: "vwap", price: snap.vwap });
  const below = candidates.filter((c) => c.price <= price).sort((a, b) => b.price - a.price);
  const above = candidates.filter((c) => c.price > price).sort((a, b) => a.price - b.price);
  const referenceLevel = below[0] ?? above[0] ?? null;

  const extensionAtr = referenceLevel != null && snap.atr != null && snap.atr > 0
    ? (price - referenceLevel.price) / snap.atr
    : null;

  let premarketHighRelationship: PremarketHighRelationship | null = null;
  if (snap.premarketHigh != null && band != null) {
    if (Math.abs(price - snap.premarketHigh) <= band) {
      premarketHighRelationship = "testing";
    } else if (price > snap.premarketHigh) {
      premarketHighRelationship = "above";
    } else if (snap.runningHigh != null && snap.runningHigh > snap.premarketHigh) {
      premarketHighRelationship = "lost-after-break";
    } else {
      premarketHighRelationship = "below";
    }
  }

  let vwapRelationship: "above" | "below" | "at" | null = null;
  if (snap.vwap != null && band != null) {
    vwapRelationship = Math.abs(price - snap.vwap) <= band
      ? "at"
      : price > snap.vwap
        ? "above"
        : "below";
  }

  return {
    at,
    price,
    minutesSinceHigh,
    distanceFromHighPercent,
    extensionAtr,
    referenceLevel,
    premarketHighRelationship,
    vwapRelationship,
    ema9: snap.ema9,
    ema20: snap.ema20,
    emaStack: snap.emaStack,
    lastEmaCross: snap.lastEmaCross,
    barsSinceEmaCross: snap.barsSinceEmaCross,
    priceVsEmaRail: snap.priceVsEmaRail,
    fylMarketRead: evaluateFylMarketRead({
      structure: snap.structure,
      emaStack: snap.emaStack,
      lastEmaCross: snap.lastEmaCross,
      barsSinceEmaCross: snap.barsSinceEmaCross,
      priceVsEmaRail: snap.priceVsEmaRail,
      vwapRelationship,
    }),
    volumeState: snap.volumeState,
    priceStructure: snap.structure,
    failedAttemptCount: snap.failedAttempts,
    barsSinceOpen: snap.barsSinceOpen,
  };
}

function confidenceLabel(score: number): ConfidenceLabel {
  const cal = OPPORTUNITY_CALIBRATION;
  return score >= cal.confidenceHigh ? "high" : score >= cal.confidenceMedium ? "medium" : "low";
}

function cannotDetermine(
  trade: OpportunityTradeInput,
  missingContext: string[],
  evidence: TradeOpportunityContext["evidence"],
): TradeOpportunityContext {
  return {
    tradeId: trade.id,
    classification: "cannot-determine",
    plainLanguageConclusion:
      `Not enough chart data to judge this ${trade.symbol} entry — no guess is made. ` +
      `Missing: ${missingContext.join("; ")}.`,
    atEntry: null,
    adverseAddContexts: [],
    postTrade: null,
    intent: { setup: trade.setup ?? null, source: trade.setup ? "user" : "missing" },
    confidence: {
      label: "low",
      score: 0,
      components: { coverage: 0, warmup: 0, thresholdMargin: 0, intent: 0 },
    },
    missingContext,
    evidence,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function conclusionFor(
  classification: OpportunityClassification,
  symbol: string,
  atEntry: OpportunityAtEntry,
  postTrade: OpportunityPostTrade | null,
): string {
  const ext = atEntry.extensionAtr != null ? round1(atEntry.extensionAtr) : null;
  const mins = atEntry.minutesSinceHigh;
  const vol = atEntry.volumeState ?? "unknown";
  const fails = atEntry.failedAttemptCount ?? 0;

  switch (classification) {
    case "developing":
      return `${symbol} was still building when you entered — ${mins} min from the last high with volume ${vol}. The move was alive.`;
    case "still-valid":
      return `The ${symbol} entry was near a real decision point — ${ext} ATR from ${atEntry.referenceLevel?.kind ?? "support"}, ${mins} min from the high. The opportunity was still there.`;
    case "weakening":
      return `${symbol} was fading at entry — ${mins} min without a new high and volume ${vol}. The move needed proof it wasn't done.`;
    case "move-mature":
      return `${symbol} looked done before this entry — ${mins} min past the high, ${ext} ATR above the last decision point, volume ${vol}${fails > 0 ? `, ${fails} failed break${fails === 1 ? "" : "s"} already` : ""}. The move was mature before you clicked.`;
    case "valid-stock-late-entry":
      return `Right stock, late click — the entry paid up ${ext} ATR above the last decision point${mins != null && mins > 0 ? `, ${mins} min after the high` : ""}. The idea was fine; the entry changed the risk.`;
    case "valid-setup-poor-execution":
      return `The stated setup may have been valid, but execution paid up ${ext} ATR above the decision point. The setup was present; the entry changed the risk.`;
    case "good-entry-poor-management":
      return `Good entry, gave it away — the entry was at a real spot, but the trade kept ${postTrade?.captureRatio != null ? `${Math.round(postTrade.captureRatio * 100)}%` : "little"} of the best it offered. The exit lost this trade, not the entry.`;
    case "cannot-determine":
      return `Not enough chart data to judge this ${symbol} entry.`;
  }
}

/**
 * One-line entry reason for compact surfaces (annotation prompts, queue
 * rows). Plain labels per the glossary; null when nothing useful to say.
 */
export function shortEntryReason(ctx: TradeOpportunityContext): string | null {
  const atEntry = ctx.atEntry;
  if (atEntry == null) return null;
  const ext = atEntry.extensionAtr != null ? round1(atEntry.extensionAtr) : null;
  const mins = atEntry.minutesSinceHigh;

  switch (ctx.classification) {
    case "move-mature":
      return `entered ${mins} min past the high, ${ext} ATR extended`;
    case "valid-stock-late-entry":
    case "valid-setup-poor-execution":
      return `paid up ${ext} ATR above the last decision point`;
    case "weakening":
      return `${mins} min past the high on ${atEntry.volumeState ?? "fading"} volume`;
    case "developing":
      return `entered ${mins} min from the high, volume ${atEntry.volumeState ?? "building"}`;
    case "still-valid":
      return atEntry.referenceLevel
        ? `entered near ${atEntry.referenceLevel.kind === "vwap" ? "VWAP" : `the last ${atEntry.referenceLevel.kind.replace("-", " ")}`}`
        : null;
    case "good-entry-poor-management":
      return ctx.postTrade?.captureRatio != null
        ? `good entry — kept ${Math.max(0, Math.round(ctx.postTrade.captureRatio * 100))}% of the move`
        : "good entry, gave the move back";
    case "cannot-determine":
      return null;
  }
}

/**
 * Compute one trade's opportunity context from its ticker-day anatomy.
 * `adverseAddTimes` are epoch seconds of averaging-down adds (from
 * executionAnalysis adverseAdds) — each gets its own at-entry snapshot.
 */
export function opportunityContextForTrade(
  anatomy: SessionAnatomy | null,
  trade: OpportunityTradeInput,
  options?: { adverseAddTimes?: number[] },
): TradeOpportunityContext {
  const cal = OPPORTUNITY_CALIBRATION;
  const evidence = anatomy && anatomy.bars.length > 0
    ? {
        candleWindow: {
          symbol: anatomy.symbol,
          timeframe: "1m" as const,
          from: anatomy.bars[0].t,
          to: anatomy.bars[anatomy.bars.length - 1].t + 60,
        },
      }
    : null;

  if (trade.side !== "long") {
    return cannotDetermine(trade, ["short-side metrics not implemented (long-only v1)"], evidence);
  }
  if (anatomy == null || anatomy.bars.length === 0) {
    return cannotDetermine(trade, ["no cached candles for this ticker-day"], evidence);
  }
  if (trade.entryAt == null || trade.entryPrice == null) {
    return cannotDetermine(trade, ["trade is missing an entry timestamp or price"], evidence);
  }

  const snap = anatomyAt(anatomy, trade.entryAt);
  if (snap == null) {
    return cannotDetermine(trade, ["no closed bars before the entry"], evidence);
  }

  const missingContext: string[] = [];
  const atEntry = buildAtEntry(snap, trade.entryAt, trade.entryPrice);
  if (snap.atr == null) missingContext.push("ATR still warming up at entry");
  if (snap.premarketHigh == null) missingContext.push("premarket bars unavailable");
  if (!trade.setup) missingContext.push("trade intent (setup) not recorded");

  // Post-trade facts — hindsight, labeled as such.
  let postTrade: OpportunityPostTrade | null = null;
  if (trade.exitAt != null && trade.exitAt > trade.entryAt) {
    const held = anatomy.bars.filter((b) => b.t + 60 > trade.entryAt! && b.t < trade.exitAt!);
    if (held.length > 0) {
      const mfePerShare = Math.max(0, Math.max(...held.map((b) => b.high)) - trade.entryPrice);
      const maePerShare = Math.max(0, trade.entryPrice - Math.min(...held.map((b) => b.low)));
      const atr = snap.atr;
      const mfeDollars = mfePerShare * trade.quantity;
      postTrade = {
        mfePerShare,
        maePerShare,
        mfeAtr: atr != null && atr > 0 ? mfePerShare / atr : null,
        maeAtr: atr != null && atr > 0 ? maePerShare / atr : null,
        captureRatio: trade.pnl != null && mfeDollars > 0
          ? Math.min(1, trade.pnl / mfeDollars)
          : null,
        note: "Hindsight facts — used for management findings, never to grade the entry.",
      };
    }
  }

  // Classification from at-entry facts only (except the explicit management case).
  let classification: OpportunityClassification;
  let thresholdMargin = 0.5;
  const ext = atEntry.extensionAtr;
  const mins = atEntry.minutesSinceHigh;

  if (ext == null || mins == null) {
    return cannotDetermine(
      trade,
      [...missingContext, "insufficient anatomy for classification (no ATR or no session high yet)"],
      evidence,
    );
  }

  const extended = ext >= cal.extensionAtr;
  const stale = mins >= cal.staleMinutes;
  const marginOf = (value: number, threshold: number) =>
    Math.min(1, Math.abs(value - threshold) / threshold);

  if (ext >= cal.matureExtensionAtr && stale) {
    classification = "move-mature";
    thresholdMargin = Math.min(marginOf(ext, cal.matureExtensionAtr), marginOf(mins, cal.staleMinutes));
  } else if (extended) {
    classification = trade.setup ? "valid-setup-poor-execution" : "valid-stock-late-entry";
    thresholdMargin = marginOf(ext, cal.extensionAtr);
  } else if (stale && atEntry.volumeState === "declining") {
    classification = "weakening";
    thresholdMargin = marginOf(mins, cal.staleMinutes);
  } else if (mins <= cal.freshMinutes && atEntry.volumeState === "expanding") {
    classification = "developing";
    thresholdMargin = marginOf(mins, Math.max(1, cal.freshMinutes));
  } else {
    classification = "still-valid";
    thresholdMargin = marginOf(ext, cal.extensionAtr);
  }

  if (
    (classification === "still-valid" || classification === "developing") &&
    postTrade?.captureRatio != null &&
    postTrade.mfeAtr != null &&
    postTrade.mfeAtr >= cal.captureMinMfeAtr &&
    postTrade.captureRatio < cal.capturePoorRatio
  ) {
    classification = "good-entry-poor-management";
    thresholdMargin = marginOf(postTrade.captureRatio, cal.capturePoorRatio);
  }

  // Confidence: min of four auditable components (decision #3).
  const firstBar = anatomy.bars[0];
  const elapsedBars = Math.max(1, Math.floor((trade.entryAt - firstBar.t) / 60));
  const closedBars = anatomy.bars.filter((b) => b.t + 60 <= trade.entryAt!).length;
  const coverage = Math.min(1, closedBars / elapsedBars);
  const warmup = Math.min(1, snap.barsSinceOpen / cal.minBarsBeforeClassifying);
  const intentComponent = classification === "valid-setup-poor-execution" && !trade.setup ? 0.5 : 1;
  const score = Math.min(coverage, warmup, thresholdMargin, intentComponent);

  const adverseAddContexts = (options?.adverseAddTimes ?? [])
    .map((at) => {
      const addSnap = anatomyAt(anatomy, at);
      return addSnap ? buildAtEntry(addSnap, at, trade.entryPrice!) : null;
    })
    .filter((ctx): ctx is OpportunityAtEntry => ctx != null);

  return {
    tradeId: trade.id,
    classification,
    plainLanguageConclusion: conclusionFor(classification, trade.symbol, atEntry, postTrade),
    atEntry,
    adverseAddContexts,
    postTrade,
    intent: { setup: trade.setup ?? null, source: trade.setup ? "user" : "missing" },
    confidence: {
      label: confidenceLabel(score),
      score,
      components: { coverage, warmup, thresholdMargin, intent: intentComponent },
    },
    missingContext,
    evidence,
  };
}
