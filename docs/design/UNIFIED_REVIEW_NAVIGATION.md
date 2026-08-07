# Unified Review Navigation and Learning Loop

> **Status:** period-navigation direction locked 2026-08-07 from hands-on use
> **Scope:** Journal, Calendar, Trades, Analytics, daily reflection, and
> carry-forward behavior
> **Locked here:** Calendar becomes the Journal's date index rather than a peer
> destination; Journal uses one URL-backed Day / Week / Month navigator
> **Not yet locked:** persistence model and the remaining Calendar integration

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

### Two tracks, one product

The earlier exploration diluted two separate jobs by asking one surface to do
both:

| Track | Primary question | Product ownership |
| --- | --- | --- |
| Human reflection and behavior change | What happened inside me, what did I learn, and what should I remember tomorrow? | Journal captures; Dashboard carries the adopted cue forward. |
| Evidence and pattern detection | Where does my edge appear, and which behaviors recur in the data? | Analytics computes and exposes evidence; Coach interprets it at the appropriate cadence. |

Coach bridges the tracks, but it should not collapse them. A trader's emotional
account can be important before it is statistically measurable. A statistical
pattern can also be useful without requiring the trader to manufacture a
matching journal narrative.

## What is actually solvable

A journal cannot guarantee that reflection changes behavior. Requiring the
trader to reread old entries is also a weak product dependency: even useful
notes become difficult to retrieve once the archive grows.

The product can solve three narrower problems:

1. **Capture:** make it effortless to add human context to the current day.
2. **Remember:** retain the note with its date, session, trades, and market
   context so the trader does not have to organize it manually.
3. **Selectively resurface:** bring back a small number of relevant observations
   when recurrence or current context makes them useful.

The minimum viable Journal is therefore quick capture, not a complete behavior
change system. It should remain valuable even if the trader never opens Coach,
never promotes a focus, and rarely browses old entries.

### Quick-capture contract

- Add a note to today without navigating through Calendar or opening a full
  recap form.
- Support short prose or dictation first; structured fields are optional
  refinement, not a gate.
- Save immediately into the focused day and preserve the trader's original
  language.
- Allow optional attachment to the whole day, a ticker/session, or a trade
  without requiring classification.
- Keep capture available from the focused Journal day and relevant in-session
  Dashboard prompts.
- Show a clear saved state and allow later editing.

The first interaction prototype should target a useful note in roughly thirty
seconds. The note can be as small as an emotion, an observation, or a sentence
about what went right or wrong.

### Dictation-first behavioral narrative

The central Journal input should allow the trader to speak through the sequence
of a difficult day in their own language. A representative narrative is:

```text
The stock began moving and I felt triggered to participate. I entered too
quickly and took a loss. When it moved without me, I chased another entry,
lost again, increased size, and made the next loss worse. Then it moved without
me anyway.
```

The product should preserve that story before trying to categorize it. Coach
may then reflect the sequence back as a tentative chain:

```text
trigger -> rushed entry -> loss -> pursuit -> another loss -> size escalation
```

That chain is more useful than a generic "overtrading" label because it locates
the intervention. The candidate lesson may be patience after the first stopped
attempt, but it becomes tomorrow's cue only after the trader accepts or edits
it. The original dictation remains visible and editable beside any synthesis.

## Pattern ledger, not an unread archive

Notes should be inputs to a cited pattern ledger, not a library the trader must
manually mine. The system may connect a note to deterministic trade evidence,
but it should not silently rewrite the note or turn one difficult day into a
durable identity label.

Use the existing Coach recurrence vocabulary:

```text
session-only -> emerging -> repeated -> established -> resolving / resolved
```

Each pattern entry should retain:

- the original note excerpts and source dates;
- supporting and contradicting trade evidence;
- recurrence state and last-observed date;
- the behaviors or conditions that define it;
- whether the trader confirmed, corrected, dismissed, or adopted it; and
- any active experiment and its outcome.

Positive and negative patterns should use the same machinery. "Waited for clean
confirmation" deserves recurrence tracking just as much as "chased after a
loss." Good habits should be reinforced; harmful habits should be investigated
without moralizing the trader.

### Overtrading is a diagnosis, not a trade-count threshold

High frequency can be appropriate when the opportunity set is strong. A useful
overtrading finding needs multiple signals, such as:

- declining result quality by trade sequence;
- short re-entry latency after a loss;
- same-ticker churn;
- size or frequency escalation after losses;
- continued entries after the strongest opportunity window; and
- the trader's stated intent, emotion, and market-quality context.

Coach may call the pattern emerging when these signals align. Analytics should
provide the cohort comparison and source trades. The trader should be able to
correct the interpretation when legitimate scaling, partial exits, or an active
market regime make raw trade count misleading.

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

