"""Score labeled curls on structure, volume, chop and entry, then compare with Justin's labels."""
import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
days = json.load(open("data/evals/market-insights/sample-candles.json"))
labels = json.load(open("data/evals/market-insights/labels.json"))
etm = lambda t: (lambda x: x.hour * 60 + x.minute)(datetime.fromtimestamp(t, timezone.utc).astimezone(ET))
hm = lambda s: int(s[:2]) * 60 + int(s[3:])

for lday in labels["days"]:
    day = next(d for d in days if d["symbol"] == lday["symbol"] and d["date"] == lday["date"])
    bars = sorted(day["candles"], key=lambda c: c["t"]); m = [etm(b["t"]) for b in bars]
    at = {mm: i for i, mm in enumerate(m)}
    e, e9 = None, []
    for b in bars: e = b["c"] if e is None else 0.2 * b["c"] + 0.8 * e; e9.append(e)
    print(f"{lday['symbol']} {lday['date']}")
    print(" #  label       pullback  dbl-bottom  higher-low  HL-run  trigger  vol at trigger  chop(overlap)  above EMA9")
    for ep in lday["episodes"]:
        lo = at[hm(ep["low"])]; hi = at[hm(ep["high"])]
        # pullback into the low: from the highest high in the prior 15 min
        win = [k for k in range(lo) if m[lo] - m[k] <= 15]
        top = max(win, key=lambda k: bars[k]["h"]) if win else lo
        pb_candles, pb_depth = lo - top, (bars[top]["h"] - bars[lo]["l"]) / bars[top]["h"] if win else 0
        # double bottom: an earlier low within 2% of this low in the prior 15 min, with a bounce between
        prior = [k for k in win if k < lo - 1 and abs(bars[k]["l"] / bars[lo]["l"] - 1) <= 0.02]
        dbl = bool(prior) and max(bars[k]["h"] for k in range(prior[-1], lo)) > bars[lo]["l"] * 1.03
        # structure: is this low above the previous swing low (prior 30 min, before the last top)?
        older = [k for k in range(lo) if 0 < m[lo] - m[k] <= 30 and k < top]
        prev_low = min((bars[k]["l"] for k in older), default=None)
        higher_low = prev_low is not None and bars[lo]["l"] > prev_low
        # trigger: first candle after the low that makes a new high over the prior candle and closes green
        trig = next((k for k in range(lo + 1, hi + 1) if bars[k]["h"] > bars[k - 1]["h"] and bars[k]["c"] > bars[k]["o"]), None)
        run = 0
        for k in range(lo + 1, (trig or lo) + 1):
            if bars[k]["l"] >= bars[k - 1]["l"]: run += 1
            else: run = 0
        base_v = sum(bars[k]["vol"] for k in range(max(0, lo - 2), lo + 1)) / 3 or 1
        tv = bars[trig]["vol"] / base_v if trig is not None else 0
        # chop: average overlap of adjacent candle ranges over the 8 candles before the trigger
        seg = list(range(max(1, (trig or lo) - 8), (trig or lo) + 1))
        ov = []
        for k in seg:
            a, b = bars[k - 1], bars[k]
            inter = max(0, min(a["h"], b["h"]) - max(a["l"], b["l"])); smaller = min(a["h"] - a["l"], b["h"] - b["l"])
            if smaller > 0: ov.append(inter / smaller)
        chop = sum(ov) / len(ov) if ov else 0
        above = trig is not None and bars[trig]["c"] > e9[trig]
        tt = f"{m[trig]//60:02d}:{m[trig]%60:02d}" if trig is not None else "none"
        print(f" {ep['n']}  {ep['label']:<11} {pb_candles:>2} c {100*pb_depth:4.0f}%   {'yes' if dbl else 'no ':<10}  {'yes' if higher_low else 'no ':<10}  {run:>4}    {tt:<7}  {tv:5.1f}x          {chop:4.2f}           {'yes' if above else 'no'}")
