# Opportunity-Context Calculator (fills × candles)

> Status: v1 spec + data audit · written 2026-07-21
>
> Product question: **"Was the opportunity still there when you entered?"**
>
> This is the fills-to-candles computation layer named in
> [../DATA_MODEL.md](../DATA_MODEL.md) §7.2 and typed in
> [../product/COACH_REVIEW_SCHEMA_V2.md](../product/COACH_REVIEW_SCHEMA_V2.md)
> §2.7 (`OpportunityContext`). It is the bridge between the execution-only
> review engine ([REVIEW_ENGINE_SPEC.md](REVIEW_ENGINE_SPEC.md)) and the full
> chart-evidence vocabulary in
> [PRICE_ACTION_QUALITY_MODEL.md](PRICE_ACTION_QUALITY_MODEL.md). It does not
> replace either; it is the smallest deterministic module that lets the coach
> say things like *"you entered after the move was extended, on declining
> volume, 40 minutes past the high."*

## 1. Data audit — do we have enough to build v1?

**Yes. v1 is computable today with zero new data sources.** Evidence:

| Input | Where it lives | Status |
| --- | --- | --- |
| 1-min OHLCV bars, with volume | `candles` table (`o/h/l/c/vol`, epoch-second `t`), fetched once on import via `src/lib/candles/` (Massive `/v2/aggs`) | ✅ Present. Demo DB: 22,249 bars, 29 symbols, 18 ticker-days |
| Premarket coverage | Fetch window is the full calendar day; bars confirmed spanning **04:00–19:59 ET** | ✅ Present — premarket-high relationship is computable |
| Entries/exits with timestamps, price, share size | `executions` table; `groupTradeExecutions` collapses fills into order actions with broker-order provenance | ✅ Present (13,489 fills in demo DB) |
| Per-trade execution behavior (adds, averaging down, partials, max position) | `src/lib/executionAnalysis.ts` → `CoachTradeExecutionFacts` | ✅ Built and already in the coach payload |
| Review window constant | 07:00–20:00 ET (DATA_MODEL §8.10, adopted) | ✅ Decided — anatomy computes over this window; premarket sub-window 04:00–09:30 for PM high/low only |
| Session-level stats to join against | `SessionFactPack` (reviewEngine.ts) | ✅ Built |

