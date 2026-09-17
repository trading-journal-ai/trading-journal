# Analytics surface brief

> Implemented surface · 2026-09-17 · `/analytics`

## Overview

Analytics extends the established app world in **Operate mode**: select a
review question, read deterministic results, and inspect the trades behind
them. The authority is [PRODUCT.md](../../PRODUCT.md), the canonical
[design system](DESIGN_SYSTEM.md), and the implemented app. The preceding
simple prototype established the direction; no image composition is a fidelity
target. This brief records this surface, not a replacement global identity.

Five primary views organize the workspace: Overview, Compare, Sizing Up,
Recovery, and Review studies. Overview is a full-width dashboard; the
question rail appears only within Review studies. The original six questions
remain covered across these views:

| Question | Evidence shown |
| --- | --- |
| How am I doing? | Visible grouped statistics, cumulative results, P&L distribution, closing drawdown, gross/cost/net reconciliation. |
| Am I adapting to bigger size? | Two peak-share groups within an entry-price band; winners, losers, hold, and capital exposure. |
| Am I giving gains back? | Completed-trade session peak, finish, and give-back. |
| What is carrying my results? | Removing the best or worst session separately, plus symbol groups. |
| Do repeated attempts help? | First attempts versus re-entries within symbol, side, and ET entry day. |
| Which setups work? | Recorded setup groups with explicit unclassified coverage. |

## Colors

Use the app's semantic foreground, muted, surface, hairline, and accent tokens
across its existing themes. Links and keyboard focus use accent. The cumulative chart uses
neutral marks; histogram losses use red and nonnegative ranges use green, with
explicit dollar ranges and counts; the trade ledger colors positive and
negative results with the existing trading tokens. Color never supplies the
only evidence of sign or selection.

## Typography

Sans headings and short explanatory text establish orientation. Mono tabular
figures support comparison; values stay on one line. Question titles are the
main content headings, with supporting sections quieter beneath them. The
first question leads with four compact, content-width core statistics matching
Journal’s daily summary (18px sans values; green/red for signed P&L and average
trade results) before its cumulative chart and
P&L histogram. Detailed stats stay visible in related sections, with a paired
winner/loser table. Only supporting exact chart values and the entry-session
comparison use disclosures.

## Layout

Keep the shared centered 72rem workspace measure. Performance leads with a
compact clickable date/period at the left and a quieter Performance / Top
Gainers section switch at the right. The date opens the shared `DateRangePicker`;
there is no separate Calendar button. Top Gainers retains its existing page
composition; promoting it to global navigation is a possible later change.

The five Performance views sit directly below the header. One compact toolbar
follows: Day, Week, Month, Year, All shortcuts; a Filters disclosure with the
active filter count; and a Net/Gross select with an accessible P&L basis label.
Trade filters expand into a full-width row beneath the toolbar, pushing results
down without covering them. The Filters button toggles the row with an
accessible expanded state; fields stack in narrow windows. The selected account stays in the
global app header. Completed-trade count and an expandable fee qualification
sit quietly above results, with no separate scope or basis band. Final-exit
attribution and Eastern Time are explained in the date picker and definitions.
Compare replaces the date heading with its name and hides date shortcuts. Its
preset-date picker lives within Compare and explains that it affects newly
selected presets, while group dates control applied results. Long and Net remain defaults.

Overview, Compare, Sizing Up and Risk & recovery use the full content width.
Compare exposes presets, paired group editors with an explicit Apply action,
a metric table and a shared breakdown. Group dates are shown explicitly. Sizing can open its groups in Compare.

Within Review studies at desktop widths, a 230px question rail sits beside open content with a 32px
gutter. Stats use four columns; charts and ledger tables follow across the
content width. At 1000px and below, the rail narrows to 190px and the gutter to
24px. At 760px and below, navigation becomes a two-column question grid above
the content, subtitles disappear, stats use two columns, and detailed stats
use one. Controls wrap. Tables scroll locally; the cumulative chart keeps a
500px minimum width and scrolls locally to preserve labels. This is laptop and
desktop review with narrow-window resilience.

