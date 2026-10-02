#!/usr/bin/env python3
"""Build the curl-labeling dataset for /analytics/momentum-archive/insights (Label curls).

Input: the same gainer-day candle sample as build-insights.py ({symbol, date, pc, candles[{t,o,h,l,c,vol}]}).
Output: data/evals/market-insights/curl-days.json (gitignored).

For each selected day it detects curl episodes on one-minute candles and records measures that a
labeler (Justin) judges by eye. The keep/skip rule itself lives in src/lib/marketInsights.ts so its
thresholds can change without rebuilding data.

Curl episode: a swing low (zigzag pivots at a REV reversal) followed by the next swing high at least
MIN_LEG above it, over 2+ candles.
Measures (all from candles at or before the time named):
  rangeCents   median one-minute candle range from the low to the high of the curl, in cents
  rangeBefore  median range of the 5 candles before the low
  expansion    rangeCents / rangeBefore
  trigger      first candle after the low that makes a higher high than the prior candle and closes green
  triggerVol   trigger volume / average volume of the 3 candles ending at the low
  higherLow    the low is above the previous swing low (within 60 minutes)
  doubleBottom an earlier candle in the pullback reached within 1.5% of the low, with a 3%+ bounce between
  zone         5-minute block at the trigger: momentum (median range >= 20c), chop (< 10c) or between
  redShare     share of volume on red candles, from 10 candles before the low through the high
  heaviestRed  the largest-volume candle in that window closed red (selling won the biggest fight)
  pullbackFade average volume of the last 2 pullback candles / the first (under 1 = selling drying up);
               the pullback starts at the highest high in the 15 candles before the low
  pullVsPush   heaviest pullback candle / heaviest candle in the 10-candle push before it

Extra labeled days (for example a TradingView CSV converted to the same format) can be added with
--extra; they are placed right after the seed day.
"""
import argparse, json, statistics as st
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ET = ZoneInfo("America/New_York")
REVERSALS, MIN_LEG, DAYS = (0.06, 0.035), 0.10, 30
REV = REVERSALS[0]
SEED_DAYS = [("STFS", "2026-07-29")]


def etm(t):
    d = datetime.fromtimestamp(t, timezone.utc).astimezone(ET)
    return d.hour * 60 + d.minute


def pivots(bars):
    """Zigzag swing points: ('L'|'H', index), alternating."""
    out, mode, hi_i, lo_i = [], None, 0, 0
    for i in range(1, len(bars)):
        if bars[i]["h"] > bars[hi_i]["h"]: hi_i = i
        if bars[i]["l"] < bars[lo_i]["l"]: lo_i = i
        if mode in (None, "up") and bars[i]["l"] <= bars[hi_i]["h"] * (1 - REV) and hi_i < i:
            if mode is None: out.append(("L", lo_i if lo_i < hi_i else 0))
            out.append(("H", hi_i)); mode = "down"; lo_i = i
        elif mode in (None, "down") and bars[i]["h"] >= bars[lo_i]["l"] * (1 + REV) and lo_i < i:
            if mode is None and hi_i < lo_i: out.append(("H", hi_i))
            out.append(("L", lo_i)); mode = "up"; hi_i = i
    return out


