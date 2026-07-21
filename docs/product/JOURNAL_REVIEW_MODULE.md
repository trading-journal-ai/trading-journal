# Journal Review Module — Component Contract

> Status: Accepted direction · Last updated: 2026-07-20

## Purpose

`JournalReviewModule` is an embedded review-and-annotation workspace inside a
single day journal. It gives the trader enough outcome, trade, process, and
historical context to inspect the session and write useful notes before handing
that context to Coach.

P&L is the default view, but the component is not only a P&L chart. It owns the
12 related review views across Day, Week, and Month.

## Ownership and placement

The day journal is the page-level review unit. Its intended order is:

1. Day header and session summary.
2. Session verdict.
3. `JournalReviewModule`.
4. Coach Context: day-level narrative, dictation/notes, context completion,
   coach generation, and coach output.

The module must render inside the selected day's content—not as page-level
navigation above the day journal. Existing trade-review or note cards may remain
below it during the transition, but their long-term ownership follows the
boundaries above.

## Default and state behavior

- Every newly loaded day journal initializes the module at **Day → P&L**.
- Selecting a different journal date resets the module to **Day → P&L**.
- Day, Week, and Month are analytical lenses anchored to the selected date.
  They are not journal-page scopes and must not render a stream of additional
  day journals.
- Changing scope or view updates only the module's content. The surrounding day
  header, verdict, Coach Context, archive selection, and page scroll structure
  remain owned by the day journal.
- The page URL owns the selected journal date and return path. Module state is
  local UI state for V1; it should not reuse legacy `preset`, `from`, or `month`
  page-routing behavior.

## Journal route and archive behavior

- `/journal` loads the active account's latest imported trading day and selects
  its month and week in the archive. No “last imported day” callout is shown.
- The archive does not include a Today link. A day only becomes the journal
  default after trade data has been imported for it.
- After a successful import, the app opens the newest imported trading day from
  that import. If it falls on Wednesday of Week 3, Wednesday loads and Week 3 is
  selected.
- Months are ordered newest-first. Weeks remain chronological within each month
  so scrolling down always moves forward in time.
- The current/latest month lists weeks only through the week containing its
  latest imported day. Future Week 4 or Week 5 entries are not shown early.
- Opening a month renders its weeks and days as one continuous server-rendered
  journal stream. Week links target anchors within that stream rather than
  opening a separate week page.
- As scrolling crosses from one week section into the next, the archive updates
  its selected week. Scroll-driven selection may replace the URL hash, but must
  not create browser-history entries or alter `JournalReviewModule` state.

## View matrix

| Lens | Views | Data window |
| --- | --- | --- |
| Day | P&L · Trades · Process · Coach | Selected market date |
| Week | P&L · Edge · Alignment · Coach | Week containing the selected date |
| Month | P&L · Horizon · Risk · Coach | Month containing the selected date |

The navigation renders once per day journal. Switching lenses selects that
lens's P&L view first. Content and calculations can evolve without changing
this component contract.

## Trade inspection paths

The module supports two intentional paths for inspecting trades:

1. **Inline review:** Day → Trades expands a selected trade in place so the
   trader keeps the day-journal context while inspecting the chart, executions,
   and note.
2. **Full review:** “Open full ticker review” opens the existing ticker/day
   review surface for a larger chart and the original all-trades-for-that-ticker
   workflow. It must preserve a `returnTo` path back to the selected day journal.

Both paths operate on the same trade and note data. The full review is deeper
inspection, not a second note model. It may be removed later, but remains a
supported path for V1. See also
[Journal Design](../design/JOURNAL_DESIGN.md#tickerday-review-workspace).

## Data contract

The module receives the selected date plus prepared Day, Week, and Month data.
It may display imported broker facts, executions, charts, calculated summaries,
structured setup/rule context, and saved notes. Missing information stays
explicit; the module must not infer an intentional no-trade day, market quality,
or trader motivation from absent data.

Trade and ticker notes created through either inspection path roll back into
the selected day and become evidence for Coach. Note capture follows the
text/dictation-first direction in
[Notes, Dictation, and Coach Context](NOTES_DICTATION_COACH_MODEL.md).

## Boundary with Coach Context

`JournalReviewModule` helps the trader observe, inspect, and annotate evidence.
Coach Context owns the day-level explanation the broker data cannot provide,
the readiness/completion state for review, and the generated coaching response.
The module may show a Coach view, but it must not duplicate the page-level Coach
Context workflow.

## Acceptance criteria

- The selected day header and verdict appear before the module.
- Exactly one Day/Week/Month navigation is visible in the day journal.
- A day journal and every date change start at Day → P&L.
- All 12 views are reachable without replacing the surrounding day journal.
- Week and Month use windows anchored to the selected date.
- Inline trade review opens and closes without leaving the journal.
- Full ticker review opens with the relevant trade/ticker selected and returns
  to the same day journal.
- Empty and partial data states remain usable and clearly labeled.
