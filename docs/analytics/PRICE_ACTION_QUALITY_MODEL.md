# Price-Action Quality Model

> Status: working product vocabulary · V6 Studies 01–04 are the current visual
> prototypes
>
> Product question: **How did the stock move, where was it in the move, and did
> volume support the behavior?**

## Product boundary

This model evaluates the price action of the selected stock. It does not score
SPY, QQQ, or broad-market direction. Those charts are already available to the
trader and do not need to be recreated here.

The model also separates **path quality** from named setups. `clean_expansion`
describes how price traveled. A VWAP reclaim, HOD break, dip entry, or EMA rail
is a location, phase, or setup layered onto that path. Keeping these concepts
separate lets the journal describe what happened without pretending that every
recognizable sequence is a new price-action category.

## The three-layer read

Every reviewed window should produce three independent labels. Together they
form a short, human-readable account of the move.

### Layer 1 — Price-action quality: how did price move?

The four core classes form an energy-by-efficiency matrix.

| Quality | Energy | Directional efficiency | What it means |
| --- | --- | --- | --- |
| `chop` | Low | Low | Small range, heavy overlap, repeated reversals, and little net progress |
| `tight_grind` | Low to moderate | High | Controlled progress with relatively small candles, shallow pullbacks, and orderly structure |
| `whippy_expansion` | High | Low to moderate | Large candles and substantial travel, but long wicks, overlap, reversals, or poor net progress |
| `clean_expansion` | High | High | Expanding range converts efficiently into directional progress with limited rejection |

These four are deliberately few. They answer the useful question, “Was this
move actually tradeable?” better than a large vocabulary of visually similar
patterns.

Supporting measurements may include:

- median and percentile-normalized candle range;
- directional efficiency: net progress divided by total path traveled;
- adjacent-candle overlap;
- body-to-range and wick-to-range share;
- reversal count and failed-break frequency;
- pullback depth and recovery time;
- persistence of higher highs/higher lows or lower highs/lower lows;
- repeated crossings of VWAP, EMA 9, or EMA 20.

Classification thresholds must be calibrated against real ticker-day samples.
The V6 thresholds are illustrative vocabulary, not production trading rules.

### Layer 2 — Move phase: where was price in the move?

| Phase | Definition | Typical evidence |
| --- | --- | --- |
| `ignition` | The initial catalyst or discovery move | Range expansion, new participation, consecutive directional closes, fresh session levels |
| `pullback_consolidation` | Price pauses, retraces, or builds a base after expansion | Contracting range, reduced volume, higher low or range hold, declining volatility |
| `continuation_reclaim` | Price resumes the trend or recovers a meaningful level | Volume returns, prior high breaks, VWAP/EMA reclaim holds, HOD test or break |
| `exhaustion_failure` | Participation no longer creates progress or the structure breaks | Climax volume, long rejection wicks, failed breaks, loss of the latest higher low or rail |

Consolidation is a phase, not a fifth quality class. A consolidation can itself
be clean, choppy, or whippy:

- **Clean consolidation:** range and volume contract, price holds structure,
  and overlap remains controlled.
- **Choppy consolidation:** price repeatedly crosses the same levels, overlaps
  heavily, and fails to establish direction.
- **Whippy consolidation:** candles remain wide and volatile, but price makes
  little net progress.

The initial move and later continuation should not be judged identically.
During ignition, EMA rails may not yet be formed; candle structure, rejection,
range, and volume carry more weight. After the first move, VWAP, EMA 9, EMA 20,
the pullback low, and HOD can become meaningful decision points.

### Layer 3 — Participation: did volume support the behavior?

Volume is best treated as evidence of participation, not as a universal “more
is better” score. It may precede acceleration, confirm a move, or warn that
considerable activity is producing very little progress.

| Price and volume behavior | Interpretation |
| --- | --- |
| Range expands, price remains directionally efficient, and volume increases | Sponsored expansion |
| Range and volume contract during a controlled pullback | Healthy consolidation |
| Volume re-expands on a VWAP reclaim, continuation, or HOD break | Confirmed renewed participation |
| Volume surges while price makes little progress or prints rejection wicks | Absorption, churn, or possible exhaustion |
| Volume is low and candles overlap with little range or progress | Dead chop |
| Price makes steady, efficient progress on moderate or declining volume | Tight grind; not automatically weak |

Raw volume is not comparable across the session. The open naturally trades more
volume than midday, and premarket participation is highly catalyst-dependent.
Use time-aware context such as:

- volume relative to the same minute-of-day baseline;
- volume relative to the previous 5 or 20 bars;
- expansion-volume versus pullback-volume ratio;
- dollar volume and, when reliable float data exists, float turnover;
- price progress per unit of volume;
- volume at the scanner alert, ignition, pullback, reclaim, and break.

The most useful question is not simply “Was volume high?” It is:

> How much directional price progress did the stock produce for the volume it
> consumed?

## Structure and location evidence

Market structure and indicator location support the three-layer read; they are
not additional quality categories.

