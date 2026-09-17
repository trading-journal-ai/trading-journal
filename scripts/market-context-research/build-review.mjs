/** Build a private, offline chart-review worksheet from the retrospective pilot. */
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export const REVIEW_VERSION = 'market-context-chart-review:v1';
const MINUTE = 60_000;
const SESSIONS = ['premarket', 'regular', 'afterHours'];
const STRATA = ['bulk-minute', 'selected-recovery'];
const CATEGORIES = ['advance', 'chop', 'fade', 'middle'];
const sha256 = value => createHash('sha256').update(value).digest('hex');
const key = (date, symbol) => `${date}\0${symbol}`;
const cohort = price => price < 1 ? 'under $1' : price < 5 ? '$1–5' : price < 20 ? '$5–20' : '$20+';
const safeJson = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, char =>
  ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[char]);

function options() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node build-review.mjs --input snapshot.json --windows windows.jsonl --chart-library lightweight-charts.standalone.production.js --out NEW.html');
    return null;
  }
  const parsed = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--windows', '--chart-library', '--out'].includes(args[i]) || !args[i + 1] || parsed[args[i]]) throw new Error('Expected --input, --windows, --chart-library, --out once each');
    parsed[args[i]] = resolve(args[i + 1]);
  }
  if (Object.keys(parsed).length !== 4 || !parsed['--out'].endsWith('.html')) throw new Error('Four arguments required; --out must be a new .html file');
  return parsed;
}

function rank(rows, category) {
  const byIdentity = (a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol) || a.windowStartTimestamp - b.windowStartTimestamp;
  const median = [...rows].sort((a, b) => a.signedProgressPct - b.signedProgressPct)[Math.floor(rows.length / 2)]?.signedProgressPct ?? 0;
  const score = row => category === 'advance' ? -row.signedProgressPct
    : category === 'fade' ? row.signedProgressPct
      : category === 'chop' ? -(row.adjacentOverlap ?? 0) - row.reversalCount / 4
        : Math.abs(row.signedProgressPct - median);
  const eligible = rows.filter(row => category === 'advance' ? row.signedProgressDollars > 0
    : category === 'fade' ? row.signedProgressDollars < 0
      : category === 'chop' ? row.reversalCount > 0 : true);
  return (eligible.length ? eligible : rows).sort((a, b) => score(a) - score(b) || byIdentity(a, b));
}

/** Fixed two slots per stratum/session; one case per symbol-date, with price-cohort spread. */
export function selectCases(windows, candidates, count = 12) {
  const selected = [], usedSymbols = new Set(), usedCohorts = new Set();
  const groups = STRATA.flatMap(stratum => SESSIONS.map(session => ({ stratum, session })));
  for (let slot = 0; slot < count; slot += 1) {
    const group = groups[Math.floor(slot / 2) % groups.length];
    const category = CATEGORIES[slot % CATEGORIES.length];
    const pool = windows.filter(row => row.stratum === group.stratum && row.session === group.session);
    const available = rank(pool, category).filter(row => !usedSymbols.has(key(row.date, row.symbol)));
    const row = available.find(item => !usedCohorts.has(candidates.get(key(item.date, item.symbol))?.priceCohort)) ?? available[0];
    if (!row) continue;
    const candidate = candidates.get(key(row.date, row.symbol));
    usedSymbols.add(key(row.date, row.symbol));
    usedCohorts.add(candidate.priceCohort);
    selected.push({ ...row, selection: { rule: category, stratum: group.stratum,
      session: group.session, priceCohort: candidate.priceCohort, version: REVIEW_VERSION } });
  }
  return selected;
}

