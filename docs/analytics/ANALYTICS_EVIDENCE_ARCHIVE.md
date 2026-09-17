# Analytics evidence archive

> Curated September 17, 2026 · historical product research, not the current
> application specification.

This index keeps the evidence behind the Analytics redesign accessible without
bringing the old prototype or its pre-implementation plans into the maintained
app history. For shipped behavior, definitions, and known data limits, start with
[Completed-trade Analytics](ANALYTICS_REVIEW.md) and the
[Analytics surface brief](../design/ANALYTICS_DESIGN.md).

## Retained evidence

| Source | What it establishes | Limit |
| --- | --- | --- |
| [Full Tradervue inventory](TRADERVUE_FULL_INVENTORY.md) | The report areas, visible dashboard widgets, basic and advanced filters, comparison controls, and report subdivisions inspected in an authenticated September 17 session | Paid previews, calculations, hidden widget choices, and most filter combinations were not verified |
| [Visual evidence register](ANALYTICS_VISUAL_EVIDENCE.md) | Attributed public screenshots from Tradervue, TraderSync, TradeZella, Edgewonk, and TradesViz, with observed UI and our interpretation separated | Screenshot capture dates and unseen interactions are uncertain; links may change |

The inventory is a point-in-time observation of Tradervue's exposed UI. It is not
an endorsement of each widget or proof of the platform's arithmetic. The visual
register links to externally hosted images; no third-party image binaries or
private account screenshots are stored in this archive.

## Decisions carried into the app

The accepted work leads with core statistics, cumulative results, a trade-result
histogram, and paths to supporting trades. Compare exposes two editable cohorts
with visible definitions. Sizing Up compares peak concurrent shares within a
stock-price band, including winners, losers, hold time, per-share outcomes, and
costs. Recovery and Review studies cover drawdown, give-back, concentration,
re-entry, and setup coverage. Shared date, account, basis, and fee qualifications
are defined in the implementation contract linked above.

The competitor catalog did not justify permanent walls of weekday and duration
charts. It also did not establish a useful planned-risk or R-multiple measure for
this trader's current process. Those are product choices grounded in owner
feedback, not claims about which competitor calculations are correct.

## Historical material retained outside the published archive

The original `codex/analytics-research-refresh` branch retains the lightweight
HTML sketch, the earlier live-inspection note, and the proposed delivery and
priority plans. They document how the direction changed. Their navigation,
implementation status, and staffing proposals predate the built app, so they are
not current instructions or a branch to merge. The branch descends from older
local history and must not be pushed or merged wholesale into the public repo.
A verified private Git bundle also preserves that history for recovery.

## Further investigation

The full inventory identifies paid comparison behavior, hidden widget choices,
and advanced-filter calculations that could not be exercised. The visual register
identifies a missing combined size-by-price screenshot. Investigate these only
when a concrete product question needs them; record new dates, scope, and direct
observations separately from inference. For application gaps such as fee repair,
candle-dependent excursions, and historical buying-power limits, use the current
[Analytics contract](ANALYTICS_REVIEW.md) rather than the old delivery proposal.
