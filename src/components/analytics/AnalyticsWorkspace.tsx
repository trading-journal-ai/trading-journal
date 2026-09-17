"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useId, useState, useTransition, type ReactNode } from "react";
import { average, priceBands, reviewSessions, reviewStats, sizeBands, total, type PnlBasis, type ReviewTrade } from "@/lib/analyticsReview";
import AnalyticsCompare, { breakdownOptions } from "./AnalyticsCompare";
import AnalyticsRecovery, { RecentPerformance } from "./AnalyticsRecovery";
import { analyticsRecovery } from "@/lib/analyticsRecovery";
import { breakdownKey, cohortTrades, emptyCohort, parseCohort, type Breakdown } from "@/lib/analyticsCompare";
import { MARKET_TZ, timeZoneParts } from "@/lib/time";
import { fmtMoney } from "@/lib/format";
import styles from "./AnalyticsWorkspace.module.css";
import { analyticsHistogram } from "@/lib/analyticsHistogram";
import { OverviewDetails, PnlHistogram } from "./AnalyticsOverviewDetails";

const questions = [
  { id: "compare", label: "Compare", sub: "Independent groups + shared breakdowns" },
  { id: "recovery", label: "Risk & recovery", sub: "Drawdown + recent performance" },
  { id: "performance", label: "How am I doing?", sub: "Core statistics + performance" },
  { id: "sizing", label: "Am I adapting to bigger size?", sub: "Shares, price, losses and winners" },
  { id: "giveback", label: "Am I giving gains back?", sub: "Session peak to finish" },
  { id: "concentration", label: "What is carrying my results?", sub: "Dependence on big days" },
  { id: "reentry", label: "Do repeated attempts help?", sub: "First entry versus re-entry" },
  { id: "setups", label: "Which setups work?", sub: "Setup + annotation coverage" },
];
const primaryViews = [{id:"performance",label:"Overview"},{id:"compare",label:"Compare"},{id:"sizing",label:"Sizing Up"},{id:"recovery",label:"Recovery"},{id:"giveback",label:"Review studies"}];
const studyIds = ["giveback","concentration","reentry","setups"];
const money = (n: number | null) => n == null ? "—" : fmtMoney(n);
const decimal = (n: number | null, suffix = "") => n == null ? "—" : `${n.toFixed(1)}${suffix}`;
const hold = (n: number | null) => n == null ? "—" : n >= 1440 ? `${(n/1440).toFixed(1)} days` : n >= 60 ? `${(n/60).toFixed(1)} hr` : `${n.toFixed(1)} min`;
const cents = (n: number | null) => n == null ? "—" : `${(n * 100).toFixed(2)}¢`;
const valueColor = (n: number) => n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : undefined;
type Group = { key: string; label: string; rows: ReviewTrade[] };

