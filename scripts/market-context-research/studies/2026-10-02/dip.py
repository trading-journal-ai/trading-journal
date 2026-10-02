"""Dip trade on the FIRST pullback after the first pop, simulated as it would have looked live.

Move: flat-line base (day low before the move) -> first high (>= +20%).
Arm: the first pullback reaches ARM of the move (default 50%).
Entry: first candle after arming that closes above the prior candle's high; entry at that close.
Stop: the prior candle's low (structural prev-candle-low stop). If the entry candle's own low is lower, it's still the prior low.
Target: retest of the first high. Outcome decided bar by bar within 60 min; a bar touching both = stop (conservative).
One attempt per pullback, plus a second attempt if the first stops out (before the pullback breaks the base).
Also: after a dip that retakes the first high, does it break out or just retest?
"""
import json, sys, collections, statistics as st
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
ARM = float(sys.argv[2]) if len(sys.argv) > 2 else 0.50

def etm(t):
    d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    return d.hour * 60 + d.minute

def first_pop(bars):
    """Return (base_i, hod_i, arm_i) for the first pop whose first pullback reaches ARM, else None."""
    base_i = hod_i = 0
    for i in range(1, len(bars)):
        b = bars[i]
        if b["l"] < bars[base_i]["l"]:
            base_i = hod_i = i; continue
        if b["h"] > bars[hod_i]["h"]:
            hod_i = i; continue
        base, H = bars[base_i]["l"], bars[hod_i]["h"]
        if H / base - 1 < 0.20:
            continue
        if b["l"] <= H - 0.25 * (H - base):          # first real pullback has started
            k = i
            while k < len(bars) and bars[k]["h"] <= H:
                if bars[k]["l"] <= H - ARM * (H - base):
                    return base_i, hod_i, k
                if bars[k]["l"] < base:
                    return None
                k += 1
            return None                               # first pullback was shallower than ARM
    return None

def attempt(bars, m, start, H, base, deadline_min=60):
    """Find the entry after `start`; return a trade dict or None."""
    for e in range(max(start, 1), len(bars)):
        if bars[e]["h"] > H or bars[e]["l"] < base:
            return None                               # pullback ended before an entry triggered
        if bars[e]["c"] > bars[e - 1]["h"]:
            entry, stop = bars[e]["c"], bars[e - 1]["l"]
            if stop >= entry:
                continue
            for x in range(e + 1, len(bars)):
                if m[x] - m[e] > deadline_min:
                    return dict(e=e, x=x, entry=entry, stop=stop, res="timeout", r=(bars[x - 1]["c"] - entry) / (entry - stop))
                if bars[x]["l"] <= stop:
                    return dict(e=e, x=x, entry=entry, stop=stop, res="stopped", r=-1.0)
                if bars[x]["h"] >= H:
                    return dict(e=e, x=x, entry=entry, stop=stop, res="target", r=(H - entry) / (entry - stop))
            return dict(e=e, x=len(bars) - 1, entry=entry, stop=stop, res="timeout", r=(bars[-1]["c"] - entry) / (entry - stop))
    return None

