# Tradervue analytics: full accessible inventory

**September 17, 2026 · authenticated UI inspection · product research**

This expands and supersedes the initial live inspection retained in the private research branch. All seven report areas were opened, including all six subsections in Detailed, Win vs Loss Days and Compare. Overview's three modes, seven advanced-filter groups, Advanced's full axis menu, and the rendered dashboard widgets were inventoried.

**Boundary:** this is an inventory of the analytics UI exposed in this session, not a complete validation of paid functionality, arithmetic, or every filter permutation. Locked previews are examples, not account results. The dashboard's Add Widgets control did not open a picker after retries; any additional unseen catalog remains unknown. Screenshots were inspected in the browser session, but no private screenshot files or trading values are included in this report. No layout, trade, subscription or saved-filter changes were submitted.

## 1. Coverage and confidence

| Step | Surface | Coverage / general health |
| --- | --- | --- |
| 1 | Dashboard | Rendered widget inventory and edit controls inspected. Add Widgets unresponsive in this browser session; no layout saved. Some widgets empty while others populated; shared date/scope consistency needs validation. |
| 2 | Overview | Recent, Year/Month/Day and Calendar opened. Monthly → weekly switch and calendar month expansion worked. Expanded month was wider than the narrow viewport. |
| 3 | Detailed | Stats and all six subsections opened. Accessible charts populated; premium previews recorded separately. Very long pages repeat count/performance pairs. |
| 4 | Win vs Loss Days | Stats and all six subsections opened. Paid results locked; chart preview families visible. Intraday-only population explicitly stated. |
| 5 | Drawdown | Metrics and all visible chart previews inventoried. Paid results locked. |
| 6 | Compare | Both group builders, presets, stats and all six subsections opened. Normal Generate Report returned to the locked surface; no working comparison validated. |
| 7 | Tag Breakdown | Summary/detailed controls, columns and combination toggle inspected. Toggle loaded; meaningful multi-tag intersection not established in selected scope. Tag-to-trades drilldown was verified in the preceding inspection. |
| 8 | Advanced | Six quick-report choices and the complete 44-choice X/Y menus inventoried. Stop-analysis preset selected; chart stayed a locked preview. |
| 9 | Filtering and units | All seven advanced accordions opened. Basic symbol/date and side/duration combinations submitted; side/duration persisted from Detailed to Overview. Advanced fields locked. Gross/net, dollars/risk/ticks and total/average choices recorded. |

This is broader than the first pass: the first pass missed Overview hierarchy/calendar, four Detailed subsections, subsections below the Win/Loss and Compare stats, most advanced filters, most Drawdown previews, and the lower dashboard.

## 2. Dashboard: rendered widget inventory

The page exposes 30/60/90-day controls. Edit Layout exposes Save Layout, Reset to default, Add Widgets, drag handles and widget delete controls. Editing was opened only to inspect these controls. No widget was added, removed or moved, and Save/Reset were not used. Leaving through Reports returned to the report surface; no successful widget-picker interaction can be claimed.

The following **32 widget types**, including the calendar, were found in the rendered dashboard. Some rendered chart regions were empty in the selected period; presence is not verification of a populated calculation.

| Family | Widgets |
| --- | --- |
| Session/navigation | Calendar strip; Open Trades |
| Performance path | Cumulative P&L; Cumulative Drawdown; Average Trade P&L; Win % |
| Outcome comparison | Winning vs Losing Trades; Hold Time Winning Trades vs Losing Trades; Average Winning Trade vs Losing Trade; Largest Gain vs Largest Loss |
| Summary statistics | Profit Factor; Total Fees; Total Number of Trades; Average Daily Volume; Max Consecutive Wins; Max Consecutive Losses; Average Position MAE; Average Position MFE; Average MFE vs MAE; Daily Volume |
| Personal-trade breakdowns | Performance By Day Of Week; Performance By Duration; Performance By Price; Performance By Hour Of Day; Performance By Month Of Year; Tag Breakdown |
| Instrument context | Performance By Instrument Opening Gap; Performance By Instrument Day Type; Performance By Instrument Volume; Performance By Symbol ATR; Performance By RVOL; Performance By Instrument Movement |

Several compact breakdown widgets expose pagination. Open Trades lists open date, symbol, volume, execution count, P&L and sharing status, with links to journal/trade details. These are observed links, not a verified full review flow in this pass.

