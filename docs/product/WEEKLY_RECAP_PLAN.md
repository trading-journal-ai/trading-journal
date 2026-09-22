# Journal Weekly Recap — Content and Progression Plan

> Updated: September 19, 2026 · Status: first deterministic slice built locally;
> validation passed; integrated and verified in the canonical local app
>
> This document preserves the competitive research and initial weekly format
> discussed on September 19, then incorporates Justin's subsequent preferences.
> Later clarifications refine the plan; they do not discard the research.
> Justin authorized implementation with “OKay let's build it.” Section 12 records
> the implemented scope; the richer research and proposals remain below.
> No UI, generation, market scoring, database, or provider changes are authorized
> by this document alone.

## 1. Owner direction and working proposals

Confirmed by Justin:

- The primary reason to open Week is to see P&L progression.
- Monday and Tuesday should be light.
- Start adding detail Wednesday, develop it Thursday, and show a full recap
  covering the entire week by Friday.
- During the early week, use a short recap with expandable evidence.
- At week end, provide the full review beneath the weekly chart.

Justin also suggested highlighting top good/bad trades and market hot/cold
context. The selection and qualification rules below are proposals for making
those useful without conflating profit with decision quality.

Keep the existing stats, calendar strip, cumulative chart, and ticker-count
popovers. This plan concerns recap content beneath the chart, not another
chart redesign. The full Friday recap should be visible in place; detailed
calculations and source evidence can remain expandable.

## 2. Existing rules we are applying

- [Coach Voice](../coach/VOICE.md): plain-language read, exact evidence, and an
  optional warranted next action. No generic encouragement or moral judgments.
- [Content Specification](COACH_RECAP_CONTENT_SPEC.md): distinguish imported
  facts, calculations, trader-authored context, Coach interpretation and adopted
  knowledge. Separate glance, review and investigation depths.
