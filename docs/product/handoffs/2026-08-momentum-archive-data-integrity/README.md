# Momentum Archive data-integrity remediation

> Date: 2026-08-25
>
> Status: implementation and staged rebuild complete; atomic cutover pending
>
> Product repository: Trading Journal
>
> Current branch: `codex/momentum-archive`

## Executive call

The Momentum Archive's largest visible error is an identity failure, not a bad
market print and not a table-rendering bug. The archive builder treats Massive
tickers as case-insensitive, merging distinct instruments such as Tutor Perini
common stock (`TPC`) and AT&T Series C preferred (`TpC`). Every calculation made
after that merge can be wrong: prior close, high/low, volume, RVOL, mover
qualification, company metadata, split association, and chart lookup.

The raw compressed minute files and point-in-time reference snapshots preserve
the exact provider symbols and are sufficient for a clean rebuild. Do not patch
displayed percentages, special-case TPC, or add an outlier filter. Preserve exact
identity end to end, rebuild every derived artifact in staging, and cut over only
after semantic validation passes.

Keep float and market-cap enrichment out of this fix. The first objective is to
make the data already in the archive internally trustworthy and useful.

## Staged rebuild result

The bounded remediation is implemented across Trading Server and Trading
Journal, and a fresh staged archive has passed the exact-identity contract. The
active private archive has not been replaced.

| Check | Verified result |
| --- | ---: |
| Trading sessions | 410 |
| Accepted minute rows | 726,249,889 |
| Invalid / duplicate / out-of-order minute rows | 0 / 0 / 0 |
| Accepted exact symbol-days | 4,578,078 |
| Derived exact symbol-days | 4,578,078 |
| Exact-symbol reconciliation failures | 0 |
| Corrected Core movers | 5,395 |
| Legacy Core movers | 5,769 |
| Core rows removed | 374 |

Every removed Core row is attributable to the confirmed simultaneous common
stock collision families: 284 `TPC` rows and 90 `BCPC` rows. No new Core rows
appeared. Raw movers fell from 17,638 to 17,251; the remaining net reduction is
five `HYTR/HYTr` rows and eight `SRVR/SRVr` rows. Other lower-case raw rows are
exact-identity relabels rather than additions or removals.

The full raw scan found four families present simultaneously within a session:
`BCPC/BCpC`, `TPC/TpC`, `HYTR/HYTr`, and `SRVR/SRVr`. The rebuilt database also
preserves the non-overlapping historical transitions `DCOMP/DCOMp` and
`TFINP/TFINp`, yielding six folded families with more than one exact identity
over the full archive.

The split collector was also rebuilt without uppercasing. The refreshed source
preserves `AXIAp`, which the legacy split archive had stored as `AXIAP`.

The staged Journal snapshot is sidecar-free, read-only, and in DELETE journal
mode. Manifest format 2 records the database, all 410 minute sources, 21
point-in-time reference snapshots, split evidence, transform version, exact
symbol reconciliation, reference coverage, and the TPC incident check.

## Confirmed TPC incident

The August 18, 2026 row shown in the UI used Tutor Perini's high with the AT&T
preferred's prior close:

| Field | Corrupt archive | Exact `TPC` result |
| --- | ---: | ---: |
| August 17 regular close | $16.80 | $97.205 |
| August 18 maximum high | $96.40 | $96.40 |
| Peak change | +473.8095% | -0.8281% |
| August 18 regular close | $91.71 | $91.71 |
| Close change | +445.8929% | -5.6530% |

Exact raw streams for August 18 are individually coherent:

| Source symbol | Rows | Price range | Volume | Instrument |
| --- | ---: | ---: | ---: | --- |
| `TPC` | 191 | $91.67–$96.40 | 174,557.1397 | Tutor Perini common stock |
| `TpC` | 180 | $16.73–$16.85 | 201,632.3969 | AT&T Series C preferred |

TPC therefore did not qualify as a 50% mover on August 18. Its apparent selloff
from $96 to $91 was real; the +473.8% comparison was not.

## Root cause

The first lossy transform is currently outside this repository:

```text
trading-server/services/market-archive/session-summary.cjs
```