### Trend structure

A single candle-over-candle move is a micro trigger, not proof of a trend. A
stronger trend read combines several observations:

- successive higher highs and higher lows for an uptrend;
- successive lower highs and lower lows for a downtrend;
- rising or falling swing points that persist beyond one candle;
- limited countertrend reversals and shallow, recoverable pullbacks;
- acceptance above or below a broken level rather than a momentary wick;
- pullback volume below expansion volume;
- renewed range or volume when the trend resumes.

### Decision-point location

Record whether price is above, below, testing, losing, or reclaiming:

- VWAP, with the anchor explicitly named;
- EMA 9 and EMA 20, with adequate warmup;
- scanner price;
- previous breakout or pullback level;
- session high of day.

The indicator-event contract and computation rules live in
[Indicator Price-Action Analytics Plan](INDICATOR_PRICE_ACTION_PLAN.md). A line
touch alone never proves that the level held or that the setup was valid.

## Human-readable interpretation

The product should translate the layers into an observation before showing
exact measurements. For example:

> RXT moved from clean initial expansion into tight consolidation, then resumed
> with clean continuation. Pullback volume contracted 46%, price held above
> VWAP, and volume expanded 1.8× on the HOD break.

Other useful reads:

- **Whippy expansion:** “The stock moved 38%, but wide candles and long wicks
  converted only 24% of its travel into directional progress.”
- **Dead chop:** “Participation faded after the alert; candles overlapped 72%
  and price made no sustained break from the range.”
- **Volume without progress:** “Volume reached a session high at HOD, but price
  failed to advance and closed back inside the prior range.”
- **Tight grind:** “Price advanced steadily above EMA 9 on moderate volume with
  shallow pullbacks and persistent higher lows.”

The interpretation must remain descriptive until Justin authors and versions
the setup rules. The system may say what the candles did; it should not grade a
VWAP curl, dip, or HOD setup from generic thresholds.

## Visualization contract

Analytical job: **time change plus phase classification**. The primary artifact
is an annotated price-action timeline, not another equal-weight dashboard or
scatter-plot collection.

### Primary view

1. One-minute price candles or a price line remain the audit surface.
2. Relative volume is aligned directly below price on the same time scale.
3. A compact band labels the active quality over time: chop, tight grind,
   whippy expansion, or clean expansion.
4. A second band or direct annotations mark ignition, consolidation,
   continuation/reclaim, and exhaustion/failure.
5. VWAP, EMA, HOD, scanner, entry, and exit events appear only when they help
   explain a decision point.
6. The human-readable observation and essential values remain visible; hover or
   focus supplies exact candle, price, range, volume, and calculation details.

### Interaction

- Selecting a ticker or time window updates price, volume, phase, and quality
  together.
- Hovering or focusing a phase shows the inputs that produced its label.
- Selecting a phase pins its explanation and highlights associated trades.
- Entries and exits can be compared with the active phase, quality, volume
  state, and nearest indicator event.
- A data-definition panel exposes recorded inputs, derived facts, thresholds,
  session convention, and calculation version.

Desktop is the primary review surface. A compact event ledger is the fallback
when the full aligned timeline is unavailable or too narrow.

### Visual encoding

- Keep candles and text neutral so the classification layer is the focal cue.
- Use distinct, redundant labels for quality; do not rely on red/green alone.
- Reserve a separate selected/focused state from quality and alert colors.
- Direct-label phases and events; avoid a detached legend when space allows.
- Treat missing, partial, or low-confidence classifications visibly rather than
  assigning a confident default.

## Data contract

### Recorded inputs

- one-minute OHLCV with session and timezone;
- scanner timestamp, scanner price, and candidate identifier;
- session HOD and time of HOD;
- executions and trade grouping;
- optional float, catalyst, and reliable reference-volume data.

### Derived facts

- candle range, body share, wick share, and adjacent overlap;
- directional efficiency and price progress per volume;
- swing structure, COC sequences, pullback depth, and recovery time;
- time-normalized relative volume and expansion/pullback ratios;
- VWAP and EMA position plus versioned rail events;
- quality, phase, participation state, confidence, and reason codes.

Suggested conceptual output:

```ts
type PriceActionRead = {
  quality: "chop" | "tight_grind" | "whippy_expansion" | "clean_expansion";
  phase:
    | "ignition"
    | "pullback_consolidation"
    | "continuation_reclaim"
    | "exhaustion_failure";
  participation:
    | "expanding"
    | "contracting"
    | "steady"
    | "climax_without_progress";
  structure: "hh_hl" | "lh_ll" | "compression" | "range" | "transitioning";
  location: {
    vwap: "above" | "below" | "testing" | "reclaiming" | "unavailable";
    ema9: "above" | "below" | "testing" | "reclaiming" | "unavailable";
    ema20: "above" | "below" | "testing" | "reclaiming" | "unavailable";
    hod: "below" | "testing" | "breaking" | "failed_break";
  };
  confidence: number;
  reasonCodes: string[];
  calculationVersion: string;
};
```

