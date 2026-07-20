# Data & Visualization Catalog

> Status: **Working synthesis v1** · Last updated: 2026-07-18
> Purpose: step back from the viz prototypes and answer four questions —
> what data points do we have, which are meaningful, what do competitor
> dashboards provide, and what chart vocabulary do we have access to.
> Companions: [ANALYTICS_RESEARCH_PLAN.md](ANALYTICS_RESEARCH_PLAN.md) ·
> [DATA_VIZ_STUDY_REGISTER.md](DATA_VIZ_STUDY_REGISTER.md) (the review
> questions each study defined, at day/week/month scope — start here on
> resume) ·
> [../DATA_MODEL.md](../DATA_MODEL.md) ·
> [../product/COMPETITIVE_ANALYSIS.md](../product/COMPETITIVE_ANALYSIS.md) ·
> Preview surfaces: `/preview/data-viz` (collection index) ·
> `/preview/data-viz/v1` (v1 sticker sheet) ·
> `/preview/data-viz/v2` (interactive lens lab) ·
> `/preview/data-viz/v3` (join lab — the trade×candle join, computed for real) ·
> `/preview/data-viz/v4` (factor lens — one factor at a time, sentence-first) ·
> `/preview/data-viz/v5` (opportunity-set vocabulary — scanner alerts, five-pillar
> candidates, participation glyphs; see
> [OPPORTUNITY_SET_CAPTURE_PLAN.md](OPPORTUNITY_SET_CAPTURE_PLAN.md)) ·
> `/preview/data-viz/v6` (discovery lab — relationship lenses derived purely
> from sequencing: session storm tracks, loss echo, conviction calibration,
> re-entry premium, nth bite, pace) ·
> `/preview/data-viz/v7` (journal lenses — the v6 winners rebuilt at journal
> scope: one annotated session path at day, five small multiples at week, the
> overlay at month; behavioral reads follow an honesty gradient — facts at day
> scope, statistics with n at week/month. Review verdict on v6: storm tracks
> and pace graduate; re-entry premium and nth bite are analytics-tier, not
> journal-tier; the conviction 2×2 becomes a sentence + meter)

## The one-sentence thesis

We are not limited by a chart library (everything is hand-rolled SVG — we can
draw *anything*), and we are not short on data (second-resolution fills plus
full-session 1-minute OHLCV is richer than what most competitor charts
consume). The constraint is **reading cost and trust**: every chart we ship
must answer a named trader question, cite the data that feeds it, and admit
what it can't know yet. "Up a level" means more *evidence per pixel*, not more
charts.

---

## 1. Data inventory — what we actually have

Organized by the provenance layers from [DATA_MODEL.md §1](../DATA_MODEL.md).
A chart may only combine layers if it labels them.

### 1a. Stored raw (imported, immutable)

| Data | Fields that matter for viz | Resolution / coverage |
|---|---|---|
| `executions` (fills) | symbol, buy/sell, quantity, price, **timestamp to the second**, fees, route, posEffect | Every fill; the atomic truth |
| `candles` | OHLC + **volume**, 1-minute bars | **04:00–19:59 ET verified** — premarket & after-hours already cached; display window is 07:00–20:00 ET (§2/§8 of DATA_MODEL) |
| `import_batches` | source, fileName, importedAt | Provenance for "where did this number come from" |
| `attachments` | screenshots per trade | Qualitative evidence |

### 1b. Derived + user-authored (already in tables)

| Data | Fields that matter for viz |
|---|---|
| `trades` (round-trips) | side, quantity, avg entry/exit price, entry/exit timestamps, fees, **stopLoss**, target, setup, open/closed |
| `tags` + `trade_tags` | free-form labels → setup/behavior cohorts |
| `journal_entries` | scope (trade/ticker/day/week/month), thesis, went well/wrong, lessons, **followedPlan (boolean)**, emotionalState |
| `coach_reviews` / `coach_experiments` / `coach_playbooks` | structured verdicts, experiments with status, rules — the future "annotation layer" on charts |

### 1c. Derivable **now** with pure computation (no new capture)

