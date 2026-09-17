# Completed-trade Analytics

September 17, 2026. First implementation in the app; visual direction remains open to iteration.

## Scope

`/analytics` provides five performance views: Overview, Compare, Sizing Up,
Risk & recovery, and Review studies. Top Gainers remains a separate existing
destination. Overview uses the full content width for the stats dashboard,
cumulative P&L, histogram, recent-trade comparison, recovery summary, costs and
leading positive/negative symbol contributors. Review studies retains give-back,
concentration, re-entry and setups in its question rail. The original six
questions remain covered across Overview, Sizing Up and Review studies.

Long is the default, while the existing short side remains available. Only the
active account is loaded. Accounts are not combined and the schema has no formal
live/paper type; this implementation does not infer one from an account name.
Select the desired live account in the existing header.

## Research alignment

The implementation was reconciled against research commit `92b93a2`,
`docs/analytics/TRADERVUE_FULL_INVENTORY.md` §10 and
`docs/analytics/ANALYTICS_DELIVERY_PLAN.md` §1. Those documents remain on
`codex/analytics-research-refresh`. The first slice omitted core comparison and
recovery work; the current exploratory revision now implements those capabilities.

| Audit recommendation | Current implementation | Remaining boundary |
| --- | --- | --- |
| Stats-first overview | Grouped stats, cumulative P&L, histogram, recent-trade comparison and contribution table | Composition remains open to owner feedback |
| Reusable Compare | Editable A/B date/outcome/session/symbol/setup/tag/price/size/entry-window/duration filters; presets; shared breakdown; exact trade lists | No saved-preset manager or statistical significance claim |
| Winning versus losing sessions | Session classification precedes individual cohort filters; breakeven is explicit | Uses completed-trade final-exit sessions, including multiday positions |
| Drawdown/recovery | Closing path, recovered/ongoing episodes, sessions/calendar days/trades, rolling average | No intraday or mark-to-market equity reconstruction |
| Sizing/cost/management | Peak-size/price comparisons, per-share results, holds, adds/reductions, fees and scratches; opens equivalent editable Compare groups | No planned risk or sizing recommendation |
| Setup/tag evidence | Setup coverage, AND/OR comma-separated cohort tags, shared setup breakdown | Overlap disclosed; no automatic tag-combination catalog |

Candle-dependent MAE/MFE, entry context, liquidity, exit efficiency and planned
risk/R remain data-gated or intentionally deferred. The histogram is an
owner-requested enhancement rather than a competitor-parity claim.

## Data contract

- `loadAnalyticsReview` loads account-scoped trades, executions, fee evidence and
  tags. `analyticsReview` is a pure completed-trade projection. Neither replaces
  `analyticsTrades` or `tradeActivity`, which retain Journal/Calendar realization
  behavior.
- One trade is flat to flat with any intervening adds/reductions. Require a
  closed record and valid, balanced executions representing exactly one cycle.
  Incomplete, over-closed, malformed or multi-cycle records are excluded with an
  account-wide disclosure. Open trades remain excluded even after a partial exit.
- Assign the entire trade result to its final execution date in
  `America/New_York`, respecting daylight saving. Apply date/symbol/side/tag
  filters after history is loaded. Date boundaries can intentionally differ from
  Journal/Calendar's execution-date activity totals.
- Gross sums signed execution cash flows using exact decimal arithmetic after
  validating a complete flat-to-flat lifecycle, including known share splits.
  Gross and fees each round once per trade to cents, with half cents away from
  zero; net is their difference. This avoids floating-point tie instability.
  Net subtracts all recorded execution fees for the completed trade. Monetary
  results are rounded to cents before outcome classification; gross/net mode
  applies consistently to outcome groups, averages, profit factor and charts.
- A positive result is a winner, negative is a loser, zero is breakeven. Win rate
  is wins / (wins + losses), excluding breakeven. Profit factor is winning P&L /
  absolute losing P&L; show unavailable when there are no losses. Empty averages
  and unsupported ratios display a dash, not an invented zero or infinity.
- Fee evidence follows the existing import convention: a typed reported fee
  row (including explicit zero), or a nonzero reported execution total. A zero
  without evidence is unknown. Net values use recorded fees and remain visibly
  **provisional**, including the comparison caption and affected-trade markers.
  The costs section discloses reported-fill coverage; reported data can still
  be revised by the broker. A fee evidence record is not a guarantee that every
  eventual category has arrived.
- Fee drilldown lists affected trades. Repair uses the existing app Import flow;
  supported Schwab imports can enrich existing executions. No automatic retry
  service, provider-owner change, manual estimate, or database migration is added.
- Peak shares use the raw chronological position after each fill, before order
  grouping. Initial size and adds/reductions use the existing order grouping;
  broker split fills are not inherently separate decisions.
- Peak capital is the largest running cost basis, reducing cost proportionately
  on sales. Its maximum need not coincide with the peak share count. It is
  exposure, not intended risk. No buying-power percentage is guessed from a
  current or historical account limit.
- Entry price is volume-weighted across opening fills. Overall result per share
  is aggregate P&L / aggregate opening shares. Winner/loser per-share averages
  give each trade equal weight. Peak shares are never that denominator. Trades
  crossing a known share split retain money results; their opening price is
  normalized to entry-date share units. They are excluded from size
  and per-share measures; no undocumented normalization is invented.
- Hold duration runs from first entry to final exit. Winner/loser holds follow
  the selected gross/net outcome. Streaks follow final exit time, with ID as a
  deterministic tie-breaker and breakeven interrupting a streak.
