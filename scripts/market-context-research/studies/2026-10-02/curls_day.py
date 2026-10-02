"""Find curl episodes in one gainer-day: swing low -> higher lows reclaiming EMA 9 -> advance.

Swings use a reversal threshold (default 6%). A curl is a swing low followed by an up-leg of at
least MIN_LEG, where the first candles off the low make higher lows and close back above EMA 9.
"""
import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
path, sym, date, start, end = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
REV = float(sys.argv[6]) if len(sys.argv) > 6 else 0.06
MIN_LEG = float(sys.argv[7]) if len(sys.argv) > 7 else 0.08
day = next(d for d in json.load(open(path)) if d["symbol"] == sym and d["date"] == date)
etm = lambda t: (lambda x: x.hour * 60 + x.minute)(datetime.fromtimestamp(t, timezone.utc).astimezone(ET))
allb = sorted(day["candles"], key=lambda c: c["t"])
e, ema = None, []
for b in allb:
    e = b["c"] if e is None else b["c"] * 0.2 + e * 0.8; ema.append(e)
idx = [i for i, b in enumerate(allb) if start <= etm(b["t"]) < end]
bars = [allb[i] for i in idx]; e9 = [ema[i] for i in idx]; m = [etm(b["t"]) for b in bars]
# zigzag swings
swings, mode, ext = [], None, 0
for i in range(1, len(bars)):
    if mode in (None, "up"):
        if bars[i]["h"] >= bars[ext]["h"] or mode is None and bars[i]["h"] > bars[ext]["h"]:
            ext = i if mode == "up" or mode is None else ext
        if mode is None:
            mode = "up" if bars[i]["h"] > bars[0]["h"] else "down"; ext = i; continue
        if mode == "up" and bars[i]["l"] <= bars[ext]["h"] * (1 - REV):
            swings.append(("H", ext)); mode, ext = "down", i
    else:
        if bars[i]["l"] <= bars[ext]["l"]: ext = i
        if bars[i]["h"] >= bars[ext]["l"] * (1 + REV):
            swings.append(("L", ext)); mode, ext = "up", i
fmt = lambda i: f"{m[i]//60:02d}:{m[i]%60:02d}"
print(f"{sym} {date}  swings at {REV:.0%} reversal, curls with leg >= {MIN_LEG:.0%}")
n = 0
for k, (kind, i) in enumerate(swings):
    if kind != "L": continue
    nxt = next((j for kk, j in swings[k + 1:] if kk == "H"), None)
    if nxt is None: continue
    low, high = bars[i]["l"], bars[nxt]["h"]
    if high / low - 1 < MIN_LEG: continue
    first = bars[i:i + 4]
    hl = sum(first[q + 1]["l"] >= first[q]["l"] for q in range(len(first) - 1))
    reclaim = next((j for j in range(i, nxt + 1) if bars[j]["c"] > e9[j]), None)
    dollars = sum(b["vol"] * b["c"] for b in bars[i:nxt + 1])
    vol_up = [b["vol"] for b in bars[i:min(nxt + 1, i + 6)]]
    n += 1
    print(f"  {n}. low {low:.2f} @ {fmt(i)} -> high {high:.2f} @ {fmt(nxt)}  +{100*(high/low-1):.0f}% ({100*(high-low):.0f}c)  "
          f"{nxt - i} candles, higher lows {hl}/3, back above EMA9 @ {fmt(reclaim) if reclaim is not None else '-'}, ${dollars/1000:.0f}K traded, first vols {[int(v) for v in vol_up]}")