- [Original weekly direction](AI_FIRST_DAILY_RECAP_PLAN.md#future-scope-weekly--monthly-coach-recaps):
  roll up daily observations and focuses, examine recurrence across sessions,
  compare stronger/weaker days and carry one adjustment forward.
- [Coach Intelligence Research](../coach/COACH_INTELLIGENCE_RESEARCH_PLAN.md):
  compute relationships in code, gate claims by evidence, rank eligible findings,
  and let the model explain them. Multiple trades from one ticker-day are not
  independent proof of a persistent personal pattern.
- [Review Schema v2](COACH_REVIEW_SCHEMA_V2.md): typed findings and evidence
  references are the target, not a fully implemented runtime capability.
- [Market Context Master Plan](../analytics/MARKET_CONTEXT_MASTER_PLAN.md):
  independently derived, retrospective small-cap opportunity context; missing
  coverage is not a cold market.

The proposed weekly content caps below adapt the daily specification rather
than requiring every daily section to appear five times.

## 3. Why the previous paragraph was generic

The previous `weekInsight()` in `src/components/JournalDayDataViews.tsx` selected among a few
P&L templates based on the best day, worst day, number of profitable sessions
and concentration. It did not consult trade notes, process evidence, the
previous focus, or independently verified market conditions. Its `weekState()` used
calendar dates, not import completeness or review finalization. The first
replacement is described in section 12.

A concentration statistic can support the story, but it is not a sufficient
weekly review. A concentrated profit does not establish bad trading elsewhere;
a losing trade does not establish a mistake.

The existing Coach payload already supports day/week/month scopes and richer
facts. Its live payload remains v1; do not describe the full v2 evidence and
experiment-evaluation loop as shipped.

## 4. Competitive research retained

Reviewed September 19, 2026 using public first-party product/help documentation.
These are documented capabilities and product claims, not hands-on validation
or evidence of improved trading outcomes.

| Source | Relevant documented approach | Application here |
| --- | --- | --- |
| [TradeZella / Zella AI](https://help.tradezella.com/en/articles/11201153-what-is-zella-ai-tradezella-s-ai-trading-assistant) | Reads trades, rules, strategies and notes; supports plan-versus-session review and retained context | Carry the trader's intention and active focus into the recap |
| [TradesViz](https://www.tradesviz.com/ai-trading-journal/) | Deterministic findings ranked by impact/confidence, with supporting-trade drilldowns and optional narrative | Rank meaningful supported findings before asking a model to narrate |
| [Edgewonk](https://edgewonk.com/blog/how-to-review-your-trading-journal) | Weekly review examines setups, management, mistakes and previous improvement focus; ends with one measurable action | Synthesize the week and revisit the prior focus instead of generating unrelated advice |
| [Tradervue](https://help.tradervue.com/article/3468-weekly-preformance-report) | Weekly aggregate and per-trade performance reports | Keep numerical reporting available as evidence beneath interpretation |

No explicit Monday-to-Friday evolving recap was established in the reviewed
sources. That cadence is our product proposal. Do not claim competitors lack it
without hands-on verification. Do not copy competitor pattern thresholds or
emotion labels without validating their relevance to our evidence model.

## 5. Progressive weekly format

This is the target content progression. Section 12 distinguishes the first
implemented slice from the process, holiday and final-session behavior still
proposed here.

| Stage | Visible content | Purpose |
| --- | --- | --- |
| Monday | One short P&L progression read; existing focus if available; at most one material highlight/context note | Establish what happened without stretching one session into a weekly pattern |
| Tuesday | Update the short read; explain a material change from Monday; keep detailed evidence expandable | Start comparison while staying light |
| Wednesday | Add the developing weekly story, up to one positive and one negative trade highlight, and relevant qualified market context | Explain which events are shaping the curve |
| Thursday | Update those findings; show confirming/contradicting evidence and progress on the focus where recorded | Test the developing interpretation rather than invent a new lesson |
| Friday / final scheduled session | Full weekly recap below the chart, including synthesis, highlights, process, market context and next focus | Explain the entire week and carry one useful takeaway forward |

Suggested editorial budgets, subject to review: roughly 30–60 words early week,
80–150 words midweek, and 200–350 words for the full recap. These are caps, not
quotas. Sparse evidence may produce a much shorter final review.

The calendar sets expected depth; evidence sets claim strength. Existing
historical patterns and an accepted focus remain available Monday. A newly
observed behavior does not become established automatically on Friday.

Friday before the final session is complete remains provisional. The full
format can develop during Friday, with final wording only after the relevant
session cutoff. Holidays use the final scheduled trading session; missing
imports are not treated as holidays or intentional no-trade days. A closed
week with missing coverage can show a full review of available data, clearly
qualified as incomplete. Do not claim current import completeness from date
or trade count alone.

## 6. Full-week recap content

Use one coherent account of the week, not five daily summaries concatenated:

1. **The week's story:** what drove the result and how it developed. Explain
   consequential turning points, recovery or giveback using the existing P&L
   accounting basis. Concentration leads only when it changes the interpretation.
2. **Trade highlights:** one best-supported positive example and one loss or
   mistake worth studying. State ticker, day, a specific reason and an evidence
   link. See selection rules below.
3. **What worked / what cost you:** supported process findings across sessions;
   do not repeat the highlight verbatim in a second section.
4. **Market context:** describe changes in independently observed opportunity
   across the week and relevant differences between market conditions and the
   trader's participation. See qualification rules below.
5. **What repeated or changed:** supporting and contradicting sessions, plus
   progress on the existing focus. Do not infer adherence from profitability.
6. **Next week's focus:** one concrete action or investigation. Continuing the
   current focus is valid; an unsupported new prescription is not required.

Merge sections when they would repeat the same finding. A missing evidence
category should be omitted or explained briefly, not filled with generic text.
The main read comes first; linked evidence, calculations, prior comparisons
and additional review candidates remain one level deeper.

## 7. Selecting good and bad trade highlights

Maintain two distinct kinds of selection:

- **Outcome:** biggest contributor / largest loss. These labels can come from
  verified P&L facts without claiming process quality.
- **Decision quality:** best decision / mistake to review. These require
  supplied intent, rule evaluation, chart evidence available at entry, or
  trader-authored context sufficient to support that specific judgment.

A profitable rule violation cannot become the best decision because it earned
most. A planned loss can be a positive process example. Where evidence is thin,
use honest outcome labels rather than calling the trades good/bad.

Prefer highlights that explain the weekly curve or the active focus. Rank
supported candidates by material rule/risk relevance, learning value,
recurrence, evidence strength and impact; do not rank only by dollars.
Do not require both a positive and negative verdict if only one is supported.
A material verified risk breach can surface Monday; depth progression must not
hide it until Wednesday. Preserve highlights unless new evidence warrants a
change. Each must lead to the exact trade/session and its supporting context.

## 8. Market context: hot, selective or cold

Reuse the existing market-context project rather than inventing a second heat
score in weekly recap. Its target labels are Red · Cold, Yellow · Selective and
Green · Hot for Justin's small-cap momentum opportunity universe—not a broad
stock-market forecast and not a personal P&L grade.

The master plan already defines adequately verified absence of eligible +50%
movers as Cold for this strategy. The presence of such movers alone does not
establish Hot: breadth, follow-through and usable/repeated opportunities matter.
Yellow/green thresholds and richer scoring remain uncalibrated according to
that plan. The current Journal mover-count label is only a baseline. Its
presence in code is not proof that a day's classification is trustworthy.

Before implementation, verify the maintained Trading Server contract and
per-day coverage. Journal consumes shared market evidence; it does not take
over capture, storage or derivation. This planning pass did not inspect or
certify the currently installed Server runtime.

Presentation proposal:

- Early week: one brief context sentence when qualified and relevant.
- Midweek: describe whether opportunity broadened, narrowed or changed; retain
  differences by day rather than flattening them into one weekly adjective.
- Final review: explain the market's arc alongside the trader's arc. Compare
  participation with conditions only to the degree data supports it.
- Use short labels with text, not color alone. Keep dates, sources, observation
  cutoff and coverage inspectable. Unsupported classifications remain unavailable.

Never infer market heat from the trader's profit, number of trades, or win rate.
Missing capture is unknown, not Cold. Completed-session context is retrospective
and cannot prove what was visible at entry or which opportunity was missed.
Do not calculate a weekly heat score by averaging ordinal color labels.
Until a validated classification is available, use qualified observed facts or
omit the assessment; the rest of the recap can still ship independently.

## 9. Update and trust behavior

- A new session should support, weaken or resolve the existing story. Do not
  rotate findings merely to make the page appear fresh.
- Use available-as-of inputs; historical partial-week views must not include
  later sessions or later-known market evidence as if known earlier.
- Preserve generated revisions and trader notes separately. Corrections or
  late imports may change the review; label the update instead of silently
  rewriting the trader's own record.
- Compute metrics, comparisons and claim eligibility in code. A language model
  may synthesize eligible evidence but must not invent arithmetic, rules,
  emotions or market classifications.
- Separate period status, session/data coverage, review state and confidence.
- The under-chart recap and weekly Coach view should reuse findings and the
  same focus; do not create two independent diagnoses.

## 10. Implementation sequence after content acceptance

1. Define a weekly recap view model with stage, coverage, story, optional
   highlights, qualified market context, evidence references and one focus.
   Map supported fields to the existing v1/v2 contracts without a broad migration.
2. Inventory and reuse existing session/ticker facts, review facts and notes.
   Identify which proposed findings are actually eligible. Audit market-source
   readiness separately; it is not a reason to invent a label or block all content.
3. Draft Monday/Tuesday, Wednesday/Thursday and Friday examples from synthetic
   cases. Evaluate relevance and voice before building the visual presentation.
4. Implement the smallest deterministic weekly summary/highlight slice; layer
   grounded synthesis over it only when needed and supported by the contract.
5. Validate progression, factual accuracy, evidence links, revisions and empty
   states, then integrate only after the requested implementation scope is clear.

Acceptance cases include: one active day, a holiday week, incomplete imports,
partial Friday, late corrections, a concentrated winner with sound process,
a planned losing trade, profitable rule-breaking, contradictory notes, missing
risk/setup context, an unchanged focus, missing market coverage, a cold market
with positive personal P&L and a hot market with negative personal P&L. Treat
these as synthetic test scenarios, not statements about actual trading.

## 11. Remaining content decisions

The cadence and P&L-first purpose are settled, and the first supported
highlight/context slice has been built as described below. Later work can
evaluate richer process evidence, grounded synthesis and focus review against
the retained proposals. Do not ask Justin to reselect the cadence. No new
schema, heat thresholds, permanent trading rules, or automated generation
schedule is accepted here.

## 12. First implementation — September 19, 2026

Built in the isolated `codex/progressive-weekly-recap` checkout, beneath the
existing Week → P&L chart. The deterministic view model is
[`src/lib/weeklyRecap.ts`](../../src/lib/weeklyRecap.ts); its presentation is
[`src/components/JournalWeeklyRecap.tsx`](../../src/components/JournalWeeklyRecap.tsx).
Implementation `230e665` is merged into local `main` and verified in the
canonical app at `localhost:4317`. No remote push or deployment was performed.

### Implemented progression and content

| Stage | Implemented visible content |
| --- | --- |
| Monday / Tuesday | Short recorded P&L story and saved weekly focus when present; development and outcome highlights sit inside the evidence disclosure |
| Wednesday / Thursday | Story plus session-end development, up to one positive and one negative trade highlight, qualified market observations and saved-focus trigger |
| Friday onward | The full deterministic recap in place: developing content plus net ticker breadth and either the saved focus with a review reminder or one evidence-led review question |

The story covers the available week, using its first and latest imported
sessions and running P&L. Development identifies a decline from the session-end
high, recovery from a negative session-end trough, or the largest daily move
and the other sessions' combined result. These are recorded session-end
relationships, not intraday drawdown or process assessments. Sparse or empty
weeks receive shorter factual reads rather than padded sections.

“Biggest contributor” and “Largest loss” rank positive and negative net realized
trade contributions within the selected week. A trade's partial exits and costs
across multiple activity days are combined by trade ID; lifetime trade P&L is
not substituted. Highlights list only the trade, its weekly contribution and
contributing weekdays. The separate “other trades” totals were removed on September 20
because they looked like additive parts of the weekly result. Their review
links select the trade, use its largest absolute-contribution activity day and preserve `returnTo`. The evidence table
links to each recorded day and shows its trade count, P&L and running P&L.
Full-format breadth aggregates net positive and negative results by ticker.
Outcome labels do not call a winner a good decision or a loss a mistake.

The recap reuses the saved Coach experiment's action and trigger for that same
account and week. It neither creates another focus nor evaluates adherence. If
no focus is saved, the full format can offer a question about the highlighted
trades and their entry plan, risk and exit notes; it does not prescribe a new
rule or adopt a lesson.

### Period, coverage and as-of boundaries

- Depth follows a fixed Monday–Friday calendar: early Monday/Tuesday,
  developing Wednesday/Thursday and full from Friday onward.
- Status is “Upcoming week” before Monday, “Week in progress” through all of
  Friday, then “Week ended” from Saturday. “Week ended” never means imports or
  review are complete; there is no session-cutoff finalization in this slice.
- Coverage distinguishes imported sessions, explicitly marked no-trade dates
  and past weekdays with no recorded activity. It always states that imports
  may be incomplete. Unknown weekdays are not asserted to be missing imports,
  holidays or intentional no-trade days.
- There is no authoritative exchange calendar or holiday-adjusted final
  session yet. The target holiday and Friday-finalization behavior in section 5
  remains future work.
- The model accepts an `asOfDate`, filters later sessions and excludes market
  observations updated after that date. Historical partial-week cases were
  tested at this model boundary. The UI uses the current ET date; it has no
  historical time-travel control or revision history. Date filtering is not an
  immutable reconstruction of what the trader knew at an earlier instant.

### Market evidence actually consumed

The recap reads existing per-session market-count records only. Eligible
records require `full` or `partial` coverage, `retrospective` or
`scanner-captured` provenance, and valid nonnegative integer mover counts with
the ≥100% count no greater than the ≥50% count. The recap shows raw ≥50% and
≥100% mover counts by day, identifies partial coverage and exposes source,
provenance, coverage and ET updated date in the evidence disclosure.

Only observations attached to imported trading sessions before the as-of date,
and updated on or before that date, are included. Same-day market observations
are withheld; observations for days with no imported trading session are not
included in this first slice. The full recap explicitly says when no qualified
observations are available. Record qualification is not certification of the
installed Trading Server runtime or capture completeness.

No new market capture, provider, storage, derivation, hot/cold labels or weekly
heat score was added. Counts do not prove conditions at entry, missed
opportunities or a trustworthy market classification. The richer market arc
and independently verified classifications in section 8 remain proposals.

### Presentation, exclusions and validation state

The implementation inherits the existing themes, typography, semantic colors,
open spacing and hairlines from the established Journal visual system. The
stats, week strip, cumulative chart and ticker-count popovers remain the frame
for the recap. This extends the current surface; it establishes no new visual
world or design-token contract. Evidence uses native disclosure, visible link
focus states and a horizontally recoverable table at narrow widths.

This slice adds no model generation, v2 runtime migration, process judgments,
note-based recurrence findings, prior-focus evaluation, learning-loop changes,
automatic schedule or database schema changes. Those retained content proposals
must not be presented as shipped capabilities.

Validation passed: 18 focused tests, desktop/narrow-screen browser interactions,
independent visual review and `npm run verify:full` (with an existing NFT warning).
Canonical verification also passed: recap, preserved chart, keyboard evidence
disclosure and exact trade navigation/return, with no page errors. The temporary
demo preview server was stopped. See the session worklog for delivery state.


## 13. Evolving coaching evidence — September 20 build

Justin wants the recap to improve as trade reviews, setup descriptions,
intentions and reflections accumulate. More complete note-taking is not a
prerequisite for useful factual comparisons. This slice reuses existing
Analytics completed-trade calculations and shared market-history evidence.

- The main Journal P&L retains its existing realized-activity accounting.
  The coaching breakdown explicitly covers verified completed intraday trades;
  swing, open and unreconstructable activity is excluded from that sample.
  This keeps partial exits and completed-trade attribution from being silently
  mixed. Included/excluded counts and recorded-fee coverage remain inspectable.
- Show average winner/loss and payoff, consistently weighted net P&L per opening
  share, typical winner/loser duration, peak shares/capital and gross/fees/net.
  Capital is exposure, not planned risk. Neither share count nor P&L establishes
  that a position was oversized.
- Rank a few supported economic/management findings with exact linked trades.
  Early week shows at most one, midweek two, and the full week three. A fact from
  one session is an observation; recurrence needs separate occasions. Comparisons
  use compatible measurements and prior data only. The baseline covers the
  prior 30 calendar days with the same intraday scope; counts and differences
  in size, setup mix and fee coverage are disclosed. Hold-time comparisons
  group by side and entry-price band, without implying matched setups.
  Fee-flip findings lead only when their combined net loss reaches the sample
  mean absolute trade result; smaller exceptions rank below payoff, hold and
  baseline comparisons. This is a display-salience rule, not a risk judgment.
  Do not copy unvalidated
  starter Coach diagnoses wholesale.
- Shared market evidence covers elapsed weekdays, including days with no
  personal trades. Match tickers on the same date and show retrospective Core
  mover rankings, with candidate/scanner coverage. Candidate recovery is a
  bounded population even when recovery is complete; missing records do not
  establish Cold or a missed opportunity. Same-day full-session context is
  withheld until the following ET date. Per-day reads are bounded and failures
  must not prevent reviewing personal trading results. Public day records are
  coalesced in a bounded three-minute process cache; account overlaps are
  calculated separately. Each server read has a three-second timeout. The
  trade loader selects the target weeks plus the prior baseline by ET execution
  dates, then reconstructs complete fill histories only for eligible trade IDs.
- Original notes and saved focus are preserved. The app does not generate new
  psychological explanations, silently adopt lessons or declare focus adherence.
  Reviews can later establish why a behavior occurred. Opportunity-capture
  grading and calibrated market heat remain separate from this slice.
- Matched-mover net P&L uses same-day ticker realized activity, the same basis
  as the main Journal results. It is separate from the completed-intraday
  coaching sample. It measures participation, not achievable move capture.

Implementation and verification state is recorded in PROJECT_STATUS.md. This
extends the established weekly interface; it does not require a new visual
system, database schema, dependency or automatic model-generation schedule.


## 14. Weekly flags and day reflections — September 20

The week highlights one session worth reviewing; the day is the home for detailed
reflection. Candidate flags are the only red session among at least two imported
sessions, the largest negative in-week trade contribution, and a recorded
green-to-red giveback. Overlapping signals are combined into one callout, ranked
by signal count, economic impact, then date. Imported sessions are not assumed to
be the complete week. Multi-day trade contributions are explicitly qualified.

The recorded curve uses imported trade-activity endpoints. Equal-time endpoints
are collapsed; invalid/out-of-order curves and closing endpoints that do not
reconcile with the session result are withheld. This is not an open-equity high,
mark-to-market drawdown, or a claim about peaks between recorded endpoints.

Review day / Continue review links directly to Day → Coach and its reflection.
The day surfaces authored per-trade sections from ticker reviews, with links
back to the matching ticker/day editor. It does not create a review merely
because a trade was the largest loss; Add trade review exposes the day's ticker
workspaces for further review.
When available, its size comparison uses at least two earlier completed trades
in the same session, side and entry-price band; it describes exposure, not
planned risk or setup equivalence.
Continue review means a nonblank day note exists, not that the trader has marked
the review complete. No explicit review-completion state is added in this slice.

The existing account-scoped day note remains the single saved source. Its
freeform reflection and three optional questions are presented in separate
fields with typing/dictation support. Complete, exact, ordered legacy question
blocks can be displayed as separate answers; ambiguous or partial blocks remain
freeform. Saving serializes into the existing note body; no schema migration or
automatic note rewrite. Legacy fields are preserved in the freeform text.
Questions ask about the first decision to change, pre-entry setup/size/maximum
loss, and pause/resumption criteria. They are deterministic starter questions,
not an adaptive interview. Answers remain trader-authored context, never system
instructions or a rule the app silently adopts.

Day → P&L also offers “Review your day” beneath the chart, using the same
note composer and dictation. It displays and edits the general reflection only;
saved guided answers remain intact and are accessible in Coach. Empty notes
show the editor immediately, including days without imported trades. Save note
uses the existing day-note storage and does not request AI generation.

Save answers only saves. Save & refresh Coach saves first, then explicitly
requests a day review using the current context. Successful refresh reveals the
AI output; a failed refresh leaves the saved note and previous valid feedback
available. Plain note edits never generate automatically. Feedback freshness
compares saved note context with current account-scoped notes; a stale message
prompts an explicit refresh. This is a note-context comparison, not a guarantee
that all market data or model settings are unchanged.

Weekly generated feedback includes date-labeled daily reflections within the
selected week, alongside its weekly note and trade context. Month reviews use
the same date-bounded reflection collection. Ticker notes accompany trade notes
as distinct context rather than replacing individual-trade annotations. Automatic numeric
recaps remain separate from AI interpretation. A reflection may inform a day
review and a weekly synthesis without duplicating its storage. A single session
must not be presented as a persistent psychological pattern.

The live v1 envelope permits an optional refresh error alongside a previous
valid review. On failure, the prior generatedAt, model, review and payloadJson
remain intact; errorAt records the failed attempt. Concurrent refreshes compare
and update the saved payload/review atomically so late work cannot overwrite a
newer stored result. This does not implement the proposed v2 review history.
