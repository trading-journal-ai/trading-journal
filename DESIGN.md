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
- **Reduce friction on data entry** by supporting broker CSV import (manual
  exports for v1; optional automation later).
- **Local-first, private, and cheap.** Data lives on my machine; no dependency
  on a hosted service. Goal: **replace TraderVue ($29.95/mo)** and run on just
  the existing TradingView sub (~$10/mo) — no new recurring cost.

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

**A. Execution data (the trades) — ThinkorSwim (primary), DAS (secondary).**
- Trading is done through **DAS Trader** on a **Schwab** account; **ThinkorSwim
  (TOS)** runs on the same account and exports the same fills.
- **Decision: TOS is the primary execution source for v1.** Its *Account
  Statement* export is stronger than the DAS log for our purposes (see §8 for
  the full format spec):
  - **`Pos Effect` = `TO OPEN` / `TO CLOSE`** on every fill → round-trip
    matching becomes *authoritative* instead of FIFO-inferred.
  - A built-in **Profits and Losses** section to **validate** our computed P&L.
- DAS remains a **secondary** importer (the §8 prototype already parses two DAS
  formats) behind the same interface, for when a TOS export isn't handy.
- Both are **execution/fill level** — one row per buy/sell, *not* pre-bundled
  round-trips.

**B. Price/candle data (for the per-trade chart) — auto-fetched, free.**
- OHLCV candles (`epoch,open,high,low,close,…,volume`) are **auto-fetched by the
  app** for the symbols it parsed from the execution import — no per-symbol
  manual work. Source: **Alpha Vantage free tier** (1-min, extended hours by
  default, historical by month). See §9.
- **Manual "Export chart data" CSV** (TradingView, already paid; or free ToS) is
  the **fallback** for any symbol the API misses — turn on the chart's
  **extended-hours session** first to capture pre-market.
- **⚠️ Pre-market matters** (this style trades pre-market) — extended hours is
  required from whatever source. AV includes it; manual exports need the
  extended-hours session enabled.
- **Cost stance: free**, data local & private. See §9 for the full rationale.

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
- `source` (`tos_csv` | `das_csv` | `manual` | `alpha_vantage` |
  `tradingview_csv` | `tos_chart_csv`)
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

### Phase 2 — Execution CSV import (TOS primary, DAS secondary)
- Parse the **TOS Account Statement** (§8 format): slice the `Account Trade
  History` section → executions (use `Net Price`, `Pos Effect`), join `Cash
  Balance` for fees, cross-check against the `Profits and Losses` section.
- Run matching into trades (driven by `Pos Effect`), with preview/confirm and
  row-hash dedupe. **Reuse the ET→UTC + fill-aggregation logic from the §8
  prototype** (but make the TZ offset **DST-aware**, not hardcoded −4).
- Add the **DAS** parser (two formats from the §8 prototype) as a second source.

