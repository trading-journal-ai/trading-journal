#!/usr/bin/env python3
"""Build the Market Context Insights prototype dataset.

Input: a JSON list of gainer-days, each {"symbol", "date", "pc", "candles": [{t,o,h,l,c,vol}]}
with one-minute candles, and optionally the Server mover list (for gap vs continuation).
Output: one JSON file read by /analytics/momentum-archive/insights.

The page keeps two timelines apart:
  at the time  - measured only from candles up to and including the decision candle;
  hindsight    - what happened afterward (outcome, how high it came back).

Decision moment (one per gainer-day): after the first pop (>= +20% off the day low), the first
pullback reaches 50% of the move; the decision candle is the first one that then closes above the
prior candle's high, before price retakes the first high or breaks the base.

Local files only. Write output under the gitignored data/evals/ directory; never commit it.
"""
import argparse, json, random, statistics as st, collections
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
POP_MIN, ARM, WINDOW, CHART_CASES = 0.20, 0.50, 60, 180


def etm(t):
    d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    return d.hour * 60 + d.minute


def session(minute):
    return "premarket" if minute < 570 else "regular" if minute < 960 else "after-hours"


def first_decision(bars, m):
    """Return indices (base, high, decision) for the first pop's dip trigger, or None."""
    base_i = hod_i = 0
    for i in range(1, len(bars)):
        b = bars[i]
        if b["l"] < bars[base_i]["l"]:
            base_i = hod_i = i
            continue
        if b["h"] > bars[hod_i]["h"]:
            hod_i = i
            continue
        base, high = bars[base_i]["l"], bars[hod_i]["h"]
        if high / base - 1 < POP_MIN or b["l"] > high - 0.25 * (high - base):
            continue
        armed = False
        for k in range(i, len(bars)):
            x = bars[k]
            if x["h"] > high or x["l"] < base:
                return None
            if not armed and x["l"] <= high - ARM * (high - base):
                armed = True
                continue
            if armed and x["c"] > bars[k - 1]["h"] and bars[k - 1]["l"] < x["c"]:
                return base_i, hod_i, k
        return None
    return None


def case_for(day):
    bars = sorted(day["candles"], key=lambda c: c["t"])
    if len(bars) < 30:
        return None, None
    m = [etm(b["t"]) for b in bars]
    found = first_decision(bars, m)
    if not found:
        return None, None
    base_i, hod_i, d = found
    base, high = bars[base_i]["l"], bars[hod_i]["h"]
    move = high - base
    leg = bars[base_i:hod_i + 1]
    pull = bars[hod_i + 1:d + 1]
    low_i = min(range(hod_i + 1, d + 1), key=lambda k: bars[k]["l"])
    greens = [x["c"] - x["o"] for x in leg if x["c"] > x["o"]] or [move]
    big = st.median(greens)
    green_vol = sum(x["vol"] for x in leg if x["c"] > x["o"]) or 1
    pre = [bars[k]["vol"] for k in range(len(bars)) if m[hod_i] - 10 < m[k] <= m[hod_i]]
    pre_avg = (sum(pre) / 10) or 1
    since_low = bars[low_i + 1:d + 1] or [bars[d]]
    entry, stop = bars[d]["c"], bars[d - 1]["l"]
    as_of = {
        "popPct": round(100 * (high / base - 1), 1),
        "depth": round((high - bars[low_i]["l"]) / move, 3),
        "sellVsBuy": round(sum(x["vol"] for x in pull if x["c"] < x["o"]) / green_vol, 3),
        "bigRed": sum(1 for x in pull if x["o"] - x["c"] >= big),
        "triggerVol": round(bars[d]["vol"] / pre_avg, 2),
        "volSinceLow": round(st.mean(x["vol"] for x in since_low) / pre_avg, 2),
        "highClose": round((bars[hod_i]["c"] - base) / move, 3),
        "minutesSinceHigh": m[d] - m[hod_i],
        "stopCents": round(100 * (entry - stop), 1),
    }
    # hindsight: the next 60 minutes after the decision candle
    after = [k for k in range(d + 1, len(bars)) if m[k] - m[d] <= WINDOW]
    hit = next((k for k in after if bars[k]["h"] > high or bars[k]["l"] < base), None)
    recovered = hit is not None and bars[hit]["h"] > high
    stopped = next((k for k in after if bars[k]["l"] <= stop), None)
    target = next((k for k in after if bars[k]["h"] >= high), None)
    if target is not None and (stopped is None or target < stopped):
        r = (high - entry) / (entry - stop)
    elif stopped is not None:
        r = -1.0
    else:
        r = ((bars[after[-1]]["c"] if after else entry) - entry) / (entry - stop)
    outcome = {
        "recovered": recovered,
        "minutesToHigh": (m[hit] - m[d]) if recovered else None,
        "peakAfter": round((max((bars[k]["h"] for k in after), default=entry) - base) / move, 3),
        "r": round(max(-1.0, min(5.0, r)), 2),
    }
    case = {"sym": day["symbol"], "date": day["date"], "pc": day["pc"], "time": m[d],
            "session": session(m[hod_i]), "asOf": as_of, "outcome": outcome}
    chart = {"bars": [[b["t"], b["o"], b["h"], b["l"], b["c"], round(b["vol"])]
                      for k, b in enumerate(bars) if m[hod_i] - 30 <= m[k] <= m[d] + WINDOW],
             "decisionT": bars[d]["t"], "decisionPrice": entry, "stop": stop,
             "highT": bars[hod_i]["t"], "high": high, "base": base}
    return case, chart