Per **trade**: net/gross P&L · hold time · time-of-day & day-of-week of entry ·
share size · dollar exposure (qty × price) · number of adds/scale-outs (from
fills) · gap since previous trade · position in the day's sequence (streak
context) · size-after-loss vs size-before-loss.

Per **trade × candles** (the join is the single highest-leverage unlock —
planned as the "opportunity context" calculator, DATA_MODEL §7.2): MAE/MFE ·
entry vs VWAP · entry vs premarket/day high · **relative volume at entry** ·
time-since-high at entry · prior failed attempts at a level.

Per **session**: cumulative P&L path · peak give-back · realized drawdown ·
win/loss day stats · concentration by ticker/time-window/price-band (already
in `SessionFactPack.segments`) · **robustness trims** (`trimOneNetPnl`,
`trimTailNetPnl`, retention, distribution label — already computed, *never yet
visualized*) · expectancy, payoff, profit factor, breakeven win rate.

Per **period**: calendar rollups (day→week→month→year) · rolling windows
(30/60/90d) · trend signals (win rate, expectancy, PF, net — already in
`SessionFactPack.history`) · streaks · fee drag.

### 1d. Not available until declared or captured (do not fake)

Planned risk / initial stop at entry (so **R-multiples are gated** — engine
already falls back to dollars, `riskModel: "dollar-fallback"`) · account
equity (percent-of-account) · plan-vs-actual (needs the immutable pre-trade
snapshot from COMPETITIVE_ANALYSIS) · market regime / opportunity grade
(needs the market-context capture) · commissions-vs-fees split ·
liquidity add/remove.

**Viz rule:** when a chart's honest unit is R but coverage is low, show
dollars and say why. When a day has zero trades, that is a data point
("aligned no-trade"), not missing data.

---

## 2. Which data points are meaningful — ranked by actionability

The analytics north star (ANALYTICS_RESEARCH_PLAN): *"What should I change,
keep, or investigate before the next session?"* Metrics rank by how directly
they select a behavior, not by how impressive they look.

| Tier | Metric family | Why it earns the rank |
|---|---|---|
| **1 — selects a behavior** | Expectancy by cohort (time-of-day, setup/tag, rel-volume bin, size band) · robustness trims ("the month without its best trade") · give-back after peak · size/frequency escalation after a loss · loss concentration (worst-2 share) · untagged-trade drag | Each one names the *thing to do differently tomorrow* |
| **2 — explains the result** | Cumulative path & drawdown · win/loss day comparison · payoff ratio & breakeven win rate · hold-time asymmetry (winners vs losers) · MAE/MFE capture efficiency · streaks | Diagnosis; pairs with a Tier-1 metric to become actionable |
| **3 — orients** | Net P&L, win rate, PF, trade counts, calendar heat, period ladders | Table stakes; the "where am I" layer every product has |
| **4 — display with caveats or gate** | R-multiples (gate on planned-risk coverage) · Sharpe/SQN/Kelly (excluded per DATA_MODEL §8 until risk capture is real) · emotion correlations (only with trader-authored labels, never inferred) | Trust-destroyers when faked |

Two cross-cutting gates from the review engine, which the charts must respect:
**minimum sample** (no session-level classification under 5 closed trades; tag
cohorts are "directional" under ~50) and **one fee policy** everywhere (a
header, a path, and a per-ticker row must never disagree).

---

## 3. What competitor dashboards provide (chart level)

From [COMPETITIVE_ANALYSIS.md](../product/COMPETITIVE_ANALYSIS.md) plus public
product material — recheck before external use.

**The converged baseline** (Tradervue, TradeZella, TraderSync, TradesViz,
Edgewonk, TradeNote): calendar P&L heatmap · equity/cumulative curve · daily
P&L bars · win% donut or gauge · stat matrices · breakdowns by hour, weekday,
duration, symbol, setup/tag, price, volume · drawdown charts · MAE/MFE
scatter · trade replay on candles · compare-two-cohorts reports.
Distinctive flourishes: TradeZella's "Zella Score" **radar**; Edgewonk's
tilt-meter and rule-break tracking; TradesViz's *hundreds* of charts plus
custom-dashboard builder and AI query.

