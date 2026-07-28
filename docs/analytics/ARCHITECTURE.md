# Analytics Architecture

> Status: direction and system boundary
>
> Product loop: **Opportunity → Judgment → Execution → Reflection → Analysis →
> Guidance**

## Purpose

Analytics should identify what to keep, change, or investigate before the next
session. It is not a collection of equal-weight charts.

The product surfaces have distinct jobs:

- **Journal captures** the trader's decisions, notes, and review.
- **Analytics measures** outcomes, behavior, and persistence.
- **Coach interprets** deterministic evidence and proposes one next action.
- **Dashboard reminds** the trader of the current focus and risk boundary.
- **Opportunity review** describes what was available to trade, including
  qualified names that were missed or intentionally avoided.

This document is the architecture home. Detailed calculations and contracts
remain in the focused specs linked below.

## Analytical Model

Keep these questions separate:

| Layer | Question | Primary evidence |
| --- | --- | --- |
| Opportunity | What was available to trade? | Scanner capture, market breadth, candidate snapshots |
| Selection | Did the trader focus on the right names? | Timestamped priority/pass decisions joined to outcomes |
| Execution | Was the trade entered and managed well? | Executions, candles, planned risk, MAE/MFE |
| Reflection | What did the trader believe and feel? | Day, ticker, and trade notes |
| Analytics | Which patterns persist? | Versioned deterministic metrics and cohorts |
| Guidance | What should change next? | Evidence-backed finding and experiment |

A profitable rule violation is not automatically good process. A planned loss
is not automatically poor process. Outcome and process evaluations remain
separate.

## Product Surfaces

### Journal

The narrative and decision record. It owns notes, setup/thesis, catalyst
context, process judgment, emotions, and the daily recap. Dense research tools
link out to Analytics rather than expanding the Journal into a terminal.

### Analytics

The evidence workspace. Its stable review modes are:

- **Overview:** period orientation and recent direction.
- **Stats:** auditable performance metrics.
- **Edge:** setup, time, symbol, price, and duration attribution.
- **Risk:** drawdown, loss concentration, streaks, and give-back.
- **Compare:** two explicit cohorts with sample-size warnings.
- **Coach:** deterministic findings translated into one next experiment.

### Coach

The Coach narrates computed facts; it does not calculate statistics. Every
claim should expose its time range, sample, definitions, filters, and supporting
trades.

### Dashboard

A reduced operating surface: current focus, risk mode, active guardrail,
market-context summary, and at most a few reminders.

### Opportunity Review

The dated Journal recap owns the daily opportunity ledger. Weekly and monthly
Analytics may later aggregate recognition, participation, missed-opportunity,
and correct-avoidance patterns.

## System Layers

1. **Ingestion:** broker fills, notes, screenshots, scanner events, market data,
   and optional provider enrichment. Preserve source and timestamps.
2. **Normalization:** executions → positions → trade ideas → ticker campaigns →
   sessions; market events → candidate snapshots → daily opportunity sets.
3. **Local store:** relational records plus cached raw price series. Provider
   payloads must not become the application contract.
4. **Deterministic analytics:** versioned calculations with explicit inputs,
   filters, sample size, and coverage.
5. **Interpretation:** AI converts questions to structured queries and explains
   returned facts.
6. **Delivery:** Journal, Analytics, Coach, and Dashboard receive only the data
   appropriate to their jobs.

## Market-Data Dependency Policy

The production baseline must work on the Massive Stocks Free plan:

- Fetch market data once and cache it locally.
- Use end-of-day one-minute aggregates for journal and research workflows.
- Compute VWAP, EMA, ATR, RVOL, MAE/MFE, and other indicators locally.
- Make sync jobs resumable and safe at five requests per minute.
- Treat snapshots, WebSockets, flat files, and second aggregates as optional
  enrichment—not required inputs.
- Show `unknown` or partial coverage when a source was unavailable.

The $29 Starter plan is a backfill accelerator. It may populate durable local
history during a temporary subscription, but no core view or metric may require
Starter-only access to keep working. See
[Market Data Strategy](MARKET_DATA_STRATEGY.md).

Specialized sources remain isolated behind their own adapters:

- Stock Info owns alert-time scanner evidence.
- The Journal owns trades, participation, notes, and outcomes.
- Massive owns public aggregate/reference data used for retrospective context.
- Supply/dilution intelligence remains manual or provider-specific until a
  trustworthy licensed or EDGAR-derived contract exists.

## Trust Rules

- Never rank an alert-time candidate using later price outcomes.
- Never infer scanner compliance from completed-day candles.
- Preserve ET session dates and observation timestamps.
- Keep raw evidence immutable where practical; version derived features.
- Missing data remains missing.
- Natural-language analytics uses
  **question → structured query → calculation → interpretation → evidence**.
- Counterfactuals show the profitable sessions they would remove, not only the
  losses they would avoid.
- Small samples and outlier-dependent results are labeled explicitly.

## Delivery Sequence

### Foundation

- Correct execution/trade/campaign grouping.
- Session replay, core statistics, rolling horizons, and evidence drill-down.
- Setup/process capture and process-versus-outcome review.
- Free-compatible candle and market-context synchronization.

### Edge and behavior

- Setup, time, attempt-number, size, loss-sequence, and give-back analytics.
- Entry opportunity context, MAE/MFE, RVOL, gap, and prior-day levels.
- Compare cohorts and rule experiments with stability warnings.

### Opportunity and market context

- Scanner-owned candidate snapshots and explicit coverage.
- Opportunity participation, missed names, and correct passes.
- Market heat and regime segmentation.
- Candidate outcomes and historical analogs.

### Later research

- Interpretable price-shape similarity.
- Provider-backed supply profiles.
- Advanced natural-language analytics and dynamic weekly planning.

## Detailed Contracts

- [Analytics Research Plan](ANALYTICS_RESEARCH_PLAN.md) — module inventory,
  readiness, and workspace priorities.
- [Review Engine Spec](REVIEW_ENGINE_SPEC.md) — deterministic findings and
  persistence gates.
- [Statistical Review](STATISTICAL_REVIEW.md) — uncertainty, clustering, and
  confidence.
- [Edge Attribution Plan](EDGE_ATTRIBUTION_PLAN.md) — setup and source
  attribution.
- [Opportunity-Context Calculator](OPPORTUNITY_CONTEXT_CALCULATOR.md) —
  fills-to-candles entry and management evidence.
- [Opportunity Set Capture Plan](OPPORTUNITY_SET_CAPTURE_PLAN.md) — alert-time
  evidence, hindsight outcomes, and candidate/trade joins.
- [Price Action Quality Model](PRICE_ACTION_QUALITY_MODEL.md) — chart-evidence
  vocabulary and interpretation boundaries.