The parser trims and upper-cases the provider ticker before using it as the
symbol-map key. The validation expression also accepts only uppercase letters,
so removing `.toUpperCase()` without widening validation would silently discard
lowercase provider tickers.

The folded key is reused downstream for session state and joins. On August 18,
the raw file has 11,863 distinct exact symbols while the post-normalization
summary reports 11,861. At minimum, `TPC/TpC` and `BCPC/BCpC` collapse that day.

This makes structurally valid SQLite data semantically false. Integrity checks,
foreign-key checks, and checksums can all pass while two securities have been
combined.

## Known collision evidence

Point-in-time reference snapshots contain these case-insensitive families:

| Folded symbol | Exact provider symbols | Interpretation |
| --- | --- | --- |
| `BCPC` | `BCPC`, `BCpC` | Common stock and senior-note/preferred-style instrument |
| `DCOMP` | `DCOMP`, `DCOMp` | Likely casing/exchange transition for one preferred security |
| `SRVR` | `SRVR`, `SRVr` | ETF and temporary fund rights |
| `TFINP` | `TFINP`, `TFINp` | Likely casing/exchange transition for one preferred security |
| `TPC` | `TPC`, `TpC` | Common stock and AT&T preferred |

The completed raw scan reconciles the earlier detector inventories. The
authoritative staged Core difference is 374 rows: 284 `TPC` and 90 `BCPC`.
`HYTR/HYTr` and `SRVR/SRVr` affect Raw evidence but do not add to that Core
difference. Earlier 377/383 estimates are superseded by the staged old-vs-new
key comparison above.

## Repository boundary

Trading Journal owns the archive lifecycle, rules, queries, UI, verification,
and private application-data location. It currently migrates and verifies a
prebuilt SQLite archive but does not own the raw-minute-to-session-summary
transform where this defect begins.

That boundary must be handled deliberately:

1. **Bounded remediation:** patch the existing Trading Server transform, rebuild
   a staged database from preserved raw data, then migrate and verify the corrected
   snapshot through Trading Journal.
2. **Ownership migration:** port the builder into Trading Journal first, then fix
   and rebuild there.

The first option is smaller and safer for the immediate incident. The second
better matches long-term ownership but materially expands the change. In either
case, product-facing work and acceptance live in the Trading Journal branch.
Changing only Journal queries or presentation cannot repair the merged source
rows.

## Required identity contract

1. Preserve the provider's exact ticker in raw parsing, reference snapshots,
   corporate actions, session state, SQLite keys, and candle lookup.
2. Use an optional folded symbol only for convenience search. Never use it as a
   unique key, join key, deduplication key, or prior-close key.
3. Resolve user-entered symbols exact-first. If a folded search returns multiple
   exact instruments, surface an ambiguity instead of choosing one.
4. Join point-in-time metadata by exact ticker and date. Prefer FIGI or another
   stable provider identity when present, but do not assume every security has
   one.
5. Link genuine casing/ticker transitions only through an explicit provider
   event or reviewed stable-identity mapping.
6. Keep display normalization out of ingestion. Common-stock tickers may render
   uppercase while the persisted source symbol remains exact.

## Implementation sequence

### 1. Lock the regression contract

Add small fixtures and focused tests proving:

- `TPC` and `TpC` parse and aggregate independently;
- metadata and instrument type remain separate;
- prior-close state, RVOL history, and split lookup use exact identity;
- exact TPC on August 18 uses $97.205 as prior close and does not qualify;
- candle lookup cannot return TPC bars for a `TpC` request; and
- a case-folded ambiguous query cannot silently choose an instrument.

### 2. Preserve exact identity end to end

- Remove ingestion-time uppercasing and accept valid lowercase provider markers.
- Replace folded dedupe, state, reference, and split maps with exact keys.
- Preserve exact symbols in the generated summaries and SQLite database.
- Give search its own intentional folded-lookup path.
- Review every adapter that calls a ticker "normalized" so it cannot reintroduce
  case-folding as identity.

Do not migrate the corrupt database in place. It is generated evidence; create a
fresh staged artifact.

### 3. Add semantic quality gates

At minimum, record and reconcile:

- raw distinct exact-symbol count;
- derived distinct exact-symbol count;
- casefold groups containing more than one exact symbol;
- reference coverage per exact symbol/date;
- duplicate `(exact_symbol, minute_timestamp)` rows;
- suspicious cross-session close/open discontinuities; and
- source hashes and transform version.

