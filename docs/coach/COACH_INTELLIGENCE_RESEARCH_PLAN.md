# Coach Intelligence Research Plan

> **Status:** Draft research plan · 2026-07-22
>
> **Purpose:** Define the evidence, relationships, evaluation work, and product
> boundaries required to make the Coach more insightful and more human without
> allowing the language model to invent analysis.
>
> **Inputs:** Current Coach and analytics implementation, the owner-supplied
> coach-layer design notes and tone examples, and a July 2026 refresh of public
> competitor positioning.

## Executive position

The Coach does not primarily have a tone problem. It has three related limits:

1. **A data ceiling:** important intent fields such as planned stop, setup,
   trigger, size, and exit condition are present inconsistently or not captured
   at the moment they matter.
2. **A relationship ceiling:** the deterministic engine calculates useful
   session facts, but it does not yet produce a broad enough set of evidence-
   gated relationships for the Coach to choose among.
3. **A presentation ceiling:** some outputs repeat visible statistics or expose
   internal analytical labels instead of turning the evidence into meaning.

The target system is:

```text
capture intent
  -> reconstruct execution and causal chart context
  -> compute many eligible relationships
  -> gate and rank credible findings
  -> let the Coach select, connect, and explain
  -> adopt one measurable experiment
  -> evaluate it in later comparable sessions
```

The language model owns selection, synthesis, questions, and phrasing. It does
not own arithmetic, indicator calculation, pattern qualification, or causal
claims.

## Relationship to existing specifications

This document is the research index for several more specialized documents. It
does not replace them.

- [VOICE.md](VOICE.md) defines the house register: read, receipt, next rep.
- [FYL_DETERMINISTIC_REVIEW_PROCESS.md](FYL_DETERMINISTIC_REVIEW_PROCESS.md)
  defines the causal chart and Find Your Levels boundary.
- [REVIEW_ENGINE_SPEC.md](../analytics/REVIEW_ENGINE_SPEC.md) defines the
  deterministic session statistics engine.
- [EDGE_ATTRIBUTION_PLAN.md](../analytics/EDGE_ATTRIBUTION_PLAN.md) defines
  expectancy conditioned on trade characteristics.
- [OPPORTUNITY_SET_CAPTURE_PLAN.md](../analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md)
  defines the missed/avoided/traded opportunity set.
- [COACH_REVIEW_SCHEMA_V2.md](../product/COACH_REVIEW_SCHEMA_V2.md) defines the
  target evidence-linked Coach output contract.
- [AI_FIRST_DAILY_RECAP_PLAN.md](../product/AI_FIRST_DAILY_RECAP_PLAN.md) defines
  recap hierarchy and interaction.
- [PRIVATE_EVALS.md](PRIVATE_EVALS.md) defines how real trading cases remain
  local and how model output is evaluated safely.

Where those documents disagree with the live implementation, this plan records
the gap; it does not silently treat a drafted capability as shipped.

## Product question

The Coach should help the trader answer, in this order:

1. What actually happened?
2. What was knowable when the decision was made?
3. Did the trader's action match their intended process?
4. What relationship best explains the session without overstating certainty?
5. What should be repeated, investigated, or tested next?
6. Did the chosen experiment change behavior in later comparable sessions?

The Coach is successful when it makes a trustworthy relationship legible and
changes the next review decision. Generating an impressive paragraph is not a
success criterion by itself.

## Current capability map

### Implemented in the runtime

| Layer | Available today | Primary implementation |
| --- | --- | --- |
| Broker truth | Executions, grouped trades, entry/exit, quantity, fees, P&L | `src/lib/db/schema.ts`, import pipeline |
| Execution behavior | Adds, adverse adds, average-down behavior, execution-derived facts | `src/lib/executionAnalysis.ts` |
| Causal entry context | EMA9/20, VWAP, structure, volume, extension, failed attempts, FYL direction, price-action read | `src/lib/coach/opportunityContext.ts` |
| Hindsight management context | MFE, MAE, capture ratio, post-entry path | opportunity context and candle cache |
| Session economics | Net, win rate, profit factor, payoff, breakeven win rate, expectancy, R when available | `src/lib/coach/reviewEngine.ts` |
| Session structure | Tail robustness, ticker/time/price segments, same-symbol re-entry, giveback, dominant mechanism | `src/lib/coach/reviewEngine.ts` |
| History | Prior-window baseline and four-signal trend vote | `src/lib/coach/reviewEngine.ts` |
| Human context | Day/ticker/trade notes, followed-plan field, emotion/process tags | journal tables and review actions |
| Coach context | Freeform playbook and rubric, structured v1 payload, saved review | coach actions and payload |
| Carry-forward | Saved day/week/month experiment | `coach_experiments` |

