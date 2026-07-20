# Journal: Compare Indicators and Key Moments

> Status: V1 data-exploration prototype defined · Updated 2026-07-18
>
> Reference: Google Finance chart controls and time-range navigation from the
> screenshot captured on 2026-07-15. This is a product pattern reference, not a
> proposal to reproduce Google Finance literally.
>
> Cross-device handoff bundle:
> [`handoffs/2026-07-journal-compare-dashboard/README.md`](handoffs/2026-07-journal-compare-dashboard/README.md)

![Google Finance chart-control reference](handoffs/2026-07-journal-compare-dashboard/assets/google-finance-chart-controls-reference.png)

## Thought

Add a compact visual analysis module to the Journal that lets the trader see
performance, behavior indicators, and meaningful journal events in the same
time-based view.

Working label: **Compare Indicators and Key Moments**.

The useful part of the reference is the control model:

- Choose what the primary visual measures.
- Compare it with another metric or cohort.
- Add or remove indicator overlays.
- Show key moments directly on the timeline.
- Change the review scope without leaving the module.

This could make the Journal more analytical while keeping the user inside the
reflection flow.

## Clarified Product Value

On a Journal day, the selected day is the subject. Week, Month, and Year are
comparison baselines that help answer:

> How was this day different from my recent trading, and what explains the
> difference?

The module should reduce the need to leave the Journal for a basic contextual
read. It is not a miniature Analytics workspace and should not repeat the
existing intraday P&L chart. Its job is to provide three layers of context:

1. **Where today landed** relative to comparable sessions.
2. **Which behavior or performance metrics changed** versus the selected
   baseline.
3. **What drove the difference**, with a short takeaway and a path to deeper
   investigation.

This changes the meaning of the reference controls. **Area**, **Compare**,
**Indicators**, and **Key moments** are inspiration labels, not settled product
information architecture.

## Recommended Module Model

### Comparison baseline

On a day page, keep the selected day fixed and use:

- **Week**: other completed sessions in the selected trading week.
- **Month**: other completed sessions in the selected calendar month.
- **Year**: completed sessions in the selected calendar year.

Exclude the selected day from the baseline calculation so the comparison does
not grade the day against a reference that includes itself. Always show baseline
sample size. A thin week should be labeled as limited context rather than
presented with false confidence.

Month is the recommended default: it is usually large enough to provide context
without reaching so far back that a different trading regime dominates the
comparison.

### Three review views

The mini dashboard should organize views by question rather than chart type.

#### Context — Where did today land?

Primary artifact: a compact session distribution or chronological strip with
the selected day directly labeled.

- Week/Month can show one mark per completed session in chronological order.
- Year can use a distribution/percentile view when a full daily timeline becomes
  too dense.
- The selected day remains the focal mark; baseline sessions stay neutral.

This view should answer whether the day was typical, unusually strong/weak, or
an outlier without requiring the user to interpret the existing intraday P&L
path again.

#### Quality — What changed?

Primary artifact: direct current-versus-baseline comparison rows, using a dot,
bar, or dumbbell treatment rather than unrelated overlaid axes.

Recommended first metrics:

| Metric | Why it matters | Fair comparison |
| --- | --- | --- |
| Expectancy per trade | Separates result size from trade count. | Day value vs baseline session median. |
| Win rate | Shows whether accuracy differed. | Day value vs baseline aggregate and sample. |
| Payoff ratio | Shows whether winner/loser asymmetry drove the day. | Day value vs baseline aggregate. |
| Trade count | Surfaces unusually high or low activity. | Day count vs median trades per session. |
| Give-back | Shows whether gains were surrendered after the session peak. | Day percentage vs median session percentage. |

Net P&L may appear as context, but should not be the only or dominant comparison
because the day page already shows the result and intraday P&L chart.

#### Drivers — What explains it?

Primary artifact: compact diverging bars or ranked rows.

Start with dimensions already supported by the deterministic fact pack:

- Ticker contribution.
- Time-window contribution.
- Price-band contribution.
- Result concentration, including the result after removing the best/worst
  trade when the sample supports it.

Setup, tag, side, and process/rule dimensions can enter later when their data is
complete enough to compare honestly.

### Key moments

Key moments should be annotations within Context or Drivers, not a required
top-level mode in the first version. The initial set can include:

- Best, worst, or sign-flipping trade.
- Session peak and material give-back.
- Coach finding or session verdict.
- Journal note or accepted experiment.

Markers should link back to the relevant Journal or ticker/day evidence. Dense
ranges should cluster markers and preserve a non-visual list for accessibility.

