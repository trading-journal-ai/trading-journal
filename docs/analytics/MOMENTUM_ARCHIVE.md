# Momentum Archive

> Status: Foundation in progress · Owner: Trading Journal AI · Rule contract: `core-common-stock-v1`

Momentum Archive is a private historical-research surface for studying common-stock momentum days and, later, comparing that opportunity set with Journal trades. Trading Journal owns the archive lifecycle, domain rules, queries, UI, and candidate candle cache.

## Data ownership and location

Market Archive data is private application data, not repository content. The default macOS location is:

```text
~/Library/Application Support/Trading Journal AI/market-archive/
├── market-history.sqlite
├── manifest.json
├── candles.sqlite              # planned candidate-only chart cache
└── raw/minute-aggs/            # verified rebuildable source
```

`market-history.sqlite` remains separate from the writable Journal database. The application opens it with SQLite read-only mode, `query_only`, DELETE journaling, and filesystem read-only permissions. This prevents archive research from mutating operational Journal data or the historical snapshot.

Two optional local overrides exist for development and recovery:

- `MARKET_ARCHIVE_HOME` relocates the complete archive directory.
- `MARKET_ARCHIVE_DB_PATH` points to an exact legacy database file and takes precedence for that file.

Do not commit either a private absolute path or archive data. `data/market-archive/` is gitignored as a local-development fallback.

## Safe database migration

Create a consistent Journal-owned SQLite snapshot from an existing archive:

```bash
npm run market-archive:migrate -- --source <path-to-market-history.sqlite>
```

The migration:

1. requires an explicit source and refuses to overwrite an existing destination;
2. uses SQLite's online backup API rather than copying an active WAL database blindly;
3. runs integrity, foreign-key, schema, coverage, and record-count checks;
4. records a SHA-256 checksum and verification evidence in `manifest.json`;
5. converts the destination to a sidecar-free DELETE-journal snapshot; and
6. makes the destination database filesystem read-only.

Verify an existing Journal-owned archive without replacing it:

```bash
npm run market-archive:verify
```

Pass `--quick` to use SQLite's quick check during routine diagnostics. Add `--verify-raw` to checksum every preserved minute file. Pass `--write-manifest` only when the local manifest should be refreshed after a deliberate archive or raw-source replacement.

The migration never deletes its source. Retiring an older copy is a separate, explicitly authorized cleanup after the Journal-owned snapshot and raw-file relocation are proven.

## Core common-stock universe

The first versioned research universe is `core-common-stock-v1`:

- point-in-time Massive instrument type is `CS`;
- known split execution dates are excluded;
- previous regular-session close is at least $1;
- the previous-close observation is one to seven calendar days old; and
- the maximum eligible 04:00–20:00 ET high is at least 50% above that close.

ETF, ADR certificate, warrant, right, unit, and other non-common structures remain in raw evidence but do not enter Core. An ETF Journal trade should be labeled **Outside Momentum Archive Core · ETF**, not treated as missing data.

The adapter returns explicit exclusion reasons. It does not delete unusual observations or impose a maximum percentage gain. A future high-confirmation pass will flag isolated prints, weak transaction support, and corporate-action risk using the preserved minute bars.

Full-day dollar volume and completed-session RVOL are retrospective evidence. They may filter historical research but must never be presented as information known at entry.

## Initial product contract

Momentum Archive will live under Analytics with two views:

- **Day:** date navigation and a compact common-stock mover ledger.
- **Archive:** date range, symbol search, versioned universe selection, deeper sorting, and export.

Both views use **All · Premarket · Regular · After-hours** as a session lens. The active lens replaces the session-specific columns rather than displaying three extremely wide column groups.

Clicking a mover row expands an inline panel beneath it, pushing later rows down. The interaction should extract the existing Journal inline-disclosure behavior and reuse `LightweightTradeChart`; it should not reuse trade-note and execution-review content. Only one row remains expanded, and minute candles load lazily.

Journal execution overlays, entry-time comparisons, and retrospective trade outcomes follow after the archive browser and candidate candle path are trustworthy.

## Evidence boundary

The aggregate database contains daily and completed-session summaries, not minute candles. It cannot reconstruct entry-time RVOL or charts by itself. The raw compressed minute files remain the rebuildable source of truth until the candidate-only candle cache is complete and verified.

The archive and any derived chart remain private unless the market-data license is independently confirmed to permit another deployment or redistribution model.
