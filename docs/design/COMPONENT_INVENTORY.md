# Component inventory & extraction plan

> Status: Living · Last updated: 2026-07-22 · Companion to
> [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)

A census of the UI across the four site areas (Journal, Calendar, Trades,
Analytics/Reports), and the plan to turn recurring patterns into real shared
components. Check items off as they're extracted.

## Why this exists

`DESIGN_SYSTEM.md` **names** a set of primitives — `Money`, `Eyebrow`, `Dot`,
`StatBlock`, `SegmentedControl`, `GhostButton`, `Tag`, `OpenSection`,
`HBar`/`DivBar` — but **none of them are extracted as shared components.** They
are inline conventions, re-typed on every page. That is the root cause of the
drift the design-system audit fixed at the docs level: "the components" were
never components, so nothing enforced them.

Evidence (production pages under `src/app/(app)/`):

- 0 of ~10 named primitives exist in `src/components/`.
- 23 inline eyebrow-style label spans.
- 9 files formatting numbers inline (`tabular-nums`).
- 5 files coloring P&L by sign inline.
- 3 different range/period filters for one pattern (`PeriodTabs`,
  `CalendarRangeFilter`, `ReportRangeFilter`).

## The tier model

The dividing line: **reusable, theme-driven, used across features → design
system. A feature's specific composition, with its own data/behavior → feature
module (linked from the system, not absorbed into it).**

1. **Atoms** — the smallest reusable units. Live in the design system, rendered
   on `/design-system`.
2. **Patterns** — atoms composed into a recognizable block (a stats matrix, a
   ledger table). Also in the design system.
3. **Feature modules** — page-level compositions with their own data/behavior.
   They *consume* the system; the system links to their feature docs, it does
   not embed them.

**Wiring rule:** as each atom/pattern is extracted, `/design-system` imports and
renders the **real** component (replacing the current hardcoded demo), and its
inline copies in the area pages are swapped for it. The design system stays a
true mirror of code.

Proposed home for extracted atoms: `src/components/ui/`.

## Per-area census

| Area | Route (lines) | How it's built | Patterns living inside |
| --- | --- | --- | --- |
| **Journal** | `journal/page.tsx` (97) | → `TradeJournalReview` (feature comp) | recap block, coach-voice, ticker rail, day-stat line, pills |
| **Calendar** | `calendar/page.tsx` (580, mostly inline) | `CalendarRangeFilter`, `PeriodTabs` | month/year grid, **calendar cell**, weekly total |
| **Trades** | `trades/page.tsx` (661, mostly inline) | `ReportRangeFilter`, `PeriodTabs` | **ledger table**, filters, P&L cells |
| **Trade review** | `trades/review/page.tsx` (368, composed) | `ReviewHeader`, `TickerReviewWorkspace`, chart | ✅ already well-extracted — the model to copy |
| **Analytics (Reports)** | `reports/page.tsx` (1073, mostly inline) | `ReportRangeFilter`, `PeriodTabs` | **ReportsStatsMatrix**, **HBar/DivBar**, `CumulativePnlChart`, section eyebrows |
| **Dashboard** | `dashboard/page.tsx` (304) | → `DashboardStickyBoard` | week columns, StatBlock row, cumulative chart |

Already extracted and reusable (keep, don't rebuild): `CumulativePnlChart`,
`PeriodTabs`, `TickerReviewWorkspace`, `ReviewHeader`, `LightweightTradeChart`,
`CollapsibleSection`.

## Extraction backlog

### Tier 1 — Atoms (evidence-ordered, extract first)

- [ ] **`Eyebrow`** — mono uppercase kicker. 23 inline copies across `(app)`.
- [ ] **`Money`** — mono tabular, P&L-colored, signed, no-wrap. Inline in
  reports/trades/calendar/dashboard.
- [ ] **`Dot`** — green/red valence circle. Inline valence markers.
- [ ] **`StatBlock`** — stacked label over mono value. Inline in dashboard +
  reports summary strip.
- [ ] **`Button`** — ghost + action variants. Inline everywhere.
- [ ] **`SegmentedControl`** — one control that replaces `PeriodTabs` +
  `CalendarRangeFilter` + `ReportRangeFilter`.
- [ ] **`Tag`** — pill + valence dot. Visual spec in
  [`../coach/TAG_VISUAL_SYSTEM.md`](../coach/TAG_VISUAL_SYSTEM.md) (currently
  WIP — extract once that lands).

### Tier 2 — Patterns (compose atoms)

- [ ] **`OpenSection`** — eyebrow + rule + content, no box. The default wrapper.
- [ ] **`ReportsStatsMatrix`** — from `reports/page.tsx` (1073 lines).
- [ ] **`LedgerTable`** — from `trades/page.tsx` (661) and reports.
- [ ] **`CalendarCell`** — from `calendar/page.tsx` (580).
- [ ] **`HBar` / `DivBar`** — count + diverging P&L bars, from `reports/page.tsx`.

### Tier 3 — Feature modules (link from the system, do not absorb)

- `TradeJournalReview` → [`JOURNAL_DESIGN.md`](JOURNAL_DESIGN.md) ·
  [`../product/JOURNAL_REVIEW_MODULE.md`](../product/JOURNAL_REVIEW_MODULE.md)
- `TickerReviewWorkspace` → [`TICKER_REVIEW_DESIGN_HANDOFF.md`](TICKER_REVIEW_DESIGN_HANDOFF.md)
- `DashboardStickyBoard` → dashboard concept docs
- Tagging system → [`../coach/TAG_VISUAL_SYSTEM.md`](../coach/TAG_VISUAL_SYSTEM.md) ·
  [`../coach/TAG_TAXONOMY.md`](../coach/TAG_TAXONOMY.md)

## Suggested sequence

1. Extract Tier 1 atoms into `src/components/ui/`, render each on
   `/design-system`, swap inline copies area-by-area.
2. Extract Tier 2 patterns, starting with the biggest offender (Reports).
3. Add the Tier 3 "Patterns & feature modules" linked index to `/design-system`.