### Phase 3 — Trade chart + candle auto-fetch
- Port the §8 candlestick + entry/exit-marker chart into the trade detail view;
  keep SVG export. (Earlier than analytics because the code already exists and
  it's the most distinctive feature.)
- **Auto-fetch candles** for the parsed symbols via the `CandleProvider`
  (Alpha Vantage free) into the `candles` cache — eliminates per-symbol manual
  exports (§9). Manual CSV import stays as the fallback for missed symbols.
- **Prereq:** run the AV penny-stock pre-market coverage test first.

### Phase 4 — Analytics
- Summary dashboard, equity curve, filters & breakdowns.

### Phase 5 — Review & journaling
- Reflection fields, emotional/discipline tracking, lessons search.

### Phase 6 — Screenshots
- Image upload, attach to trades, display in detail view.

### Phase 7 — Provider hardening (optional)
- Candle auto-fetch already lands in Phase 3 (Alpha Vantage, free). This optional
  phase adds robustness only if needed: a paid fallback provider for symbols AV
  misses (**Databento** usage-based, or **Polygon**), retry/rate-limit handling,
  and bulk historical backfill — all behind the existing `CandleProvider`.

---

## 7. Open Questions
- ~~Automate the candle data?~~ — **resolved: free *and* automated** (§9). App
  auto-fetches candles for the parsed symbols via **Alpha Vantage free tier**
  (1-min, extended hours, historical by month) — kills the per-symbol export
  drudgery, no paid API, no UI scraping. Manual TradingView/ToS export = fallback.
  **One open validation:** AV penny-stock pre-market coverage (test before
  committing). Paid providers (Databento/Polygon) only if AV coverage fails.
- ~~DAS vs TOS for executions~~ — **resolved: TOS primary** (Pos Effect +
  built-in P&L), DAS secondary. See §8 for the confirmed TOS format.
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

### TOS Account Statement format (primary execution source)
- **Sample / fixture:** `data/samples/2026-03-04-AccountStatement.csv`
  (gitignored — real trades; re-export to reproduce on another machine).
- **One file, multiple stacked sections** separated by blank lines, each with its
  own header row. The parser must locate sections by header, not read the whole
  file as one table. Sections present:
  1. **Cash Balance** — `DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions
     & Fees,AMOUNT,BALANCE`. Fills as free-text description
     (`BOT +100 TMDE @4.52`, `SOLD -2,180 AIFF @1.7117`). **Has fees** (Misc
     Fees) and running cash balance.
  2. **Account Order History** — every order incl. `CANCELED`/`REJECTED`, with
     `Pos Effect`, `TIF`. Bonus data for journaling intent; not needed for core.
  3. **Account Trade History** ⭐ **— primary execution table.**
     `,Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order
     Type`. One row per fill. `Exec Time` = `M/D/YY H:MM:SS`.
  4. **Profits and Losses** — per-symbol `P/L Day`, `P/L YTD`, etc. Use to
     **validate** computed P&L.
  5. Account Summary, plus empty Futures/Forex/Crypto stubs (ignore).
- **Field mapping (Account Trade History → `Execution`):** `Exec Time`→
  `executed_at`, `Side`(BUY/SELL)+signed `Qty`→`side`/`quantity`, `Symbol`,
  **`Net Price`**→`price` (matches the cash ledger; `Price` can differ),
  `Pos Effect`(TO OPEN/TO CLOSE)→drives round-trip matching. Fees come from the
  **Cash Balance** section (join by time+symbol+qty, or just total them).
- **Parsing gotchas:**
  - **DST-aware ET→UTC.** Times are platform-local Eastern. This sample is
    Mar 3–4 2026 → **EST (UTC−5)**, *before* DST (starts Mar 8). Do **not**
    hardcode −4 like the chart prototype.
  - Strip `="…"` wrapper on `REF #` and comma thousands separators
    (`-2,180`, `90,439.83`).
  - Use `Net Price`, not `Price`.
  - Pre-market fills present (e.g. `06:34:07`) → reinforces extended-hours
    candle need (§2-B).
- **Account:** export is from the **Swing** account (`…SCHW (Swing)`),
  commission-free; only tiny SEC/TAF Misc Fees.

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

---

## 9. Candle Data Pipeline (OHLCV for the chart)

The per-trade chart needs 1-minute OHLCV candles **with extended hours**.

> **Decision: free *and* automated.** The app auto-fetches candles for the
> symbols it parsed from the TOS export (via Alpha Vantage free tier) — no paid
> API, and no per-symbol manual chart exports. Manual TradingView/ToS export is
> the fallback. Pending one validation: penny-stock pre-market coverage.

### Economics (why free is the right call, not a compromise)
- Current spend: **TraderVue $29.95/mo + TradingView $10/mo ≈ $40/mo.**
- This project's value = **replace TraderVue → save ~$30/mo** and keep data
  local. Adding a $29/mo data API (Polygon) would eat that entire saving.
- **Keep the TradingView $10/mo already paid** and use its candle export — the
  candle data is effectively *already bought*. Target end state: **$10/mo
  (TradingView only)**, data local & private.
- Privacy note: a candle API would **not** leak trades (you only request public
  OHLCV for a ticker+date) — so the reason to skip Polygon is **cost, not
  privacy**.

### The real pain point: per-symbol chart exports
- The TOS execution export is **one step** for the whole session.
- But candles must be pulled **per symbol** — 2–10 manual chart exports per
  session, every session. That repetition is the friction worth automating.
- **Automating TradingView's UI** (agent / browser bot) to do those exports is
  the *wrong* fix: it violates TradingView's ToS (and ToS runs on the brokerage
  login), it's brittle, and it's more work than the API path below.

### Recommended: app auto-fetches candles for the parsed symbols (free)
Because the importer already parsed the executions, **the app knows exactly which
symbols + dates were traded** — so it fetches their candles itself. Per-symbol
manual exports drop to **zero**:

