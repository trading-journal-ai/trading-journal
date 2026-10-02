"""Selling-pressure measures for a curl: red-volume share, upper wicks, and the rule verdict.

For each detected curl (low -> high) and the 10 candles before its low:
  redShare    share of volume on red candles from 10 candles before the low through the high
  bigRed      the largest-volume candle in that window is red
  topWick     median upper wick as a share of range, green candles in the curl
  rejection   after the high, the share of the curl given back within 5 candles
"""
import importlib.util, json, statistics as st, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
spec = importlib.util.spec_from_file_location("bc", "scripts/market-context-research/build-curl-days.py")
bc = importlib.util.module_from_spec(spec); spec.loader.exec_module(bc)
hm = lambda t: datetime.fromtimestamp(t, timezone.utc).astimezone(ET).strftime("%H:%M")

def rule(c):
    misses = []
    if c["triggerT"] is None: misses.append("no trigger")
    if c["rangeCents"] < 15: misses.append("small candles")
    if (c["expansion"] or 0) < 1.2: misses.append("not expanding")
    if (c["triggerVol"] or 0) < 1.75: misses.append("no volume")
    return ("TAKE" if not misses else "pass") + (f" ({', '.join(misses)})" if misses else "")

def report(day_json, start=None, end=None, only=None):
    day = bc.build_day(day_json)
    bars = sorted(day_json["candles"], key=lambda b: b["t"]); idx = {b["t"]: i for i, b in enumerate(bars)}
    print(f"\n{day['sym']} {day['date']}")
    for c in day["curls"]:
        lo, hi = idx[c["lowT"]], idx[c["highT"]]
        m = bc.etm(c["lowT"])
        if start is not None and not (start <= m < end): continue
        if only and hm(c["lowT"]) not in only: continue
        win = bars[max(0, lo - 10):hi + 1]
        tot = sum(b["vol"] for b in win) or 1
        red = sum(b["vol"] for b in win if b["c"] < b["o"]) / tot
        big = max(win, key=lambda b: b["vol"]); big_red = big["c"] < big["o"]
        greens = [b for b in bars[lo:hi + 1] if b["c"] > b["o"] and b["h"] > b["l"]]
        wick = st.median((b["h"] - b["c"]) / (b["h"] - b["l"]) for b in greens) if greens else 0
        after = bars[hi + 1:hi + 6]
        give = (bars[hi]["h"] - min(b["l"] for b in after)) / (bars[hi]["h"] - bars[lo]["l"]) if after else 0
        print(f"  #{c['n']:<2} {hm(c['lowT'])}->{hm(c['highT'])} +{c['movePct']:>5}%  {c['rangeCents']:>5}c exp {c['expansion']}  trigVol {c['triggerVol']}  "
              f"| red vol {100*red:3.0f}%  biggest candle {'RED' if big_red else 'green'}  top wick {100*wick:3.0f}%  gave back {100*give:3.0f}% in 5  | rule {rule(c)}")

tnon = json.load(open("data/evals/market-insights/tnon-day.json"))[0]
report(tnon, 400, 600)
stfs = next(d for d in json.load(open("data/evals/market-insights/sample-candles.json")) if d["symbol"] == "STFS" and d["date"] == "2026-07-29")
report(stfs, only={"04:38", "05:05", "06:23", "06:58", "05:49", "04:11"})
