# Competitive Analysis: Trading Journals And Coaching

> Status: **Working brief v1** · Last updated: 2026-07-12
> Scope: Tradervue, TradeZella, TraderSync, TradesViz, Edgewonk, TradeNote,
> Close the Trade, and Trading Discipline Lab, plus selected architecture and
> workflow research. Public product pages, documentation, repositories, and
> limited public user anecdotes were reviewed.

## Executive Read

Trading journals have largely converged on the same foundation: broker import,
trade reconstruction, charts, notes, screenshots, tags, filters, replay, and a
large catalog of statistics. Several products now add AI summaries, natural-
language questions, automated tags, or conversational coaching. Those features
raise the table stakes, but they do not by themselves prove that the trader will
change a behavior.

The stronger opportunity is the gap between **recording information and
changing behavior**. Traders describe import cleanup, manual setup tagging,
subscription cost, and reviewing statistics without finding an actionable
behavior as friction. Those anecdotes are limited, but they align with the
product problem we are already solving: turn fills, playbook rules, and human
context into one evidence-backed conclusion and one measurable experiment.

This remains a **product hypothesis**, not a demonstrated outcome. We still
need to prove that our system can reconstruct the session correctly, distinguish
process quality from trade outcome, use the trader's playbook and notes without
inventing evidence, and recommend an experiment precise enough to evaluate on a
later session.

The product should therefore not be positioned as another analytics-heavy
journal or as merely a private/local journal. Its defensible promise is a
**private, playbook-driven trading coach** that closes the loop from evidence to
reflection to a measurable next action.

## The Job To Be Done

After a session, the trader needs to answer four questions quickly:

1. What actually happened?
2. Was the result caused by a good process, a bad process, or noise?
3. What evidence supports that conclusion?
4. What is the one behavior to test in the next comparable session?

Most competitors are strong on the first question and increasingly capable on
the second. The opportunity is to make questions three and four trustworthy,
specific, and persistent.

## Market Baseline

These capabilities should be treated as table stakes rather than the primary
product story:

- Broker CSV import and, eventually, broker sync.
- Execution grouping and entry/exit charting.
- Daily and per-trade notes.
- Screenshots, tags, setup labels, and mistake labels.
- Calendar, P&L curve, filters, and standard performance reports.
- MAE/MFE, time-of-day, setup, symbol, and risk breakdowns.
- Templates or prompts that reduce journaling friction.
- Some form of AI summary, AI query, or automated insight.

Rich text is useful but not currently differentiating. A lightweight structured
composer with prompts, quick fields, screenshots, and dictation better serves
the coaching loop than a Word-style editor. The structure should improve the
quality of context available to the coach without making journaling feel like a
form to complete.

## Competitive Landscape

