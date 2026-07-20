# Indicator Price-Action Analytics Plan

> Status: captured for implementation · V6 Study 04 is the vocabulary prototype
>
> Product question: **Did price respect the 9 EMA, 20 EMA, or VWAP—and did the
> trader enter at the decision point?**

This indicator-event plan is one evidence layer inside the broader
[Price-Action Quality Model](PRICE_ACTION_QUALITY_MODEL.md), which defines path
quality, move phase, volume participation, and their visual treatment.

## Why this belongs in the product

The lines alone are not the analysis. The useful evidence is how price behaved
at them and where the trader acted relative to that behavior. This module should
support both visual trade review and later coaching rules for:

- holding the 9 EMA or 20 EMA during a trend;
- buying a controlled dip into a rising EMA rail;
- losing, curling toward, and reclaiming VWAP;
- distinguishing a confirmed reclaim from a momentary cross;
- comparing entries near support with entries made after price was extended.

Primary artifact family: an **indicator-event sequence** paired with the exact
candle chart. The sequence provides the readable answer; the candle chart is the
audit surface. Do not add three more undifferentiated indicator lines to a dense
dashboard and call that insight.

## Data and computation

One-minute OHLCV candles are enough to compute intraday EMA 9, EMA 20, and VWAP.
Executions are required to evaluate whether an entry used the level well.

Compute the indicator series once in shared application code. The same values
must feed:

1. chart overlays;
2. event detection;
3. trade-entry facts;
4. daily coach facts;
5. weekly/monthly expectancy studies.

Never recalculate a visually convenient approximation inside an individual
component. Record the calculation version and session convention with derived
facts so old recaps remain explainable.

### Session conventions to lock

- EMA source: one-minute close, with sufficient earlier candles for warmup.
- EMA warmup: extended-hours candles may warm the series, but the UI must show
  whether extended hours are included so it can match the trader's chart.
- VWAP source: cumulative typical price `(high + low + close) / 3`, weighted by
  volume.
- VWAP anchors: retain an extended-session VWAP beginning at 04:00 ET and a
  regular-session VWAP beginning at 09:30 ET when both are useful. Every visual
  and coach statement must name the active anchor.
- Missing bars or insufficient warmup produce an unavailable/partial state, not
  an invented value.

## Event vocabulary

These are measurable event families, not final trading rules. User-authored
thresholds should replace the provisional values after the playbook is defined.

| Event | Computable evidence | Provisional interpretation |
| --- | --- | --- |
| `rail_test` | Candle range reaches a configurable tolerance around EMA 9, EMA 20, or VWAP | Price interacted with the level; no success implied |
| `rail_hold` | Test occurs, candle closes on the trend side, and a following candle confirms | The level acted as support/resistance |
| `rail_loss` | Candle closes through the level after previously closing on the trend side | The prior rail failed |
| `rail_reclaim` | Price previously closed through the level, then closes back across it | Candidate reclaim; confirmation remains separate |
| `confirmed_reclaim` | Reclaim plus configurable consecutive closes, time, or volume confirmation | The role flip persisted |
| `bull_stack` | Price above EMA 9, EMA 9 above EMA 20, and price above the selected VWAP | Trend alignment, not an entry by itself |
| `bear_stack` | Mirrored condition | Weak/short-side alignment |
| `curl_candidate` | EMA slope turns up while price compresses toward a named level | Candidate only until Justin authors the curl definition |
| `extension` | Entry distance from EMA 9, EMA 20, and VWAP | Measures whether an entry bought support or chased away from it |

The V6 prototype currently demonstrates `rail_hold`, `rail_loss`, `rail_reclaim`,
and `bull_stack`. Its 0.35% test tolerance is illustrative, not a production
trading rule.

## Trade join

At every entry and exit, preserve or derive:

- active EMA 9, EMA 20, and named VWAP values;
- price distance from each line in dollars, percent, and risk units;
- EMA 9/20 order and slope;
- whether the most recent event was a hold, loss, or reclaim;
- elapsed candles/time since that event;
- confirmation state at entry;
- pullback depth, pullback candle count, and pullback-volume change;
- subsequent MAE, MFE, realized result, hold time, and MFE capture.

This enables questions such as:

- Did 9 EMA dip entries outperform extended entries?
- Was the 20 EMA a useful deeper support, or did it usually signal trend decay?
- Did confirmed VWAP reclaims perform differently from first-touch crosses?
- How much adverse excursion was normal after a valid rail entry?
- Did the trader stop out during normal “breathing” before the setup failed?

## Scope and presentation

- **Trade:** exact candle chart + event sequence + entries/exits + MAE/MFE.
- **Day:** strongest/weakest rail-based entry facts and off-rule examples.
- **Week:** small sample summary with explicit `n`; no verdict when evidence is
  thin.
- **Month:** expectancy, win/loss size, MAE/MFE, and capture by setup/event type.

Keep the default review explanatory: one sentence, the event sequence, and the
selected evidence. Put exact candles and calculation definitions one level
deeper. Essential values must remain visible without hover; hover/focus may add
the candle time, line value, distance, volume, and linked trade.

## Interaction contract

- Selecting a ticker updates the candle view and event sequence together.
- Hovering or focusing an event reveals its time, rail value, close distance,
  volume context, and confirmation evidence.
- Selecting an event pins the explanation and highlights linked trades.
- Selecting a trade highlights the nearest prior indicator event and shows entry
  distance from all three rails.
- A rule editor can later change tolerances and confirmation requirements, but
  saved reviews must retain the rule version used at generation time.

## Delivery sequence

1. Move EMA/VWAP computation from preview code into a tested shared indicator
   module.
2. Lock extended-hours and VWAP-anchor conventions against the trader's chart.
3. Define typed event output and unit-test hold/loss/reclaim boundary cases.
4. Join events to executions and expose entry-distance facts.
5. Replace V6 illustrative candidates with real cached ticker-day candles.
6. Add trade/day review surfaces, then aggregate only after enough samples exist.
7. Author the exact curl, dip-entry, confirmation, and invalidation rules before
   enabling coach grading.

## Acceptance criteria

- The displayed lines, event labels, and coach facts use the same computed
  series and version.
- Every VWAP value identifies its anchor.
- Early or incomplete indicators are labeled partial/unavailable.
- A line touch is never mislabeled as a successful hold without confirmation.
- A reclaim is distinguishable from a confirmed reclaim.
- Entries can be inspected relative to all three rails and linked back to the
  exact candles.
- Weekly/monthly comparisons show sample size and do not infer causation from a
  small cohort.
- User-authored setup rules remain configurable and versioned.