**The category's known failure** (their own users say it, and our brief
documents it): analytics describe performance without selecting a behavior.
TradesViz proves "more charts" is a solved, non-differentiating problem — and
that depth creates overload. Nobody visibly ships: robustness/trim visuals
("what carried the result"), charts whose claims carry **evidence links and
confidence**, participation-vs-opportunity alignment, or an experiment whose
progress is *drawn on the chart of subsequent sessions*. Those are ours to
take.

---

## 4. The chart vocabulary — what we have access to

Renderer is hand-rolled SVG/CSS (no D3, no chart lib — a deliberate
constraint that keeps us theme-native and dependency-free), so "access" means
*everything*; the catalog below is a discipline choice, not a technical limit.
House rules from the design system: one axis (never dual) · red/green
reserved for outcome, sign never color-alone · legends for ≥2 series · hover
enhances, never gates (every chart has a table twin) · thin marks, hairline
grids.

Status key: **V1** = sticker sheet (`/preview/data-viz/v1`) · **V2** = lens lab
(`/preview/data-viz/v2`) · **APP** = live app already · **CAND** = candidate ·
**RESTRAINT** = allowed with rules · **AVOID**.

### Time & sequence

| Form | Trader question | Status |
|---|---|---|
| Cumulative P&L path + session bars | "What happened, when, what changed the path?" | V1 #01, APP `/reports` |
| Calendar heatmap with week/month rollups | "Am I consistent? Streaks? No-trade days?" | V1 #07 · V2 lens 05 (adds click-to-scope + inspector) |
| Trade tape / sequence strip | "Pacing, bursts, revenge patterns in order" | V1 #08 · V2 lens 03 (cross-highlighted) |
| Aligned multi-track rhythm strip (one shared clock, one crosshair) | "Expectancy vs attempts vs market volume through the day" | V2 lens 01 |
| Candle silhouette (range = height, volume = ink, entries overlaid) | "Where in the tape's energy did I act?" | V2 lens 07 |
| Full candlestick + executions + VWAP/levels | "Exact execution audit on one ticker-day" | APP (ticker review workspace); window must become 07:00–20:00 ET |
| Sparklines in stat tiles | "Trend at a glance" | CAND (cheap, high value) |
| Streak/run chart (consecutive W/L with magnitude) | "How long do my tilts last?" | CAND |
| Horizon chart | dense multi-metric history | AVOID for now — high reading cost |

### Distribution & magnitude

| Form | Trader question | Status |
|---|---|---|
| Dot swarm + interval (median, middle-50%) | "Is the edge broad or outlier-carried?" | V1 #02 |
| Mirrored/butterfly histogram (losses left, wins right), **ghost outline for period-shape compare** | "Where do the dollars live, and does this week's shape match the month?" | V2 lens 04 |
| Ranked contribution bars (signed) | "Which trades made the month?" | V1 #04 |
| Waterfall (session → ticker → trade decomposition) | "Walk me from +$2,875 to its parts" | CAND — strong for the recap's "what drove the result" |
| Histogram (binned) | classic distribution | RESTRAINT — swarm reads better under ~200 trades |
| Box/violin plots | statistical summary | AVOID — traders don't read quartiles; the swarm shows the same honestly |

### Relationship & cohort

| Form | Trader question | Status |
|---|---|---|
| Scatter ("splatter") w/ size+color encoding, nearest-point hover | "Does hold time / size / frequency explain outcome?" | V1 #06, #13 (remappable axes) · V2 lens 02 (log-time constellation) |
| MAE/MFE excursion scatter & per-trade braid | "Entry stress vs exit efficiency; captured vs available move" | V1 #09, #10 (gated FUTURE DATA → unlocked by candle join) |
| Cohort dumbbells (baseline vs current per metric) | "Did July actually improve on last month?" | V1 #05 |
| Diagnostic ledger (count + win% + avg + net per row) | "Sample size and outcome, read together" | V1 #03 — house pattern, better than separate charts |
| Diverging expectancy bars by bin (center = zero) | "Does rel-volume / time / size bucket pay?" | V2 lens 06 |
| Weekday × time-of-day heat matrix | "Which recurring windows help or hurt?" | V1 #15 |
| Slope chart (two periods, many metrics) | quick period-over-period | CAND |
| Quadrant map (e.g. opportunity grade × participation) | "Did activity match what the tape offered?" | CAND — needs market-context capture; nobody in the category shows this |
| Sankey (setup → outcome flows) | flow attribution | AVOID — decorative at our sample sizes |
| Parallel coordinates | multi-dim cohorts | AVOID |