| Product | Primary strength | Coaching/behavior layer | Important implication |
| --- | --- | --- | --- |
| [Tradervue](https://www.tradervue.com/trading-journal-template) | Mature import, charts, notes, tagging, reports, sharing, and mentor access. | Human mentor collaboration; no meaningful first-party AI coach found in the reviewed material. | Reliable journaling and analytics are established expectations. Templates and flexible note scopes reduce capture friction. |
| [TradeZella](https://www.tradezella.com/) | Polished all-in-one product with import, replay, backtesting, education, and Zella AI. | Public positioning says AI reads trades, rules, and strategies and automatically produces session reviews and behavioral findings. | Automated recaps and rules-aware AI are no longer unique claims. We must compete on evidence quality and the learning loop. |
| [TraderSync](https://tradersync.com/) | Broad broker support, replay, flexible reports, and AI analysis. | Cypher provides AI analysis/coaching with tier-based usage. | Conversational access is expected; a chat box alone is not a product advantage. |
| [TradesViz](https://www.tradesviz.com/ai-trading-journal/) | Very broad analytics, simulations, dashboards, and natural-language AI features at relatively low cost. | AI query, summaries, notes, and coach operate across the trader's data. | This is the closest competitor to a deterministic analytics engine plus an AI explanation layer. Depth can also create cognitive overload. |
| [Edgewonk](https://edgewonk.com/) | Structured process, psychology, mistake tracking, checklists, plans, and performance analysis. | Behavior and discipline are made measurable through reports, checklists, and rule-break tracking. | Structured reflection does not require AI. Our coach should build on deterministic process evidence, not replace it. |
| [TradeNote](https://tradenote.co/project-overview.html) | Open-source, self-hosted journal focused on privacy, simplicity, analytics, diary, screenshots, and playbook. | Satisfaction marking and qualitative context, but no evidence of a generated coaching loop in the reviewed docs. | Local ownership and privacy are validated needs, but they are not a moat by themselves. |
| [Close the Trade](https://www.closethetrade.com/) | Voice reflection paired with fill data, behavioral pattern detection, and an explicit improvement narrative. | AI compares the trader's stated thesis with executions and exposes behavioral patterns with confidence. | This is the closest direct articulation of the same user problem. Our distinction must come from playbook grading, reconstruction rigor, cited evidence, and experiment follow-through. |
| [Trading Discipline Lab](https://www.tradingdisciplinelab.com/) | Deterministic behavior signals, rule simulation, playbook adherence, and weekly discipline review. | Ranks quantitative signals, keeps discipline labels separate, and feeds grounded results into an AI action plan and account-level chat. | This is the closest public end-to-end learning loop found so far. The architecture itself is not a moat; correctness, evidence, interaction quality, and longitudinal usefulness must differentiate us. |

Feature and pricing claims are time-sensitive and should be rechecked before
being used in external marketing. Competitor-owned comparison pages are useful
for understanding positioning, not as neutral proof of superiority.

## External Architecture Validation: Claude Trade-Review Video

Research item:
[How To Use Claude To Review Your Trades (The Right Way)](https://www.youtube.com/watch?v=qh3AohVimGw).
The direct YouTube page could not be retrieved through the research text
fetcher, so this section records the user-supplied video summary and should not
be treated as an independently verified transcript.

The video proposes the same core boundary as this project:

```text
broker fills + strategy rules + market data
                     ↓
         deterministic audit engine
                     ↓
         compact evidence/fact payload
                     ↓
              narrative AI coach
```

The important idea is not “use Claude.” It is that an LLM should not perform
trade reconstruction, arithmetic, market-data alignment, or counterfactual
replay from raw rows in its context window. Code should produce reproducible
facts; the model should interpret those facts, explain uncertainty, and ask for
missing human context.

### Video blueprint mapped to this project

| Video layer | Project equivalent | Current confidence |
| --- | --- | --- |
| Broker data and price bars | TOS/DAS/Tradervue adapters, canonical fills, Massive candles, and local candle cache. | Strongest layer. Reconstruction and candle alignment have real-data validation, although edge cases remain. |
| Strategy and rules | Playbook, setup definitions, risk rules, and prose-to-candidate-rule workflow. | Specified; structured rule coverage and versioning still need implementation depth. |
| Deterministic audit | Review engine, robustness checks, risk calculations, and candidate findings. | Partial. Session facts and confidence exist; executable rule replay and broader counterfactuals are not yet proven. |
| Dashboard | Analytics views and coach recap spine with progressive disclosure. | Prototype stage. Information hierarchy is testable; longitudinal workflow value is not. |
| AI coaching | Compact fact payload, evidence-backed narrative, targeted questions, corrections, and experiments. | Architecture is defined; coaching quality and behavior change remain the central unproven hypothesis. |

The source also proposes strategy presets, manual quantitative rules, and AI
translation from plain English into a rule schema. For this product, presets
should remain optional examples rather than force traders into generic strategy
categories. The higher-value workflow is:

1. The trader describes the rule naturally.
2. The model proposes a structured, testable interpretation.
3. The trader confirms or edits it.
4. The versioned rule becomes eligible for deterministic grading.

An AI-generated rule must never become official without trader confirmation.

### Discipline cost and counterfactual replay

The video's proposed **discipline cost** is valuable but easy to overstate. A
safe version compares actual results with a deterministic replay of an explicit
rule, such as stopping after two losses, excluding off-plan trades, respecting
the recorded stop, or enforcing the declared size cap.

The result should be labeled **simulated rule delta**, not “money the trader
would have made.” At minimum, disclose:

- The exact rule and rule version.
- The trades included, changed, or excluded.
- Actual P&L and simulated P&L.
- Avoided losses and missed gains separately.
- Change in drawdown, trade count, win rate, and profit factor.
- Sample size and date range.
- Candle resolution and execution assumptions.
- Whether later trades were held constant or the replay modeled path-dependent
  changes.

Counterfactuals are credible only when the rule is executable, the required
intent was recorded before the outcome, and the replay can reproduce the
relevant order/price path. Otherwise, present the finding as a descriptive
filter—for example, “off-plan trades lost $84”—rather than a causal claim.

The public workflow described by
[Trading Discipline Lab](https://www.tradingdisciplinelab.com/) independently
reinforces this pattern: deterministic before/after rule simulations, explicit
lists of excluded trades, adherence tracking after a rule enters the playbook,
and an AI layer grounded in ranked behavior signals. This increases confidence
that the problem and architecture are real, while raising the bar for our
implementation.

## Ranked User Problems And Product Leverage

### 1. Import correctness is a prerequisite for trust

- **User goal:** Import a session once and trust that fills, round trips, fees,
  and P&L are correct.
- **What breaks:** Unsupported formats, duplicate imports, partial fills,
  scale-ins/outs, open positions, time zones, and swing trades can require
  cleanup or silently distort the review.
- **Evidence:** Every competitor emphasizes broker coverage. TradeNote's own
  [import documentation](https://tradenote.co/importing-trades.html) describes
  date-level re-import constraints and swing-trade P&L caveats. Its public
  [issue tracker](https://github.com/Eleven-Trading/TradeNote/issues) also shows
  recurring broker and parsing requests.
- **Severity:** Critical.
- **Frequency signal:** Strong category-wide signal; exact failure rates are
  unknown.
- **Confidence:** High that the problem matters; medium on relative competitor
  performance.
- **Product move:** Treat reconstruction confidence, reconciliation, warnings,
  idempotent re-import, and inspectable calculations as user-facing product
  features—not backend implementation details.

### 2. Capturing useful context requires too much manual classification

- **User goal:** Preserve why the trade was taken and whether the process was
  followed without spending another trading session journaling.
- **What breaks:** Freeform notes are inconsistent; detailed templates become
  chores; setup and mistake tags are easy to skip or apply inconsistently.
- **Evidence:** The category repeatedly offers tags, templates, screenshots,
  checklists, diary entries, and now auto-tagging. Tradervue supports trade,
  daily, and general notes; TradeNote combines diary, tags, satisfaction, and a
  yearly playbook; Edgewonk emphasizes checklists and mistake tracking.
- **Severity:** High.
- **Frequency signal:** Strong product-response signal; direct user research is
  still limited.
- **Confidence:** Medium-high.
- **Product move:** Capture feedback at the ticker/trade level using quick
  structured inputs plus optional prose or dictation. Ask only for context the
  engine cannot infer. Roll that context into the daily coach recap.

### 3. Analytics describe performance without selecting a behavior

- **User goal:** Know what to do differently tomorrow.
- **What breaks:** Hundreds of metrics and filters can reveal correlations but
  leave the trader to decide which finding is reliable, causal, and actionable.
- **Evidence:** TradesViz advertises hundreds of visualizations, while most
  major journals emphasize extensive reports and filtering. The existence of
  new AI summary and coach products is itself evidence that raw analytics alone
  leave an interpretation gap. Public anecdotes support this direction, but
  the sample is small and self-selected.
- **Severity:** High.
- **Frequency signal:** Medium.
- **Confidence:** Medium.
- **Product move:** Rank candidate findings deterministically. Surface one
  conclusion, its strongest evidence, relevant counterevidence, confidence, and
  one measurable experiment. Keep advanced segmentation available through
  progressive disclosure.

### 4. AI feedback can sound useful without being trustworthy

- **User goal:** Receive a conclusion that is specific to the session and safe
  to act on.
- **What breaks:** Generic summaries, unsupported causal language, outcome bias,
  and opaque calculations can produce persuasive but unverifiable advice.
- **Evidence:** TradeZella, TraderSync, TradesViz, and Close the Trade all make
  AI analysis part of their positioning. Public pages demonstrate feature
  availability, but do not independently establish coaching accuracy or
  behavior change.
- **Severity:** High.
- **Frequency signal:** Unknown; public validation is weak.
- **Confidence:** High that trust is necessary; low on comparative product
  quality without hands-on testing.
- **Product move:** Keep calculations deterministic and auditable. Require the
  narrative layer to cite the fills, notes, rules, segments, and sample sizes
  behind each claim. Use `Unknown` when evidence is missing. Ask a targeted
  question rather than inventing intent.

### 5. Cost and data ownership create switching pressure

- **User goal:** Keep a durable trading record without expensive recurring
  subscriptions or surrendering sensitive financial data.
- **What breaks:** Important features sit behind higher tiers; changing tools
  can strand notes, tags, screenshots, and historical context.
- **Evidence:** Subscription pricing is common across the category. TradeNote
  explicitly positions self-hosting, security, privacy, simplicity, and data
  control as its reason to exist. Its source is available under GPLv3 on
  [GitHub](https://github.com/Eleven-Trading/TradeNote).
- **Severity:** Medium-high.
- **Frequency signal:** Medium.
- **Confidence:** Medium-high.
- **Product move:** Preserve local-first storage, transparent exports, and low
  operating cost. Position them as trust foundations supporting the coach—not
  as the complete differentiation.

## TradeNote Deep Dive

TradeNote is the closest match to the project's **foundation**:

- Local/self-hosted ownership and privacy-oriented positioning.
- Broker import, analytics, filtering, charts, MFE, tags, screenshots, and
  mobile responsiveness.
- A daily diary for thoughts, events, feelings, and trader psychology.
- A yearly playbook for setups, practices, and objectives.
- A simple satisfaction signal for marking a trade or day good/bad according
  to the trader's rules.

Its public documentation presents `Analyze` and `Reflect` as two complementary
areas. However, no reviewed page shows a system that grades executions against
the playbook, identifies missing context, asks a targeted follow-up question,
or carries a measurable experiment into a later recap. The diary and playbook
appear to be useful inputs and reference stores rather than an active learning
loop.

This creates two direct lessons:

1. TradeNote invalidates “open-source/private/local trading journal” as a
   unique product position.
2. It validates the raw materials our coach needs while leaving room to connect
   those materials into an evidence-backed behavior loop.

TradeNote's binary satisfaction control is worth learning from because it is
fast. We should preserve that speed while avoiding a false equation between
outcome and execution. `Strong / Mixed / Weak / Unknown`, accompanied by a
brief reason when needed, gives the coach a more useful signal.

### License boundary

TradeNote is GPLv3. Its product decisions, public UX, and data concepts can be
studied, but source code should not be copied into this project without an
explicit GPL-compatible licensing decision and review.

## Proposed Product Position

> A private, playbook-driven trading coach that turns your fills and reflection
> into one evidence-backed conclusion and one measurable next-session
> experiment.

### What is not the moat

- A trading journal.
- Local-first storage by itself.
- Charts and a ticker summary.
- Large numbers of reports.
- Rich text notes.
- An AI chat surface.
- An automatically generated daily paragraph.

### What could become defensible

- High-confidence reconstruction with visible provenance and reconciliation.
- A versioned playbook expressed as rules the engine can actually evaluate.
- Explicit separation of good process from good outcome.
- Coach claims gated by sample size, robustness, and contradictory evidence.
- Trader corrections and answers that update the recap instead of disappearing
  into a note archive.
- A single experiment that persists across comparable sessions and is later
  evaluated by the same system.
- A growing, private memory of how this trader learns—not just how they trade.

## Risk Management As A Coaching Layer

Risk should be a first-class part of the product, not another statistics tab.
The useful question is not only **how much did the trader lose?** It is **what
risk did the trader intend to take, what risk did they actually expose, and did
their behavior remain inside the rules they chose before the outcome was
known?**

The system must keep three categories separate:

1. **Declared risk:** The trader's pre-session and pre-trade plan.
2. **Observed risk:** What fills, positions, timestamps, and candles prove
   happened.
3. **Assessed risk:** The coach's evidence-backed evaluation of alignment
   between the first two.

### What can be calculated from fills

The following do not require the coach to infer intent:

- Realized gross and net P&L.
- Initial quantity, maximum open quantity, and maximum gross exposure.
- Position-size changes, including adds after price moved against the entry.
- Loss size and loss concentration by trade, ticker, and time window.
- Consecutive losses and realized session drawdown.
- Size escalation or trade-frequency escalation after a loss.
- P&L given back from the session high.
- Actual exit price and slippage relative to a recorded stop.
- MAE and MFE when candle coverage and resolution are sufficient.

MAE and MFE describe what price did after entry. They are useful for evaluating
trade management, but neither one is a substitute for the trader's planned
risk.

### What must be declared or reliably snapshotted

The following cannot be reconstructed safely from the final P&L:

- Initial stop or structural invalidation at entry.
- Planned dollar risk for the trade.
- Intended position size and permitted add logic.
- Account equity or the risk budget used for percentage-of-account measures.
- Daily max loss and stop-trading threshold.
- Maximum loss streak before a pause.
- Setup-specific sizing or risk limits.
- Whether a later stop change was planned, protective, or emotional.

These values should be optional but strongly encouraged. When they are absent,
the recap should say what cannot be evaluated and ask one focused question only
when the answer would materially change the conclusion.

### Core calculations

For a long trade:

```text
risk_per_share = entry_price - initial_stop
```

For a short trade:

```text
risk_per_share = initial_stop - entry_price
```

Then:

```text
planned_risk_dollars = risk_per_share × planned_or_initial_quantity
realized_R = net_realized_pnl ÷ planned_risk_dollars
risk_budget_utilization = planned_risk_dollars ÷ allowed_risk_dollars
size_variance = actual_max_quantity ÷ planned_quantity
adverse_stop_slippage_long = planned_stop_price - actual_stop_exit_price
adverse_stop_slippage_short = actual_stop_exit_price - planned_stop_price
```

Positive adverse stop slippage means the exit was worse than planned. Ratio
metrics are calculated only when their denominator is positive. Fees may be
reported separately from initial market risk while net P&L remains the numerator
for realized R. The convention should be explicit and consistent throughout the
product.

For scale-ins, the first implementation should preserve both:

- **Initial planned risk:** the risk accepted when the position was opened.
- **Maximum actual risk:** the largest open risk after adds, using the active
  recorded stop at that moment when available.

This prevents a later add from making the original plan look safer than the
actual position became.

### Session-level risk measures

The coach can compare the session with the trader's declared guardrails:

- Maximum planned and actual risk on any trade.
- Total realized loss versus the daily max-loss limit.
- Worst peak-to-trough realized drawdown.
- Largest trade as a share of total session loss or gain.
- Risk consistency across trades with valid planned-risk data.
- Size after a loss compared with size before the loss.
- Number and cost of trades taken after a pause or stop threshold.
- Number of adds to losing positions or stops moved farther from invalidation.
- Percentage of trades with a defined stop before entry.
- Percentage of trades that remained within the setup's sizing rule.

These are process measures. A red day can still be classified as controlled
risk, while a green day can contain an unacceptable rule breach.

### Documentation model

Risk data should live in four connected places:

| Scope | What is documented | Product role |
| --- | --- | --- |
| Playbook | Durable risk rules, sizing rules, setup invalidation, permitted adds, and hard/soft limits. | Defines the standards the coach grades against. |
| Session plan | Daily max loss, current risk posture, reduced-size conditions, and pause/stop rules. | Captures the day's active guardrails before trading. |
| Trade snapshot | Initial stop, planned quantity, planned dollars at risk, target, and later approved plan changes. | Preserves intent at the time of action. |
| Review | Derived exposure, actual behavior, rule alignment, trader explanation, confidence, and evidence links. | Produces the coaching conclusion and next experiment. |

Pre-trade risk snapshots should be immutable history. A trader may correct an
obvious data-entry error, but later edits must not silently rewrite what the plan
was at entry.

### Recap presentation

Risk should appear in the main recap only when it materially explains the day.
Useful coach language includes:

> **Contained-risk red day.** All four planned stops were respected and total
> loss remained below the daily limit. The result was negative, but no material
> risk breach was detected.

> **One risk event drove the damage.** The second PFSA entry reached 1.8× the
> planned size after the first stop area failed and produced 74% of the day's
> loss.

> **Risk quality is unknown.** The fills show a $6.52 loss, but no initial stop
> or planned risk was recorded. R-multiple and stop adherence cannot be graded.

The default facts strip can show a short risk state such as `Contained`,
`Breached`, or `Unknown`. Detailed R distributions, drawdown paths, MAE/MFE,
and sizing calculations belong in the evidence disclosure rather than the
top-level recap.

### Risk experiments

The coach's recommendation should describe a behavior that can be observed,
not simply “manage risk better.” Examples:

- Record the structural stop before entry on every A and B setup for the next
  three sessions; target at least 90% planned-risk coverage.
- After the first full-stop loss, cap the next trade at 0.5R; compare rule
  adherence and session drawdown across five occurrences.
- Do not add after price closes below the original invalidation; measure adds
  avoided and dollars of additional loss prevented.
- Stop initiating new trades when realized session P&L reaches the declared
  max-loss threshold; evaluate compliance across the next ten sessions.

Risk coaching must remain retrospective and educational. It should evaluate the
trader's own declared rules and historical behavior, not issue live position or
security recommendations.

## Recap Spine Implications

Use one recap structure with progressive disclosure rather than separate
beginner, intermediate, and advanced products:

- **Beginner:** Plain-language session conclusion, process-versus-outcome
  explanation, one question when context is missing, and one concrete practice.
- **Intermediate:** Playbook alignment, the key ticker/trade to inspect, and the
  evidence supporting or contradicting the conclusion.
- **Advanced:** Segmentation, robustness, trend vote, counterfactuals,
  calculation detail, and confidence—collapsed until requested.

The primary daily page should focus on coach feedback. Notes originate at the
trade/ticker level and feed upward. The day-level interface should ask only the
questions needed to resolve ambiguity. After imports and context are ready, the
explicit state transition is **Generate recap**; after an answer or correction,
it becomes **Update recap**.

## What We Still Need To Prove

The core hypothesis is:

> Given trustworthy fills, an explicit playbook, and lightweight trader
> context, the system can choose a more useful next behavior than the trader
> would get from reviewing standard journal analytics alone.

That hypothesis should be evaluated in layers.

### Technical truth

- Imported P&L reconciles to the broker statement.
- Fill grouping, direction, fees, and timestamps are inspectable.
- The review engine produces the same facts every time from the same inputs.
- Missing evidence lowers confidence instead of being filled by the model.

### Coaching truth

- Every material coach claim links to supporting facts or trader-authored
  context.
- The recap distinguishes process quality from monetary outcome.
- The recommended experiment specifies a trigger, behavior, and observable
  measure.
- The system can recognize later whether the experiment was attempted and what
  happened.

### User value

- The trader reaches a credible conclusion faster than with their current
  journal workflow.
- The trader can explain why the coach reached its conclusion.
- The trader accepts, edits, or rejects the experiment rather than ignoring it.
- Across multiple sessions, the trader follows the experiment often enough to
  generate evaluable evidence.
- The resulting behavior or process score improves; P&L is a lagging outcome,
  not the sole success metric.

### Suggested private evaluation

Run the same real session through the current journal and selected competitors.
For each product, record:

1. Import time and required cleanup.
2. Reconstruction errors or ambiguous trades.
3. Time required to add useful context.
4. The strongest conclusion produced.
5. Evidence supplied for that conclusion.
6. Whether the recommended action is measurable.
7. Whether the product checks that action in a later session.

TradeNote, TradesViz, Close the Trade, and Trading Discipline Lab are the
highest-priority benchmarks: TradeNote for the local journal foundation,
TradesViz for analytics plus AI, Close the Trade for voice/context paired with
executions, and Trading Discipline Lab for deterministic rule simulation and
the longitudinal discipline loop.

## Opportunity Map

### Now

- Keep the recap prototype focused on conclusion, evidence, one question, and
  one experiment.
- Make import confidence and calculation provenance visible where they affect a
  conclusion.
- Define the minimum structured playbook rule that can be graded reliably.
- Use trade/ticker notes as coach inputs, not as the centerpiece of the daily
  recap.

### Next

- Persist coach questions, trader answers, corrections, and accepted
  experiments as first-class data.
- Add experiment status: proposed, accepted, attempted, passed, failed,
  inconclusive, or retired.
- Add deterministic candidate ranking so the narrative model does not choose
  the day's lesson from scratch.
- Benchmark recap quality against a statistics-only control and at least one
  competitor workflow.

### Needs deeper research

- Conduct direct interviews or diary studies with beginner, intermediate, and
  advanced momentum traders.
- Observe complete post-market workflows rather than asking only which features
  traders want.
- Test willingness to provide structured context versus voice/freeform input.
- Determine which evidence and confidence explanations increase trust without
  overwhelming the recap.
- Validate whether traders return to an experiment and whether that behavior
  changes over multiple sessions.

## Source Map And Confidence

### Stronger sources

- Official feature, documentation, pricing, and product-positioning pages for
  [Tradervue](https://www.tradervue.com/trading-journal-template),
  [TradeZella](https://www.tradezella.com/),
  [TraderSync](https://tradersync.com/),
  [TradesViz](https://www.tradesviz.com/ai-trading-journal/),
  [Edgewonk](https://edgewonk.com/),
  [TradeNote](https://tradenote.co/key-features.html),
  [Close the Trade](https://www.closethetrade.com/), and
  [Trading Discipline Lab](https://www.tradingdisciplinelab.com/).
- TradeNote's public
  [project documentation](https://tradenote.co/project-overview.html),
  [diary/playbook documentation](https://tradenote.co/diary-playbook.html), and
  [GitHub repository](https://github.com/Eleven-Trading/TradeNote).

These sources establish what products claim to provide. They do not prove that
the claimed features are accurate, useful, or behavior-changing.

### Weaker sources

- Reddit threads, reviews, search snippets, founder comparisons, and product
  testimonials provide useful language and pain-point hypotheses but are
  anecdotal, self-selected, and sometimes commercially motivated.
- The Claude trade-review video outline is user-supplied research context. The
  direct YouTube page was not available to the text fetcher, so exact wording
  and completeness have not been independently verified.
- Public evidence about sustained behavior change is especially weak across the
  entire category.
- No hands-on comparison using the same broker statement has been completed
  yet.

Accordingly, statements about recurring friction are directional research
signals. Statements about our coach improving trader behavior remain hypotheses
until tested through the private evaluation plan and longitudinal use.
