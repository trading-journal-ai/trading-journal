# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are active discretionary day and momentum traders reviewing
completed sessions. They need to reconstruct what happened, preserve what they
saw and felt, compare decisions with their stated rules, and carry one useful
lesson into the next session without turning review into a long data-entry
ritual.

## Product Purpose

Trading Journal AI turns broker executions, charts, notes, screenshots, and
session reflections into a chronological review record. Repeated review should
compound into a personal trading playbook: the setups the trader recognizes,
the rules they intend to follow, the mistakes and strengths that recur, and the
evidence showing whether their edge and process are improving.

Success means the trader can quickly reconstruct a day, move from “what
happened?” to a grounded assessment of process quality, adopt a durable
playbook update when warranted, and carry a specific focus into the next
session.

## Positioning

The product is a private, local-first trading journal centered on narrative
review and evidence rather than a spreadsheet-first hosted subscription. It
starts with the day and the trader's own account. Dictation-first reflection,
imported executions, charts, analytics, and Coach interpretation remain
connected while retaining distinct roles.

Its AI coach is grounded in the trader's completed trades, notes, rules, chart
context, and deterministic calculations instead of generic trading advice. It
is not a signal service, trade-calling tool, or live decision engine. AI may
surface evidence, identify hypotheses, and propose lessons, but the trader
approves durable playbook changes and remains the decision-maker.

## Operating Context

The core workflow happens after trades close and between sessions:

- import or sync completed trading activity;
- use Journal as the calendar-based record: browse dates, focus one day,
  capture reflection, and inspect supporting trades;
- use week and month scopes to compare the focused day with surrounding
  sessions and open the relevant Coach interpretation;
- use Analytics for cross-period, symbol, setup, behavior, and market-context
  investigation;
- use Dashboard for today's plan, lightweight check-ins, and the accepted
  lesson or experiment that should remain visible during the live session.

The primary product is an Electron desktop application used at laptop and
desktop widths. The web stack is its implementation and hosted-demo surface,
not a mandate to design a phone-first product. The product may support planning
and lightweight check-ins during the trading day, but it does not direct live
orders or replace the trader's judgment.

## Capabilities and Constraints

- Broker data is normalized into a shared trade and execution model before it
  reaches journal, chart, calendar, analytics, or coach surfaces.
- Journal and Calendar are one product surface. Calendar is Journal's temporal
  index, not a competing destination.
- Journal prose and dictation preserve context that execution data cannot know;
  classification and structured refinement cannot block saving a useful note.
- Journal focuses one day at a time. Week and month scopes provide comparison
  and overview rather than a continuous stack of full day entries.
- Charts, screenshots, and selective video can preserve the evidence behind a
  decision without making media capture mandatory for every trade.
- Analytics computes facts deterministically; the language-model layer explains
  those facts and must not invent calculations.
- Dashboard owns live carry-forward behavior; Journal owns the durable record;
  Analytics owns investigation; Coach connects narrative with evidence.
- Process quality and outcome quality are separate. A disciplined loss may be
  good process, while a profitable rule break may be poor process.
- Daily observations do not silently become permanent patterns. Recurrence,
  source evidence, trader correction, and explicit adoption govern promotion.
- Market-date behavior is based on ET trading sessions and must remain
  consistent across review surfaces.
- Imported and enriched market data may have incomplete coverage; conclusions
  must expose material sample and coverage limitations.
- Private broker exports and real trading data do not belong in committed
  files. Public examples and fixtures use synthetic or placeholder data.
- Product design and routine visual QA target common laptop and desktop
  windows. Narrow layouts need basic resilience rather than dedicated mobile UX.

## Brand Commitments

The product name is **Trading Journal AI**. Product language should be grounded,
specific, calm, and data-literate. It should avoid hype, certainty theater,
shaming, gamifying loss, or claims that the coach can predict markets or
substitute for the trader. Keep the trader's original voice visible alongside
Coach synthesis.

## Evidence on Hand

- The repository contains implemented journal, dashboard, import, calendar,
  analytics, trade-detail, settings, and coach-preview surfaces.
- The Journal review module supports focused Day, Week, and Month scopes with
  scope-specific P&L, trade, edge, risk, alignment, and Coach views.
- Product and interaction direction is documented in
  `docs/design/UNIFIED_REVIEW_NAVIGATION.md` and
  `docs/product/TRADING_JOURNAL_LEARNING_LOOP.md`.
- Product, coaching, analytics, import, and design contracts live under
  `docs/` and are the durable evidence for settled behavior.
- `samples/demo/trades.csv` provides synthetic data for demonstrations and
  development. Real broker exports remain private and gitignored.

## Product Principles

1. Start with the day and its story, then place the data beside it.
2. Ground coaching in evidence and the trader's own rules.
3. Keep the trader in control of conclusions and durable playbook knowledge.
4. Make reflection private, low-friction, and useful enough to repeat.
5. Make retrieval explicit and fast; do not depend on long scrolling or manual
   archive maintenance.
6. Separate reflection, investigation, and live accountability while preserving
   the context that connects them.
