# Trade Import and Reconciliation Behavior

> Status: current-state audit and target contract
> Last reviewed: 2026-07-25
> Scope: stock and ETF executions imported through Schwab REST, ThinkorSwim
> statements, and DAS/TraderVue summaries

This document explains what the Journal means by an execution and a trade, how
imports are grouped and deduplicated, what happens when a trade stays open
across multiple imports or days, and where the current implementation still
needs strengthening.

## Bottom line

The durable model is correct:

1. A broker **execution** (fill) is the factual source record.
2. A Journal **trade** is a derived, account-scoped, flat-to-flat grouping of
   one or more executions in the same symbol.
3. Normal sync is append-only. It must never silently replace a closed trade or
   discard notes.
4. A later fill may update the same open trade in place. Its trade ID and
   journal relationships must remain stable.
5. If the system cannot prove how a fill belongs, it should skip it for review
   or fail atomically—not guess.

The Schwab direct-import path implements most of this contract. The older file
importer does not yet provide the same incremental-reconciliation guarantees.
The largest remaining correctness risks are listed in
[Known correctness gaps](#known-correctness-gaps).

## External research: what established journals do

The main industry pattern is to import individual executions and then group
them into logical trades:

- [Tradervue describes a trade as a group of executions](https://help.tradervue.com/article/3480-split-merge-trades)
  and provides explicit split/merge tools when automatic grouping does not
  match the trader's intent.
- [TradeZella's generic importer requires every execution individually](https://help.tradezella.com/en/articles/8239862-how-to-import-trades-from-unsupported-broker-into-tradezella-via-generic-csv-file-upload),
  including both buys and sells, and it also provides
  [manual split/merge controls](https://help.tradezella.com/en/articles/7031683-how-can-i-split-or-merge-a-trade).
- [Tradervue recommends beginning history from a point when the account was flat](https://help.tradervue.com/article/3479-open-trades-and-p-l-discrepancy).
  A close without its earlier opening position is inherently ambiguous.
- Account separation must affect matching, not just filtering.
  [Tradervue scopes new executions to an existing open trade by account tag](https://help.tradervue.com/article/3422-using-multiple-trading-accounts).

Multi-day handling is also consistent:

- [Tradervue keeps a swing trade open while showing opened, adjusted, and
  closed activity on each relevant day](https://help.tradervue.com/article/3437-swing-trades).
- [TradeZella attributes daily P&L to the day of a partial or full exit](https://help.tradezella.com/en/articles/10528734-how-the-dashboard-calendar-calculates-and-shows-daily-profit-loss-p-l),
  not only to the entry day.

These are product references, not accounting authorities. For tax reporting,
Schwab supports FIFO, LIFO, specified lots, and other cost-basis methods;
[Schwab states that FIFO is its default for most securities](https://www.schwab.com/node/9326).
The Journal's flat-to-flat behavioral grouping is not a tax-lot ledger and
should never be represented as one.

For older or broker-specific history, complete broker reports remain important.
[Interactive Brokers' official Flex Query documentation](https://www.ibkrguides.com/orgportal/performanceandstatements/flex.htm)
is a useful example of field-level trade-confirmation exports, while
[Schwab provides account-statement guidance](https://www.schwab.com/help/account-statements)
for the authoritative account record.

## Canonical concepts

### Execution

One filled broker leg with:

- account
- symbol
- buy or sell
- quantity
- price
- execution timestamp
- opening/closing position effect when supplied
- fees when available
- source and dedupe identities

An order is not an execution. An unfilled or canceled order does not become a
trade. A partially filled then canceled order contributes only its actual fill
executions.

Broker facts should remain immutable. Database linkage such as `tradeId` may be
assigned when a new execution is reconciled into an open trade.

### Trade

A derived position lifecycle:

```text
flat
→ first fill opens a long or short position
→ same-direction fills increase it
→ opposite-direction fills reduce it
→ position returning to zero closes the trade
```

If the trader later re-enters the same symbol after returning to zero, that is
a new trade by default.

### Import batch

An audit record for one confirmed ingest. Preview creates no batch and performs
no writes. A duplicate-only or review-only Schwab result also creates no batch.

## Default policy

| Question | Default |
| --- | --- |
| Source of truth | Immutable execution-level fills |
| Trade boundary | One account + one symbol, from flat back to flat |
| Scaling in/out | Stays inside the current trade |
| Multiple round trips | A new trade each time position returns to zero |
| Open at end of range | Store an open trade |
| Later close | Update that same open trade in place |
| Duplicate import | Skip existing executions |
| Existing closed trade | Never overwrite during normal sync |
| Ambiguous historical fill | Skip and label **Needs review** |
| Forward reconciliation ambiguity | Roll back the confirmed import |
| Timezone | Store UTC epoch seconds; group/display by US Eastern market date |
| Account boundary | Never reconcile across Journal accounts |
| Asset scope | Stocks and ETFs only in the current Schwab adapter |
| Tax lots | Out of scope; Journal grouping is behavioral, not tax accounting |

## How Schwab direct import works today

The implementation is split across:

- [`dates.ts`](../../src/lib/schwab/dates.ts): ET date validation and API chunks
- [`history.ts`](../../src/lib/schwab/history.ts): order/transaction retrieval
- [`normalize.ts`](../../src/lib/schwab/normalize.ts): Schwab payload to fills
- [`duplicates.ts`](../../src/lib/schwab/duplicates.ts): cross-source comparison
- [`reconcile.ts`](../../src/lib/schwab/reconcile.ts): trade planning and safety
- [`persist.ts`](../../src/lib/schwab/persist.ts): atomic confirmed writes

The focused Journal also exposes a fast path for the current ET date. When
today has no trades, **Import today's trades** performs the same server-verified,
append-only import for that single date. The click is the confirmation; it does
not add a separate preview step. Multiple Schwab accounts still require an
explicit masked-account choice, and ambiguous fills remain excluded for review.
The full importer continues to own historical ranges, detailed previews, and
file uploads.

### 1. Fetch

- The user selects a masked Schwab account and ET date range.
- The range is limited to the most recent 60 days.
- Requests are split into seven-day chunks.
- Orders receive an additional seven-day entered-order lookback so an order
  entered shortly before the selected range can still contribute fills inside
  it.
- Trade transactions are fetched for fee reconciliation.
- Any invalid response or order result at the 3,000-row cap stops the preview
  instead of accepting possibly truncated history.

All network work happens before confirmed persistence. A timeout or failed
chunk cannot leave a partial database import.

### 2. Normalize

- Child orders are flattened.
- Each `FILL` execution leg becomes its own execution.
- Quantity, price, timestamp, symbol, instruction, and position effect are
  validated.
- Non-equity legs and malformed fills are excluded with warnings.
- Fee records are attached to the closest execution from the same order.
- Raw Schwab account and order identifiers are not persisted. HMAC identities
  are stored instead.

Order activity is currently the execution source; transaction history is used
for fees, not as a second execution source.

### 3. Deduplicate

The system uses two identities:

1. **Broker execution identity** for repeated Schwab syncs.
2. **Canonical fill identity** for API-after-file overlap.

The canonical comparison uses account, normalized symbol, exact execution
second, side, quantity, and price. Multiplicity is counted, so two genuinely
identical fills at the same second are not automatically collapsed into one
when two existing occurrences are present.

Fees and position effect are intentionally not required for cross-source
matching because statement and API representations can differ.

### 4. Classify historical fills

A new fill at or before the latest stored execution for its account/symbol is
treated as historical.

- A self-contained historical group that opens and returns to flat can be
  appended as a new closed trade.
- An incomplete or close-first historical group is excluded from the import and
  shown as **Needs review**.
- Safe symbols elsewhere in the range may still import.

This is why the NVVE fill is skipped without blocking other trades or modifying
the existing NVVE journal record.

### 5. Reconcile forward fills

For each affected account/symbol:

- load the single compatible open trade and its executions;
- add the new executions chronologically;
- recompute the derived trade;
- update the existing trade row in place; and
- attach only the new executions to that stable trade ID.

This preserves notes, tags, attachments, setup, stop, target, and any other
relationships attached to the trade.

If more than one open trade exists for the same account/symbol, a fill flips
through zero, or an inserted identity changes concurrently, the transaction is
rolled back.

## Partial fills and scaling

Every partial fill remains a separate execution. The matcher uses position
quantity, not order status:

```text
Buy 60 @ 10.00
Buy 40 @ 10.10   → one 100-share open long
Sell 25 @ 10.40  → same trade, 75 shares remain
Sell 75 @ 10.50  → same trade closes
```

The trade stores weighted average entry and exit prices. Execution analysis
calculates realized P&L on each reduction using the running average entry price.
This produces the correct total P&L for the flat-to-flat Journal trade, but it
is not Schwab tax-lot accounting.

Fees are accumulated across the trade. When Schwab reports one fee record for
an order with several fills, the current adapter assigns the full fee to the
closest fill. The trade-level total remains useful, but per-fill fee attribution
is best effort.

## Trades that span days or imports

### Expected lifecycle

```text
Monday: buy 100          → trade 42 created as open
Tuesday: sell 25         → trade 42 remains open; partial P&L is realized
Wednesday: buy 25        → trade 42 remains open; position increases
Thursday: sell 100       → trade 42 becomes closed
```

Normal Schwab sync updates trade 42 in place each time. It does not create a
new Tuesday short trade and does not replace Monday's note.

### Current Journal display limitation

The review loader currently selects and groups trades by `entryAt`. A multi-day
trade therefore primarily belongs to its opening day even though executions
are timestamped on later days. This differs from established journal behavior,
where each activity day shows whether the trade opened, adjusted, partially
closed, or fully closed and daily P&L appears when it was realized.

The import data can support that view, but the day-level Journal projection
needs to be updated.

## Error and edge-case matrix

| Case | Current Schwab behavior | Data change | User action |
| --- | --- | --- | --- |
| No equity fills in range | “No trades found” | None | Open Journal or choose another range |
| Every fill already exists | “Already imported” | None | Open Journal |
| Some duplicates, some new | Import only new fills | Append only | Confirm new count |
| Partial fills | Store each fill and group by position | Append/update open trade | None |
| Partially filled then canceled order | Import actual fills only | Append/update | None |
| Trade remains open | Store `status=open` | Append/create | Sync later |
| Later scale-in or partial exit | Update same open trade | Append/update | None |
| Later final close | Close same trade ID | Append/update | Review close day |
| Complete missing historical round trip | Create a new closed trade | Append only | Confirm |
| Incomplete/close-first historical fills | Skip as **Needs review** | None for those fills | Review trade; use complete statement if needed |
| Position flip through zero | Fail and roll back | None | Repair/split workflow needed |
| Multiple open trades for one account/symbol | Fail and roll back | None | Manual reconciliation needed |
| API timeout/invalid chunk | Preview/import unavailable | None | Retry or use statement |
| 3,000 orders returned in a chunk | Stop to avoid silent truncation | None | Narrow range |
| Non-equity leg | Exclude with warning | None | Future asset adapter |
| Malformed/zero-price fill | Exclude with warning | None | Verify statement/broker |
| Fee record cannot be matched | Import fill; warn about fee | Fill may have zero fee | Compare broker P&L |
| Concurrent duplicate insertion | Roll back | None | Refresh preview |
| Existing notes on an open trade | Preserve through stable trade ID | Notes unchanged | None |

## File import is not yet equivalent

ThinkorSwim and DAS/TraderVue files share the execution/trade schema, but the
legacy persistence path in [`src/lib/import/persist.ts`](../../src/lib/import/persist.ts)
uses a batch-local rule:

- it inserts new executions;
- it creates a trade only when every execution in that normalized trade is new;
- if only part of a normalized trade is new, it warns and skips creating that
  trade.

Consequences:

- Re-importing the exact same file is idempotent.
- A complete, self-contained file imports correctly.
- A file containing an opening fill already stored plus a new closing fill may
  insert the close but leave the new execution unassigned instead of updating
  the existing open trade.
- CSV position flips can also produce ambiguous execution-to-trade linkage.

Until the file importer uses the same reconciliation engine as Schwab, use a
complete statement range and review any partial-trade warning.

## Known correctness gaps

### P0 — address before calling import “fully robust”

1. **Close-first forward fill**

   If the Journal has no earlier open position, a new `TO CLOSE` sell can be
   interpreted by the flat-to-flat matcher as a new short. Position effect is
   currently used as a historical safety check but not as a universal matching
   invariant. A close-first fill must be sent to **Needs review**, never allowed
   to create the opposite position.

2. **Unify API and file reconciliation**

   Both sources should use the same account/symbol position ledger and stable
   open-trade update path. No confirmed import should leave a new execution
   without exactly one compatible trade unless it is explicitly quarantined.

3. **Long-lived Schwab orders**

   Orders entered more than seven days before the selected range may fill
   inside it. The current order-entry lookback is seven days, and transaction
   history is not yet used as an independent execution source. We should either
   query the maximum safe order lookback or normalize trade transactions as a
   completeness cross-check.

4. **Post-import position validation**

   After normalization and before commit, replay the account/symbol ledger and
   verify:

   - no close-first position was invented;
   - every imported execution is assigned exactly once;
   - stored open quantity agrees with the reconstructed quantity; and
   - when available, reconstructed positions agree with broker positions.

5. **Multi-day Journal projection**

   Show a trade on every ET date with execution activity. Attribute realized
   P&L to partial/full exit dates while retaining one stable trade record and
   one continuous note history.

### P1 — explicit repair and complex cases

1. Add a previewable repair workflow for split, merge, and re-import. It must be
   explicit and preserve or reattach notes.
2. Support a flip fill by allocating one execution across closing and opening
   trade legs, or quarantine it for manual split. The current one-execution to
   one-trade foreign key cannot represent both.
3. Decide whether a user may intentionally hold multiple strategies in the
   same symbol inside one broker account. Account scoping alone cannot
   distinguish “swing AAPL” from “day-trade AAPL.”
4. Add deterministic sequence handling for genuinely simultaneous fills where
   timestamps alone cannot establish order.
5. Reconcile corporate actions, transfers, symbol changes, splits, and
   zero-price expirations before expanding beyond stocks/ETFs.
6. Improve per-fill fee allocation and compare imported net P&L against a
   statement or broker summary.

## Acceptance contract

Before considering import a finished core feature, automated tests should prove:

- repeated and overlapping API/file imports insert zero duplicate executions;
- API-after-file and file-after-API overlap are symmetric;
- partial fills preserve their quantity, price, time, and total fees;
- an open trade can scale in, scale out, and close across several days/imports;
- the trade ID and all notes/tags/attachments remain unchanged;
- a close-first fill never creates an opposite position;
- complete historical gaps append; incomplete gaps quarantine;
- every committed execution has exactly one correct trade assignment;
- a flip is either represented correctly or rejected before writes;
- multiple accounts never reconcile into each other;
- a partial network/chunk failure leaves no batch or rows;
- daily Journal P&L follows realization dates for multi-day trades;
- reconstructed open positions match broker positions when those are available.

## Product decisions

These should remain the defaults:

- **Flat-to-flat grouping**, not a time-window guess.
- **Execution-level source of truth**, not order summaries.
- **Append-only normal sync**, with no automatic closed-trade overwrite.
- **Stable trade IDs** across later fills.
- **Account-scoped reconciliation**.
- **Needs review over guessing**.
- **Explicit repair later**, with a preview and note-preservation plan.
- **Journal analytics are not tax reporting**.

This gives the low-friction normal path the user wants while keeping ambiguous
history visible and recoverable instead of silently corrupting the Journal.
