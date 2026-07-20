# Opportunity Set Capture Plan

> Status: V5 Study 05 approved as a vocabulary direction · capture and Journal
> integration not yet implemented
>
> Product question: **Were you able to capitalize on the movers of the day?**

## Product Home

The full opportunity-set review belongs in the **Journal daily recap**. It is a
durable reflection on stock selection, participation, and execution—not a live
scanner and not a Dashboard chart-count feature.

The Dashboard may summarize the state (`2 A+ names`, `no clean opportunity`,
`review incomplete`) and link into the dated Journal recap. Analytics may later
aggregate candidate and participation patterns across weeks or months.

V5 Study 05 is the approved vocabulary reference:

- Route: `/preview/data-viz/v5`
- Family: `05 · Five-pillar opportunity set`
- Primary artifact: ranked daily candidate ledger with alert-time evidence and
  separately labeled hindsight outcomes.
- Default surface: desktop-first.

## Analytical Boundary

The view must keep two timelines separate:

1. **What was knowable at the alert**: the scanner event, five-pillar snapshot,
   catalyst context, leadership state, and data provenance.
2. **What happened afterward**: post-alert price movement, the trader's entries
   and exits, realized P&L, and execution quality.

Candidate rank must never use the later high, end-of-day result, or post-alert
MFE. Those values are outcomes for review, not evidence that was available when
the selection decision was made.

## Source Ownership

| Source | Owns | Does not own |
| --- | --- | --- |
| Stock Info scanner bridge | Immutable alert events and first-seen timing | Journal trade outcomes |
| Stock Info enrichment | RVOL, float, catalyst/news context, provider timestamps, confidence | Whether the trader participated |
| Trading Journal | Trades, executions, shares, P&L, account scope, ET session date | Reconstructing missing historical scanner facts |
| OHLCV candle cache / market-data fetch | Post-alert price path for traded and missed candidates | Alert-time catalyst or scanner rank |
| Trader-authored Journal recap | Skip reason, selection lesson, false-opportunity/correct-avoidance judgment | Replacing observed market data |

Stock Info remains the **capture owner**. The Trading Journal becomes the
**review owner** after a normalized daily sync/import. This prevents the Journal
from depending on Stock Info being live whenever an older recap is opened.

## Capture Contract

### 1. Raw scanner event

Continue the append-only scanner event stream and extend each event when the
scanner exposes the fields:

- `eventId`
- `observedAt`, `receivedAt`, and `scannerTime`
- `sessionDateEt`
- `symbol` and `scenario`
- `price`, `changePct`, and `volume`
- `relativeVolume` and `relativeVolume5m`
- `twoMinChangePct`, `volume1m`, and `volume30s`
- `gapPct` and `hodDistancePct`
- `open`, `high`, `low`, and `previousClose`
- `floatShares`
- source and userscript/schema version

Missing values remain `null`. They must not be silently filled with later data.

### 2. First qualifying candidate snapshot

Create one normalized candidate snapshot when a symbol first qualifies for the
daily review. Preserve subsequent scanner events separately.

Required identity and timing:

- stable candidate ID
- ET session date
- symbol
- source event ID
- first seen time
- first qualifying time
- last seen time
- qualifying scenario and threshold

Five-pillar snapshot:

- price and pass/fail state (`$1–$20`)
- float shares and pass/fail/unknown state (`<10M`)
- RVOL and pass/watch/fail/unknown state (`>=5x`)
- daily change and pass/watch/fail state (`>=10%`)
- catalyst state: fresh, continuation, no-news momentum, unclear/stale, adverse,
  or unknown
- candidate profile: A+, watchable, avoid/low quality

Context worth preserving with the snapshot:

- catalyst headline, source, published time, and captured time
- theme/sector when available
- leadership state and alert-time rank
- field-level provider/source, observed time, and confidence
- enrichment coverage: complete, partial, failed, or not requested

