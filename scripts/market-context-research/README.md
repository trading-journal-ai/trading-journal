# Market Context research pilot

Offline research tools for the [master plan](../../docs/analytics/MARKET_CONTEXT_MASTER_PLAN.md).
The Server remains the only market-data owner. These tools read its local
evidence and write bounded private research outputs. They do not run on Journal
page load, call providers, fill missing data or produce a market-temperature score.

## Responsibilities and sequence

The lead agent owns definitions, integration and interpretation. Sol agents can
independently implement extraction/features and review methodology. Passing tests
establishes arithmetic and boundary behavior; it does not establish that a feature
measures a useful trading opportunity.

1. Audit installed sources and actual coverage, preserving separate bulk-history
   and selected-recovery populations.
2. Freeze an explicit feasibility sample and benchmark local extraction and raw
   feature computation. Include partial-coverage examples, not only clean ones.
3. Build a chart-review packet. Justin labels usable/choppy/unclear windows and
   Cold/Selective/Hot session blocks before seeing proposed scores or DTS values.
4. Calibrate a small set of measures on earlier dates; freeze it and evaluate on
   later dates. Keep windows from a session together. Compare with mover-count
   baselines; review false-hot cases and sensitivity to extreme symbols.
5. Adopt the reviewed model in Server-owned post-close derivation, then consume
   small summaries in Journal. Do not port the research snapshot into Journal's DB.

## Running a bounded pass

Use Python 3.9+ (standard library only) and Node 22+. No dependency installation.
Provide explicit dates, with a maximum of 20 per extraction. Use a fresh private
output directory under `data/evals/` (gitignored); never commit real observations.
Replace placeholders with local paths and dates:

```sh
python3 scripts/market-context-research/export_snapshot.py \
  --database '<server-market-database>' \
  --raw-directory '<server-raw-minute-directory>' \
  --dates '<YYYY-MM-DD>,<YYYY-MM-DD>' \
  --out 'data/evals/<pilot>/snapshot.json'

node scripts/market-context-research/run-pilot.mjs \
  --input 'data/evals/<pilot>/snapshot.json' \
  --server-root '<server-checkout>' \
  --out 'data/evals/<pilot>/run-1'

node scripts/market-context-research/build-review.mjs \
  --input 'data/evals/<pilot>/snapshot.json' \
  --windows 'data/evals/<pilot>/run-1/windows.jsonl' \
  --chart-library 'node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js' \
  --out 'data/evals/<pilot>/review.html'

node --test scripts/market-context-research/*.test.mjs
python3 -m unittest discover -s scripts/market-context-research -p 'test_*.py'
```

Read-only SQLite extraction retains active publication IDs and source coverage.
For bulk dates, the exporter scans each compressed day once for all selected
symbols. It never treats the on-demand candle cache as a complete universe.
Source Core policy and trading-calendar modules are loaded from the explicit
Server checkout; their hashes accompany the output. Verify that checkout against
the installed build before interpreting results.

`snapshot.json` is a frozen, bounded research input. `candidates.json` records
current Core eligibility and original session metrics. `windows.jsonl` contains
raw rolling observations; `summary.json` records source hashes, per-day/session
counts, missing intervals and measured cost. Repeated runs should have identical
window hashes; benchmark timing and generated timestamps will naturally differ.

`review.html` is a self-contained worksheet using the already installed
Lightweight Charts library. It samples distinct symbol-days across both source
strata and all three sessions, deliberately mixing different movement patterns
and price cohorts. This is a diagnostic selection, not a representative training
sample. Five studied candles are colored; surrounding same-session context is
gray. Initial labels are blank. Form choices survive case navigation within the
tab; download labels before closing. Source hashes and selection metadata travel
with the JSON export. Open details after labeling to reduce feature-driven bias.

These CLI tools are research scaffolding. They are not an application API or a
production schema contract. Missing files/dates and malformed timestamp ordering
fail visibly. Output paths are new files/directories, never an in-place overwrite.

