"""For each labeled curl: pullback volume vs the push before it.

top     = highest high in the 15 candles before the curl low (where the pullback started)
push    = the 10 candles ending at the top
pull    = candles after the top through the low
avgRatio   = average pullback volume / average push volume
heavyRatio = heaviest pullback candle / heaviest push candle
fade       = average volume of the last 2 pullback candles / the first pullback candle
"""
import json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
hm = lambda t: datetime.fromtimestamp(t, timezone.utc).astimezone(ET).strftime("%H:%M")
days = {d["id"]: d for d in json.load(open("data/evals/market-insights/curl-days.json"))["days"]}
labels = json.load(open("data/evals/market-insights/labels.json"))["days"]
extra = {"AMOD-2026-10-02": {"1790948160": "strong"}}
print("day        curl          label     avgRatio heavyRatio fade   (pullback vs push volume)")
for day_id, entry in list(labels.items()) + [(k, {"curls": {kk: {"label": v} for kk, v in vv.items()}}) for k, vv in extra.items()]:
    day = days[day_id]; bars = day["bars"]; idx = {b[0]: i for i, b in enumerate(bars)}
    for key, mark in entry["curls"].items():
        c = next(x for x in day["curls"] if x["key"] == key)
        lo = idx[c["lowT"]]
        top = max(range(max(0, lo - 15), lo), key=lambda i: bars[i][2])
        push = bars[max(0, top - 9):top + 1]; pull = bars[top + 1:lo + 1]
        if not pull: continue
        avg = lambda xs: sum(b[5] for b in xs) / len(xs)
        heavy = lambda xs: max(b[5] for b in xs)
        fade = (avg(pull[-2:]) / pull[0][5]) if len(pull) >= 2 and pull[0][5] else None
        print(f"{day['sym']:<5} {day['date']}  {hm(c['lowT'])}->{hm(c['highT'])}  {mark['label']:<9} {avg(pull)/avg(push):7.2f}  {heavy(pull)/heavy(push):9.2f}  {fade if fade is None else round(fade, 2)!s:>5}")
