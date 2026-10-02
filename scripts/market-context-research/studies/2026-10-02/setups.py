"""Two separate setups on top-gainer days, measured against the whole move.

Setup 1 - first pullback: first pop off the flat line (>= +20% from the day low), first pullback
  (>= 25% of the move, starts on a candle after the high candle; a single candle can be the pullback). Outcome: new high within 30 min / later / never / flush (>75%).

Setup 2 - the curl: a LATER pullback (the stock already pulled back once and made a new high),
  measured from the high of day against the whole move (day low before HOD -> HOD), >= 38% deep, above the base.
  Curl = 5 candles since the pullback low with rising lows (<= 1 lower low) and close > EMA 9, still below HOD.
  For each volume requirement X (5-candle avg volume >= X * volume around the low), the first minute that qualifies
  is the entry signal. Outcome: breaks HOD within 30 min; price already recovered at signal; risk to pullback low.
"""
import json, sys, collections, statistics as st
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
VOL_X = [0, 1.5, 2, 3]

def etm(t):
    d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    return d.hour * 60 + d.minute

def ema(vals, n):
    k = 2 / (n + 1); out = []; e = None
    for v in vals:
        e = v if e is None else v * k + e * (1 - k); out.append(e)
    return out

def first_pullback(bars, m):
    base_i = peak_i = 0
    for i in range(1, len(bars)):
        b = bars[i]
        if b["l"] < bars[base_i]["l"]:
            base_i = peak_i = i; continue
        if b["h"] > bars[peak_i]["h"]:
            peak_i = i; continue
        base, H = bars[base_i]["l"], bars[peak_i]["h"]
        if H / base - 1 < 0.20 or b["l"] > H - 0.25 * (H - base):
            continue
        low_i, j, out = i, i, "never"
        while j < len(bars):
            if bars[j]["l"] < bars[low_i]["l"]:
                low_i = j
            if bars[low_i]["l"] < H - 0.75 * (H - base):
                out = "flush"; break
            if bars[j]["h"] > H:
                out = "go_fast" if m[j] - m[low_i] <= 30 else "go_late"; break
            j += 1
        return dict(outcome=out, candles=low_i - peak_i, peak_t=m[peak_i], low_t=m[low_i], H=H, L=bars[low_i]["l"], base=base,
                    depth=(H - bars[low_i]["l"]) / (H - base), reclaim_t=m[j] if out.startswith("go") else None)
    return None

def curls(bars, m):
    e9 = ema([b["c"] for b in bars], 9)
    out = []
    base_i, hod_i = 0, 0
    pullbacks_with_new_high = 0      # how many pullbacks this move already recovered from
    low_i = None                     # pullback low since HOD, when in a pullback
    signals = {}
    for j in range(1, len(bars)):
        b = bars[j]
        base, H = bars[base_i]["l"], bars[hod_i]["h"]
        if b["l"] < base:                       # move broke down: start over
            if low_i is not None and signals:
                out.append(dict(**ctx, signals=signals, broke=None))
            base_i = hod_i = j; low_i = None; signals = {}; pullbacks_with_new_high = 0; continue
        if b["h"] > H:                          # new high of day
            if low_i is not None:
                if signals:
                    for x, s in signals.items():
                        s["broke_min"] = m[j] - s["t"]
                    out.append(dict(**ctx, signals=signals, broke_t=m[j]))
                pullbacks_with_new_high += 1
            hod_i = j; low_i = None; signals = {}; continue
        if H / base - 1 < 0.20:
            continue
        lo_since = min(bars[k]["l"] for k in range(hod_i + 1, j + 1)) if j > hod_i else b["l"]
        if low_i is None:
            if j > hod_i and lo_since <= H - 0.38 * (H - base):
                low_i = min(range(hod_i + 1, j + 1), key=lambda k: bars[k]["l"])
                ctx = dict(H=H, base=base, hod_t=m[hod_i], later=pullbacks_with_new_high >= 1)
            else:
                continue
        if b["l"] < bars[low_i]["l"]:
            low_i = j; signals = {}             # new pullback low resets the curl
        ctx["L"], ctx["low_t"], ctx["depth"] = bars[low_i]["l"], m[low_i], (H - bars[low_i]["l"]) / (H - base)
        if j - low_i < 4:
            continue
        lower = sum(bars[k]["l"] < bars[k - 1]["l"] for k in range(j - 3, j + 1))
        if lower > 1 or b["c"] <= e9[j]:
            continue
        around = bars[max(0, low_i - 2):low_i + 3]
        v_low = sum(x["vol"] for x in around) / len(around)
        vr = (sum(bars[k]["vol"] for k in range(j - 4, j + 1)) / 5) / v_low if v_low else 0
        for x in VOL_X:
            if x not in signals and vr >= x:
                signals[x] = dict(t=m[j], c=b["c"], vr=vr,
                                  recovered=(b["c"] - bars[low_i]["l"]) / (H - bars[low_i]["l"]),
                                  risk=b["c"] / bars[low_i]["l"] - 1)
    return out