### Designed but not fully wired

- Evidence references on every Coach claim.
- Structured findings, rule evaluations, review queue, recurring pattern, and
  playbook candidates from Coach Review Schema v2.
- Addressable playbook rules with stable IDs.
- Opportunity-set capture for names not traded.
- Setup and broader feature-conditioned edge attribution.
- Finding reactions: accepted, corrected, dismissed, or investigated.
- Experiment attempt/result evaluation across later sessions.
- Tone and explanation-depth personalization.
- Model-directed read-only analytical queries.

### Known presentation problems

- `statisticalRead` can narrate the same numbers already visible in the ledger.
- Labels such as `Dollar fallback`, `tail-caused red`, and `segment leak` expose
  implementation language without always explaining the trading meaning.
- Day/week/month outputs can collapse to the same evidence when only one active
  day exists.
- The current experiment compiler can repeat the same recommendation across
  scopes.
- The v1 review contract has prose leaves without evidence references, user
  status, recurrence state, or per-claim confidence.

## Relationship catalog

The research should evaluate relationships, not merely add more metrics. Each
relationship has two sides, an explicit comparison, a confidence boundary, and
an action it can license.

### P0 — required for a credible Coach

| Relationship | Question | Existing evidence | Main gap |
| --- | --- | --- | --- |
| Process quality ↔ outcome | Was this a good decision with a bad result, or a weak decision that got paid? | P&L, causal chart read, execution facts, notes | Stable process grade and addressable rules |
| Intended plan → actual execution | Did entry, stop, size, adds, and exit match what was intended? | Actual fills; partial `stopLoss`, `setup`, `target` columns | Reliable pre-decision snapshot and coverage |
| Opportunity at entry → execution | Was the opportunity valid, and was the click well located? | FYL market read, direction, price action, extension, VWAP/EMA state | Intended trigger/setup and calibrated setup-specific rules |
| Prior event → next action | Did a win, loss, missed move, or session peak change the next trade? | Ordered fills, P&L sequence, size, time | Named sequence detectors and trader context |
| Declared risk → observed risk | Was risk defined, respected, widened, or absent? | Stop column when present, fills, candles, loss magnitude | Planned stop timestamp/source and intended dollar risk |
| Evidence → confidence | Is the Coach licensed to make this claim? | Sample size, candle coverage, R coverage, limitations | Per-finding eligibility and standardized confidence reasons |

### P1 — makes the Coach meaningfully differentiated

| Relationship | Question | Required computation or capture |
| --- | --- | --- |
| Setup quality → size/risk | Did better opportunities receive appropriate size, or did size rise on weaker trades? | Stable setup/quality labels, max exposure, planned risk |
| Self-report ↔ observed behavior | Does the trader's stated patience, discipline, or thesis agree with timing and execution? | Timestamped reflection plus deterministic behavior facts |
| Entry quality → management | Did a sound entry get mishandled, or did management merely reveal a weak entry? | Entry classification joined to MFE/MAE, adds, exits, capture ratio |
| Cohort → personal baseline | Under which at-entry conditions does expectancy improve or deteriorate? | Feature-conditioned cohorts with sample and robustness gates |
| Rule adherence → economic impact | Which rule breaches are frequent, costly, or improving? | Rule IDs, evaluators, trade refs, violation impact |
| Behavior → recurrence | Is this session-only, emerging, repeated, established, or resolving? | Stable finding IDs/fingerprints and cross-session storage |
| Market context → setup performance | Does a setup work differently by regime, catalyst quality, or opportunity phase? | Causal market context and setup identity |

### P2 — completes the learning system