## Review scopes

- **Trade:** show the exact phases traversed while the trader was in the
  position, plus entry/exit location, MAE, MFE, and capture.
- **Ticker-day:** describe the first move, consolidation, strongest
  continuation, HOD behavior, and whether the trader participated.
- **Day:** summarize how many leading candidates offered clean versus whippy or
  choppy paths; do not collapse them into a single market-direction score.
- **Week/month:** compare expectancy and participation by quality, phase, and
  entry location only when the sample size is visible and sufficient.

## Coach interpretation contract

The price-action model should feed the coach as deterministic chart evidence.
It does not replace the trader's stated reason or the playbook, and it should
not let the language model invent a setup from a chart that happens to resemble
one.

The coach evaluation has four distinct inputs:

1. **Chart observation:** what was knowable at entry—quality, phase,
   participation, structure, location, confidence, and reason codes.
2. **Trader intent:** the setup and reason the trader says they were acting on.
   This remains manual source-of-truth data; an inferred reason must be labeled
   as inferred.
3. **Versioned playbook rule:** the required conditions, trigger,
   invalidation, and disqualifiers for that setup.
4. **Execution and outcome:** where the trader entered, sized, managed risk,
   and exited; P&L, MAE, and MFE remain separate outcome evidence.

The deterministic layer answers **what the chart did**. Versioned setup rules
answer **whether that evidence supported the stated trade**. The coach then
explains the relationship in trader language.

### Evaluation sequence

For each trade:

1. Freeze the evidence window at the entry timestamp.
2. Retrieve the trader's stated setup and reason.
3. Compare the active price-action read with the exact version of that setup's
   required and disqualifying conditions.
4. Return `supported`, `contradicted`, `insufficient_evidence`,
   `needs_clarification`, or `off_playbook` for the setup read.
5. Evaluate execution separately: decision-point entry, chase/extension,
   structural invalidation, size, and management.
6. Add post-entry MAE, MFE, capture, and P&L only after the process evaluation
   has been formed.

If no setup or reason was recorded, the coach should ask **“Why did you take
this trade?”** rather than silently assigning intent. If the stock was outside
the scanner/opportunity set or the evidence contradicted the playbook, that
becomes a review flag and requires an explanation from the trader.

### Interpretation matrix

| Setup evidence | Execution | Outcome | Coach interpretation |
| --- | --- | --- | --- |
| Supported | Good | Win or loss | The trader read the chart and executed a valid scenario; judge management separately |
| Supported | Poor | Win or loss | Valid stock/setup, but late, extended, oversized, or poorly managed execution |
| Contradicted | Good mechanics | Win | Weak process with a positive outcome; do not reinforce the trade merely because it paid |
| Contradicted | Poor | Loss | The chart did not support the stated reason and execution added avoidable risk |
| Insufficient | Unknown | Any | State what data is missing and do not manufacture a grade |
| Missing intent | Unknown | Any | Ask why the trade was taken before deciding whether it matched the system |

### Example coach reads

- **Good chart read, good execution:** “You entered during clean continuation
  after the pullback volume contracted, the higher low held, and participation
  returned on the VWAP reclaim. The evidence supported your stated setup at the
  time you clicked.”
- **Right idea, late execution:** “The reclaim was valid, but your entry came
  after two expansion candles and 3.1% above the decision point. The setup was
  present; the execution changed the risk.”
- **Winner outside the evidence:** “This trade made money, but at entry price
  was in whippy consolidation, volume was producing little progress, and no
  support level had held. The outcome should not validate the decision.”
- **Reason missing:** “The chart shows a low-efficiency range with declining
  participation. What specific setup or level were you acting on?”

The coach surface should show the plain-language conclusion first, followed by
the supporting chart interval and rule references. Exact measurements and
thresholds belong in the inspectable data view. Every coach claim must retain
evidence references, calculation version, playbook version, and confidence.

## Guardrails

- A large final percentage does not imply clean or tradeable price action.
- High volume does not automatically imply strength.
- Low volume does not automatically invalidate an orderly tight grind.
- Hindsight HOD and final path quality must not rewrite the prospective scanner
  rank or what was knowable at entry.
- Quality can change within one ticker-day; do not assign one permanent label
  when the path transitions.
- Missing premarket history, indicator warmup, or comparative volume baselines
  must produce partial/unavailable states.
- Classifications explain evidence. Versioned playbook rules determine whether
  a specific setup was valid.
- The coach must not infer trader intent when a reason is missing.
- Post-entry price action, HOD, P&L, MAE, and MFE cannot be used to rewrite what
  was knowable at entry.

## Next prototype pass

Refine V6 around this model rather than adding market-context panels:

1. segment one ticker-day into quality and phase intervals;
2. align relative volume with the price time scale;
3. explain each interval with visible evidence and inspectable calculations;
4. show how entries and exits relate to the active interval;
5. validate the vocabulary against clean, tight, whippy, and choppy real-world
   examples before fixing production thresholds.