async function readWindows(path, days, entries) {
  const five = [], oneMinuteSessions = new Map(), digest = createHash('sha256');
  const stream = createReadStream(path);
  stream.on('data', chunk => digest.update(chunk));
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const row = JSON.parse(line);
    const day = days.get(row.date);
    if (!day || row.sourceFingerprint !== day.sourceFingerprint || row.stratum !== day.stratum ||
        !entries.has(key(row.date, row.symbol))) {
      throw new Error('Windows do not match the snapshot dates, symbols, strata, and source fingerprints');
    }
    if (row.horizon === 5) five.push(row);
    if (row.horizon === 1) {
      const id = key(row.date, row.symbol);
      if (!oneMinuteSessions.has(id)) oneMinuteSessions.set(id, new Map());
      oneMinuteSessions.get(id).set(row.windowStartTimestamp, row.session);
    }
  }
  return { five, oneMinuteSessions, hash: digest.digest('hex') };
}

function chartContext(row, entry, minuteSessions) {
  const from = row.windowStartTimestamp - 10 * MINUTE;
  const to = row.windowEndTimestamp + 10 * MINUTE;
  const actual = entry.bars.filter(bar => bar.timestamp >= from && bar.timestamp < to &&
    minuteSessions?.get(bar.timestamp) === row.session);
  if (!actual.length) throw new Error('Selected window has no same-session chart bars');
  const byTime = new Map(actual.map(bar => [bar.timestamp, bar]));
  const candles = [];
  // Whitespace points represent missing minutes; they invent no OHLCV.
  for (let timestamp = actual[0].timestamp; timestamp <= actual.at(-1).timestamp; timestamp += MINUTE) {
    const bar = byTime.get(timestamp);
    const time = timestamp / 1000;
    candles.push(bar ? { time, open: bar.open, high: bar.high, low: bar.low, close: bar.close,
      studied: timestamp >= row.windowStartTimestamp && timestamp < row.windowEndTimestamp }
      : { time });
  }
  return candles;
}