def zones(bars, m):
    blocks = {}
    for i, b in enumerate(bars):
        blocks.setdefault(m[i] // 5 * 5, []).append(i)
    out = []
    for start in sorted(blocks):
        idx = blocks[start]
        cents = st.median(100 * (bars[i]["h"] - bars[i]["l"]) for i in idx)
        out.append({"start": start, "medianCents": round(cents, 1), "volume": int(sum(bars[i]["vol"] for i in idx)),
                    "zone": "momentum" if cents >= 20 else "chop" if cents < 10 else "between"})
    return out


def curls(bars, m, zone_by_start):
    """Curls at two swing sizes, so a curl nested inside a larger swing (a higher low) is still found."""
    global REV
    found, seen = [], set()
    for rev in REVERSALS:
        REV = rev
        for c in curls_at(bars, m, zone_by_start):
            if c["key"] not in seen:
                seen.add(c["key"]); found.append(c)
    return sorted(found, key=lambda c: c["lowT"])


def curls_at(bars, m, zone_by_start):
    piv = pivots(bars)
    out = []
    lows = [(k, i) for k, (kind, i) in enumerate(piv) if kind == "L"]
    for pos, (k, lo) in enumerate(lows):
        hi = next((i for kind, i in piv[k + 1:] if kind == "H"), None)
        if hi is None or hi - lo < 2:
            continue
        low, high = bars[lo]["l"], bars[hi]["h"]
        if high / low - 1 < MIN_LEG:
            continue
        seg = [100 * (b["h"] - b["l"]) for b in bars[lo:hi + 1]]
        before = [100 * (b["h"] - b["l"]) for b in bars[max(0, lo - 5):lo]]
        range_c = st.median(seg); range_b = st.median(before) if before else range_c
        trig = next((i for i in range(lo + 1, hi + 1) if bars[i]["h"] > bars[i - 1]["h"] and bars[i]["c"] > bars[i]["o"]), None)
        base_v = sum(b["vol"] for b in bars[max(0, lo - 2):lo + 1]) / len(bars[max(0, lo - 2):lo + 1]) or 1
        prev_low = next((bars[i]["l"] for kind, i in reversed(piv[:k]) if kind == "L" and m[lo] - m[i] <= 60), None)
        prev_high = next((i for kind, i in reversed(piv[:k]) if kind == "H"), None)
        pull = range(prev_high + 1 if prev_high is not None else max(0, lo - 15), lo - 1)
        dbl = False
        for j in pull:
            if abs(bars[j]["l"] / low - 1) <= 0.015 and max(b["h"] for b in bars[j:lo]) >= bars[j]["l"] * 1.03:
                dbl = True; break
        zt = (m[trig] if trig is not None else m[lo]) // 5 * 5
        # selling pressure: the pullback into the low (10 candles) through the curl high
        win = bars[max(0, lo - 10):hi + 1]
        win_vol = sum(b["vol"] for b in win) or 1
        heaviest = max(win, key=lambda b: b["vol"])
        # pullback vs push: the pullback starts at the highest high in the 15 candles before the low
        top = max(range(max(0, lo - 15), lo), key=lambda i: bars[i]["h"]) if lo > 0 else lo
        pull_bars, push_bars = bars[top + 1:lo + 1], bars[max(0, top - 9):top + 1]
        fade = (sum(b["vol"] for b in pull_bars[-2:]) / 2) / pull_bars[0]["vol"] if len(pull_bars) >= 2 and pull_bars[0]["vol"] else None
        heavy_ratio = max(b["vol"] for b in pull_bars) / max(b["vol"] for b in push_bars) if pull_bars and push_bars and max(b["vol"] for b in push_bars) else None
        out.append({
            "key": str(bars[lo]["t"]),
            "lowT": bars[lo]["t"], "highT": bars[hi]["t"], "low": low, "high": high,
            "movePct": round(100 * (high / low - 1), 1), "candles": hi - lo,
            "rangeCents": round(range_c, 1), "rangeBefore": round(range_b, 1),
            "expansion": round(range_c / range_b, 2) if range_b > 0 else None,
            "triggerT": bars[trig]["t"] if trig is not None else None,
            "triggerPrice": bars[trig]["c"] if trig is not None else None,
            "triggerVol": round(bars[trig]["vol"] / base_v, 2) if trig is not None else None,
            "higherLow": prev_low is not None and low > prev_low,
            "doubleBottom": dbl,
            "zone": zone_by_start.get(zt, "between"),
            "redShare": round(sum(b["vol"] for b in win if b["c"] < b["o"]) / win_vol, 3),
            "heaviestRed": heaviest["c"] < heaviest["o"],
            "pullbackFade": round(fade, 2) if fade is not None else None,
            "pullVsPush": round(heavy_ratio, 2) if heavy_ratio is not None else None,
            "dollars": int(sum(b["vol"] * b["c"] for b in bars[lo:hi + 1])),
        })
    return out


SWING_K = 3


def zone_tolerance(price):
    """Zone half-width: 10 cents, or 1.5% of price when that is larger."""
    return max(0.10, 0.015 * price)


def price_zones(bars):
    """Candidate support/resistance zones from swing points, with breaks and role flips.

    Swing high (low): the highest high (lowest low) of SWING_K candles on each side. Swings within the
    zone tolerance of a zone's running center join it. A zone needs 2+ touches. A break is a close beyond
    the zone edge; a flip is resistance that broke upward and later held as support (or the reverse).
    """
    swings = []
    for i in range(SWING_K, len(bars) - SWING_K):
        win = bars[i - SWING_K:i + SWING_K + 1]
        if bars[i]["h"] == max(b["h"] for b in win): swings.append((i, "resistance", bars[i]["h"]))
        if bars[i]["l"] == min(b["l"] for b in win): swings.append((i, "support", bars[i]["l"]))
    groups = []
    for i, kind, price in sorted(swings):
        g = next((g for g in groups if abs(price - g["center"]) <= zone_tolerance(g["center"])), None)
        if g is None:
            g = {"center": price, "touches": []}; groups.append(g)
        g["touches"].append((i, kind, price))
        g["center"] = sum(p for _, _, p in g["touches"]) / len(g["touches"])
    out = []
    for g in groups:
        if len(g["touches"]) < 2:
            continue
        c, tol = g["center"], zone_tolerance(g["center"])
        kinds = [k for _, k, _ in g["touches"]]
        role = "resistance" if kinds.count("resistance") > kinds.count("support") else "support"
        first_res = next((i for i, k, _ in g["touches"] if k == "resistance"), None)
        broke_up = next((j for j in range(first_res + 1, len(bars)) if bars[j]["c"] > c + tol), None) if first_res is not None else None
        flip = next((i for i, k, _ in g["touches"] if k == "support" and broke_up is not None and i > broke_up), None)
        if flip is None:
            first_sup = next((i for i, k, _ in g["touches"] if k == "support"), None)
            broke_dn = next((j for j in range(first_sup + 1, len(bars)) if bars[j]["c"] < c - tol), None) if first_sup is not None else None
            flip_dn = next((i for i, k, _ in g["touches"] if k == "resistance" and broke_dn is not None and i > broke_dn), None)
        else:
            broke_dn = flip_dn = None
        out.append({
            "id": f"{round(c, 2)}-{bars[g['touches'][0][0]]['t']}",
            "low": round(c - tol, 2), "high": round(c + tol, 2), "center": round(c, 3),
            "role": "flip" if flip is not None or flip_dn is not None else role,
            "touches": [{"t": bars[i]["t"], "kind": k, "price": p} for i, k, p in g["touches"]],
            "brokeT": bars[broke_up]["t"] if broke_up is not None else bars[broke_dn]["t"] if flip_dn is not None else None,
            "flipT": bars[flip]["t"] if flip is not None else bars[flip_dn]["t"] if flip_dn is not None else None,
        })
    return sorted(out, key=lambda z: z["center"])


def build_day(day):
    bars = sorted(day["candles"], key=lambda c: c["t"])
    m = [etm(b["t"]) for b in bars]
    zs = zones(bars, m)
    zone_by_start = {z["start"]: z["zone"] for z in zs}
    cs = curls(bars, m, zone_by_start)
    for n, c in enumerate(cs, 1):
        c["n"] = n
    return {"id": f"{day['symbol']}-{day['date']}", "sym": day["symbol"], "date": day["date"], "pc": day["pc"],
            "bars": [[b["t"], b["o"], b["h"], b["l"], b["c"], round(b["vol"])] for b in bars],
            "zones": zs, "priceZones": price_zones(bars), "curls": cs}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--candles", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--days", type=int, default=DAYS)
    ap.add_argument("--extra", nargs="*", default=[], help="Additional day files in the sample format, kept regardless of filters")
    a = ap.parse_args()
    sample = json.load(open(a.candles))
    built = []
    extra = [d for path in a.extra for d in json.load(open(path))]
    seeds = [d for d in sample if (d["symbol"], d["date"]) in SEED_DAYS] + extra
    SEED_DAYS.extend((d["symbol"], d["date"]) for d in extra)
    rest = sorted((d for d in sample if (d["symbol"], d["date"]) not in SEED_DAYS and 1 <= d["pc"] <= 20 and len(d["candles"]) >= 300),
                  key=lambda d: d["date"], reverse=True)
    for d in seeds + rest:
        if len(built) >= a.days:
            break
        day = build_day(d)
        tradeable = [c for c in day["curls"] if c["dollars"] >= 250_000]
        if (d["symbol"], d["date"]) in SEED_DAYS or len(tradeable) >= 3:
            built.append(day)
    out = {"meta": {"generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"), "days": len(built),
                    "reversals": list(REVERSALS), "minLeg": MIN_LEG,
                    "selection": "Seed days first, then the most recent $1-$20 gainer-days with 3+ curls trading $250K+"},
           "days": built}
    with open(a.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{len(built)} days, {sum(len(d['curls']) for d in built)} curls -> {a.out}")
    for d in built[:1]:
        for c in d["curls"]:
            fmt = lambda t: datetime.fromtimestamp(t, timezone.utc).astimezone(ET).strftime("%H:%M")
            print(f"  {d['sym']} #{c['n']} {fmt(c['lowT'])}->{fmt(c['highT'])} +{c['movePct']}% range {c['rangeCents']}c exp {c['expansion']} trigVol {c['triggerVol']} zone {c['zone']}")


if __name__ == "__main__":
    main()
