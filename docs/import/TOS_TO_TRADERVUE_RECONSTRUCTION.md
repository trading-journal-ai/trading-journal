# TOS / Schwab To TraderVue-Style Reconstruction

This note answers whether we can turn a ThinkorSwim/Schwab account statement
into the same trade-summary shape that TraderVue exports.

Short answer: yes, when the statement includes row-level filled activity. The
conversion is not possible from symbol-level P&L alone.

Product naming note: this process is now called broker normalization. See
`docs/import/IMPORT_ARCHITECTURE.md` for the canonical import contract and
`docs/import/BROKER_NORMALIZER.md` for the CLI preview tool.

## Target Shape

TraderVue-style trade summary rows look like:

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
Notes
Tags
Position MFE
Position MAE
Price MFE
Price MAE
```

The app already understands this shape through the DAS trade-summary path. It
stores each row as a synthetic open/close execution pair, with `Gross P&L` as
the source of truth for P&L reconciliation.

## TOS Statement Sections

A useful TOS/Schwab statement is a stacked CSV with multiple independent
sections. The parser must locate sections by title.

### Cash Balance

Header:

```text
DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE
```

Useful rows look like:

```text
BOT +100 TMDE @4.52
SOLD -2,180 AIFF @1.7117
```

What this section gives us:

- date
- time
- side from `BOT` / `SOLD`
- signed quantity
- symbol
- price
- misc fees
- cash amount
- running cash balance
- reference number, when present

What is missing:

- `TO OPEN` / `TO CLOSE`
- order type
- canceled/rejected orders
- explicit trade grouping
- sometimes true execution identity if multiple fills have identical timestamp,
  symbol, side, quantity, and price

Use:

- Good fallback source for fill-like executions.
- Best fee source.
- Can reconstruct trades by running inventory per symbol.
- Confidence is lower than `Account Trade History` because position effect is
  inferred, not provided.

### Account Trade History

Header:

```text
,Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type
```

What this section gives us:

- execution timestamp
- buy/sell side
- quantity
- `TO OPEN` / `TO CLOSE`
- symbol
- price and net price
- order type

What is missing:

- notes
- tags
- setup labels
- MFE/MAE

Use:

- Primary source when populated.
- Highest confidence for execution reconstruction.
- Existing parser already supports this section.

### Account Order History

Header:

```text
Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status
```

What this section gives us:

- order timestamp
- buy/sell side
- quantity
- position effect
- symbol
- order price, when present
- time in force
- status: `FILLED`, `CANCELED`, etc.

What is missing or risky:

- `Time Placed` may not be exact fill time.
- `PRICE` can be a limit price, not actual fill price.
- market orders can show `~`.
- includes canceled/rejected orders that must not become trades.

Use:

- Good for intent and order-behavior analysis.
- Possible fallback for lower-confidence reconstruction if filtered to
  `Status = FILLED`.
- Should not be treated as exact fill-level truth unless reconciled with Cash
  Balance or Account Trade History.

### Profits and Losses

Header:

```text
Symbol,Description,P/L Open,P/L %,P/L Day,P/L YTD,P/L Diff,Margin Req
```

What this section gives us:

- symbol-level P&L
- open P&L
- day/YTD totals

What is missing:

- entries
- exits
- timestamps
- share quantities per round trip
- setup/intent context

Use:

- Reconciliation only.
- Not enough for trade-level coaching.

### Equities

Header:

```text
Symbol,Description,Qty,Trade Price
```

Use:

- Current open-position context.
- Not enough for closed-trade reconstruction.

## Reconstruction Strategy

Preferred path:

```text
Account Trade History
→ fill-level executions
→ matchTrades running inventory
→ TraderVue-style trade summary
→ candle-derived MFE/MAE
→ optional tags/notes/playbook context
```

Fallback path:

```text
Cash Balance BOT/SOLD descriptions
→ inferred fill-like executions
→ matchTrades running inventory
→ reconcile against Profits and Losses
→ TraderVue-style trade summary
```

Lower-confidence path:

```text
Account Order History FILLED rows
→ order-like events
→ reconcile against Cash Balance / P&L
→ TraderVue-style trade summary with confidence warnings
```

Not enough:

```text
Profits and Losses + Equities only
→ statement-level review
→ no trade-level reconstruction
```

## Local Schwab File Findings

Thin file:

```text
data/evals/coach/raw/2026-07-02-AccountStatement.csv
```

Current inspection:

- Cash Balance section exists, but has only a `TOTAL` row.
- Account Order History header exists, but has 0 rows.
- Account Trade History header exists, but has 0 rows.
- Equities section has 1 open position.
- Profits and Losses has 276 symbols.
- No `BOT ... @price` or `SOLD ... @price` descriptions are present.

This saved CSV cannot be converted to TraderVue-style trade rows. It can only
support statement-level P&L review.

Rich file:

```text
data/evals/coach/raw/2026-07-02-AccountStatement-V2.csv
```

Current inspection:

- Cash Balance has 10,269 trade rows:
  - 5,157 `BOT` rows
  - 5,112 `SOLD` rows
- Account Trade History has 10,269 usable fills.
- Cash Balance and Account Trade History have 10,222 exact fill matches by
  timestamp, side, symbol, quantity, and price.
- 47 fills are unmatched on each side by exact key, likely from minor
  representation differences that should be reconciled with a tolerance or
  reference-aware join.
- Account Order History has 12,571 rows:
  - 8,756 `FILLED`
  - 3,550 plain `CANCELED`
  - additional partial-cancel, trigger, and reject statuses
- Account Order History includes 895 filled rows with missing `PRICE` (`~`),
  mostly market orders; Account Trade History has the actual fill prices.
- Profits and Losses has 276 symbols and can be used for reconciliation.

This V2 file can be converted to TraderVue-style trade rows. The preferred path
is Account Trade History for fills, Cash Balance for fees/balance
reconciliation, Account Order History for order-behavior context, and Profits
and Losses for symbol-level validation.

## What A Rich Schwab Export Would Need

To replicate TraderVue, we need at least one of these:

- populated `Account Trade History`
- populated `Cash Balance` rows with `BOT` / `SOLD` descriptions
- populated `Account Order History` filled rows plus enough price/time data to
  reconcile against Cash Balance or P&L

Best export target:

1. Account Trade History populated.
2. Cash Balance populated.
3. Profits and Losses populated for reconciliation.
4. Account Order History populated for order-behavior context.

## Coach Implications

Broker data can tell us what happened:

- trade timing
- symbol churn
- position size
- entry/exit price
- P&L
- win/loss distribution
- MFE/MAE if candles are joined

Broker data cannot reliably tell us:

- whether the setup was valid
- whether the trader saw the correct context
- whether the entry followed the playbook
- emotional state
- intended risk
- why the trader exited

Those require playbook rules, chart-derived evidence, and/or user notes.
