"""Apply the draft curl rule (mirrors curlRule in src/lib/marketInsights.ts) to unlabeled days."""
import json, collections
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
hm = lambda t: datetime.fromtimestamp(t, timezone.utc).astimezone(ET).strftime("%H:%M")
days = json.load(open("data/evals/market-insights/curl-days.json"))["days"]
labeled = set(json.load(open("data/evals/market-insights/labels.json"))["days"])
def take(c):
    if c["triggerT"] is None or c["rangeCents"] < 15: return False
    if not ((c["expansion"] or 0) >= 1.2 or c["rangeCents"] >= 25): return False
    if not ((c["triggerVol"] or 0) >= 1.75 or (c["pullbackFade"] is not None and c["pullbackFade"] <= 0.9)): return False
    return not c["heaviestRed"]
tot = took = 0; per_day = collections.Counter(); picks = []
for d in days:
    if d["id"] in labeled: continue
    for c in d["curls"]:
        tot += 1
        if take(c):
            took += 1; per_day[d["id"]] += 1
            if 420 <= int(hm(c["lowT"])[:2]) * 60 + int(hm(c["lowT"])[3:]) < 1200: picks.append((d["sym"], d["date"], c["n"], hm(c["lowT"]), hm(c["highT"]), c["movePct"], c["dollars"]))
print(f"unlabeled days: {len(days) - len(labeled & {d['id'] for d in days})}, curls {tot}, rule takes {took} ({100*took/tot:.0f}%)")
print("takes per day:", sorted(per_day.values(), reverse=True))
picks.sort(key=lambda p: -p[6])
print("largest rule picks from 7:00 ET on (by dollars traded):")
for p in picks[:8]: print(f"  {p[0]} {p[1]} #{p[2]} {p[3]}->{p[4]} +{p[5]}%  ${p[6]/1e6:.1f}M")
