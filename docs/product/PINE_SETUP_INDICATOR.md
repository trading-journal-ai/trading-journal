# Pine Setup Indicator — the real-time companion on TradingView

> **Status:** Discovery write-up — spec for a TradingView Pine Script indicator
> that mirrors the journal's setup checklist live, plus an optional webhook
> path back into the journal. Untested; no Pine code has been run yet.
> **Updated:** 2026-07-24
> **Companions:** [CHART_READ_PANEL.md](CHART_READ_PANEL.md) ·
> [../coach/SETUPS.md](../coach/SETUPS.md) ·
> [../coach/LEVELS.md](../coach/LEVELS.md)

## What this is

A single Pine Script v6 indicator ("Setup Check") added to the trader's own
TradingView charts that renders, live, the deterministic slice of the
Scott-Go-style read:

- **Setup-match table** pinned to the chart corner — each criterion from the
  active checklist with a ✓ / ✗ and current value (price band, minimum volume,
  VWAP side, EMA rail side, stop-band check).
- **Calculated levels drawn on the chart** — premarket high/low, prev-day
  high/low/close, opening range, VWAP, EMA 9/20, nearest whole/half dollars.
- **Structural stop readout** — distance from current price to the prior
  candle low, flagged green inside the 10–20¢ band and red beyond it
  ("holding and hoping" territory).
- **Optional alert → webhook** — when all required criteria flip to met, fire
  a TradingView alert that POSTs a JSON `setup_event` to the journal.

## Why an indicator and not "hooking in"

TradingView's data can't be intercepted or queried by outside software, and
page-injection (the Scott Go approach) needs a standing relationship with a
running session. But Pine runs **inside** TradingView with first-class access
to the very things vision has to reconstruct: OHLCV, volume, session info,
`ta.ema`, `ta.vwap`. The trade-off is a hard sandbox:

| Pine can | Pine cannot |
| --- | --- |
| Compute anything from the chart's own bars (EMAs, VWAP, pivots, session levels) | Make HTTP requests or call any external service |
| Draw lines, boxes, labels, and corner **tables** on the chart | Call an LLM — no narrative, no "confidence 75%" |
| Reference other symbols/timeframes via `request.security()` | Read news, sentiment, or anything non-price |
| Fire alerts whose messages POST JSON to a **webhook** (paid TV plans) | Receive anything back — the webhook is strictly one-way, nothing external can draw on the chart |

So the split is: **Pine owns the deterministic checklist in real time; the
journal owns narrative, levels ranking, and hindsight** (see
[CHART_READ_PANEL.md](CHART_READ_PANEL.md)). Both must express the *same*
criteria — SETUPS.md's `[D]` predicates are the single source of truth, ported
to Pine by hand and kept in sync deliberately (a header comment in the script
should name the SETUPS.md revision it mirrors).

## Prior art on TradingView (checked 2026-07-24)

The community library already covers most of phase 1–2, sometimes in our exact
vocabulary:

- **[Momentum Day Trading Toolkit](https://www.tradingview.com/script/L5bVkJTP-Momentum-Day-Trading-Toolkit/)**
  (DayTradingMD1992, open-source, free) — the closest match. Six modules for
  momentum small-caps: a "5 Pillars" screener gate (relative volume 2x+, daily
  change 5%+, price $1–$20, float <20M), Gap & Go premarket levels, **Bull
  Flag / Flat Top detection**, float rotation, prior-close crosses, **Micro
  Pullback detection**, plus a 0–10 setup quality score and native alerts.
  Same Warrior-style vocabulary as [../coach/SETUPS.md](../coach/SETUPS.md).
- **Levels scripts are commodity** — many open-source options draw PDH/PDL/PDC,
  premarket H/L, opening range: e.g.
  [Daily Levels: PD / PM / OR](https://www.tradingview.com/script/AG2pHS0H-Daily-Levels-PD-PM-OR-RTH-Pre/),
  [4C Daily Levels Suite + Premarket H/L](https://www.tradingview.com/script/0dnDqBlY-4C-Daily-Levels-Suite-Premarket-High-Low/),
  [Previous and Premarket High/Low](https://www.tradingview.com/script/LPsb7SBh-Previous-and-Premarket-High-Low-Indicator/).

What none of them have: the personal gate ($1.85–$9.50 band, 100K session
volume, the 10–20¢ prev-candle-low stop-band check), sync with SETUPS.md
revisions, or our `setup_event` webhook payload. Webhooks themselves are free:
any TV alert can POST its message, so an existing script's alerts can hit our
endpoint — but the payload would be its message format, not our contract.

**Revised build recommendation:** start by *using* the Momentum Day Trading
Toolkit on-chart to validate the concept at zero cost. If it sticks, fork it
(open-source; check its license header — TV open-source scripts default to
MPL-2.0) rather than writing from scratch: retune the 5-Pillars inputs to the
personal gate, add the stop-band row and the JSON alert message. The skeleton
below remains the from-scratch fallback and the reference for what the fork
must express.

### Toolkit source audit (full source reviewed 2026-07-24)

**Keep — the valuable parts.** The bull-flag and micro-pullback detectors are
proper causal state machines (green-streak → red-pullback → break of pullback
high with retrace-% validation), which is the hard part of our spec already
written and readable. Premarket H/L tracking, level locking at the first
market bar, prior-close cross (R2G) logic, and float rotation are all sound.

**Fix in a fork — defects found:**

1. **Premarket gap lookahead** *(narrowed after checking the Pine docs,
   2026-07-24)*. The prior-day values (`close[1]`/`high[1]`/`low[1]` +
   `lookahead_on`) are **fine** — that offset-plus-lookahead pairing is
   TradingView's own documented non-repainting idiom, not a bug. The real
   defect is `raw_today_open = request.security(..., "D", open,
   lookahead=barmerge.lookahead_on)`: no `[1]` offset, so it requests the
   *current* daily bar. Historically that serves today's RTH open to a 04:00
   premarket bar (future data); live at 04:00 that value doesn't exist yet.
   Everything downstream of it — `gap_pct`, `qualifying_gap`, `strong_gap`,
   and the quality score's gap component — is therefore untrustworthy during
   premarket. Fix: capture the session open from the chart's own first market
   bar (causal, no `request.security` needed).
2. **"RVol" is per-bar, not daily.** `volume / sma(volume, 20)` on chart bars
   measures the current 1-minute bar vs. its recent average — noisy, flickers
   with every momentum bar, and not what scanners mean by relative volume
   (today's cumulative vs. N-day average-at-time). Our gate should use session
   cumulative volume (the script already accumulates `cum_volume` for float
   rotation — reuse it).
3. **First-candle-range is dead code.** The capture condition
   (`is_market and not fc_set and is_new_day[1]`) never fires on
   extended-hours charts and grabs the wrong bar on RTH charts; the values are
   never plotted despite the input toggle. Rewrite or drop (our opening-range
   requirement replaces it anyway).
4. **Alerts can't carry our payload.** It uses `alertcondition()` with static
   messages, which cannot embed per-criterion booleans. The webhook path needs
   dynamic `alert()` + `str.format` JSON as in the skeleton below.

**Known behaviors (acceptable, not bugs):** entry signals evaluate intrabar
and only finalize at bar close — set alerts to "once per bar close"; flat-top
"valid" fires in any tight chop (touch-count on `ta.highest` is a crude
resistance test); doji candles silently terminate pullback state machines;
float data quality depends on TV's `syminfo.shares_outstanding_float`.

**Strip for our fork:** G2R / bearish signals (long-only engine), float
pillars if float isn't part of the personal gate, emoji styling per taste.
**Add:** the 10–20¢ prev-candle-low stop-band row, the $1.85–$9.50 band
(inputs support this directly), session-volume gate, JSON `alert()`.

## Criteria set (v1)

Global gate (mirrors the screener-style "My Setup Match"), all `[D]`:

| Criterion | Rule | Pine source |
| --- | --- | --- |
| Price band | `1.85 <= close <= 9.50` (input-configurable) | `close` |
| Volume | session cumulative ≥ 100K (input) | running sum of `volume` |
| Direction | long-only — bullish context required before any ✓ | constant |
| VWAP side | `close > vwap` | `ta.vwap` on session anchor |
| EMA rail | `close > ema9 and ema9 > ema20` (rising rail) | `ta.ema(close, 9/20)` |
| Stop band | `close - low[1]` within 10–20¢ | `low[1]` |

Per-setup criteria (micro pullback depth, flag tightness, …) come later, once
their SETUPS.md bodies are authored — the script structure below leaves a slot
for them.

## Indicator spec

- **Inputs:** price band min/max, min session volume, stop band min/max cents,
  toggles per level family (premarket, prev day, opening range, round numbers),
  table position.
- **Levels drawn:** premarket high/low (04:00–09:30 ET), previous day
  high/low/close (`request.security(..., "D", ...)` with lookahead off),
  opening-range high/low (first N minutes, input), nearest whole and half
  dollar above/below. VWAP and EMA 9/20 as plots.
- **Table:** one row per criterion — name, live value, ✓/✗ — plus a header row
  showing `n / total met`, mirroring the journal's future setup-match panel.
- **Repainting discipline:** all level values use confirmed bars only
  (`barstate.isconfirmed` for state changes, no lookahead in
  `request.security`), so the live read matches what the journal's causal
  replay would compute for the same bar. This is the property that makes the
  webhook events trustworthy later.
- **Alerts:** one `alert()` fired on the transition into "all required met"
  (not every bar while true), message = the JSON payload below.

## Real-time vs. post-mortem: how Pine actually executes

A recurring question — is a Pine "setup detected" mark computed live, or only
painted after the fact? Answer: **live, with a bar-close latency floor.**

- Pine runs once per historical bar, then re-executes on the live bar with
  every tick. A condition like `close > entry` is therefore evaluated in real
  time — but on the developing bar its inputs keep changing, so a signal can
  appear mid-bar and vanish before the bar closes.
- The bar close is the commitment point. An alert set to **"once per bar
  close"** fires only on confirmed data, runs server-side (chart doesn't need
  to be open), and — provided the script has no lookahead defects — matches
  exactly what the marks on historical bars show. On a 1-minute chart that
  means signals arrive with up to ~1 minute of latency; that's the price of
  trustworthiness.
- So the historical triangles/diamonds on the chart are not hindsight
  decoration: they are what bar-close alerts *would have said live*, modulo
  any lookahead bugs (the toolkit's premarket gap defect above is exactly
  such a bug — its pattern logic is clean, its gap % is not).

**Why a levels-only indicator is the most reliable Pine artifact of all:**
levels don't have the developing-bar problem. Prior-day H/L/C, premarket
H/L, opening range, and high-volume-candle zones are all derived from
*completed* bars — once set, they're static for the session. No repaint
surface, no intrabar flicker, no confidence judgment. Detection scripts
carry execution-model caveats; level scripts are just arithmetic on closed
data. This makes the Level-Mapping Assistant below both the easiest and the
most trustworthy piece to build first.

## Companion idea: Level-Mapping Assistant (separate indicator)

A second, much simpler Pine script for the *prep* workflow — mapping key
levels on a stock you're interested in, before the session. Distinct from the
Setup Check indicator: that one lives on the 1m/5m execution chart; this one
lives on the daily/weekly/monthly chart where levels get mapped.

What it draws, per the trader's heuristic (LEVELS.md §Calculated levels):

- **Top-N volume candles** in the lookback, their high/low extended right as
  shaded zones, labeled with the volume rank and date — "the most business
  was done here" as an instant visual instead of eyeballing the volume pane
  candle by candle.
- **Untested swing highs/lows** (pivots price hasn't returned to) as thinner
  lines.
- Optionally the same zones from the next timeframe up (weekly zones while
  on the daily) via `request.security`, so one chart pass covers two
  timeframes.

Output is *suggestions to mark, not marks* — consistent with the LEVELS.md
guardrail that marked levels are the trader's source of truth. The workflow
stays: assistant highlights, trader draws the levels they believe in.

Prior art note: TradingView's built-in **Fixed Range / Visible Range Volume
Profile** (available on paid plans) formalizes the same idea — POC and
high-volume nodes are the profile version of "highest-volume candle." Worth
trying first: profile for the where, custom script for the candle-level
readout and untested-pivot lines the profile doesn't give. This assistant is
deliberately dumb and computable — no patterns, no LLM — which is why it's
one of the few genuinely Pine-shaped pieces of the whole system.

**Drafted 2026-07-24 (untested):**
[`../../tradingview-indicators/level-map-assistant.pine`](../../tradingview-indicators/level-map-assistant.pine)
— top-N volume-candle zones plus never-closed-through pivots, for the
daily/weekly/monthly mapping pass. Its execution-chart companion is
[`session-levels.pine`](../../tradingview-indicators/session-levels.pine):
prior day H/L/C, premarket H/L, opening range, causal RTH open + gap %, round
numbers, and four manual "mapped level" inputs so the levels chosen during
mapping project down onto the 1m/5m chart. Both need a compile pass in the
Pine editor. See
[`../../tradingview-indicators/README.md`](../../tradingview-indicators/README.md).

## Webhook path (optional, phase 2)

TradingView alert webhooks POST the alert message to a URL. A tiny journal
endpoint (`POST /api/setup-events`, bearer token in the URL or body since TV
sends no custom headers) records:

```json
{
  "v": 1,
  "kind": "setup_event",
  "symbol": "{{ticker}}",
  "time": "{{timenow}}",
  "price": {{close}},
  "criteria": { "price_band": true, "volume": true, "vwap": true,
                "ema_rail": true, "stop_band": true },
  "script": "setup-check-v1"
}
```

Stored as an **imported fact** (`⇣` layer — external, immutable, timestamped).
What it unlocks: the journal can line up *setup fired* events against *trades
taken* — setups you took, setups you skipped, and trades taken with no setup
event at all. That's opportunity-set capture
([../analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md](../analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md))
fed by the live chart instead of after-the-fact scanning.

Constraints to note: webhooks require a paid TradingView plan, fire with
seconds of latency (fine for journaling, not for execution), and cap alert
counts per plan tier. The endpoint must be idempotent (TV can re-fire).

## Starter script (skeleton, untested)

```pinescript
//@version=6
// Mirrors docs/coach/SETUPS.md global [D] gate — keep in sync by hand.
indicator("Setup Check v1", overlay = true)

fPriceMin  = input.float(1.85,  "Price band min")
fPriceMax  = input.float(9.50,  "Price band max")
fMinVol    = input.int(100000,  "Min session volume")
fStopMinC  = input.float(0.10,  "Stop band min ($)")
fStopMaxC  = input.float(0.20,  "Stop band max ($)")

ema9  = ta.ema(close, 9)
ema20 = ta.ema(close, 20)
vwap  = ta.vwap(hlc3)

var float sessVol = 0.0
sessVol := session.isfirstbar ? volume : sessVol + volume

stopDist = close - low[1]

okPrice = close >= fPriceMin and close <= fPriceMax
okVol   = sessVol >= fMinVol
okVwap  = close > vwap
okRail  = close > ema9 and ema9 > ema20
okStop  = stopDist >= fStopMinC and stopDist <= fStopMaxC

plot(ema9,  "EMA 9",  color.orange)
plot(ema20, "EMA 20", color.fuchsia)
plot(vwap,  "VWAP",   color.yellow)
// TODO: premarket H/L, prev-day H/L/C via request.security("", "D", ...),
// opening range, round numbers — draw with line.new on session start.

var table t = table.new(position.top_right, 2, 6, border_width = 1)
if barstate.islast
    mk(row, name, ok, txt) =>
        table.cell(t, 0, row, name, text_color = color.white)
        table.cell(t, 1, row, (ok ? "✓ " : "✗ ") + txt,
                   text_color = ok ? color.lime : color.red)
    met = (okPrice ? 1 : 0) + (okVol ? 1 : 0) + (okVwap ? 1 : 0)
        + (okRail ? 1 : 0) + (okStop ? 1 : 0)
    table.cell(t, 0, 0, "SETUP", text_color = color.white)
    table.cell(t, 1, 0, str.tostring(met) + " / 5", text_color = color.white)
    mk(1, "Price",  okPrice, str.tostring(close, "#.##"))
    mk(2, "Volume", okVol,   str.tostring(sessVol, format.volume))
    mk(3, "VWAP",   okVwap,  "above")
    mk(4, "EMA 9/20", okRail, "rail")
    mk(5, "Stop",   okStop,  str.tostring(stopDist, "#.##"))

allMet = okPrice and okVol and okVwap and okRail and okStop
if allMet and not allMet[1] and barstate.isconfirmed
    alert('{"v":1,"kind":"setup_event","symbol":"' + syminfo.ticker
        + '","price":' + str.tostring(close) + ',"script":"setup-check-v1"}',
        alert.freq_once_per_bar_close)
```

Known gaps in the skeleton (to resolve when building for real): session volume
accumulation vs. `session.isfirstbar` on premarket-inclusive charts, premarket
level capture, `request.security` daily values, and whether `mk()` as a local
method is valid v6 (may need a plain function). Treat it as a shape, not code.

## Phasing

1. **Indicator, no alerts.** Table + EMA/VWAP + stop band on the live chart.
   Immediate daily value; zero backend work.
2. **Levels.** Premarket / prev-day / opening-range / round-number lines.
3. **Webhook + `/api/setup-events`.** Journal records setup events; review
   pages can show "setup fired at 09:41, you entered at 09:44."
4. **Per-setup variants.** As SETUPS.md bodies get authored with `[D]`
   predicates, add setup-specific checks (input-selectable or one script per
   setup).

## Explicitly out of scope

- Anything requiring outbound calls from Pine (LLM narration, news) — that
  content lives in the journal panel.
- Order placement / strategy scripts — this is an indicator, not automation.
- Intercepting or exporting TradingView's data — the webhook carries only our
  own computed event, which is both the ToS-safe and the useful thing.
