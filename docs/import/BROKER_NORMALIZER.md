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
- `Account Trade History` remains the source of truth for individual fills.
  `Cash Balance` contributes fees and its broker `REF #` is used to group fills
  produced by the same order. `Account Order History` remains validation
  context, not fill truth.
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

## ThinkorSwim Orders, Fills, and Partial Fills

ThinkorSwim exposes the same activity at three useful levels:

- `Account Trade History` contains the executed fills. These rows retain the
  actual quantity, price, and execution time and remain immutable source data.
- `Cash Balance` repeats the fill activity and includes a broker `REF #`. Fills
  with the same reference belong to the same submitted broker order, even when
  the broker filled that order in multiple pieces or at multiple prices.
- `Account Order History` describes the submitted order and its final status.
  It is useful for validating requested quantity and status, but it is not a
  replacement for fill-level history.

The app stores a one-way hash of the normalized `REF #` as
`broker_order_key`. The raw broker reference is not persisted. This lets the
review layer distinguish an intentional second order from two fills created by
one order without discarding the underlying fills.

For example, an order to buy 100 shares can appear in Trade History as fills of
88 and 12 shares. If both Cash Balance rows share one `REF #`, review treats
them as one 100-share action while retaining two raw fills. It does not label
the second fill as an add or as averaging down.

Grouping rules are deliberately conservative:

1. Group fills with the same non-empty `broker_order_key`, side, and position
   effect. Different fill prices and nearby timestamps are allowed.
2. For older imports without a broker key, group only fills with the exact same
   execution timestamp, side, and position effect. This supports common TOS
   partial-fill exports while avoiding a broad time-window guess.
3. Keep ambiguous rows separate. Proximity within 10–30 seconds alone is not
   enough evidence that two fills came from one order.

Grouped review actions use quantity-weighted average price and retain their raw
fill IDs and fill count. Trade reconstruction and audit paths continue to use
the raw fills. Re-importing a statement is required to recover broker-reference
grouping for older records whose partial fills occurred at different times.
