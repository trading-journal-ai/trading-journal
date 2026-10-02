"""Support/resistance zones from one-minute candles, with role flips.

1. Swing points: a candle whose high (low) is the highest (lowest) of the K candles on each side.
2. Zones: swing prices within +/- TOL of a zone's running center join it (TOL = max(10c, 1.5% of price)).
3. Each touch is labeled by what price did there: a swing high = resistance, a swing low = support.
4. Breaks: a candle closing more than TOL above (below) the zone. A flip is a zone that acted as
   resistance, broke upward, and later held as support (a swing low inside the zone).
"""
import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
path, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
K = int(sys.argv[4]) if len(sys.argv) > 4 else 3
day = json.load(open(path))[0]
hm = lambda t: datetime.fromtimestamp(t, timezone.utc).astimezone(ET).strftime("%H:%M")
bars = [b for b in sorted(day["candles"], key=lambda c: c["t"]) if start <= hm(b["t"]) <= end]
tol = lambda p: max(0.10, 0.015 * p)
swings = []
for i in range(K, len(bars) - K):
    win = bars[i - K:i + K + 1]
    if bars[i]["h"] == max(b["h"] for b in win): swings.append((i, "R", bars[i]["h"]))
    if bars[i]["l"] == min(b["l"] for b in win): swings.append((i, "S", bars[i]["l"]))
zones = []
for i, kind, price in sorted(swings):
    z = next((z for z in zones if abs(price - z["center"]) <= tol(z["center"])), None)
    if z is None:
        z = {"center": price, "touches": []}; zones.append(z)
    z["touches"].append((i, kind, price))
    z["center"] = sum(p for _, _, p in z["touches"]) / len(z["touches"])
print(f"{day['symbol']} {day['date']} {start}-{end} ET · swing window {K} candles each side · zone tolerance max(10c, 1.5%)")
for z in sorted(zones, key=lambda z: -len(z["touches"])):
    if len(z["touches"]) < 2: continue
    c = z["center"]; t = tol(c)
    seq = []
    broke_up = None
    for i, kind, price in z["touches"]:
        seq.append(f"{hm(bars[i]['t'])} {'res' if kind == 'R' else 'sup'} {price:.2f}")
    # first close above the zone after its first resistance touch
    first_res = next((i for i, k, _ in z["touches"] if k == "R"), None)
    if first_res is not None:
        broke_up = next((j for j in range(first_res + 1, len(bars)) if bars[j]["c"] > c + t), None)
    flip = None
    if broke_up is not None:
        flip = next(((i, p) for i, k, p in z["touches"] if k == "S" and i > broke_up), None)
    lo, hi = c - t, c + t
    print(f"\n zone {lo:.2f}-{hi:.2f} (center {c:.2f}) · {len(z['touches'])} touches")
    print("   " + " · ".join(seq))
    if broke_up is not None:
        print(f"   broke above at {hm(bars[broke_up]['t'])} (close {bars[broke_up]['c']:.2f})" + (f" · FLIP: held as support at {hm(bars[flip[0]]['t'])} ({flip[1]:.2f})" if flip else " · no retest from above yet"))
