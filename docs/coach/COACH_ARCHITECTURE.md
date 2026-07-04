# Coach Architecture

How the AI coach's rules are stored, assembled, sent to the model, and
persisted. This is the runtime/systems companion to the content pillars:

| Layer | Doc | Status |
| --- | --- | --- |
| Coach product & guardrails | [`TRADING_COACH.md`](TRADING_COACH.md) | done |
| Setups pillar (*what* to trade) | [`SETUPS.md`](SETUPS.md) | scaffold — trader must author |
| Execution pillar (*when/how*) | `EXECUTION.md` | **missing — planned** |
| Psychology pillar (*how it felt/behaved*) | [`PSYCHOLOGY.md`](PSYCHOLOGY.md) | done |
| Levels layer (*where* price is acting) | [`LEVELS.md`](LEVELS.md) | done |
| Statistical pillar (*was it real*) | [`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md) | done |
| Deterministic engine spec | [`REVIEW_ENGINE_SPEC.md`](../analytics/REVIEW_ENGINE_SPEC.md) | done (v0.1) |
| Candidate quality (Five Pillars of Stock Selection) | [`ANALYTICS_RESEARCH_PLAN.md`](../analytics/ANALYTICS_RESEARCH_PLAN.md) | research |
| Working build list | [`BUILD_TODO.md`](BUILD_TODO.md) | active |

The five-pillar stock-selection framework is an *input* to the coach (quality of
the opportunity set before the trade), not a coach pillar itself. It feeds the
setups lens: "was this an A+ candidate, watchable, or forced?"

## The core distinction: two kinds of rules

The coach's rules split into two categories with different owners, storage, and
change cadence. Conflating them is the main architecture risk.

1. **Coach constitution** (ships with the app, changes with releases):
   identity, guardrails, review methodology, output contract, evidence/
   confidence language, determinism boundary. Source of truth is the pillar
   docs; at build time they are distilled into a versioned **system prompt**
   bundled with the app. Users never edit this.

2. **Trader playbook** (user data, changes whenever the trader edits it):
   setup definitions, execution triggers, risk rules, sizing rules, common
   mistakes, current improvement goals, vocabulary. Stored as **structured
   records in the app database**, editable in a settings/playbook UI, compiled
   to markdown at request time and injected into the prompt as context.

Rules persist because both halves are data, not conversation: the constitution
is a versioned artifact in the repo/build, and the playbook lives in the DB.
Nothing depends on the model "remembering" anything between calls — every
review request re-assembles the full context.

### Why not agent/skill/CLAUDE.md files?

Skills, agents, and CLAUDE.md are **Claude Code (dev-tool) concepts** — they
configure an interactive coding session, not a product runtime. The shipped
coach is an API call from the app server; it never sees those files. The
correct analogue inside the product is exactly the stack above: system prompt
(constitution) + injected context (playbook + fact pack) + structured output
schema.

Where skill files *are* useful is the dev loop in this repo: a local skill or
script that assembles a real payload from `data/evals/` plus the pillar docs
and runs the prompt, so prompt iteration happens cheaply before any UI is
built. That is a development harness, not the product architecture (see
[`PRIVATE_EVALS.md`](PRIVATE_EVALS.md)).

## Playbook data model

Keep the markdown pillar docs as the authoring spec, but the app's playbook is
structured data so the stats layer can join on it:

- `setup` — name, slug, phase, bias, structure, volume behavior, entry trigger
  ref, stop/invalidation, exit logic, invalid conditions, common mistakes,
  examples (trade refs), status (`draft` / `active` / `retired`).
- `rule` — type (`risk` / `process` / `execution`), text, hard/soft, active.
- `psych_pattern` — name, signals, coach-response notes (seeded from
  [`PSYCHOLOGY.md`](PSYCHOLOGY.md), correctable by the trader).
- `improvement_theme` — current week/month focus.
- `assessment` — versioned self-assessment snapshots (performance self-read,
  personal psychology vocabulary, priorities/coaching contract); each
  checkable claim carries a verification status
  (`unverified` / `supported` / `contradicted`) updated by later reviews
  ([`TRADING_COACH.md`](TRADING_COACH.md) §Trader Self-Assessment). Never an
  input to deterministic detectors.
- `playbook_version` — monotonic version; bump on any edit.

Every trade carries a `setup` tag (or `no-setup`, itself a finding). Tags
record trader intent and are always manual; the engine grades tagged trades by
verifying each definition's `[D]` predicates in code and may only *suggest*
tags, never assign them ([`SETUPS.md`](SETUPS.md) §Tagging and grading model).
Every saved coach review records the `playbook_version` it was generated
against, so old reviews stay interpretable after the playbook evolves.

## Product flow

```text
Import trades
  -> App builds deterministic day read
  -> Trader reviews key trades, not every trade (app surfaces best / worst /
     surprise / concentration / repeats / manually flagged)
  -> Trader fills daily context form (TRADING_COACH.md §Daily Coach Prep)
  -> Coach generates review
  -> One experiment/cue saves back to dashboard
```

Two layers feed the model. The **deterministic layer** is the film-room stats
board: what happened, was the day broad-based or outlier-carried, which
ticker/time window/price band mattered, what contradiction the trader might
miss, what experiment should carry forward. The **human/context layer** is the
coaching conversation: what the trader was trying to do, what they believed in
the moment, where behavior matched or drifted from standards. The LLM narrates
from both layers; it never calculates.

## Request assembly (one review call)

```text
[system]  coach constitution (static, cache-friendly)
          + output JSON schema (structured output / tool definition)
[context] playbook markdown (compiled from DB, versioned)
          + current self-assessment (claims labeled with verification status)
          + deterministic fact pack (REVIEW_ENGINE_SPEC — immutable numbers)
          + level map: calculated + user-marked levels (LEVELS.md)
          + candidate-quality snapshot (five-pillar read, if captured)
          + daily context form + trader notes/dictation (day, ticker, trade)
          + open experiments from prior reviews (the loop)
[ask]     scope: trade | day | week | month
```

Ordering matters for prompt caching: static constitution first, then the
slow-changing playbook, then per-request data. The LLM narrates only; every
number it states must already exist in the fact pack (determinism boundary,
[`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md) §10).