### Written takeaway

Every state needs one concise, deterministic takeaway adjacent to the evidence,
for example:

> You traded more than a typical May session, but expectancy was lower. Most of
> the difference came after the morning peak.

The takeaway names the comparison window, cites the two or three metrics that
support it, and exposes **Open in Analytics** with the same account, date,
baseline, and active dimension.

## Data Availability

### Available now

- Net P&L, trades, fills, wins/losses, win rate, and profit factor.
- Average winner/loser, payoff ratio, breakeven win rate, and expectancy per
  trade.
- Ticker, time-window, and price-band segments.
- Outlier/tail retention, dominant mechanism, surprises, and baseline trend
  signals.
- Intraday cumulative P&L points and material trade links.

### Derivable without new schema

- Baseline medians and current-versus-baseline deltas.
- Session percentile within Week, Month, or Year.
- Peak-to-close give-back dollars and percentage.
- Share of result contributed by the top ticker or trade.
- Average trades per completed session and activity deviation.

### Not reliable enough for the first version

- Rule adherence or process score.
- Emotion ratings.
- Setup-quality comparison when setups are missing or inconsistent.
- R-multiple comparisons when planned-risk coverage is incomplete.
- Market-regime comparison before regime context is captured consistently.

Unavailable metrics should be omitted, not shown as empty controls.

## Proposed Data Shape

The UI should consume one comparison-ready view model rather than calculate
metrics inside chart components:

```ts
type JournalDayComparison = {
  selectedDay: PeriodSummary;
  baseline: {
    scope: "week" | "month" | "year";
    from: string;
    to: string;
    completedSessions: number;
    excludesSelectedDay: true;
  };
  sessionPoints: SessionPoint[];
  metrics: ComparisonMetric[];
  drivers: DriverComparison[];
  moments: JournalMoment[];
  takeaway: DeterministicFinding;
};
```

Each comparison metric needs its unit, current value, baseline value, delta,
sample size, and availability/confidence state. This prevents the chart from
silently comparing totals with per-session averages or mixing incompatible
units on one axis.

## Proposed Controls

Use two compact control groups:

- **View:** Context / Quality / Drivers.
- **Compared with:** Week / Month / Year.

Context may expose one secondary measure selector such as Outcome, Expectancy,
or Activity. Quality should show its curated comparison rows without another
metric picker. Drivers may expose Ticker / Time window / Price band after that
view is added.

Do not ship generic **Area**, **Compare**, **Indicators**, or **Key moments**
menus. They describe visualization mechanics, not trader questions, and would
make the user configure the module before receiving value.

On narrow screens, keep **Compared with** visible. The View control can become a
three-item segmented control or compact menu, but the visualization and written
takeaway must appear before a settings sheet.

## Product Fit

This belongs in Journal when it helps answer:

- What mattered in this period?
- When did the result or behavior change?
- What else was happening at that moment?
- Is this different from my recent baseline?

The full statistical investigation still belongs in Analytics. Journal should
show the smaller, reflection-oriented version and preserve an **Open in
Analytics** path with the active scope, comparison, and filters.

## Smallest Useful Version

1. Add the module to the Journal day view above the existing day narrative and
   intraday P&L detail.
2. Keep the day fixed; support Week / Month / Year as baseline controls, with
   Month selected by default.
3. Build **Context** and **Quality** first. Defer Drivers until the comparison
   interaction proves useful.
4. Context shows where the selected day lands among baseline sessions.
5. Quality compares expectancy/trade, win rate, payoff ratio, trade count, and
   give-back using direct comparison rows.
6. Add two or three material annotations without exposing a separate Key
   moments toggle.
7. Include one deterministic takeaway and an **Open in Analytics** link that
   preserves the comparison state.

Questions to validate before implementation:

- Should the module sit before or after the Coach session verdict?
- Is Context or Quality the stronger default view?
- Are key moments system-generated, user-created, or both?
- Should Year use a distribution rather than a dense daily timeline?
- Which give-back definition should be canonical when the session never turns
  positive?

## 2026-07-18 V1 Data Decision

The interactive `/preview/journal` prototype expanded the original three-view
comparison concept into a **3 scopes × 4 views** review matrix:

| Scope | Views |
| --- | --- |
| Day | P&L, Trades, Process, Coach |
| Week | P&L, Edge, Alignment, Coach |
| Month | P&L, Horizon, Risk, Coach |