- Session results group completed trades by exit date. Cumulative drawdown uses
  session-closing results with a starting zero; it is not account-equity or
  mark-to-market drawdown. The give-back study advances at completed-trade exit
  checkpoints, also starting at zero. It excludes partial-exit timing and
  unrealized peaks and is explicitly labeled accordingly.
- Re-entry ordinal is assigned before filters, within account/symbol/side/ET
  entry day, using valid completed cycles sorted by entry time and ID. Missing
  imported history can change the ordinal. Adds inside a position are not
  re-entries.
- Setup groups use `trades.setup`, with Unclassified visible. Generic tags are
  available as filters but are not silently reinterpreted as setups.

## Compare and recovery

Compare loads history only for the active account and shared side/symbol/tag
filters. Its groups have independent final-exit date ranges, so they may extend
beyond the period used in other views. Compare hides the global date heading
and shortcuts, and exposes its own preset-date picker; changing that picker
alone does not alter applied groups. The previous-period preset
uses the immediately preceding equal number of calendar days (not necessarily
the preceding named month or same weekdays). URL `ca` and `cb` encode validated
group definitions. Editors have an explicit Apply step and disclose draft state.
Shared filter navigation retains group definitions. Group outcome follows
the selected gross/net basis. Session classification sums shared-scope trades
before either cohort's date/characteristic filters; no selected winning trade
can relabel an otherwise losing day. Tags support explicit AND/OR membership;
cohort overlap is disclosed. Breakdown dimensions are symbol, setup, price,
peak size, entry window and intraday/multiday. Summary and breakdown rows open
exact source trades. Zero matches and small samples are described, not scored.

Recovery uses the selected period's session-closing cumulative P&L, starting at
zero without a carry-in peak. An episode starts at the first underwater close
and recovers at the first close equal to or above the high-water mark. Count
underwater sessions separately from calendar days inclusive of episode endpoints.
Episode trades include the recovery session; ongoing durations stop at the last
observed session, not today. Entire sessions are used, not inferred intraday
high-water events. Every episode opens its trades. Recent performance compares
the last 20 completed trades with the preceding 20 in the selection; partial
windows report actual counts. Rolling average uses only full 20-trade windows.

## P&L distribution

The overview pairs cumulative session P&L with a completed-trade histogram.
Bins have equal dollar width, chosen from a rounded 1/2/5 scale for the selected
sample. Integer cents determine membership. Zero is a bin edge and belongs to
the first nonnegative range. Lower edges are inclusive; upper edges are exclusive
except for the final range, which includes its maximum. No tails or outliers
are removed. Empty bins remain visible; an empty selection uses the page's empty
state. Counts and range labels are available in an exact-value table, and both
bars and populated table rows drill into the corresponding trades. Basis changes
recompute the distribution; incomplete fee evidence keeps net provisional.

## Interaction contract

Performance places the clickable date at left and section links at right. Its
view navigation precedes a single date-shortcut/filter/basis toolbar. The shared
`DateRangePicker` opens from the date on Performance and Calendar on Top Gainers. Applying an
Analytics range retains investigation, basis and trade filters, replacing date
presets and clearing stale drilldown/pagination. Its form sits outside the trade
filter form.

Account scope is cookie-owned by the existing app header. Date/symbol/side/tag,
question, P&L basis, sizing price band and A/B size bands are URL parameters.
Group membership is recomputed from that scope; the `drill` key identifies the
group rather than trusting a client-supplied list of trade IDs. The trade-review
return URL includes the group. Browser back/forward is supported. Drilldowns
paginate at 30 trades; pagination is local to that list and resets on return.

Sizing defaults to the first two populated size bands where possible. Empty
bands remain available for future size steps, displaying an honest empty sample.
Choosing the same band twice explicitly explains the overlap. Primary views
remain visible; additional filters collapse until active. Narrow windows stack
the question navigation and use locally scrolling tables/charts rather than
shrinking financial labels.

## Validation and limits

Focused synthetic tests cover scaled positions, interleaved fills from one order,
ET exit dates, overnight partials, invalid/open cycles, fee uncertainty, scratches,
empty/no-loss ratios, drawdown baseline, re-entry ordering, known share splits,
short-side preservation, full-history loading and account isolation. Existing
Journal/Calendar parity tests remain unchanged in semantics.

Browser checks exercise all six views, sizing price filtering, gross/net and
period preservation, exact trade drilldown and return, missing-fee drilldown,
empty symbol results, desktop and narrow layout. An independent finish review
identified and verified a corrected chart date-label alignment.

This is a working first slice, not completion of the broader research roadmap.
Automatic fee repair, planned stops/R metrics,
mark-to-market give-back, excursion/market-context studies and historical
buying-power percentages remain outside this implementation. No inference of
stop discipline, causality or readiness to increase size is made.

### Stabilization verification (2026-09-17)

41 focused tests passed across completed trades, exact money, comparisons,
recovery, histogram, range URLs and the existing account/Calendar realization
contracts. Full lint, schema, TypeScript and production build passed; the
pre-existing NFT tracing warning remains. An independent Python Decimal oracle
reconciled the private snapshot's projected cash flows and fees without placing
private values or fixtures in Git. Separate checks cover ET exit dates, account
totals, chart endpoints, drawdown/recovery and histogram membership. Unknown fees
remain provisional: arithmetic reconciliation cannot establish unreported broker
costs. Browser checks verify Compare preset dates and unchanged applied groups.