## Output contract and persistence

The model returns structured output matching the coach review contract:

- Scope verdict (day/week/month or trade).
- What matched the playbook.
- What drifted from the playbook.
- Key trade to study.
- Behavior pattern (psychology lens).
- Statistical read, sourced only from the deterministic fact pack.
- Exactly one experiment to carry forward.
- Confidence and missing-context caveats.

The coach may say context is thin; that is better than inventing intent.
Reviews persist as `coach_review` records, separate from user-authored
notes, stamped with: scope key, playbook version, fact-pack hash, model id,
prompt version.

The **experiment loop** is what makes the coach compound instead of repeating
itself:

- `experiment` — text, counterfactual, created-from review, status
  (`proposed` / `accepted` / `followed` / `abandoned`), evaluation result.
- Daily reviews receive open experiments as context and must report on them.
- Weekly/monthly reviews evaluate whether followed experiments moved the
  before/after aggregates (only these horizons may make that call).

Psychology label extraction persists the same way: extracted labels carry
evidence + confidence, the trader corrects them, and corrections are stored so
future prompts include the trader's confirmed vocabulary.

## What the coach "learns"

No fine-tuning, no hidden memory. The coach improves only through data that
persists and re-enters the prompt:

1. Playbook edits (trader refines definitions).
2. Assessment revisions (the trader's self-model updates; assessment-vs-data
   deltas tracked and reviewed at the monthly horizon).
3. Label corrections (trader teaches vocabulary).
4. Experiment outcomes (what was tried, whether it helped).
5. Calibrated `{calibrate}` constants (tuned on imported history).
6. Prompt/constitution revisions, guarded by the eval set
   ([`PRIVATE_EVALS.md`](PRIVATE_EVALS.md)).

Every one of these is inspectable and reversible, which is the point.

## Status and build order

Implemented so far (starter review engine, merged 2026-07): a deterministic
starter review engine, a journal embed for the starter coach read, a
prior-30-day baseline trend vote, and saved coach experiments for
day/week/month recap scopes. This is enough to explain *what happened* and
promote one experiment; it is not yet the full AI coach.

Build **Daily Coach Prep before wiring the LLM**:

1. Author [`SETUPS.md`](SETUPS.md) bodies and write `EXECUTION.md` — the coach
   cannot grade setup validity or entry quality against TODOs.
2. Add trade-detail screenshot upload so a trade can carry visual chart
   evidence before level extraction exists. This is the first image step in
   [`BUILD_TODO.md`](BUILD_TODO.md).
3. Compute indicator series in app code from stored OHLCV: EMA 9/20/200, VWAP,
   session volume aggregates, and anchored VWAP / NVWAP variants only after
   their exact definitions are chosen. The
   chart library (TradingView lightweight-charts) only renders — it provides
   no data or indicators — so we own these series, and the *same* computed
   values feed both the chart overlays and the `[D]` setup predicates in the
   fact pack. One source, no display/grading drift.
4. Extend screenshots to ticker/day multi-timeframe level maps: 1m/5m/daily
   plus higher-timeframe TradingView screenshots with support, resistance,
   pivots, descending resistance, and other marked levels. Confirmation creates
   user-marked level records; screenshots remain visual evidence.
5. After import, offer a primary action to open the daily recap: show the
   deterministic starter read, highlight the key trades that deserve
   annotation, and add the daily + selected-trade context fields
   ([`TRADING_COACH.md`](TRADING_COACH.md) §Daily Coach Prep).
6. Define the playbook DB schema (above) and seed it from the authored docs.
7. Freeze coach review + experiment schemas; persist even while the LLM call
   is stubbed.
8. Build the prompt assembler (constitution + playbook compiler + fact pack +
   notes) as a pure function → payload snapshot, so evals and production share
   one code path.
9. Extend the eval set with the psychology cases listed in
   [`PSYCHOLOGY.md`](PSYCHOLOGY.md) §Evaluation Examples.
10. Wire the live model call last, behind the evals.

Explicitly **not next**: a single coach score, a freeform LLM review from raw
trades alone, mandatory notes on every trade, chart-image analysis before
candle/level facts are reliable, and live coaching or trade advice.

## Open questions

- Which fields of the playbook UI are v1 vs. markdown-only for now?
- Model choice per scope (cheaper model for daily, stronger for monthly?).
- Where the five-pillar candidate snapshot is captured (import-time vs. recap).
- Whether coach reviews are regenerable (fact-pack hash makes this safe) or
  frozen once read.
- Which imported days have reconstruction errors or missing executions —
  import QA gates coach trust.
- Should the first coach output be daily-only, or should ticker-level coaching
  come first for concentrated days?
- Which pieces of static demo coach copy get re-recorded once AI coach v1 is
  stable?
