# Pullback and curl studies, October 2, 2026

One-off Python analyses (standard library only) from the session that produced the
[Market Context Insights handoff](../../../../docs/product/handoffs/2026-10-market-context-insights/README.md).
They answered specific questions and are kept so results can be reproduced or extended.
They are research scaffolding, not app code. Thresholds are the study's choices, not
calibrated trading rules.

## Inputs

All inputs are local and gitignored; never commit them.

- `data/evals/market-insights/sample-candles.json`: 1,500 random top-gainer days with
  one-minute candles (`[{symbol, date, pc, candles: [{t,o,h,l,c,vol}]}]`). Pulled on
  2026-10-02 from Trading Server's market-history candle endpoint.
- `data/evals/market-insights/movers.json`: the Core mover list from Trading Server's
  `/api/market-history/movers`.
- Day files converted from TradingView exports with
  [`../../tradingview-csv-to-day.py`](../../tradingview-csv-to-day.py).

Most scripts take a directory argument `S` holding `sample_candles_1500.json`. Point it at
the gitignored folder with a link, then run from the repo root:

```sh
ln -s sample-candles.json data/evals/market-insights/sample_candles_1500.json
python3 scripts/market-context-research/studies/2026-10-02/setups.py data/evals/market-insights
```

Scripts that import `setups` or `build-curl-days.py` expect to run from the repo root with
this folder on the path; copy them next to their imports if a run fails on an import.

## Scripts

| Script | Question it answered |
|---|---|
| `setups.py` | First pullback off the first pop: how often a new high follows, by depth, length and time of day. Also curls on later pullbacks and the volume-confirmation trade-off. |
| `selling.py` | How heavy was the selling? Depth × red-candle volume vs. the move's green volume, big red candles, and by quarter. |
| `dip.py` | The first drastic pullback traded as a dip (arm at 50%, prior-candle-high entry, prior-candle-low stop, target the first high). |
| `hammer_v2.py` | Big candle → deep retrace → green bottoming-wick candle → bounce, with pullback volume drying up. |
| `runs.py` | Volume-confirmed stair-step runs vs. unconfirmed, by time block. |
| `sketch_data.py` | Data for the Market Context Sketches page: highs by time, recovery height, volume around the low, overlay paths, gap vs. continuation. |
| `case_quality.py` | How many dip "recoveries" were early-premarket, thin or structureless (why the first matrix was misleading). |
| `check_signals.py` | Which at-the-time signals separate dips that recovered. |
| `curls_day.py` | Curl episodes on one day (swing low → advance) for comparison with Justin's arrows. |
| `curl_features.py` | Structure, volume, chop and double-bottom checks on labeled curls. |
| `range_zones.py` | Candle range in cents: momentum vs. chop zones and range inside each labeled curl. |
| `selling_pressure.py` | Red-volume share, heaviest-candle color and wicks on labeled curls (TNON vs. STFS). |
| `push_vs_pull.py` | Pullback volume vs. the push before it, including the fade measure (AMOD). |
| `sr_zones.py` | Support/resistance zones and role flips on one day (SDEV). |
| `rule_unlabeled.py` | What the draft curl rule takes on days Justin has not labeled. |
| `minutes.py`, `day_story.py` | Print one day's one-minute or five-minute candles for a time range. |

## Known issues found during the session

- An early version of the pullback scans measured depth from the impulse candle's own low,
  so every pullback read 100% deep; `hammer_v2.py` is the fixed version and the earlier
  numbers were discarded.
- `dip.py` writes `dip_trades.json`; a second run at a different arm level overwrites it.
- Halts are not handled anywhere; a halt can look like a clean jump.
