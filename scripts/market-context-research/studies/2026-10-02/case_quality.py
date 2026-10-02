"""How many decision cases have the STFS problems?  Uses the full sample candles (not just charted cases)."""
import json, sys
sys.path.insert(0, "scripts/market-context-research")
import importlib.util
spec = importlib.util.spec_from_file_location("bi", "scripts/market-context-research/build-insights.py")
bi = importlib.util.module_from_spec(spec); spec.loader.exec_module(bi)

days = json.load(open("data/evals/market-insights/sample-candles.json"))
rows = []
for day in days:
    bars = sorted(day["candles"], key=lambda c: c["t"])
    if len(bars) < 30: continue
    m = [bi.etm(b["t"]) for b in bars]
    f = bi.first_decision(bars, m)
    if not f: continue
    base_i, hod_i, d = f
    case, _ = bi.case_for(day)
    high, base = bars[hod_i]["h"], bars[base_i]["l"]
    trig_dollars = bars[d]["vol"] * bars[d]["c"]
    lows = [bars[k]["l"] for k in range(hod_i + 1, d)]
    higher_low = bars[d - 1]["l"] > min(lows) if lows else False
    # did price take out the decision stop before reaching the high?
    stop = bars[d - 1]["l"]; stopped_first = case["outcome"]["recovered"] and case["outcome"]["r"] <= -1
    rows.append(dict(rec=case["outcome"]["recovered"], early=m[base_i] < 420 or m[hod_i] < 420,
                     thin=trig_dollars < 50_000, higher_low=higher_low, stopped_first=stopped_first))
n = len(rows); rec = [r for r in rows if r["rec"]]
pct = lambda xs, k: f"{sum(r[k] for r in xs)} ({100*sum(r[k] for r in xs)/len(xs):.0f}%)"
print("cases", n, "| recovered", len(rec))
print("move starts or peaks before 7:00 ET:", pct(rows, "early"), "| among recovered:", pct(rec, "early"))
print("trigger candle under $50K traded:", pct(rows, "thin"), "| among recovered:", pct(rec, "thin"))
print("no higher low into the trigger:", n - sum(r["higher_low"] for r in rows), f"({100*(n-sum(r['higher_low'] for r in rows))/n:.0f}%)")
print("recovered only after the prior-candle-low stop was hit:", pct(rec, "stopped_first"))
clean = [r for r in rows if not r["early"] and not r["thin"] and r["higher_low"]]
cr = [r for r in clean if r["rec"] and not r["stopped_first"]]
print("cases left after: 7:00+ ET, $50K+ trigger, higher low:", len(clean), "| recovered without hitting the stop:", len(cr), f"({100*len(cr)/max(1,len(clean)):.0f}%)")
