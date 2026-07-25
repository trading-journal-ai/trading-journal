# Chart Read Panel — hindsight-aware chart analysis in the ticker review

> **Status:** Discovery write-up — defines the feature and its data contract.
> No UI work until the contract is agreed (see
> [../DATA_MODEL.md](../DATA_MODEL.md) "content model before UI").
> **Updated:** 2026-07-24
> **Companions:** [PINE_SETUP_INDICATOR.md](PINE_SETUP_INDICATOR.md) ·
> [../coach/LEVELS.md](../coach/LEVELS.md) ·
> [../coach/SETUPS.md](../coach/SETUPS.md) ·
> [../analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md](../analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md) ·
> [../analytics/PRICE_ACTION_QUALITY_MODEL.md](../analytics/PRICE_ACTION_QUALITY_MODEL.md)

## What this is

A Scott-Go-style analysis panel for the **full ticker review**
(`/trades/review`), generated from our own candle + fills data instead of a
live chart feed. An **overlay toggle** on the trade chart reveals:

- **Pattern read** — a named pattern in trader language ("bull flag /
  consolidation after spike") with a confidence level.
- **Key levels** — the calculated level ladder for the ticker/day (support /
  resistance with a one-line reason each).
- **Trade plan** — the plan the read implies at a chosen bar: entry trigger,
  structural stop, targets, R:R.
- **What's next** — if-it-continues / if-it-fails / invalidation price, framed
  from a chosen timestamp.
- **Setup match** — the trader's setup checklist graded against the data
  (`met / violated / not computable`), per
  [../coach/SETUPS.md](../coach/SETUPS.md).

**The journal-native twist:** Scott Go is a real-time decision aid; ours is
**hindsight-aware**. Because the session already happened, every read is
gradeable — did the "what's next" call resolve as predicted? Did the actual
trade match the implied plan? A live tool can never offer that; a journal can.

## Why we can build this (and Scott Go's approach isn't needed)

Scott Go sits on top of a TradingView session (injected overlay + their own
data feed) because they don't own the chart or the data. We own both:

| Capability | Where it already lives |
| --- | --- |
| 1-minute OHLCV per traded symbol/day (incl. premarket), cached | `src/lib/candles/` (Massive fetch → SQLite) |
| EMA9 / EMA20 / VWAP series | `src/lib/marketIndicators.ts` |
| Chart surface with markers, bands, focus window | `src/components/LightweightTradeChart.tsx` |
| Bar-by-bar causal context: swing pivots, session & premarket high/low, VWAP relationship, EMA rail, failed HOD-break attempts, reference decision level | `src/lib/coach/opportunityContext.ts` |
| Price-action quality + phase classification (chop / tight grind / whippy / clean; ignition / pullback / continuation / exhaustion) | `src/lib/coach/priceActionRead.ts` |
| Trend/mode voting with reason codes | `src/lib/coach/fylMarketRead.ts` |
| Setup criteria as predicate checklists | [../coach/SETUPS.md](../coach/SETUPS.md) |
| Level vocabulary, quality ranking, scenario terms | [../coach/LEVELS.md](../coach/LEVELS.md) |

The new work is **assembly and naming**, not new analytics: compose these
signals into one structured object, add a calculated-level ladder builder, and
optionally let the LLM narrate on top.

## Architecture: deterministic first, LLM last

Follows the established coach pattern (engine computes, LLM narrates —
[../coach/FYL_DETERMINISTIC_REVIEW_PROCESS.md](../coach/FYL_DETERMINISTIC_REVIEW_PROCESS.md)):

1. **Level ladder builder** *(new, deterministic)* — generates the calculated
   levels from LEVELS.md §Calculated levels (premarket H/L, prev day H/L/close,
   opening range, HOD/LOD, VWAP, EMA rail, whole/half dollars, gap zones),
   ranks them by the LEVELS.md quality factors (touches, recency, confluence),
   and keeps the top N per side. Marked levels join the ladder when they exist
   and always outrank calculated ones (trader's source of truth).
2. **Read composer** *(new, deterministic)* — at an as-of bar, bundles:
   priceActionRead (quality + phase), fylMarketRead (mode + votes),
   opportunityContext (structure state), the level ladder, and the setup-match
   checklist for the trade's tagged setup. Derives the implied plan: entry
   trigger above the nearest resistance / continuation level, structural stop
   per the stop model (prev-candle low band), targets at the next levels up,
   R:R from those.
3. **Narrator** *(optional, LLM)* — turns the composed read into the pattern
   name and prose paragraphs, exactly as `generatedReview` does today. The LLM
   never computes a level or grades a predicate; it only names and narrates
   what the composer produced. Reads must render fully without it.
4. **Outcome grader** *(deterministic, hindsight)* — replays the bars after the
   as-of time and scores the read: which branch resolved (continue / fail /
   neither), whether invalidation hit before target, whether the actual entry
   matched the implied plan (and by how many cents / how many bars).

Everything is causal: a read "as of 09:42" uses only bars ≤ 09:42, matching
the warmup behavior already enforced in `marketIndicators.ts` and
`opportunityContext.ts`. Hindsight lives **only** in the grader.

## Data contract sketch (`ChartRead`)

Provenance: layers 3 and 4 of the DATA_MODEL spine — the composed read is
**calculated** (`ƒ`), the narration is **coach** (`✳`), stored and versioned
like `coach_reviews.reviewJson`.

```ts
type ChartRead = {
  version: "chart-read-v1";
  symbol: string;
  date: string;              // ET market date
  asOf: number;              // epoch sec — the bar the read is framed from
  timeframe: "1m" | "5m";

  // ƒ calculated
  pattern: {
    phase: PriceActionPhase;             // from priceActionRead
    quality: PriceActionQuality;
    mode: FylMarketMode;                 // from fylMarketRead
    reasonCodes: FylReasonCode[];
    confidence: ConfidenceLabel;
  };
  levels: Array<{                        // LEVELS.md record shape
    price: number;                       // or zoneLow/zoneHigh
    kind: "support" | "resistance" | "vwap" | "ema-rail" | "premarket-high"
        | "prev-day-high" | "prev-day-low" | "opening-range" | "round-number"
        | "gap-zone" | "hod" | "lod";
    source: "calculated" | "user";
    quality: number;                     // rank score, LEVELS.md factors
    reason: string;                      // "prev-day high + whole dollar"
  }>;
  impliedPlan: {
    bias: "long";                        // long-only engine
    entryTrigger: { price: number; condition: string };
    stop: { price: number; basis: "prev-candle-low" | "level" | "vwap" };
    targets: number[];                   // next levels up the ladder
    riskReward: number;
    invalidation: number;
  } | null;                              // null when no long read exists
  whatsNext: {
    ifContinues: string;                 // scenario vocabulary from LEVELS.md
    ifFails: string;
    invalidation: number;
    lean: "higher" | "lower" | "two-way";
  };
  setupMatch: {
    setupName: string | null;            // trade's tagged setup, if any
    criteria: Array<{ name: string; verdict: "met" | "violated" | "not_computable" }>;
  } | null;

  // ✳ coach (optional, regenerable)
  narration?: {
    patternName: string;                 // "Bull flag / consolidation"
    summary: string;
    model: string;
    generatedAt: number;
  };

  // ƒ calculated, hindsight-only — never shown in "live replay" framing
  outcome?: {
    resolved: "continued" | "failed" | "neither";
    branchCorrect: boolean;
    invalidationHitFirst: boolean;
    actualVsImplied: {
      tookTrade: boolean;
      entryDeltaCents: number | null;
      entryDeltaBars: number | null;
      stopConsistent: boolean | null;    // vs. the 10–20¢ structural band
    } | null;
  };
};
```

Open contract questions (settle before building):

- **Storage:** cache per (symbol, date, asOf, version) like candles, or compute
  on demand? Reads are deterministic given inputs, so cache is an optimization,
  not a correctness question. Lean: compute on demand, cache the narration.
- **Default asOf:** first trade's entry bar seems right; scrubbing to other
  bars is the replay feature.
- **Marked levels:** the contract accepts `source: "user"` but no drawing UI
  exists yet. Ladder must degrade gracefully to calculated-only.
- **Multi-trade days:** one read per as-of bar, not per trade; setupMatch picks
  the trade nearest the as-of time.

## Extension: multi-timeframe levels (5m / daily / weekly / monthly)

The v1 ladder above is intraday + prior-day. The natural extension — and the
thing no Pine indicator does well — is swing support/resistance
cross-referenced across timeframes, per the LEVELS.md quality factor
"higher timeframe = more weight":

- **Data:** the `candles` table already keys on `(symbol, timeframe, t)`, so
  daily bars need no schema change. Massive's aggregates endpoint returns a
  year-plus of daily history in one request per symbol
  (`/range/1/day/{from}/{to}`, same shape as the existing 1-minute fetch in
  `src/lib/candles/massive.ts`). Weekly/monthly roll up from daily locally;
  5-minute rolls up from cached 1-minute bars. One new fetch path, everything
  else is local aggregation.
- **Detection:** two detectors per higher timeframe: (a) the same causal
  pivot logic `opportunityContext.ts` uses intraday (k-bar swing highs/lows),
  and (b) **high-volume candles** — the trader's primary higher-TF heuristic
  (see LEVELS.md §Calculated levels): the daily/weekly/monthly candle with
  the highest volume in the lookback marks the most significant
  supply/resistance; top-N volume candles' high/low become zones. Nearby
  levels within a tolerance merge into one zone whose weight sums timeframe
  rank + volume rank + touches + recency (the LEVELS.md confluence factor,
  computed rather than eyeballed).
- **Workflow shape (per the trader, 2026-07): map high, trade low.** Higher
  timeframes are for *mapping* levels; 1-minute/5-minute are for execution
  and review. So the review chart stays on 1m/5m and higher-TF levels
  **project down** onto it as context lines — no synced multi-timeframe
  chart needed. A timeframe check ("load the monthly to look") is a
  mapping-time activity, not a review-time one.
- **Activation:** a level is *dormant* until price trades within a proximity
  band of it, then *active*; in hindsight we can also grade what it actually
  did using the LEVELS.md scenario vocabulary (bounce / breakout / rejection /
  reclaim / failed breakout). The ladder shown in the panel is the top active
  zones, not every line — this is what keeps a monthly-level overlay from
  turning the chart into a barcode.
- **Contract impact:** `levels[].timeframe` (`"5m" | "1d" | "1w" | "1M" |
  "intraday"`) and `levels[].state` (`"dormant" | "active" | "tested"`) join
  the record; zone form (`zoneLow`/`zoneHigh`) becomes the norm rather than
  the exception since clustered pivots are zones by construction.

Open question (genuinely unsettled): whether weekly/monthly levels matter for
sub-$10 momentum names whose float and story change month to month — many have
no meaningful history at current prices. The ladder should tolerate "daily
levels only" gracefully; treat weekly/monthly as an experiment, not a given.

## Second use case: corpus-wide setup scan

The same detection engine that powers the panel replay has a second consumer:
run it across **every cached trade day** to produce historical `setup_event`s
— "bull flag fired at 09:41 on a day you traded" — with no webhook and no
TradingView involved. That's retroactive opportunity-set capture
([../analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md](../analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md))
over the whole journal corpus, and it means the toolkit's detection logic
(audited in [PINE_SETUP_INDICATOR.md](PINE_SETUP_INDICATOR.md) — the bull-flag
and micro-pullback state machines are worth porting to TypeScript with the
four flagged defects fixed) pays off twice: once live on TradingView, once
historically here. The Pine webhook then only adds value for days/symbols the
journal has no candles for — setups that fired on watched tickers you never
traded.

## UI sketch: overlay toggle on the ticker review

Held loosely until the contract is locked — reference only:

- A **"Chart read" toggle** in the chart toolbar area of
  `src/app/(app)/trades/review/page.tsx`, off by default.
- On: the level ladder draws as horizontal price lines on
  `LightweightTradeChart` (support/resistance colors per the design system;
  the chart already draws entry/stop/target bands and EMA/VWAP overlays), and
  a **read panel** renders beside/below the chart with the pattern, plan,
  what's-next, setup-match, and — behind a second "reveal outcome" step — the
  hindsight grade. Two-step reveal preserves the "what would I have read at
  the time?" exercise.
- An **as-of scrubber** snaps to bars; the read recomputes causally. v1 can
  ship with a fixed as-of (entry bar) and add scrubbing later.
- Panel content is provenance-marked like everything else: `ƒ calculated` for
  the read, `✳ coach` for the narration.

## Phasing

1. **Contract + level ladder.** Agree `ChartRead` in DATA_MODEL terms; build
   the ladder builder with tests (pure function of candles + prior-day data).
2. **Composer + fixed-asOf panel.** Deterministic read at the entry bar,
   toggle on the ticker review, no LLM, no outcome grade.
3. **Outcome grader.** Hindsight scoring + actual-vs-implied comparison.
4. **Narration.** LLM pattern naming and prose via the existing coach path.
5. **As-of scrubbing / replay.** The "what would the read have been at 06:18?"
   experience.
6. **Multi-timeframe levels.** Daily-history fetch, per-timeframe pivots,
   zone clustering, activation states (see Extension section).
7. **Corpus-wide setup scan.** Port the setup detectors to TypeScript and run
   them across all cached days to backfill historical `setup_event`s.

## Explicitly out of scope

- **News / catalyst / social sentiment panels.** No historical sentiment
  source; retroactive StockTwits is effectively unobtainable. Revisit only if
  Massive exposes historical news worth having.
- **Chart-image (vision) pattern detection.** Stays out of the grading path
  per [../coach/COACH_ARCHITECTURE.md](../coach/COACH_ARCHITECTURE.md); at most
  a future validation experiment (does a vision model read our own rendered
  chart the same way the composer does?).
- **Short-side reads.** Long-only engine; `impliedPlan.bias` is `"long"` and a
  bearish read yields `impliedPlan: null` plus a "stand aside" framing.
- **Real-time anything.** That path is the companion doc:
  [PINE_SETUP_INDICATOR.md](PINE_SETUP_INDICATOR.md).
