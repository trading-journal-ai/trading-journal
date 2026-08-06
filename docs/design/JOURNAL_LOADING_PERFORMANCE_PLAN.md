# Journal Loading and Performance Plan

> **Status:** implementation direction captured 2026-08-06; defer optimization
> until the focused-day and Calendar/index UI contracts settle.
>
> **Runtime priority:** the installed Electron app reads primarily local data.
> Journal navigation should therefore feel local and immediate, not like web
> page navigation.
>
> **Related:**
> [Unified Review Navigation](UNIFIED_REVIEW_NAVIGATION.md),
> [Journal Review Module](../product/JOURNAL_REVIEW_MODULE.md).

## Scope

This plan applies only to the local read-write Electron application. The hosted
demo, static hosting, Vercel, Turso, and the paused Cache Components migration
are explicitly out of scope. They do not constrain this plan and no work on
them is implied by it.

## Performance is part of the interaction contract

The current date-transition motion is exploratory polish around a slower data
handoff. It must not become the permanent way the product hides latency. Once
the UI direction is stable, optimize the data boundary first and retune or
remove motion afterward.

The expected experience is:

- Selecting another day in a loaded week changes the day immediately.
- Moving to an adjacent prefetched week or month feels equally immediate.
- An uncached period shows one bounded loading state inside the changing data
  region; the application shell and navigation never disappear.
- Coach generation, candle-heavy inspection, and external enrichment may load
  later without blocking the day record.
- Empty, stale, loading, and error states are visibly different.

## Current implementation and the missed reuse

The focused Journal day currently loads the selected day, its full week, and
its month comparison data. Those independent range reads already run in
parallel, but the detailed data for the other days in the week is reduced to
comparison summaries and is not retained by the client. Selecting another day
starts a new dynamic server render and repeats much of the same work.

The first performance opportunity is therefore not a more elaborate loader.
It is to make the data boundary match the week strip already visible in the UI.

## Provisional performance budgets

Measure before implementation and validate these budgets against a realistic
high-trade-count fixture. They are product targets, not claims about current
performance.

| Interaction | Target |
| --- | --- |
| Click feedback (selection/date/navigation chrome) | next paint; target ≤50ms |
| Day switch inside a loaded week | useful P&L and trade content ≤100ms; no loader |
| Cached adjacent week or calendar month | useful content ≤100ms |
| Uncached local week or month | first useful content target ≤250ms |
| Loading-state appearance | delayed about 120ms so fast reads do not flash a loader |
| Layout stability | no page-shell replacement or meaningful layout shift |

Track p50 and p95 rather than one ideal run. The Electron development build and
packaged application should both be measured because framework development
overhead can make the local preview misleadingly slow.

## Data boundaries

### `CalendarMonthBundle`

Calendar/index should load only what the month grid needs:

- date and session state;
- P&L, trade count, accuracy, and profit factor;
- week and month totals;
- intentional no-trade state; and
- lightweight reflection/Coach completion indicators if the final UI includes
  them.

It should not fetch raw executions, candle series, full notes, generated Coach
copy, or inline trade-review data. Prefetch the previous and next month after
the visible month is ready.

### `JournalWeekBundle`

Changing weeks should request one bounded five-session package rather than five
sequential day requests. It should contain enough serializable data for instant
switching among the visible days:

- the week-strip summary for all five dates;
- each day's header metrics and empty/no-trade state;
- cumulative daily P&L points;
- ticker rollups and compact trade rows;
- the deterministic facts required by the visible P&L, Trades, and Chart Read
  views; and
- week comparison summaries shared by all five days.

After the bundle arrives, choose the requested date. When entering a week from
period navigation without a requested date, choose the first meaningful session
according to the finalized UX rule (first weekday versus first session with
trades). Do not make the remaining four days wait on individual requests.

### Lazy day details

The following may load per day or on explicit disclosure because they are
heavier, less frequently opened, or mutation-rich:

- generated Coach reviews and generation controls;
- full reflection history and editing workflows;
- candle-heavy opportunity context that is not already cached;
- expanded inline trade review; and
- full ticker/day workspaces.

Lazy content must reserve its layout or enter within its own panel. It must not
turn a ready P&L view back into a page-level loading state.

## Cache and prefetch policy

Use a bounded in-memory client cache for interaction speed. The underlying
database remains the source of truth.

- Key week data by `accountId + weekStart + dataVersion`.
- Key calendar data by `accountId + month + dataVersion`.
- Keep the current, previous, and next period; evict older entries.
- Prefetch adjacent periods after the current period becomes interactive.
- Promote a hover, focus, or pointer-down on an arrow/date into a high-priority
  prefetch when the target is not already cached.
