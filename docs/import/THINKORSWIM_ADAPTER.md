# ThinkorSwim / Schwab Import Adapter

This note documents the ThinkorSwim/Schwab account-statement CSV shape and how
the app currently reads it. The file is a multi-section statement, not a single
flat trade table, so the import adapter must first locate the relevant section
before parsing rows.

For the broader canonical import contract, diagnostics, and future multi-broker
adapter rules, see `docs/import/IMPORT_ARCHITECTURE.md`.

## Current App Behavior

The production import path is:

- `src/lib/import/persist.ts`
- `src/lib/import/tos.ts`
- `src/lib/import/match.ts`

The app prefers an unfiltered `Account Trade History` section. Those rows are
treated as high-confidence fill-level executions, then `matchTrades`
reconstructs trades from buys and sells.

When trade history is absent or its title says `filtered by ...`, the adapter
falls back to the full `Cash Balance` ledger. `BOT` and `SOLD` rows provide
timestamp, side, quantity, symbol, price, fees, and an opaque hashed broker
reference. Position effect is inferred from the running position, and the
result is labeled medium confidence. A filtered trade-history table is never
silently treated as the complete account history.

The adapter currently does not import `Account Order History`. That section is
useful, but it is order-history data, not guaranteed fill-level execution data.
It can include canceled orders, market orders with `~` price placeholders, and
timestamps that should be treated as order facts unless verified as fill facts.

## Statement Structure

A Schwab/ThinkorSwim account statement CSV can include these sections:

```text
Account Statement
Cash Balance
Futures Statements
Forex Statements
Account Order History
Account Trade History
Equities
Profits and Losses
```

Sections are identified by a line whose only non-empty cell is the section
name. The next non-empty row is usually the section header. Rows continue until
the next blank line or next section title.

## Sections We Care About

### Account Trade History

This is the preferred import source because it is closest to execution/fill
data.

Expected header:

```text
,Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type
```

Important fields:

- `Exec Time`: timestamp used as the execution time.
- `Side`: `BUY` or `SELL`.
- `Qty`: signed quantity; importer stores absolute quantity.
- `Pos Effect`: usually `TO OPEN` or `TO CLOSE`.
- `Symbol`: ticker.
- `Price` / `Net Price`: fill price. `Net Price` is preferred when present.
- `Order Type`: useful context but not currently persisted as a first-class
  field.

Current import result:

- Creates execution rows.
- Joins best-effort fees from `Cash Balance` when possible.
- Dedupe key is a stable hash of symbol, timestamp, side, quantity, price,
  position effect, and occurrence index.
- Reconstructs trades from executions with `matchTrades`.

### Cash Balance

Used for fee lookup when complete trade history is present, and as the
execution source when trade history is absent or filtered.

The adapter looks for descriptions like:

```text
BOT +100 TMDE @4.52
SOLD -100 AIFF @1.7534
```

When date, time, symbol, absolute quantity, and price match a trade-history
execution, fees are attached to that execution. Identical fills split the
summed fee so the fee is not double-counted. In fallback mode, each `BOT` or
`SOLD` row becomes an execution and `REF #` groups broker fills without storing
the raw reference.

### Account Order History

This section is visible in some Schwab exports and spreadsheets and can contain
rows like:

```text
Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status
```

Important fields:

- `Time Placed`: order timestamp.
- `Side`: `BUY` or `SELL`.
- `Qty`: signed order quantity.
- `Pos Effect`: `TO OPEN` or `TO CLOSE`.
- `Symbol`: ticker.
- `PRICE`: limit price, or sometimes `~` for market orders.
- `TIF`: time in force, for example `DAY` or `EXT`.
- `Status`: `FILLED`, `CANCELED`, etc.

Potential future import use:

- Filter to `Status = FILLED`.
- Ignore canceled rows for trade reconstruction.
- Treat `PRICE = ~` as missing price unless it can be reconciled elsewhere.
- Label timestamps as order-history timestamps unless we confirm Schwab uses
  actual fill time for that export.

This section can support a first-pass behavior review, but it is lower
confidence than `Account Trade History` for exact chart reconstruction.

### Equities

Current open positions. Useful for diagnostics, but not trade reconstruction.

Expected header:

```text
Symbol,Description,Qty,Trade Price
```

### Profits and Losses

Symbol-level statement P&L. Useful for portfolio-level diagnostics, but not
trade-level coaching.

Expected header:

```text
Symbol,Description,P/L Open,P/L %,P/L Day,P/L YTD,P/L Diff,Margin Req
```

This can answer questions like “which symbols drove YTD P&L?” It cannot answer
questions like “was this entry late?” without order/trade rows and chart data.

## Local Inspection

Before importing or building private coach cases, inspect the raw CSV:

```bash
npm run broker:inspect -- --file data/evals/coach/raw/2026-07-02-AccountStatement.csv
```

The inspector reports:

- app-export trade rows
- TOS order-history rows and usable filled rows
- TOS trade-history rows and usable fills
- open positions
- symbol-level P&L rows
- a recommendation for what the file can safely support

Machine-readable output:

```bash
npm run broker:inspect -- --file data/evals/coach/raw/2026-07-02-AccountStatement.csv --json
```

## Current 2026-07-02 File Finding

The local file currently at:

```text
data/evals/coach/raw/2026-07-02-AccountStatement.csv
```

contains section headers for `Account Order History` and `Account Trade
History`, but both sections have zero rows in the saved CSV. It does contain
open-position and symbol-level P&L rows.

That means this local file can support statement-level review, but not
trade-level import or chart reconstruction. If a spreadsheet view shows filled
order rows, export/save that worksheet again and rerun `broker:inspect` before
building an import adapter from it.

## Adapter Decision Rules

Use these rules when extending import support:

1. Prefer unfiltered `Account Trade History` when it has usable rows.
2. Use full `Cash Balance` trade rows when trade history is absent or filtered.
3. Use `Account Order History` only as a separate lower-confidence adapter.
4. Keep canceled orders out of reconstructed trades.
5. Preserve missing price as missing; do not infer a fill price from `~`.
6. Keep private broker exports under `data/evals/`, which is gitignored.
7. Do not send private broker data to OpenAI unless explicitly running an eval
   with `--generate`.

### Security identifiers and corporate actions

ThinkorSwim can export a nine-character CUSIP in the `Symbol` field after a
corporate action. The adapter validates CUSIP check digits before treating a
value as a security identifier. Known identifiers are normalized through the
security alias registry before matching trades or requesting candles; the raw
broker identifier remains part of the execution's dedupe identity.

The first registered alias is `40423R204 → HCWB` for HCW Biologics after its
2025 reverse split. Unresolved CUSIPs remain importable but produce an explicit
import warning and are not sent to the candle provider as if they were tickers.
Execution-derived fallback charts are labeled as estimates in the review UI.

## Open Work

- Add a dedicated `Account Order History` parser if the export consistently
  includes filled rows.
- Add diagnostics to the app import UI so users see why a CSV did or did not
  import trades.
- Add fixture-based tests with sanitized order-history rows.
- Decide whether order-history-only imports should be allowed into the main
  database or kept as coach/eval-only evidence until confidence improves.