**Assessment:** a configurable dashboard can promote selected report summaries, but replicating the entire catalog creates another long report page. Start with a curated default and a small set of optional summaries. Do not prioritize a full drag-and-drop builder merely for parity.

## 3. Shared filters, units and report scope

### Basic controls

| Control | Exposed choices / behavior |
| --- | --- |
| Symbol | Text input; symbol + date-range submission exercised |
| Tags | Multi-tag entry; Must have all tags checkbox; selected tags removable |
| Side | All, Long, Short |
| Duration | All, Intraday, Multiday |
| Date range | Today, Yesterday, Last 7 Days, Last 30 Days, This Month, Last Month, Last 12 Months, Last Year, YTD, Custom Range; calendar and Apply/Cancel |
| Apply / clear | Checkmark submit; clear-filter control; active-filter badge when scrolling |
| Custom Filters | Add new custom filters and save control visible; no preset saved |
| P&L type | Gross; Net disabled with Gold label |
| View mode | Dollar value; Risk disabled with Gold label; Ticks |
| Report type | Aggregate P&L; Per-trade average |

**Exercised:** Long + Intraday alongside the pre-existing tag filter; those selections persisted from Detailed to Overview. A symbol + prior-year date filter submitted successfully. Temporary symbol/date/side/duration selections were cleared afterward, preserving the original tag scope. This validates application/navigation, not numeric correctness or exhaustive AND/OR semantics. Total/average was exercised in the preceding pass. Risk/net remain unavailable; ticks conversion was not reconciled.

**Scope exceptions:** Compare uses independent A/B filters and says global filters do not apply. Win vs Loss Days explicitly uses intraday trades regardless of Duration. Compare also displays an intraday-only note despite offering Intraday vs Multiday and duration filters; the locked session cannot resolve that inconsistency.

### Advanced-filter inventory

All seven groups were expanded. The exposed fields were locked in this session; dropdown contents hidden behind those locks were not bypassed. Range fields generally show min/max inputs.

| Group | Fields |
| --- | --- |
| Days/Time | Day of week; time of day; month; duration |
| Price/Volume | Price in dollars; volume traded; in-trade price range; execution count |
| Instrument | Gap %; volume; RVOL; ATR; day type; entry % of ATR; intraday % move; prior-day RVOL |
| Win/Loss Trades | Trade result; day result; P&L percentage gain; P&L in R; P&L in dollars |
| Tags | Tag win %; excluded tags; tag profit factor; tag P&L; tag average position MFE; tag count; tag average position MAE; tag volume |
| Entry Distance to Daily SMA | 5-, 10-, 20-, 50-, 100-, 200-day SMA distance |
| Statistics | Best-exit P&L in dollars and R; position MAE/MFE; price MAE/MFE; time to position MAE/MFE; time to price MAE/MFE; initial risk; exit efficiency %; commissions and fees; P&L % of MAE; P&L % of MFE |

**Assessment:** the useful product capability is composing a relevant trade population and preserving it across views. A smaller coherent filter system is preferable to shipping dozens of ambiguous inputs. Show active scope, applied units, missing-data exclusions and sample size near results.

## 4. Overview: all three modes

| Mode | Inventory | Inspection result |
| --- | --- | --- |
| Recent | 30/60/90-day controls; gross daily P&L; cumulative gross P&L; daily volume; win % | Viewed populated charts; not every interval separately reconciled |
| Year/Month/Day | Distribution and performance by year; year selector; Monthly/Weekly switch; distribution/performance by month or week; month selector; distribution/performance by day | Switched Monthly to Weekly and verified headings changed; day panels visible |
| Calendar | Year selector; twelve compact month calendars; Open/Active month controls; expanded month with daily P&L, trade counts, weekly totals and monthly P&L | Opened a populated month; calendar is wider than the inspected narrow viewport |

Recent report tooltips assign P&L to realization date and volume to occurrence date. Win percentage uses closed trades, assigning multiday trades to entry date. These are different populations/time rules, even on the same page.

Year/Month/Day is chronological exploration. Detailed's Month of Year is seasonal grouping across all selected years. Those are different questions and should have different labels in our product.

## 5. Detailed: stats plus all six subsections

### Stats grid

Accessible values: total gain/loss; largest gain/loss; average daily gain/loss; average daily volume; average per-share gain/loss; average trade; average winning/losing trade; total, winning, losing and scratch counts; average hold time separately for scratches, winners and losers; maximum consecutive wins/losses; trade P&L standard deviation; profit factor.

