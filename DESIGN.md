# Trading Journal — Design Doc

> Status: **Draft v1** · Last updated: 2026-06-11

A personal, local-first web app for logging stock/ETF trades, reviewing them
reflectively, and tracking performance over time.

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
1. **DAS Trader CSV import (primary).** Trading is done through **DAS Trader**
   (direct-access platform) on a **Schwab** account. DAS exports at the
   **execution/fill level** — each row is a single buy or sell with timestamp,
   price, quantity, and route — *not* pre-bundled round-trip trades. This is the
   main way data enters the journal.
2. **Manual entry** — a form to add/edit an execution or trade by hand (for
   corrections, missing fills, or non-DAS trades).
3. **Automated sync (later phase).** Either scripted ingestion of DAS export
   files or the Schwab API. Designed as a pluggable importer behind a common
   interface; not a v1 deliverable.

> **Key implication:** because DAS gives us fills, the import pipeline must group
> executions into positions / round-trips itself (see §5). Day-trading means
> frequent scaling in and out, so an execution-level model is required, not
> optional.

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

### 3.4 Charts & Screenshots
- Attach one or more chart images to a trade.
- Store images locally; display in the trade detail view.
- (Stretch) lightweight annotation / markup.

---

## 4. Architecture

### Stack
- **Framework:** Next.js (App Router) + React + TypeScript.
- **Styling:** TBD (Tailwind likely — fast for data-dense UI).
- **Charts:** a React charting lib (e.g. Recharts / visx — decide at build time).
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
    import/           # CSV parsers + broker importers (Schwab adapter later)
    analytics/        # P&L, R-multiple, equity curve calcs
  data/
    journal.db        # SQLite database (gitignored)
    uploads/          # screenshots (gitignored)
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
- `source` (`das_csv` | `manual` | `schwab_api`), `imported_at`, `row_count`,
  `file_name`

> Note: derived metrics (P&L, R) computed in the analytics layer so the source
> fields stay the single source of truth.

---

## 6. Phasing

### Phase 0 — Foundations
- Next.js + TS scaffold, Tailwind, SQLite + migrations, base layout.

### Phase 1 — Execution & trade model (MVP)
- `Execution` + `Trade` schema, FIFO matching engine, manual add/edit/delete,
  trade list, trade detail, derived P&L/R.

### Phase 2 — DAS Trader CSV import
- Upload a DAS export, map columns → executions, run matching into trades, with
  a preview/confirm step and row-hash dedupe.

### Phase 3 — Analytics
- Summary dashboard, equity curve, filters & breakdowns.

### Phase 4 — Review & journaling
- Reflection fields, emotional/discipline tracking, lessons search.

### Phase 5 — Charts & screenshots
- Image upload, attach to trades, display in detail view.

### Phase 6 — Automated sync (later)
- Scripted ingestion of DAS export files, and/or a Schwab API adapter, behind
  the importer interface; auth, fetch, map, dedupe.

---

## 7. Open Questions
- **DAS export format:** need a real DAS Trader export sample to pin down exact
  columns, timestamp format, and how DAS labels side/route/fees.
- **Matching edge cases:** position flips through zero, shorts, overnight holds
  spanning export files, partial-day exports. FIFO vs LIFO default.
- Styling lib: confirm Tailwind.
- ORM: Drizzle vs Prisma for SQLite.
- Charting lib choice.
- Backup strategy for the SQLite file.

> **Resolved:** partial fills / scaling in & out — handled by the
> `Execution` → `Trade` (FIFO matching) model in §5.
