# Market Context Insights prototype — handoff

**As of October 2, 2026 · Publication branch `codex/publish-market-context-insights` ·
Status: paused exploratory snapshot, not merged or deployed.**

A prototype section of Market Context for trying visualizations and teaching the app to
read charts the way Justin does. It started as "what data visualizations should Market
Context have?" and became a labeling tool: the app proposes curls and support/resistance
zones, Justin judges them, and his labels tune a draft chart-reading rule.

## Paused checkpoint — October 2, 2026

Justin paused levels development after reviewing the prototype. The detector proposes
too many levels and reviewing them is expensive even manually. Preserve the current
editor as an experiment; do not spend the next iteration refining level coverage.

The next evaluation priority is volume and buying-pressure evidence alongside
candle-over-candle upward progress: candle range/body/wicks, participation during
advances, and selling volume during pullbacks. Use the existing chart examples and
human corrections to refine these measurements; they remain hypotheses to evaluate,
not validated signals or proof of participant identity. Distinguish single-candle micro
pullbacks from longer pullbacks when that work resumes.

Key levels are secondary market context as a trend develops. A later pass should
favor a few relevant reaction areas over an exhaustive collection of minor shelves.
The thin line is an editing affordance, not a requirement that market reactions occur
at one exact price; retain tolerance/zone semantics underneath. No detector or UI
changes are requested for this checkpoint, and this does not authorize integration or
deployment. Raw candles and live review submissions stay local and gitignored.

## Where it is

| | |
|---|---|
| Page | `/analytics/momentum-archive/insights` (linked as **Insights** beside Full archive in the Market Context header) |
| Dip decisions tab | At-the-time vs. hindsight matrix for first-pullback dips, replay cards, hindsight charts |
| Label curls tab | `?view=label` with a **Curls \| Support & resistance** toggle |
| APIs | `/api/market-insights/curl-days` (read), `/api/market-insights/labels` (read/save; same-origin; refuses the read-only demo) |
| Code | `src/components/marketInsights/*`, `src/lib/marketInsights.ts`, `src/lib/marketInsightsStore.ts`, `src/app/(app)/analytics/momentum-archive/insights/page.tsx` |
| Shared component change | `LightweightTradeChart` gained optional `priceZones` and `onPriceClick` (off by default; see the component map in `docs/design/DESIGN_SYSTEM.md`) |
| Data builders | `scripts/market-context-research/build-insights.py`, `build-curl-days.py`, `tradingview-csv-to-day.py` |
| Study scripts | [`scripts/market-context-research/studies/2026-10-02/`](../../../../scripts/market-context-research/studies/2026-10-02/README.md) |
| Reviewer labels | Local only, in gitignored `data/evals/market-insights/labels.json`; omitted from publication |

Commits on the branch: `b87c164` prototype · `2640734` replay fix · `23a1a88` curl labeling ·
`518e486` selling pressure · `284e5ee` pullback fade · `f9c5583` support/resistance editor ·
plus this handoff.

## Continued prototype: candle replay and chart annotations

The Label curls route now opens **Chart review**. Its default is candle replay from the
first candle, with Previous/Next, +5 available candles and a cutoff slider. Full-day
hindsight is a separate perspective. Existing detector editors are **Curls · hindsight**
and **Levels · hindsight**. No full-day detector outputs enter replay, including the
old momentum strip, rule verdict, curl counts, future-informed zones or labels.

Mark advance, pullback, consolidation, chop, curl, support or resistance with two chart
clicks defining time/price boundaries. Entry and exit opportunities take one click.
Add a reason and save; layer toggles control structure/curls/levels/entries/exits. These
are human observations, not generated trade recommendations. Remove then re-mark to
correct an observation; removed records are retained with a removal timestamp.

`ChartReviewWorkspace` composes the existing chart, PeriodTabs, CompactSelect, Button
and SharedNoteComposer. Optional `startT`/`endT` on chart price zones draw bounded areas;
existing zone-editor bands remain full-width. No additional chart library is introduced.

Observations are an optional `days[dayId].observations` array in `curl-labels:v1`, separate
from the old curl judgments and zone decisions. Records include kind, time/price bounds,
reason, replay/hindsight mode, cutoff candle, furthest shown candle, creation timestamp,
and SHA-256 of the source day's bar tuples. Cutoffs refer to completed one-minute bars
by their **start timestamp**, not intraminute availability. Replay skips gaps; it does not
simulate a halt or intrabar sequence. Writes serialize in one preview process, not across
multiple servers. Do not run multiple writing servers against the same labels file.

Replay hides hindsight observations and observations recorded with a later cutoff or
later known exposure. Hindsight shows both, identified by their source perspective.
Exposure tracking covers the current page session, including visiting the detector tabs
and returning; earlier visits and charts viewed elsewhere are unknown. The existing
selected gainer-day dataset remains retrospective, not an as-of discovery universe.
This is an annotation prototype, not a blind evaluation harness or automatic training.

Validation: 18 focused boundary/persistence tests, TypeScript and changed-file ESLint
pass. Synthetic desktop/mobile browser QA covers replay, save retry, annotations,
overlay visibility, rewind/hindsight isolation, exposure, removal and existing level
bands. Browser writes were intercepted; temporary-file tests verify actual persistence.
Full production verification and full mobile annotation interaction remain deferred.
Next: Justin tries the chart-marking flow; refine annotation ergonomics and vocabulary
before wiring as-of proposals or evaluating a learned detector.

## Continued prototype: proposed levels and submitted reviews