Keep this 12-view structure for the V1 prototype. It lets the trader inspect
other evidence without leaving the Journal for Analytics. Do not add a
thirteenth Market view. Market context is a framing layer that should remain
visible while the trader moves between views.

### Reading order

The day-level reading path is:

1. What happened: selected-session header and result.
2. What the market offered: Market Context card.
3. How the trader responded: session verdict and worked/cost findings.
4. What evidence supports the read: the selected Day, Week, or Month view.
5. What changes next: Coach experiment when the Coach view is active.

The selected day remains the page anchor when Week or Month is active. Footer
copy must distinguish the selected-range evidence from the anchored day payload
so a monthly view never claims it is based only on the day's 22 trades.

The page-level behavior synthesis uses this naming:

- **Process read**: the module title.
- **Aligned**: evidence-backed behavior consistent with the playbook or market
  context.
- **Unresolved**: mixed or incomplete evidence that needs trader context before
  the coach makes a judgment.

A confirmed rule breach remains explicit in the detailed Process view;
`Unresolved` must not soften something the deterministic engine has already
proved was off-plan.

## Market Context Model

Market context answers:

> What opportunity did the small-cap market provide, and did the trader's
> participation match it?

It consists of three separate reads. Do not collapse them into one opaque
score:

1. **Small-cap opportunity quality**: whether qualified, tradable momentum
   existed.
2. **Broad-market pressure**: whether SPY/QQQ conditions were a tailwind,
   neutral, a headwind, or a severe headwind.
3. **Participation alignment**: whether trade frequency and risk matched the
   opportunity set.

Broad-index weakness can create a small-cap headwind but does not prove that
small caps are untradeable. Strong isolated momentum can exist during a broad
selloff. Keep broad-market pressure visible as context rather than using it as
the small-cap grade itself.

### Opportunity quality scale

| Grade | Label | Evidence profile | Review posture |
| --- | --- | --- | --- |
| G0 | No clean edge | No qualified candidates; moves and liquidity fail immediately. | A no-trade session is successful alignment. |
| G1 | Thin / isolated | One brief mover or narrow window; attention disappears quickly. | Observation or an exceptional planned setup only. |
| G2 | Selective | One or two qualified names; opportunity exists but is inconsistent. | Reduced frequency; strongest name and setup only. |
| G3 | Productive | Multiple candidates, clear leadership, workable liquidity, and holding pullbacks. | Normal planned participation. |
| G4 | Hot / persistent | Broad or theme-driven momentum persists or rotates cleanly across windows. | Normal participation; risk changes only when the playbook permits them. |

The grade should be captured at multiple checkpoints rather than reconstructed
only from the final high of day:

- Premarket.
- 30–45 minutes after the open.
- 90-minute reset.
- Midday.
- End of session.

This supports a timeline such as `G2 selective → G1 thin → G0 no clean edge`
and lets the coach identify continued participation after the opportunity set
weakened.

### Stock selection has three judgments

1. **Candidate quality**: did the stock fit the trader's selection framework?
2. **Leadership state**: was attention emerging, dominant, fading, or rotating
   elsewhere?
3. **Opportunity at entry**: was the move still structurally tradeable at that
   moment?

With only the traded ticker's candles, the coach may say that the opportunity
had weakened. Calling something the "wrong stock" requires the broader
opportunity set: what other names were available and leading at that time.
Never infer the best stock from the final high of day.

Entry-time stock-selection context should use a frozen snapshot. Useful fields
include candidate state, attention state, distance from current high, volume
trend, leader rank, catalyst state, liquidity/spread quality, and data
provenance. Post-trade observations remain useful for learning but must be
labeled as hindsight.

### Catalyst is a pillar, not a hard gate

News strengthens the explanation and persistence of a move, but a stock can be
highly tradeable without same-day news. Continuation can also be driven by a
catalyst from one to three prior sessions.

Use these catalyst states:

- `fresh`: meaningful same-day news.
- `continuation`: a prior-session catalyst still driving attention.
- `no-news momentum`: no identified news, but price, volume, and attention are
  independently strong.
- `unclear/stale`: neither a current catalyst nor convincing independent
  momentum.
- `adverse`: offering, dilution, or other damaging context.

Do not reduce candidate quality to "five out of five or avoid." The candidate
profile and caveats matter more than a binary pass/fail total.

### Participation alignment

Participation alignment is observable behavior, not an emotion diagnosis.

Examples:

- G0/G1 plus no trades: aligned restraint.
- G1 plus high trade count: over-participation candidate.
- G3/G4 plus repeated trades in a fading laggard: selection/attention mismatch.
- G3/G4 plus little participation: missed-opportunity or hesitation question,
  not an automatic failure.

