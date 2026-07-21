# Find Your Levels deterministic review process

> Status: v1 working contract · 2026-07-21
>
> This document defines how chart facts, the Find Your Levels playbook, trader
> context, and AI coaching fit together. It complements
> [VOICE.md](VOICE.md) and
> [PRICE_ACTION_QUALITY_MODEL.md](../analytics/PRICE_ACTION_QUALITY_MODEL.md).

## Purpose

The deterministic review is the journal's objective read of what the chart
offered when a trade was taken. It runs before trader notes, tags, setup labels,
or AI interpretation are added. Its job is to make the chart legible through
the Find Your Levels framework without letting outcome or hindsight change the
entry grade.

The system separates three questions:

1. **Was there a valid opportunity?** Read only from chart evidence available
   before the decision.
2. **How was it executed?** Compare the entry, size, adds, risk, and exit with
   the opportunity that was present.
3. **What did the trader intend?** Use notes, tags, and stated setup only after
   the objective read has been frozen.

A losing trade can be a valid opportunity with sound execution. A winning
trade can be unsupported or off-playbook. P&L never changes the chart read.

## Review sequence

### 1. Build the causal chart snapshot

For every trade decision, use only candles fully closed before that decision.
The chart and coach must consume the same versioned calculations for:

- EMA9 and EMA20 value, order, slope, spread, and recent cross;
- VWAP value, session anchor, ownership, reclaim, loss, and rejection;
- higher-high/higher-low or lower-high/lower-low structure;
- consolidation, expansion, failed breaks, and extension;
- volume participation and directional price progress.

Missing warmup or candle coverage is reported as missing evidence. It is never
filled in by the AI.

### 2. Read the market through Find Your Levels

The initial rule set covers the core chart conditions:

- **Frontside uptrend:** higher highs and higher lows, EMA9 above EMA20, and
  price holding a rising rail or reclaimed VWAP.
- **Backside downtrend:** lower highs and lower lows, EMA9 below EMA20, and
  price pinned below the rail or a lost VWAP.
- **Bearish EMA cross:** EMA9 crosses from above EMA20 to below it. EMA20
  remaining above EMA9 is the bearish stack that follows the event.
- **Bullish EMA cross:** EMA9 crosses from below EMA20 to above it. EMA9
  remaining above EMA20 is the bullish stack that follows the event.
- **EMA-rail pullback:** price pulls into a rising or falling rail on lighter
  volume, holds structure, and resumes with participation.
- **Consolidation:** rotations tighten, candle ranges contract, volume tapers,
  and price stops making directional progress. Trading inside the coil is not
  the same opportunity as trading a confirmed resolution.
- **Expansion:** price resolves a defined range with greater range and volume,
  then holds the break or passes a retest.

Indicators confirm structure and marked levels; they are not standalone trade
signals. A cross during a directionless range must be described as weak or
unclear rather than promoted to a trend change.

### 3. Freeze the deterministic evaluation

Each versioned setup evaluator returns one of:

- `supported`
- `contradicted`
- `insufficient_evidence`
- `off_playbook`

It also returns confidence, stable reason codes, and the calculation version.
The frozen result is not rewritten after notes or P&L become available.

### 4. Add the trader's context

Notes, tags, emotions, and stated setup explain what the trader saw. They may
confirm the deterministic read, reveal a mismatch, or supply intent the chart
cannot know. They do not alter historical indicator values or promote an
unsupported chart condition into a valid setup.

When intent is missing, the coach asks rather than infers.

### 5. Produce the coaching review

The AI compares the frozen opportunity read with the trader's intent and
execution. It explains the evidence; it does not calculate indicators or
invent a setup classification.

Follow the house voice in [VOICE.md](VOICE.md):

1. **Meaning:** say what the chart was doing in human trader language.
2. **Proof:** show the few chart facts that support the read.
3. **Next rep:** give one concrete behavior to repeat or change when useful.

Example:

> **Sellers had control when you entered.** The 9 EMA had crossed below the
> 20, price was below VWAP, and each bounce was failing earlier. The short idea
> fit the chart; the remaining question is whether the entry was close enough
> to the EMA rail to define risk.

Raw measurements and engine terminology belong in an inspectable “Why this
read?” layer, not in the headline.

## Versioning and calibration

Cache derived analytics separately from raw candles. A derived result is keyed
by ticker, market date, timeframe, session convention, candle revision, and
calculation version.

Find Your Levels thresholds begin as authored priors. Before they become firm
grading rules, tune them against manually labeled chart intervals and validate
them out of sample by ticker-day. Keep the reason codes stable and increment
the calculation version whenever a definition or threshold changes.

One-minute OHLCV can support an approximate volume-at-price profile, but not a
true volume profile. Approximate POC/HVN/LVN may be supporting location evidence
only and must be labeled accordingly.

## Initial implementation boundary

Price Action Snapshot v1 includes shared EMA9, EMA20, and VWAP calculations;
EMA cross and stack state; causal structure; consolidation evidence; volume
participation; and plain-language reasons. Multi-timeframe daily regime,
calibrated volume profile, and broader playbook patterns follow after this
foundation is labeled and validated.
