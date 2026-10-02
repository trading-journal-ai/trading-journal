"""Big candle -> deep retrace -> green bottoming-wick candle. Version 2: looser wick, bounce-based outcome.

At the time (signal candle and earlier only):
  impulse : green 1-min candle, range >= 3x and volume >= 3x prior-20 medians, +8% or more, $250K+ traded
  pullback: within 3-15 candles, low retraces 50-110% of the impulse range
  wick    : green candle making the pullback low, lower wick >= WICK of its range, close in the top CLOSE of range, $50K+
Hindsight (next 15 minutes): bounce = how much of the retrace it recovered before the signal-candle low broke;
  R = best price before the stop, in units of (entry - signal low).
"""
import json, statistics as st, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
WICK = float(sys.argv[1]) if len(sys.argv) > 1 else 0.4
CLOSE = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6
etm = lambda t: (lambda x: x.hour * 60 + x.minute)(datetime.fromtimestamp(t, timezone.utc).astimezone(ET))
days = json.load(open("data/evals/market-insights/sample-candles.json"))

def bounce(bars, m, s, low):
    entry, stop = bars[s]["c"], bars[s]["l"]
    best = entry
    for k in range(s + 1, len(bars)):
        if m[k] - m[s] > 15 or bars[k]["l"] <= stop: break
        best = max(best, bars[k]["h"])
    return best, (best - entry) / (entry - stop) if entry > stop else 0

rows = []
for day in days:
    bars = sorted(day["candles"], key=lambda c: c["t"]); m = [etm(b["t"]) for b in bars]
    i = 20
    while i < len(bars) - 4:
        b = bars[i]
        mr = st.median(x["h"] - x["l"] for x in bars[i - 20:i]) or 1e-9
        mv = st.median(x["vol"] for x in bars[i - 20:i]) or 1
        if not (b["c"] > b["o"] and b["h"] - b["l"] >= 3 * mr and b["vol"] >= 3 * mv and b["h"] / b["l"] - 1 >= 0.08 and b["vol"] * b["c"] >= 250_000):
            i += 1; continue
        H, span, low_i, done = b["h"], b["h"] - b["l"], None, i
        for k in range(i + 1, min(len(bars), i + 16)):
            x = bars[k]; done = k
            if x["h"] > H: break
            # the pullback low counts candles after the big candle only
            if low_i is None or x["l"] < bars[low_i]["l"]: low_i = k
            depth = (H - bars[low_i]["l"]) / span
            if depth > 1.10: break
            r = x["h"] - x["l"]
            if depth >= 0.5 and k - i >= 3 and low_i == k and x["c"] > x["o"] and r > 0:
                wick = (min(x["o"], x["c"]) - x["l"]) / r
                pos = (x["c"] - x["l"]) / r
                if wick >= WICK and pos >= CLOSE and x["vol"] * x["c"] >= 50_000:
                    pb = bars[i + 1:k]
                    dried = len(pb) >= 3 and st.mean(y["vol"] for y in pb[-3:]) <= 0.5 * pb[0]["vol"]
                    best, R = bounce(bars, m, k, bars[low_i]["l"])
                    retrace = H - x["l"]
                    rows.append(dict(sym=day["symbol"], date=day["date"], t=m[k], depth=depth, dried=dried, R=R,
                                     recovered=(best - x["l"]) / retrace if retrace > 0 else 0, pre7=m[i] < 420,
                                     candles=k - i))
                    break
        i = done + 1

def show(label, s):
    if not s: print(f"  {label:40s} n=0"); return
    print(f"  {label:40s} n={len(s):4d}  bounce 1R+ {100*sum(x['R'] >= 1 for x in s)/len(s):3.0f}%  2R+ {100*sum(x['R'] >= 2 for x in s)/len(s):3.0f}%  "
          f"median R {st.median(x['R'] for x in s):.1f}  recovered half the retrace {100*sum(x['recovered'] >= 0.5 for x in s)/len(s):3.0f}%")
print(f"wick >= {WICK:.0%} of range, close in top {1-CLOSE:.0%}; outcome over the next 15 minutes, stop at the wick low")
show("all bottoming-wick signals", rows)
show("pullback volume dried up", [x for x in rows if x["dried"]])
show("pullback volume did not dry up", [x for x in rows if not x["dried"]])
show("7:00 ET or later", [x for x in rows if not x["pre7"]])
show("retrace 50-80% of the big candle", [x for x in rows if x["depth"] < 0.8])
show("retrace 80-110% (nearly the whole candle)", [x for x in rows if x["depth"] >= 0.8])
print("  STFS Jul 29:", [(f"{x['t']//60}:{x['t']%60:02d}", round(x["R"], 1), round(x["recovered"], 2), x["dried"]) for x in rows if x["sym"] == "STFS" and x["date"] == "2026-07-29"])