Locked values: System Quality Number, probability of random chance, Kelly percentage, K-ratio, total commissions, total fees, average position MAE/MFE. Availability differs by surface: for example, excursion columns appeared in the tag table and widgets appeared on Dashboard. Do not extrapolate a global entitlement rule from one screen.

Largest outcomes and streak values are links. Their target review flows were not exercised in this pass.

### Report catalog

“Pair” below means a trade-distribution chart and a performance chart. Performance generally supports total or per-trade average through the report-type control.

| Subsection | Accessible charts | Locked preview charts / controls |
| --- | --- | --- |
| Days/Times | Pairs for weekday, entry hour, month of year, intraday/multiday duration, and intraday holding-duration bands | No additional locked chart family observed; hour intervals 1h/30m/15m |
| Price/Volume | Pairs for price bands and volume traded | Pair for in-trade price range |
| Instrument | Top 20 and bottom 20 symbols; instrument-volume pair; entry-price versus SMA pair | Pairs for current relative volume (% of 50-day average), prior-day relative volume, instrument movement, opening gap, day type, ATR, entry % of ATR, and relative volatility (TR/ATR) |
| Market Behavior | Pairs for selected benchmark movement, opening gap and day type | Benchmark choices: SPY, QQQ, IWM, XLF, GLD, USO, UNG, VXX, VXXB, TLT, IEF |
| Win/Loss/Expectation | Win/loss ratio; win/loss P&L comparison; trade expectation; cumulative P&L; cumulative drawdown | These charts rendered in this session, including drawdown |
| Liquidity | No unlocked charts in this session | Distribution/performance for percentage of all, entry and exit shares adding liquidity: six previews |

Instrument SMA choices: 5, 10, 20, 50, 100 and 200 days. Tooltip defines distance relative to the moving average calculated on the day before entry, and excludes trades containing options. Top/bottom symbols rank by total or average P&L.

Market movement is defined as entry-day close versus prior close. Market day types: inside range; outside range; trend up; trend down. The displayed trend-up rule requires a close above the prior high, an open in the bottom 15% of the day's range, and a close in the top 15%; trend down is the opposite. These use completed-day information, not solely information available at entry.

**Correction to initial assessment:** the standalone Drawdown report is locked, but cumulative drawdown is available in Detailed → Win/Loss/Expectation. “Drawdown unavailable” is too broad.

## 6. Win vs Loss Days and Compare

Both have the same six subsection names as Detailed: Days/Times, Price/Volume, Instrument, Market Behavior, Win/Loss/Expectation, Liquidity. Every subsection was opened on both pages. These are selectable views below the statistics, not merely labels in the main navigation.

### Statistics shared by the comparison layouts

Total gain/loss; average daily gain/loss and volume; average per-share and per-trade gain/loss; total/winning/losing trade counts; average winner/loser; P&L standard deviation; probability of random chance; K-ratio; SQN; Kelly percentage; winner/loser hold times; profit factor; largest gain/loss; average position MFE/MAE; total commissions; total fees. Results locked.

### Win vs Loss Days

Groups are profitable sessions versus losing sessions. The question is which trade characteristics differ between those two kinds of day, rather than simply which trades won or lost.

| Subsection | Exposed preview families |
| --- | --- |
| Days/Times | Weekday/hour, intraday duration, month of year; paired comparison bars; 1h/30m/15m choices visible |
| Price/Volume | Price; volume preview labeled Instrument Volume; in-trade price range. Do not silently relabel instrument volume as position size. |
| Instrument | Instrument volume; current/prior-day relative volume; movement; opening gap; day type; ATR; entry % ATR; SMA distance; additional volatility preview region. Results locked. |
| Market Behavior | Benchmark movement, gap, day type; benchmark selector |
| Win/Loss/Expectation | Separate win/loss ratios for each day group; P&L comparison; expectation; cumulative P&L; cumulative drawdown |
| Liquidity | Distribution/performance for all, entry and exit shares adding liquidity |

Gold-specific banners appear on Instrument, Market Behavior and Win/Loss/Expectation; general page says Silver/Gold. These labels document the current visible UI, not an independently verified pricing matrix.

### Compare

Quick reports: winning versus losing trades; long versus short; intraday versus multiday; last year versus this year; last month versus this month.