The coach may name boredom, FOMO, frustration, or tilt only when trader-authored
context supports the mechanical read.

## V1 Surface Audit

| Surface | V1 decision |
| --- | --- |
| Day · P&L | Keep session path and ticker contribution. |
| Day · Trades | Add candidate quality and attention state at entry. |
| Day · Process | Keep deterministic rules; account for opportunity context without turning context into a rule. |
| Day · Coach | Separate selection, timing, execution, risk, and participation diagnoses. |
| Week · P&L | Pair each day with opportunity grade and treat no-trade as a valid session outcome. |
| Week · Edge | Default to dollar expectancy and PF until planned-risk coverage makes R reliable. |
| Week · Alignment | Replace Tilt. Compare opportunity quality with activity without inferring emotion. |
| Week · Coach | Summarize repeated selection and context-alignment behavior. |
| Month · P&L | Keep session distribution/heat view. |
| Month · Horizon | Keep dollar expectancy, win rate, and PF across honest windows. |
| Month · Risk | Use realized drawdown, loss concentration, give-back, and activity buckets. Defer Kelly, Sharpe-in-R, and counterfactual rules. |
| Month · Coach | Decide whether repeated findings and experiments justify a playbook change. |

On non-Coach views, show one deterministic takeaway rather than both a Coach
strip and a repeated takeaway. Keep the full active experiment on Coach; show a
compact experiment reminder elsewhere.

## Data Readiness And Evidence Boundaries

Reliable or derivable now:

- Trades, executions, gross/net P&L, timestamps, hold time, trade count, ticker
  contribution, session path, and fees.
- Tags where present, with untagged kept as a first-class bucket.
- Cached candles for entry-time price/volume structure.
- Stock Info scanner events from the point durable capture began.

Partial or not yet reliable:

- Planned risk and trade-level R.
- Structured rule adherence when intent or invalidation was not recorded.
- Historical candidate snapshots before scanner capture.
- Verified float, RVOL, catalyst state, and leadership rank for every scanner
  event.
- SPY/QQQ regime context in the Journal data contract.

Therefore:

- Default to dollars and percentages; reveal R only when coverage is sufficient.
- Do not show Kelly or daily-R Sharpe in the V1 Journal module.
- Do not present rule simulations as saved-loss facts.
- Show data coverage and provenance beside market-context findings.
- Keep `market closed`, `no scanner capture`, `no opportunity`, and `no trades`
  as distinct states.

## Stock Info Integration Finding

The adjacent Stock Info App already writes an append-only
`data/scanner-events.jsonl` stream with timestamp, symbol, scenario, price,
change percentage, volume, scanner time, and event ID. This is sufficient to
prototype:

- Unique-symbol counts over 10%, 20%, 50%, and 100%.
- Maximum captured percentage change per symbol/day.
- Scanner activity by time window.
- Emerging, persistent, and fading attention proxies.

Count unique symbols by maximum captured change rather than raw scanner hits.
The Most Recent High scenario can emit many rows for one strong mover.

The first captured Friday sample contained 473 events across 88 symbols, with
four names at or above 10%, none at or above 20%, 50%, or 100%, and a maximum
captured change of 17.4%. This supports a G1 thin/isolated read. No Thursday
events were present because durable capture had not started; that is missing
coverage, not proof of a G0 day.

For production, prefer an immutable Stock Info daily summary endpoint or export
over reading another application's live file directly. A future contract could
be:

```text
GET /api/market-context?date=2026-07-17
```

It should return threshold counts, normalized activity windows, coverage,
leadership concentration, and candidate snapshots. Journal can combine that
with broad-index context and the user's executions. Do not query current
ticker data to reconstruct an old session.

## Prototype Acceptance Criteria

- Market Context appears below the session verdict and beside Process Read on
  desktop; it stacks above Process Read on narrow screens.
- The 12-view matrix remains URL-addressable and interactive.
- Day trades expose candidate and attention-at-entry fields.
- Week P&L includes a no-trade cold day.
- Week Alignment compares context with activity and avoids emotion claims.
- Week Edge hides R when planned-risk coverage is low.
- Month Risk omits Kelly, Sharpe-in-R, and speculative rule savings.
- Catalyst copy supports fresh, continuation, and no-news momentum states.
- Range-aware footers distinguish selected evidence from the anchored recap.
- Coverage and caveats remain readable without hover and without color alone.

## Productionization Mapping