Provider enrichment should be cached per symbol and refreshed only when its
freshness window expires. Repeated scanner hits must not trigger a network call
for every row.

### 3. Post-alert outcome

After the market closes—or once the relevant horizon is complete—derive from
one-minute candles:

- move at +5 minutes
- move at +15 minutes
- move at +30 minutes when useful
- end-of-day move
- maximum favorable move after the alert and its timestamp
- maximum adverse move after the alert and its timestamp
- maximum percentage gain of day from the agreed session reference and HOD time
- scanner persistence: hit count, last seen time, and scenarios observed

Fetch/cache candles for **every qualifying candidate**, including missed and
avoided names. Looking only at tickers the trader executed would bias the
opportunity set.

The daily summary should also retain market-heat breadth:

- session maximum gainer and symbol
- unique-symbol count above +50%
- unique-symbol count above +100%
- unique-symbol count above +200% when present
- number of A+ candidates

These counts use each symbol's maximum daily gain, not raw scanner hits. They
answer whether the session produced several sustained leaders or merely many
repeated alerts from the same stock.

## Daily Sync Into the Journal

Add an idempotent daily sync/import from Stock Info into a future Journal
candidate-snapshot store. Use source event ID plus ET session date and symbol as
dedupe inputs. Preserve the raw source reference and schema version.

The daily Journal read model should return:

```ts
type DailyOpportunityReview = {
  sessionDateEt: string;
  coverage: "full" | "partial" | "no-capture" | "market-closed";
  capturedFrom?: string;
  capturedThrough?: string;
  candidates: CandidateReview[];
};
```

Coverage states are part of the analysis. Keep these distinct:

- market closed
- no scanner capture
- partial scanner capture
- full scanner capture with no qualifying opportunity
- opportunity existed but no trades were recorded

The initial July 17 scanner archive is partial historical evidence. Do not
retroactively manufacture RVOL, float, catalyst, or alert rank for it.

## Joining Candidates Back to Trades

Join candidate snapshots to account-scoped Journal trades using normalized
symbol plus ET session date. Then classify timing relative to the first
qualifying alert.

`Traded` should not be a simple boolean. Use these participation states:

- `not traded`
- `pre-alert only`
- `participated after alert`
- `multiple trades after alert`
- `trade timing unavailable`

For each candidate return:

- all same-symbol trades that session
- pre-alert and post-alert trade IDs separately
- first entry time and scanner-to-entry delay
- total shares and number of round trips
- net P&L and fees
- entry/exit prices and hold times
- trade MAE, MFE, and captured percentage when candle coverage permits
- direct link to each trade review

Multiple trades must remain individually inspectable even when the candidate row
also shows an aggregate result.

## Off-Scanner Trade Reconciliation

The daily recap must also reverse the join: inspect every Journal trade and ask
whether a qualifying scanner event existed **at or before the first entry**.
Trading a symbol before it alerts is still off-scanner at decision time, even if
the symbol appears later.

Use an explicit system-compliance state per trade:

- `inside-system`: a qualifying alert existed before entry
- `documented-exception`: no qualifying alert existed, but the trader records a
  deliberate reason or approved alternate setup
- `outside-system`: the trader identifies impulse/FOMO or another unplanned
  deviation
- `unreviewed-off-scanner`: no qualifying alert and no reason captured yet
- `unknown-coverage`: scanner coverage was partial or unavailable, so the system
  cannot make a defensible classification

When coverage is full and a trade has no qualifying alert, the Journal should
surface a required recap prompt: **“This stock was not on your scanner before
entry. Why did you trade it?”** Suggested reason codes can include planned
watchlist continuation, manual catalyst, scanner lag/miss, approved alternate
setup, impulse/FOMO, and other. Preserve a short free-text explanation alongside
the code.

This is a review gate, not a claim that every off-scanner trade was bad. A
documented exception and an impulsive system break must remain different facts.
When coverage is partial, ask for context but never label the trade outside the
system solely because no scanner event was captured.

