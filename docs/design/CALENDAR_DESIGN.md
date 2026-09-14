# Shared month calendar

Selected 2026-09-11 after reviewing the A–E inventory. Justin chose D, the
original expanded-ledger reference, and specifically accepted its summary
layout: centered label/value pairs at the left and P&L at the far right.
The screenshot is visual authority for the arrangement, not a data fixture.

## One implementation

`src/components/MonthCalendar.tsx` owns the summary, weekday cells, weekly totals
for both `/calendar` and Journal → Month → P&L, plus the standalone Calendar
expanded day ledger. There
is no density/type-size fork. Its props carry month summaries, account identity,
ET today, no-trade dates, read-only state, optional date range and return target.
Headers and period navigation remain parent responsibilities. Calendar Year
and Journal's small week/day navigation rails are different zoom levels and
remain unchanged. The A–E comparison index and superseded calendar experiments
are retired. Change this shared component for future month-calendar work; do not
restore a snapshot or introduce a second implementation. The canonical local
app is opened with `journal` at `http://localhost:4317/calendar`.

## Interaction

Journal Month uses the shared grid as a day index: selecting any in-month
weekday opens that date in Day → P&L, including empty, no-trade and future days.
It does not expand a trade ledger or expose no-trade mutations in the grid.
Trades remain accessible from Day → Trades; no-trade management remains in
standalone Calendar. Journal Week uses the same direct-to-Day interaction.
Day links support keyboard activation and opening in a new tab.

The following disclosure behavior applies to standalone `/calendar`:

- Click a traded day to open a full-width band directly below its week.
- One day is open at a time. Click another day to move the band; click the same
  day, Close or Escape to collapse. Close/Escape restores the day-button focus.
- Below the day heading, one left-aligned muted pill shows Trades, Accuracy, PF
  and P&L in that order, separated by middle dots. It uses the existing surface-2
  fill, rounded ends and semantic P&L color. The ledger follows with time (ET), symbol, captured
  context tags and session-attributed P&L.
- Initially show six trades; Show all / Show fewer handles larger sessions.
- Symbol links open `/trades/review` directly with the calendar session date,
  symbol and selected trade ID. The return target preserves the originating
  Calendar filter or Journal Month scope. The footer action is **Review trades**:
  it opens the same review using the first chronological trade; the review's
  ticker navigation switches between the day's symbols. Existing outer breadcrumb
  conventions remain intact.
- Loading, retryable failure and no-longer-available day results are explicit.
  Review trades is disabled until a trade is available; Retry and Close remain
  available after a loading failure.

## Data and correctness

`src/lib/monthCalendar.ts` defines the common summary model. Totals use raw
wins/losses and gross profit/loss; never average daily percentages or ratios.
Scratch trades count as trades but do not enter the accuracy denominator.
Month/weekly grid totals retain the existing Monday–Friday scope and exclude
adjacent-month padding. Calendar filters retain/dim excluded day evidence;
they only exclude it from summary totals and no-trade editing eligibility.

`GET /api/calendar/day` lazily loads the light ledger, using the existing active
account cookie. The account parameter only detects stale screens; it cannot
select an account. A mismatch returns 409 without querying another account.
Every response is no-store. Impossible calendar dates are rejected.
The loader uses complete execution history to preserve cost basis, then selects
one ET activity date. It fetches no market candles, Coach data or full reviews.
Account/date changes abort pending requests; changed month/filter/summary data
resets open detail. API responses are checked against the requested account/date.

Existing account-scoped no-trade server actions and demo read-only protection
are reused. No database schema, import normalization or provider boundary changes.
No personal trading data belongs in examples, screenshots committed to Git or tests.

## Verification and remaining design work

Focused tests cover range/padding/zero-trade handling, exact ratio aggregation,
invalid dates and response shapes, API account mismatch/error behavior, and
ledger ET dates, partial exits, fees, tags and cross-account isolation.
Browser smoke checks cover both consumers and the disclosure/navigation flow.
Visual refinement beyond the selected baseline remains an iterative follow-up.
