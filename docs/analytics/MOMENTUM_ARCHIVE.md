# Momentum Archive

> Status: Browser implemented · Owner: Trading Journal AI · Rule contract: `core-common-stock-v1`
>
> ⚠ **The current archive contains phantom movers.** A preferred-share ticker
> collision in the ingest inflates 7% of Core movers and 43% of everything above
> +400%. Diagnosed, not fixed — see
> [Known defect](#known-defect-preferred-share-ticker-collision) before trusting
> the largest gainers.

Momentum Archive is a private historical-research surface for studying common-stock momentum days and, later, comparing that opportunity set with Journal trades. Trading Journal owns the archive lifecycle, domain rules, queries, UI, and candidate candle cache.

## Data ownership and location

Market Archive data is private application data, not repository content. The default macOS location is:

```text
~/Library/Application Support/Trading Journal AI/market-archive/
├── market-history.sqlite
├── manifest.json
├── candles.sqlite              # writable candidate-only chart cache
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

Momentum Archive lives under Analytics with two views:

- **Day by day:** session navigation and a top-gainers ledger for one date.
- **Full archive:** date range, symbol search, universe selection, filters, sorting, pagination, and export.

### Session is a filter, not a display lens

**All · Premarket · Regular · After-hours** selects *which movers appear*, by the
session that held the day's high. It never changes what a column means.

This replaces the original lens behavior, which swapped the headline gain for the
active session's slice. Under that design a qualifying mover could render as
`+6.3%` in a list titled top gainers — FVN on 2026-08-12 ran +52.1% premarket and
gave it all back by the open, and the ledger showed the give-back. Gain is now
always the qualifying peak.

The three filters partition the Core set exactly, with no row counted twice or
lost: premarket 2,088 + regular 2,322 + after-hours 1,359 = 5,769. Ties resolve
premarket → regular → afterHours in both the SQL predicate and the JavaScript
classifier, and a test asserts the two agree.

Every measure — high, RVOL, dollar volume, volume — is all-session regardless of
the filter.

### Day by day columns

`Symbol · Company · Prior close · High of day · Gain · PM · Cont. · AH · RVOL · $ volume`

**Gain** is the qualifying peak, tagged with the session that made it (`+490% RTH`).
There is no separate per-session gain column, because gain *is*
`max(premarket, regular, afterHours)` — a total and its components cannot share a
table without one restating the other on every row.

**PM · Cont. · AH** are legs of the day's path, each measured from where the
previous one ended, which is what keeps them independent of Gain:

| Leg | Measured from | Answers |
| --- | --- | --- |
| PM | prior close → premarket high | Did it move premarket? |
| Cont. | premarket high → regular high (prior close when there is no premarket) | Did it continue, or die at the open? |
| AH | regular close → after-hours high | Did it pop after the bell? |

A negative `Cont.` means the regular session never took out the premarket high.

Day by day is always the Core universe. **Show more** appends near-misses in the
30–50% band beneath a labeled rule, in muted styling; the tier is kept disjoint
from the qualified set by `qualifies_mover = 0`, so no row can appear twice.

Day navigation is **Latest · Previous day · Next day · session select**, matching
the day-nav order `DESIGN_SYSTEM.md` specifies for the Journal. Left and right
arrows step sessions unless focus is in a control. `Latest` is named for what it
does: archive coverage trails the calendar, so a "Today" control would land on a
day that is not today.

### Full archive

`Date · Symbol · Company · Prior close · High · Gain · High at · RVOL · $ volume · Volume`

Sortable column headers, a grouped sticky header, pinned Date and Symbol columns,
pagination with a page-size control, Symbol/company search, From/To, Min peak %,
Min RVOL, a **Universe** filter carrying Core and Raw evidence, and CSV export of
every field for the current filter.

Stat-strip aggregates are computed over the whole filtered set rather than the
current page, so they keep describing the archive once pagination is in play.

Clicking a mover row expands an inline panel beneath it, pushing later rows down. The interaction extracts the existing Journal inline-disclosure behavior and reuses `LightweightTradeChart`; it does not reuse trade-note and execution-review content. Only one row remains expanded, and minute candles load lazily.

The first chart request for a symbol/day streams its ticker-grouped Massive flat file, stops after the requested ticker block, keeps the 04:00–20:00 ET rows, and writes only that candidate to `candles.sqlite`. The request is refused unless the symbol/day is a qualifying raw archive mover. Cache metadata includes the source size and modification time so a deliberate raw-file replacement refreshes derived candles. Cached opens do not rescan the compressed source.

Journal execution overlays, entry-time comparisons, and retrospective trade outcomes follow after the archive browser and candidate candle path are trustworthy.

## Known defect: preferred-share ticker collision

> Status: **diagnosed, not fixed.** Root cause confirmed. The archive currently in
> use contains phantom movers. Do not treat the largest gainers as trustworthy
> until this is rebuilt.

### Symptom

Tutor Perini (`TPC`) appears as a 400–500% mover on most sessions. Its stored
regular-session low sits at ~$17–20 for twenty consecutive months while its open
climbs from $23 to $100. When the phantom value lands on the close, it becomes the
next session's `previous_regular_close` and manufactures a qualifying move:
`96.40 / 16.80 − 1 = +473.8%`.

### Root cause

Polygon/Nasdaq flat files mark preferred shares with a lowercase `p` — `TpC` is
AT&T preferred series C, `BCpC` is BC preferred series C. The ingest upper-cases
the ticker while parsing, folding those into their common-stock namesakes:

`trading-server` → `services/market-archive/session-summary.cjs:82`

```js
symbol: String(values[columns.ticker] || "").trim().toUpperCase(),
```

The validation regex on line 91 (`^[A-Z0-9][A-Z0-9./-]{0,31}$`) accepts only
upper-case, so removing the fold alone would silently *drop* preferred tickers
instead of separating them. Both need to change together.

**The raw source is clean.** TPC's minute bars for 2026-08-18 are all between
$91.67 and $96.40; no value near $16.73 exists in the file. Recomputing that
session from raw gives `O 95.18 · H 95.72 · L 91.67 · C 91.71` — open, high and
close match the archive exactly and only `low` is wrong. `BCpC`'s raw low that day
is `23.700000`, which is precisely the low stored against `BCPC`.

### Blast radius

| | |
| --- | --- |
| Phantom Core movers | 377 of 5,769 (7%) |
| Movers ≥ +400% that are phantom | 112 of 258 (43%) |
| Symbols responsible | TPC (264 days), BCPC (90), HYTR, plus ~22 single-day cases |

Colliding pairs are stable across the archive: `TPC/TpC`, `BCPC/BCpC`, and
`HYTR/HYTr`. Five of 410 raw files sampled; a full scan is outstanding.

Not every extreme mover is phantom. INHD's +6,191.5% on 2026-06-08 is real —
$1.06 → $43.37 during regular hours on 269M shares, with premarket opening where
the prior session closed. The detector distinguishes the two correctly.

### Path forward

Fix the ingest and rebuild. **Do not add a Core exclusion rule for this.** A
filter would permanently discard real data to work around a defect in our own
pipeline, and would bake a heuristic threshold into a versioned research contract
to do it. Filtering is the answer when the vendor data is bad; it is not.

1. Scan all 410 raw files for case collisions to fix the affected set exactly.
2. Preserve ticker case in `session-summary.cjs` and widen the validation regex to
   accept the lowercase preferred marker.
3. Rebuild `market-history.sqlite` from `raw/minute-aggs/`.
4. Re-run the detector — a session whose close is below half its own open — and
   expect zero hits; spot-check TPC, BCPC and HYTR against raw.
5. Add a semantic check to `verify-market-archive.mjs`. Today's integrity,
   foreign-key and SHA-256 checks all pass on the corrupted database, because it
   is structurally valid and only semantically wrong.

`src/lib/marketArchive/candles.ts:138` upper-cases the ticker the same way when
streaming raw bars for charts. Charts are currently correct only by luck: the file
is ASCII-sorted, `TPC` (`P` = 80) precedes `TpC` (`p` = 112), and the reader exits
after the first matching block. Requesting `TpC` today returns Tutor Perini's bars.

## Evidence boundary

The aggregate database contains daily and completed-session summaries, not minute candles. It cannot reconstruct entry-time RVOL by itself. The raw compressed minute files remain the rebuildable source of truth; `candles.sqlite` is a disposable, candidate-only chart cache.

The archive and any derived chart remain private unless the market-data license is independently confirmed to permit another deployment or redistribution model.