The coach fact pack should receive:

- off-scanner trade IDs, symbols, entry times, reason codes, and explanations
- system-compliance state and scanner coverage confidence
- trade count, shares/risk, and P&L grouped by compliance state
- whether an off-system trade occurred while stronger qualifying candidates
  were available but not traded

The daily coach recap should flag unresolved off-scanner trades, distinguish
documented exceptions from system violations, and cite the exact trades behind
the finding. Weekly/monthly coaching may aggregate this only when scanner
coverage is sufficient.

## Journal Interaction

Default view:

- Date control selects one ET session.
- A session snapshot states the maximum gainer and counts above +50%, +100%,
  and +200%.
- Trades without a qualifying pre-entry scanner event appear in a recap queue
  and require a reason when scanner coverage is full.
- Rows are ranked by alert-time candidate quality.
- Outcome columns remain available but visibly separated as hindsight.
- Alternate sorts: first seen, RVOL, daily change, +15-minute move, end-of-day
  move, and participation state.

Deferred interaction approved for exploration:

- Selecting a candidate persists its explanation.
- A candidate marked `Traded` can expand downward.
- The expansion shows a compact trade ledger: entry, exit, shares, result,
  scanner-to-entry delay, MAE/MFE, and MFE captured.
- Multiple trades appear as separate rows or a short trade tape.
- Each row links to the full trade review without losing the Journal date.

The expanded trade treatment should reuse the strongest ideas from V5 Study 02
(trade breathing) and Study 04 (scanner-to-trade trace) instead of inventing a
new analytical grammar.

## Delivery Sequence

### Phase 0 · Complete

- Approve the five-pillar opportunity-set vocabulary in V5 Study 05.
- Establish alert-time evidence versus hindsight outcome as the core boundary.

### Phase 1 · Harden capture

- Extend the Stock Info scanner event payload and archive.
- Add candidate enrichment snapshots with freshness and provenance.
- Add visible capture-health reporting and schema versioning.

### Phase 2 · Build the daily read model

- Normalize candidates by ET session date and symbol.
- Fetch post-alert candles for the full qualifying set.
- Derive horizon outcomes and attention persistence.
- Produce an idempotent daily summary/import contract.

### Phase 3 · Journal integration

- Add the dated opportunity-set section to Daily Recap.
- Join account-scoped trades and classify participation timing.
- Reverse-match every trade to a qualifying pre-entry scanner event and prompt
  for unresolved off-scanner rationale.
- Support the default alert-quality rank and alternate daily sorts.
- Show explicit coverage and provenance.

### Phase 4 · Trade drill-down and learning loop

- Add expandable traded-candidate rows.
- Capture skip reason, avoidance judgment, and lesson.
- Feed candidate quality, participation, and execution evidence into coaching.
- Flag system-compliance findings with scanner-coverage confidence and the
  trader's recorded rationale.
- Aggregate weekly/monthly selection patterns only after coverage is sufficient.

## Acceptance Criteria

- Opening a Journal day shows only candidates from that ET session.
- Scanner coverage is visible and never inferred from trade activity.
- Every pillar value exposes its source time and unknown state.
- Alert-quality rank uses no post-alert outcome.
- Qualifying missed candidates receive the same OHLCV outcome treatment as
  traded candidates.
- All same-day trades are linked correctly and account scoped.
- Pre-alert trades are not mislabeled as post-alert participation.
- A full-coverage off-scanner trade cannot enter the coach fact pack without an
  explicit unresolved flag or a recorded reason.
- Partial or missing scanner coverage never produces a false outside-system
  judgment.
- Multiple trades can be inspected individually.
- Missing float, RVOL, catalyst, or candle data degrades honestly rather than
  removing the candidate.
- The initial July 17 archive remains labeled partial and is not backfilled with
  invented historical facts.