function Stats({ items, compact = false }: { items: [string, string, (number | null)?][]; compact?: boolean }) {
  return <dl className={compact ? styles.summaryStats : styles.stats}>{items.map(([label, value, signedValue]) => <div className={styles.stat} key={label}><dt>{label}</dt><dd style={signedValue == null ? undefined : {color:valueColor(signedValue)}}>{value}</dd></div>)}</dl>;
}
function Bars({ items }: { items: [string, number | null][] }) {
  const max = Math.max(1, ...items.map(([,v]) => Math.abs(v ?? 0)));
  return <div className={styles.bars}>{items.map(([label,value]) => <div className={styles.barRow} key={label}><span>{label}</span><div className={styles.barTrack} aria-hidden="true"><span className={styles.barMark} style={{ left: `${value != null && value < 0 ? 50 - Math.abs(value) / max * 50 : 50}%`, width: `${Math.abs(value ?? 0) / max * 50}%`, opacity: value != null && value < 0 ? .5 : 1 }} /></div><strong>{money(value)}</strong></div>)}</div>;
}
function PerformanceChart({ rows, basis }: { rows: ReviewTrade[]; basis: PnlBasis }) {
  const sessions = reviewSessions(rows, basis), values = [0, ...sessions.map(s => s.cumulative)];
  const low = Math.min(0,...values), high = Math.max(1,...values), span = high - low;
  const x = (i: number) => 72 + i / Math.max(1,values.length - 1) * 590;
  const y = (v: number) => 20 + (high - v) / span * 170;
  const ticks = [high, (high + low)/2, low];
  const dateTicks = [...new Set([Math.max(1, Math.floor(sessions.length / 2)), sessions.length])].filter(i => i > 0);
  const axisMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(value) || 0);
  const dateLabel = (date: string) => new Intl.DateTimeFormat("en-US", {timeZone:"UTC",month:"short",day:"numeric",...(sessions[0]?.date.slice(0,4) !== sessions.at(-1)?.date.slice(0,4) ? {year:"numeric" as const} : {})}).format(new Date(`${date}T12:00:00Z`));
  return <div className={styles.chartScroll}><div className={styles.performancePlot}>
    <svg viewBox="0 0 680 230" className={styles.chart} role="img" aria-label={`Cumulative ${basis} P&L, starting at zero. Exact values in session results below.`}>
      {ticks.map((v,i) => <line key={i} x1="72" x2="662" y1={y(v)} y2={y(v)} stroke="var(--hairline)" />)}
      <line x1="72" x2="662" y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 4" />
      <path d={values.map((v,i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke="var(--foreground)" strokeWidth="2" />
    </svg>
    <div aria-hidden="true">
      {ticks.map((v,i) => <span key={i} className={styles.chartLabel} style={{left:0,top:`${y(v)/230*100}%`}}>{axisMoney(v)}</span>)}
      <span className={styles.chartLabel} style={{left:`${72/680*100}%`,top:`${222/230*100}%`}}>Start</span>
      {dateTicks.map(i => <span key={i} className={styles.chartLabel} title={sessions[i-1].date} style={{left:`${x(i)/680*100}%`,top:`${222/230*100}%`,transform:`translate(${i===sessions.length ? "-100%" : "-50%"}, -50%)`}}>{dateLabel(sessions[i-1].date)}</span>)}
    </div>
  </div></div>;
}
function Comparison({ groups, basis, onOpen }: { groups: Group[]; basis: PnlBasis; onOpen: (key: string) => void }) {
  return <div className={styles.tableWrap}><table className={styles.table}><caption>Completed trades · {basis} results{groups.some(g => g.rows.some(t => t.unknownFees)) && basis === "net" ? " · provisional where fees are unknown" : ""}</caption><thead><tr><th scope="col">Group</th><th scope="col">Trades</th><th scope="col">Total P&amp;L</th><th scope="col">Avg / trade</th><th scope="col">Avg winner</th><th scope="col">Avg loser</th><th scope="col">Win rate</th><th scope="col">Profit factor</th></tr></thead><tbody>{groups.map(g => { const s = reviewStats(g.rows,basis); return <tr key={g.key}><th scope="row"><button className={styles.link} onClick={() => onOpen(g.key)}>{g.label}</button></th><td>{s.count}</td><td>{money(s.pnl)}</td><td>{money(s.avg)}</td><td>{money(s.avgWin)}</td><td>{money(s.avgLoss)}</td><td>{decimal(s.winRate,"%")}</td><td>{s.pf?.toFixed(2) ?? "—"}</td></tr>; })}</tbody></table></div>;
}
function TradeList({ rows, basis, returnTo }: { rows: ReviewTrade[]; basis: PnlBasis; returnTo: string }) {
  const [page, setPage] = useState(0);
  const ordered = [...rows].sort((a,b) => b.exitAt - a.exitAt || b.id - a.id);
  const pages = Math.ceil(rows.length / 30);
  return <><div className={styles.tableWrap}><table className={styles.table}><caption>{rows.length} completed trades · final exit date in ET · open a symbol to review its executions</caption><thead><tr>{["Symbol","Closed (ET)","Peak shares","Entry price","Result","Fees","Hold","Attempt","Setup"].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{ordered.slice(page*30,page*30+30).map(t => <tr key={t.id}><th scope="row"><Link className={styles.link} href={`/trades/${t.id}?returnTo=${encodeURIComponent(returnTo)}`}>{t.symbol}</Link></th><td>{t.date}</td><td>{t.peakShares?.toLocaleString() ?? "Split-adjusted"}</td><td>{money(t.price)}</td><td style={{color:valueColor(t[basis])}}>{money(t[basis])}{basis === "net" && t.unknownFees > 0 ? "*" : ""}</td><td>{money(t.fees)}{t.unknownFees ? "*" : ""}</td><td>{hold(t.holdMinutes)}</td><td>{t.attempt}</td><td>{t.setup}</td></tr>)}</tbody></table></div><p className={styles.note}>* Fees are unreported on one or more fills. Net uses recorded costs and is provisional.</p>{pages > 1 ? <div className={styles.pagination}><button className={styles.link} disabled={page===0} onClick={() => setPage(p=>p-1)}>Previous</button><span>Page {page+1} of {pages}</span><button className={styles.link} disabled={page+1>=pages} onClick={() => setPage(p=>p+1)}>Next</button></div> : null}</>;
}

export default function AnalyticsWorkspace({ trades, history, range, today, dateControls, tradeFilters, activeFilterCount, excluded, open }: { trades: ReviewTrade[]; history: ReviewTrade[]; range: {from:string;to:string}; today: string; dateControls: ReactNode; tradeFilters: ReactNode; activeFilterCount: number; excluded: number; open: number }) {
  const params = useSearchParams(), pathname = usePathname(), router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersId = useId();
  const view = questions.find(q => q.id === params.get("view")) ?? questions.find(q=>q.id === "performance")!;
  const basis: PnlBasis = params.get("basis") === "gross" ? "gross" : "net";
  const isStudy = studyIds.includes(view.id);
  const ca = parseCohort(params.get("ca"), {...emptyCohort,...range,outcome:"win"});
  const cb = parseCohort(params.get("cb"), {...emptyCohort,...range,outcome:"loss"});
  const cohortA = cohortTrades(history,ca,basis), cohortB = cohortTrades(history,cb,basis);
  const breakdown = (breakdownOptions.find(b=>b.value===params.get("breakdown"))?.value ?? "symbol") as Breakdown;
  const breakdownLabels = [...new Set([...cohortA,...cohortB].map(t=>breakdownKey(t,breakdown)))].sort();
  const cohortBreakdowns = breakdownLabels.flatMap(label=>[{key:`break:A:${label}`,label:`A · ${label}`,rows:cohortA.filter(t=>breakdownKey(t,breakdown)===label)},{key:`break:B:${label}`,label:`B · ${label}`,rows:cohortB.filter(t=>breakdownKey(t,breakdown)===label)}]);
  const recovery = analyticsRecovery(trades,basis);
  const price = priceBands.find(p => p.id === params.get("price")) ?? priceBands[0];
  const presentSizes = sizeBands.filter(b => trades.some(t => t.peakShares != null && t.peakShares >= b.min && t.peakShares < b.max));
  const a = sizeBands.find(b => b.id === params.get("a")) ?? presentSizes[0] ?? sizeBands[1];
  const b = sizeBands.find(b => b.id === params.get("b")) ?? presentSizes[1] ?? sizeBands.find(s => s.id !== a.id) ?? sizeBands[2];
  const rows = view.id === "sizing" ? trades.filter(t => t.price >= price.min && t.price < price.max) : trades;
  const stats = reviewStats(rows,basis), sessions = reviewSessions(rows,basis);
  const change = (updates: Record<string,string|null>) => { const next = new URLSearchParams(params.toString()); for (const [key,value] of Object.entries(updates)) { if(value == null) next.delete(key); else next.set(key,value); } startTransition(() => router.push(`${pathname}?${next}`, { scroll: false })); };
  const groups: Group[] = [{ key:"all", label:"All selected trades", rows }];
  const sizes = sizeBands.map(s => ({ key:`size:${s.id}`, label:`${s.label} shares`, rows: rows.filter(t => t.peakShares != null && t.peakShares >= s.min && t.peakShares < s.max) }));
  const attempts = [{ key:"first", label:"First attempts", rows:rows.filter(t=>t.attempt===1) },{ key:"repeat",label:"Re-entries",rows:rows.filter(t=>t.attempt>1) }];
  const setups = [...new Set(rows.map(t=>t.setup))].sort().map(setup => ({key:`setup:${setup}`,label:setup,rows:rows.filter(t=>t.setup===setup)}));
  const symbols = [...new Set(rows.map(t=>t.symbol))].map(symbol => ({key:`symbol:${symbol}`,label:symbol,rows:rows.filter(t=>t.symbol===symbol)})).sort((a,b)=>total(b.rows.map(t=>t[basis]))-total(a.rows.map(t=>t[basis])));
  groups.push({key:"fees",label:"Trades with unreported fees",rows:rows.filter(t=>t.unknownFees>0)},...sizes,...attempts,...setups,...symbols,...sessions.map(s=>({key:`day:${s.date}`,label:s.date,rows:s.trades})));
  const windows = ["Premarket", "Opening 30 min", "10 AM–noon", "Noon–4 PM", "After hours"].map((label,index) => ({key:`window:${index}`,label,rows:rows.filter(t=>{const p=timeZoneParts(t.entryAt*1000,MARKET_TZ);const minute=p.hour*60+p.minute;return (minute<570 ? 0 : minute<600 ? 1 : minute<720 ? 2 : minute<960 ? 3 : 4)===index;})}));
  groups.push(...windows);
  const best = [...sessions].sort((a,b)=>b.pnl-a.pnl)[0], worst = [...sessions].sort((a,b)=>a.pnl-b.pnl)[0];
  const withoutBest = rows.filter(t=>t.date!==best?.date), withoutWorst = rows.filter(t=>t.date!==worst?.date);
  groups.push({key:"withoutBest",label:"Without best day",rows:withoutBest},{key:"withoutWorst",label:"Without worst day",rows:withoutWorst});
  const histogram = analyticsHistogram(rows, basis);
  groups.push(...histogram.bins.map((bin, index) => ({ key: bin.key, label: `${money(bin.from)} to ${index === histogram.bins.length - 1 ? "" : "under "}${money(bin.to)} per trade`, rows: bin.rows })));
  groups.push({key:"cohort:A",label:"Group A",rows:cohortA},{key:"cohort:B",label:"Group B",rows:cohortB},...cohortBreakdowns,{key:"recent",label:"Latest 20 trades",rows:recovery.recent},{key:"earlier",label:"Preceding 20 trades",rows:recovery.earlier},...recovery.episodes.map(e=>({key:`recovery:${e.start}`,label:`Drawdown episode · ${e.start} to ${e.end}`,rows:trades.filter(t=>t.date>=e.start&&t.date<=e.end)})));
  const drill = groups.find(g=>g.key === params.get("drill"));
  const inspect = (key: string) => change({drill:key});
  const heading = drill ? drill.label : view.id === "performance" ? "Performance overview" : view.label;
  const dd = sessions.length ? Math.max(...sessions.map(s=>s.drawdown)) : 0;
  const sizeA = sizes.find(s=>s.key===`size:${a.id}`)!, sizeB = sizes.find(s=>s.key===`size:${b.id}`)!;
  const as = reviewStats(sizeA.rows,basis), bs = reviewStats(sizeB.rows,basis);
  return <div className={styles.workspace} aria-busy={pending}>
    <nav className={styles.primaryViews} aria-label="Performance views">{primaryViews.map(v=><button key={v.id} aria-current={(isStudy ? v.id==="giveback" : view.id===v.id) ? "page" : undefined} onClick={()=>change({view:v.id,drill:null})}>{v.label}</button>)}</nav>
    <div className={styles.toolbar}>
      {view.id !== "compare" ? dateControls : <p className={styles.note}>Shared trade filters</p>}
      <div className={styles.toolbarActions}><button type="button" className={styles.filterToggle} aria-expanded={filtersOpen} aria-controls={filtersId} onClick={()=>setFiltersOpen(value=>!value)}><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={filtersOpen ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6"}/></svg>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</button><select aria-label="P&L basis" value={basis} onChange={e=>change({basis:e.target.value})}><option value="net">Net</option><option value="gross">Gross</option></select></div>
    </div>
    <div id={filtersId} hidden={!filtersOpen}>{tradeFilters}</div>
    <div className={styles.scope}>
      <p>{view.id === "compare" ? "Compare uses the group dates below" : `${rows.length} completed trades`}</p>
      {stats.unknown > 0 && view.id !== "compare" ? <details className={styles.notice}><summary>{basis === "net" ? "Net provisional · " : ""}Fees incomplete</summary><p>{stats.unknown} of {rows.length} trades have unreported fees. Recorded costs are included in net results. A stored zero without broker fee evidence is unknown, not confirmed free. Use the app’s Import control to re-sync the affected dates or import a statement containing fees; supported Schwab imports can enrich existing executions. This does not guarantee the broker has reported every fee yet.</p><button className={styles.link} onClick={()=>inspect("fees")}>Inspect affected trades</button></details> : null}
    </div>
    {pending ? <p className={styles.note} role="status">Updating analytics…</p> : null}
    <div className={isStudy ? styles.layout : styles.fullLayout}>
      {isStudy ? <nav className={styles.questions} aria-label="Review studies">{questions.filter(q=>studyIds.includes(q.id)).map(q=><button key={q.id} aria-current={view.id===q.id ? "page" : undefined} onClick={()=>change({view:q.id,drill:null})}>{q.label}<small>{q.sub}</small></button>)}</nav> : null}
      <section className={styles.content} aria-label={heading}>
        {drill ? <button className={`${styles.link} ${styles.back}`} onClick={()=>change({drill:null})}>Back to {view.label.toLowerCase()}</button> : null}
        <h2>{heading}</h2>
        {drill ? <TradeList key={drill.key} rows={drill.rows} basis={basis} returnTo={`${pathname}?${params}`} /> : rows.length === 0 && view.id !== "sizing" && view.id !== "compare" ? <div className={styles.empty}><h3>No completed trades in this scope</h3><p>Try a wider date range or clear the symbol and tag filters. Positions still open are excluded until the final exit.</p></div> : <>
        {view.id === "compare" ? <>
          <AnalyticsCompare key={JSON.stringify([ca,cb,basis])} history={history} range={range} today={today} a={ca} b={cb} aRows={cohortA} bRows={cohortB} basis={basis} onApply={(a,b)=>change({ca:JSON.stringify(a),cb:JSON.stringify(b),drill:null})} onInspect={inspect}/>
          <section className={styles.section}><h3>Compare by a shared dimension</h3><div className={styles.controls}><label>Break down by<select value={breakdown} onChange={e=>change({breakdown:e.target.value,drill:null})}>{breakdownOptions.map(b=><option key={b.value} value={b.value}>{b.label}</option>)}</select></label></div><Comparison groups={cohortBreakdowns} basis={basis} onOpen={inspect}/></section>
        </> : null}
        {view.id === "recovery" ? <AnalyticsRecovery rows={rows} basis={basis} onInspect={inspect}/> : null}
        {view.id === "performance" ? <>
          <p className={styles.intro}>Your results after each trade is fully closed. Start with the numbers, then inspect the sessions or trades behind them.</p>
          <Stats compact items={[[`${basis === "net" ? "Net" : "Gross"} P&L${stats.unknown && basis==="net" ? " · provisional" : ""}`,money(stats.pnl),stats.pnl],["Average / trade",money(stats.avg),stats.avg],["Win rate",decimal(stats.winRate,"%")],["Profit factor",stats.pf?.toFixed(2) ?? "—"]]} />
          <button className={styles.link} onClick={()=>inspect("all")}>Inspect all {rows.length} trades</button>
          <div className={styles.section}><h3>Performance across sessions</h3><PerformanceChart rows={rows} basis={basis} /><p className={styles.note}>Cumulative {basis} P&amp;L, starting at zero for this selection. Drawdown is measured at session close; it excludes unrealized moves.</p><details><summary className={styles.link}>Session results and drawdown</summary><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Date</th><th>P&amp;L</th><th>Cumulative</th><th>Drawdown</th></tr></thead><tbody>{sessions.map(s=><tr key={s.date}><th><button className={styles.link} onClick={()=>inspect(`day:${s.date}`)}>{s.date}</button></th><td>{money(s.pnl)}</td><td>{money(s.cumulative)}</td><td>{money(-s.drawdown)}</td></tr>)}</tbody></table></div></details></div>
          <PnlHistogram rows={rows} basis={basis} onOpen={inspect} />
          <RecentPerformance rows={rows} basis={basis} onInspect={inspect} />
          <section className={styles.section}><h3>Recovery at a glance</h3><Stats items={[["Current closing drawdown",money(-recovery.current)],["Sessions below peak",String(recovery.underwaterSessions)],["Recovered episodes",String(recovery.episodes.filter(e=>e.recovered).length)],["Ongoing episodes",String(recovery.episodes.filter(e=>!e.recovered).length)]]}/><button className={styles.link} onClick={()=>change({view:"recovery",drill:null})}>Explore drawdown and recovery</button></section>
          <OverviewDetails rows={rows} basis={basis} drawdown={dd} />
          <div className={styles.section}><h3>Gross, costs and net</h3><Stats items={[["Gross P&L",money(stats.gross)],["Recorded fees",money(stats.fees)],["Net P&L",money(stats.gross-stats.fees)],["Fee evidence",`${rows.length-stats.unknown} / ${rows.length}`]]}/><p className={styles.note}>Fee evidence counts trades with reported fees on every fill. Reported costs may still be updated by the broker.</p></div>
          <section className={styles.section}><h3>Largest contributors and detractors</h3><Comparison groups={symbols.length <= 8 ? symbols : [...symbols.slice(0,4),...symbols.slice(-4)]} basis={basis} onOpen={inspect}/><button className={styles.link} onClick={()=>change({view:"concentration",drill:null})}>Explore all contributors</button></section>
          <details className={styles.section}><summary className={styles.link}>Optional: entry session</summary><Comparison groups={windows} basis={basis} onOpen={inspect}/><p className={styles.note}>First entry in Eastern time. This is a compact supporting comparison; different setups, prices and position sizes can explain differences.</p></details>
        </> : null}
        {view.id === "sizing" ? <>
          <p className={styles.intro}>As share size increases on similarly priced stocks, do losses stay proportionate to winners?</p>
          <div className={styles.controls}><label>Entry price<select value={price.id} onChange={e=>change({price:e.target.value,drill:null})}>{priceBands.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label><label>Group A<select value={a.id} onChange={e=>change({a:e.target.value})}>{sizeBands.map(s=><option key={s.id} value={s.id}>{s.label} shares</option>)}</select></label><label>Group B<select value={b.id} onChange={e=>change({b:e.target.value})}>{sizeBands.map(s=><option key={s.id} value={s.id}>{s.label} shares</option>)}</select></label></div>
          {rows.length === 0 ? <p className={styles.notice}>No completed trades in this price range. Choose another entry-price band.</p> : null}
          {a.id===b.id ? <p className={styles.note}>Both groups contain the same trades. Select different size bands to compare.</p> : null}
          <Bars items={[["A · avg winner",as.avgWin],["A · avg loser",as.avgLoss],["B · avg winner",bs.avgWin],["B · avg loser",bs.avgLoss]]}/>
          <Comparison groups={[{...sizeA,key:`compareA:${a.id}`},{...sizeB,key:`compareB:${b.id}`}]} basis={basis} onOpen={key=>inspect(`size:${key.split(":")[1]}`)}/>
          <div className={styles.section}><h3>What changes with size?</h3><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Measure</th><th>A · {a.label}</th><th>B · {b.label}</th></tr></thead><tbody>{[
            ["Result / opening share",cents(as.perShare),cents(bs.perShare)],["Average winning hold",hold(as.winHold),hold(bs.winHold)],["Average losing hold",hold(as.lossHold),hold(bs.lossHold)],["Median loser",money(as.medianLoss),money(bs.medianLoss)],["Largest loser",money(as.worst),money(bs.worst)],["Average peak capital",money(as.avgCapital),money(bs.avgCapital)],["Trades with adds",String(as.adds),String(bs.adds)],["Trades with partial exits",String(sizeA.rows.filter(t=>t.reductions>0).length),String(sizeB.rows.filter(t=>t.reductions>0).length)],["Breakeven trades",String(as.scratches),String(bs.scratches)],["Recorded fees",money(as.fees),money(bs.fees)],["Trades with unknown fees",String(as.unknown),String(bs.unknown)],
          ].map(([label,v1,v2])=><tr key={label}><th scope="row">{label}</th><td>{v1}</td><td>{v2}</td></tr>)}</tbody></table></div></div>
          <button className={styles.link} onClick={()=>change({view:"compare",ca:JSON.stringify({...emptyCohort,...range,size:a.id,price:price.id}),cb:JSON.stringify({...emptyCohort,...range,size:b.id,price:price.id}),drill:null})}>Refine these groups in Compare</button>
          <p className={styles.note}>Size is peak concurrently held shares. Entry price is weighted across all opening fills. Per-share result divides total P&amp;L by total opening shares, not peak size. Capital is cost exposure, not planned risk.</p>
          {rows.some(t=>t.peakShares==null) ? <p className={styles.note}>Trades crossing a known share split are excluded from size and per-share comparisons.</p> : null}
          <p className={styles.note}>Small groups and different setups or market conditions can explain differences. This comparison does not establish readiness to size up or why an exit was late.</p>
          <details className={styles.section}><summary className={styles.link}>All size groups in this price range</summary><Comparison groups={sizes} basis={basis} onOpen={inspect}/></details>
        </> : null}
        {view.id === "giveback" ? <>
          <p className={styles.intro}>Review the difference between each session’s highest completed-trade P&amp;L and its finish.</p>
          <Stats items={[["Combined give-back",money(total(sessions.map(s=>s.giveback)))],["Sessions with give-back",String(sessions.filter(s=>s.giveback>0).length)],["Largest give-back",money(sessions.length ? Math.max(...sessions.map(s=>s.giveback)) : 0)]]}/>
          <div className={styles.tableWrap}><table className={styles.table}><caption>Completed-trade checkpoints · selected scope · {basis} dollars</caption><thead><tr><th>Session (ET)</th><th>Peak</th><th>Finish</th><th>Give-back</th></tr></thead><tbody>{sessions.map(s=><tr key={s.date}><th><button className={styles.link} onClick={()=>inspect(`day:${s.date}`)}>{s.date}</button></th><td>{money(s.peak)}</td><td>{money(s.pnl)}</td><td>{money(-s.giveback)}</td></tr>)}</tbody></table></div>
          <p className={styles.note}>The path starts at zero and advances when a trade fully closes. It excludes partial-exit timing and unrealized peaks. A losing session can have give-back from a zero peak; this is a review prompt, not a claim that gains were available to capture.</p>
        </> : null}
        {view.id === "concentration" ? <>
          <p className={styles.intro}>See how much one strong or weak session changes the result, then inspect the symbols contributing to it.</p>
          <Bars items={[["All sessions",stats.pnl],["Without best day",total(withoutBest.map(t=>t[basis]))],["Without worst day",total(withoutWorst.map(t=>t[basis]))]]}/>
          <div className={styles.controls}><button className={styles.link} onClick={()=>best && inspect(`day:${best.date}`)}>Inspect best day {best?.date}</button><button className={styles.link} onClick={()=>worst && inspect(`day:${worst.date}`)}>Inspect worst day {worst?.date}</button></div>
          <p className={styles.note}>One session removed at a time. This is sensitivity analysis, not a strategy simulation. For a one-session selection, removing that session leaves no trades.</p>
          <div className={styles.section}><h3>Contribution by symbol</h3><Comparison groups={symbols} basis={basis} onOpen={inspect}/></div>
        </> : null}
        {view.id === "reentry" ? <>
          <p className={styles.intro}>Compare the first completed position with later attempts in the same symbol, side and Eastern entry day. Adding while a position is open is part of that trade.</p>
          <Comparison groups={attempts} basis={basis} onOpen={inspect}/>
          <Bars items={attempts.map(g=>[g.label,average(g.rows.map(t=>t[basis]))])}/>
          <p className={styles.note}>Bars show average {basis} P&amp;L per trade. Attempt numbers are assigned from the account’s complete imported history before filtering. Missing imports can change the sequence; these groups do not prove that taking another entry caused a better or worse result.</p>
        </> : null}
        {view.id === "setups" ? <>
          <p className={styles.intro}>Compare recorded setups while keeping unclassified trades visible. Generic tags are available in the filter above; they are not automatically treated as setups.</p>
          <Stats items={[["Setup coverage",`${rows.filter(t=>t.setup!=="Unclassified").length} / ${rows.length}`],["Unclassified",String(rows.filter(t=>t.setup==="Unclassified").length)]]}/>
          <Comparison groups={setups} basis={basis} onOpen={inspect}/>
          <p className={styles.note}>Setup labels come from each trade’s setup field. Open a group and review its trades to add context. Unclassified results remain in the overall totals.</p>
        </> : null}
        </>}
        <div className={styles.section}><p className={styles.note}>Win rate excludes exact-zero breakeven trades. Profit factor is undefined without losses. Net uses recorded fees; an asterisk or fee notice marks incomplete coverage. All figures reflect the selected account and filters.</p><details><summary className={styles.link}>Data scope and definitions</summary><p className={styles.note}>One trade runs from flat to fully flat. Its whole result is assigned to its final exit date in Eastern time. Journal and Calendar still show execution-date realized activity, so totals can differ at date boundaries. Account-wide: {open} open positions excluded; {excluded} closed records lack a valid complete execution lifecycle. These exclusion counts are before the filters on this page. Accounts are selected individually in the app header; paper and live accounts are never combined here.</p></details></div>
      </section>
    </div>
  </div>;
}
