# Journal: Compare Indicators and Key Moments

> Status: Inspiration / concept capture · 2026-07-15
>
> Reference: Google Finance chart controls and time-range navigation from the
> screenshot captured on 2026-07-15. This is a product pattern reference, not a
> proposal to reproduce Google Finance literally.
>
> Cross-device handoff bundle:
> [`handoffs/2026-07-journal-compare-dashboard/README.md`](handoffs/2026-07-journal-compare-dashboard/README.md)

![Google Finance chart-control reference](handoffs/2026-07-journal-compare-dashboard/assets/google-finance-chart-controls-reference.png)

## Thought

Add a compact visual analysis module to the Journal that lets the trader see
performance, behavior indicators, and meaningful journal events in the same
time-based view.

Working label: **Compare Indicators and Key Moments**.

The useful part of the reference is the control model:

- Choose what the primary visual measures.
- Compare it with another metric or cohort.
- Add or remove indicator overlays.
- Show key moments directly on the timeline.
- Change the review scope without leaving the module.

This could make the Journal more analytical while keeping the user inside the
reflection flow.

## Proposed Controls

### View

Allow more than one visual treatment because different questions need different
shapes:

1. **Trend / area** — best for cumulative P&L, account path, rolling metrics,
   and seeing when behavior changed.
2. **Bars** — best for discrete day, week, or month results and spotting which
   periods drove the total.
3. **Third view, to validate** — likely a calendar/heatmap for consistency and
   streaks, or a distribution view for comparing outcomes. Do not add it until
   it answers a distinct review question.

### Compare

Potential comparisons:

- P&L against trade count, win rate, payoff ratio, or average trade.
- Current period against the previous period or a rolling baseline.
- Winning days against losing days.
- One setup, tag, ticker, time window, or side against another.

Comparison controls should reveal the unit and scale clearly. Avoid placing two
unrelated series on one axis when that would imply a false relationship.

### Indicators

Potential indicator overlays:

- Trade count or frequency.
- Win rate and payoff ratio.
- Give-back or drawdown.
- Average winner and average loser.
- Rule adherence, process score, or emotion rating when those inputs exist.
- Market-condition or session-quality tags.

Indicators are diagnostic aids, not a customizable charting system. Start with
a small curated set tied to questions the Journal already helps answer.

### Key Moments

Key moments should appear as accessible annotations on the timeline, with a
marker plus a label or detail popover. Examples:

- Best/worst or unusually influential trade.
- Daily stop reached, large give-back, or overtrading threshold crossed.
- Journal note, lesson, rule change, or experiment started.
- Coach finding or session verdict.
- Import, screenshot, or other review artifact.

Markers should not rely on color alone and should collapse or cluster when the
range becomes dense.

### Time Scope

Use the Journal's natural review language:

- **Day**
- **Week**
- **Month**
- **Year**

The selected scope changes aggregation as well as the visible range. For
example, Day may plot intraday windows or trades, Week may plot sessions, Month
may plot days, and Year may plot weeks or months. Preserve account scope and ET
date behavior.

## Interaction Sketch

The module can use a quiet toolbar above the plot:

`View · Compare · Indicators · Key moments`         `Day · Week · Month · Year`

On narrow screens, keep the time scope visible and move the other controls into
one **Configure chart** sheet. The chart should retain a concise written takeaway
so the insight is not available only through visual inspection.

## Product Fit

This belongs in Journal when it helps answer:

- What mattered in this period?
- When did the result or behavior change?
- What else was happening at that moment?
- Is this different from my recent baseline?

The full statistical investigation still belongs in Analytics. Journal should
show the smaller, reflection-oriented version and preserve an **Open in
Analytics** path with the active scope, comparison, and filters.

## Smallest Useful Version

1. Add the module to week/month Journal review.
2. Support Trend and Bars.
3. Support Day / Week / Month / Year scopes.
4. Start with cumulative P&L plus one comparison metric.
5. Annotate journal entries and the most material trades as key moments.
6. Include one generated takeaway and an **Open in Analytics** link.

Questions to validate before implementation:

- Does this replace an existing Journal visualization or become a new section?
- Which single comparison most often changes a review decision?
- Are key moments system-generated, user-created, or both?
- Is the third view a calendar/heatmap, distribution, or unnecessary?
- At Day scope, should the x-axis represent clock time, trades, or both?
