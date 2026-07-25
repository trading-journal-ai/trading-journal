# Schwab API Probe Notes

These notes record the non-sensitive structural conclusions from a successful,
read-only one-day probe against an authorized Schwab account. The raw response,
account identifiers, symbols, prices, quantities, tokens, and personal trading
counts are not stored in the repository.

## Confirmed Mapping

Order history is the fill source of truth:

```text
order
├── orderId
├── status
├── orderLegCollection[]
│   ├── legId
│   ├── instrument.assetType
│   ├── instrument.symbol
│   ├── instruction
│   └── positionEffect
└── orderActivityCollection[]
    ├── activityId
    ├── activityType
    ├── executionType
    └── executionLegs[]
        ├── legId
        ├── quantity
        ├── price
        └── time
```

Each execution leg carries the fill-level quantity, price, and timestamp.
`legId` links the execution back to the corresponding order leg. Partial fills
can therefore remain separate instead of being collapsed to an average price.

Observed equity instructions include `BUY`, `SELL`, and `SELL_SHORT`; observed
position effects include `OPENING` and `CLOSING`. The adapter must still support
and test buy-to-cover behavior without assuming it will always have a distinct
instruction value.

Trade transactions are reconciliation and fee support:

```text
transaction
├── activityId
├── orderId
├── tradeDate
├── time
├── type
├── netAmount
└── transferItems[]
    ├── amount
    ├── cost
    ├── feeType
    └── instrument
```

Observed fee types include commission and regulatory fee categories. They are
separate from the order execution leg, so Phase 2 must reconcile them without
creating extra executions.

## Identity Decision

No independently documented execution identifier was confirmed on the
execution-leg object. Until broader probes prove otherwise, the adapter should
derive a deterministic broker identity from the authorized account, order ID,
activity ID, leg ID, execution timestamp, quantity, and price. A second
canonical fill hash is still required for API-after-CSV deduplication.

## What the Sample Did Not Prove

The one-day response did not include nested child strategies or enough
high-volume results to establish a safe result cap. Phase 2 should therefore:

- walk child order strategies recursively;
- request small ET date chunks;
- detect suspicious cap-sized responses;
- merge overlapping chunks by broker identity;
- fail closed on a partial chunk error.

The committed
`src/lib/schwab/__fixtures__/synthetic-history.json` fixture contains only fake
values and adds partial-fill and partially-filled-then-canceled cases for
adapter tests. It is not derived from the live account payload.