### Figures, part-to-whole & specialty

| Form | Trader question | Status |
|---|---|---|
| Hero figure + stat tiles (with context line) | "TLDR of the scope" | V2 header, APP |
| Period ladder (day/week/month/year, avg-normalized) | "Same me at every horizon?" | V1 #14 · V2 via scope filter |
| Win-rate ring/donut | compact redundant glyph | RESTRAINT (V1's own note: only with the exact % visible; never for comparing close values) |
| Radar/spider (Zella-style score) | multi-metric "score" | RESTRAINT/AVOID — weak for mixed units (V1's note); a dumbbell row is more honest |
| Treemap (loss concentration by ticker/day) | "Where's the damage concentrated?" | CAND — occasional, not a default |
| Gauge/meter | single bounded value | RESTRAINT — meter fill only for genuinely bounded things (rule adherence %, tag coverage) |
| Stacked area | composition over time | RESTRAINT (occlusion; V1's note) |
| Dual axis | — | AVOID (house rule; V1 concurs) |
| **Robustness/trim visual** — the path *with and without* the top trade(s) | "Was the result skill or one print?" | **CAND, highest priority** — data already in `SessionFactPack.robustness`; no competitor ships this |
| **Experiment tracker chart** — sessions since experiment started, annotated with adherence | "Is the one thing I'm trying working?" | CAND — the learning-loop chart; uniquely ours (`coach_experiments` exists) |

### The distillation rule (what v4 established)

Multi-encoded charts (v3's excursion scatter carries ticker + hold + shares +
MAE + MFE + outcome at once) are good for *seeing shape* but bad for *reaching
a conclusion* — trader feedback: "these don't mean anything to me." The
antidote is **one factor at a time, sentence first**: pick a single dimension,
then show exactly three things — (1) a computed plain-English verdict
("your median winner's position was $3.6k; your median loser's $2.4k"),
(2) a winners-vs-losers strip where position is the *only* encoding, and
(3) equal-count quartiles with expectancy, so no row is a small-sample
illusion. When the quartile spread is small, the verdict must say "this
factor doesn't separate your results" — a flat read is a finding, not a
failure. Single-factor reads are honest but not causal; when two factors
both look strong, the follow-up is a cohort A/B compare, not a bigger blob.
The blob charts stay — as the *exploration* layer behind the sentences.

v4 also carries two further controls that generalize:
**scope selection** (Everything / Month / Week / Day / Stock, with a value
picker) — the same three views re-derive for any slice, with graceful
degradation (quartiles withheld under 20 trades; "small slice — read
direction, not magnitude" under 40; a no-losers day renders "—", never a
fake number); and **form switching** (Dots / Mirror / Interval) — three
readings of the identical single-axis comparison sharing one axis builder,
proving "switch the chart type" is a presentation choice, not a data
rebuild. Both belong in the eventual Reports filter grammar.

### Interaction grammar (what v2 established — reuse everywhere)

One **filter row above everything** (scope × outcome) that re-slices every
view · **hover reveals, table twins** so tooltips never gate ·
**cross-highlighting** (same trade lights up across charts) · **fixed
inspector panels** instead of jumpy tooltips for dense surfaces (calendar) ·
**click-to-scope** (a calendar day becomes the page's scope) · **ghost
baselines** (the larger period's shape stays behind the filtered view).
Candidates to add: pin-two-and-compare (A/B cohorts, the Compare tab's
engine) · brush a time range on any time axis to scope · annotation layer
(coach findings and experiments drawn *on* the charts with provenance
glyphs).

---

## 5. Review of what exists today

**v1 sticker sheet** (`/preview/data-viz/v1`, 13 specimens): a deliberate
*vocabulary test* — static, honest labels, each specimen states when to use
it and its mobile fallback; specimens 11–12 were already retired after
review, and it carries its own restraint list (radar, donut, stacked area,
dual axis). Its `DataVizLensBuilder` (#13) — remappable axes on one scatter —
is the seed of the "configurable analytics workspace" the research plan calls
for. Status labels (`DERIVABLE`, `FUTURE DATA`) already anticipate the data
gates in §1.

**v2 lens lab** (`/preview/data-viz/v2`, 7 lenses): adds the interaction
grammar (global cross-filtering, linked highlighting, hover-reveal,
click-to-scope, ghost-shape comparison, table twins) over one seeded trade
table so every lens agrees. It demonstrated the two ideas v1 couldn't:
**filters as the comparison mechanism** (day-vs-week-vs-month is one chip,
not three charts) and **charts that answer each other** (constellation ↔
sequence).

**Live app**: `/reports` (cumulative P&L, stat matrix, duration/day/hour
distributions, filters) and the ticker-day review chart (candles + fills).

**The honest gap**: everything in the previews renders synthetic data.
Graduation path per DATA_MODEL — charts consume `SessionFactPack` /
`JournalDayVM`, not bespoke queries.

---

## 6. Taking it up a level — recommended sequence

1. **Unlock the trade×candle join** (opportunity-context calculator,
   DATA_MODEL §7.2). It converts five of the highest-value charts from
   `FUTURE DATA` to live: MAE/MFE, capture efficiency, rel-volume-at-entry,
   VWAP relationship, premarket-high context. One module, five lenses.
   → **Prototyped 2026-07-18**: `scripts/generate-candle-join-data.mjs` runs
   the join against the demo DB (1,207 closed trades × 1-min candles, 0
   skipped) and `/preview/data-viz/v3` renders six specimens whose claim
   titles are computed from the joined data at render time. Measured
   findings: winners/losers absorb similar heat (median MAE 3.4% vs 3.9%)
   but diverge on MFE (3.1% vs 1.2%); median winner captures 32% of MFE and
   the tape runs +4.2% median in the 10 min after exit; fresh-high entries
   (≤2m) pay ~2× the 2–10m cohort; rel-vol 2–4× is the sweet spot and 4×+
   pays less; 90% of entries are above VWAP (style fingerprint, not a
   filter) while the premarket-high side splits expectancy +$33 vs +$22/t.
   The script is the seed of the production calculator; the ET-session,
   side-aware, entry-time-only math lives there.
   → **Extended with move anatomy (same day)**: the generator now also
   classifies each ticker-day from its candles — session base, day high,
   ignition (first "+10% in 5 minutes" onset), volume clock — and v3 part
   two grades entry timing against it (labeled hindsight anatomy, never an
   entry signal). Measured: 295 of 312 traded days ignited (selection is
   not the leak); only 26 of 1,207 entries caught the first 5 minutes
   (+$39/t when they did); extension is U-shaped (25–50% extended = $8/t
   trough, 50%+ = $40/t); entries before 25% of the day's volume printed
   paid $43/t; 95% of all P&L came from ≥50% movers. New forms: movers
   scatter (day move × your net, per ticker-day) and a volume-at-price
   profile specimen with POC + entries (the busiest day — 29 trades —
   netted +$9, a churn-day finding).
2. **Ship the two charts nobody else has**: the robustness/trim visual
   ("July without its best three prints") and the experiment tracker. Both
   have their data already computed or stored; both embody the product thesis
   (evidence over description; behavior change over stats).
3. **Adopt the claim-first card** everywhere: every chart's title is a
   sentence making a claim (v1 already does this), plus a data-contract
   footnote (v1's journal prototype pattern) and a confidence/sample gate
   (engine pattern). That's the trust moat drawn, not just written.
4. **Converge on the tab model** from ANALYTICS_RESEARCH_PLAN (Overview /
   Stats / Edge / Risk / Compare / Coach) and treat the catalog above as the
   widget library each tab draws from — lenses become configurable modules,
   which is the "lens registry" the plan's configurable workspace needs.
5. **Then wire to real data** through the finalized contracts — which is the
   current phase's stated priority anyway (finalize the content model before
   UI).
