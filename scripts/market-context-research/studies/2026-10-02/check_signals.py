import json, statistics as st, sys
d = json.load(open(sys.argv[1]))
c = d["cases"]
rec = [x for x in c if x["outcome"]["recovered"]]
print("cases", len(c), "recovered", len(rec), f"{100*len(rec)/len(c):.0f}%", "size MB", round(len(open(sys.argv[1]).read()) / 1e6, 2))
for k in ["sellVsBuy", "triggerVol", "volSinceLow", "highClose", "depth", "bigRed", "minutesSinceHigh"]:
    a = [x["asOf"][k] for x in rec]; b = [x["asOf"][k] for x in c if not x["outcome"]["recovered"]]
    print(f"{k:16s} median recovered {st.median(a):6.2f}  not {st.median(b):6.2f}")
def split(k, t, higher_is_strong):
    s = [x for x in c if (x["asOf"][k] >= t) == higher_is_strong]
    w = [x for x in c if x not in s]
    f = lambda g: f"{100*sum(x['outcome']['recovered'] for x in g)/len(g):.0f}% of {len(g)}" if g else "-"
    print(f"  {k} {'>=' if higher_is_strong else '<'} {t}: strong {f(s)} | weak {f(w)}")
split("sellVsBuy", 0.5, False); split("volSinceLow", 1.5, True); split("triggerVol", 1.0, True); split("highClose", 0.8, True); split("depth", 0.62, False)
