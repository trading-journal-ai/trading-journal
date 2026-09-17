import { analyticsRecovery } from "@/lib/analyticsRecovery";
import { reviewStats, type PnlBasis, type ReviewTrade } from "@/lib/analyticsReview";
import { fmtMoney } from "@/lib/format";
import styles from "./AnalyticsWorkspace.module.css";

export function RecentPerformance({ rows, basis, onInspect }: {rows:ReviewTrade[];basis:PnlBasis;onInspect:(key:string)=>void}) {
  const {recent,earlier} = analyticsRecovery(rows,basis);
  return <section className={styles.section}><h3>Recent versus earlier trades</h3>
    <p className={styles.note}>Last 20 completed trades versus the preceding 20 within this selection, ordered by final exit. Partial windows are shown with their actual count.</p>
    <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Window</th><th>Trades</th><th>Avg {basis} / trade</th><th>Win rate</th><th>Avg winner</th><th>Avg loser</th></tr></thead><tbody>{[["recent","Latest trades",recent],["earlier","Preceding trades",earlier]].map(([key,label,values])=>{
      const s=reviewStats(values as ReviewTrade[],basis);
      return <tr key={String(key)}><th><button className={styles.link} onClick={()=>onInspect(String(key))}>{String(label)}</button></th><td>{s.count} / 20</td><td>{s.avg == null ? "—" : fmtMoney(s.avg)}</td><td>{s.winRate == null ? "—" : `${s.winRate.toFixed(1)}%`}</td><td>{s.avgWin == null ? "—" : fmtMoney(s.avgWin)}</td><td>{s.avgLoss == null ? "—" : fmtMoney(s.avgLoss)}</td></tr>;
    })}</tbody></table></div>
  </section>;
}

export default function AnalyticsRecovery({rows,basis,onInspect}:{rows:ReviewTrade[];basis:PnlBasis;onInspect:(key:string)=>void}) {
  const data=analyticsRecovery(rows,basis);
  const x=(index:number)=>60+index/Math.max(1,data.sessions.length)*580;
  const y=(value:number)=>25+value/Math.max(1,data.max)*130;
  const rolling=data.rolling.filter((p):p is typeof p & {value:number}=>p.value!=null);
  const low=Math.min(0,...rolling.map(p=>p.value)), high=Math.max(1,...rolling.map(p=>p.value));
  const ry=(value:number)=>25+(high-value)/(high-low)*130;
  const rx=(i:number)=>60+i/Math.max(1,rolling.length-1)*580;
  return <>
    <p className={styles.intro}>How far below the selected period’s high-water mark are results, and how long does recovery take?</p>
    <dl className={styles.stats}>{[["Current closing drawdown",fmtMoney(-data.current)],["Largest closing drawdown",fmtMoney(-data.max)],["Sessions below peak",String(data.underwaterSessions)],["Recovered / total episodes",`${data.episodes.filter(e=>e.recovered).length} / ${data.episodes.length}`]].map(([label,value])=><div className={styles.stat} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className={styles.chartScroll}><svg className={styles.chart} viewBox="0 0 680 200" role="img" aria-label={`Closing drawdown in ${basis} dollars. Exact episode details below.`}>
      <line x1="60" x2="640" y1="25" y2="25" stroke="var(--hairline)"/><text x="0" y="29">$0</text><text x="0" y="159">{fmtMoney(-data.max)}</text>
      <path d={`M60,25 ${data.sessions.map((s,i)=>`L${x(i+1)},${y(s.drawdown)}`).join(" ")}`} stroke="var(--red)" strokeWidth="2" fill="none"/>
      <text x="60" y="190">Start</text><text x="640" y="190" textAnchor="end">{data.sessions.at(-1)?.date}</text>
    </svg></div>
    <p className={styles.note}>Starts at zero for the selected period; no carry-in peak. Measured at session close, excluding unrealized moves and intraday recovery. An episode starts at its first underwater close; its trade count includes the recovery session. Calendar days include both endpoints and stop at the last observed session for ongoing episodes.</p>
    <div className={styles.tableWrap}><table className={styles.table}><caption>Drawdown episodes · {basis} completed-trade results</caption><thead><tr><th>First underwater close</th><th>Last observed / recovered</th><th>Status</th><th>Deepest</th><th>Calendar days</th><th>Underwater sessions</th><th>Trades</th></tr></thead><tbody>{data.episodes.map(e=><tr key={e.start}><th><button className={styles.link} onClick={()=>onInspect(`recovery:${e.start}`)}>{e.start}</button></th><td>{e.end}</td><td>{e.recovered?"Recovered":"Ongoing"}</td><td>{fmtMoney(-e.depth)}</td><td>{e.calendarDays}</td><td>{e.underwaterSessions}</td><td>{e.trades}</td></tr>)}</tbody></table></div>
    {!data.episodes.length ? <p className={styles.note}>No closing drawdown in this selection.</p> : null}
    <section className={styles.section}><h3>Rolling average trade result</h3><p className={styles.note}>Average {basis} P&amp;L over each 20 completed trades. This is dollar expectancy, without an assumed stop or R value.</p>
      {rolling.length ? <><div className={styles.chartScroll}><svg className={styles.chart} viewBox="0 0 680 200" role="img" aria-label="Rolling 20-trade average result; exact values below.">
        <line x1="60" x2="640" y1={ry(0)} y2={ry(0)} stroke="var(--hairline)"/>
        <text x="0" y="25">{fmtMoney(high)}</text><text x="0" y="155">{fmtMoney(low)}</text>
        <path d={rolling.map((p,i)=>`${i?"L":"M"}${rx(i)},${ry(p.value)}`).join(" ")} stroke="var(--foreground)" strokeWidth="2" fill="none"/>
        {rolling.length===1?<circle cx={rx(0)} cy={ry(rolling[0].value)} r="3" fill="var(--foreground)"/>:null}
        <text x="60" y="190">Trade 20</text>{rolling.length>1?<text x="640" y="190" textAnchor="end">Trade {rows.length}</text>:null}
      </svg></div><details><summary className={styles.link}>Exact rolling values</summary><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Ending trade</th><th>Final exit date</th><th>Average / trade</th></tr></thead><tbody>{rolling.map(p=><tr key={p.index}><th>{p.index}</th><td>{p.date}</td><td>{fmtMoney(p.value)}</td></tr>)}</tbody></table></div></details></> : <p className={styles.notice}>At least 20 completed trades are needed for a full rolling window. This selection has {rows.length}.</p>}
    </section>
    <RecentPerformance rows={rows} basis={basis} onInspect={onInspect}/>
  </>;
}
