# Trading Journal — Design Doc

> Status: **Draft v2** · Last updated: 2026-06-11

A personal, local-first web app for logging stock/ETF trades, reviewing them
reflectively, and tracking performance over time.

> **Catch-up note (read first).** Work on this has been spread across several
> standalone files and chats. This doc is the single place that brings it
> together. The most important prior asset is a working, self-contained
> trade-chart prototype — see [§8 Prior Work & Assets](#8-prior-work--assets).
> The charting approach is considered **proven**; we'll refine it as needed
> rather than redesign it.

---

## 1. Goals & Non-Goals

### Goals
- **Single-user, personal tool.** Built for one trader (me). No accounts, no
  multi-tenancy, no public sharing in v1.
- **Capture every trade** with the context that makes review valuable: setup,
  notes, tags, emotional state, screenshots.
- **Understand performance** through clear analytics: P&L, win rate,
  R-multiples, equity curve.
- **Reduce friction on data entry** by supporting broker CSV import, with an
  eventual automated sync from Schwab.
- **Local-first & private.** Data lives on my machine; no dependency on a hosted
  service to function.

### Non-Goals (v1)
- Multi-user accounts / authentication.
- Real-time market data or live position tracking.
- Order execution or any broker write actions (read/import only).
- Instruments beyond stocks & ETFs (options/futures/crypto are future work).
- Mobile-native apps (responsive web is enough).

---

## 2. Scope

### Instruments
- **v1:** Stocks & ETFs only.
- Data model should leave room for options/futures later, but we won't build
  multi-leg/contract logic now.

### Data entry methods

There are **two distinct data inputs**, both currently **manual CSV exports**:

**A. Execution data (the trades) — DAS Trader or ThinkorSwim.**
- Trading is done through **DAS Trader** (direct-access platform) on a **Schwab**
  account; **ThinkorSwim (TOS)** is also available on the same account.
- Both export at the **execution/fill level** — each row is a single buy or sell
  with timestamp, price, quantity (and DAS adds route) — *not* pre-bundled
  round-trip trades.
- **Either source works; we're not locked in.** The existing chart prototype
  already parses **two DAS formats** (see §8), so DAS is the path of least
  resistance for v1. A TOS parser can be added behind the same importer
  interface.

**B. Price/candle data (for the per-trade chart) — TradingView CSV export.**
- OHLCV candles come from a **manual TradingView "Export chart data" CSV**
  (`epoch,open,high,low,close,…,volume`).
- **⚠️ Pre-market gap.** TradingView's default export is **regular-hours only
  (RTH)**. Pre-market / extended-hours fills land *outside* the RTH candles and
  their markers cluster on the first visible candle. Covering pre-market
  requires exporting **extended-hours** data from TradingView separately. This
  matters: the small-cap momentum style here includes pre-market trading.

**C. Manual entry** — a form to add/edit an execution or trade by hand
(corrections, missing fills, non-broker trades).

**D. Automated sync (later phase).** Pluggable importer behind a common
interface; not a v1 deliverable. See §7 — automating the *candle* fetch
(TradingView has no sanctioned export API, so this likely means the **Schwab
price-history API** or a market-data provider) is the highest-value automation
and would also fix the pre-market gap.

> **Key implication:** because the broker gives us fills, the import pipeline
> must group executions into positions / round-trips itself (see §5).
> Day-trading means frequent scaling in and out, so an execution-level model is
> required, not optional.

---

## 3. Core Features (v1)

### 3.1 Trade Logging
- Store raw **executions** (fills) as the immutable source of truth.
- **Group executions into trades** (round-trips / positions) via a matching
  algorithm (FIFO by default) — opening and closing fills for the same symbol.
- A *trade* exposes: symbol, side (long/short), avg entry & exit price, total
  quantity, first-entry & last-exit time, fees, derived stop/target, status
  (`open` | `closed`).
- Derived: P&L ($ and %), R-multiple, holding period, # of fills, max
  size/exposure.
- Manual add / edit / delete for executions and trades.
- Tags (free-form, reusable), setup/strategy label.
- Free-text notes (markdown).

### 3.2 Performance Analytics
- Summary dashboard: total P&L, win rate, avg win / avg loss, profit factor,
  expectancy, average R.
- **Equity curve** over time.
- Breakdowns by tag, setup, symbol, day-of-week, time period.
- Date-range and tag filters.

### 3.3 Review & Journaling
- Per-trade reflection: what was the thesis, what went right/wrong, lessons.
- Emotional state / discipline tracking (e.g. followed plan? FOMO? revenge
  trade?).
- Searchable journal of mistakes & lessons across trades.

### 3.4 Trade Chart (entry/exit visualization)
- Per-trade candlestick chart with **entry/exit markers** plotted on the
  candles (buy = green up-triangle, sell = red down-triangle).
- Fed by **TradingView candle CSV** (§2-B) + the trade's executions; ET→UTC
  alignment handled so markers land on the right candle.
- Interactive: pan/zoom, crosshair showing OHLCV per candle.
- **Export to SVG** — capture a static snapshot of the chart into the journal
  entry for that trade.
- **Approach is proven** — adapt the existing prototype (§8) rather than rebuild
  from scratch. Open choice: keep its hand-rolled canvas+SVG renderer, or port
  the interactive view to TradingView **Lightweight Charts** while keeping the
  SVG-snapshot idea. See §7.

### 3.5 Screenshots
- Attach one or more chart images to a trade.
- Store images locally; display in the trade detail view.
- (Stretch) lightweight annotation / markup.

---

## 4. Architecture

### Stack
- **Framework:** Next.js (App Router) + React + TypeScript.
- **Styling:** TBD (Tailwind likely — fast for data-dense UI).
- **Charts:** general analytics charts via a React lib (Recharts / visx — TBD).
  The **trade entry/exit chart** is its own thing, adapted from the proven
  prototype (§8) — candlestick + markers + SVG export.
- **Data store:** **local-first SQLite.**
  - Accessed server-side via Next.js route handlers / server actions.
  - ORM/query layer: TBD (Drizzle or Prisma — Drizzle preferred for SQLite +
    TS ergonomics).
- **File storage:** screenshots saved to a local `data/uploads/` directory,
  referenced by path in the DB.

### Why local-first SQLite
- Personal use, single machine — no hosting cost, full privacy.
- Single-file DB is easy to back up (copy the file) and version.
- Can migrate to hosted Postgres later if multi-device sync is ever wanted; the
  data-access layer should isolate this choice.

### High-level layout
```
trading-journal/
  app/                # Next.js routes & pages
  components/         # UI components
  lib/
    db/               # schema, migrations, queries
    import/           # CSV parsers: DAS (2 formats), TOS, TradingView candles
    chart/            # candlestick + entry/exit markers + SVG export
    analytics/        # P&L, R-multiple, equity curve calcs
  data/
    journal.db        # SQLite database (gitignored)
    uploads/          # screenshots + imported CSVs (gitignored)
  DESIGN.md
```

---

## 5. Data Model (first cut)

Because DAS exports fills, **`Execution` is the source of truth** and a `Trade`
is a derived grouping of executions for one round-trip position.

**Execution** (one DAS fill — immutable)
- `id`
- `symbol`
- `side` (`buy` | `sell`)
- `quantity`
- `price`
- `executed_at`
- `fees`, `route` (nullable)
- `trade_id` (FK — assigned by the matching step, nullable until matched)
- `import_batch_id` (FK), `source_row_hash` (for dedupe)

**Trade** (derived round-trip / position)
- `id`
- `symbol`
- `side` (`long` | `short`)
- `quantity` (total shares traded)
- `avg_entry_price`, `entry_at` (first opening fill)
- `avg_exit_price`, `exit_at` (last closing fill; nullable while open)
- `fees` (sum of constituent executions)
- `stop_loss`, `target` (nullable — user-supplied for R calc)
- `setup` (label)
- `status` (`open` | `closed`)
- `created_at`, `updated_at`
- Derived (computed, not stored): `pnl`, `pnl_pct`, `r_multiple`,
  `holding_period`, fill count.

> Matching: a FIFO algorithm walks a symbol's executions chronologically,
> opening a Trade on the first fill and closing it when net position returns to
> zero. Scaling in/out stays within one Trade; a flip through zero starts a new
> one. FIFO vs LIFO should be configurable.

**Tag** + **TradeTag** (many-to-many)

**JournalEntry** (1:1 or 1:many with Trade)
- `trade_id`
- `thesis`, `what_went_well`, `what_went_wrong`, `lessons`
- `followed_plan` (bool), `emotional_state` (tags/enum)

**Attachment**
- `trade_id`, `file_path`, `caption`

**ImportBatch** (audit trail for imports)
- `kind` (`executions` | `candles`)
- `source` (`das_csv` | `tos_csv` | `tradingview_csv` | `manual` | `schwab_api`)
- `imported_at`, `row_count`, `file_name`

> Note: derived metrics (P&L, R) computed in the analytics layer so the source
> fields stay the single source of truth.

---

## 6. Phasing

### Phase 0 — Foundations
- Next.js + TS scaffold, Tailwind, SQLite + migrations, base layout.

### Phase 1 — Execution & trade model (MVP)
- `Execution` + `Trade` schema, FIFO matching engine, manual add/edit/delete,
  trade list, trade detail, derived P&L/R.

### Phase 2 — Execution CSV import (DAS/TOS)
- Upload a broker export, map columns → executions, run matching into trades,
  with preview/confirm and row-hash dedupe. **Reuse the DAS parser + ET→UTC +
  fill-aggregation logic from the §8 prototype**; add TOS as a second format.

### Phase 3 — Trade chart
- Port the §8 candlestick + entry/exit-marker chart into the trade detail view;
  ingest a TradingView candle CSV; keep SVG export. (Earlier than analytics
  because the code already exists and it's the most distinctive feature.)

### Phase 4 — Analytics
- Summary dashboard, equity curve, filters & breakdowns.

### Phase 5 — Review & journaling
- Reflection fields, emotional/discipline tracking, lessons search.

### Phase 6 — Screenshots
- Image upload, attach to trades, display in detail view.

### Phase 7 — Automated candle/sync (later)
- Replace the manual TradingView export with an API source (**Schwab
  price-history** or a market-data provider) — also fixes the pre-market gap.
  Optionally scripted execution ingestion. All behind the importer interface.

---

## 7. Open Questions
- **Automate the TradingView candle export?** Wanted ("big help, not a deal
  breaker"). TradingView has **no sanctioned export API**, so true automation
  means swapping the source: pull candles from the **Schwab price-history API**
  (account already exists; can include extended hours) or a data provider
  (Polygon, Alpaca, etc.). Decision: ship v1 on manual TradingView CSV, treat
  API candles as the Phase 7 upgrade that also solves pre-market.
- **DAS vs TOS for executions** — both are manual fill-level exports; either is
  fine. Lean DAS for v1 since the parser already exists; add TOS later. (Need a
  fresh sample of whichever to confirm current columns.)
- **Pre-market coverage** — accept the RTH-only gap for v1, or require an
  extended-hours TradingView export per trade? (Resolved cleanly by API candles
  later.)
- **Trade chart renderer** — keep the prototype's canvas+SVG, or port to
  Lightweight Charts + keep SVG snapshot? (Either works; not blocking.)
- **Matching edge cases:** position flips through zero, shorts, overnight holds
  spanning export files, partial-day exports. FIFO vs LIFO default.
- Styling lib: confirm Tailwind.
- ORM: Drizzle vs Prisma for SQLite.
- Analytics charting lib choice.
- Backup strategy for the SQLite file.

> **Resolved:**
> - Partial fills / scaling in & out — `Execution` → `Trade` FIFO matching (§5).
> - Candle data source — **TradingView "Export chart data" CSV** (§2-B), manual
>   for v1.
> - Trade-chart approach — adapt the proven §8 prototype.

---

## 8. Prior Work & Assets

Work to date has been scattered across files and chats. Index of what exists and
how it feeds this project:

### Trade-chart prototype ⭐ (the key reusable asset)
- **File:** `~/Desktop/trade_chart (10).html` — a single self-contained HTML
  file (~886 lines, embedded ROLR sample data, opens standalone in a browser).
- **What it does:** drag-drop a **TradingView candle CSV** + a **DAS Trader
  log**; renders a candlestick chart (canvas) with **buy/sell markers**,
  crosshair OHLCV, an execution table with running P&L, multi-symbol tabs, and
  an **Export-SVG** button. Price axis is SVG.
- **Reusable logic (port these):**
  - **DAS parser, two formats** — new (`TradeID,OrderID,…`, `B`/`S`,
    `MM/DD/YY HH:MM:SS`, every row an execution) and old (`Event,B/S,…`, filter
    `Event=Execute`, `HH:MM:SS`).
  - **ET→UTC** timestamp conversion (EDT = UTC−4).
  - **Same-minute, same-side fill aggregation** → effectively the
    execution-grouping step.
  - **Running avg-cost P&L** per symbol.
  - Candle CSV ingestion (`epoch,o,h,l,c,…,vol`).
- **History:** evolved over a long chat (started pure-SVG, fixed candle slots,
  pan/zoom + momentum, price-range bug fixes when zoomed out) — see the shared
  thread "Trade entry and exit visualization tool".

### Reference: current journal tool (UI inspiration)
- Four screenshots of the journal app currently in use define the target feature
  set: **Trades table** (filters, gross/net, pagination, CSV export), **Reports
  → Detailed** (stats grid + day/hour/month/duration distributions), **Reports →
  Calendar** (monthly P&L heatmap), and a widget **Dashboard**. Scope to the
  basics — not a full clone of every widget.

### Not related (ruled out)
- `~/Working/trading-learning-app` (GitHub: `justin-carlson/trading-learning-app`)
  — an *educational* app (trading patterns, risk calculator, L2 simulator). No
  chart/journal code. Cloned locally only for evaluation.

### Source repo
- `github.com/justin-carlson/trading-journal` (private) — this project.
