# Trading Playbook

> Status: Draft · Last updated: 2026-07-04

## Core Idea

Trading Journal AI is laddering toward a personal trading playbook.

The journal should not only store what happened. It should help the trader turn
repeated review into a clearer operating system: the setups they are allowed to
trade, the rules that define good execution, the mistakes that keep repeating,
and the evidence that proves whether the edge is improving.

The playbook is the product's standards layer.

```text
Assessment
  -> setup discovery
  -> trade review
  -> journal reflection
  -> coach synthesis
  -> playbook refinement
  -> next-session execution
```

This connects the work already happening across onboarding, setup taxonomy,
trade review, daily recaps, analytics, and the coach. The product is not just a
trade database plus an AI chat. It is a local-first system for building,
testing, and refining the trader's own playbook.

## Book-Guided Cross-Check

This roadmap is informed by a concept cross-check against Mike Bellafiore's
*The PlayBook*. The book's strongest product implication is that a playbook is
not merely a list of setups. It is a daily practice of archiving the setup that
made the most sense, studying the variables behind it, and rehearsing the trader
to recognize and execute that pattern with more confidence the next time.

Key implications for the product:

- **Daily archive ritual:** each trading day should ask, "What play from today
  belongs in the playbook?" This could be a winning trade, a clean losing trade,
  or a missed opportunity that revealed an important setup.
- **One best play beats many shallow notes:** the app should help the trader
  deeply archive one high-signal setup instead of only collecting broad tags.
- **A+ setup focus:** the playbook should distinguish ordinary valid setups from
  the trader's best setups. These are the trades to prepare for, review before
  the open, and eventually size up responsibly.
- **Trade strategy per setup:** each setup needs a strategy for how the trader
  would attack it if it appeared hundreds or thousands of times: entries, adds,
  stops, profit-taking, hold logic, and reasons to sell.
- **Responsible size review:** the review should ask where the trader could
  have been bigger or should have been smaller, tied to setup quality and risk
  rules.
- **Elimination is part of edge:** the playbook should name trades, stocks,
  timeframes, and behaviors that are not worth the trader's intellectual,
  emotional, or financial capital.
- **Pre-open rehearsal:** the best examples should be reviewed before the next
  session so the trader can spot familiar patterns in real time.
- **Shared language for coaching:** the coach should use playbook entries as the
  vocabulary for trade review, not as a generic checklist imposed from outside.

This tightens the product direction: the app should not only maintain a setup
library. It should create a repeatable archive-and-rehearse loop.

## Why A Playbook

A trader's edge is hard to improve when every review starts from scratch. The
same questions come up over and over:

- Was this a valid setup, or did I force it?
- Did I follow the entry, stop, sizing, and exit rules?
- Was this loss acceptable process or avoidable drift?
- Which setups deserve more size, less size, or no attention?
- What should I focus on tomorrow?

A playbook gives those questions a durable reference point. Instead of asking
the coach to invent standards after the fact, the app can compare each trade
against the trader's own definitions.

The goal is not to create a rigid trading manual on day one. The goal is to let
the playbook emerge from real review:

- Self-assessment names the trader's current beliefs.
- Import and analytics expose what is actually happening.
- Trade notes capture intent and context.
- Daily recaps capture the human read.
- Setup definitions describe what should count.
- Coach review compares intention, evidence, and rules.
- Dashboard cues bring the current lesson back before the next session.

## Product Thesis

The playbook should become a living artifact, not a static document.

At first it can be a structured workspace in Settings or Preview. Over time it
should become a shared context layer used by every review surface:

| Surface | How It Uses The Playbook |
| --- | --- |
| Onboarding / assessment | Captures the trader's initial self-read, strengths, weaknesses, and setup beliefs. |
| Settings | Maintains rules, setup definitions, coach preferences, and review standards. |
| Import | Gives new trades a place to attach setup intent and evidence. |
| Trade review | Grades a single trade against setup, execution, risk, and psychology criteria. |
| Journal | Connects the day's story to the setups and behaviors that mattered. |
| Analytics | Shows expectancy, mistakes, sizing, and consistency by setup or rule. |
| Coach | Uses the trader's own standards instead of generic trading advice. |
| Dashboard | Surfaces the current rule, experiment, or setup focus before the next session. |

## Playbook Objects

The playbook should eventually include several related objects. They can ship in
stages.

### Trader Profile

The baseline self-assessment:

- Experience level and current trading style.
- What the trader believes is working.
- Where the trader believes they are leaking money.
- Emotional and behavioral patterns.
- Coaching preferences and language.

This is a hypothesis, not truth. Later reviews can mark claims as supported,
contradicted, or still unknown.

### Setup

A named pattern the trader is allowed to trade.

Fields:

- Name.
- Market context.
- Required chart structure.
- Catalyst or reason in play.
- Entry trigger.
- Stop and invalidation.
- Target and management logic.
- Invalid conditions.
- Common mistakes.
- Example trades.
- Proficiency: developing, core, retired.

Setups should be written in the trader's own vocabulary, but structured enough
that the coach and analytics can use them.

### Daily Playbook Entry

The archived play from a specific trading day.

