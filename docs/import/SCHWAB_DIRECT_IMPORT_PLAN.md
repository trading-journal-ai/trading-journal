# Schwab Direct Import Plan

> Status: Proposed
> Owner: Trading Journal
> Related: `IMPORT_ARCHITECTURE.md`, `BROKER_NORMALIZER.md`,
> `THINKORSWIM_ADAPTER.md`

## Outcome

Let a user import recent Schwab executions without exporting a statement:

```text
Import
→ Sync from Schwab
→ choose an authorized Schwab account
→ choose an Eastern Time date range
→ preview fills, trades, duplicates, and warnings
→ confirm import
→ open the journal on the latest imported trading day
```

File upload remains available for historical backfills, unsupported assets, and
recovery when the API is unavailable.

## Product Principles

- Schwab sync is read-only. The journal must never place, replace, or cancel an
  order.
- Preview before writing.
- Executions are the immutable source of truth; trades are derived review
  objects.
- Repeated and overlapping imports are safe.
- Existing journal notes, tags, screenshots, and coach work are never replaced
  by an import.
- Broker credentials and raw account identifiers stay server-side.
- The journal never starts a Schwab activity stream. Direct import uses REST
  only.
- Prefer actionable diagnostics over a generic import failure.

## Scope

### V1

- Schwab Individual Trader API authentication
- Authorized-account discovery and masked labels
- Equity executions from the most recent API-supported history window
- Eastern Time date selection
- Read-only preview
- Partial fills and hashed broker-order provenance
- Cross-source dedupe against existing ThinkorSwim/Schwab CSV imports
- Incremental updates to existing open trades
- Import summary and journal handoff

### Not V1

- Order placement or account mutations
- A second `ACCT_ACTIVITY` streaming connection
- Options, futures, forex, or crypto
- Automatic background polling
- Historical data older than Schwab exposes through the API
- Replacing statement-level balance/P&L reconciliation
- Multi-user hosted credential storage

## Open-Source Distribution Model

Use a bring-your-own-credentials model.

Every person who installs the open-source Journal and wants Schwab import:

1. Creates and receives approval for their own Schwab Developer configuration.
2. Configures the callback URL required by the Journal authorization helper.
3. Adds their own app key and secret to their local, gitignored Journal
   environment.
4. Runs the Journal authorization command and completes Schwab consent.
5. Stores the resulting refresh token only on their machine.
6. Uses the Journal connection check to load their authorized accounts.

The repository provides:

- a setup guide verified against the current Schwab Developer portal
- `.env.example` placeholders with no real credentials
- a local authorization command
- connection diagnostics and reauthorization instructions
- server-only secret handling
- synthetic test fixtures

The repository never provides:

- the maintainer's Schwab app key, secret, refresh token, or account hash
- a shared OAuth application operated by the maintainer
- a hosted token broker
- a dependency on Stock Info or any other personal repository
- committed real Schwab responses or account data

Add a dedicated setup document before release:

```text
docs/setup/SCHWAB_SETUP.md
```

It should cover developer registration, the current API product selection,
callback configuration, environment variables, authorization, connection
verification, token expiration/recovery, and complete removal of local
credentials. Validate the instructions against the live Schwab portal before
publishing because portal labels and approval steps may change.

## System Boundaries

Keep the three products independent:

| Product | Owns | Does not own |
| --- | --- | --- |
| Stock Info | News, catalysts, and stock information | Trade history, journal imports, or a live execution tape |
| Trading Journal | Its own Schwab REST auth, historical execution import, review, notes, and coaching | Live execution streaming or Stock Info runtime/configuration |
| Terminal execution tape | Optional real-time execution display and its own runtime/auth | News research or journal persistence |

The Trading Journal must not:

- import code from the Stock Info repository at runtime
- read Stock Info's `.env` or token files
- call a Stock Info HTTP service
- require Stock Info to be running
- share a Schwab client singleton or refresh token with Stock Info

Removing the experimental execution tape from Stock Info is a separate cleanup
task in that repository. It is not a prerequisite for Journal import work.

