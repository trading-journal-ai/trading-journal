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

## 2026-08-13

### Added
- Empty Journal days can now import today’s Schwab trades directly, with
  one-click authorization recovery, masked multi-account selection, and the
  full importer preserved for historical ranges and file uploads
  ([PR #70](https://github.com/trading-journal-ai/trading-journal/pull/70)).

### Changed
- Focused Journal days now use a compact five-session rail, textual trading-day
  navigation, consistent underline tabs, and the shared 1152px workspace
  ([PR #66](https://github.com/trading-journal-ai/trading-journal/pull/66)).

### Fixed
- Journal period headings and Today / Previous / Next navigation now stay in
  sync across Day, Week, and Month, with the active scope preserved in the URL
  ([PR #72](https://github.com/trading-journal-ai/trading-journal/pull/72)).
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