Trades, Journal, and Analytics currently express similar time-range navigation
with different controls and behaviors. They should share one
temporal vocabulary and interaction contract.

### Shared `PeriodNavigator`

Every review surface should compose the same primitives:

- Scope: Day / Week / Month / Year, limited to scopes the surface supports.
- Previous and next at the selected scope.
- Current period label that opens a direct picker.
- Jump to today / latest imported session.
- URL-backed state so links preserve the selected account, scope, and period.
- Optional filters after the period controls, not mixed into date navigation.

The interaction and data-loading contract for these controls is captured in
[Journal Loading and Performance Plan](JOURNAL_LOADING_PERFORMANCE_PLAN.md).
Period navigation should feel immediate in the local Electron app; loaders are
bounded fallbacks for uncached data, not the primary navigation experience.

The speed test is simple: after selecting Month, the trader should be able to
move three months backward with three predictable presses. The same mental
model should work in Trades and Analytics.

### Journal production contract

The Journal treats period scope as navigation rather than local module state:

- `Today` returns to the current ET date and Day scope.
- `Day`, `Week`, and `Month` are URL-backed and change the whole review horizon.
- Previous/next steps by trading day, week, or month to match the selected
  horizon.
- Day keeps the five-session week strip for fast neighboring-day selection.
- Week and Month remove that strip and open their period summary directly.
- The secondary module tabs describe the selected horizon (`P&L`, `Edge`,
  `Risk`, `Coach`, and related lenses); they no longer repeat temporal scope.

This resolves the earlier two-level Day / Week / Month ambiguity without
creating a second page shape. The same focused record and comparison data remain
underneath each URL-backed view.

### Surface roles

| Surface | Primary job |
| --- | --- |
| Journal | Scan the calendar, select a day, dictate or write reflection, receive Coach feedback, adopt a focus, and resolve the previous focus. |
| Trades | Inspect imported evidence quickly, filter it, and open trade detail without losing the list context. |
| Analytics | Investigate patterns across periods and send a finding or experiment back into the learning loop. |
| Dashboard | Carry the active focus into today's behavior and accept lightweight in-session check-ins. |

Calendar is the Journal's browse/index mode, not a peer product destination.
Selecting a date opens the canonical focused Journal day. The existing
`/calendar` route may remain temporarily as a compatibility redirect or alias,
but it should not keep an independent navigation vocabulary or information
architecture.

The Journal therefore has two complementary views of the same record:

- **Calendar/index:** fast month and year scanning, period movement, and direct
  day selection.
- **Focused day:** dictation, reflection, Coach synthesis, evidence, and
  carry-forward resolution.

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

## Decisions clarified

- Keep one canonical day template.
- Replace month-length continuous Journal scrolling with a focused day plus
  direct date navigation.
- Make Calendar the Journal's browse/index mode rather than a separate product
  destination.
- Standardize period movement across Trades, Analytics, and Journal.
- Standardize inline trade inspection across Trades and Journal.
- Treat reflection plus evidence as complementary; do not try to make the
  Journal non-data-based.
- Make carry-forward resolution a first-class product state, not display copy.
- Keep Dashboard responsible for carrying the selected lesson into the live
  day; do not make Journal duplicate that job.
- Treat instant local period/day navigation and bounded loading states as part
  of the product contract; see
  [Journal Loading and Performance Plan](JOURNAL_LOADING_PERFORMANCE_PLAN.md).

## Questions for the next prototype

1. Can the trader add a useful day note in roughly thirty seconds without
   completing the full recap?
2. Is there exactly one active carry-forward focus, or can the trader pin a
   small set with one primary focus?
3. Does the next day begin with a lightweight check-in before showing new Coach
   analysis?
4. What is the shortest useful resolution flow for upheld, missed, mixed, and
   untested focuses?
5. Should the Journal date index show reflection/Coach completion state in
   addition to result and trade count?
6. At what trade count does the UI switch from raw rows to ticker/session
   grouping by default?

## First prototype slice

Use a representative imported day and prove these interactions before changing
production contracts:

1. Thirty-second note capture into the focused day, with no classification
   required.
2. Shared Day / Week / Month navigator with predictable previous/next movement.
3. Focused Journal day with prior-focus check-in at the top.
4. Reflection and Coach synthesis leading to one adopted next-session focus.
5. Compact trade list using the shared inline inspection component.
6. Journal calendar/index that selects the focused day without requiring
   a second navigation system.

This prototype is successful when the trader can move to an earlier month,
select a day, inspect one trade, and understand the improvement carried into the
next session without relying on a long scroll.