- Deduplicate concurrent requests and ignore responses superseded by a newer
  navigation intent.
- Never reuse data across accounts, even briefly during account switching.

### Invalidation

Invalidate the smallest affected cache region after:

- broker import, re-import, reconciliation, or trade deletion;
- account switch;
- no-trade status change;
- trade tag, setup, or note mutation;
- journal reflection mutation; and
- Coach generation or experiment mutation.

Not every mutation invalidates every layer. A reflection edit should refresh
the affected day/Coach state without discarding unchanged P&L points. An import
may change the day, week, month, Calendar, Trades, and Analytics summaries and
therefore requires broader invalidation.

## Loading-state grammar

Loading states explain what is happening; they do not decorate every data read.

### 1. Optimistic navigation

Use when the destination is already known from the current UI. Selection,
period label, and date controls respond immediately. This is appropriate even
before uncached content is ready.

### 2. Ready from cache

Swap content without a loader. A brief content transition is optional and must
not establish a minimum wait time.

### 3. Initial or uncached load

Wait roughly 120ms before revealing a loader. If the read finishes first, show
the content directly. When needed, the loader occupies only the data region and
preserves its final dimensions. Prefer the existing Journal plotting language
for chart data; use quiet structural placeholders for Calendar cells or text
panels rather than one generic spinner everywhere.

### 4. Background revalidation

Keep usable stale content visible while refreshing. Show a subtle local status
only when the refresh is long enough to matter. Do not replace ready content
with a skeleton.

### 5. Empty

Empty means the request completed successfully and there is no applicable
data. Preserve navigation and note capture. Distinguish future session,
intentional no-trade day, no imported trades, and no matching filtered data.

### 6. Error

Keep the surrounding period and navigation usable. Name the failed region and
offer a local retry. Cached content may remain visible with a stale/error
label. External candle failure must not make local trade data unavailable.

## Surface-specific behavior

### Focused Journal day

- A loaded week behaves as a local workspace: day changes do not reconstruct
  the page.
- URL state and browser Back/Forward stay synchronized with local selection.
- Day → P&L remains the default when the product contract requires a reset.
- Coach and expanded trade review may load independently.

### Calendar/index

- Keep the calendar frame, weekday labels, and period controls stable.
- Navigate cached months instantly and prefetch adjacent months.
- For an uncached month, preserve the grid geometry while its lightweight
  summaries load.
- Selecting a day should prefetch or reuse its `JournalWeekBundle`, then open the
  focused day without forcing Calendar to fetch day-detail data itself.

### Trades and Analytics

The shared `PeriodNavigator` should use the same optimistic control behavior
and bounded period cache, but each surface owns a purpose-built payload. Do not
reuse the Journal week bundle as a universal response if it makes other views
download fields they do not render.

## Implementation sequence

1. **Instrument first.** Mark navigation intent, data-ready, first useful
   content, and settled render for Journal day/week and Calendar month changes.
2. **Extract serializable builders.** Separate week/day payload construction
   from the large server-rendered `TradeJournalReview` component and remove
   duplicate range work before adding a cache.
3. **Create the week workspace.** Hydrate `JournalWeekBundle`, switch days
   locally, synchronize URL/history, and handle rapid navigation races.
4. **Add Calendar bundles.** Load lightweight month summaries and prefetch
   adjacent months and selected-day weeks.
5. **Split heavy details.** Lazy-load Coach, candle-heavy context, and expanded
   trade review behind their actual interaction triggers.
6. **Add targeted invalidation.** Prove imports, edits, account switching, and
   Coach mutations cannot leave stale or cross-account data.
7. **Retune motion last.** Remove loaders or transitions that no longer explain
   a visible wait.

## Risks and guardrails

- Large weeks with many executions can create oversized serialized payloads;
  measure payload size and keep raw executions out of the default bundle.
- Server-rendered Coach forms/actions currently cross the client boundary;
  isolate them rather than moving the entire review system client-side.
- Date calculations must preserve the application's ET trading-day semantics.
- Prefetch must not trigger paid/external market-data work. External enrichment
  remains explicit or cache-only during navigation.
- Loading animation is not evidence of success. Compare before/after timings
  and remove any state that only masks a preventable delay.

## Acceptance criteria

- Every day in a loaded week opens without a loader or server round trip.
- Week and month arrows prefetch predictably and never issue request waterfalls.
- Calendar month navigation loads only summary data and keeps its grid stable.
- Coach or chart-detail latency never blocks local trade facts.
- Back/Forward, deep links, empty days, rapid clicks, and account switching remain
  correct.
- Imports and edits invalidate affected summaries without flushing unrelated
  periods.
- The measured packaged Electron experience meets the provisional budgets or
  records a specific, evidenced exception.
