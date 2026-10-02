"""Print one gainer-day as 5-min bars, plus clean stair-step runs and swing legs on the 1-min chart."""
import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
sym, date, start, end = sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
day = next(d for d in json.load(open(sys.argv[1])) if d["symbol"] == sym and d["date"] == date)
etm = lambda t: (lambda x: x.hour * 60 + x.minute)(datetime.fromtimestamp(t, timezone.utc).astimezone(ET))
bars = [dict(b, m=etm(b["t"])) for b in sorted(day["candles"], key=lambda c: c["t"]) if start <= etm(b["t"]) < end]
print(f"{sym} {date} prior close {day['pc']}")
g = {}
for b in bars:
    k = b["m"] // 5 * 5
    if k not in g: g[k] = dict(o=b["o"], h=b["h"], l=b["l"], c=b["c"], v=b["vol"])
    else: x = g[k]; x["h"] = max(x["h"], b["h"]); x["l"] = min(x["l"], b["l"]); x["c"] = b["c"]; x["v"] += b["vol"]
print("5-min  open   high   low    close  volume   $vol    gain vs prior close (high)")
for k in sorted(g):
    x = g[k]
    print(f"{k//60:02d}:{k%60:02d}  {x['o']:.2f}  {x['h']:.2f}  {x['l']:.2f}  {x['c']:.2f}  {int(x['v']):8d}  ${x['v']*x['c']/1000:6.0f}K  {100*(x['h']/day['pc']-1):+.0f}%  {'G' if x['c']>=x['o'] else 'R'}")
# clean stair-step runs: 3+ consecutive 1-min candles with higher low and higher close, contiguous minutes
print("\n1-min stair-step runs (3+ higher-low/higher-close candles):")
i = 1
while i < len(bars):
    j = i
    while j < len(bars) and bars[j]["m"] - bars[j-1]["m"] == 1 and bars[j]["l"] >= bars[j-1]["l"] and bars[j]["c"] > bars[j-1]["c"]:
        j += 1
    if j - i >= 3:
        a, z = bars[i-1], bars[j-1]
        vol = sum(b["vol"] for b in bars[i-1:j]); d = vol * z["c"]
        print(f"  {a['m']//60:02d}:{a['m']%60:02d}-{z['m']//60:02d}:{z['m']%60:02d}  {a['l']:.2f} -> {z['h']:.2f} ({100*(z['h']/a['l']-1):+.1f}%, {100*(z['h']-a['l']):.0f}c)  {j-i+1} candles  ${d/1000:.0f}K traded")
        i = j
    else:
        i += 1