## What We Can Migrate From Stock Info

The Stock Info app already proves the authentication path:

- `services/execution-tape/auth.cjs`
  - environment validation
  - `TradingApiClient` singleton
  - access-token refresh through `schwab-client-js`
  - `accountsNumbers()` preflight
  - expired/unauthorized error classification
- `services/execution-tape/reauthorize.cjs`
  - authorization-helper discovery
  - refresh-token replacement checks
  - clear recovery errors
- The callback-listener and authorization-helper approach
- Knowledge of the working `schwab-client-js` surface

Port the behavior into typed, server-only journal modules. This is a migration
of implementation knowledge, not credentials or runtime state. Do not import
files across repositories at runtime.

### What Must Not Be Copied As-Is

`services/execution-tape/broker.cjs` is designed to seed current open orders. It
intentionally skips terminal statuses, including `FILLED`, and therefore cannot
normalize journal history.

`services/execution-tape/stream.cjs` owns live account activity for the
experimental tape. The Journal never needs this code because explicit
date-range imports use REST.

## Auth Ownership Decision

Trading Journal owns its Schwab authentication completely.

Recommended approach:

1. Give every Trading Journal installation its own Schwab Developer
   configuration, client credentials, callback URL, and OAuth authorization
   grant.
2. Store Journal credentials only in the Journal's private local environment
   or a Journal-specific secret store.
3. Keep that storage gitignored and restricted to the current OS user.
4. Make the Journal authorization helper update only the Journal token.
5. Recreate the Journal's cached Schwab client after reauthorization so it
   cannot retain a stale token in memory.
6. Leave Stock Info and the terminal tape credentials untouched.

For the local MVP, the Journal's gitignored `.env` is sufficient. macOS Keychain is a stronger
later Journal-specific storage option.

If Schwab account rules make a separate Journal app registration impossible,
stop and reevaluate the boundary. Do not silently fall back to reading Stock
Info credentials.

For the maintainer's one-time local bootstrap only,
`npm run schwab:migrate -- --from /path/to/existing.env` may copy the named
Schwab values into the Journal's `.env`. After that copy, the Journal owns and
reads its local values; it never reads the source app at runtime. A clean
open-source installation follows `docs/setup/SCHWAB_SETUP.md` and does not use
the migration command.

### Secret Boundary

The browser may receive:

- connection status
- masked account label
- account type when supplied
- an opaque selection value

The browser must never receive or log:

- app secret
- refresh/access token
- raw Journal credential-store contents
- full account number
- unmasked Schwab payloads

Every selected account must be checked server-side against a fresh authorized
account list. Do not trust an account hash submitted by the browser merely
because it came from a `<select>`.

## Proposed Journal Modules

```text
src/lib/schwab/
  credentials.ts       server-only credential loading and validation
  client.ts            TradingApiClient lifecycle and auth error mapping
  accounts.ts          authorized accounts and masked display labels
  history.ts           bounded order/transaction requests
  normalize.ts         Schwab payload → canonical executions
  preview.ts           duplicate/reconciliation diagnostics without writes
  types.ts             validated API and UI-safe types

src/app/import/
  schwab-actions.ts     connection, preview, and confirmed-import actions
```

Use explicit runtime validation at the API boundary. Schwab/library responses
must begin as `unknown`, not `any`.

## Connection State Contract

```ts
type SchwabConnectionState =
  | { status: "connected"; accounts: SchwabAccountOption[] }
  | { status: "missing_credentials"; recovery: string }
  | { status: "reauth_required"; recovery: string }
  | { status: "unavailable"; error: string };

type SchwabAccountOption = {
  value: string;       // opaque server-verifiable selection value
  label: string;       // e.g. "Individual ••••1234"
  accountType: string | null;
};
```

The Import modal loads connection state only when the Schwab tab is opened.
File import must remain usable when Schwab is disconnected.

When credentials are missing, the UI links to `docs/setup/SCHWAB_SETUP.md` (or
its rendered in-app equivalent) and does not present the state as an application
failure.