def hindsight_profiles(days):
    """Aggregate hindsight views over every first pullback (not only dip-trigger cases)."""
    recover = {"held": [], "flush": []}
    vol = {"recovered": collections.defaultdict(list), "flushed": collections.defaultdict(list)}
    for day in days:
        bars = sorted(day["candles"], key=lambda c: c["t"])
        if len(bars) < 30:
            continue
        m = [etm(b["t"]) for b in bars]
        by_min = {m[i]: i for i in range(len(bars))}
        base_i = hod_i = 0
        for i in range(1, len(bars)):
            b = bars[i]
            if b["l"] < bars[base_i]["l"]:
                base_i = hod_i = i; continue
            if b["h"] > bars[hod_i]["h"]:
                hod_i = i; continue
            base, high = bars[base_i]["l"], bars[hod_i]["h"]
            if high / base - 1 < POP_MIN or b["l"] > high - 0.25 * (high - base):
                continue
            low_i, j, flushed, back = i, i, False, None
            while j < len(bars):
                if bars[j]["l"] < bars[low_i]["l"]:
                    low_i = j
                if bars[low_i]["l"] < high - 0.75 * (high - base):
                    flushed = True; break
                if bars[j]["h"] > high:
                    back = j; break
                j += 1
            move = high - base
            later = [bars[k]["h"] for k in range(len(bars)) if m[low_i] < m[k] <= m[low_i] + 60]
            if later:
                recover["flush" if flushed else "held"].append((max(later) - base) / move)
            pre = [bars[k]["vol"] for k in range(len(bars)) if m[hod_i] - 10 < m[k] <= m[hod_i]]
            pv = sum(pre) / 10 if pre else 0
            group = "flushed" if flushed else "recovered" if back is not None and m[back] - m[low_i] <= 30 else None
            if pv > 0 and group:
                for k in range(-15, 31):
                    idx = by_min.get(m[low_i] + k)
                    vol[group][k].append((bars[idx]["vol"] if idx is not None else 0) / pv)
            break
    out = {"recover": {}, "volume": {}}
    for g, vals in recover.items():
        c = collections.Counter(min(25, max(0, int(v * 10))) for v in vals)
        out["recover"][g] = {"n": len(vals), "pct": [round(100 * c[i] / len(vals), 1) for i in range(26)],
                             "retest": round(100 * sum(v >= 1 for v in vals) / len(vals)),
                             "median": round(st.median(vals), 2)}
    for g, d in vol.items():
        out["volume"][g] = {"n": len(d[0]), "minutes": list(range(-15, 31)),
                            "median": [round(st.median(d[k]), 2) for k in range(-15, 31)]}
    return out


def gap_profile(movers):
    quad, pts = collections.Counter(), []
    rng = random.Random(7)
    for r in movers:
        pm, cont = r.get("premarketGainPercent"), r.get("continuationPercent")
        if pm is None or cont is None:
            continue
        quad["gapDied" if pm >= 20 and cont <= 0 else "gapContinued" if pm >= 20 else "quietPremarket"] += 1
        if rng.random() < 0.25:
            pts.append([round(min(300, max(-20, pm)), 1), round(min(300, max(-100, cont)), 1)])
    return {"n": sum(quad.values()), "quadrants": dict(quad), "points": pts}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--candles", required=True)
    ap.add_argument("--movers")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    days = json.load(open(a.candles))
    cases, charts = [], {}
    for day in days:
        c, chart = case_for(day)
        if c:
            c["id"] = f"{c['sym']}-{c['date']}"
            cases.append(c)
            charts[c["id"]] = chart
    rng = random.Random(11)
    keep = set(rng.sample([c["id"] for c in cases], min(CHART_CASES, len(cases))))
    for c in cases:
        c["hasChart"] = c["id"] in keep
    dates = sorted(d["date"] for d in days)
    out = {
        "meta": {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                 "gainerDays": len(days), "from": dates[0], "to": dates[-1], "cases": len(cases),
                 "decision": "First candle closing above the prior candle's high after the first pullback reaches 50% of the first pop",
                 "window": f"Hindsight outcome: retakes the first high within {WINDOW} minutes"},
        "cases": cases,
        "charts": {k: v for k, v in charts.items() if k in keep},
        "hindsight": hindsight_profiles(days),
    }
    if a.movers:
        out["gap"] = gap_profile(json.load(open(a.movers)))
    with open(a.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{len(cases)} decision cases from {len(days)} gainer-days, {len(keep)} with charts -> {a.out}")


if __name__ == "__main__":
    main()
