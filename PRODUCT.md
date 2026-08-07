# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are active discretionary day and momentum traders reviewing
completed sessions. They need to reconstruct what happened, preserve what they
saw and felt, compare decisions with their stated rules, and carry one useful
lesson into the next session.

## Product Purpose

Trading Journal AI turns broker executions, charts, notes, screenshots, and
session reflections into a chronological review record. Repeated review should
compound into a personal trading playbook: the setups the trader recognizes,
the rules they intend to follow, the mistakes and strengths that recur, and the
evidence showing whether their edge and process are improving.

Success means the trader can move quickly from “what happened?” to a grounded
assessment of process quality, a durable playbook update when warranted, and a
specific focus for the next session.

## Positioning

The product is a private, local-first trading journal centered on narrative
review and evidence rather than a spreadsheet-first hosted subscription. Its AI
coach is grounded in the trader's completed trades, notes, rules, chart context,
and deterministic calculations instead of generic trading advice.

It is not a signal service, trade-calling tool, or live decision engine. AI may
surface evidence, identify hypotheses, and propose lessons, but the trader
approves durable playbook changes and remains the decision-maker.

## Operating Context

The core workflow happens after trades close and between sessions:

- import or sync completed trading activity;
- review the day, ticker, and individual trades in context;
- capture market read, execution quality, psychology, mistakes, and strengths;
- compare behavior with the trader's own setups and rules;
- use analytics and coaching to find repeated patterns;
- archive useful examples and carry a measurable focus forward.

The product may support planning and lightweight check-ins during the trading
day, but it does not direct live orders or replace the trader's judgment.

## Capabilities and Constraints

- Broker data is normalized into a shared trade and execution model before it
  reaches journal, chart, calendar, reports, or coach surfaces.
- Journal prose and dictation preserve context that execution data cannot know.
- Charts, screenshots, and selective video can preserve the evidence behind a
  decision without making media capture mandatory for every trade.
- Analytics should compute facts deterministically; the language-model layer
  explains those facts and must not invent calculations.
- Process quality and outcome quality are separate. A disciplined loss may be
  good process, while a profitable rule break may be poor process.
- Market-date behavior is based on ET trading sessions and must remain
  consistent across review surfaces.
- Private broker exports and real trading data do not belong in committed
  files. Public examples and fixtures use synthetic or placeholder data.

## Brand Commitments

The product name is **Trading Journal AI**. Product language should be grounded,
specific, calm, and data-literate. It should avoid hype, certainty theater, and
claims that the coach can predict markets or substitute for the trader.

## Evidence on Hand

- The repository contains implemented journal, dashboard, import, calendar,
  reports, trade-detail, settings, and coach-preview surfaces.
- Product, coaching, analytics, import, and design contracts live under
  `docs/` and are the durable evidence for settled behavior.
- `samples/demo/trades.csv` provides synthetic data for product demonstrations
  and development.
- Real broker exports and account-specific trading records remain private and
  gitignored; future design work must not fabricate customer proof, performance
  claims, or trading outcomes.

## Product Principles

1. Start with the day and its story, then place the data beside it.
2. Ground coaching in evidence and the trader's own rules.
3. Keep the trader in control of conclusions and durable playbook knowledge.
4. Make reflection private, low-friction, and useful enough to repeat.
5. Turn repeated review into a clearer operating system for the next session.