## Authorization UX

### First implementation

- Reuse the proven local authorization helper.
- Add `npm run schwab:authorize`.
- The disconnected UI explains the recovery command.
- After authorization, re-run connection preflight and populate accounts.

### Follow-up

Replace the terminal recovery step with an in-app `Connect Schwab` flow:

1. Start the short-lived local HTTPS callback listener.
2. Open the Schwab authorization URL.
3. Exchange the callback code server-side.
4. Update the Journal-owned credential store.
5. Refresh connection state and account options.

Do not block direct import on the polished in-app OAuth flow.

## Read-Only History Probe

Before defining the final adapter, capture a sanitized one-day response from the
authorized account and answer:

- Where are individual execution quantity, price, and timestamp represented?
- Are partial fills separate execution legs?
- Which field is the stable order identifier?
- Is a stable execution identifier available?
- How are canceled orders with partial fills represented?
- Does the order leg reliably distinguish buy, sell, sell-short, and buy-to-cover?
- Which transaction fields contain commission and miscellaneous fees?
- Are child/bracket orders nested?
- How are ThinkorSwim- and DAS-originated orders labeled?
- What maximum date range and result limit does the live API enforce?

Store only a synthetic or aggressively sanitized fixture in tests. Do not
commit raw account responses.

## Source-of-Truth Decision

Candidate V1 strategy:

```text
order history
→ execution legs are fill source of truth

TRADE transactions
→ fee and reconciliation support

account details / positions
→ validation context only
```

The one-day probe must confirm this before persistence is implemented.

## Date Requests

- Interpret the user's selected dates in `America/New_York`.
- Convert ET day boundaries to the ISO timestamps expected by Schwab.
- Reject missing dates, `from > to`, and future dates before calling Schwab.
- Initially enforce the current expected 60-day history boundary, but make the
  limit a named constant confirmed by the live API probe.
- Chunk requests into small intervals so a high-volume account does not silently
  hit the order result cap.
- Merge chunks by stable broker identity before normalization.

## Canonical Execution Mapping

The Schwab adapter should emit the same execution shape used by file imports:

```ts
type ParsedExecution = {
  symbol: string;
  brokerSymbol?: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: number;
  posEffect: string | null;
  fees: number;
  brokerOrderKey: string | null;
  sourceRowHash: string;
};
```

Rules:

- Persist each partial fill separately.
- Hash the broker order ID before assigning `brokerOrderKey`.
- Normalize timestamps to epoch seconds consistently with CSV imports.
- Use the same canonical fill fingerprint as the CSV adapter so an API sync can
  dedupe fills previously imported from a statement.
- Preserve distinct same-second fills with deterministic occurrence indexing.
- Do not infer a price for an order or execution whose fill price is missing.
- Exclude non-equity assets with an explicit diagnostic, not silently.

## Dedupe and Provenance

Two identities are useful:

1. Canonical fill fingerprint: symbol, execution time, side, quantity, price,
   position effect, and deterministic occurrence. This supports cross-source
   dedupe against CSV imports.
2. Hashed broker execution identity: account plus broker order/execution
   identity. This protects repeated API syncs from payload-order changes.

The existing `sourceRowHash` can remain the canonical fingerprint. Consider a
small schema migration adding nullable `brokerExecutionKey` with a unique
account-scoped index. Never persist the raw Schwab identifier.

Add `schwab_api` to normalized/import-summary source unions and import-batch
provenance.

## Incremental Trade Reconciliation

This is the most important difference from bulk-file import.

The current persistence path creates a normalized trade only when every
execution in that trade is new. That is safe for a self-contained statement but
is insufficient for direct incremental sync.

Example:

```text
Monday sync imports an opening buy
Tuesday sync imports the closing sell
```

Tuesday must close Monday's existing open trade in place. It must not create a
new short trade, duplicate the original trade, or replace notes attached to the
Monday trade.

Required behavior:

1. Insert only new immutable executions.
2. Determine affected account/symbol ranges.
3. Load relevant existing open trades and their executions.
4. Apply new fills in chronological order.
5. Update existing trade rows in place when a fill adds to or closes them.
6. Create new trade rows only when no compatible open trade exists.
7. Preserve trade IDs so journal entries, tags, and attachments remain linked.
8. Treat late/out-of-order fills as a reconciliation case with diagnostics.
9. Run the entire confirmed import in one database transaction.

Do not implement direct sync by passing an isolated API batch directly to the
current `importNormalized` function.

## Preview Contract

Preview performs all network parsing and duplicate checks without writing:

```ts
type SchwabImportPreview = {
  accountLabel: string;
  from: string;
  to: string;
  ordersRead: number;
  executionsFound: number;
  newExecutions: number;
  duplicateExecutions: number;
  estimatedNewTrades: number;
  existingTradesAffected: number;
  symbols: number;
  excludedAssets: number;
  warnings: string[];
  previewToken: string;
};
```

The confirmation action must not trust counts sent back by the browser. Either
rerun the bounded read or validate a short-lived server-side preview token.

## UI States

The existing two-tab modal should support:

- checking connection
- missing credentials
- reauthorization required
- accounts loaded
- account selected
- valid/invalid date range
- fetching preview
- no orders in range
- fills found but all duplicates
- preview with warnings
- confirmed import in progress
- partial upstream failure before any write
- completed import
- completed import with warnings

The file tab remains independently functional in every Schwab error state.

After success:

- show new executions, duplicates, trades created/updated, and warnings
- open the latest affected journal day
- never imply notes were generated merely because trades were imported

## Edge-Case Matrix

### Authentication and accounts

- credential file missing or unreadable
- app key/secret missing
- refresh token expired or invalid
- authorization completes without replacing the token
- cached client survives a token replacement
- selected account is no longer authorized
- multiple authorized Schwab accounts share the same account type
- concurrent Journal requests refresh the access token safely
- Journal configuration accidentally points at another application's secrets

### History payload

- no orders in range
- fully filled order
- multiple partial fills at different prices/times
- canceled order with a partial fill
- replaced order and child order strategies
- two intentional orders filled at the same second
- more results than one request can safely return
- missing price, timestamp, symbol, or quantity
- unsupported asset mixed with equities
- API timeout, rate limit, or partial chunk failure

### Trade reconstruction

- long and short round trips
- sell-short/buy-to-cover
- scale-in and scale-out
- position flips through zero
- open trade at the end of the selected range
- close fill whose opening fill was imported earlier
- fill whose opening fill predates all journal data
- out-of-order or corrected fill
- API sync overlaps a prior API sync
- API sync overlaps a ThinkorSwim CSV import
- fees arrive from a separate transaction record
- existing trade has notes, tags, attachments, or coach review

## Testing

### Unit

- auth error classification
- account masking and server-side account validation
- ET date-boundary conversion, including DST
- order tree traversal
- partial-fill normalization
- side and position-effect mapping
- fee reconciliation
- canonical and broker-identity hashing
- unsupported/malformed payload diagnostics

### Database integration

- repeated sync inserts zero duplicates
- API-after-CSV cross-source dedupe
- close fill updates an existing open trade in place
- notes/tags/attachments keep the same trade ID
- partial failure rolls back the entire confirmed import
- import batch records `schwab_api` provenance and accurate counts

### UI/browser

- both import tabs remain reachable
- disconnected and reauth states are actionable
- accounts are masked
- date presets and validation work on desktop/mobile
- preview does not mutate data
- confirm/import disables duplicate submission
- empty, duplicate-only, warning, error, and success states render correctly
- no relevant console errors or framework overlay

## Delivery Phases

### Phase 0 — Live read-only probe (complete)

- Confirm the authorized API payload with one trading day.
- Produce sanitized fixtures and document field mappings.
- Confirm live history/rate/result constraints.

Exit: execution and fee sources are evidence-backed.

### Phase 1 — Journal-owned auth and account discovery (complete)

