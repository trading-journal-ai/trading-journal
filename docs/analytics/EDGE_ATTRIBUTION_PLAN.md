# Edge Attribution — expectancy by trade characteristic

> Status: scoped 2026-07-21 (owner conversation) · not yet built
>
> Product question: **"Under which conditions do my trades make money?"**
> Condition every trade on at-entry / management characteristics, then compare
> expectancy across buckets. Winner/loser contrasts fall out as a byproduct —
> never split by outcome first (hindsight bias); condition by feature first.
>
> This is the successor to the calibration run's entry-state read
> ([OPPORTUNITY_CONTEXT_CALCULATOR.md](OPPORTUNITY_CONTEXT_CALCULATOR.md) §3.3)
> and implements [STATISTICAL_REVIEW.md](STATISTICAL_REVIEW.md) §4. The
> anatomy is the feature factory; the batch/calibrate scripts are the
> reporting pipeline; the 654 chart-complete ticker-days are the corpus.

## Features — computable now, retroactively (no annotation)

| Feature | Definition | Notes |
| --- | --- | --- |
| Entry state | extension ATR × staleness (already shipped) | calibrated v1 |
| **EMA rail** | entry distance from causal EMA9/EMA20 at entry (at-rail / extended / below) | add EMA series to `sessionAnatomy`; named setup vocabulary (FYL "EMA rail") |
| **Frontside / backside** | swing structure (hh_hl vs lh_ll) + position vs session high; full FYL definition also wants the daily 200 EMA (one daily-bars fetch per symbol) | the cardinal-sin measurement: expectancy of backside buying in the owner's own numbers |
| **Averaging down** | `executionAnalysis.averagedDown`, adverse-add count, max adverse-add % | already captured per trade |
| **Loss magnitude vs mental stops** | per-share loss = pnl ÷ shares; bucket at 10¢ / 20¢ / beyond | "did you let it become bigger" from fills alone |
| **MAE-derived stop placement** | how far offside winners went before working vs where losers ended | empirically answers *where stops should be* — the most interesting single report |
| Volume state / failed breaks / VWAP at entry | already in opportunity context | |
| Time-of-day / price band / hold time | already in fact-pack segments | |

## Owner's mental-stop model (stated 2026-07-21 — use as calibration, not guesses)

- **Structural stop:** break of the previous candle's low. Computable at
  entry: `naturalStopDistance = entry − prior 1-min bar low`.
- **Band stop:** 10–20¢ per share. **Anything beyond 20¢ is "holding and
  hoping"** — the owner's own definition of a broken loss.
- **The breathing problem:** stocks wiggle (ATR); a band stop inside the
  stock's normal per-minute range gets shaken or widened ("you try to make
  it work"). Measure the tension as `stopBand ÷ ATR` per trade.

Derived deterministic checks (no annotation needed):

1. **Born-as-hold-and-hope flag:** `naturalStopDistance > 20¢` at entry —
   structure and band rule conflicted before the first tick against you.
2. **Loss buckets by the owner's bands:** ≤10¢ / 10–20¢ / >20¢ per share;
   report share of total losing dollars in the >20¢ bucket.
3. **Breathing conflict:** entries where ATR ≥ the intended band (using
   10–20¢ as default band until per-trade stops are captured) — days when
   discipline was fighting physics, not emotion.

## Features that require annotation (forward capture)

| Feature | Why the machine can't | Capture |
| --- | --- | --- |
| Planned stop distance (% or ¢) | intent isn't in fills — historical R coverage is 0% | intent+stop field (opportunity-context wishlist #2) |
| Setup identity (which playbook trade was this?) | stated reason, not inferable | setup tag at annotation |
| Stop *broken* vs stop *absent* | needs the plan to compare against | same |
| Conviction | self-reported by design | conviction field (decided 2026-07-21) |

**Division of labor (owner-confirmed):** the machine measures everything that
*happened* — entries vs the chart, adds, loss sizes, MAE/MFE; annotations
convert facts into verdicts ("loss exceeded 20¢" → "you broke your stop").
Annotations add intent, not measurement.

## Build shape (next session-sized)

1. Extend `sessionAnatomy` with causal EMA9/EMA20 and a frontside/backside
   label; optional daily-bars fetch for the 200 EMA regime gauge.
2. Extend `opportunityContext.atEntry` with `emaRelationship` and
   `trendSide`.
3. Batch-run over the corpus; report expectancy per feature bucket (same
   format as calibration-v1); add the loss-magnitude and MAE-stop reports.
4. Feed the strongest findings into the coach payload as new deterministic
   findings ("backside entries are 22% of volume and run −$X/trade") and,
   later, experiment templates keyed to them — which also breaks the
   "pause that ticker" monoculture in the experiment compiler.
