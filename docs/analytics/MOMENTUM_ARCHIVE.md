# Top Gainers

> Status: Browser implemented · Presentation: Trading Journal · Data/rules: Trading Server · Rule contract: `core-equity-v2`
>
> **Exact-symbol remediation active.** The format-2 archive was activated and
> fully verified on August 25, 2026. The quarantined legacy snapshot contained
> 374 false Core rows and 113 false rows above +400%. The self-contained record is
> [Momentum Archive data-integrity remediation](../product/handoffs/2026-08-momentum-archive-data-integrity/README.md).

**September 10 ownership:** the September 4 migration is installed and verified.
Trading Server owns shared market history, archive derivation, gainer qualification,
close/split/session/episode rules and quality research. Journal owns browsing,
presentation and comparison with its personal trades. The remaining false-positive
investigation and unadopted normalized candidate are a Server task. Start with
`docs/handoffs/momentum-archive-research.md` on maintained Trading Server `main`
(the primary Server checkout may be on a separate WIP branch).

Top Gainers is a private historical-research surface for studying common-stock
momentum days and comparing that opportunity set with Journal trades.

The user-facing name is **Top Gainers** (formerly Momentum Archive). Existing
`/analytics/momentum-archive` URLs and internal identifiers remain unchanged.

## Data ownership and location