## Measurement contract

- **Population:** validated final-day Core candidates, including ADR common
  shares and positive sub-dollar prior closes under Server policy. Source legacy
  qualification flags do not override the current policy.
- **Mode:** `retrospective-final-day-candidates`. Earlier bars of an eventual
  winner can be studied descriptively; they do not establish that the stock could
  have been selected at that time. No as-of classifier is implemented here.
- **Time:** source timestamps become minute-start epoch milliseconds. Windows
  slide by one minute. `windowEndTimestamp` is exclusive and equals the last
  minute's start plus 60 seconds. A future as-of consumer must require completed
  bars and eligibility known by the cutoff; filtering features alone is insufficient.
- **Sessions:** Server trading calendar, including early closes. All sessions of
  an eligible candidate are included, regardless of where its daily high occurred.
- **Continuity:** gaps, invalid prices/volume, interruptions and session changes
  break windows. A bar's presence does not prove a halt-free path inside the minute.
- **Range:** highest high minus lowest low, in dollars and as a percentage of the
  first open. Signed progress is final close minus first open. Neither is profit.
- **Body share:** arithmetic mean of `abs(close-open)/(high-low)` over positive-range
  bars, with the observation count. Zero-range bars do not supply a ratio.
- **Efficiency:** the master plan's **prior-close-inclusive** close-path ratio for
  3/5-minute windows. It includes the transition from the immediately preceding
  minute close. A gap into an otherwise flat window can have high efficiency and
  zero signed progress. It is unavailable for one minute, a zero path, or missing
  contiguous preceding close. Other window features remain available.
- **Overlap:** mean adjacent range intersection divided by the smaller positive
  range, with valid-pair count. Reversals count sign changes among nonzero adjacent
  close changes inside the window; flat changes are skipped. These are proxies.
- **Activity:** summed share volume and `sum(volume * (O+H+L+C)/4)` dollar-volume
  proxy. This is not observed dollar turnover, spread, depth or execution quality.
- **Denominators:** overlapping windows are not independent opportunities. Do not
  sum them into a trade count or let longer, denser symbol histories silently
  dominate a market-wide score.

Massive documents that minutes without eligible trades may have no aggregate bar.
A missing interval alone cannot distinguish inactivity, a halt or incomplete
local evidence. We retain that uncertainty and never synthesize candles.
[Provider aggregate definition](https://www.massive.com/docs/rest/stocks/aggregates/custom-bars).

## Current limits and next review

The first source audit supports a raw-feature feasibility pilot. Recent recovery
is selected-candidate evidence, and its `complete` status does not certify
exhaustive extended-hours discovery. A full scanner observation window also does
not make its stock universe exhaustive. Bulk history and recovery are separate
coverage strata; their mover counts are not directly comparable without more work.

The archive's only observed zero-qualifier bulk date is its initial boundary,
where prior-close evidence is missing. It cannot serve as a verified Cold example.
Do not force quiet observed days into Cold or interpret this as every day being Hot.
Poor-quality days with qualifying movers can still be Cold after calibration.

Point-in-time float, exhaustive historical news, RVOL baseline-date completeness,
gap causes and automated DTS-meter capture remain unverified. Optional absent
pillars are unknown, not zero. These gaps do not prevent examining captured charts.

The first annotated chart worksheet is ready for review, followed by a broader,
time-separated development/holdout sample. No arbitrary
weights, Yellow/Green cutoffs, episode count or production integration is approved
by this feasibility run. Evidence must first support their usefulness.

The first verbal review is saved privately as `feedback-verbal-v1.json` next to
the canonical worksheet. Preserve its original remarks and uncertainty: nearby
positive moves are not automatically positive labels for colored windows, and
good candle structure is distinct from price-profile fit. These notes have not
been converted into training labels. The next review needs separate interval,
surrounding-move, structure, price-fit and setup-visibility judgments; see the
master plan's first qualitative review section.
