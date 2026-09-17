# Market Context — Master Research and Implementation Plan

> Updated: September 16, 2026 · Status: bounded audit and raw-feature pilot executed; scoring remains unimplemented and uncalibrated
>
> Product owner: Justin · Shared data and derivation: Trading Server · Review and personal-trade comparison: Trading Journal

## 1. Decision and purpose

Build an explainable, post-mortem view of the small-cap momentum opportunity
available during a session. Use it when studying charts and reviewing whether
participation, share size and risk matched conditions.

The visible result is **Red · Cold**, **Yellow · Selective**, or **Green · Hot**,
plus one short explanation. Use a text label with the color. No dial or gauge.
Unavailable evidence is a coverage state, never a red market classification.

We have enough direction to begin a bounded data audit and research prototype.
The strategy's +50% minimum for heat is defined below. We do **not** yet have
validated weights, yellow/green thresholds, opportunity-episode rules, or evidence
that the necessary inputs have consistent historical coverage.
This document records the plan before execution; it does not authorize a new
collector, paid data acquisition, production scoring change or schema migration.

### Agreed direction

- Analyze completed sessions; no live trading-day latency requirement.
- Use our five-pillar framework, top gainers and underlying chart data.
- Include the size and breadth of +50%, +100% and +200% moves.
- **Cold-market definition:** for completed-day context, adequately verified
  absence of eligible +50% movers means Red · Cold for this strategy. A day with
  only +10–49% movers meets that definition. Smaller moves do not need to be
  hydrated to establish heat; collecting them is optional comparison research.
- Reaching +50% is necessary evidence for a warmer classification, not sufficient
  evidence of good opportunities. Breadth, follow-through and repeat opportunities
  distinguish selective/hot conditions and can still reveal a cold, poor-quality day.
- Study whether 1–5-minute windows provided meaningful range with directional
  progress, or were choppy; count repeated opportunities only after validation.
- Keep DTS's small-cap meter as an independent cross-reference. Its formula,
  historical availability and any previous-day contribution remain unverified.
- Keep personal trading outcomes out of the market score. Compare trades with
  the independently derived context afterward.
- Start with three understandable classes. A numerical score or percentile is
  optional later; it is not a probability of profitable trading.

### Relationship to earlier work

