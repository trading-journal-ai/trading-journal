# Design QA — journal data-exploration wireframe

## Source visual truth

- `/Users/justin/Downloads/exports/wireframe-1a-page-before.png`
- `/Users/justin/Downloads/exports/wireframe-1b-page-after.png`
- `/Users/justin/Downloads/exports/wireframe-1c-coach-feed.png`
- `/Users/justin/Downloads/exports/wireframe-2a-day-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-2b-week-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-2c-month-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-3a-day.png`
- `/Users/justin/Downloads/exports/wireframe-3b-week.png`
- `/Users/justin/Downloads/exports/wireframe-3c-month.png`

## Implementation evidence

- `/tmp/journal-data-wireframe-qa/01-before-day-pnl-viewport.png`
- `/tmp/journal-data-wireframe-qa/02-month-risk-contract.png`
- `/tmp/journal-data-wireframe-qa/03-after-review.png`
- `/tmp/journal-data-wireframe-qa/04-coach-feed.png`
- `/tmp/journal-data-wireframe-qa/05-mobile-before.png`
- `/tmp/journal-data-wireframe-qa/06-mobile-month-risk.png`
- `/tmp/journal-data-wireframe-qa/07-day-pnl-module.png`
- `/tmp/journal-data-wireframe-qa/08-week-edge-module.png`
- Route: `http://localhost:3001/preview/journal`

## Viewports and states

- Desktop: 1100 × 900; before review, generated review, Coach feed, Day P&L, Week Edge, and Month Risk with data contract.
- Mobile: 390 × 844; before review and Month Risk.
- Mobile geometry: `scrollWidth: 390`, `clientWidth: 390`.

## Full-view comparison evidence

The source and implementation captures were opened together in five paired comparison inputs:

- Day module: `wireframe-3a-day.png` with `07-day-pnl-module.png`.
- Week module: `wireframe-3b-week.png` with `08-week-edge-module.png`.
- Month module: `wireframe-3c-month.png` with `02-month-risk-contract.png`.
- Coach feed: `wireframe-1c-coach-feed.png` with `04-coach-feed.png`.
- Page-before hierarchy: `wireframe-1a-page-before.png` with `01-before-day-pnl-viewport.png`.

The implementation preserves the source’s warm paper canvas, dark surround, dashed neutral modules, orange active/review accents, green generated-state accents, uppercase mono labels, compact segmented controls, and intentionally low-fidelity density. The source presents four module states side by side; the implementation intentionally turns them into one interactive module because the prototype’s purpose is to inspect each data view at readable size.

## Focused-region comparison evidence

- The Day P&L focused capture confirms the source’s chart-plus-ticker split is retained with representative values and note state.
- The Week Edge capture confirms the centered expectancy concept is represented as signed, directly labeled bars with sample size and PF in each row.
- The original Month Risk capture confirmed six risk metrics plus a wide
  rule-simulation block. The 2026-07-18 data pass intentionally replaced that
  speculative model with realized drawdown, loss concentration, give-back,
  activity buckets, and explicit evidence boundaries.
- The Coach feed capture confirms reverse chronological session entries with one highlighted weekly read.
- Mobile captures confirm the page-state controls and 3 × 4 module controls remain visible without page-level horizontal overflow.

## Findings

- P0: none.
- P1: none remaining.
- P2: none remaining.
- P3: the prototype masthead is an exploration aid not present in the source. It is intentionally retained so reviewers understand that visual polish is not the decision being requested.
- P3: simple DOM bars replace production chart geometry. This is intentional; values, labels, caveats, and interaction states are the prototype contract.
- No raster/image assets were required. All visible marks are data-bound interface elements, not substitutes for source imagery.

## Comparison history

### Pass 1 — URL hydration

- Finding: URL-derived scope/view state initialized differently on the server and client, producing a hydration error after reload.
- Severity: P1 because shared links could briefly render the wrong view and the development overlay reported a broken state.
- Fix: parse and validate `page`, `scope`, and `view` in the server page, then pass matching initial state and payload into the client component.

### Pass 2 — post-fix verification

- A clean browser tab loaded `?page=before&scope=day&view=pnl` with the correct Day P&L heading and no console warnings or errors.
- All 12 preview endpoint combinations returned HTTP 200.
- Generate review, Coach feed, Month Risk, and data-contract interactions passed.
- Desktop and mobile comparison captures show no remaining P0/P1/P2 mismatch.

### Pass 3 — V1 market-context and evidence-boundary refinement

- Added the Market Context framing card between the anchored day header and
  session verdict.
- Added mover thresholds, opportunity grade, leadership, catalyst mix,
  broad-market pressure, participation alignment, intraday context checkpoints,
  and coverage language.
- Added candidate quality and attention-at-entry fields to Day Trades.
- Replaced Week Tilt with Week Alignment and verified the URL-backed
  `scope=week&view=alignment` interaction.
- Added a valid no-trade day to Week P&L and kept it distinct from missing data.
- Replaced unsupported R expectancy with net dollars plus planned-risk coverage
  in Week Edge.
- Removed Kelly, daily-R Sharpe, and speculative pause/stop savings from Month
  Risk.
- Replaced repeated non-Coach interpretation with one deterministic takeaway;
  reduced the active experiment to a compact reminder outside Coach.
- Made footer evidence scope-aware: selected-range evidence is distinct from
  the anchored day recap payload.
- Desktop Browser QA passed with no console warnings/errors.
- Mobile QA passed at 390 × 844 with `scrollWidth: 390` and
  `clientWidth: 390`.
- Targeted ESLint and `npm run typecheck` passed. The repository-wide ESLint
  formatter crashed with `RangeError: Invalid string length` before reporting
  lint results; the two changed TypeScript files lint clean when run directly.

## Fidelity surfaces

- Fonts and typography: Geist sans and mono reproduce the source’s plain body copy, strong mono labels, tabular figures, and low-fidelity hierarchy.
- Spacing and layout rhythm: the implementation keeps dashed blocks, restrained radii, open internal spacing, and clear separation between page-level interpretation and the data module.
- Colors and visual tokens: warm neutrals dominate; green/red communicate outcomes with signed text; orange marks active review and caveat states.
- Image quality and assets: the source set contains no required product imagery, logos, illustrations, or non-standard icons. The prototype uses data-bound bars, rows, heat cells, and tables.
- Copy and content: the page states and all 12 views map to the source inventories, with representative values, sample labels, deterministic takeaways, and explicit statistical caveats.

## Primary interactions tested

- Page states: Before review, After review, Coach feed.
- Scope controls: Day, Week, Month.
- View controls: all 12 payload combinations; representative UI transitions for Day P&L, Week Edge, and Month Risk.
- Generate Coach review.
- Show/hide data contract.
- URL-backed `page`, `scope`, and `view` state.
- Mobile controls and body-width behavior.
- Browser console after the hydration fix: no warnings or errors.

## Final result

passed
