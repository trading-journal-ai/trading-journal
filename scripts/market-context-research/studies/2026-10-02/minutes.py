import json, sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
ET = ZoneInfo("America/New_York")
sym, date = sys.argv[2], sys.argv[3]
day = next(d for d in json.load(open(sys.argv[1])) if d["symbol"] == sym and d["date"] == date)
for a, z in [tuple(map(int, r.split("-"))) for r in sys.argv[4:]]:
    prev = None
    for b in sorted(day["candles"], key=lambda c: c["t"]):
        t = datetime.fromtimestamp(b["t"], timezone.utc).astimezone(ET); m = t.hour * 60 + t.minute
        if a <= m < z:
            gap = f"  (gap {m - prev - 1} min)" if prev is not None and m - prev > 1 else ""
            print(f"{t:%H:%M} o{b['o']:.2f} h{b['h']:.2f} l{b['l']:.2f} c{b['c']:.2f} v{int(b['vol']):>8}{gap}")
            prev = m
    print("--")