function html(packet, library) {
  const embeddedLibrary = library.replace(/<\/script/gi, '<\\/script');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src data: blob:">
<title>Market context · Chart review</title><style>
:root{color-scheme:dark;--bg:#080c12;--surface:#111821;--line:#273040;--text:#e6edf3;--body:#c3ccd8;--muted:#9ba6b5;--accent:#58a6ff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 Arial,Helvetica,sans-serif}
button,textarea{font:inherit}button{cursor:pointer}button:focus-visible,textarea:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.shell{display:grid;grid-template-columns:250px minmax(0,1fr);min-height:100vh}.rail{border-right:1px solid var(--line);padding:24px 16px;position:sticky;top:0;height:100vh;overflow:auto}
.rail h1{font-size:20px;line-height:1.2;margin:0 8px 8px}.rail p{color:var(--muted);font-size:13px;margin:0 8px 24px}.cases{display:grid;gap:4px}.case{width:100%;text-align:left;border:0;background:transparent;color:var(--body);padding:10px;border-radius:6px}.case[aria-current=true]{background:#1a2432;color:var(--text)}
.main{width:min(100%,1050px);padding:32px clamp(20px,4vw,56px);margin:auto}.top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:24px}.top h2{font-size:clamp(24px,3vw,34px);line-height:1.15;margin:0 0 6px}.top p,.caption,.foot{color:var(--muted);margin:0}.download,.next{background:#242a35;border:1px solid var(--line);color:var(--text);border-radius:6px;padding:10px 14px;white-space:nowrap}.download:hover,.next:hover{background:#303b4a}
.chart{height:460px;margin:24px 0 8px}.caption{font-size:13px;border-bottom:1px solid var(--line);padding-bottom:22px}.review{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin:32px 0}.question{border:0;margin:0;padding:0;min-width:0}.question legend{font-weight:600;margin-bottom:12px}.choices{display:flex;flex-wrap:wrap;gap:8px}.choices label{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:6px;padding:8px 10px;cursor:pointer;color:var(--body)}.choices label:has(input:checked){border-color:var(--accent);color:var(--text);background:#14233a}
.notes{display:block;font-weight:600;margin:0 0 10px}.notesbox{width:100%;min-height:104px;resize:vertical;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:6px;padding:12px}.bottom{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:20px 0 34px}.foot{font-size:13px;max-width:65ch}details{border-top:1px solid var(--line);padding:20px 0;color:var(--body)}summary{cursor:pointer;color:var(--text)}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;color:var(--muted)}
@media(max-width:760px){.shell{display:block}.rail{height:auto;position:static;border-right:0;border-bottom:1px solid var(--line);padding:16px}.rail p{margin-bottom:12px}.cases{display:flex;overflow:auto}.case{min-width:150px}.main{padding:24px 16px}.top{display:block}.download{margin-top:16px}.chart{height:340px}.review{grid-template-columns:1fr;gap:24px}.bottom{align-items:flex-start;flex-direction:column}}
</style><div class="shell"><aside class="rail"><h1>Chart review</h1><p>12 retrospective windows · private worksheet. Answers stay in this tab; download before closing.</p><nav class="cases" id="cases" aria-label="Review cases"></nav></aside>
<main class="main"><header class="top"><div><h2 id="title"></h2><p id="subtitle"></p></div><button class="download" id="download">Download labels JSON</button></header>
<div class="chart" id="chart" role="img" aria-label="Minute candlestick chart"></div><p class="caption" id="caption"></p>
<form class="review" id="review"><fieldset class="question"><legend>Was this window usable?</legend><div class="choices" id="usable"></div></fieldset><fieldset class="question"><legend>Enough dollar range?</legend><div class="choices" id="range"></div></fieldset></form>
<label class="notes" for="notes">Review notes</label><textarea class="notesbox" id="notes" placeholder="What did the chart show? What remains uncertain?"></textarea>
<div class="bottom"><p class="foot" id="progress"></p><button class="next" id="next">Next case</button></div><details><summary>Feature and selection details</summary><pre id="details"></pre></details></main></div>
<script>${embeddedLibrary}</script><script type="application/json" id="packet">${safeJson(packet)}</script><script>
const packet=JSON.parse(document.getElementById('packet').textContent), answers=packet.cases.map(()=>({usable:null,enoughRange:null,notes:''}));
const et=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'numeric',minute:'2-digit',hour12:true});
let active=0, chart=null; const $=id=>document.getElementById(id);
function choices(id, values, field){const box=$(id);box.replaceChildren();for(const value of values){const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name=field;input.value=value;input.checked=answers[active][field]===value;input.addEventListener('change',()=>{answers[active][field]=value;list()});label.append(input,document.createTextNode(value));box.append(label)}}
function list(){const nav=$('cases');nav.replaceChildren();packet.cases.forEach((item,i)=>{const button=document.createElement('button');button.className='case';button.type='button';button.setAttribute('aria-current',String(i===active));button.textContent=(i+1)+'. '+item.symbol+' · '+item.session+' · '+(answers[i].usable?'Reviewed':'Open');button.onclick=()=>show(i);nav.append(button)})}
function show(i){active=i;const item=packet.cases[i],start=et.format(item.windowStartTimestamp),end=et.format(item.windowEndTimestamp);list();$('title').textContent=item.symbol+' · '+item.date;$('subtitle').textContent=item.session+' · '+start+'–'+end+' ET';$('caption').textContent='Studied five-minute window: '+start+'–'+end+' ET. Colored candles mark the studied interval; gray candles provide same-session context. Empty chart intervals are missing minutes.';$('details').textContent=JSON.stringify({selection:item.selection,features:item.features},null,2);$('notes').value=answers[i].notes;choices('usable',['Usable','Choppy / not usable','Unclear'],'usable');choices('range',['Yes','No','Unclear'],'enoughRange');$('progress').textContent=(i+1)+' of '+packet.cases.length+' · Retrospective chart review; no execution or spread evidence.';$('next').disabled=i===packet.cases.length-1;
if(chart)chart.remove();const host=$('chart'),study=item.candles.find(c=>c.studied),precision=study.open<1?6:study.open<5?4:2;chart=LightweightCharts.createChart(host,{width:host.clientWidth,height:host.clientHeight,layout:{background:{type:'solid',color:'#080c12'},textColor:'#9ba6b5'},grid:{vertLines:{color:'#18212c'},horzLines:{color:'#18212c'}},timeScale:{timeVisible:true,secondsVisible:false,tickMarkFormatter:t=>et.format(t*1000)},localization:{timeFormatter:t=>et.format(t*1000)},rightPriceScale:{borderColor:'#273040'}});const series=chart.addSeries(LightweightCharts.CandlestickSeries,{upColor:'#1db26b',downColor:'#f05143',wickUpColor:'#1db26b',wickDownColor:'#f05143',borderVisible:false,priceFormat:{type:'price',precision,minMove:10**-precision}});series.setData(item.candles.map(c=>c.open===undefined?{time:c.time}:{time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,color:c.studied?(c.close>=c.open?'#1db26b':'#f05143'):'#647386',wickColor:c.studied?(c.close>=c.open?'#1db26b':'#f05143'):'#647386'}));chart.timeScale().fitContent()}
$('notes').addEventListener('input',e=>{answers[active].notes=e.target.value});$('next').onclick=()=>{if(active<packet.cases.length-1)show(active+1)};
$('download').onclick=()=>{const output={schemaVersion:'market-context-review-labels:v1',selectionVersion:packet.selectionVersion,snapshotSha256:packet.snapshotSha256,windowsSha256:packet.windowsSha256,generatedAt:new Date().toISOString(),cases:packet.cases.map((item,i)=>({date:item.date,symbol:item.symbol,stratum:item.stratum,session:item.session,windowStartTimestamp:item.windowStartTimestamp,windowEndTimestamp:item.windowEndTimestamp,selection:item.selection,features:item.features,answer:answers[i]}))};const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='market-context-review-labels.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
new ResizeObserver(()=>{if(chart){chart.applyOptions({width:$('chart').clientWidth,height:$('chart').clientHeight});chart.timeScale().fitContent()}}).observe($('chart'));show(0);
</script></html>`;
}

async function main() {
  const args = options(); if (!args) return;
  const input = readFileSync(args['--input']);
  const snapshot = JSON.parse(input.toString('utf8'));
  if (snapshot.schemaVersion !== 'market-context-pilot-input:v1') throw new Error('Unsupported snapshot');
  const entries = new Map(), days = new Map();
  for (const day of snapshot.days) days.set(day.date,
    { sourceFingerprint: day.sourceFingerprint, stratum: day.stratum });
  for (const day of snapshot.days) for (const entry of day.symbols) entries.set(key(day.date, entry.symbol),
    { ...entry, priceCohort: cohort(entry.candidate.previous_regular_close) });
  const { five, oneMinuteSessions, hash } = await readWindows(args['--windows'], days, entries);
  const selected = selectCases(five, entries);
  if (selected.length !== 12) throw new Error(`Only ${selected.length} of 12 review cases available`);
  const cases = selected.map(row => {
    const entry = entries.get(key(row.date, row.symbol));
    if (!entry) throw new Error('Window has no matching snapshot candidate');
    const { selection, date, symbol, stratum, session, windowStartTimestamp, windowEndTimestamp, ...features } = row;
    return { selection, date, symbol, stratum, session, windowStartTimestamp, windowEndTimestamp,
      features, candles: chartContext(row, entry, oneMinuteSessions.get(key(date, symbol))) };
  });
  const packet = { selectionVersion: REVIEW_VERSION, snapshotSha256: sha256(input), windowsSha256: hash, cases };
  const library = readFileSync(args['--chart-library'], 'utf8');
  if (!library.includes('LightweightCharts')) throw new Error('Expected Lightweight Charts standalone bundle');
  writeFileSync(args['--out'], html(packet, library), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output: args['--out'], cases: cases.length, sessions: [...new Set(cases.map(item => item.session))], strata: [...new Set(cases.map(item => item.stratum))] }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