1. Export TOS Account Statement (1 step, unchanged).
2. Import → parse executions → **app auto-fetches candles for each traded symbol
   via the `CandleProvider`** → cache locally → render.

- **Provider: Alpha Vantage free tier** (verified June 2026,
  [docs](https://www.alphavantage.co/documentation/)):
  - `TIME_SERIES_INTRADAY`, **1-min**, **`extended_hours=true` by default**
    (4:00am–8:00pm ET → covers pre-market). ✅
  - **Historical backfill by month**: `outputsize=full&month=YYYY-MM` returns a
    full past month — so even **year-old trades are reachable** (fixes the
    backfill problem below). ✅
  - **Free**, API-key only, legitimate (no scraping). ✅
  - Limit **~25 req/day**: a session's 2–10 symbols = 2–10 calls → well under
    cap for daily use; throttle large one-time backfills over a few days.
- **Open risk to validate:** thin **penny-stock pre-market** coverage (e.g.
  MOBX ~$0.95, CDTG ~$0.53). Must test AV against real traded symbols/dates
  before relying on it (see the coverage-test task).

### Manual fallback (free / already paid)
If a symbol isn't covered by the API, fall back to a manual export, same
`timestamp,o,h,l,c,vol` format, **with the chart's extended-hours session on**:
1. **TradingView "Export chart data"** — already subscribed ($10/mo).
2. **ThinkorSwim chart → right-click → "Export chart data…"** — free; keeps the
   whole workflow in one platform.

### Core strategy: fetch once on import, cache forever
- On import, for each traded symbol+day, fetch the 1-min candles **once** and
  **persist them in SQLite** (new `candles` table: `symbol, timeframe, t (epoch),
  o,h,l,c,vol`, unique on `symbol+timeframe+t`).
- After that the chart reads from the local cache — no re-fetch, works offline,
  and a short-lookback provider stops mattering for *ongoing* trades.
- All providers sit behind one **`CandleProvider` interface**
  (`getCandles(symbol, fromEpoch, toEpoch, timeframe)`), so the source is a
  config/adapter choice, not a rewrite.

### Backfill (old trades) — now handled by the free path
- Alpha Vantage's `month=YYYY-MM` history means old trades are reachable too, not
  just recent ones — so the earlier "needs a paid deep-history vendor" worry is
  largely moot, pending the penny-stock coverage test.
- **How TraderVue does it (reference):** renders with TradingView's charting
  library but feeds it their **own licensed historical data vendor** — the deep
  history is the data feed, not TradingView.

### Provider options (alternatives / fallbacks)
| Provider | Cost | Ext. hours | 1-min history | Notes |
|---|---|---|---|---|
| **Alpha Vantage** ⭐ | **Free** (~25 req/day) | ✅ `extended_hours=true` (default) | ✅ by month (years) | Recommended automated source. Validate penny-stock pre-market coverage. |
| **Polygon.io** | ~$29/mo (free tier 5/min, delayed) | ✅ full session | ✅ years (paid) | Free tier *may* work since we only need delayed historical data — verify free minute-history depth. |
| **Databento** | Usage-based (one-time) | ✅ | ✅ deepest quality | Best paid option for a one-time deep backfill if AV coverage is poor. |
| **Schwab Market Data** | Free w/ account | ✅ `needExtendedHoursData=true` | ⚠️ ~30–35 days | Ruled out: short window + 7-day OAuth re-auth. |
| **Twelve Data** | free / paid | ❌ ext. hours = Pro only | mid | Free tier lacks pre-market → unsuitable. |
| **yfinance** (unofficial) | Free | ⚠️ gappy | ⚠️ ~7–30 days | Zero setup; unreliable on thin names. |

### Decision
- **Automated + free + legitimate: Alpha Vantage**, app-driven (fetch candles for
  the parsed symbols), cached locally. Eliminates the per-symbol manual exports.
- **Manual TradingView/ToS export = fallback** for any symbol the API misses.
- **`CandleProvider` interface + `candles` cache** so swapping/adding a provider
  (Polygon, Databento) later is config, not a rewrite.
- ⚠️ **Do not automate TradingView/ToS UIs** — ToS violation, brittle, and
  unnecessary now that the API path exists.
- **Blocking validation:** the AV penny-stock pre-market coverage test before
  committing to it as primary.