Extreme percentage moves and high/low ratios are warnings, not automatic
rejections. Real low-float movers can be extreme.

### 4. Rebuild and validate in staging

Rebuild all daily summaries and a new SQLite database from the preserved raw
minute files. Regenerate the report/browser against the staged database. Do not
replace the current private archive until all checks pass.

Validation must include:

- distinct `TPC` and `TpC` histories and metadata;
- August 17 TPC close = $97.205;
- August 18 TPC high = $96.40 and peak change = -0.8281%;
- distinct `BCPC` and `BCpC` price/volume paths;
- zero loss between raw and derived exact-symbol counts;
- recalculated RVOL histories for affected symbols;
- reviewed attribution for large old-vs-new mover-count changes; and
- exact-instrument agreement between table rows and chart requests.

### 5. Cut over atomically

Switch Journal consumers to the verified staged snapshot in one operation.
Retain the old database and report as clearly labeled quarantined evidence until
the replacement has been observed successfully. Never delete the preserved raw
source as part of this fix.

This is the only remaining remediation step. It requires an explicit owner
cutover because it replaces the active private snapshot and invalidates the
disposable candle cache.

## Normalized momentum view after the rebuild

Keep the corrected archive canonical and strategy-neutral. Build a derived,
versioned momentum view for the research workflow instead of deleting raw
evidence.

Initial normalized fields should include:

- `is_initial_qualifier`;
- `is_continuation`;
- `continuation_anchor_date` or `momentum_episode_id`;
- prior close, peak change, close change, volume, dollar volume, and RVOL;
- point-in-time instrument type;
- exclusion reason; and
- corporate-action and data-quality flags.

The initial price band can remain approximately $1–$20. It should apply when a
momentum episode first qualifies, not eject the name after it moves above $20.
Later sessions remain observable with `is_continuation = true`.

The existing Day-table `Cont.` field is different: it measures the intraday
regular-session leg after premarket. Do not reuse that name or calculation for
multi-day continuation. A Boolean should be paired with an anchor so the row can
explain what it continues. Episode duration and reset rules remain an explicit,
versioned product decision.

## Deferred float note

Capture TradingView float prospectively, but do not conflate it with this repair.
When added, persist the raw displayed value with exact symbol, source,
`observed_at`, and confidence. Do not leave it only in a transient cache, treat
shares outstanding as float, or apply a currently observed float retroactively
to historical sessions.

Provisional future research defaults are reasonable starting points rather than
part of the current archive contract:

- core low-float: market cap at or below $500M and float at or below 10M;
- broader small-cap momentum: market cap at or below $2B and float of 10–50M;
- unknown fundamentals remain a visible separate cohort; and
- float turnover is more informative than raw share volume once dated float is
  trustworthy.

## Acceptance criteria

- No provider symbol used as identity is upper-cased during ingestion or joins.
- Exact symbol counts reconcile from raw files through summaries and SQLite.
- Known casefold collisions remain observable but never merge.
- TPC on August 18 is absent from the 50% mover set.
- No row combines price, volume, prior close, metadata, or corporate actions from
  two exact provider tickers.
- A future collision produces an explicit quality signal or query ambiguity.
- The Journal browser and candle route request the same exact instrument.
- Float enrichment and multi-day continuation rules do not delay the identity
  repair.

## Approaches to avoid

- Do not special-case TPC.
- Do not add a generic price-outlier or maximum-gain filter.
- Do not repair only the displayed percentage.
- Do not rebuild from already folded daily summaries.
- Do not use current float or market cap to backfill historical eligibility.
- Do not overwrite the current private archive before staged validation.

## Suggested continuation prompt

> Work in the Trading Journal Momentum Archive worktree. Read
> `docs/product/handoffs/2026-08-momentum-archive-data-integrity/README.md` and
> `docs/analytics/MOMENTUM_ARCHIVE.md`. Implement only the case-sensitive
> identity remediation and staged validation contract. Keep float enrichment and
> multi-day continuation classification deferred. Do not mutate or replace the
> current private archive until the staged rebuild passes acceptance criteria.
