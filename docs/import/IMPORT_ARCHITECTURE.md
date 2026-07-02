# Import Architecture

The import system should treat every broker export as a source-specific raw
format and convert it into one canonical trade contract before anything else in
the app uses it.

## Pipeline

```text
Raw broker file
→ inspect
→ source adapter
→ canonical normalized trades
→ validation and reconciliation diagnostics
→ persist to journal database
→ candle/chart enrichment
→ journal, reports, and AI coach payloads
```

This keeps broker-specific logic out of the journal, chart, reports, and coach
layers.

## Canonical Trade Contract

The first canonical contract is intentionally close to the TraderVue/DAS
trade-summary shape because the app already understands it:

```text
Open Datetime
Close Datetime
Symbol
Side
Volume
Exec Count
Entry Price
Exit Price
Gross P&L
Gross P&L (%)
Shared
Notes
Tags
Gross P&L (t)
Position MFE
Position MAE
Price MFE
Price MAE
Position MFE Datetime
Position MAE Datetime
Price MFE Datetime
Price MAE Datetime
```

Internally, this should become a typed `NormalizedTrade` object rather than a
CSV-only concept:

```text
source
sourceConfidence
symbol
side
quantity
entryAt
exitAt
avgEntryPrice
avgExitPrice
grossPnl
fees
netPnl
executionCount
tags
notes
diagnostics
```

The CSV is just a preview/export/debug representation of that object.

## Source Adapter Responsibilities

Each adapter should:

- detect whether it supports the file
- parse only its source-specific sections/columns
- normalize to the canonical trade contract
- preserve enough source metadata for diagnostics and dedupe
- emit warnings instead of hiding confidence problems
- avoid inventing missing facts

Adapters should not:

- score setups
- generate coaching language
- infer trader intent
- fetch candles
- write directly to unrelated app tables

## Diagnostic Contract

Every import should be able to report:

- detected source type
- parsed row counts
- importable row counts
- rejected/skipped row counts
- date range
- symbol count
- open-trade count
- duplicate count
- missing required fields
- confidence level
- reconciliation checks
- next action for the user

For TOS/Schwab, useful diagnostics include:

- Cash Balance trade rows
- `BOT` / `SOLD` split
- Cash Balance fee rows
- Account Trade History fill count
- Cash Balance ↔ Trade History exact matches
- Account Order History filled/canceled/rejected counts
- order rows with missing `PRICE` (`~`)
- Profits and Losses symbol count
- statement P&L reconciliation status

## Error Handling

Errors should be actionable and file-specific.

Good:

```text
ThinkorSwim statement detected, but Account Trade History has 0 fill rows.
Cash Balance has 0 BOT/SOLD rows. This file can only support symbol-level P&L
review. Re-export the account statement with trade history included.
```

Good:

```text
TraderVue/DAS trade-summary CSV detected, but 14 rows are missing Close Datetime.
Importable rows: 1,160. Skipped rows: 14.
```

Bad:

```text
Import failed.
```

## Confidence Levels

Use explicit confidence labels:

- `high`: fill-level execution rows with prices and timestamps
- `medium`: trade-summary rows with open/close and P&L
- `low`: order-history-only rows or missing exact fill prices
- `statement_only`: P&L/position data without reconstructable trades

The coach should receive the confidence level and should not overstate claims
from low-confidence sources.

## Current Sources

### ThinkorSwim / Schwab

Preferred path:

```text
Account Trade History
→ fill-level executions
→ matched trades
→ normalized trade rows
```

Supporting sections:

- Cash Balance: fees and reconciliation
- Account Order History: order-behavior context
- Profits and Losses: symbol-level validation
- Equities: open-position context

### DAS / TraderVue

Already close to canonical:

```text
trade-summary CSV
→ normalized trade rows
```

These rows are medium confidence: excellent for coaching and review, but not
fill-level sequencing.

## Multi-Broker Expansion

For future broker samples from other traders:

1. Put raw private files under `data/evals/coach/raw/`.
2. Run `npm run broker:inspect`.
3. Add a source adapter only after the file shape is understood.
4. Add a sanitized fixture or synthetic test row.
5. Normalize to the same canonical trade contract.
6. Keep raw data private and ignored.

## MVP Import Flow

For v1, the user-facing flow should be:

```text
Upload CSV
→ app inspects file
→ app shows source type and diagnostics
→ app normalizes if supported
→ app imports normalized trades
→ app shows imported/skipped/reconciled counts
→ user reviews journal and coach output
```

The local `broker:normalize` script is a preview/debug tool. The app should
eventually do the same normalization internally during import.
