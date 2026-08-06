# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Self-directed active traders reviewing imported broker activity during and after
the trading day. They need to preserve what the data cannot know—intent,
emotion, perception, and decision sequence—without turning review into a long
data-entry ritual.

## Product Purpose

Trading Journal AI is a local-first review system that helps a trader capture
the human story of each session, inspect the supporting trade evidence, and
carry a small number of useful lessons into future behavior.

Success means the trader can quickly reconstruct a day, understand what
happened, identify what is worth repeating or changing, and find that context
again without manually mining an archive.

## Positioning

The product starts with the day and the trader's own account rather than a trade
table. Dictation-first reflection, imported executions, charts, analytics, and
Coach interpretation remain connected while retaining distinct roles. The
trader's language is preserved; generated interpretation stays evidence-backed,
correctable, and explicitly adopted before it becomes a durable rule or cue.

## Operating Context

- Import broker executions into a normalized local trade record.
- Use Journal as the calendar-based source of truth: browse dates, focus one
  day, dictate or write reflection, and inspect supporting trades.
- Use the Journal review module to compare the selected day with its week or
  month and to open the relevant Coach interpretation.
- Use Analytics for cross-period, symbol, setup, behavior, and market-context
  investigation.
- Use Dashboard for today's plan, lightweight check-ins, and the one accepted
  lesson or experiment that should remain visible during the live session.

## Capabilities and Constraints

- Journal and Calendar are one product surface. Calendar is Journal's temporal
  index, not a peer destination.
- Journal focuses one day at a time. Week and month scopes provide comparison
  and overview rather than a continuous stack of full day entries.
- Free-form typing and dictation are primary capture methods. Classification
  and structured refinement cannot block saving a useful note.
- Dashboard owns live carry-forward behavior; Journal owns the durable record.
- Analytics owns deterministic cohorts and drilldowns. Coach translates between
  narrative and evidence without becoming a second analytics dashboard.
- Daily observations do not silently become permanent patterns. Recurrence,
  source evidence, trader correction, and explicit adoption govern promotion.
- The product does not provide live trade calls or execute orders.
- Imported and enriched market data may have incomplete coverage; conclusions
  must expose material sample and coverage limitations.
- Open decisions: the exact compact date-navigation interaction, compatibility
  handling for `/calendar`, and the maximum number of simultaneous active
  carry-forward focuses.

## Brand Commitments

- Product name: Trading Journal AI.
- Calm, direct, reflective language appropriate for an accountability tool.
- Reinforce constructive behavior without shaming, gamifying loss, or assigning
  identity labels from isolated sessions.
- Keep the trader's original voice visible alongside Coach synthesis.

## Evidence on Hand

- Existing Journal and Calendar routes, normalized trades and executions,
  daily notes, tags, charts, P&L views, and deterministic Coach facts.
- The current Journal review module already supports Day, Week, and Month scopes
  with scope-specific P&L, trade, edge, risk, alignment, and Coach views.
- Product and interaction direction is documented in
  `docs/design/UNIFIED_REVIEW_NAVIGATION.md` and
  `docs/product/TRADING_JOURNAL_LEARNING_LOOP.md`.
- The project does not yet have a selected visual concept for the replacement
  Journal navigation.

## Product Principles

1. Capture human context before categorizing it.
2. Keep evidence close without letting data displace reflection.
3. Make retrieval explicit and fast; never depend on long scrolling or manual
   archive maintenance.
4. Promote few, cited, trader-approved lessons rather than generating a stream
   of advice.
5. Separate reflection, investigation, and live accountability while preserving
   the context that connects them.