| Relationship | Question | Required system |
| --- | --- | --- |
| Opportunity set → participation | Did the trader select, skip, or mistime the best available names? | Scanner/candidate snapshots including untraded names |
| Correct pass → later confidence | Did restraint protect the process even when no trade appears in broker data? | Explicit pass/skip capture and opportunity outcome |
| Experiment → comparable future sessions | Was the behavior attempted, and did the target relationship change? | Experiment eligibility, attempt state, comparable-session matcher |
| Finding → playbook evolution | Which repeated evidence deserves a proposed rule or example? | Finding lifecycle and explicit user promotion |
| Question → deterministic investigation | Can the trader request a new cohort or counterfactual safely? | Governed analytics/query interface with enforced gates |

## Data-gap matrix

The first research output must distinguish **schema availability** from **real
coverage**. A nullable database column is not evidence that the Coach can rely
on the field.

| Data | Why it matters | State | Research action |
| --- | --- | --- | --- |
| Planned stop / invalidation | Enables R, risk adherence, and process grading | Column exists; historical coverage believed very low | Measure coverage and capture source/timing |
| Setup identity | Enables rule grading and edge by setup | Free text/notes/tags; inconsistent | Define stable setup IDs and migration approach |
| Intended trigger | Separates valid stock from valid entry | Not reliably structured | Prototype one lightweight capture field |
| Intended size/risk | Detects oversizing and conviction mismatch | Actual size only | Decide smallest useful pre-trade snapshot |
| Intended add logic | Separates planned scaling from emotional averaging | Actual adds observable | Capture only when scaling is part of the setup |
| Exit condition/target | Grades management against plan | Target partially available; intent incomplete | Measure coverage and define exit-condition vocabulary |
| Conviction/self-grade | Allows size-quality and confidence calibration | Proposed, not stable | Test whether it improves decisions or adds burden |
| Timestamped trader state | Connects emotion/thesis to the correct decision | Mostly recap-level prose | Prototype pre-market and selected-trade check-ins |
| Passed/missed candidates | Makes patience and selection measurable | Not captured in Journal | Follow opportunity-set plan; do not infer from no fill |
| Playbook rule IDs | Enables exact rule integrity and evidence refs | Playbook is prose | Normalize only approved, machine-relevant rules |
| Finding reaction | Teaches the product what the trader accepts or corrects | Not persisted | Add separate reaction object in v2 work |
| Experiment result | Closes the behavior loop | Experiment can be saved, not evaluated | Define attempt, eligibility, result, and expiry |
| Data-quality coverage | Prevents false confidence | Limitations exist but are scattered | Create one coverage/eligibility object per scope |

### Initial coverage audit

Run a local-only audit against the private trading corpus. Do not commit rows,
notes, symbols, or generated outputs. Report only aggregate coverage:

- Closed trades and trading sessions in scope.
- Planned-stop coverage.
- Setup identity coverage and number of unique spellings.
- Target/exit-intent coverage.
- Trade-note, ticker-note, and day-note coverage.
- Followed-plan and emotion/process-tag coverage.
- One-minute candle and opportunity-context coverage.
- R-multiple coverage.
- Import/reconstruction warnings.
- Saved-experiment count, age, and completion coverage.

This audit decides capture priorities. It must happen before a schema expansion.

### Baseline audit result — 2026-07-22

Command:

```bash
npm run coach:coverage
```

The command opens the local SQLite database read-only and prints aggregate
counts only. It does not write a report file or print account names, symbols,
dates, note text, or trade rows.

| Coverage area | Result | Research implication |
| --- | ---: | --- |
| Closed-trade corpus | 5,229 trades · 190 account-scoped sessions | Large enough to replay many descriptive detector families |
| Linked executions | 100.0% | Sequence, size-change, add, re-entry, and observed-risk research can begin now |
| Planned stop | 0.0% | Historical R and plan-versus-actual stop grading are blocked |
| R-multiple eligibility | 0.0% | Dollar fallback is currently unavoidable for the full corpus |
| Setup identity | 0.0% | Setup expectancy and exact playbook grading are blocked |
| Target | 0.0% | Exit management cannot be graded against declared intent |
| Trade-level context | 3.7% | Warmth and intent are available for a small selected subset, not the full corpus |
| Followed-plan field | 0.0% | Plan adherence cannot be treated as a reliable historical label |
| Day context | 56.8% | Session-level connection to trader reflection is viable on more than half the corpus |
| Direct-symbol 1-minute bars | 98.1% | Causal chart research has strong historical coverage |
| At-entry indicator warmup | 95.4% | Entry/opportunity detectors can be replayed broadly |
| Current long-only opportunity eligibility | 94.9% | The existing FYL entry layer is not the primary data bottleneck |
| Short trades blocked by v1 | 23 trades | Keep visible as a known limitation; not the first research priority |
| Saved experiments | 0 | The closed learning loop has no historical baseline yet |