if __name__ == "__main__":
    S = sys.argv[1]
    data = json.load(open(f"{S}/sample_candles_1500.json"))
    n_days = 0; armed = 0; trades = []; retake = []; eventually = 0
    for d in data:
        bars = sorted(d["candles"], key=lambda c: c["t"])
        if len(bars) < 30: continue
        n_days += 1
        fp = first_pop(bars)
        if not fp: continue
        armed += 1
        base_i, hod_i, arm_i = fp
        m = [etm(b["t"]) for b in bars]
        base, H = bars[base_i]["l"], bars[hod_i]["h"]
        # did it eventually retake the first high (before breaking the base)?
        rk = next((k for k in range(arm_i, len(bars)) if bars[k]["h"] > H or bars[k]["l"] < base), None)
        if rk is not None and bars[rk]["h"] > H:
            eventually += 1
            fut = [k for k in range(rk, len(bars)) if m[k] - m[rk] <= 30]
            ext = max(bars[k]["h"] for k in fut) / H - 1
            back_below = any(bars[k]["c"] < H for k in fut if m[k] - m[rk] <= 15)
            retake.append(dict(ext=ext, back_below=back_below, mins=m[rk] - m[arm_i]))
        t1 = attempt(bars, m, arm_i + 1, H, base)
        if t1:
            t1["n"] = 1; t1.update(sym=d["symbol"], date=d["date"], pc=d["pc"], tod=m[hod_i]); trades.append(t1)
            if t1["res"] == "stopped":
                t2 = attempt(bars, m, t1["x"] + 1, H, base)
                if t2:
                    t2["n"] = 2; t2.update(sym=d["symbol"], date=d["date"], pc=d["pc"], tod=m[hod_i]); trades.append(t2)
    print(f"gainer-days {n_days}; first pullback reached {ARM:.0%} of the first pop on {armed} ({100*armed/n_days:.0f}%)")
    print(f"  of those, retook the first high before breaking the base: {eventually} ({100*eventually/armed:.0f}%)")
    if retake:
        print(f"  after retaking it: median minutes from arm to retake {st.median(r['mins'] for r in retake)}; "
              f"median extension above the old high in the next 30 min +{100*st.median(r['ext'] for r in retake):.0f}%; "
              f"closed back below the old high within 15 min {100*sum(r['back_below'] for r in retake)/len(retake):.0f}%")
        for lo, hi, lab in [(0, .03, "<3% (just a retest)"), (.03, .10, "3-10%"), (.10, 9, "10%+ (real breakout)")]:
            print(f"    extension {lab}: {100*sum(lo <= r['ext'] < hi for r in retake)/len(retake):.0f}%")
    for k in (1, 2):
        s = [t for t in trades if t["n"] == k]
        if not s: continue
        c = collections.Counter(t["res"] for t in s)
        tg = [t["r"] for t in s if t["res"] == "target"]
        print(f"  dip entry attempt {k}: n={len(s)}  target (retest of high) {100*c['target']/len(s):.0f}%  stopped {100*c['stopped']/len(s):.0f}%  timeout {100*c['timeout']/len(s):.0f}%"
              f"  | median R when target hit {st.median(tg):.1f}  | avg R per attempt {sum(t['r'] for t in s)/len(s):+.2f}")
    s = [t for t in trades if t["n"] == 1 and 1 <= t["pc"] <= 20]
    if s:
        stops = sorted(t["entry"] - t["stop"] for t in s)
        print(f"  $1-$20 names: stop distance median {100*st.median(stops):.0f}c (middle half {100*stops[len(stops)//4]:.0f}-{100*stops[3*len(stops)//4]:.0f}c); "
              f"share with stop <= 20c {100*sum(x <= .20 for x in stops)/len(stops):.0f}%")
        tight = [t for t in s if t["entry"] - t["stop"] <= .20]
        if tight:
            c = collections.Counter(t["res"] for t in tight)
            print(f"    stop <= 20c: n={len(tight)} target {100*c['target']/len(tight):.0f}% stopped {100*c['stopped']/len(tight):.0f}% avg R {sum(t['r'] for t in tight)/len(tight):+.2f}")
    def blk(x): return "premarket" if x < 570 else "regular" if x < 960 else "after-hours"
    for b in ("premarket", "regular", "after-hours"):
        s = [t for t in trades if t["n"] == 1 and blk(t["tod"]) == b]
        if s:
            c = collections.Counter(t["res"] for t in s)
            print(f"  first pop high in {b:11s}: n={len(s):4d} target {100*c['target']/len(s):3.0f}% stopped {100*c['stopped']/len(s):3.0f}% avg R {sum(t['r'] for t in s)/len(s):+.2f}")
    json.dump(trades, open(f"{S}/dip_trades.json", "w"))
