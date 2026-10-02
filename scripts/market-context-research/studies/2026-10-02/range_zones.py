"""Candle range in cents: momentum zones vs chop zones, and the range inside each labeled curl."""
import json, statistics as st
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
etm = lambda t: (lambda x: x.hour * 60 + x.minute)(datetime.fromtimestamp(t, timezone.utc).astimezone(ET))
hm = lambda s: int(s[:2]) * 60 + int(s[3:])
lab = json.load(open("data/evals/market-insights/labels.json"))["days"][0]
day = next(d for d in json.load(open("data/evals/market-insights/sample-candles.json")) if d["symbol"] == lab["symbol"] and d["date"] == lab["date"])
bars = [b for b in sorted(day["candles"], key=lambda c: c["t"]) if etm(b["t"]) < 7 * 60 + 15]
m = [etm(b["t"]) for b in bars]; at = {x: i for i, x in enumerate(m)}
cents = [100 * (b["h"] - b["l"]) for b in bars]
print("5-min blocks, median 1-min candle range (cents) and volume")
for start in range(240, 435, 5):
    idx = [i for i in range(len(bars)) if start <= m[i] < start + 5]
    if not idx: continue
    mc = st.median(cents[i] for i in idx); v = sum(bars[i]["vol"] for i in idx)
    zone = "momentum" if mc >= 20 else "chop" if mc < 10 else "in between"
    print(f"  {start//60}:{start%60:02d}  {mc:5.1f}c  {int(v):>8} sh  {'#' * int(mc // 2)}  {zone}")
print("\nlabeled curls: candle range from the low to the high of the curl")
for ep in lab["episodes"]:
    lo, hi = at[hm(ep["low"])], at[hm(ep["high"])]
    seg = cents[lo:hi + 1]; before = cents[max(0, lo - 5):lo]
    print(f"  #{ep['n']} {ep['label']:<10} median {st.median(seg):5.1f}c  largest {max(seg):5.1f}c  | 5 candles before the low: median {st.median(before) if before else 0:5.1f}c")