Import reconstruction warnings are not persisted, so the audit cannot measure
their historical frequency from SQLite. That is an observability gap, not zero
warnings.

#### Decision from the baseline

Run two tracks in parallel:

1. **Minimum capture uplift:** capture stable setup/intent and planned stop at
   the point of review, with source and timing. Treat them as one P0 package;
   either field alone leaves the central plan-versus-actual relationship weak.
2. **Relationship replay from existing evidence:** begin sequence behavior,
   process/outcome contradiction, entry/opportunity, session structure, and
   observed execution detectors now. Their source coverage is already strong.

Do not make target, conviction, intended size, or a broad schema migration the
first change. Test their incremental diagnostic value after setup/intent and
planned-stop capture are working. Do not require notes on all 5,229 trades;
continue selecting the small number of trades where human context can change
the diagnosis.

## Candidate-finding contract

The deterministic engine should produce a buffet of eligible findings. The
Coach chooses and connects them; it does not discover numeric relationships by
eyeballing raw trades.

```ts
type CandidateFinding = {
  id: string;
  detectorVersion: string;
  category:
    | "entry"
    | "risk"
    | "sizing"
    | "management"
    | "selection"
    | "sequence"
    | "rule-adherence"
    | "session-structure"
    | "psychology"
    | "data-quality";
  scope: "trade" | "day" | "week" | "month" | "rolling";
  observation: string;
  cohort: string;
  comparator: string | null;
  effect: {
    dollars: number | null;
    rMultiple: number | null;
    rateDelta: number | null;
    note: string | null;
  };
  sample: {
    trades: number;
    sessions: number;
    baselineTrades: number | null;
  };
  confidence: "low" | "medium" | "high";
  eligibility: "headline" | "supporting" | "watch-only" | "blocked";
  evidenceRefs: EvidenceRef[];
  contradictoryEvidence: EvidenceRef[];
  missingData: string[];
  controllability: number;
  economicImpact: number;
  recurrence: "session-only" | "emerging" | "repeated" | "established" | "resolving";
};
```

Exact types should be reconciled with Coach Review Schema v2 rather than copied
literally. The important constraints are:

- Every candidate has a stable detector and version.
- Every number resolves to deterministic evidence.
- Missing data changes eligibility.
- Contradictory evidence travels with supporting evidence.
- A single session may generate a description, but not automatically a
  persistent pattern.
- Ranking considers controllability and trust, not only dollar impact.

## First detector families to research

### 1. Process/outcome contradictions

- Green result with below-baseline playbook adherence.
- Red result with all losses inside declared risk.
- Winner classified as contradicted, late, or poorly executed at entry.
- Loser classified as supported with clean risk and execution.
- High win rate with negative expectancy or poor payoff.
- Low win rate with positive expectancy and contained losses.

### 2. Sequence behavior

- Size change after a winner or loss.
- Time-to-next-entry after a loss.
- Same-symbol re-entry after a material loss.
- Trade-frequency change after a missed move or early session peak.
- Standards drift after the session becomes green.
- Giveback after the best closed-trade window.

### 3. Entry and opportunity quality

- Trend-aligned versus contradicted direction.
- At-rail/decision-point versus extended entry.
- Developing/still-valid versus weakening/mature opportunity.
- Consolidation entry versus confirmed resolution.
- Volume participation with or without price progress.
- Entry location relative to a structural invalidation.

### 4. Risk and sizing

- Loss within versus beyond planned stop.
- Natural structural stop versus intended risk band.
- Born-as-hold-and-hope entries where structure requires excessive room.
- Better setup/entry quality receiving more or less risk.
- Adverse adds versus planned adds.
- One trade/ticker/rule breach dominating session loss.