This is the most important object for making the playbook active. A daily entry
captures one setup or opportunity that deserves deeper study.

Fields:

- Trade or missed opportunity reference.
- Why this was the play that made the most sense today.
- Big-picture market context.
- Intraday catalyst or order-flow reason.
- Technical structure.
- Tape / execution read, when available.
- Trade management.
- Trade strategy for next time.
- Review: what was done well, what was missed, and what matters tomorrow.

Daily entries can later roll up into setup pages. The daily ritual creates the
examples; the setup library organizes them.

### Execution Rule

A rule for how a valid setup is traded.

Examples:

- Max risk per trade.
- No third-extension entries unless volume is expanding.
- Stop must be defined before entry.
- Do not add after the first failed reclaim.
- Reduce size on developing setups.

Execution rules are different from setups. A setup says what is tradeable. An
execution rule says how the trader is allowed to act.

### Review Rubric

A grading system for whether a trade was good process.

Possible dimensions:

- Setup validity.
- Entry quality.
- Stop quality.
- Sizing.
- Exit management.
- Emotional discipline.
- Rule adherence.
- Context awareness.

The rubric lets the product separate outcome from process. A losing trade can be
an A trade. A winning trade can still be a warning.

### A+ Setup

The trader's best version of a setup.

Not every valid setup deserves the same risk, attention, or preparation. The
playbook should let the trader promote examples into an A+ category when they
show the clearest fit between context, pattern, execution, and risk/reward.

A+ setups should power:

- Pre-open review.
- Dashboard focus.
- Setup-level analytics.
- Sizing rules.
- Alerts/scans later.
- Coach questions about whether the trader missed, under-sized, or over-managed
  their best opportunities.

### Example Library

The worked examples that make the playbook concrete:

- Best examples.
- Failed examples.
- Near misses.
- Screenshots and charts.
- Coach notes.
- Trader notes.

The example library matters because setups are easier to understand from real
instances than from abstract definitions.

### Current Experiment

A temporary focus created from recent review.

Examples:

- For the next five sessions, no late chase entries after missing the opening
  move.
- Trade the developing pullback setup at half size until ten clean examples are
  reviewed.
- Mark every flat-top breakout as valid or invalid before looking at P&L.

Experiments are where the playbook becomes operational. They bridge review and
the next session.

### Avoid List

The inverse of the playbook.

The book's methodology is as much about eliminating weak trades as finding good
ones. The product should support a list of patterns, tickers, conditions,
timeframes, or behaviors that repeatedly drain capital or attention.

Examples:

- Tickers that do not fit the trader's eye.
- Time periods where execution degrades.
- Setup variants with poor expectancy.
- Emotional states that should reduce size or stop trading.
- Trade types that are valid for someone else but not for this trader.

## The Coach Contract

The coach should treat the playbook as the trader's constitution.

The coach can:

- Point out where a trade matched or violated the playbook.
- Ask the trader to clarify vague setup definitions.
- Help convert a daily playbook entry into a reusable setup rule.
- Suggest rule changes based on repeated evidence.
- Identify contradictions between self-assessment and trade history.
- Ask where more or less size was justified by setup quality.
- Distinguish a normal valid setup from a true A+ setup.
- Promote a current experiment to the dashboard.
- Draft playbook updates for user approval.

The coach should not:

- Pretend an undefined setup has strict rules.
- Rewrite the trader's playbook without consent.
- Give live trade calls.
- Treat P&L as the only definition of quality.
- Confuse a one-off trade outcome with a proven edge.

## First Product Pass

A useful first version does not need a full database redesign. It can start as a
preview/workspace and mature into structured data.

The working MVP spec lives in `docs/product/PLAYBOOK_MVP.md`. The first
wireframe surface lives at `/preview/playbook` in development.

Suggested first pass:

1. Add a Playbook preview page or Settings section.
2. Add a daily "archive today's play" flow from Journal or Trade Review.
3. Seed setup cards from `docs/coach/SETUPS.md`.
4. Add editable fields for setup definition, invalid conditions, common
   mistakes, and examples.
5. Let trade review attach a trade to a setup and mark it as valid, invalid, or
   unclear.
6. Mark examples as A+ / valid / weak / avoid.
7. Show setup-level analytics once enough examples exist.
8. Let the coach summarize "what your playbook says" versus "what your trades
   show."
9. Add a pre-open review surface for the current A+ setup examples and current
   experiment.

The first pass should focus on the learning loop, not completeness. A small
playbook that actually affects review is better than a giant intake form that
does not change the product experience.

## Relationship To Existing Docs

- `docs/product/TRADING_JOURNAL_LEARNING_LOOP.md` explains the loop between
  Journal, Coach, and Dashboard.
- `docs/product/ONBOARDING_SETUP_FLOW.md` explains how Settings gathers coach
  context.
- `docs/coach/SETUPS.md` defines setup taxonomy and setup grading direction.
- `docs/analytics/STATISTICAL_REVIEW.md` covers evidence and performance
  review.
- `docs/coach/TRADING_COACH.md` describes the coach's review role.

This doc names the larger product thesis that connects those pieces: the app is
helping the trader build and refine a playbook.
