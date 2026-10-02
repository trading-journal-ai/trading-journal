"""Score how heavy each pullback's selling was, relative to the up-move into the high.

Up-move (leg): the whole move, from the flat-line base (day low before the move) to the high of day.
Pullback: from that high until a new high (recovered), a break of the move's base (failed), or the close.
Selling metrics, all relative to the leg:
  depth        retrace as % of the leg
  big_red      red candles whose body >= the leg's median green body
  sell_vs_buy  volume on the pullback's red candles / volume on the leg's green candles
  speed        pullback % per minute / leg % per minute
"""
import json, sys, collections, statistics as st
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")

def etm(t):
    d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    return d.hour * 60 + d.minute

def pullbacks(bars, min_move=0.20, min_depth=0.25):
    m = [etm(b["t"]) for b in bars]
    out = []
    base_i = swing_i = hod_i = 0
    j = 1
    while j < len(bars):
        b = bars[j]
        if b["l"] < bars[base_i]["l"]:
            base_i = swing_i = hod_i = j; j += 1; continue
        if b["h"] > bars[hod_i]["h"]:
            hod_i = j; j += 1; continue
        H, swing = bars[hod_i]["h"], bars[swing_i]["l"]
        if H / bars[base_i]["l"] - 1 < min_move or H / swing - 1 < 0.05 or b["l"] > H - min_depth * (H - swing):
            j += 1; continue
        # pullback in progress: follow it to its end
        low_i, k = j, j
        outcome = "never"
        while k < len(bars):
            if bars[k]["l"] < bars[base_i]["l"]:
                outcome = "failed"; break
            if bars[k]["h"] > H:
                outcome = "recovered"; break
            if bars[k]["l"] < bars[low_i]["l"]:
                low_i = k
            k += 1
        leg = bars[swing_i:hod_i + 1]
        pb = bars[hod_i + 1:low_i + 1]
        green_bodies = [x["c"] - x["o"] for x in leg if x["c"] > x["o"]] or [H - swing]
        big = st.median(green_bodies)
        reds = [x for x in pb if x["c"] < x["o"]]
        g_vol = sum(x["vol"] for x in leg if x["c"] > x["o"]) or 1
        leg_min = max(1, m[hod_i] - m[swing_i]); pb_min = max(1, m[low_i] - m[hod_i])
        out.append(dict(
            hod_t=m[hod_i], low_t=m[low_i], H=H, L=bars[low_i]["l"], swing=swing, outcome=outcome,
            rec_min=(m[k] - m[low_i]) if outcome == "recovered" else None,
            depth=(H - bars[low_i]["l"]) / (H - swing), candles=low_i - hod_i,
            big_red=sum(1 for x in reds if x["o"] - x["c"] >= big),
            sell_vs_buy=sum(x["vol"] for x in reds) / g_vol,
            speed=((H / bars[low_i]["l"] - 1) / pb_min) / ((H / swing - 1) / leg_min),
            first=swing_i == base_i))
        if outcome != "recovered":
            if outcome == "failed":
                base_i = swing_i = hod_i = k; j = k + 1; continue
            break
        hod_i = k; j = k + 1
    return out

def heavy(p):
    """Heavy selling: deep, several big red candles, and real selling volume vs the leg's buying."""
    return p["depth"] >= 0.5 and p["big_red"] >= 3 and p["sell_vs_buy"] >= 0.5

def load(S):
    for d in json.load(open(f"{S}/sample_candles_1500.json")):
        bars = sorted(d["candles"], key=lambda c: c["t"])
        if len(bars) >= 30:
            yield d["symbol"], d["date"], bars

if __name__ == "__main__":
    S = sys.argv[1]
    ps = []
    for sym, date, bars in load(S):
        for p in pullbacks(bars):
            p["sym"], p["date"] = sym, date; ps.append(p)
    json.dump(ps, open(f"{S}/selling_pullbacks.json", "w"))
    def fast(p, mins=30): return p["outcome"] == "recovered" and p["rec_min"] <= mins
    def row(lab, s):
        if not s: return
        print(f"  {lab:34s} n={len(s):5d}  new high <=30m {100*sum(fast(p) for p in s)/len(s):3.0f}%  <=60m {100*sum(fast(p,60) for p in s)/len(s):3.0f}%  failed {100*sum(p['outcome']=='failed' for p in s)/len(s):3.0f}%")
    print(f"pullbacks: {len(ps)} on {len({(p['sym'], p['date']) for p in ps})} gainer-days")
    print("by depth (retrace of the up-move into the high):")
    for lo, hi in [(.25, .38), (.38, .5), (.5, .62), (.62, .75), (.75, 1.01), (1.01, 99)]:
        row(f"{lo:.0%}-{hi:.0%}" if hi < 99 else ">100% (below the swing low)", [p for p in ps if lo <= p["depth"] < hi])
    print("by big red candles (body >= the up-move's median green body):")
    for lo, hi in [(0, 1), (1, 3), (3, 5), (5, 999)]:
        row(f"{lo}-{hi-1}" if hi < 999 else f"{lo}+", [p for p in ps if lo <= p["big_red"] < hi])
    print("by selling volume (red-candle volume in the pullback / green-candle volume in the up-move):")
    for lo, hi in [(0, .25), (.25, .5), (.5, 1), (1, 999)]:
        row(f"{lo}-{hi}x" if hi < 999 else f"{lo}x+ (sold more than was bought)", [p for p in ps if lo <= p["sell_vs_buy"] < hi])
    print("heavy selling (depth >=50%, 3+ big red, sell volume >=0.5x buy):")
    row("heavy", [p for p in ps if heavy(p)])
    row("not heavy", [p for p in ps if not heavy(p)])
    print("by quarter: share of pullbacks with heavy selling, and how those recovered")
    q = collections.defaultdict(list)
    for p in ps:
        y, mo = p["date"][:4], int(p["date"][5:7]); q[f"{y}-Q{(mo-1)//3+1}"].append(p)
    for k in sorted(q):
        s = q[k]; h = [p for p in s if heavy(p)]
        print(f"  {k}  pullbacks={len(s):4d}  heavy {100*len(h)/len(s):3.0f}%  heavy->new high <=60m {100*sum(fast(p,60) for p in h)/max(1,len(h)):3.0f}% (n={len(h)})  all->new high <=60m {100*sum(fast(p,60) for p in s)/len(s):3.0f}%")
