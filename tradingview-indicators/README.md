# TradingView Indicators

Pine Script v6 indicators supporting the trading workflow. These are **not part
of the Next.js app** — nothing here is imported, built, or tested by the app's
toolchain. They live alongside it because they share their definitions with the
journal (levels, setup criteria), and they're kept together so the two stay in
sync deliberately rather than by accident.

Self-contained by design: if this ever wants to be its own repository, this
directory can be lifted out as-is.

> **Status: not yet compiled.** Both scripts were written from the specs in
> `docs/` and reviewed once for known Pine pitfalls (dynamic loop bounds,
> descending `for` ranges, in-place array removal, functions mutating globals,
> unverified format constants — all avoided). They still need a real pass
> through the TradingView Pine editor.

## Testing checklist

**Level Map Assistant** — daily chart, a liquid ticker:
1. Do the shaded zones land on the obviously huge-volume candles? Cross-check
   the volume pane by eye.
2. Do the `#1…#5` labels rank in descending volume order?
3. Change *Lookback bars* and *Zones to draw* — do zones redraw without
   duplicating or leaving orphans behind?
4. Do the dashed pivot lines only sit at highs price never closed above (and
   lows it never closed below)?

**Session Levels** — 1-minute chart, extended hours ON, a recent gapper:
1. Do prior-day H/L/C match the previous daily candle exactly?
2. Do premarket H/L stop updating at 09:30 and stay flat all session?
3. Does the opening range freeze after the configured minutes?
4. Does the gap % label appear only at/after 09:30 — never during premarket?
   (That's the bug this script exists to avoid.)
5. Type a price into *Mapped Level 1* — does the line appear where expected?

If a script errors, the editor's message names a line number; send that with
the message text.

## The scripts

| File | Chart | Purpose |
| --- | --- | --- |
| [`level-map-assistant.pine`](level-map-assistant.pine) | daily / weekly / monthly | Speeds up the **mapping** pass: shades the highest-volume candles as zones, draws pivots price has never closed through. |
| [`session-levels.pine`](session-levels.pine) | 1m / 5m | The **execution** chart: prior day H/L/C, premarket H/L, opening range, RTH open + causal gap %, round numbers, and your mapped levels projected down. |

**Workflow — map high, trade low.** Map levels on a higher timeframe with the
Level Map Assistant, decide which ones you actually believe, then type those
few prices into Session Levels' "Mapped Levels" inputs so they appear on the
execution chart. The assistant suggests; you decide. Drawn levels stay the
source of truth ([`../docs/coach/LEVELS.md`](../docs/coach/LEVELS.md)).

## Why levels first

Levels are the most trustworthy thing Pine can produce. They derive entirely
from **completed** bars — once set, they're static for the session, so there's
no repainting, no intrabar flicker, and no confidence judgment to second-guess.
Pattern/setup detection carries execution-model caveats; level arithmetic
doesn't. See the "Real-time vs. post-mortem" section of
[`../docs/product/PINE_SETUP_INDICATOR.md`](../docs/product/PINE_SETUP_INDICATOR.md).

## Setup notes

- **Extended hours must be ON** for premarket levels to populate
  (chart settings → Session → Extended trading hours).
- Session Levels is intraday-only; on a daily+ chart its plots stay blank.
- Level Map Assistant's lookback is bounded by the bars TradingView loads,
  which is why it belongs on a daily/weekly chart (years of history) rather
  than a 1-minute one (days).
- Neither script places orders, and neither sends alerts yet. The webhook path
  (`setup_event` → journal) is specced but not built.

## Non-repainting conventions used here

Both scripts follow the rules the audit in `PINE_SETUP_INDICATOR.md` came out
of — worth preserving in any edit:

- Higher-timeframe requests use the documented safe idiom: an offset expression
  (`high[1]`) **with** `lookahead=barmerge.lookahead_on`. Never request the
  *current* HTF bar with lookahead on — that's the defect found in the
  Momentum Day Trading Toolkit, which makes its premarket gap % differ between
  live and replay.
- Session values (RTH open, opening range, premarket extremes) come from the
  chart's own bars as they close, never from a daily request.
- Drawing objects are rebuilt on `barstate.islast` and the previous set is
  deleted first, so redraws don't leak objects into the limit.

## Related docs

- [`../docs/product/PINE_SETUP_INDICATOR.md`](../docs/product/PINE_SETUP_INDICATOR.md)
  — the full spec, the toolkit source audit, and the webhook design.
- [`../docs/product/CHART_READ_PANEL.md`](../docs/product/CHART_READ_PANEL.md)
  — the journal-side counterpart (hindsight-aware chart read).
- [`../docs/coach/LEVELS.md`](../docs/coach/LEVELS.md) — level vocabulary,
  quality ranking, and the marked-vs-calculated guardrail.