### 5. Management

- Good entry with low capture of available move.
- Winner duration versus loser duration.
- Exit while entry thesis remained valid versus after invalidation.
- Adds after confirmation versus chasing/adverse adds.
- MFE/MAE distribution by setup and entry quality.

### 6. Human-context agreement

- Notes identify rushing/FOMO and execution shows late extension.
- Trader reports patience and the record shows correct passes or selectivity.
- Followed-plan response disagrees with an addressable rule check.
- Emotional state precedes a sequence change, with correlation language only.
- Known pattern recurs versus a new pattern inferred from one note.

### 7. Data-quality findings

- Not enough trades to generalize.
- Insufficient R or setup coverage for the requested comparison.
- Missing candle warmup or partial session coverage.
- Week/month collapses to one active day.
- Scanner coverage unavailable versus a verified no-opportunity session.

Data-quality findings need a voice too. They should state what can be said, what
cannot be said, and the smallest useful capture improvement.

## Confidence and language policy

Thresholds are calibration hypotheses, not universal truths. Research should
define detector-specific gates, then validate them on the private corpus.

Minimum rules:

- A single trade can support a trade-specific observation, never an enduring
  personal pattern.
- Session-structure classifications require the minimum sample defined in the
  content contract; smaller samples remain descriptive.
- A recurring pattern requires evidence across multiple sessions, not merely
  multiple trades from one ticker-day.
- Cohort comparisons show both sample sizes and coverage.
- Low-confidence findings are watch-only and cannot create a rule or strong
  experiment without trader approval.
- Psychology relationships require user-authored context. The system does not
  diagnose emotion from P&L or chart behavior.
- Correlation is written as association or a review question, not cause.
- Hindsight facts never rewrite the at-entry opportunity grade.

## Model role and analytical initiative

### Allowed

- Select two or three eligible findings that form the clearest session story.
- Connect a deterministic relationship to something the trader reported.
- Explain why supporting and contradictory evidence matter.
- Ask one targeted question when intent would change the diagnosis.
- Choose among pre-approved experiment templates or phrase a schema-bound one.
- Adapt tone and explanation depth without changing facts or confidence.

### Not allowed

- Calculate new metrics from arrays or raw trades.
- Infer a setup, stop, emotion, or rule that was not supplied or evaluated.
- Upgrade a watch-only finding to a pattern.
- Use post-trade price action as evidence that the entry outcome was obvious.
- Promote a Coach suggestion directly into the playbook.
- Rank findings solely by rhetorical drama or largest loss.

### Route A — deterministic relationship buffet

Build this first. The deterministic pass computes many eligible relationships;
the model performs analyst-editorial work over the candidates. This fits the
current architecture, remains replayable, and can be evaluated offline.

### Route B — governed query tool

Research only after Route A is trustworthy. A read-only tool may let the model
request approved groupings, comparisons, and counterfactuals. The tool—not the
model—executes the query and enforces account scope, allowed fields, sample
gates, maximum row counts, and provenance.

The query route must not be a general SQL endpoint exposed directly to the
model. It should be a typed analytics interface whose results use the same
candidate-finding contract.

## Voice research

The desired voice is a coach who knows the trader's history, connects facts to
what the trader experienced, and does not manufacture a lesson merely to fill
space.

### Voice invariants

- Meaning before metrics.
- Process before outcome.
- Decision or behavior is judged; character is not.
- Warmth comes from relevant trader-authored context, not encouragement filler.
- Praise carries evidence just like criticism.
- Implications are reflective or forward-looking, not drill-sergeant commands.
- Known patterns are named from history; new patterns are posed as questions.
- Low confidence sounds honest and useful, not apologetic.
- No dry openers such as “Based on the data” or “The metrics indicate.”
- Never repeat a number already visible unless it is necessary to prove the
  relationship being discussed.

### Few-shot requirements

Before adding a payload/response pair to the production prompt:

1. Every conclusion in the response must map to an explicit payload fact,
   relationship, or user-authored statement.
2. Counterfactuals such as “you would still have been green” must arrive as
   precomputed fields with evidence references.
