# TraderVue Export Adapter

TraderVue exports can be a useful middle layer when broker exports are too raw
or inconsistent. In the current private eval data, TraderVue produced a
trade-summary CSV from DAS paper trades that is cleaner than the Schwab/TOS
statement export.

For the broader canonical import contract, diagnostics, and future multi-broker
adapter rules, see `docs/import/IMPORT_ARCHITECTURE.md`.

## Supported Shape

The current adapter treats TraderVue exports with DAS-style trade-summary
headers as `das_csv` imports.

Required columns:

```text
Open Datetime
Close Datetime
Symbol
Side
Volume
Entry Price
Exit Price
Gross P&L
```

Additional useful columns seen in the TraderVue export:

```text
Exec Count
Gross P&L (%)
Notes
Tags
Position MFE
Position MAE
Price MFE
Price MAE
Position MFE Datetime
Position MAE Datetime
Price MFE Datetime
Price MAE Datetime
```

## Current Finding

The private file:

```text
data/evals/coach/raw/DAS-Paper-Trades-exported-from-TraderVue.csv
```

contains:

- 1,174 trade-summary rows
- open and close timestamps
- symbol, side, volume, entry price, exit price, and gross P&L
- `Exec Count` on every row
- `Tags` on every row
- MFE/MAE fields on many rows
- no populated `Notes`

This is enough for deterministic trade-level coaching, P&L review, churn
analysis, symbol clustering, entry/exit timing relative to candles, and
MFE/MAE-based exit efficiency. It is not true fill-level data, so the app should
not claim exact execution sequencing beyond the open/close summary and exec
count.

## How The App Uses It

The existing DAS parser converts each trade-summary row into a synthetic
open/close execution pair so the app can store and chart the trade:

- `Open Datetime` becomes the entry timestamp.
- `Close Datetime` becomes the exit timestamp.
- `Side` maps to long/short.
- `Volume` is treated as round-trip volume and divided by two for share
  quantity.
- `Gross P&L` is the source of truth for P&L alignment.

## Coach Use

This is probably the best current source for AI Coach v1 evals because it gives
clean trade-level facts while avoiding the Schwab statement-section issue.

Good coaching inputs:

- trade count by day/week
- symbol repetition and churn
- P&L distribution
- win/loss streaks
- average winner/loser
- MFE/MAE and giveback
- tags from TraderVue
- chart context from app candle lookup

Still needs human/playbook context:

- whether the setup was valid
- whether the entry was late
- whether the exit followed plan
- what the trader saw and intended
- emotional state or process drift

## Inspection

Run:

```bash
npm run broker:inspect -- --file data/evals/coach/raw/DAS-Paper-Trades-exported-from-TraderVue.csv
```

Expected result:

```text
das-trade-summary
DAS/TraderVue trade rows: 1174
Usable for import and private coach evals as trade-summary rows.
```