The standalone interactive HTML is the visual and interaction source for the
production Journal. Its scope/view tabs, ticker-note affordances, progressive
Coach sequence, and compact data density should be preserved. The production
implementation must replace its illustrative values with the existing Journal
queries and deterministic Coach fact pack.

### First production slice

The first slice is intentionally day-focused:

- Preserve the live day header, imported totals, session verdict, running P&L,
  and ticker contribution.
- Add four interactive day views: P&L, Trades, Process, and Coach.
- Rename the process summary to `Process read`, with `Aligned` and `Unresolved`
  as its evidence columns.
- Make every ticker expose an explicit `Add note` or `Edit note` action.
- Explain the three-part Coach context loop: note trades, add the day note, then
  generate the Coach review.
- Use the existing playbook, rubric, deterministic fact pack, scoped day note,
  ticker notes, and trade tags as the Coach payload. Do not create a parallel
  note or analytics model.
- Show Market Context as unavailable until the Stock Info daily-summary
  contract is connected. Do not reconstruct or fabricate historical context.

### Range matrix production slice

The production day page now keeps the selected day as the anchor while all
three scopes switch in place:

- Day: P&L, Trades, Process, Coach.
- Week: P&L, Edge, Alignment, Coach.
- Month: P&L, Horizon, Risk, Coach.

Changing scope resets to that scope's P&L view and writes `scope` and `view` to
the current Journal URL. Week and Month use live imported range data and the
existing deterministic fact pack. They do not navigate away to the legacy
range pages.

The first live range contract is deliberately narrower than the exploration
mock where underlying evidence is not yet available:

- Week Alignment shows relative activity but withholds context-alignment
  scoring until the immutable Stock Info daily summary is connected.
- Week Edge uses captured setup values and dollar expectancy. It keeps R
  coverage visible and does not substitute an R view when coverage is weak.
- Month Horizon compares the selected month with the existing prior-30-day
  baseline. The 60d, 90d, and YTD windows remain a follow-on query contract.
- Month Risk uses realized daily drawdown and loss concentration. It does not
  introduce simulated rule savings, Kelly, or Sharpe-in-R.
- A missing imported session is not classified as a no-trade decision. That
  distinction requires a captured session or scanner summary.

### Data-to-surface contract

| Surface | Production source | Evidence boundary |
| --- | --- | --- |
| Day · P&L | Trades, executions, net P&L, ticker grouping | Exact imported facts |
| Day · Trades | Trade timestamps, side, quantity, setup, hold, tags, net P&L | Setup/tag may be missing; label the gap |
| Day · Process | Deterministic fact pack, risk-field coverage, baseline comparison | Observation, not intent or emotion |
| Day · Coach | Saved/generated Coach review plus deterministic fallback | Distinguish ready, draft, generated, stale, and failed |
| Week · P&L | Imported trade-session summaries | Missing session is not an intentional no-trade day |
| Week · Edge | Captured setup, trade outcome, tags, risk-field coverage | Dollar expectancy; small samples remain directional |
| Week · Alignment | Session activity plus future Stock Info context | Activity is descriptive until opportunity coverage exists |
| Week · Coach | Deterministic range fact pack | Observation and evidence, not inferred emotion |
| Month · P&L | Imported trade-session summaries | Imported sessions, not a complete market-day calendar |
| Month · Horizon | Selected-month fact pack versus prior 30 days | 60d/90d/YTD deferred until queried honestly |
| Month · Risk | Daily net P&L and activity | Descriptive realized risk, no counterfactual simulation |
| Month · Coach | Deterministic range fact pack | Promotion to playbook remains a user decision |
| Market Context | Future immutable Stock Info daily summary | Explicitly unavailable without captured coverage |

### Empty-state matrix

| State | Product response |
| --- | --- |
| No broker import | Say `No broker import found` and show the import action. |
| Broker history, no trades in selected day | Treat it as a legitimate no-trade day; keep the day note available and do not imply that importing is required. |
| Trades, no ticker notes | Show `Add note` on each ticker and incomplete Coach context. |
| No day note | Keep `Add a day note` as the second Coach-context step. |
| Context present, no generated review | Show the payload as ready and offer `Generate coach review`. |
| Generation failed | Show a safe recovery message; never expose provider keys or raw infrastructure errors. |
| No market-context capture | Say coverage is unavailable; never call the day cold or hot from missing data. |

Coach readiness is not Coach completion. The third step becomes complete only
when a review has status `generated` and a parsed review payload. A saved draft
or complete context package remains a ready-to-generate state.