The default Insights view is now **Structure review → Levels**, initially opening the
existing levels reference day. **Candle replay**, **Curl research**, and **Earlier level
labels** remain available. The prior Dip decisions experiment is labeled **Pullback
research** at `?view=dips`. The earlier descriptions and fitted rule below are historical
research context, not validated current behavior.

`LevelReviewWorkspace` composes the shared chart, Button, CompactSelect and
SharedNoteComposer. It shows numerical wick-level proposals, lets a reviewer select
lines/evidence, edit one price and time bounds, drag or keyboard-adjust the selected
line's single square handle, change support/resistance, accept/correct/reject/mark unsure,
and add a missed level with one chart click. Levels render as one-pixel lines with no
filled area; an inline × removes a proposed line by recording a rejection (with an
editable default removal reason). Only selected and kept proposals plus added levels
appear by default; Show all proposals exposes every candidate. All proposals stay in
the review list, and the detector is unchanged. Only the selected proposal has an inline
label to keep nearby levels legible. Original detector tolerance is retained internally
in the existing review schema; moving a line shifts its midpoint without resizing that
tolerance. Existing earlier zone editors and structure areas still render as bands. Original geometry can be overlaid for comparison.
Reasons are required for corrections, rejections, uncertainty and additions; the remove control supplies a factual default reason that can be edited. Edits are
local drafts until Submit; failed submissions preserve them and navigation warns
before discarding. Reload explicitly restores the saved review.

The shared chart’s bottom-right Expand control opens Levels fullscreen, including
line selection/movement/removal and Show all proposals. Escape or × returns to the
review form without discarding edits; Submit remains in that form. Evidence-marker
changes update in place, so selecting/removing a level preserves price scaling and
time zoom/pan. Editing controls stay on the visible part of a line when its end is
outside the current viewport.

The first detector is a dependency-free TypeScript heuristic, `marketLevelDetector.ts`.
It operates on the available one-minute OHLCV snapshot, not screenshots. Parameters and
version accompany each run. Grouped proposals are **hindsight only**, not replay
signals; individual wick confirmation times do not establish when the final cluster
became knowable. Role reflects the latest observed test, not proof of a successful
role reversal. Missing proposals and disagreements are expected calibration material.
No external library was installed, no learning job runs, and no provider is contacted.

The new `/api/market-insights/level-review` GET/POST endpoint uses a separate gitignored
`data/evals/market-insights/level-reviews.json`. The `level-reviews:v1` file retains immutable
submission revisions and their original detector runs, exact bar hashes, parameters,
cutoffs and human decisions. Legacy labels are untouched. Whole-chart coverage is an
explicit attestation requiring a decision for every proposal; otherwise unreviewed
regions remain unknown. Unsure is not a negative training label.

Writes enforce same-origin/demo guards, valid candle boundaries, optimistic revisions,
run matching and idempotent retry IDs. Atomic replacement and an in-process queue
protect one preview writer; this is not a multi-process database. Do not run multiple
writing preview processes against this directory. Changed source or detector runs
start an unreviewed view while prior submissions remain in history. Source identity
currently captures the day and exact bars; richer provider manifests and training
exports remain later work.

This slice stays on the prototype branch and port 3031. Next: expert review of proposed
levels and editing ergonomics, then advance/pullback/recovery overlays on the contrasting
examples. Replay-qualified detectors, automatic entries/exits, model training, detector
comparison benchmarks, production integration and installation remain deferred.

## Run it

The page reads only local files. Rebuild them in the worktree (or the main checkout after a merge):

```sh
# 1. Candle sample and mover list (already in the worktree's gitignored data/evals/market-insights/).
# 2. Convert any TradingView one-minute export into a day file:
python3 scripts/market-context-research/tradingview-csv-to-day.py "<export>.csv" <SYMBOL> data/evals/market-insights/<symbol>-day.json
# 3. Build the datasets:
python3 scripts/market-context-research/build-insights.py --candles data/evals/market-insights/sample-candles.json \
  --movers data/evals/market-insights/movers.json --out data/evals/market-insights/insights.json
python3 scripts/market-context-research/build-curl-days.py --candles data/evals/market-insights/sample-candles.json \
  --extra data/evals/market-insights/tnon-day.json data/evals/market-insights/amod-day.json data/evals/market-insights/sdev-day.json \
  --out data/evals/market-insights/curl-days.json
```

The preview used `DB_PATH=data/preview.db npx next dev --webpack -p 3031` with a copy of the
committed synthetic demo database (`samples/demo/tradingjournaldemo.db`). Webpack is needed
because Turbopack rejects the shared `node_modules` symlink. Curl keys are candle epoch
seconds, so rebuilding keeps existing labels attached.

Raw candles are not committed: real exports stay in gitignored `data/evals/`, and
`docs/analytics/MOMENTUM_ARCHIVE.md` keeps derived market data private.

## Publication boundary

This snapshot contains the prototype source from local checkpoint `07a9840` on a
fresh parent `c2dea448` (verified GitHub main). The original local branch is preserved.
Only necessary shared UI prerequisites accompany the prototype: CompactSelect,
PeriodTabs panel/keyboard support, the shared fullscreen dialog/fill-height behavior,
and minimal SharedNoteComposer compact/plain-text/textarea-attribute props. Existing
remote composer defaults remain intact; unrelated attachment/editor changes are omitted.
No unrelated local-main commits, historical private examples, label snapshots, raw
candles, live review submissions, local databases or private study results are included.
A clone needs locally supplied market snapshots to populate this experimental screen.

The local prototype passed focused detector/store/API tests, TypeScript, changed-file
lint and browser checks for replay, line editing, fullscreen, zoom preservation and
mobile overflow. Publication-specific validation is recorded in PROJECT_STATUS.
Full production validation and integration remain deferred; this is a parked prototype.
