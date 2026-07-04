# Levels

The **levels layer** of the coach: *where* price is acting. Setups describe a
pattern; levels describe the location the pattern happens at — and location is
what separates "bought support" from "chased into supply."

Source material: the Find Your Levels project (`findyourlevels.com`, local repo
`~/Working/find-your-levels/` — see its `CONTENT_OUTLINE.md`), the teacher's
levels-first framework. The existing coach prompt draft
[`prompts/fyl_trade_review_coach.md`](prompts/fyl_trade_review_coach.md) speaks
this vocabulary (trapped buyers/sellers, overhead supply, role flip, buying
support instead of chasing breakouts, structural invalidation).

## Two classes of levels

**Calculated levels** — derivable in code from data the app already has or can
compute. The app should generate these automatically per ticker/day:

- Premarket high / low.
- Previous day high / low, previous close.
- Opening range high / low.
- High of day / low of day (as the session evolves).
- VWAP (reclaim / rejection / trend filter).
- EMA 9 / EMA 20 trend context and EMA 200 higher-timeframe regime context.
- Whole and half dollar levels near the action.
- Gap zones (gap-up / gap-down boundaries).
- Classic pivots (P, R1–R3, S1–S3) if adopted.

**Marked levels** — require human judgment; the trader draws them:

- Daily-chart support / resistance zones.
- Supply and demand zones (base + impulse, fresh vs. tested).
- Trendlines: descending resistance, ascending support.
- Any level from a timeframe or context the trader considers load-bearing.

Marked levels are the **trader's source of truth**. The coach never invents,
moves, or overrides them (guardrail inherited from the FYL prompt). Calculated
levels carry no such authority claim — they are facts, not opinions.

## Level records

Both classes normalize to one record shape (matches the FYL prompt input):

- `price` (or `zone_low` / `zone_high` — levels are zones, not exact lines)
- `kind` — support / resistance / supply / demand / vwap / pivot / …
- `source` — `calculated` or `user`
- `timeframe` — monthly / weekly / daily / intraday / premarket
- `scope` — ticker + date (some persist across days; daily levels do)

## Level quality

FYL's ranking factors, most of them computable once the level exists:

- `[D]` Number of prior reactions (touches).
- `[D]` Recency of the last reaction.
- `[D]` Volume at the level on prior tests.
- `[D]` Timeframe (higher timeframe = more weight).
- `[D]` Confluence — independent levels stacking within a tolerance
  (e.g. prev-day high + whole dollar + VWAP).
- `[D]` Exhaustion — repeated tests with weakening reactions.

## Scenario vocabulary

The coach should describe what happened *at* a level with FYL's scenario
terms, all determinable from candles once the level is known:

- **Bounce** — tested and held.
- **Breakout** — closed through with volume.
- **Rejection** — tested and failed.
- **Reclaim** — lost, then recovered (role flip).
- **Failed breakout** — broke, then fell back through (trapped buyers).
- **Compression** — tightening range against a level, volume drying up.

## What levels unlock for grading

With a level map, predicates that were judgment calls in
[`SETUPS.md`](SETUPS.md) become deterministic:

- `[J → D]` "Breakout into overhead supply" — is there a marked supply zone /
  resistance within TODO% above entry?
- `[J → D]` "Bought support vs. chased" — distance from entry to the nearest
  demand/support level below, in cents and R.
- `[J → D]` "Structural stop vs. pain stop" — is the stop beyond a level, or
  floating in open space?
- `[D]` Entry-into-open-space detection — no level between entry and TODO%
  above (chase signature).
- `[D]` "Trend in your favor" — price above/below VWAP and prior-day pivot at
  entry; higher-high/higher-low sequence intact on the execution timeframe.

The trade-level review question the FYL prompt asks — *who was trapped here,
and was the trader on the right side of them?* — is answerable only with the
level map present.

## Capture flow

- **Calculated levels:** generated at import for each traded ticker/day; zero
  trader effort.
- **Trade screenshots (first step).** Add an **Add screenshot** action on trade
  detail near the chart. These images are evidence for a single trade and can
  be captioned with the timeframe or purpose. They do not need extraction in v1.
- **Marked levels — ticker/day screenshot import (primary).** The trader already
  maintains the full level map in TradingView: the 1-minute execution view
  plus daily 200EMA context, with 4-hour / weekly / monthly / yearly sweeps
  for critical levels on in-play names. Pipeline:
  1. Attach TradingView screenshot(s) to the ticker/day (one timeframe per
     shot, price axis visible).
  2. Vision extraction transcribes the drawn lines/zones against the price
     axis into draft level records (price/zone, kind, timeframe).
  3. The trader confirms or corrects each draft; confirmed records persist
     with `source: user`.
  Extraction is data transcription, not pattern judgment — it does not breach
  the no-chart-image-grading rule, and the confirm step preserves the
  trader-as-source-of-truth guardrail. Screenshots stay attached to the
  ticker-day review as visual reference.
- **Scope discipline:** capture levels only for in-play tickers — the day's
  flagged / high-activity names. This matches practice: once a stock is worth
  attention, levels get built and the chart gets studied deeper.
- **In-app drawing (later):** drawing levels directly on the ticker-day
  review chart is the eventual alternative once the chart supports it.
- Missing levels are a stated caveat, not a blocker: the coach reviews with
  calculated levels only and says so (and never penalizes early Phase 1
  trades for thin level maps — the move is too young to have built them).

## Relationship to other docs

- [`SETUPS.md`](SETUPS.md) — levels upgrade setup `[J]` predicates to `[D]`
  and provide the location context for validity.
- `EXECUTION.md` *(planned)* — entries/stops/targets are defined relative to
  levels ("entry at reclaim, stop below the zone").
- [`prompts/fyl_trade_review_coach.md`](prompts/fyl_trade_review_coach.md) —
  the coaching prompt that consumes marked levels and this vocabulary.
- [`COACH_ARCHITECTURE.md`](COACH_ARCHITECTURE.md) — level records are part
  of the request payload and the fact pack's inputs.
- [`ANALYTICS_RESEARCH_PLAN.md`](../analytics/ANALYTICS_RESEARCH_PLAN.md) —
  the Five Pillars describe candidate quality; levels describe trade location.