For the shared installation, Server's `market-history/store/` is authoritative;
see [Shared Trading Server installation](#shared-trading-server-installation).
The local paths and snapshot commands below apply only to explicit independent
local-provider installations or a verified rollback. They do not describe the
active shared installation and must not recreate retired Journal archives.

### Independent local-provider storage

Market Archive data is private application data, not repository content. The default macOS location is:

```text
~/Library/Application Support/Trading Journal AI/market-archive/
├── market-history.sqlite
├── manifest.json
├── candles.sqlite              # writable chart cache, created lazily after invalidation
└── raw/
    ├── minute-aggs/            # verified rebuildable price/volume source
    └── reference/              # point-in-time ticker catalogs + split evidence
```

`market-history.sqlite` remains separate from the writable Journal database. The application opens it with SQLite read-only mode, `query_only`, DELETE journaling, and filesystem read-only permissions. This prevents archive research from mutating operational Journal data or the historical snapshot.

Runtime health checks also require the `market-archive-exact-symbol-v2`
provenance columns, reconciled exact-symbol counts, valid source and summary
hashes, and zero recorded duplicate minute rows. A structurally valid legacy
archive therefore fails closed instead of silently restoring folded identities.

Two optional local overrides exist for development and recovery:

- `MARKET_ARCHIVE_HOME` relocates the complete archive directory.
- `MARKET_ARCHIVE_DB_PATH` points to an exact legacy database file and takes precedence for that file.

Do not commit either a private absolute path or archive data. `data/market-archive/` is gitignored as a local-development fallback.

## Independent local-provider snapshot migration

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

Pass `--quick` to use SQLite's quick check during routine diagnostics. Add
`--require-exact-identity` to reject a legacy archive without the identity
provenance contract, `--verify-raw` to checksum every preserved minute file,
and `--verify-reference` to inventory point-in-time catalogs and split evidence.
Pass `--write-manifest` only when the local manifest should be refreshed after a
deliberate archive or source replacement.

The migration never deletes its source. Retiring an older copy is a separate, explicitly authorized cleanup after the Journal-owned snapshot and raw-file relocation are proven.

## Core equity universe

The current universe is `core-equity-v2`:

- point-in-time Massive instrument type is `CS` or common-stock ADR `ADRC`;
- known split execution dates are excluded;
- previous regular-session close is finite and strictly positive;
- the previous-close observation is one to seven calendar days old; and
- the maximum eligible 04:00–20:00 ET high is at least 50% above that close.

ETFs, preferred shares/ADRs, warrants, rights, units, and other non-common structures remain in raw evidence but do not enter Core. Common-stock ADRs and sub-dollar prior closes are included. Full archive offers an optional **Min prior close $** filter (`minPreviousClose`), carried into sorting, pagination, summaries and CSV export; main review views use no price floor. An ETF Journal trade should be labeled **Outside Momentum Archive Core · ETF**, not treated as missing data.

The adapter returns explicit exclusion reasons. It does not delete unusual observations or impose a maximum percentage gain. A future high-confirmation pass will flag isolated prints, weak transaction support, and corporate-action risk using the preserved minute bars.

Full-day dollar volume and completed-session RVOL are retrospective evidence. They may filter historical research but must never be presented as information known at entry.

## Initial product contract

Top Gainers lives under Analytics with Day / Week / Month period tabs
and a separate Full archive link beside the page heading:

- **Day:** a top-gainers ledger for one Eastern Time date; defaults to the latest published session.
- **Week:** the selected date's Monday–Friday range, matching Journal.
- **Month:** the full calendar month containing the selected date.
- **Full archive:** date range, symbol search, universe selection, filters, sorting, pagination, and export.

Week and Month reuse the aggregate ledger, with bounds derived from the anchor
date. Day, Week, Month and Custom range use Core with a compact Symbol search;
minimum peak, RVOL and universe selection are available only in Full archive.
Main views ignore advanced URL parameters so hidden filters cannot affect results.
Symbol search retains dates, session and sorting, and applies to both qualified
rows and the optional near-miss tier. Pagination, sorting and CSV export use the same period. Charts
remain on demand; changing periods does not preload minute candles or download
the database. Empty ranges do not establish complete source coverage.

The summary strip uses the active Core date range, peak-session filter, and
Symbol search. Day shows **Number of movers**, largest peak, and median peak;
the one-day count and repeated symbol count are omitted. Week and Month show
days with movers, qualified moves, unique symbols, largest peak, and median
peak. The Day introduction still describes the whole selected session. The
strip uses spacing without dividers between metrics. A single horizontal rule separates the stats
from the date toolbar below.

### Session is a filter, not a display lens

**All · Premarket · Regular · After-hours** selects *which movers appear*, by the
session that held the day's high. It never changes what a column means.

This replaces the original lens behavior, which swapped the headline gain for the
active session's slice. Under that design a qualifying mover could render as
`+6.3%` in a list titled top gainers — FVN on 2026-08-12 ran +52.1% premarket and
gave it all back by the open, and the ledger showed the give-back. Gain is now
always the qualifying peak.

The three filters partition the corrected Core set exactly, with no row counted
twice or lost: premarket 2,051 + regular 2,025 + after-hours 1,319 = 5,395. Ties resolve
premarket → regular → afterHours in both the SQL predicate and the JavaScript
classifier, and a test asserts the two agree.

Every measure — high, RVOL, dollar volume, volume — is all-session regardless of
the filter.

### Day by day columns

`Symbol · News · Prior close · High of day · Gain · PM · Cont. · AH · RVOL · $ volume`

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

The period tabs and **Previous · Next · Calendar** controls sit on the left of
one toolbar; Symbol search sits on the right in Day, Week, Month, and Custom
range. **All · Pre-Market · Regular · After Hours** sits beside the summary
stats above that toolbar. The controls use the page background (white in the
light theme) and wrap on narrow screens. Date navigation follows Journal.
The Today shortcut is omitted. The default Day view opens the newest published
snapshot/candidate-context date from source health, usually the prior trading
session while today's data is pending. This handles weekends, holidays, delayed
collection and published zero-mover sessions without loading all archive dates.
Once today's evidence is published it may become the default. Partial publication
still carries its coverage warning; latest does not imply complete.
Explicit date URLs and historical period anchors remain intact. The Day tab
clamps an anchor newer than the latest publication to that published date; direct
Full archive's Back to day view follows the same rule. Previous/Next move
by weekdays in Day (weekends skipped, exchange holidays retained), seven calendar
days in Week, and one calendar month in Month, clamping shorter months. Calendar
opens Start date and End date fields, initialized from the current period.
Apply range selects both endpoints inclusively and opens a labeled Custom range;
Cancel leaves the current selection unchanged. The range retains session and
other filters, and its bounds persist through filtering, sorting, pagination and
CSV export. In Custom, Previous/Next step by the range's inclusive calendar-day
length. Choosing Day/Week/Month returns to that preset. Navigation resets the
page and expanded-row tiers. Left/right arrows step periods unless a field or
calendar is handling keyboard input. Missing and future dates remain selectable
and disclose unpublished evidence instead of silently jumping to a stored date.
The old full-history session dropdown request is no longer needed.

### Full archive

The heading includes **Back to previous view** when entered from a period view.
It restores the originating dates, range, session/search filters, sorting,
pagination and expanded tiers, even after changing archive filters or refreshing.
The destination is encoded in the URL and restricted to this Archive page's
non-archive views. Direct visits instead offer **Back to day view**.

`Date · Symbol · News · Prior close · High · Gain · High at · RVOL · $ volume · Volume`

Sortable column headers use the app's Geist Sans UI font in sentence case.
The extra Identity / Price path / Day shape / Liquidity label row is omitted.
One sticky column-header row retains continuous 1px rules and section dividers;
all table rules use the same hairline color, without stacked outer borders.
Day’s arrow-key hint shares the row-click hint line and typography. The aggregate
footer aligns the page count with the Date column and places Export filtered CSV
below the pagination controls at the right. The redundant row-count summary is omitted. Pinned Date and Symbol columns, pagination with a page-size control, Symbol/company search, From/To, Min peak %,
Min RVOL, a **Universe** filter carrying Core and Raw evidence, and CSV export of
every field for the current filter.

Stat-strip aggregates are computed over the whole filtered set rather than the
current page, so they keep describing the archive once pagination is in play.

Clicking a mover row expands an inline panel beneath it, pushing later rows down. The interaction extracts the existing Journal inline-disclosure behavior and reuses `LightweightTradeChart`; it does not reuse trade-note and execution-review content. Only one row remains expanded, and minute candles load lazily.

The first chart request for a symbol/day streams its ticker-grouped Massive flat file, stops after the requested ticker block, keeps the 04:00–20:00 ET rows, and writes only that candidate to `candles.sqlite`. The request is refused unless the symbol/day is a qualifying raw archive mover. Cache metadata includes the source size and modification time so a deliberate raw-file replacement refreshes derived candles. Cached opens do not rescan the compressed source.

Journal execution overlays, entry-time comparisons, and retrospective trade outcomes follow after the archive browser and candidate candle path are trustworthy.

## Known defect: preferred-share ticker collision

> Status: **fixed and active as of August 25, 2026.** The installed format-2
> snapshot passes the exact-identity and source-lineage contract. The legacy
> database and invalidated candle cache remain in dated quarantine for rollback.

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
| False Core movers removed | 374 of 5,769 (6.5%) |
| False Core movers ≥ +400% removed | 113 of 258 (43.8%) |
| Core symbols responsible | TPC (284 rows), BCPC (90 rows) |
| Corrected Core total | 5,395 |

The complete 410-file scan found four simultaneous families:
`TPC/TpC`, `BCPC/BCpC`, `HYTR/HYTr`, and `SRVR/SRVr`. It accepted 726,249,889
minute rows with zero invalid, duplicate, out-of-order, or unreconciled rows.
The rebuilt database also preserves non-overlapping `DCOMP/DCOMp` and
`TFINP/TFINp` history transitions.

Not every extreme mover is phantom. INHD's +6,191.5% on 2026-06-08 is real —
$1.06 → $43.37 during regular hours on 269M shares, with premarket opening where
the prior session closed. The detector distinguishes the two correctly.

### Path forward

Fix the ingest and rebuild. **Do not add a Core exclusion rule for this.** A
filter would permanently discard real data to work around a defect in our own
pipeline, and would bake a heuristic threshold into a versioned research contract
to do it. Filtering is the answer when the vendor data is bad; it is not.

1. ~~Scan all 410 raw files for exact case collisions.~~ Complete.
2. ~~Preserve provider case throughout ingestion, joins, splits, and queries.~~ Complete.
3. ~~Rebuild summaries and SQLite from the preserved minute files.~~ Complete.
4. ~~Validate TPC, BCPC, full collision inventory, RVOL state, and mover changes.~~ Complete.
5. ~~Add semantic identity verification and source lineage.~~ Complete; manifest format 2.
6. ~~Atomically activate the staged snapshot, quarantine the legacy database,
   and invalidate the disposable candle cache.~~ Complete August 25, 2026.

The candidate candle path now preserves exact provider casing, resolves exact
matches first, and rejects a folded request when multiple exact instruments
match. Focused fixtures prove that `TPC` and `TpC` load different candle streams.

## Evidence boundary

The aggregate database contains daily and completed-session summaries, not minute candles. It cannot reconstruct entry-time RVOL by itself. The raw compressed minute files remain the rebuildable source of truth; `candles.sqlite` is a disposable, candidate-only chart cache.

The archive and any derived chart remain private unless the market-data license is independently confirmed to permit another deployment or redistribution model.


## Shared Trading Server installation

This installation selects `MARKET_HISTORY_PROVIDER=server` and requests the v1
market-history API at `MARKET_HISTORY_SERVER_URL` (loopback port 8787 by default).
Archive lists, summaries, dates and candles share one Server-owned dataset.
Offline recovery uses Start Server in Trading Monitor; an unavailable Server never
silently selects a stale Journal archive. Personal trades, notes and reviews remain
in Journal's existing database, along with bounded review/chart caches.

Normalized provider-close candidates and the grouped-daily research study are
retained with distinct versions and evidence. This ownership migration preserves
the currently accepted calculations. Research adoption still requires its documented
reader/policy gates. The local adapter remains for explicit independent use or a
verified rollback; it is not the shared installation's active writer.

The cross-app contract and rollback procedure live in Trading Server
`docs/shared-market-history.md`. Its SYSTEM_STATUS ledger distinguishes source,
local main, installed runtime, verification and cleanup states.

### Selected-candidate recovery coverage

Trading Server can add bounded candidate recovery without changing the accepted
`core-equity-v2` query policy. Original v1 publications remain immutable; Server re-evaluates their stored evidence on read. Its health response advertises the recovered
date range, day count and partial-day count under `candidateContext`, and its day
endpoint publishes source coverage and generated/published timestamps for one ET
session. Recovered dates remain in day navigation even when they contain zero
qualifying movers. Before the first publication, health reports unavailable
candidate context with null date bounds and zero counts; Journal keeps market
history available and labels an unpublished requested day explicitly.

Journal labels this evidence as **selected-candidate minute evidence** across
premarket, regular and after-hours. `complete` means the published candidates have
the required minute evidence; it does not claim exhaustive extended-hours discovery
for the whole market. `partial` means candidate or session evidence is missing, so
an empty result must not be read as a verified no-mover session. Mover provenance
remains visible as the historical Massive minute archive or bounded Massive REST
candidate recovery. Full Archive, Raw evidence, Core rules, and personal-trade
storage retain their existing semantics.

Day shows a plain-language coverage summary, followed by expandable answers
about prices checked, missing evidence, what it means for an empty list, and
the latest publication time. A partial state stays visible when the details
are closed. The text follows Trading Server's published state and does not
claim the entire market was searched. Technical source and limitation fields
remain in Trading Server's day endpoint rather than crowding the review UI.
Week and Month use the same plain-language caution about incomplete dates and
link that concern to the individual Day view.

Day review initially shows the top 10 qualified movers. An explicit expansion
reveals the remaining qualified rows returned for the session; it does not change
qualification or discard them from the underlying result.

### Archive reading guide

The footer uses a native, keyboard-accessible **About this archive** disclosure,
collapsed by default. It contains Reading the numbers, Which stocks appear, and
Data sources and coverage. It states current Core exclusions explicitly, including non-common structures and
invalid prior closes, and describes the optional prior-close price filter, and distinguishes stored-but-filtered records from
undiscovered or missing evidence. Session filtering means the time of the day's
high; RVOL displays the highest of the available same-session volume ratios.
The review prompt asks for a symbol, date, session, expected value, and comparison
source. This guide does not change qualification or promise complete discovery.


The v2 policy changes eligibility only. Known splits, invalid/stale prior closes,
50% qualification, session-of-high filtering, and incomplete-discovery warnings
remain. Health and Day metadata distinguish active query policy from the original
source calculation version. This does not adopt normalized-close research.

### Company names and saved news

Company names appear on symbol hover/focus (and focus after tapping); the symbol
still opens the chart. Saved news loads automatically for every displayed row. There is no manual check or refresh action.
Journal reads Trading Server's existing `/api/news-events` archive, without
starting collection or fetching from a provider directly. The lookup covers the
row's ET date and seven preceding calendar days. Later publications are excluded.
Completed lookups display one of three states, without headlines or details:

- Fresh news: at least one saved publication on the row's ET trading date.
- Earlier news: saved publications only within the preceding seven calendar days.
- No news: a successful, uncapped saved-data lookup returned no match.

Every displayed row is checked on mount, with one automatic retry on failure.
A dash indicates loading; an error icon indicates an unsuccessful or capped empty
lookup. These transient/error indicators are not news classifications.

These are publication-timing and availability states, not verified causation.
No news does not establish that no news existed; saved coverage may be
incomplete. A short tooltip explains each status. News does not affect mover
eligibility, sorting or exports; company names remain in the CSV. Broad
collection and historical news backfill are separate work.