3. Claims about which trades were planned must cite the exact trade refs; an
   aggregate such as `2 of 4` is not enough to identify them.
4. Each example should teach one primary voice behavior.
5. The set must include positive process, negative process, contradiction,
   missing context, and insufficient-sample examples.
6. No example may reward the model for doing arithmetic or inferring intent.

### Tone evaluation axes

Blind-rate generated outputs on:

- Specificity to this trader/session.
- Factual licensing and evidence traceability.
- Process/outcome separation.
- Usefulness of the implication or question.
- Warmth without cheerleading.
- Directness without blame.
- Brevity and absence of metric recitation.
- Confidence calibration.
- Whether the trader would reread it before the next comparable session.

## Competitive refresh

Public product claims are directional evidence, not proof of analytical quality
or behavior change. Hands-on trials are still required.

| Product | Current public signal | Implication for this project |
| --- | --- | --- |
| [TradeZella / Zella AI](https://help.tradezella.com/en/articles/11201153-what-is-zella-ai-tradezella-s-ai-trading-assistant) | Reads trades, rules, strategies, and notes; auto-tags; reviews sessions; supports plan/rule workflows and memory | Rules-aware AI, automated recaps, and memory are table stakes |
| [TradesViz AI Coach](https://www.tradesviz.com/ai-trading-journal/) | Sixteen deterministic checks ranked by impact/confidence, with limited AI summarization | Strong validation for Route A; detector quality and interaction become the differentiation |
| [Trading Discipline Lab](https://www.tradingdisciplinelab.com/) | Deterministic behavior signals, rule simulation, playbook promotion, adherence, weekly review, grounded AI | The full discipline loop already exists publicly; our loop must win on entry evidence, trust, and coaching quality |
| [Edgewonk](https://edgewonk.com/blog/how-to-review-your-trading-journal) | Structured checklists, mistakes, emotions, missed trades, review sessions, and one improvement focus | Behavior and psychology should be structured where possible, not delegated to AI inference |
| [TraderMate AI](https://tradermateai.com/) | Timestamped voice thoughts paired with imported executions and behavior tags | Voice capture is moving toward decision-time context, not only end-of-day dictation |
| [TradePath](https://www.tradepath.ai/) | Session recording and voice notes matched to executions, with automated session analysis | Capturing why the trader acted is becoming a competitive capture surface |
| [TradeDNA](https://tradedna.ai/) | Trades, journal, psychology, news, and market context replayed at the relevant candle | Market context and temporal provenance are becoming part of the coaching story |

### Competitive hypotheses to test hands-on

- Can the product show the exact evidence behind an AI claim?
- Does it distinguish process quality from monetary outcome?
- Does it separate entry-time information from hindsight?
- Can the trader correct a finding, and does that correction persist?
- Are patterns gated by sample size and recurrence?
- Does a recommended action survive into the next session and get evaluated?
- How much intent capture is required before the output becomes specific?
- Does voice capture create structured, reviewable facts or only prose?
- Does the product identify correct passes and missed opportunities?

Priority hands-on comparisons: TradesViz for deterministic ranking, Trading
Discipline Lab for the closed loop, and TradeZella for rules-aware automated
review. Add one voice-first product only after the core three are documented.

## Research workstreams

### Workstream A — data coverage and capture burden

**Question:** What can the Coach reliably know today, and what is the smallest
capture change that materially improves the review?

**Method:**

1. Run the local aggregate coverage audit.
2. Sample 20–30 sessions across green/red, quiet/active, and well/poorly noted
   days.
3. For each missing field, record whether it would have changed the diagnosis.
4. Prototype capture concepts for stop, setup/intent, trigger, and conviction.
5. Measure completion time and abandonment, not only field completeness.

**Deliverables:** coverage report, ranked field gaps, minimum capture contract,
and a list of fields explicitly deferred.

**Exit criterion:** one capture proposal explains how it improves at least
three P0 relationships without making every trade a form-filling exercise.

### Workstream B — relationship detector replay

**Question:** Which deterministic relationships repeatedly produce useful,
non-obvious coaching insights?

**Method:**

1. Implement research-only detector outputs or scripts against private cases.
2. Replay candidate detector families over the corpus.
3. Label candidates as useful, obvious, misleading, redundant, or blocked by
   missing data.
4. Inspect supporting and contradictory trade examples.
5. Calibrate detector gates by session and ticker clustering where relevant.

**Deliverables:** detector registry, eligibility rules, redundancy map, and the
first Route A candidate-finding schema.

**Exit criterion:** at least 10 detector families produce replayable findings
that a human reviewer judges correct and useful, with false-positive reasons
documented.

### Workstream C — Coach content and tone

**Question:** Can the model turn selected relationships into concise coaching
without adding unsupported analysis?

**Method:**

1. Upgrade or create sanitized eval fixtures with explicit relationship facts.
2. Correct the owner-supplied few-shot examples to remove hidden arithmetic and
   ambiguous evidence.
3. Compare instruction-only, persona-only, few-shot, and persona-plus-few-shot
   prompt variants.
4. Blind-rate outputs using the tone axes above.
5. Test day/week/month scope differentiation and low-confidence refusals.

**Deliverables:** versioned Coach constitution, approved few-shot set, eval
rubric, and prompt-change log.

**Exit criterion:** the chosen prompt wins on usefulness and evidence fidelity
without increasing hallucinated claims or response length.

### Workstream D — competitive product teardown

**Question:** Which workflows are genuinely effective rather than merely well
positioned?

**Method:**

1. Run the same sanitized session through the selected products where import
   and trial access allow.
2. Capture onboarding burden, context requirements, output, evidence access,
   correction flow, and next-session carry-forward.
3. Separate first-party claims from observed behavior.
4. Record patterns worth borrowing and traps to avoid.

**Deliverables:** updated competitive matrix, workflow screenshots kept in the
appropriate research location, and design implications.

**Exit criterion:** the project can state a specific advantage beyond “private
AI coach” and identify the minimum parity features required for credibility.

### Workstream E — learning-loop validation

**Question:** Does Coach feedback lead to a measurable change rather than a
forgotten recap?

**Method:**

1. Define finding reactions and experiment attempt/result states.
2. Select one experiment per eligible session.
3. Match later sessions using explicit comparability rules.
4. Review whether the trigger occurred, the action was attempted, and the
   target behavior changed.
5. Preserve missed opportunity and unintended-cost evidence.

**Deliverables:** experiment evaluation contract, comparable-session matcher,
and a longitudinal review prototype.

**Exit criterion:** a saved experiment can be closed as supported, unsupported,
inconclusive, or not attempted using inspectable evidence.

## Evaluation program

### Case matrix

The committed or private eval suite should cover:

- Good loss.
- Bad winner.
- Green day with late standards drift.
- Controlled red day.
- Outlier-carried green day.
- One-loss-dominated red day.
- Broadly weak day.
- High-win-rate negative-expectancy period.
- Valid opportunity with poor execution.
- Good entry with poor management.
- Post-loss re-entry or size escalation.
- Correct pass/no-trade day.
- Missed A+ opportunity.
- Missing planned risk.
- Missing setup/intent.
- Partial candle or scanner coverage.
- Small sample with no defensible pattern.
- Conflicting note and observed behavior.
- Repeated known pattern.
- Previously active pattern now improving.

### Evaluation layers

1. **Technical truth:** reconstruction, time boundaries, calculations, and
   evidence references are correct and repeatable.
2. **Analytical truth:** detector eligibility, comparison, sample, confidence,
   and contradiction handling are correct.
3. **Coaching truth:** the selected relationship is useful, process-aware, and
   phrased without unsupported inference.
4. **Behavioral value:** the trader understands the next review action and can
   later tell whether it was attempted.

### Failure taxonomy

Track failures explicitly:

- Unsupported number.
- Unsupported intent or emotion.
- Outcome bias.
- Hindsight leakage.
- One-session overgeneralization.
- Causal overstatement.
- Wrong relationship selected.
- Correct finding but redundant/obvious.
- Correct analysis with dry metric recitation.
- Blaming or moralizing language.
- Generic encouragement.
- Too many recommendations.
- Experiment not measurable.
- Evidence link missing or misleading.

## Recommended sequence

### Phase 0 — audit and contract

- Run aggregate data-coverage audit.
- Reconcile `CandidateFinding` with Coach Review Schema v2.
- Freeze initial detector registry and confidence vocabulary.
- Correct tone examples so every claim is explicitly licensed.

**Gate:** no product schema migration until coverage and diagnosis impact are
understood.

### Phase 1 — minimum capture uplift

- Improve setup/intent and planned-stop capture first.
- Add trigger or conviction only if research shows material diagnostic value.
- Preserve capture timing and source.
- Keep freeform dictation as context, not as a substitute for critical typed
  fields.

**Gate:** meaningful improvement in P0 relationship eligibility with acceptable
capture burden.

### Phase 2 — Route A relationship buffet

- Add the first detector families and evidence refs.
- Rank by eligibility, controllability, economic impact, recurrence, and
  non-redundancy.
- Provide plain-language mappings for internal classifications.
- Expose exact proof behind each candidate.

**Gate:** replayed candidates meet technical and analytical truth criteria.

### Phase 3 — v2 Coach synthesis and voice

- Wire structured verdict, findings, queue, pattern, rule integrity, and focus.
- Remove redundant statistical narration.
- Add approved few-shots and version the Coach constitution.
- Evaluate scope differentiation and low-confidence behavior.

**Gate:** blind evals show better usefulness and tone with no reduction in
evidence fidelity.

### Phase 4 — closed learning loop

- Persist reactions and corrections separately from generated reviews.
- Promote accepted findings into editable experiments or playbook candidates.
- Evaluate experiments in later comparable sessions.
- Resurface resolved and improving patterns, not only failures.

**Gate:** one full finding-to-experiment-to-evaluation cycle works end to end.

### Phase 5 — optional governed query research

- Prototype typed analytical requests over approved dimensions.
- Enforce sample, account-scope, provenance, and row-count limits in code.
- Return candidate findings, not raw unbounded query results.
- Compare incremental value with the deterministic buffet.

**Gate:** Route B demonstrates useful questions Route A cannot serve without
introducing untraceable analysis.

## Decisions to make after research

- Exact minimum capture fields and when they are requested.
- Whether setup identity belongs on the trade, plan snapshot, or both.
- Detector-specific sample and recurrence thresholds.
- Default Coach tone and whether tone personalization ships in the first v2.
- Whether findings are stored as immutable artifacts or regenerated from saved
  fact packs plus detector versions.
- How trader corrections affect future prompts without rewriting history.
- Whether a missed/passed opportunity can become a positive Coach finding.
- How comparable sessions are defined for experiment evaluation.
- Whether Route B is needed after the first relationship buffet ships.

## Non-goals

- Live trade signals, entries, exits, alerts, targets, or position instructions.
- A freeform model with unrestricted access to raw trades or SQL.
- Inferring psychology from losses or chart behavior alone.
- Treating a discipline score as the primary Coach conclusion.
- Maximizing the number of surfaced insights.
- Auto-promoting findings into permanent playbook rules.
- Replacing the Analytics workspace with Coach prose.
- Collecting high-friction context that does not change a coaching decision.

## Research completion criteria

This research phase is complete when:

1. Real field coverage and data-quality limits are measured.
2. The minimum capture uplift is chosen from evidence, not intuition.
3. The initial relationship detector registry and candidate contract are
   approved.
4. At least 10 detector families replay successfully across representative
   private cases.
5. The competitive matrix distinguishes public claims from observed workflows.
6. The few-shot set contains no hidden arithmetic or unsupported inference.
7. The v2 Coach can be evaluated on technical, analytical, coaching, and
   behavioral-value layers.
8. The first closed-loop experiment has explicit attempt and result semantics.

## Immediate next actions

1. ~~Build and run the local aggregate coverage audit.~~ Completed 2026-07-22.
2. Select 20–30 private sessions for the research sample without committing
   their data.
3. Reconcile the candidate-finding contract with Coach Review Schema v2.
4. Create a detector registry with the first P0 and sequence detectors.
5. Rewrite the supplied tone examples with explicit evidence and trade refs.
6. Update the private eval case format to include expected relationship,
   evidence refs, confidence, and tone failure tags.
7. Schedule hands-on reviews of TradesViz, Trading Discipline Lab, and
   TradeZella using one sanitized comparison case.
