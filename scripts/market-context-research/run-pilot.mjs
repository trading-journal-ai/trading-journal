/** Offline, retrospective feature pass. Never reads a broker DB or calls a provider. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, openSync, writeSync, closeSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { computeWindowFeatures, FEATURE_SCHEMA_VERSION } from './features.mjs';

export const PILOT_VERSION = 'market-context-pilot:v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const SESSIONS = ['premarket', 'regular', 'afterHours'];

/** Build raw features using the Server's injected Core rules and trading calendar. */
export function analyzeSnapshot(snapshot, { qualifyCoreMover, calendar }) {
  if (snapshot?.schemaVersion !== 'market-context-pilot-input:v1' || !Array.isArray(snapshot.days)) {
    throw new Error('Expected a market-context-pilot-input:v1 snapshot');
  }
  const windows = [];
  const candidates = [];
  const days = [];
  const seenDays = new Set();
  const sessionCache = new Map();
  for (const day of snapshot.days) {
    if (seenDays.has(day.date)) throw new Error('Duplicate snapshot date');
    seenDays.add(day.date);
    if (!['bulk-minute', 'selected-recovery'].includes(day.stratum) || !Array.isArray(day.symbols)) {
      throw new Error('Invalid day stratum or symbols');
    }
    const definition = calendar.marketSessionDefinition(day.date);
    if (!definition.marketDay) throw new Error('Snapshot includes a non-market date');
    const summary = {
      date: day.date, stratum: day.stratum, sourceFingerprint: day.sourceFingerprint,
      sourceCoverage: day.coverage, sourceRead: day.sourceRead,
      calendar: definition, candidateCount: day.symbols.length, eligibleCount: 0,
      gainBands: { fiftyToUnderHundred: 0, hundredToUnderTwoHundred: 0, twoHundredPlus: 0 },
      inputBars: 0, outsideSessionBars: 0, invalidOrInterruptedBars: 0, windows: 0,
      classification: null,
      classificationReason: 'Research only; discovery completeness and quality thresholds are not established.',
      sessions: Object.fromEntries(SESSIONS.map(id => [id, { symbolsWithBars: 0, bars: 0, timestampGaps: 0, windows: 0 }])),
    };
    const seenSymbols = new Set();
    for (const entry of day.symbols) {
      if (typeof entry.symbol !== 'string' || seenSymbols.has(entry.symbol) || !Array.isArray(entry.bars)) {
        throw new Error('Invalid or duplicate symbol');
      }
      seenSymbols.add(entry.symbol);
      const c = entry.candidate;
      const core = qualifyCoreMover({
        instrumentType: c.instrument_type, previousRegularClose: c.previous_regular_close,
        previousCloseDate: c.previous_close_date, sessionDateEt: day.date,
        splitEvent: Boolean(c.split_event), maxGainPercent: c.max_gain_pct,
      });
      const validated = day.stratum === 'bulk-minute' || c.evaluation_state === 'validated';
      const eligible = core.qualifies && validated;
      candidates.push({ date: day.date, symbol: entry.symbol, stratum: day.stratum,
        eligible, ruleVersion: core.ruleVersion, excludedBy: core.excludedBy,
        evaluationState: c.evaluation_state ?? 'bulk-source',
        previousRegularClose: c.previous_regular_close, gainPercent: c.max_gain_pct,
        sourceFingerprint: day.sourceFingerprint, sessionStats: entry.sessionStats });
      if (!eligible) continue;
      summary.eligibleCount += 1;
      const band = c.max_gain_pct >= 200 ? 'twoHundredPlus' : c.max_gain_pct >= 100 ? 'hundredToUnderTwoHundred' : 'fiftyToUnderHundred';
      summary.gainBands[band] += 1;
      summary.inputBars += entry.bars.length;
      const bars = [];
      let previousTimestamp = -Infinity;
      for (const bar of entry.bars) {
        if (!Number.isSafeInteger(bar.timestamp) || bar.timestamp % 60_000 !== 0 || bar.timestamp <= previousTimestamp) {
          throw new Error('Bars must have unique, ascending minute-start timestamps in milliseconds');
        }
        previousTimestamp = bar.timestamp;
        if (!sessionCache.has(bar.timestamp)) sessionCache.set(bar.timestamp, calendar.marketSessionForTimestamp(bar.timestamp));
        const session = sessionCache.get(bar.timestamp);
        if (!session || session.date !== day.date) { summary.outsideSessionBars += 1; continue; }
        bars.push({ ...bar, session: session.id });
      }
      for (const id of SESSIONS) {
        const sessionBars = bars.filter(bar => bar.session === id);
        if (sessionBars.length) summary.sessions[id].symbolsWithBars += 1;
        summary.sessions[id].bars += sessionBars.length;
        summary.sessions[id].timestampGaps += sessionBars.slice(1).filter((bar, i) => bar.timestamp !== sessionBars[i].timestamp + 60_000).length;
      }
      const computed = computeWindowFeatures(bars);
      summary.invalidOrInterruptedBars += bars.length - computed.filter(window => window.horizon === 1).length;
      for (const window of computed) {
        windows.push({ date: day.date, symbol: entry.symbol, stratum: day.stratum,
          mode: 'retrospective-final-day-candidates', policyVersion: core.ruleVersion,
          featureVersion: FEATURE_SCHEMA_VERSION, sourceFingerprint: day.sourceFingerprint, ...window });
        summary.sessions[window.session].windows += 1;
      }
      summary.windows += computed.length;
    }
    days.push(summary);
  }
  return { days, candidates, windows };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node run-pilot.mjs --input SNAPSHOT.json --server-root SERVER_CHECKOUT --out NEW_PRIVATE_DIRECTORY');
    return;
  }
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--server-root', '--out'].includes(args[i]) || !args[i + 1] || values[args[i]]) throw new Error('Invalid arguments');
    values[args[i]] = resolve(args[i + 1]);
  }
  if (Object.keys(values).length !== 3) throw new Error('Required: --input, --server-root, --out');
  const started = performance.now();
  const input = readFileSync(values['--input']);
  const readMs = performance.now() - started;
  const parseStarted = performance.now();
  const snapshot = JSON.parse(input.toString('utf8'));
  const parseMs = performance.now() - parseStarted;
  const server = values['--server-root'];
  const rules = await import(pathToFileURL(join(server, 'services/market-archive/rules.mjs')));
  const { default: calendar } = await import(pathToFileURL(join(server, 'services/market-calendar.cjs')));
  const featureStarted = performance.now();
  const result = analyzeSnapshot(snapshot, { qualifyCoreMover: rules.qualifyCoreMover, calendar });
  const computeMs = performance.now() - featureStarted;
  mkdirSync(values['--out'], { mode: 0o700 }); // Exclusive new directory; never overwrite research output.
  // Bounded serialization avoids a second full array of JSON strings and a
  // giant joined string. The first pilot measured those copies as the RAM peak.
  const windowsDigest = createHash('sha256');
  let outputWindowBytes = 0;
  const descriptor = openSync(join(values['--out'], 'windows.jsonl'), 'wx', 0o600);
  let buffer = '';
  function flush() {
    if (!buffer) return;
    const bytes = Buffer.from(buffer);
    windowsDigest.update(bytes);
    outputWindowBytes += bytes.length;
    let offset = 0;
    while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset);
    buffer = '';
  }
  try {
    for (const window of result.windows) {
      buffer += JSON.stringify(window) + '\n';
      if (buffer.length >= 65_536) flush();
    }
    flush();
  } finally { closeSync(descriptor); }
  writeFileSync(join(values['--out'], 'candidates.json'), JSON.stringify(result.candidates, null, 2), { flag: 'wx', mode: 0o600 });
  const fingerprints = Object.fromEntries([
    'services/market-archive/rules.mjs', 'services/market-calendar.cjs', 'services/news-collection-schedule.cjs',
  ].map(name => [name, hash(readFileSync(join(server, name)))]));
  const summary = {
    version: PILOT_VERSION, featureVersion: FEATURE_SCHEMA_VERSION, generatedAt: new Date().toISOString(),
    mode: 'retrospective-final-day-candidates', inputSha256: hash(input),
    featuresSourceSha256: hash(readFileSync(new URL('./features.mjs', import.meta.url))),
    runnerSourceSha256: hash(readFileSync(import.meta.filename)), serverSourceHashes: fingerprints,
    windowsSha256: windowsDigest.digest('hex'), provenance: snapshot.provenance,
    benchmark: { inputBytes: input.length, readMs, parseMs, computeMs,
      elapsedBeforeSummaryMs: performance.now() - started,
      peakRssMiB: process.resourceUsage().maxRSS / 1024,
      outputWindowBytes, node: process.version },
    limits: [
      'Feasibility sample, not model calibration or whole-market completeness certification.',
      'Final-day candidate selection is retrospective; no entry-time or morning stock-selection claims.',
      'Missing intervals break windows; their cause is not identified. No zero bars are synthesized.',
      'No spread, fills, halt feed, point-in-time float, exhaustive news or opportunity-episode labels.',
      'Overlapping rolling windows are observations, not independent trades.',
    ],
    days: result.days,
  };
  writeFileSync(join(values['--out'], 'summary.json'), JSON.stringify(summary, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ output: values['--out'], dates: result.days.length, windows: result.windows.length, benchmark: summary.benchmark }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