**Known limitations at v1 (design around, don't block on):**

1. **No multi-day volume baseline.** Candles are cached only for *traded*
   ticker-days, so "relative volume vs this symbol's 14-day average at this
   time-of-day" is not computable yet. v1's `volumeState` must be
   **intraday-relative** (this bar window vs the session's own volume curve).
   This is honest and useful, but weaker for judging participation on a
   low-float spike vs its own history. See wishlist item 1.
2. **Planned risk is sparse.** Distances are expressed in **percent and
   ATR-normalized units**, with R only when a stop was recorded (matches the
   engine's existing `riskModel: dollar-fallback`).
3. **Some symbols will have no candles** (delisted, CUSIP-only, fetch failure).
   The §6.9 enum already includes `cannot-determine`; the calculator must emit
   it with `missingContext` populated rather than degrade silently
   (mirrors the "Coverage unavailable" market-context stance on the day page).

## 2. What v1 computes

Two pure functions, mirroring the reviewEngine pattern (deterministic, no I/O,
fixture-testable):

```
sessionAnatomy(candles, reviewWindow)            → SessionAnatomy   (per ticker-day, once)
opportunityContext(anatomy, trade, executions)   → OpportunityContext (per trade)
```

### 2.1 SessionAnatomy — per ticker-day, computed once

All series are causal (value at bar *t* uses only bars ≤ *t*) so per-trade
reads stay hindsight-free:

- **Running HOD / LOD** with timestamps (regular session), plus **premarket
  high/low** (04:00–09:30 ET).
- **Running session VWAP**: cumulative Σ(typical price × vol) / Σ(vol) from the
  review-window open.
- **Rolling 1-min ATR** (for normalizing distances — a $0.30 extension means
  nothing without it).
- **Volume curve**: per-bar volume and a rolling short/long window pair for
  expanding/stable/declining classification.
- **Failed-attempt ledger**: bars that traded above the prior HOD but closed
  back below it (attempt definition is a `{calibrate}` constant).
- **Minimal swing structure**: sequence of confirmed swing highs/lows → the
  `hh_hl / lh_ll / range / compression / transitioning` label from the
  price-action model's `structure` field. (Full quality/phase classification
  stays in the price-action model; anatomy only carries what §6.9 needs.)

### 2.2 At-entry facts (information available at entry — Spec §5H)

Frozen at the first entry execution's timestamp (and recomputed per add, since
`executionAnalysis` already itemizes adverse adds):

| Field (§6.9) | Definition |
| --- | --- |
| `timeSinceCurrentHigh` | Minutes since the running HOD at entry (LOD for shorts) |
| `distanceFromCurrentHigh` | (entry − HOD)/HOD in %, plus ATR-normalized variant |
| `premarketHighRelationship` | Entry vs PM high: below / testing / above-hold / above-failed |
| `vwapRelationship` | above / below / at (band = `{calibrate}` fraction of ATR) |
| `volumeState` | expanding / stable / declining: last N-min volume vs prior M-min and vs session curve position |
| `failedAttemptCount` | Failed HOD-break attempts before entry |
| `priceStructure` | Swing-structure label at entry |

### 2.3 Post-trade facts (hindsight — labeled as such, never used to grade the entry)

- **MFE / MAE** in %, ATR units, and R when available.
- **Capture ratio**: realized P&L ÷ MFE (how much of the available move the
  management kept).
- **Exit-to-peak lag**: minutes between the trade's MFE bar and the exit.

These live in `postTrade` per §6.9 and feed management findings, not entry
findings (guardrail: *"post-entry data cannot rewrite what was knowable at
entry"*).

### 2.4 Classification

Deterministic mapping onto the §6.9 enum (`developing`, `still-valid`,
`weakening`, `move-mature`, `valid-stock-late-entry`,
`valid-setup-poor-execution`, `good-entry-poor-management`,
`cannot-determine`) from the at-entry facts plus execution facts, with a
confidence score and `missingContext[]`. Thresholds are `{calibrate}`
constants in the REVIEW_ENGINE_SPEC style:

| Constant | Starting value | Calibrated v1 (2026-07-21) | Used by |
| --- | --- | --- | --- |
| Extension threshold | entry > `2.0` ATR above last decision point | `2.0` (confirmed best single cut) | late-entry classification |
| Mature-extension threshold | — | `1.0` ATR (joint sweep: stale moves die at far lower extension) | move-mature |
| Staleness threshold | `30` min past HOD with no new high | `25` min (separation peak) | weakening / move-mature |
| Capture-poor ratio | `0.25` | `0.01` (median capture on ≥1 ATR moves was 0.16 — flag only round-trips) | good-entry-poor-management |
| Volume windows | last `5` min vs prior `15` min | unchanged | volumeState |
| VWAP "at" band | `±0.25` ATR | unchanged | vwapRelationship |
| Failed-attempt definition | trade above prior HOD, close below within `2` bars | unchanged | failedAttemptCount |
| Min bars before classifying | `15` bars post-open | unchanged | confidence gate |

Calibration evidence: `scripts/opportunity-context-calibrate.mts` →
`data/opportunity-context/calibration-v1.json` (4,913 usable trades; corpus
and conditioning gaps recorded in the file per the versioning rule below).

**Calibration is versioned and re-runnable (decided 2026-07-21).** Each
calibration run records its constants, run date, corpus size, and known
conditioning gaps (v1: *not conditioned on market context* — scanner/
opportunity-set capture is forward-only, so the historical corpus can never
gain it). Do **not** wait for market-context data to calibrate: context
governs selection/participation (a session-level module), while these
thresholds govern within-stock entry timing, and the backfill corpus is the
only large sample that will ever exist. When context-tagged days accumulate,
re-run with market grade as a stratification dimension and compare versions
rather than overwriting.

## 3. Why this improves the coach (the improvement hypothesis)

### 3.1 New claim classes the coach cannot make today

Today's engine sees only the trader's own fills, so every finding is
*outcome-shaped* ("NVCT was the session's clearest red mark"). With entry
context, the same trade produces *decision-shaped* evidence:

> Before: "NVCT −$412, worst trade of the day."
>
> After: "NVCT −$412 — entered 2.8 ATR above the last consolidation, 38 minutes
> after the high of day, third failed break attempt, volume declining. The move
> was mature before you clicked."

The second version is coachable: it names the controllable behavior (chasing a
mature move) rather than the uncontrollable outcome.

### 3.2 Upgrades to existing engine outputs

- **Surprise ranking** (`reviewEngine.buildSurprises`): `post-peak-giveback`
  and `window-earned-more-than-final` gain a *mechanism*: were the late trades
  losers because the entries were late-in-move? That converts "you gave back
  P&L after 10:30" into "after 10:30 every entry was >2 ATR extended."
- **Worst-trade selection** (day page): can move from worst-by-dollars to
  worst-by-process-proxy — chase distance and adverse adds — which resolves the
  standing critique that a planned 1R stop-out is not a "worst" trade.
- **"Unresolved" items** become specific questions: instead of "explain NVCT,"
  the annotation prompt becomes "NVCT: you entered 38 min past the high — what
  did you see?" This is exactly the `TradeReviewItem` queue reason field from
  schema v2 §2.4.
- **Experiment compiler**: new expiring-experiment templates keyed to entry
  states ("no entries >2 ATR from the last decision point for the rest of the
  session; measure blocked trades and avoided P&L").
- **The interpretation matrix** (PRICE_ACTION_QUALITY_MODEL §Coach
  interpretation contract) becomes partially executable: v1 can distinguish
  "valid stock, late entry" from "entry at a decision point" — the single most
  coach-like distinction — even before full setup-rule evaluation exists.
- **Winner-outside-the-evidence flagging**: a green trade entered extended, on
  declining volume, is surfaced *because* it won — preventing outcome from
  reinforcing bad process. No execution-only engine can do this.

### 3.3 The aggregation payoff (weeks/months)

Once every trade carries at-entry facts, the learning loop gets its first
chart-aware cut: **expectancy by entry state**. "Your entries at/near decision
points run +0.4R; entries >2 ATR extended run −0.6R and are 31% of your
volume" is the kind of finding that changes behavior, and it is pure
deterministic aggregation — no LLM involvement, fully inside the numeric
boundary (STATISTICAL_REVIEW §10).

### 3.4 What stays out of scope for v1

- Full path-quality classification (`chop`/`clean_expansion` etc.) — that is
  the price-action model's Layer 1 and needs threshold calibration against
  real ticker-days first. Anatomy's structure label is the only overlap.
- Setup-rule evaluation (`supported`/`contradicted`) — requires versioned
  playbook rules plus captured intent (schema v2 §2.5, open decision §8.7).
- Market/breadth context — explicitly out of scope per the price-action
  model's product boundary; the scanner/opportunity-set join has its own plan
  ([OPPORTUNITY_SET_CAPTURE_PLAN.md](OPPORTUNITY_SET_CAPTURE_PLAN.md)).

## 4. Data that would make it better (ranked wishlist)

1. **Prior-day candle backfill for traded symbols** — fetch ~14 preceding
   trading days per traded symbol (same Massive endpoint, no schema change).
   Unlocks: true time-of-day **relative volume**, gap context vs prior close,
   prior-day high/low as structural levels. Highest value per unit of work;
   turns `volumeState` from intraday-relative to genuinely comparative.
2. **Trade intent + planned stop at entry** (already open decision §8.7:
   lightweight setup + optional trigger/stop/thesis). Unlocks: distances in R,
   entry-vs-trigger drift, and eventually the full supported/contradicted
   setup read. Without it the coach must keep asking "why did you take this
   trade?" — which is the designed fallback, not a failure.
3. **Scanner/opportunity-set capture** (existing plan doc). Unlocks: "was this
   symbol even in the day's opportunity set when you entered," and the
   participation-alignment read stubbed on the day page ("Coverage
   unavailable").
4. **Float / shares outstanding / catalyst tag** (price-action model lists
   these as optional recorded inputs). Unlocks: participation normalization
   (volume vs float) for low-float names where raw volume misleads.
5. **Tick/L2 data** — explicitly deferred (DATA_MODEL §8.5: 1-min OHLCV +
   executions for v1; tick later). Would sharpen failed-attempt and sweep
   detection; not needed for any v1 claim.

## 5. Build shape

- **Module**: `src/lib/coach/opportunityContext.ts`, pure functions + types,
  tested like `reviewEngine.test.ts` with synthetic candle fixtures (a
  scripted ticker-day: premarket ramp → ignition → pullback → failed breaks →
  fade covers nearly every branch).
- **Assembly**: the server-side review builder calls `getCandles` (which
  already ensures the day is cached) per traded symbol, computes one
  `SessionAnatomy` per ticker-day, then annotates each trade. Output attaches
  to the coach payload as `trades[].opportunityContext` and to the fact pack
  for aggregation; the LLM's numeric boundary is unchanged — it narrates
  pre-computed, evidence-tagged facts.
- **Failure mode**: missing candles → `classification: "cannot-determine"`,
  `missingContext` filled, UI shows partial state. Never infer.
- **Sequencing fit**: this is DATA_MODEL §9 **step 2** (§7.2). The §6.9 type
  is already locked, so this does not block step 1 (contract finalization);
  conversely nothing in this doc changes the contract.
- **Evidence refs**: every emitted fact carries a `candleWindow` evidence ref
  (symbol, timeframe, from/to) so the UI can open the exact interval behind
  any coach claim, per the price-action model's inspectability requirement.

## 6. Open questions

1. **Short-side symmetry** — **DECIDED 2026-07-21: long-only for v1.** The
   owner trades long; shorts are rare. Do not build LOD mirroring now. Short
   trades emit `classification: "cannot-determine"` with
   `missingContext: ["short-side metrics not implemented"]` — honest partial
   state, no wrong-framing math. The §6.9 field names stay side-neutral
   (`timeSinceCurrentHigh` etc.) so mirroring can be added later without a
   schema change, but it is explicitly out of scope until real short volume
   exists to calibrate against.
2. **Multi-add trades** — **DECIDED 2026-07-21.** Classify at the **first entry
   only**. Additional `atEntry` snapshots are emitted **only for adds that
   average down** (`executionAnalysis` already itemizes adverse adds) — an
   adverse add is treated as a red flag and gets its own context so the coach
   can say what the chart looked like when the trader added into a loser.
   Adding into a *winning* position is a *candidate* positive signal, but the
   calculator must not auto-praise it: pyramiding is only positive when
   execution quality holds, and that judgment stays **manual** — the coach
   surfaces the add and asks; the trader confirms in annotation. Deterministic
   layer reports facts; it does not grade scale-ins.
3. **Confidence formula** — **DECIDED in direction 2026-07-21; formula spec
   below.** First, a disambiguation the product must keep sharp: §6.9
   `confidence` is the **calculator's confidence in its own classification**
   (data sufficiency), *not* the trader's conviction. They are different
   fields with different provenance:

   - **Classification confidence (`provenance: "calculated"`)** — a
     deterministic score, no self-report involved. v1 formula: take the
     **minimum** of four component scores (weakest link, easy to audit):
     - *coverage*: fraction of expected 1-min bars present in the review
       window up to entry (missing candles degrade);
     - *warmup*: bars elapsed since window open at entry ÷ `15` (capped at 1)
       — early entries classify against thin anatomy;
     - *threshold margin*: how decisively the driving metric clears its
       `{calibrate}` threshold (an entry 2.05 ATR extended is borderline; 4.0
       ATR is not) — borderline values cap the score at medium;
     - *intent availability*: only for classifications that require stated
       intent (`valid-setup-poor-execution`); absent intent caps those at
       medium and routes to `needs-clarification` behavior instead.
     Map the min score to low / medium / high buckets. Every component is
     inspectable, so "medium confidence" is always explainable in one line.
   - **Trader conviction (`provenance: "user"`)** — a lightweight manual field
     captured with intent at annotation time (e.g. low/med/high conviction).
     Inherently self-reported; that is acceptable *because* it is labeled as
     such and never mixed into the calculated score. Its coaching value is the
     **conviction–execution gap**: stated high conviction with hesitant sizing
     or no execution, or stated low conviction with max size, is a first-class
     finding the coach should surface ("your conviction was high but you never
     executed — what stopped you?"). Folds into wishlist item 2 (intent
     capture) and the psychology model.
4. **Anatomy caching** — recompute on demand (fast: ≤ ~960 bars/day) or persist
   per ticker-day? Recommend: recompute; persist only if review latency says
   otherwise.
