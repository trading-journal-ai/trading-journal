# Changelog

Dated record of notable, completed changes — features shipped, contracts landed,
capabilities added. Format loosely follows [Keep a Changelog](https://keepachangelog.com).

**How to use this:** when a **Now** item in [PROJECT_STATUS.md](PROJECT_STATUS.md)
is actually done, add it here under a dated heading with a category
(`Added` / `Changed` / `Fixed` / `Docs` / `Decided`). Keep entries short and link
the PR. Day-to-day "where we stopped" notes go in the PROJECT_STATUS Worklog, not here.

> Started 2026-07-11. Changes before this date are recorded only in git history
> (`git log`), not backfilled here.

---

## 2026-09-22

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Day, Week, Month,
Day Trades and Calendar Month share a left-aligned stat bar with size variants.
Per share shows the average net P&L per share per trade; period bars omit Sessions.
This release also includes the accepted recap, day-review, navigation and Import
updates below.

## 2026-09-21

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Header Import now shows a spinner inside the
Sync button while checking the account, then resolves to Sync without changing
button width. Actual imports reuse the Journal day's sweeping progress bar and
show an active busy button. Reduced-motion preferences are respected.
Implementation `05f2451`; verified in the canonical local app.

## 2026-09-20

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Day Coach now places authored trade reviews
after the day review. Saved `@tradeN` sections display with ticker/trade headers,
time, P&L, note text, and an exact-trade Edit link; unreviewed trades stay out of
the list. Add trade review reuses the ticker/day workflow. The shared section
parser also distinguishes chart moments such as `@11:15` from trade anchors.
Implementation `2792c4c`; verified with existing saved reviews in the
canonical local app.

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Day review formatting now distinguishes the
trader's overall thoughts, guided reflection, recorded session evidence, and
trade-specific follow-up. P&L stays note-focused; Coach labels its selected
trade with the ticker and chronological per-ticker number, such as
`SYN · Trade <N>`. Legacy reflection headings display as metadata without
rewriting stored notes. Implementation `e241f40`; verified in the canonical
local app.

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Day P&L now includes “Review your day” below the
chart, with the existing note editor and dictation. It shares the general day
reflection with Coach while preserving guided answers. Empty days also support
reflection. Implementation `0e75e14`; verified in the canonical local app.

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Weekly review flags now link to guided Day Coach
reflection. Existing notes and exact pasted Q&A remain editable in separate
fields, including CRLF notes. Save answers is separate from Save & refresh
Coach; weekly/monthly AI context includes daily reflections and ticker notes.
Changed-note notices, prior-feedback preservation and concurrent-refresh guards
make regeneration explicit and recoverable. Implementation `d587a11`, note
compatibility `5308e4c`; verified in the canonical local app.

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Weekly recap can highlight one green-to-red
session with recorded-curve giveback, its largest loss, and a same-session
position-size comparison. The trader's existing day recap is visible/editable
beside the facts, with optional review questions. Recollections and motives
remain trader-authored; no new generation or schema. `67fcd37` verified in the
canonical local app.

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Weekly coaching now adds progressive, linked
observations for win/loss economics, hold times, recorded fees and a prior
30-day baseline, plus per-share and peak-exposure statistics. Its completed
intraday sample is explicit. Shared-market review matches recorded movers by
ticker/date with coverage caveats; it does not infer heat, capture or psychology.
Data reads are bounded and public market records cached. Implemented in
`38e51d1`, refined in `bf3da15`, and verified in the canonical app.

Fixed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Removed the independent “other trades” totals beneath
weekly contributor/loss highlights. Each now shows only its own ticker, net
trade contribution and weekday(s), avoiding the appearance of additive weekly
subtotals. `da2b4af` verified in the canonical local app.

## 2026-09-19

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Journal Week now builds from a light Monday/
Tuesday read to a developing midweek view and full Friday recap. Adds linked
trade contribution highlights, session-end P&L progression, net ticker breadth,
saved weekly focus and qualified recorded market observations. Outcome labels
stay distinct from process judgments; imports are never asserted complete.
Implementation `230e665` is verified in the canonical local app. See the
[Weekly Recap Plan](product/WEEKLY_RECAP_PLAN.md) for the first slice's boundaries.

## 2026-09-18

Changed ([PR #82](https://github.com/trading-journal-ai/trading-journal/pull/82)): Journal Week places compact stats above the
neutral calendar strip, shows cumulative P&L with daily dots and hover/focus/tap
trade-count popovers grouped by ticker, weekday-only axis labels, and week
status and interpretation below the chart.
Integrated through `c837c80` and verified in the canonical local app.

## 2026-09-17

Local fix (PR pending): Top Gainers adds a visible Today shortcut beside
Previous/Next/Calendar, opening the current Eastern day and preserving filters.
The earlier Journal Day-tab change was reverted after clarifying the target screen.

Merged [PR #79](https://github.com/trading-journal-ai/trading-journal/pull/79).

- Replace legacy Analytics with completed-trade Overview, editable Compare,
  Sizing Up, Recovery and Review studies. Add grouped statistics, cumulative
  P&L, a trade-result histogram, exact trade drilldowns and inline filters.
- Default to net results with explicit missing-fee qualification. Attribute
  flat-to-flat trades to final exit in Eastern Time; use exact-decimal cash
  flows and split-aware entry prices. Journal/Calendar activity math is unchanged.
- Reuse the date-range picker across Analytics and Top Gainers. Compact summary
  metrics, fixed-size chart labels and inset select carets improve scanability.
- Rename Momentum Archive to Top Gainers; add period navigation, range/filter
  export parity, latest-published-day defaults and concise coverage disclosures.
  Saved-news states distinguish fresh, earlier and absent news from failed reads.
  Core policy includes common-stock ADRs and positive sub-dollar prior closes.
- Simplify empty calendar labels. Add offline Market Context research tools and
  planning contracts; production market scoring remains unimplemented.

## 2026-09-15

[PR #78](https://github.com/trading-journal-ai/trading-journal/pull/78).

### Changed

- Main Import uses the header account, direct Sync, a single file picker,
  compact results, and a custom date calendar. Expired authorization directs
  users to Trading Monitor; the inline daily import stays unchanged.
- Daily P&L adds compact stats, elapsed-time clock labels, sparse round-dollar
  grid levels, and aligned ticker rows with circular note actions.
- Day trade stats use plain labels; dollar expectancy reads “Avg P&L / trade.”

### Fixed

- Today opens the current ET day in Journal from Journal and Calendar.
- Analytics includes complete account history and execution-derived realized
  P&L, including partial exits, consistent with Journal and Calendar.

### Added

- Temporary one-minute chart CSV uploads in trade review when provider data
  is unavailable, with automatic replacement by complete provider candles.


## 2026-09-11 (local main)

### Changed

- Journal Week and Month day clicks open Day → P&L, with trades accessible
  through Day → Trades. Journal Month no longer expands a trade ledger;
  standalone Calendar retains it. Integrated locally as `0be70d0`; no PR published.
- Journal weekly cards align P&L on the first metric row and stats or empty-day
  statuses on the second. Integrated locally as `f47f782`; no PR published.
- Journal weekly cards have no drop shadow or stats-pill backgrounds. Their dot
  and tinted cell mark the current Eastern Time day instead of the selected review
  date. Integrated locally as `6c518a2`; no PR published.
- Calendar day panels use Review trades to enter Trade Review directly, removing
  the intermediate Journal stop. Starts with the first trade; individual symbols
  remain directly selectable. Integrated locally as `6a5bc1f`; no PR published.
- Calendar trade links open Trade Review directly for the displayed session,
  symbol and selected trade, preserving the originating calendar return target.
  Integrated locally as `c1383d3`; no PR published.
- Expanded calendar-day stats use a single muted pill with dot separators and
  P&L last. Integrated locally as `38319f5`; no PR published.
- Expanded calendar-day stats sit beneath the day heading, left-aligned, with
  P&L after profit factor. Both calendar consumers share the layout. Integrated
  locally as `ae3ccfd`; no PR published.
- Journal week headings omit the year. The compact weekday/P&L strip above the
  heading is hidden across Journal scopes, with its implementation retained for
  optional restoration. Integrated locally as `c98d19a`; no PR published.
- Retired the A–E calendar inventory and older visualization-calendar experiments.
  Calendar and Journal Month now have one maintained month component; obsolete
  calendar CSS and fixture data were removed. Local cleanup; no PR published.
- Calendar and Journal Month now share the selected D calendar, including the
  flat summary stats and trade ledger expanding beneath the selected week.
  The standard `journal` app at localhost:4317 serves the integrated version;
  the temporary 3015 preview is stopped. Integrated from
  `codex/shared-calendar-d` (implementation `48440f2`); no PR published.

## 2026-09-10 (local main)

### Decided

- Momentum Archive false-positive research and qualification rules belong to
  Trading Server. Its canonical research handoff preserves the candidate context;
  Journal owns presentation and trade comparison. Candidate adoption remains
  deferred. Documentation integrated locally; no PR published.

### Fixed
- Confirmed Schwab/TOS imports can reconcile later broker fees on existing
  executions, updating net P&L without duplicating fills or changing notes.
  The additive Journal migration preserves existing totals and records categories
  and reported-zero evidence for future analytics. Daily views add no fee metric
  columns. Integrated locally from `feat/schwab-fee-breakdown`; no PR published.

## 2026-09-04 (local main)

### Changed
- Momentum Archive queries, exports and candles now use Trading Server's shared
  local market-history API, preserving accepted exact-symbol calculations and
  explicit offline behavior. Integrated in local main at `53a51a5`; no PR was
  published. Old archive paths are retired; the four explicitly approved duplicate
  folders were removed after fresh backup and post-deletion consumer checks.
- Shared local Schwab imports now use Broker Gateway's read capability while
  preserving Journal normalization, dedupe and persistence. Missing provider
  configuration fails explicitly; independent installations must opt into
  standalone. Integrated in local main through `1ff95db`; no PR was published.
- Shared setup documentation now identifies Gateway as the OAuth owner and
  records the cross-app migration/verification gates.

## 2026-08-13

### Added
- Empty Journal days can now import today’s Schwab trades directly, with
  one-click authorization recovery, masked multi-account selection, and the
  full importer preserved for historical ranges and file uploads
  ([PR #70](https://github.com/trading-journal-ai/trading-journal/pull/70)).

### Changed
- Calendar now uses the compact month-at-a-glance layout as its canonical month
  view, with month metrics, five weekday columns, weekly summaries, and direct
  Journal-day links ([PR #71](https://github.com/trading-journal-ai/trading-journal/pull/71)).
- Focused Journal days now use a compact five-session rail, textual trading-day
  navigation, consistent underline tabs, and the shared 1152px workspace
  ([PR #66](https://github.com/trading-journal-ai/trading-journal/pull/66)).

### Fixed
- Trade chart markers now remain anchored to broker execution times, refresh
  partial candle caches around missing execution minutes, and show unresolved
  market-data gaps explicitly instead of relocating fills by price
  ([PR #74](https://github.com/trading-journal-ai/trading-journal/pull/74)).
- Journal period headings and Today / Previous / Next navigation now stay in
  sync across Day, Week, and Month, with the active scope preserved in the URL
  ([PR #72](https://github.com/trading-journal-ai/trading-journal/pull/72)).
- Thinkorswim statement uploads and Schwab automatic imports now share an
  idempotent execution ledger, preserve full statement coverage, support ETFs,
  account for known share splits, and place swing activity and realized P&L on
  the dates executions occurred
  ([PR #73](https://github.com/trading-journal-ai/trading-journal/pull/73)).
- Local `journal` launcher now removes stale Next.js locks, reuses live lock
  metadata, and opens the exact active localhost URL automatically
  ([PR #65](https://github.com/trading-journal-ai/trading-journal/pull/65)).
- Preview triage hydration no longer relies on synchronous mount-effect state
  updates, restoring clean repository-wide lint and TypeScript validation
  ([PR #67](https://github.com/trading-journal-ai/trading-journal/pull/67)).

## 2026-08-10

### Changed
- Journal review now uses focused Day, Week, and Month modes with shared period
  navigation, a five-session week strip, TradingView-backed P&L views, and
  refined loading and responsive behavior
  ([PR #64](https://github.com/trading-journal-ai/trading-journal/pull/64)).

## 2026-08-07

### Added
- Project-local Impeccable design skill and Codex hook, with durable
  `PRODUCT.md`/`DESIGN.md` context and Apache 2.0 attribution
  ([PR #61](https://github.com/trading-journal-ai/trading-journal/pull/61)).

### Changed
- Agent validation now follows explicit exploration, stabilization, and
  completion phases while retaining the existing verification tiers
  ([PR #63](https://github.com/trading-journal-ai/trading-journal/pull/63)).

## 2026-07-28

### Added
- Free-plan market-data sync for traded ticker-days, with idempotent caching,
  rate-safe request planning, historical-symbol retries, and focused coverage
  ([PR #60](https://github.com/trading-journal-ai/trading-journal/pull/60)).

### Docs
- Canonical Analytics architecture and market-data strategy, with related
  product and opportunity-context contracts reconciled
  ([PR #60](https://github.com/trading-journal-ai/trading-journal/pull/60)).

## 2026-07-25

### Added
- **Schwab direct API import** — read-only, append-only sync from the Schwab
  Individual Trader API: BYO developer credentials, masked accounts, ET
  date-range preview before any write, cross-source dedupe against CSV imports,
  in-place updates to open trades with stable trade IDs, atomic rollback on
  ambiguity. Phases 0–4 of the plan complete. (`codex/schwab-import`, PR pending)

### Docs
- `import/TRADE_IMPORT_BEHAVIOR.md` — canonical execution/trade semantics,
  edge-case matrix, and prioritized P0/P1 correctness gaps.
- `setup/SCHWAB_SETUP.md` — end-user BYO-credentials setup guide.
- `DOCS_AUDIT_2026-07-25.md` — full documentation audit + index (77 docs).
- Root `README.md` — new **Built AI-First** section: how to extend the app with
  an AI agent (broker adapters, coach tuning, verification ground rules).
- Adopted the **delete + tombstone** doc-retirement policy: retired docs are
  deleted (git history is the archive) and indexed in `ARCHIVE.md`. Deleted:
  `import/TOS_TO_TRADERVUE_RECONSTRUCTION.md` (shipped as the broker
  normalizer), `deployment/DEMO_RUNTIME.md` (removed Turso runtime),
  `coach/NEXT_BUILD.md` (absorbed into `COACH_ARCHITECTURE.md`), and the
  `design/_archive/` files.
- **Privacy scrub:** removed real statement filenames, row counts, and P&L
  values from `import/BROKER_NORMALIZER.md`, `import/THINKORSWIM_ADAPTER.md`,
  `import/TRADERVUE_ADAPTER.md`, and `coach/PRIVATE_EVALS.md` — committed docs
  now use placeholders only. Default file paths in the two broker scripts
  genericized to match.

### Decided
- **Git history scrubbed of real P&L values** (owner call, 2026-07-25): a
  targeted `filter-repo --replace-text` rewrite redacted the real statement
  filenames, row/fill counts, and P&L totals from all 376 commits; commit
  messages, dates, authorship, and structure preserved. Verified zero
  occurrences across every remote ref. The repo was briefly private during the
  rewrite window and returned to public afterward — it stays public because
  the hosted demo deploys from it.

## 2026-07-24

### Docs
- Discovery specs: `product/CHART_READ_PANEL.md` (hindsight-aware chart read +
  `ChartRead` contract) and `product/PINE_SETUP_INDICATOR.md` (TradingView Pine
  companion); `tradingview-indicators/` Pine scripts scaffold.

## 2026-07-23

### Added
- Design-system rollout round 2: feature modules, tabs consolidation, real +
  tokenized tags ([PR #52](https://github.com/trading-journal-ai/trading-journal/pull/52));
  Tag chip atom — icon per axis, color per verdict ([PR #51](https://github.com/trading-journal-ai/trading-journal/pull/51));
  Tier-1 atoms `Money`, `Dot`, `StatBlock`, `Button`, `SegmentedControl`
  ([PR #49](https://github.com/trading-journal-ai/trading-journal/pull/49));
  `Eyebrow` atom ([PR #48](https://github.com/trading-journal-ai/trading-journal/pull/48)).

### Changed
- `/reports` route renamed to `/analytics`; Reports metric strip tokenized
  ([PR #50](https://github.com/trading-journal-ai/trading-journal/pull/50)).

## 2026-07-22

### Added
- Living `/design-system` reference page ([PR #45](https://github.com/trading-journal-ai/trading-journal/pull/45));
  trade tag taxonomy prototype; Claude Design project inventory in the
  artifacts review ([PR #44](https://github.com/trading-journal-ai/trading-journal/pull/44)).

### Docs
- Design system consolidated into a single source of truth
  (`design/DESIGN_SYSTEM.md` rules + `globals.css` values); one-sheet retired to
  `design/_archive/` ([PR #43](https://github.com/trading-journal-ai/trading-journal/pull/43));
  component inventory & extraction plan ([PR #46](https://github.com/trading-journal-ai/trading-journal/pull/46));
  coach intelligence research baseline ([PR #41](https://github.com/trading-journal-ai/trading-journal/pull/41)).

### Fixed
- Bundled demo database schema ([PR #42](https://github.com/trading-journal-ai/trading-journal/pull/42));
  React lint + coach prose typing ([PR #40](https://github.com/trading-journal-ai/trading-journal/pull/40)).

## 2026-07-21

### Added
- **Price Action Snapshot v1** — shared FYL market read (EMA9/20, VWAP,
  structure, participation), directional reads, chart read integrated into the
  journal coach, backfilled market context
  ([PR #39](https://github.com/trading-journal-ai/trading-journal/pull/39)).
- Trade review chart: EMA/VWAP overlays, trade focus, ticker switcher beside
  the chart ([PR #37](https://github.com/trading-journal-ai/trading-journal/pull/37));
  wider chart workspace ([PR #38](https://github.com/trading-journal-ai/trading-journal/pull/38));
  journal/trade polish ([PR #36](https://github.com/trading-journal-ai/trading-journal/pull/36)).

### Docs / Decided
- Journal navigation decision: one continuously scrolling surface
  (`design/JOURNAL_NAVIGATION_DECISION.md`). Coach house style
  (`coach/VOICE.md`), FYL deterministic review process, plain-language
  glossary, data-backup design, edge-attribution plan, opportunity-context
  calculator spec.

## 2026-07-18 – 2026-07-20

### Added
- Inline trade panel in the journal ([PR #32](https://github.com/trading-journal-ai/trading-journal/pull/32),
  fix in [PR #33](https://github.com/trading-journal-ai/trading-journal/pull/33));
  data-viz share preview + runtime flag ([PR #34](https://github.com/trading-journal-ai/trading-journal/pull/34),
  [PR #35](https://github.com/trading-journal-ai/trading-journal/pull/35)).

### Decided
- Data-viz explorations v1–v7 **pinned** (2026-07-18): captured as
  `analytics/DATA_VIZ_CATALOG.md` + `analytics/DATA_VIZ_STUDY_REGISTER.md`
  rather than extended. `product/JOURNAL_REVIEW_MODULE.md` accepted (07-20).

## 2026-07-12

### Added
- Ticker review + themes rollout ([PR #30](https://github.com/trading-journal-ai/trading-journal/pull/30));
  ticker-review dictation fix ([PR #31](https://github.com/trading-journal-ai/trading-journal/pull/31)).

### Docs
- `coach/COACH_ARCHITECTURE.md` (constitution vs playbook, request assembly);
  weekly/monthly recap idea captured in the recap plan.

## 2026-07-11

### Docs
- Finalized the journal/coach **data model and content contract**: `DATA_MODEL.md`
  (provenance layers, definition of finalized, review-engine impact, 07:00–20:00 ET
  review window), `COACH_REVIEW_SCHEMA_V2.md` (typed Coach Review contract),
  in-repo `COACH_RECAP_CONTENT_SPEC.md` (Rev 2). ([PR #26](https://github.com/trading-journal-ai/trading-journal/pull/26))
- Added project-tracking docs: `OWNER_TODO.md` (owner decisions + ⭐ shortlist),
  `PROJECT_STATUS.md` (now/next/later + worklog), and this changelog.

### Decided
- Daily Recap is the journal artifact; **Coach Review is a section inside it.**
- Coach Review stored as **structured JSON**, immutable generated version with
  separate user corrections; user notes stay prose.
- Ticker-day review chart shows the **full session 07:00–20:00 ET** (overnight excluded).

### Verified
- Extended-hours candle coverage is already present: bars span **04:00–19:59 ET**
  (demo DB), so the review-window requirement is a display task, not a fetch change.

---

<!-- Template for the next entry:
## YYYY-MM-DD
### Added
- <feature> (PR #NN)
### Changed / Fixed / Docs / Decided
- ...
-->