- Add the approved Schwab client dependency to the journal.
- Create Journal-specific Schwab credentials and callback configuration.
- Add the open-source setup guide and safe environment placeholders.
- Port typed client/preflight/error logic.
- Add the journal authorization command.
- Wire connection status and masked accounts into the existing modal.

Exit: the journal can prove it is connected and list accounts without reading
trade history.

### Phase 2 — Preview adapter (complete)

- Fetch bounded history for the selected account/dates.
- Normalize executions in memory.
- Query existing fingerprints.
- Return preview counts, affected trades, exclusions, and warnings.

Exit: a previous-week live preview is accurate and performs no writes. The
implementation was validated by comparing execution, trade, and import-batch
row counts before and after the preview.

### Phase 3 — Incremental persistence (complete)

- Add broker-execution and canonical provenance.
- Insert immutable executions idempotently.
- Reconcile affected open trades in place.
- Preserve existing notes, tags, attachments, and trade metadata.
- Record the import batch and summary atomically.
- Fill complete historical gaps without changing existing closed trades.
- Skip incomplete historical positions for explicit review without blocking
  safe trades elsewhere in the range.
- Fail closed on position flips, ambiguous open trades, or concurrent insert
  conflicts.

Exit: repeated and overlapping imports are covered by database integration
tests, and failures roll back without partial rows.

### Phase 4 — Complete product flow (complete)

- Enable a separate explicit confirm/import action after preview.
- Add all empty/error/success states.
- Revalidate journal, trades, calendar, analytics, and dashboard.
- Hand off to the latest affected journal day.

Exit: the live Friday test appended a single `schwab_api` batch, assigned every
new execution to a trade, and left existing database rows intact.

### Phase 5 — Hardening

- Add in-app OAuth if desired.
- Add rate-limit/backoff diagnostics.
- Add optional remembered Schwab-account ↔ journal-account mapping.
- Consider moving Journal secrets from `.env.local` to macOS Keychain.

### Separate Stock Info cleanup

- Confirm the standalone terminal execution tape covers the desired live view.
- Remove Orders & Fills UI, service startup, Schwab dependency, auth commands,
  tests, and documentation from Stock Info.
- Verify Stock Info still serves news and stock information without any Schwab
  trading runtime.

This cleanup should be planned and verified in the Stock Info repository. It
does not block Journal REST import development.

## Verification Commands

Use the project policy:

```bash
npm run verify:full
npm run test
```

Also run targeted Schwab adapter and persistence tests during development. Do
not use real account payloads as committed fixtures.

## Definition of Done

- Journal owns its Schwab app credentials and authorization grant.
- Journal does not read or depend on Stock Info configuration or runtime.
- A clean open-source install can follow documented steps using the installer's
  own Schwab Developer credentials.
- No maintainer credential or real account payload is present in the repository.
- Journal displays connected/reauth/missing states without exposing secrets.
- Authorized accounts are masked and validated server-side.
- A selected API date range can be previewed before writing.
- Equity partial fills retain fill-level provenance.
- Repeated API sync and API-after-CSV imports do not duplicate executions.
- Incremental fills update existing open trades without changing their IDs.
- Existing notes, tags, attachments, and coach data remain linked.
- Import failures do not leave partial database writes.
- File import still works when Schwab is disconnected.
- Full verification passes, with any unrelated failure documented.

## Immediate Next Task

Before optional repair/re-import work, close the P0 correctness gaps documented
in [`TRADE_IMPORT_BEHAVIOR.md`](TRADE_IMPORT_BEHAVIOR.md):

1. reject/quarantine every close-first fill, including forward imports;
2. move file imports onto the incremental reconciliation engine;
3. cover long-lived orders whose entry predates the current order lookback;
4. enforce post-import position and execution-assignment invariants; and
5. project multi-day trade activity and realized P&L onto each affected Journal
   day.

After those guarantees are covered by integration tests, Phase 5 can focus on
optional explicit repair/re-import workflows and remembered account mapping.
Normal direct sync remains append-only and never overwrites an existing closed
trade or its notes.
