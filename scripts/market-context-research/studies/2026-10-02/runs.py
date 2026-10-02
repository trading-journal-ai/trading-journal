import json,sys,collections
from datetime import datetime,timezone
from zoneinfo import ZoneInfo
ET=ZoneInfo('America/New_York');S=sys.argv[1]
data=json.load(open(f'{S}/sample_candles_1500.json'))
def etm(t):
    d=datetime.fromtimestamp(t,timezone.utc).astimezone(ET);return d.hour*60+d.minute
def blk(m): return "04-07" if m<420 else "07-09:30" if m<570 else "09:30-10:30" if m<630 else "10:30-12" if m<720 else "12-16" if m<960 else "16-20"
runs=[]
for d in data:
    b=sorted(d['candles'],key=lambda c:c['t'])
    m=[etm(x['t']) for x in b]
    last_end=-1
    for i in range(3,len(b)):
        if i-3<=last_end: continue
        seq=range(i-3,i+1)
        if not all(m[k+1]-m[k]==1 for k in range(i-3,i)): continue
        if not all(b[k+1]['l']>=b[k]['l'] and b[k+1]['c']>b[k]['c'] for k in range(i-3,i)): continue
        lo=min(b[k]['l'] for k in range(i-2,i+1)); hi=max(b[k]['h'] for k in range(i-2,i+1))
        if lo<=0 or hi/lo-1<0.03: continue
        # baseline: volume per minute over the 20 minutes before the run
        prior=[x for x,mm in zip(b,m) if m[i-2]-20<=mm<m[i-2]]
        base=sum(x['vol'] for x in prior)/20
        runv=sum(b[k]['vol'] for k in range(i-2,i+1))/3
        ratio=runv/base if base>0 else 99
        fut=[x for x,mm in zip(b,m) if m[i]<mm<=m[i]+15]
        cont=(max(x['h'] for x in fut)/b[i]['c']-1) if fut else 0
        runs.append((blk(m[i-2]),ratio,cont)); last_end=i
n=len(runs);conf=[r for r in runs if r[1]>=2]
print(f"stair-step runs found: {n}; volume-confirmed (run vol/min >= 2x prior 20-min avg): {len(conf)} ({100*len(conf)/n:.0f}%)")
for lab,s in [("volume-confirmed",conf),("not confirmed",[r for r in runs if r[1]<2])]:
    print(f"  {lab}: n={len(s)}  went >=5% higher within 15 min: {100*sum(r[2]>=.05 for r in s)/len(s):.0f}%  >=10%: {100*sum(r[2]>=.10 for r in s)/len(s):.0f}%")
print("  by time block: share volume-confirmed | follow-through >=5% (confirmed vs not)")
for k in ["04-07","07-09:30","09:30-10:30","10:30-12","12-16","16-20"]:
    s=[r for r in runs if r[0]==k];c=[r for r in s if r[1]>=2];u=[r for r in s if r[1]<2]
    f=lambda x:100*sum(r[2]>=.05 for r in x)/len(x) if x else 0
    print(f"    {k:12s} runs={len(s):5d} confirmed {100*len(c)/len(s):3.0f}% | {f(c):3.0f}% vs {f(u):3.0f}%")
