"""Data for the visualization sketches. Local files only; no Trading Server or provider calls."""
import json, sys, random, statistics as st, collections
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
sys.argv = ["x", "."]
sys.path.insert(0, ".")
from setups import load_sample, first_pullback, etm

ET = ZoneInfo("America/New_York")
random.seed(5)

def q(vals, p):
    v = sorted(vals); return v[min(len(v) - 1, int(p * (len(v) - 1)))] if v else None

PRE, POST = 20, 60
groups = {"fast": [], "late": [], "flush": []}
recover = {"held": [], "flush": []}
vol = {"fast": collections.defaultdict(list), "flush": collections.defaultdict(list)}
for sym, date, bars in load_sample("."):
    m = [etm(b["t"]) for b in bars]
    r = first_pullback(bars, m)
    if not r or r["outcome"] == "never" and False:
        continue
    if not r:
        continue
    H, base = r["H"], r["base"]
    span = H - base
    if span <= 0:
        continue
    by_min = {m[i]: i for i in range(len(bars))}
    pk, lo = r["peak_t"], r["low_t"]
    # price path aligned at the first high, scaled base=0 high=1, forward-filled
    path, last = [], None
    first_i = next((i for i in range(len(bars)) if m[i] >= pk - PRE), 0)
    last = (bars[first_i]["c"] - base) / span
    for k in range(-PRE, POST + 1):
        i = by_min.get(pk + k)
        if i is not None:
            last = (bars[i]["c"] - base) / span
        path.append(round(max(-0.5, min(2.5, last)), 3))
    g = {"go_fast": "fast", "go_late": "late", "never": "late", "flush": "flush"}[r["outcome"]]
    groups[g].append(path)
    # how high it came back within 60 min of the pullback low
    after = [bars[i]["h"] for i in range(len(bars)) if lo < m[i] <= lo + 60]
    if after:
        recover["flush" if g == "flush" else "held"].append((max(after) - base) / span)
    # volume around the pullback low, relative to the 10 minutes before the first high
    leg = [bars[i]["vol"] for i in range(len(bars)) if pk - 10 < m[i] <= pk]
    lv = sum(leg) / 10 if leg else 0
    if lv > 0 and g in vol:
        for k in range(-15, 31):
            i = by_min.get(lo + k)
            vol[g][k].append((bars[i]["vol"] if i is not None else 0) / lv)

out = {"overlay": {}, "lines": {}, "recover": {}, "vol": {}}
for g, paths in groups.items():
    out["overlay"][g] = {"n": len(paths), "p25": [], "p50": [], "p75": []}
    for k in range(PRE + POST + 1):
        col = [p[k] for p in paths]
        for key, p in (("p25", .25), ("p50", .5), ("p75", .75)):
            out["overlay"][g][key].append(round(q(col, p), 3))
    out["lines"][g] = random.sample(paths, min(18, len(paths)))
bins = [round(0.0 + 0.1 * i, 1) for i in range(26)]
for g, vals in recover.items():
    c = collections.Counter(min(25, max(0, int(v * 10))) for v in vals)
    out["recover"][g] = {"n": len(vals), "pct": [round(100 * c[i] / len(vals), 1) for i in range(26)],
                         "retest": round(100 * sum(v >= 1 for v in vals) / len(vals)),
                         "median": round(st.median(vals), 2)}
out["recover"]["bins"] = bins
for g, d in vol.items():
    out["vol"][g] = {"n": len(next(iter(d.values()))), "p50": [round(st.median(d[k]), 2) for k in range(-15, 31)]}

# time of day for highs, from the full gainer list
movers = json.load(open("movers.json"))
hi = collections.Counter()
for r in movers:
    h = r["evidence"].get("highAt")
    if not h: continue
    t = datetime.fromisoformat(h.replace("Z", "+00:00")).astimezone(ET)
    hi[(t.hour * 60 + t.minute) // 15 * 15] += 1
tot = sum(hi.values())
out["highs"] = [round(100 * hi[mm] / tot, 2) for mm in range(240, 1200, 15)]
out["highs_n"] = tot

# gap vs continuation, from the full gainer list
pts, quad = [], collections.Counter()
for r in movers:
    pm, cont = r.get("premarketGainPercent"), r.get("continuationPercent")
    if pm is None or cont is None: continue
    if pm >= 20:
        quad["gap_go" if cont > 0 else "gap_die"] += 1
    else:
        quad["quiet_pm"] += 1
    if random.random() < 0.3:
        pts.append([round(min(300, max(-20, pm)), 1), round(min(300, max(-100, cont)), 1)])
out["gap"] = {"pts": pts, "quad": quad, "n": sum(quad.values())}
json.dump(out, open("sketch_data.json", "w"))
print({g: out["overlay"][g]["n"] for g in groups}, {g: (out["recover"][g]["n"], out["recover"][g]["retest"], out["recover"][g]["median"]) for g in recover},
      {g: out["vol"][g]["n"] for g in vol}, "highs", tot, "gap", dict(quad), "pts", len(pts))
print("vol fast", out["vol"]["fast"]["p50"][10:25]); print("vol flush", out["vol"]["flush"]["p50"][10:25])
print("overlay fast p50", out["overlay"]["fast"]["p50"][15:45:3]); print("overlay flush p50", out["overlay"]["flush"]["p50"][15:45:3])
