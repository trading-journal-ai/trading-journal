"use client";

import { useState } from "react";
import DateRangePicker from "@/components/DateRangePicker";
import { emptyCohort, previousPeriod, sessionWindows, type Breakdown, type Cohort } from "@/lib/analyticsCompare";
import { priceBands, reviewStats, sizeBands, type PnlBasis, type ReviewTrade } from "@/lib/analyticsReview";
import { fmtMoney } from "@/lib/format";
import styles from "./AnalyticsWorkspace.module.css";

const money = (value: number | null) => value == null ? "—" : fmtMoney(value);
const decimal = (value: number | null, suffix = "") => value == null ? "—" : `${value.toFixed(1)}${suffix}`;
export const breakdownOptions: { value: Breakdown; label: string }[] = [
  {value:"symbol",label:"Symbol"},{value:"setup",label:"Setup"},{value:"price",label:"Stock price"},
  {value:"size",label:"Peak shares"},{value:"window",label:"Entry session"},{value:"duration",label:"Intraday / multiday"},
];

function GroupEditor({ name, cohort, setCohort, history, range, today }: {
  name: string; cohort: Cohort; setCohort: (value: Cohort) => void; history: ReviewTrade[]; range: {from:string;to:string}; today: string;
}) {
  const set = (key: keyof Cohort, value: string) => setCohort({...cohort,[key]:value});
  const select = (key: keyof Cohort, label: string, options: [string,string][]) => <label>{label}<select aria-label={`${name} ${label}`} value={cohort[key]} onChange={e=>set(key,e.target.value)}>{options.map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label>;
  const resultOptions: [string,string][] = [["all","All"],["win","Profitable"],["loss","Losing"],["scratch","Breakeven"]];
  return <fieldset className={styles.cohortEditor}>
    <legend>{name}</legend>
    <div className={styles.cohortDates}><span>{cohort.from || "Start of history"} → {cohort.to || "Latest trade"}</span>
      <DateRangePicker from={cohort.from || range.from} to={cohort.to || range.to} today={today} className={styles.secondaryButton} dialogLabel={`${name} dates`} onApply={(from,to)=>setCohort({...cohort,from,to})}/>
      <button className={styles.link} onClick={()=>setCohort({...cohort,from:"",to:""})}>All dates</button>
    </div>
    <div className={styles.cohortFields}>
      {select("outcome","Trade result",resultOptions)}
      {select("session","Session result",resultOptions)}
      {select("symbol","Symbol",[["","All symbols"],...[...new Set(history.map(t=>t.symbol))].sort().map(s=>[s,s] as [string,string])])}
      {select("setup","Setup",[["","All setups"],...[...new Set(history.map(t=>t.setup))].sort().map(s=>[s,s] as [string,string])])}
      {select("price","Entry price",priceBands.map(b=>[b.id,b.label]))}
      {select("size","Peak shares",[["all","All sizes"],...sizeBands.map(b=>[b.id,b.label] as [string,string])])}
      {select("window","Entry session",[["","All sessions"],...sessionWindows.map(s=>[s,s] as [string,string])])}
      {select("duration","Duration",[["all","All"],["intraday","Intraday"],["multiday","Multiday"]])}
      <label>Tags, comma separated<input aria-label={`${name} tags`} value={cohort.tags} onChange={e=>set("tags",e.target.value)} placeholder="e.g. breakout, news" /></label>
      {select("tagMode","Match tags",[["all","All listed tags"],["any","Any listed tag"]])}
    </div>
  </fieldset>;
}

export default function AnalyticsCompare({ history, range, today, a, b, aRows, bRows, basis, onApply, onInspect }: {
  history: ReviewTrade[]; range: {from:string;to:string}; today: string; a:Cohort; b:Cohort;
  aRows:ReviewTrade[]; bRows:ReviewTrade[]; basis:PnlBasis;
  onApply:(a:Cohort,b:Cohort)=>void; onInspect:(key:string)=>void;
}) {
  const [draftA,setA] = useState(a), [draftB,setB] = useState(b);
  const [presetRange, setPresetRange] = useState(a.from && a.to && a.from <= a.to ? {from:a.from,to:a.to} : range);
  const base = {...emptyCohort,...presetRange};
  const presets: {label:string;a:Cohort;b:Cohort}[] = [
    {label:"Winning vs losing trades",a:{...base,outcome:"win"},b:{...base,outcome:"loss"}},
    {label:"Winning vs losing sessions",a:{...base,session:"win"},b:{...base,session:"loss"}},
    {label:"Selected vs previous period",a:base,b:{...base,...previousPeriod(presetRange)}},
    {label:"Premarket vs opening bell",a:{...base,window:sessionWindows[0]},b:{...base,window:sessionWindows[1]}},
    {label:"Intraday vs multiday",a:{...base,duration:"intraday"},b:{...base,duration:"multiday"}},
    {label:"Custom groups",a:base,b:base},
  ];
  const dirty = JSON.stringify([draftA,draftB]) !== JSON.stringify([a,b]);
  const invalid = [draftA,draftB].some(c=>c.from && c.to && c.from>c.to);
  const sa = reviewStats(aRows,basis), sb = reviewStats(bRows,basis);
  const ids = new Set(aRows.map(t=>t.id)), overlap = bRows.filter(t=>ids.has(t.id)).length;
  const metrics: [string,string,string][] = [
    ["Completed trades",String(sa.count),String(sb.count)],
    [`Total ${basis} P&L`,money(sa.pnl),money(sb.pnl)],
    ["Average / trade",money(sa.avg),money(sb.avg)],
    ["Win rate",decimal(sa.winRate,"%"),decimal(sb.winRate,"%")],
    ["Profit factor",sa.pf?.toFixed(2)??"—",sb.pf?.toFixed(2)??"—"],
    ["Average winner",money(sa.avgWin),money(sb.avgWin)],
    ["Average loser",money(sa.avgLoss),money(sb.avgLoss)],
    ["Largest loser",money(sa.worst),money(sb.worst)],
    ["Result / opening share",decimal(sa.perShare == null ? null : sa.perShare*100,"¢"),decimal(sb.perShare == null ? null : sb.perShare*100,"¢")],
    ["Winning hold (minutes)",decimal(sa.winHold),decimal(sb.winHold)],
    ["Losing hold (minutes)",decimal(sa.lossHold),decimal(sb.lossHold)],
    ["Recorded fees",money(sa.fees),money(sb.fees)],
    ["Trades with unreported fees",String(sa.unknown),String(sb.unknown)],
    ["Breakeven trades",String(sa.scratches),String(sb.scratches)],
    ["Trades with adds",String(sa.adds),String(sb.adds)],
    ["Trades with partial exits",String(aRows.filter(t=>t.reductions>0).length),String(bRows.filter(t=>t.reductions>0).length)],
  ];
  return <>
    <p className={styles.intro}>Choose a starting comparison, then edit each group. Account, side and trade filters above apply to both groups; each group uses its own dates. Choose preset dates below before selecting a comparison. The previous-period preset uses the immediately preceding equal number of calendar days.</p>
    <div className={styles.controls}>
      <span className={styles.note}>Preset dates: {presetRange.from} → {presetRange.to}</span>
      <DateRangePicker from={presetRange.from} to={presetRange.to} today={today} className={styles.secondaryButton} dialogLabel="Comparison preset dates" triggerLabel="Change preset dates" onApply={(from,to)=>setPresetRange({from,to})}/>
      <span className={styles.note}>Used when you select a preset; applied groups stay unchanged until then.</span>
    </div>
    <div className={styles.presetList} aria-label="Comparison presets">{presets.map(p=><button key={p.label} className={styles.secondaryButton} onClick={()=>onApply(p.a,p.b)}>{p.label}</button>)}</div>
    <details className={styles.groupBuilder} open>
      <summary className={styles.link}>Group definitions and filters</summary>
      <div className={styles.cohortGrid}><GroupEditor name="Group A" cohort={draftA} setCohort={setA} history={history} range={range} today={today}/><GroupEditor name="Group B" cohort={draftB} setCohort={setB} history={history} range={range} today={today}/></div>
      <div className={styles.controls}><button className={styles.primaryButton} disabled={invalid} onClick={()=>onApply(draftA,draftB)}>Apply comparison</button>{dirty ? <span role="status" className={styles.note}>Unapplied changes · results below still use the applied groups.</span> : <span className={styles.note}>Group definitions applied.</span>}</div>
      {invalid ? <p role="alert">Start date must be on or before end date.</p> : null}
    </details>
    <p className={styles.note}>Session result is calculated from all completed trades in the shared account/side/trade-filter scope, before either group’s filters. Breakeven sessions are separate. Overlap: {overlap} trades. Groups with fewer than 20 trades are small descriptive samples; differences do not establish causation.</p>
    {(sa.unknown || sb.unknown) && basis === "net" ? <p className={styles.notice}>Net comparison is provisional: one or both groups contain unreported fees.</p> : null}
    {!aRows.length || !bRows.length ? <p className={styles.notice}>One or both groups have no matching trades. Adjust their filters; unavailable averages remain blank.</p> : null}
    <div className={styles.tableWrap}><table className={styles.table}><caption>Applied groups · {basis} results</caption><thead><tr><th scope="col">Measure</th><th scope="col"><button className={styles.link} onClick={()=>onInspect("cohort:A")}>Group A · inspect trades</button></th><th scope="col"><button className={styles.link} onClick={()=>onInspect("cohort:B")}>Group B · inspect trades</button></th></tr></thead><tbody>{metrics.map(([label,av,bv])=><tr key={label}><th scope="row">{label}</th><td>{av}</td><td>{bv}</td></tr>)}</tbody></table></div>
  </>;
}