## Elevation & Depth

Open sections use whitespace and single hairlines. There are no raised cards
or section shadows. Filled controls, the selected question, and table hover
provide local state without enclosing every result.

## Components

**Shared scope.** Question, basis, sizing choices, and drilldown are URL state.
Changing questions clears the drilldown while retaining the common scope.
Date and trade filters retain question, basis, and sizing choices. Loading
transitions expose a status message and busy state. Empty scopes explain how
to broaden the selection; reversed date ranges show an alert.

**P&L distribution.** Equal-width dollar bins show counts of completed trades.
Zero is an explicit boundary; every outlier is retained. Native buttons expose
range/count labels and open exact trades. The supporting table exposes all
ranges, counts, and percentages. On narrow screens, charts scroll locally.

**Recovery.** Drawdown appears as a session-close path with an episode table.
Recent-versus-earlier trades and a rolling 20-trade average add temporal context.
Counts, basis, window definitions and trade evidence stay visible.

**Sizing comparison.** Entry price is weighted across opening fills; size is
peak concurrently held shares. Group A and Group B select predefined share
bands within the same price band. The view pairs average-winner/loser bars
with sample counts and exact table values, then hold, loss, per-share, adds,
and capital measures. Equal groups and empty price ranges have explicit
messages. Known split-crossing trades are excluded from share comparisons.
Capital exposure is not planned risk, and differences do not establish
causation or readiness to increase size.

**Evidence and return.** Group and session links replace the question content
with its trade ledger, ordered by final exit and paginated in 30-row pages.
A back control restores the question. Symbol links open existing trade detail
with the current Analytics URL in `returnTo`, preserving the review context.
The cumulative chart has a text description and an exact session-results
disclosure; bars retain visible numeric values. Focus is visibly outlined.

**Fee uncertainty.** A scope-level disclosure identifies incomplete fee
coverage and opens affected trades. Net labels, comparison captions, and
ledger asterisks keep provisional results visible. Recorded zero without
broker evidence is not confirmed free. Recovery points to the existing Import
control and supported fee enrichment; it does not promise all fees have been
reported or add a separate repair workflow.

**Definitions.** Inline notes and the Data scope and definitions disclosure
explain flat-to-flat trades, final exit date in ET, account-wide exclusions,
win rate excluding exact-zero breakevens, and undefined profit factor without
losses. Journal/Calendar execution-date totals can differ at date boundaries.
Give-back advances only at completed-trade checkpoints, beginning at zero;
closing drawdown excludes unrealized moves. The current calculation and
interaction contract is [Completed-trade Analytics](../analytics/ANALYTICS_REVIEW.md).
Source calculations live in
[`analyticsReview.ts`](../../src/lib/analyticsReview.ts) and account loading in
[`loadAnalyticsReview.ts`](../../src/lib/loadAnalyticsReview.ts).

## Do's and Don'ts

- Do lead with results, sample counts, definitions, and paths to supporting
  trades. Keep additional metrics in intentional disclosures.
- Do preserve account/date/P&L context through investigation and return.
- Do distinguish descriptive comparison from causal conclusions or trading
  instructions.
- Don't imply the editable A/B comparisons establish causation. Fee repair
  automation beyond existing import, mark-to-market give-back, and planned
  stops/R analysis remain outside the implemented scope.
- Don't promote surface-specific sizes or composition into global tokens.
  Private trading data and screenshot copies do not belong in Git.

Implementation evidence: [`AnalyticsWorkspace.tsx`](../../src/components/analytics/AnalyticsWorkspace.tsx),
its [stylesheet](../../src/components/analytics/AnalyticsWorkspace.module.css),
and the [Analytics route](../../src/app/(app)/analytics/page.tsx).

Cumulative chart axis labels use fixed 11px HTML text, independent of SVG plot
scaling. Dollar ticks are whole dollars and dates use short month/day labels
(with years across year boundaries). Exact cents remain in stats and the
session-results table; chart calculations are unchanged.
