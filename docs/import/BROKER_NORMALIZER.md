# Broker Normalizer

The broker normalizer turns messy broker exports into one clean trade-summary
CSV, shaped like a TraderVue/DAS export.

This is the clearer product name for what we had been calling reconstruction:
we are normalizing a multi-section broker statement into a single review table.
See `docs/import/IMPORT_ARCHITECTURE.md` for the broader import contract,
diagnostic model, and multi-broker plan.

## Command

```bash
npm run broker:normalize -- --file data/evals/coach/raw/2026-07-02-AccountStatement-V2.csv
```

Default output:

```text
data/evals/coach/outputs/2026-07-02-AccountStatement-V2.normalized-tradervue.csv
```

Private outputs stay under `data/evals/`, which is gitignored.

## Output Shape

The output uses the TraderVue-style headers already supported by the app's
DAS/trade-summary parser:

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

## Current V2 Result

For:

```text
data/evals/coach/raw/2026-07-02-AccountStatement-V2.csv
```

The normalizer produced:

- 10,269 fill rows read from `Account Trade History`
- 3,736 reconstructed trades
- 3,735 closed trade-summary rows written
- 1 still-open reconstructed trade excluded by default
- closed gross P&L: `-4616.55`
- fees: `145.62`
- closed net P&L: `-4762.17`

The generated file is recognized by:

```bash
npm run broker:inspect -- --file data/evals/coach/outputs/2026-07-02-AccountStatement-V2.normalized-tradervue.csv
```

as:

```text
das-trade-summary
DAS/TraderVue trade rows: 3735
```

## Current Limitations

- MFE/MAE fields are blank until we join candle data.
- Notes and Tags are blank because Schwab does not provide playbook context.
- Times are emitted in Eastern market time so the existing trade-summary parser
  can read them correctly.
- The first version uses `Account Trade History` as the source of truth and Cash
  Balance only for fees. Account Order History remains context, not fill truth.
- P&L may not reconcile exactly to statement-level YTD P&L until we decide how
  to treat open positions, earlier statement periods, and any unmatched
  representation quirks.

## App Import Path

The app import path now uses the same normalization contract internally:

```text
raw CSV
→ inspect
→ normalizeBrokerCsv
→ persist normalized trades
→ link source executions when available
→ show confidence and warnings
```

For high-confidence ThinkorSwim/Schwab imports, the app still persists the
underlying fill-level executions and links them to normalized trades. For
medium-confidence DAS/TraderVue trade-summary imports, the app persists
synthetic open/close executions because the source does not contain every fill.

The local `broker:normalize` command remains useful as a preview/export helper
when we want to inspect the canonical table without writing to the app database.
