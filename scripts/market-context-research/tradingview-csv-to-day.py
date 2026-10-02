"""Load a TradingView 1-min CSV export, pick the latest session, convert to the sample format, and summarize."""
import csv, json, sys, collections
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
path, sym = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(open(path)))
cols = list(rows[0].keys())
vol_col = next(c for c in cols if c.lower() == "volume")
by_day = collections.defaultdict(list)
for r in rows:
    t = int(r["time"]); d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    by_day[str(d.date())].append(dict(t=t, o=float(r["open"]), h=float(r["high"]), l=float(r["low"]), c=float(r["close"]), vol=float(r[vol_col] or 0)))
print("columns:", cols)
print("days:", {k: len(v) for k, v in sorted(by_day.items())[-4:]})
date = max(by_day, key=lambda k: (len(by_day[k]) > 100, k))
bars = sorted(by_day[date], key=lambda b: b["t"])
prev = sorted(k for k in by_day if k < date)
pc = sorted(by_day[prev[-1]], key=lambda b: b["t"])
# prior regular close: last bar at or before 16:00 ET on the previous day
def etm(t): d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET); return d.hour * 60 + d.minute
reg = [b for b in pc if etm(b["t"]) < 960]
prior_close = reg[-1]["c"] if reg else pc[-1]["c"]
print("session", date, "bars", len(bars), "prior close", prior_close)
top = sorted(bars, key=lambda b: -b["vol"])[:6]
print("biggest volume candles (ET):")
for b in top:
    rng = b["h"] - b["l"] or 1e-9
    print(f"  {datetime.fromtimestamp(b['t'], timezone.utc).astimezone(ET):%H:%M}  {'G' if b['c'] >= b['o'] else 'R'}  o{b['o']:.2f} h{b['h']:.2f} l{b['l']:.2f} c{b['c']:.2f}  vol {int(b['vol'])}  upper wick {100*(b['h']-max(b['o'],b['c']))/rng:.0f}% of range")
hi = max(bars, key=lambda b: b["h"])
print(f"day high {hi['h']} at {datetime.fromtimestamp(hi['t'], timezone.utc).astimezone(ET):%H:%M} ET")
out = sys.argv[3] if len(sys.argv) > 3 else None
if out:
    json.dump([{"symbol": sym, "date": date, "pc": prior_close, "candles": bars}], open(out, "w"))
    print("wrote", out)