Each group exposes symbol, tags, side, trade P&L (all/winning/losing), duration and date range. Reset and Generate Report controls are present. The same six subsection families expose locked previews; opening each did not unlock account results. Some preview labels retain “winning/losing days” even in the general Compare surface, so they should not be treated as proof of group behavior.

The Long vs Short preset selector changed, but did not visibly populate the group Side fields in this locked session. Normal Generate Report reloaded the locked page. No successful A/B calculation or custom cohort chart was verified.

**Assessment:** prioritize one reusable comparison system. Presets should visibly populate editable filters, groups should disclose their definitions, and every summary should link to its actual trades. Avoid silently sharing a subsection selection across unrelated reports without a clear indication.

## 7. Standalone Drawdown

Five summary metrics: average drawdown; biggest drawdown; average days in drawdown; number of days in drawdown; average trades in drawdown.

Five visible chart previews: drawdown-increase distribution by weekday; performance by weekday; P&L moving average; P&L volatility; average P&L in R / expectancy over 20 trades. All locked. The rolling-20 label is evidence of a presented feature, not validation of its calculation, settings or recommended window.

**Assessment:** duration and recovery add information beyond maximum drawdown. A rolling result view can reveal recent deterioration that a long cumulative curve obscures. For our initial implementation, use a clearly defined rolling average net trade outcome and realized-P&L drawdown; do not manufacture R values without recorded planned risk.

## 8. Tag Breakdown

Summary columns: tags, graph, gross P&L, count, volume. Detailed columns: tags, win %, profit factor, average position MFE, average position MAE, gross P&L, count, volume.

Show Tag Combinations was toggled on, loaded, then restored off. This does not establish meaningful intersection results in the selected scope. Summary/Detailed modes were inspected across the two passes. The prior pass verified a tag row opens the filtered Trades page.

The previous pass also found that per-trade-average mode changes values while the column continues to read “Gross P&L.” Use “Average net P&L/trade” versus “Total net P&L” explicitly in our tables.

**Assessment:** this is a useful foundation for setup comparisons. Include untagged trades and annotation coverage; a sparse tag table can hide the majority of a trader's activity. This is our recommendation, not a claim that Tradervue provides coverage reporting.

## 9. Advanced: complete exposed metric menu

Quick reports: P&L by duration; P&L by weekday/time; trade P&L over time; trade P&L by liquidity added (disabled); trade drawdown in R (disabled); trade drawdown / stop analysis. The last was selected; the plotted result remained a locked preview. Scale data points by trade P&L checkbox visible.

Both X and Y menus expose the same **44 choices**. “Selectable” means the menu option is enabled, not that the report is usable on the current plan.

| Family | Selectable options | Disabled options |
| --- | --- | --- |
| Result / size | P&L ($); per-share P&L ($); per-share P&L (ticks/pips); per-share % P&L; duration; volume; entry price; exit price | P&L (R); R ($) |
| Excursion | Position MFE ($), position MAE ($); price MFE/MAE ($); price MFE/MAE (ticks/pips); price range during trade ($ or ticks/pips); P&L % of MFE/MAE | Position MFE (R); position MAE (R) |
| Sequence / timing | Trade open date/time; day of week/time; trade index; time to position MFE/MAE; time to price MFE/MAE | — |
| Exit review | — | Best-exit P&L; exit efficiency |
| Market / instrument | Market movement %; market opening gap %; instrument volume; instrument volume % of 50ma; prior-day instrument volume % of 50ma; instrument movement %; instrument opening gap %; instrument ATR(14); entry as % of ATR(14) | — |
| Execution costs | — | Percentage shares adding liquidity (all, entry, exit); commission; commission and fees |

**Assessment:** a flexible scatter plot is a power-user investigation tool. A guided sizing or management comparison is a better default. Excursion timing can help investigate whether winners were exited early or losers lingered, but cannot establish intent or the fillability of an alternative exit.

## 10. What changes in our recommendation

These are product judgments from the inspection, not conclusions about the user's trading performance. Some are already present in our older research; the contribution here is confirming concrete implementations and selecting what to prioritize.