def load_sample(S):
    for d in json.load(open(f"{S}/sample_candles_1500.json")):
        bars = sorted(d["candles"], key=lambda c: c["t"])
        if len(bars) >= 30:
            yield d["symbol"], d["date"], bars

if __name__ == "__main__":
    S = sys.argv[1]
    fp = collections.Counter(); n = 0; cl = []; fps = []
    for sym, date, bars in load_sample(S):
        m = [etm(b["t"]) for b in bars]; n += 1
        r = first_pullback(bars, m); fp[r["outcome"] if r else "none"] += 1
        if r: fps.append(r)
        for c in curls(bars, m):
            c["sym"], c["date"] = sym, date; cl.append(c)
    print(f"SETUP 1 - first pullback off the first pop, n={n} gainer-days")
    for k, lab in [("go_fast", "new high within 30 min"), ("go_late", "new high later"), ("never", "held, never higher"), ("flush", "flushed >75%"), ("none", "no qualifying pop/pullback")]:
        print(f"  {100*fp[k]/n:4.0f}%  {lab}")
    for lab, f in [("1 candle", lambda c: c == 1), ("2-3 candles", lambda c: 2 <= c <= 3), ("4+ candles", lambda c: c >= 4)]:
        x = [r for r in fps if f(r["candles"])]
        if x:
            cc = collections.Counter(r["outcome"] for r in x)
            print(f"    pullback {lab:12s} n={len(x):4d}  new high within 30m {100*cc['go_fast']/len(x):3.0f}%  flush {100*cc['flush']/len(x):3.0f}%")
    for lo, hi in [(.25, .38), (.38, .5), (.5, .62), (.62, .75)]:
        x = [r for r in fps if lo <= r["depth"] < hi and r["outcome"] != "flush"]
        if x: print(f"    depth {lo:.0%}-{hi:.0%}: n={len(x):4d}  new high within 30m {100*sum(r['outcome']=='go_fast' for r in x)/len(x):3.0f}%")
    later = [c for c in cl if c["later"]]
    print(f"\nSETUP 2 - curls on a later pullback (after a first pullback already made a new high): {len(later)} on {len({(c['sym'], c['date']) for c in later})} gainer-days")
    print("  volume required at entry -> broke HOD within 30 min | price already recovered toward HOD | risk to pullback low | lead time to break")
    for x in VOL_X:
        s = [c for c in later if x in c["signals"]]
        if not s: continue
        br = [c for c in s if c.get("broke_t") is not None and c["signals"][x]["broke_min"] <= 30]
        print(f"  {'no volume rule' if x == 0 else f'{x}x volume':14s} n={len(s):4d}  broke {100*len(br)/len(s):3.0f}%  "
              f"recovered {100*st.median(c['signals'][x]['recovered'] for c in s):3.0f}%  risk {100*st.median(c['signals'][x]['risk'] for c in s):3.0f}%  "
              f"lead {st.median(c['signals'][x]['broke_min'] for c in br) if br else '-'} min")
    base = [c for c in later if 0 in c["signals"]]
    for lo, hi in [(.38, .5), (.5, .62), (.62, .75), (.75, 1.01)]:
        s = [c for c in base if lo <= c["depth"] < hi]
        if s:
            br = sum(1 for c in s if c.get("broke_t") is not None and c["signals"][0]["broke_min"] <= 30)
            print(f"  depth {lo:.0%}-{hi:.0%}: n={len(s)} broke within 30 min {100*br/len(s):.0f}%")
