# Unified Review Navigation and Learning Loop

> **Status:** exploration captured 2026-08-06 from hands-on product use
> **Scope:** Journal, Calendar, Trades, Analytics, daily reflection, and
> carry-forward behavior
> **Not yet locked:** route consolidation, persistence model, and final visual
> treatment

## Product realization

The Journal was originally imagined as something the trader could read like a
personal journal: how the day felt, what improved, what went right, what went
wrong, and what should change next. The production day view still has value,
especially its Coach feedback and evidence-backed interpretation.

The missing piece is not another recap section. It is the transition from one
day to the next:

1. The trader reflects in their own language.
2. The Coach helps distill the reflection and trade evidence.
3. The trader adopts one concrete focus.
4. That focus resurfaces before the next session.
5. The next recap evaluates whether the focus helped.
6. The focus is continued, refined, completed, or retired.

Without those state changes, useful notes become archive material instead of
stepping stones. The product can describe days but cannot yet demonstrate
growth across them.

The Journal should not fight the fact that trading review is data-based. Trade
data is the evidence substrate. The product distinction is how it combines that
evidence with human context, emotional state, and a longitudinal improvement
loop. Data should ground the reflection without becoming the emotional center
of the experience.

## The closed improvement loop

```text
Capture reflection
  -> Coach distills
  -> Trader adopts one focus
  -> Focus resurfaces before the next session
  -> Next recap checks the focus against behavior and evidence
  -> Continue / refine / complete / retire
```

### Required objects

| Object | Purpose |
| --- | --- |
| Reflection | The trader's editable account of emotion, intent, behavior, what worked, and what did not. |
| Coach synthesis | A concise interpretation grounded in reflection plus deterministic trade evidence. |
| Carry-forward focus | One adopted behavior or experiment with a plain-language statement, source day, review horizon, and observable measure. |
| Next-session cue | The compact version of the active focus shown before or during the next session. |
| Resolution | The later judgment: upheld, missed, mixed, no opportunity to test, revised, completed, or retired. |

The focus must remain visibly owned by the trader even when the Coach proposes
it. Generated advice should never become a durable rule silently.

### Daily recap handoff

The top of a focused day should answer two temporal questions:

1. **What was I trying to improve today?** Show the active carry-forward focus
   and let the trader mark whether the day tested it.
2. **What am I carrying into the next session?** End with one adopted focus,
   not an unbounded list of observations.

This turns the Daily Recap from a report into a checkpoint in an ongoing
practice.

## Focused day hierarchy

The Journal should render one focused day at a time. Suggested reading order:

1. Date, result line, previous/next trading-day controls, and jump-to-date.
2. Prior carry-forward check-in: what the trader intended to practice and what
   happened.
3. Trader reflection: emotion, confidence, intent, what worked, and what did
   not.
4. Coach synthesis: the day-level verdict, evidence, and the most important
   contradiction or reinforcement.
5. Adopt or refine one carry-forward focus.
6. Compact supporting evidence: ticker/session summaries, key metrics, and
   notable trades.
7. Raw trades, calculations, and deeper Analytics investigation on demand.

The existing canonical day template remains useful. Continuous month-length
scrolling does not. Retrieval should be explicit rather than encoded as scroll
position.

## One temporal navigation model

Calendar, Trades, Journal, and Analytics currently express similar time-range
navigation with different controls and behaviors. They should share one
temporal vocabulary and interaction contract.

### Shared `PeriodNavigator`

Every review surface should compose the same primitives:

- Scope: Day / Week / Month / Year, limited to scopes the surface supports.
- Previous and next at the selected scope.
- Current period label that opens a direct picker.
- Jump to today / latest imported session.
- URL-backed state so links preserve the selected account, scope, and period.
- Optional filters after the period controls, not mixed into date navigation.

The speed test is simple: after selecting Month, the trader should be able to
move three months backward with three predictable presses. The same mental
model should work in Trades and Analytics.

### Surface roles

| Surface | Primary job |
| --- | --- |
| Journal | Reflect, receive Coach feedback, adopt a focus, and resolve the previous focus. |
| Calendar | Scan time visually and select a day or period. It may become a Journal browse mode rather than a peer destination. |
| Trades | Inspect imported evidence quickly, filter it, and open trade detail without losing the list context. |
| Analytics | Investigate patterns across periods and send a finding or experiment back into the learning loop. |

Whether Calendar becomes a Journal view or remains a separate route is not yet
decided. Either implementation should reuse the same date state and selection
model. Calendar should not be the only efficient way to navigate Journal days.

## Shared trade inspection

Trades and Journal should use one trade-inspection component and interaction:

1. A compact trade row provides time, ticker, direction/size, context status,
   and result.
2. Selecting the row expands the same large trade review directly below it.
3. The expansion preserves scroll position and list context.
4. A secondary action opens the full ticker/day workspace when deeper review
   is needed.
5. Only one large inspection panel should be open in a list at a time.

This interaction already exists in partial form inside Journal and should be
normalized rather than recreated independently in Trades. The implementation
should extract the existing behavior into a shared component before either
surface diverges further.

For high-trade-count sessions, ticker/session grouping should precede the raw
trade list. Raw rows remain available, but they should not be the first retrieval
surface.

## Decisions reopened

- Keep one canonical day template.
- Replace month-length continuous Journal scrolling with a focused day plus
  direct date navigation.
- Preserve Calendar's strong visual overview while deciding whether it is a
  Journal browse mode or a separate route.
- Standardize period movement across Trades, Analytics, Calendar, and Journal.
- Standardize inline trade inspection across Trades and Journal.
- Treat reflection plus evidence as complementary; do not try to make the
  Journal non-data-based.
- Make carry-forward resolution a first-class product state, not display copy.

## Questions for the next prototype

1. Is there exactly one active carry-forward focus, or can the trader pin a
   small set with one primary focus?
2. Does the next day begin with a lightweight check-in before showing new Coach
   analysis?
3. What is the shortest useful resolution flow for upheld, missed, mixed, and
   untested focuses?
4. Does Calendar live inside Journal as a browse mode, while `/calendar`
   remains a deep link for compatibility?
5. Should the Journal date index show reflection/Coach completion state in
   addition to result and trade count?
6. At what trade count does the UI switch from raw rows to ticker/session
   grouping by default?

## First prototype slice

Use a representative imported day and prove these interactions before changing
production contracts:

1. Shared Day / Week / Month navigator with predictable previous/next movement.
2. Focused Journal day with prior-focus check-in at the top.
3. Reflection and Coach synthesis leading to one adopted next-session focus.
4. Compact trade list using the shared inline inspection component.
5. Calendar/date picker that selects the focused Journal day without requiring
   a second navigation system.

This prototype is successful when the trader can move to an earlier month,
select a day, inspect one trade, and understand the improvement carried into the
next session without relying on a long scroll.