| Candidate | Evidence that sharpened it | Decision for our product | Data / interpretation constraint |
| --- | --- | --- | --- |
| Recent performance and recovery | Rolling expectancy, P&L volatility/moving average, days/trades in drawdown | Bring forward a compact “recent vs earlier” comparison and recovery duration; larger priority than weekday charts | Define rolling window and minimum sample; distinguish realized equity from mark-to-market equity; R gated on planned risk |
| Execution complexity in Sizing Up | Execution-count filters, volume-vs-price breakdowns, per-share outcomes | Compare peak shares and entry-price bands with adds/reductions and winner/loser hold time; distinguish increasing size from increasing churn | Fill count can be broker fragmentation; count meaningful position changes separately. No discipline/emotion inference |
| Comparable groups across all breakdowns | Six repeated subsections under Detailed, Win/Loss Days and Compare | One comparison workspace with presets, shared dimensions, sample sizes and trade drilldown | Show group definitions; avoid treating before/after differences as causal |
| Market context available at entry | Prior-day RVOL and prior-day SMA alongside full-day movement/day type | Separate “known at entry” from “full-session context”; use selected context filters in sizing/setup studies | Historical market-data coverage and timestamps required; no look-ahead in entry explanations |
| Costs and scratch behavior | Scratch count/hold time; gross/net modes; commissions/fees and per-share controls | Keep scratch outcomes distinct and make net/gross/cost impact clear inside sizing review | A gross scratch can be a net loser; define treatment and fees consistently |
| Setup coverage and overlapping tags | Tag-combination option and multi-metric tag table | Setup table with untagged coverage, count, average net, PF, win rate and source trades | Overlapping tags are not additive; tag assignment coverage must be visible |
| Optional dashboard summaries | Broad rendered widget catalog | Keep a small curated overview; optional favorite summaries later | Add Widgets behavior not verified; do not infer popularity from catalog size |
| Liquidity / best-exit tools | Maker/taker-style shares-added analysis, best-exit/exit-efficiency controls | Defer until data supports a specific review question | Reliable liquidity flags, fee attribution and defensible alternative-exit assumptions needed |

### Proposed structure after the fuller inspection

- **Overview:** existing stats grid; realized P&L and drawdown; compact recent-performance/recovery context; one contribution table.
- **Compare:** a reusable table/chart with winners vs losers, winning vs losing sessions, setup/symbol, session window and period presets. Timing lives here as a dimension.
- **Sizing Up:** price bands × clearly defined position size; net dollars and cents/share; winner/loser hold times; costs and meaningful adds/reductions; comparable group filters.
- **Deeper research:** entry-context filters, excursions/timing, volatility normalization and custom scatter plots only when coverage is adequate.

Calendar navigation remains valuable, but our Journal already owns daily review. Reuse its drilldown rather than introduce a second calendar just for parity. The full widget builder, standalone weekday/month/duration chart walls, Kelly/SQN/K-ratio, and hypothetical best-exit results are not baseline requirements.

This refines content and priorities; no production Analytics behavior has changed and no new primary navigation is accepted yet.

## 11. Limits, UX observations and follow-up verification

- The Add Widgets picker could not be opened in this browser session. Existing dashboard types are inventoried; unseen widgets remain unknown. No settings were saved.
- Locked reports expose preview images and labels. Their true paid filters, chart interactions, exports, calculations and drilldowns cannot be certified here. No paywall was bypassed.
- Read-only filter checks establish visible applied scope, not arithmetic reconciliation. Custom Filters saving, layout saving, deleting, imports, account settings and sharing were outside this research scope.
- Repeated chart pairs and stats-before-subsections create long navigation paths. A compact comparison table can put activity and performance together.
- Narrow-view tables/calendar overflow; important columns need deliberate priority and visible scrolling. This is an observed viewport limitation, not a complete responsive audit.
- Several icon-only controls expose glyphs rather than descriptive accessibility names; chart regions vary in whether they expose a tabular alternative. Keyboard navigation, focus order and screen-reader operation were not comprehensively tested.
- Some dashboard components were empty while breakdown widgets were populated. Treat scope consistency as unresolved, not a confirmed arithmetic bug. Clearly labeled date/population/fee scope is a requirement for our design.
- Private screenshots stayed in session; this sanitized inventory is the durable artifact. A shareable screenshot gallery would require a separate redacted capture workflow.

Next evidence needed, if available: working paid A/B comparisons and advanced filters; successful widget picker; metric definitions for per-share weighting, scratch classification, net fees, open/partial positions, equity drawdown and best-exit assumptions. Full combinatorial filtering and a numerical audit are distinct from this product inventory.