This is the current planning home for the thermometer/classification project.
It refines the earlier [Market Context Model](../product/JOURNAL_COMPARE_INDICATORS_KEY_MOMENTS.md#market-context-model)
and [opportunity-set capture plan](OPPORTUNITY_SET_CAPTURE_PLAN.md), preserving
their separation of small-cap opportunity, broad-market pressure and trader
participation. The earlier G0–G4 descriptions remain research vocabulary; they
are not a second production classification or an approved mapping to three colors.

The current Journal heat label counts large movers. Treat it as a baseline to
compare, not as a validated measure of tradeability. Leave it unchanged until
the replacement passes the acceptance criteria below.

## 2. What we will measure

Keep three primary research dimensions visible before trying to combine them.

| Dimension | Initial measures | Why it matters | Main limitation |
| --- | --- | --- | --- |
| Momentum breadth and magnitude | Distinct symbols in non-overlapping gain bands; qualifying share of the observed universe when the denominator is trustworthy | Separates an isolated runner from broad activity | Discovery gaps and outliers can distort the apparent market |
| Short-term tradeability | Range in cents and percent, directional progress, candle overlap and volume over 1/3/5 minutes | Separates large daily gains from useful short-term movement | OHLCV cannot establish fills, spread or within-minute price sequence |
| Persistence and repeat opportunity | Share of usable windows, activity across session blocks, distinct candidate episodes per symbol | Distinguishes a brief spike from sustained or recurring opportunity | Episode boundaries and tradeability thresholds need chart review |

Five-pillar facts describe candidate quality alongside these dimensions. Evaluate
their added value rather than awarding a fixed five-point total:

| Pillar | Research treatment |
| --- | --- |
| Price | Preserve price in dollars; compare price cohorts. The earlier $1–$20 preference is a profile, not a new archive exclusion. |
| Float | Use dated, source-attributed float when available. A current float is not a historical float. Unknown remains unknown. |
| Relative volume | Preserve the exact baseline, session and observation cutoff. Completed-session RVOL is not an entry-time observation. |
| Daily percentage change | Count this once in the breadth/magnitude dimension, rather than again as an independent pillar bonus. |
| Catalyst | Distinguish publication timing, source coverage and lookup failure. Existing No news UI means no matching saved item, not proof of no catalyst. |

Guardrails: candidate-discovery coverage and usable-minute coverage. Keep both
separate from the score; an otherwise impressive result may still be withheld
when its population or price history is insufficient.

## 3. Current evidence and gaps

This table began as a source/code review. The bounded execution checkpoint below
now verifies installed revisions and sampled data availability; it does not
certify every historical session or fill the remaining discovery gaps.

| Input | Evidence currently available | Remaining verification |
| --- | --- | --- |
| Movers and previous close | Server archive exposes full-day/session price and gain evidence with Core eligibility rules | Date/source consistency; valid close basis; comparable discovery population |
| Minute OHLCV | Server has historical minute data and selected-candidate minute recovery | Which symbol-dates and sessions are complete; gaps, halts and invalid bars |
| Volume and RVOL | Archive includes session volume and session-relative-volume evidence | Baseline sufficiency, definitions across sources, and time-local availability |
| Scanner observations | DTS row capture and Server session summaries preserve observed candidates and timestamps | Scanner uptime and discovery gaps; repeated alerts are not new opportunities |
| News | Server stores attributed news events; Journal reads date-filtered saved headlines | Broad collection is disabled; saved absence is not a completed historical provider search |
| Float | Current provider enrichment exists in the Server research path | No verified systematic point-in-time float history in the archive |
| DTS meter | User has shown the visible meter; current bridge does not capture its value | Inspect live DOM/API accessibility, sampling times and retained history; formula is unknown |
| Trades, shares and fees | Journal owns account-scoped execution and realized-activity records | Risk-at-entry requires a contemporaneous stop/plan; do not invent it from later prices |

**Strategy scope:** the current recent-candidate acquisition's >=50% focus fits
the agreed large-mover heat definition. Missing systematic +10–49% history does
not block this project. We are describing conditions for Justin's large-mover
strategy, not every possible small-cap trading style.

**Coverage gap:** an empty archive is not enough to establish that there were no
+50% movers. First verify the relevant discovery coverage and resolve candidate
price/eligibility evidence. Confirmed zero qualifiers means Cold; incomplete
discovery or unresolved potential qualifiers means unavailable. These are separate
issues from whether smaller moves are worthwhile for this strategy.

Do not silently substitute current identity/float/news facts for what was known
on an older date. Preserve publication time, observation time and source version.

Two additional audits matter before using enrichment in a score: recovered RVOL
baselines can represent absent baseline-date activity as zero, so verify that
absence is not missing evidence; the current ticker-news provider path can mask
fetch failure as an empty response. Require explicit success, requested period
and coverage metadata for historical news research. A successful saved-event
read establishes only what the archive contains.

## 4. Universe, gain and time definitions

### Population

Reuse the Server-owned Core security, price, split and evidence safeguards:
common shares and common-stock ADRs, including positive sub-dollar prior closes.
Use the >=50% mover population as the initial heat universe, with consistent
discovery and validation. Keep universe/threshold versions explicit. Optional
+10–49% comparisons need their own defined population, but are not required for
v1. Do not restore the old ADR or mandatory $1 exclusions through a new rule.

Specify and version the research universe separately. Compare the broad eligible
population with the preferred price/float cohort when coverage permits. Do not
call the whole set small-cap based solely on share price; mark unavailable size
or float classification explicitly. Include failed/choppy >=50% movers and
adequately covered zero-qualifier days, so research is not limited to successful
runners. Lower-gain chart comparisons are optional.

### Magnitude

Gain is 100 × (eligible high / valid prior regular close − 1), following Server's
accepted price/split policy. For full-day research, count each symbol once in:

- 50% ≤ gain < 100%.
- 100% ≤ gain < 200%.
- gain ≥ 200%.

Keep 10–49% candidates and observed nonqualifiers as optional comparison groups
where already captured; no new lower-gainer hydration is required. Report counts
separately from candidate-quality and short-term scores. Inspect extreme names
individually and cap their influence
only through a documented, calibrated rule. A single runner does not automatically
make the session green.

### Sessions and hindsight

Use the Server trading calendar and ET session boundaries, including early
closes. Analyze premarket, regular hours and after-hours separately. Within
regular hours, compare equivalent elapsed-time blocks rather than conflating
the opening burst with midday. Exact block lengths are a research choice.

The Archive's session toggle selects where the **full-day high** occurred.
Do not use that filtered row list as the population for session research.
Analyze relevant bars for every eligible observed name in each session, including
after-hours opportunities in stocks that made their overall high earlier.

The +50% definition uses the valid prior regular close. It does not require a
fresh +50% gain during every session or 1–5-minute window. For an as-of reading,
candidate eligibility may use only highs reached by that cutoff; evaluate the
current window's activity separately. Earlier large moves do not guarantee later
opportunity, and later large moves cannot warm earlier readings. Finalize the
session-level gate/aggregation in the prototype; the agreed completed-day floor
does not imply that every minute of a cold day was untradeable.

Preserve two distinct outputs:

1. **Completed-window conditions:** descriptive use of the entire finished
   window, including its eventual high and later follow-through.
2. **Context as of a trade:** inputs and candidate eligibility available only
   through that trade's timestamp. Later bars may evaluate outcomes but cannot
   alter what the trader could have known.

Even though computation happens after close, final-day winner selection must
not leak into an alleged morning opportunity set. Without historical discovery
evidence, label the study retrospective and do not make stock-selection verdicts.
Store previous-session conditions as a separate potential carryover feature;
test its contribution rather than assuming that DTS uses it or choosing a decay
weight now. A weekly view should show the distribution/timeline of sessions,
not blindly average color labels.

## 5. Proposed minute-chart features

These are candidate definitions for testing, not established setup detectors.
Use contiguous eligible one-minute bars. Do not bridge missing intervals,
overnight gaps, session boundaries or halts to create apparently clean movement.
Distinguish missing bars from verified zero-activity periods; do not fill gaps
with invented candles. Zero denominators yield unavailable features.

For a window, let H be its highest high, L its lowest low, O its first open,
and C its final close. Use 1-, 3- and 5-minute windows:

| Feature | Proposed calculation | Interpretation and limit |
| --- | --- | --- |
| Range | H − L in dollars; 100 × (H − L) / O in percent | Potential movement, not a realizable profit |
| Signed progress | C − O and its percentage | Retain direction; an efficient selloff is not long-side opportunity |
| Candle body share | abs(close − open) / (high − low) for each minute | Endpoint placement only; cannot reveal the path inside the candle |
| Close-path efficiency | abs(c_n − c_0) / sum over i=1…n of abs(c_i − c_(i−1)) | c_0 is the immediately preceding minute close; c_1…c_n are the n window closes, n=3 or 5. One close-to-close step is trivially efficient, not a 1-minute quality measure. |
| Adjacent overlap | Intersection of two adjacent high-low ranges divided by their smaller positive range | Repeated overlap is a candidate chop signal, not a standalone verdict |
| Reversals | Sign changes among nonzero consecutive close changes | Report observation count; a short sequence is weak evidence |
| Participation | Window share volume and consistently defined dollar-volume proxy; time-matched RVOL only if baseline exists | No inference about spread, depth or execution quality from volume alone |

Select a small useful subset after comparison; these measures are correlated.
For close-path efficiency, c_0 must belong to the same uninterrupted session;
mark efficiency unavailable if this extra observation crosses a gap, halt or
session boundary. Other valid window features remain available. The ratio is
prior-close-inclusive: a gap into a flat window can produce high efficiency
with zero signed progress. A zero path denominator is unavailable, not perfectly efficient.
Show cents and percent together so high-percentage moves in low-price stocks
are not automatically treated as usable dollar range. "Big enough" must be
calibrated by price cohort and plausible trading costs. Without quotes, spread
and slippage are unknown; cost assumptions belong in sensitivity scenarios,
never in claims of measured execution quality.

One-minute bars support minute range/body measures and multi-minute close paths.
They do not reconstruct the order of an intraminute high and low. Do not report
precise setup entries, achievable profits or intraminute chop from those bars.

### Repeated opportunity episodes

First mark candidate directional windows with meaningful range and supporting
participation. Merge overlapping/adjacent windows from the same move, including
matches found at multiple horizons. Require a distinct reset or pullback and a
new qualifying advance before counting another episode. Record start/end,
direction, range, retracement and the rule that separated it from the prior one.

Minimum range, retracement, separation and volume requirements remain unset.
Review chart-marked examples of clean continuation, multiple advances, chop,
one-bar spikes, halts and fades with Justin. Call them **candidate episodes**
until that review supports a stable definition. Raw rolling-window hits or
scanner alerts must never be reported as a count of good trades.

### First qualitative review: scope and tradeability

The first spoken chart review is preserved privately alongside the pilot, with
original remarks, source hashes, case mappings and mapping uncertainty. It is
rubric evidence, not a completed set of window labels or a calibration dataset.
Some positive comments describe movement before or after the highlighted window;
one general setup-visibility comment has no reliable case assignment.

Separate these judgments in the next review:

| Judgment | What to record |
| --- | --- |
| Highlighted window | Would this specific interval offer a usable long-side opportunity, or is the verdict unclear? |
| Surrounding move | Was another nearby advance or pullback tradable? Record its interval separately when identifiable. |
| Structure and direction | Clean advance, pullback/continuation, chop, fade or backside; leave unobserved setup details unknown. |
| Price-profile fit | Suitability of the relevant trading price for Justin's strategy, separate from chart structure and Core archive membership. |
| Evidence visibility | Is enough preceding context, setup/entry information and price evidence visible to make the judgment? |

Efficient downward motion and large sell-off candles are not positive long-side
opportunity evidence. Conversely, appealing candle structure can occur outside
the desired price profile. A rejected highlighted interval does not prove the
symbol offered no opportunity elsewhere in the session.

Price-profile decisions must use the price around a reviewed opportunity, not
the prior-close cohort used to diversify the initial sample. Confirm the exact
band and treatment of boundary crossings before making it a scoring gate. This
review does not reinstate a blanket sub-dollar or ADR exclusion in Core. A comment
that a price is "off" remains unresolved until distinguished from a data error.

The next packet should show the broader move alongside the selected interval,
explain colored versus context candles before labeling, and allow a reviewer to
identify an alternative interval. Do not infer a setup, entry or repeat-episode
boundary from an isolated favorable five-minute window. These distinctions must
be stable before fitting opportunity thresholds or market-temperature weights.

## 6. DTS cross-reference

Keep DTS outside our initial feature weights and target labels. It is a useful
external comparison, not ground truth or a requirement for our prototype.

Proposed capture record: raw value, displayed color/label if accessible,
observed timestamp, provider timestamp if exposed, source/bridge version,
session and capture status. Verify access before promising capture; no screenshot
image is a machine-readable historical series. If access is unavailable, retain
dated manual observations without pretending they are continuous coverage.

Compare only matching time windows. A closing DTS value cannot validate our
morning classification. Keep differences available for chart review instead of
tuning our measure merely to agree with DTS. If its method or version changes,
mark the comparison boundary. Any explanation Justin can provide is useful but
does not block independent chart research.

## 7. Calibration and acceptance

Start with raw features and simple baselines, not a large weighted formula.
Compare the current mover-count rule, breadth/magnitude alone, and the incremental
addition of short-term quality and persistence. Missing optional pillars should
lower evidence confidence, not automatically lower market temperature. Do not
silently reweight around missing inputs and call the results comparable.

Choose a bounded, representative pilot after the data audit: multiple weeks,
different activity levels and price cohorts, quiet days, fading runners and
different session windows. Include days regardless of whether Justin traded or
profited. A convenient small sample is for feasibility, not proof of accuracy.

Have Justin label cold/selective/hot session blocks and usable/choppy/unclear
chart windows before showing the proposed score or DTS comparison. Preserve
uncertainty and disagreement. These judgments are a review reference, not an
objective profit target; repeated review of a subset can expose inconsistent
definitions.

Freeze definitions and fit weights/normalization/cutoffs on earlier development
periods. Evaluate on later held-out dates; keep overlapping windows from one
session together and account for feature/look-forward overlap at split boundaries.
Do not adjust thresholds on the held-out result and continue calling it a test.
These temporal and preprocessing safeguards follow the principles described in
[time-ordered validation](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.TimeSeriesSplit.html)
and [data-leakage prevention](https://scikit-learn.org/stable/common_pitfalls.html#data-leakage).

Before production adoption, require:

- Deterministic, reproducible features with source hashes and calculation version.
- A reviewed confusion table against the held-out session labels, sample sizes,
  abstention rate, and explicit attention to cold days incorrectly called hot.
- Chart evidence that episode counts describe distinct moves, including rejected
  false positives; useful improvement over the simple baseline.
- Stability checks across dates, price cohorts and PM/RTH/AH; sensitivity to one
  extreme ticker, coverage gaps and modest threshold changes.
- A predeclared acceptance rubric after pilot labeling, before held-out scoring.
  If the sample cannot support a reliable result, keep the research descriptive.
- An explanation tied to actual inputs; no black-box certainty or forced color
  when minimum evidence requirements are not met.

The zero-qualifying-+50%-movers cold rule is an accepted strategy definition,
subject to adequate coverage. Target accuracy, numeric weights, quality cutoffs
and yellow/green boundaries remain unset. Previous-day carryover stays a separate
research feature; it must not silently override the current-day cold rule.
If a percentile is later useful, specify its reference population, session
type, historical cutoff and sample size. Keep a 0–100 composite score distinct
from a percentile and from statistical confidence.

## 8. Execution phases and deliverables

| Phase | Work | Exit artifact |
| --- | --- | --- |
| 1. Audit and cost benchmark | Confirm installed source revisions; inventory candidate/bar/float/news coverage; measure a bounded local read and feature pass | Coverage matrix, population decision, missing-data list, measured runtime/RAM/storage and any acquisition estimate |
| 2. Feature prototype | Reproducible offline notebook/script over the frozen pilot; raw features and chart overlays only | Inspectable feature table and sampled annotated charts, no production heat label |
| 3. Human review and calibration | Review usable/choppy windows and session labels; refine definitions; compare simple models | Versioned rubric, weights/cutoffs proposal, held-out evaluation and failure examples |
| 4. DTS comparison | Verify capture path; collect attributable readings when possible; compare matched windows | DTS comparison dataset and disagreement review; may proceed alongside phases 1–3 |
| 5. Server derivation | Adopt validated model in a bounded post-close job; persist features, coverage and outputs; idempotent recomputation | Versioned Server-owned summaries, tests and rollback/recompute plan |
| 6. Journal review | Read summaries; show simple color/text and reasons; join personal participation by account and time | Review UI with evidence drilldown and correct unavailable states |

### Execution checkpoint

The bounded Phase 1 audit and local-cost benchmark have run. An offline raw-feature
prototype and synthetic tests now live in
[the research toolkit](../../scripts/market-context-research/README.md).
The lead owns methodology and integration; Sol agents performed source auditing,
feature/extraction implementation and independent numerical review.

The pilot verifies processing feasibility, not historical market completeness or
model accuracy. It keeps bulk history and selected recovery separate, retains
source fingerprints and does not classify days. Detailed local measurements and
real-data outputs stay in gitignored `data/evals/market-context-pilot-2026-09-16/`.

Recent `complete` publications mean bounded candidate inputs are complete; they
do not establish exhaustive extended-hours discovery. The initial bulk-history
boundary lacks prior-close evidence, so it cannot supply a verified zero-mover
Cold example. Historical float, complete news discovery, RVOL baseline coverage
and automated DTS readings remain open.

Next: review the prototype's chart examples, refine the labeling rubric, then
choose a broader time-separated development and holdout sample. Weights and
Yellow/Green thresholds wait for those results. The immediate output remains
research evidence, not a production score.

### Cost and performance

Existing local bars can be analyzed without a provider request. That does not
mean all required bars are present or that processing is free. Benchmark busy
and quiet covered days, then the pilot; record wall time, peak memory, bytes read,
output size and scaling by symbols × minutes. Verify test paths cannot silently
trigger candle hydration. Separate local compute from missing-data download
cost, provider permissions and rate limits.

Batch historical reads by source day where possible. The existing reader may
decompress a daily source file for each uncached symbol request; benchmarking a
loop of cold per-symbol requests could measure repeated decompression rather
than the intended research job. Keep bulk-history and selected-candidate periods
in separate coverage strata unless an audit supports comparable populations.

Compute after sessions complete, using bounded workers. Cache derived results
by dataset/source fingerprint, universe, feature/model version and session.
Recompute affected dates when evidence changes. Journal page load should read
small summaries rather than rescan charts. Preserve raw evidence and versioned
research outputs; do not duplicate the shared market database in Journal.

### Proposed output contract

Define before implementation; not an existing API:

- Instrument/universe and policy version; ET date, session, window start/end,
  cutoff and retrospective/as-of mode.
- Source IDs/hashes, coverage/gaps, feature denominators and availability flags.
- Raw features and candidate episode references; model/baseline version.
- Class (red/yellow/green or unavailable), explanation and evidence quality.
- Optional score/percentile with explicit semantics; independent DTS observation.
- Generated timestamp, completed/provisional status and revision.

Store market-only facts on Server. Store personal account/trade comparisons in
Journal. Compare share size alongside position notional and planned dollar risk
when available; different share prices and stop distances can make raw share
counts misleading. Without a recorded stop, planned risk remains unknown.
Descriptive alignment findings must not claim that market temperature caused P&L.

## 9. Open questions and responsibilities

| Question | Who resolves it | When |
| --- | --- | --- |
| What historical population and sessions are genuinely covered? | Server/data audit | Phase 1 |
| Are minute gaps absence of trading, halts or missing collection? | Server/data audit | Phase 1 |
| Can DTS's meter be captured and time-aligned? | Server bridge investigation | Phase 1/4 |
| Which ranges and pullbacks offered meaningful opportunities for this style? | Justin reviewing supplied chart examples | Phase 3; no need to invent numbers now |
| Does previous-session activity add useful independent context? | Research comparison on held-out periods | Phase 3 |
| Are the labels stable and useful enough to adopt? | Justin reviewing the evaluation | Before production scoring |

## 10. Source map and planning receipt

Reviewed September 16, 2026. Initial planning used Journal 5f052c1; the research
pilot started from db0617a. Server source is fc0f25f; the installed build manifest
confirms implementation 7a199aa. The local coverage audit and bounded numerical
checks are recorded with the private pilot outputs. They establish sampled
availability and calculation correctness, not a historical data-completeness
certification. No personal trading values belong in this doc.

- [Five-pillar research](ANALYTICS_RESEARCH_PLAN.md#five-pillars-of-stock-selection).
- [Earlier market-context model](../product/JOURNAL_COMPARE_INDICATORS_KEY_MOMENTS.md#market-context-model).
- [Opportunity-set capture plan](OPPORTUNITY_SET_CAPTURE_PLAN.md).
- [Current Momentum Archive contract](MOMENTUM_ARCHIVE.md).
- [Current Journal heat implementation](../../src/components/TradeJournalReview.tsx): marketHeatLabel/buildMarketContext, mover-count baseline.
- [Current saved-news selection](../../src/lib/marketArchive/news.ts): bounded saved-event lookup, not exhaustive catalyst verification.
- Trading Server repository: docs/market-context.md, docs/shared-market-history.md,
  services/market-context/aggregate.cjs, services/market-context-acquisition/, and
  services/market-archive/: market facts, discovery limits and ownership.
- Trading Server repository: public/dts-scanner-voice.user.js and
  services/trading-server/news-api.mjs, news-providers.mjs, ticker-research.mjs,
  ticker-routing.mjs: scanner capture, saved-news/provider limits and current float.

No application code, database, provider settings, collector or runtime changed.
The offline research toolkit exists; production scoring and calibration remain
future work.
