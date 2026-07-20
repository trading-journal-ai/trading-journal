#!/usr/bin/env node
/**
 * Generate the trade×candle join dataset for the /preview/data-viz/v3 page.
 *
 * Reads the bundled demo DB (samples/demo/tradingjournaldemo.db), joins every
 * closed trade to its ticker-day 1-minute candles, and computes the
 * opportunity-context metrics that are otherwise gated as FUTURE DATA:
 * MAE/MFE, capture ratio, VWAP relationship at entry, premarket/day-high
 * context, relative volume at entry, and post-exit run-up.
 *
 * Output: src/lib/preview/candleJoinData.ts (checked in, like the other
 * bundled preview datasets). Re-run: node scripts/generate-candle-join-data.mjs
 */
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve(process.env.DEMO_DB_PATH ?? "samples/demo/tradingjournaldemo.db");
const OUT_PATH = resolve("src/lib/preview/candleJoinData.ts");

const db = new Database(DB_PATH, { readonly: true });

/* ---------- ET time helpers ---------- */

const etFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Epoch seconds -> { date: "YYYY-MM-DD", minutes: minutes since ET midnight }. */
function toET(epochSec) {
  const parts = Object.fromEntries(etFmt.formatToParts(new Date(epochSec * 1000)).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24; // "24" guard
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
  };
}

/* ---------- load trades, group into ticker-days ---------- */

const trades = db
  .prepare(
    `SELECT id, symbol, side, quantity, avg_entry_price AS entry, avg_exit_price AS exit,
            entry_at AS entryAt, exit_at AS exitAt, fees
     FROM trades
     WHERE status='closed' AND entry_at IS NOT NULL AND exit_at IS NOT NULL
       AND avg_entry_price IS NOT NULL AND avg_exit_price IS NOT NULL
     ORDER BY entry_at`,
  )
  .all();

const candleStmt = db.prepare(
  `SELECT t, o, h, l, c, vol FROM candles
   WHERE symbol=? AND timeframe='1m' AND t BETWEEN ? AND ? ORDER BY t`,
);

const byTickerDay = new Map();
for (const tr of trades) {
  const et = toET(tr.entryAt);
  const key = `${tr.symbol}|${et.date}`;
  if (!byTickerDay.has(key)) byTickerDay.set(key, []);
  byTickerDay.get(key).push({ ...tr, etDate: et.date, etMinutes: et.minutes });
}

/* ---------- per ticker-day session computation ---------- */

const OPEN_MIN = 9 * 60 + 30; // 09:30 ET
const round = (v, p = 4) => (v == null ? null : Number(v.toFixed(p)));

const records = [];
const moveDays = [];
const tickerDayMeta = new Map();
let skipped = 0;

for (const [key, dayTrades] of byTickerDay) {
  const [symbol] = key.split("|");
  const anchor = dayTrades[0].entryAt;
  // fetch a generous UTC window around the entry, filter to the ET date
  const rows = candleStmt.all(symbol, anchor - 22 * 3600, anchor + 22 * 3600);
  const etDate = dayTrades[0].etDate;
  const bars = [];
  for (const r of rows) {
    const et = toET(r.t);
    if (et.date === etDate && et.minutes >= 4 * 60 && et.minutes < 20 * 60) {
      bars.push({ ...r, m: et.minutes });
    }
  }
  if (bars.length < 10) {
    skipped += dayTrades.length;
    continue;
  }

  // running session state per bar index: cumulative VWAP, running high, premarket high
  let cumPV = 0;
  let cumV = 0;
  let runHigh = -Infinity;
  let runHighAtMin = null;
  let pmHigh = null;
  const state = bars.map((b) => {
    const typical = (b.h + b.l + b.c) / 3;
    cumPV += typical * b.vol;
    cumV += b.vol;
    if (b.h >= runHigh) {
      runHigh = b.h;
      runHighAtMin = b.m;
    }
    if (b.m < OPEN_MIN) pmHigh = pmHigh == null ? b.h : Math.max(pmHigh, b.h);
    return {
      vwap: cumV > 0 ? cumPV / cumV : null,
      high: runHigh,
      highAtMin: runHighAtMin,
      pmHigh,
      cumVol: cumV,
    };
  });

  // ---- day anatomy (hindsight classification, labeled as such in the UI) ----
  const base = bars[0].o; // first traded price of the ET session
  const totalVol = cumV;
  const dayHigh = runHigh;
  const dayHighMin = runHighAtMin;
  const maxGainPct = base > 0 ? ((dayHigh - base) / base) * 100 : null;

  // ignition: first minute whose forward 5-minute close return >= IGNITION_PCT
  const IGNITION_PCT = 10;
  let ignitionMin = null;
  let ignitionMovePct = null;
  outer: for (let i = 0; i < bars.length; i++) {
    let bestFwd = 0;
    for (let j = i + 1; j < bars.length && bars[j].m <= bars[i].m + 5; j++) {
      const fwd = ((bars[j].c - bars[i].c) / bars[i].c) * 100;
      if (fwd > bestFwd) bestFwd = fwd;
    }
    if (bestFwd >= IGNITION_PCT) {
      ignitionMin = bars[i].m;
      ignitionMovePct = bestFwd;
      break outer;
    }
  }

  const idxAtOrBefore = (min) => {
    let lo = 0;
    let hi = bars.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (bars[mid].m <= min) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  };

  for (const tr of dayTrades) {
    const entryET = tr.etMinutes;
    const exitET = toET(tr.exitAt);
    const iEntry = idxAtOrBefore(entryET);
    if (iEntry < 0 || exitET.date !== etDate) {
      skipped += 1;
      continue;
    }
    const iExit = Math.max(iEntry, idxAtOrBefore(exitET.minutes));
    const s = state[iEntry];
    const dir = tr.side === "short" ? -1 : 1;

    // MAE/MFE per share over the holding window (side-aware)
    let worst = Infinity; // most adverse price
    let best = -Infinity; // most favorable price
    for (let i = iEntry; i <= iExit; i++) {
      const lo = dir === 1 ? bars[i].l : -bars[i].h;
      const hi = dir === 1 ? bars[i].h : -bars[i].l;
      if (lo < worst) worst = lo;
      if (hi > best) best = hi;
    }
    const entrySigned = dir === 1 ? tr.entry : -tr.entry;
    const maePs = Math.max(0, entrySigned - worst); // $ against, per share
    const mfePs = Math.max(0, best - entrySigned); // $ favorable, per share
    const realizedPs = (dir === 1 ? tr.exit - tr.entry : tr.entry - tr.exit);
    const pnl = realizedPs * tr.quantity - (tr.fees ?? 0);

    // relative volume: entry bar vs median of prior 30 bars
    let relVol = null;
    if (iEntry >= 6) {
      const start = Math.max(0, iEntry - 30);
      const prior = bars
        .slice(start, iEntry)
        .map((b) => b.vol)
        .sort((a, b) => a - b);
      const med = prior[Math.floor(prior.length / 2)];
      if (med > 0) relVol = bars[iEntry].vol / med;
    }

    // post-exit run-up: best favorable price in the 10 minutes after exit
    let postBest = -Infinity;
    for (let i = iExit + 1; i < bars.length && bars[i].m <= exitET.minutes + 10; i++) {
      const hi = dir === 1 ? bars[i].h : -bars[i].l;
      if (hi > postBest) postBest = hi;
    }
    const exitSigned = dir === 1 ? tr.exit : -tr.exit;
    const postRunPs = postBest === -Infinity ? null : Math.max(0, postBest - exitSigned);

    records.push({
      id: tr.id,
      symbol,
      date: etDate,
      minuteET: entryET,
      side: tr.side,
      qty: tr.quantity,
      entry: round(tr.entry),
      holdSec: Math.max(1, tr.exitAt - tr.entryAt),
      pnl: round(pnl, 2),
      maePct: round((maePs / tr.entry) * 100, 3),
      mfePct: round((mfePs / tr.entry) * 100, 3),
      capture: mfePs > 1e-9 ? round(realizedPs / mfePs, 3) : null,
      vwapDistPct: s.vwap ? round(((entrySigned - (dir === 1 ? s.vwap : -s.vwap)) / s.vwap) * 100 * dir, 3) : null,
      pmHighDistPct: s.pmHigh ? round(((tr.entry - s.pmHigh) / s.pmHigh) * 100, 3) : null,
      minSinceHigh: s.highAtMin != null ? Math.max(0, entryET - s.highAtMin) : null,
      relVol: round(relVol, 2),
      postRunPct: postRunPs != null ? round((postRunPs / tr.entry) * 100, 3) : null,
      // ---- move anatomy (hindsight day classification) ----
      dayGainAtEntryPct: base > 0 ? round(((tr.entry - base) / base) * 100, 2) : null,
      volElapsedPct: totalVol > 0 ? round((s.cumVol / totalVol) * 100, 1) : null,
      minFromIgnition: ignitionMin != null ? entryET - ignitionMin : null,
    });
  }

  const dayRecords = records.filter((r) => r.symbol === symbol && r.date === etDate);
  if (dayRecords.length && maxGainPct != null) {
    moveDays.push({
      symbol,
      date: etDate,
      maxGainPct: round(maxGainPct, 1),
      ignited: ignitionMin != null,
      ignitionMovePct: round(ignitionMovePct, 1),
      pnl: round(dayRecords.reduce((a, r) => a + r.pnl, 0), 2),
      n: dayRecords.length,
    });
  }

  // volume-at-price profile for the busiest ticker-day (picked after the loop)
  tickerDayMeta.set(key, { bars, base, dayHigh, dayHighMin, ignitionMin, tradeCount: dayRecords.length });
}

/* ---------- volume-at-price profile for the busiest ticker-day ---------- */

let profileDay = null;
{
  let bestKey = null;
  let bestScore = -1;
  for (const [key, meta] of tickerDayMeta) {
    if (meta.tradeCount > bestScore) {
      bestScore = meta.tradeCount;
      bestKey = key;
    }
  }
  if (bestKey) {
    const meta = tickerDayMeta.get(bestKey);
    const [symbol, date] = bestKey.split("|");
    const lo = Math.min(...meta.bars.map((b) => b.l));
    const hi = Math.max(...meta.bars.map((b) => b.h));
    const BIN_COUNT = 30;
    const binSize = (hi - lo) / BIN_COUNT;
    const bins = Array.from({ length: BIN_COUNT }, (_, i) => ({
      price: round(lo + (i + 0.5) * binSize, 3),
      vol: 0,
    }));
    for (const b of meta.bars) {
      const typical = (b.h + b.l + b.c) / 3;
      const bi = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((typical - lo) / binSize)));
      bins[bi].vol += b.vol;
    }
    const totalVol = bins.reduce((a, b) => a + b.vol, 0);
    const poc = bins.reduce((m, b) => (b.vol > m.vol ? b : m), bins[0]);
    profileDay = {
      symbol,
      date,
      base: round(meta.base, 3),
      dayHigh: round(meta.dayHigh, 3),
      dayHighMin: meta.dayHighMin,
      ignitionMin: meta.ignitionMin,
      pocPrice: poc.price,
      bins: bins.map((b) => ({ price: b.price, volShare: round(b.vol / totalVol, 4) })),
      path: meta.bars.filter((_, i) => i % 3 === 0).map((b) => ({ m: b.m, c: round(b.c, 3) })),
      trades: records
        .filter((r) => r.symbol === symbol && r.date === date)
        .map((r) => ({ id: r.id, minuteET: r.minuteET, entry: r.entry, qty: r.qty, pnl: r.pnl })),
    };
  }
}

/* ---------- summary stats (printed for claim-writing) ---------- */

const wins = records.filter((r) => r.pnl > 0);
const losses = records.filter((r) => r.pnl < 0);
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const expectancy = (list) => (list.length ? list.reduce((a, r) => a + r.pnl, 0) / list.length : null);

console.log(`records: ${records.length} (skipped ${skipped}) · wins ${wins.length} / losses ${losses.length}`);
console.log(`median MAE% — winners ${median(wins.map((r) => r.maePct))} vs losers ${median(losses.map((r) => r.maePct))}`);
console.log(`median MFE% — winners ${median(wins.map((r) => r.mfePct))} vs losers ${median(losses.map((r) => r.mfePct))}`);
console.log(`median capture (winners) ${median(wins.filter((r) => r.capture != null).map((r) => r.capture))}`);
console.log(`median post-exit run-up% (winners) ${median(wins.filter((r) => r.postRunPct != null).map((r) => r.postRunPct))}`);
for (const [label, test] of [
  ["above VWAP", (r) => r.vwapDistPct != null && r.vwapDistPct > 0],
  ["below VWAP", (r) => r.vwapDistPct != null && r.vwapDistPct <= 0],
  ["above PM high", (r) => r.pmHighDistPct != null && r.pmHighDistPct > 0],
  ["below PM high", (r) => r.pmHighDistPct != null && r.pmHighDistPct <= 0],
]) {
  const g = records.filter(test);
  console.log(`${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)} winRate=${((g.filter((r) => r.pnl > 0).length / g.length) * 100).toFixed(1)}%`);
}
for (const [label, lo, hi] of [["<1x", 0, 1], ["1-2x", 1, 2], ["2-4x", 2, 4], ["4x+", 4, 1e9]]) {
  const g = records.filter((r) => r.relVol != null && r.relVol >= lo && r.relVol < hi);
  console.log(`relVol ${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)}`);
}
for (const [label, lo, hi] of [["<=2m", 0, 2], ["2-10m", 2, 10], [">10m", 10, 1e9]]) {
  const g = records.filter((r) => r.minSinceHigh != null && r.minSinceHigh >= lo && r.minSinceHigh < hi);
  console.log(`minSinceHigh ${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)}`);
}
console.log("--- move anatomy ---");
console.log(`ticker-days: ${moveDays.length} · ignited (>=10% in 5m): ${moveDays.filter((d) => d.ignited).length}`);
for (const [label, lo, hi] of [["<10%", -1e9, 10], ["10-25%", 10, 25], ["25-50%", 25, 50], ["50%+", 50, 1e9]]) {
  const g = records.filter((r) => r.dayGainAtEntryPct != null && r.dayGainAtEntryPct >= lo && r.dayGainAtEntryPct < hi);
  console.log(`extension ${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)} winRate=${g.length ? ((g.filter((r) => r.pnl > 0).length / g.length) * 100).toFixed(0) : "-"}%`);
}
for (const [label, lo, hi] of [["pre-ignition", -1e9, 0], ["0-5m", 0, 5], ["5-15m", 5, 15], ["15-60m", 15, 60], ["60m+", 60, 1e9]]) {
  const g = records.filter((r) => r.minFromIgnition != null && r.minFromIgnition >= lo && r.minFromIgnition < hi);
  console.log(`ignition ${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)}`);
}
const noIgn = records.filter((r) => r.minFromIgnition == null);
console.log(`no-ignition days: n=${noIgn.length} exp=$${expectancy(noIgn)?.toFixed(2)}`);
for (const [label, lo, hi] of [["0-25%", 0, 25], ["25-50%", 25, 50], ["50-75%", 50, 75], ["75-100%", 75, 101]]) {
  const g = records.filter((r) => r.volElapsedPct != null && r.volElapsedPct >= lo && r.volElapsedPct < hi);
  console.log(`volElapsed ${label}: n=${g.length} exp=$${expectancy(g)?.toFixed(2)}`);
}
const bigMovers = moveDays.filter((d) => d.maxGainPct >= 50);
console.log(`movers >=50%: ${bigMovers.length} days, pnl $${bigMovers.reduce((a, d) => a + d.pnl, 0).toFixed(0)} of total $${moveDays.reduce((a, d) => a + d.pnl, 0).toFixed(0)}`);
console.log(`profile day: ${profileDay?.symbol} ${profileDay?.date} · ${profileDay?.trades.length} trades`);

/* ---------- emit TS ---------- */

const header = `// Generated by scripts/generate-candle-join-data.mjs — do not edit by hand.
// Source: bundled demo DB (${trades.length} closed trades joined to 1-minute candles,
// full 04:00–20:00 ET session; ${records.length} trades with usable coverage).
// Metrics are side-aware. Percentages are per-share moves relative to entry price.

export type JoinedTrade = {
  id: number;
  symbol: string;
  date: string; // ET date
  minuteET: number; // entry, minutes since ET midnight
  side: "long" | "short";
  qty: number;
  entry: number;
  holdSec: number;
  pnl: number; // net dollars
  maePct: number; // max adverse excursion, % of entry
  mfePct: number; // max favorable excursion, % of entry
  capture: number | null; // realized per-share / MFE per-share
  vwapDistPct: number | null; // entry vs session VWAP (+ = favorable side)
  pmHighDistPct: number | null; // entry vs premarket high, %
  minSinceHigh: number | null; // minutes since the running day high at entry
  relVol: number | null; // entry-minute volume vs median of prior 30 bars
  postRunPct: number | null; // favorable move within 10 min after exit, %
  dayGainAtEntryPct: number | null; // entry price vs first session print (hindsight base)
  volElapsedPct: number | null; // share of the day's total volume printed before entry (hindsight)
  minFromIgnition: number | null; // minutes from the day's first ">=10% in 5m" onset (hindsight); negative = before it
};

export type MoveDay = {
  symbol: string;
  date: string;
  maxGainPct: number; // session base -> day high
  ignited: boolean; // day had a >=10%-in-5-minutes onset
  ignitionMovePct: number | null;
  pnl: number; // trader's net on this ticker-day
  n: number; // trades taken
};

export type ProfileDay = {
  symbol: string;
  date: string;
  base: number;
  dayHigh: number;
  dayHighMin: number;
  ignitionMin: number | null;
  pocPrice: number; // point of control (highest-volume price bin)
  bins: { price: number; volShare: number }[];
  path: { m: number; c: number }[]; // downsampled close path for context
  trades: { id: number; minuteET: number; entry: number; qty: number; pnl: number }[];
};

export const joinedTrades: JoinedTrade[] = `;

const tail = `;

export const moveDays: MoveDay[] = ${JSON.stringify(moveDays)};

export const profileDay: ProfileDay = ${JSON.stringify(profileDay)};
`;

writeFileSync(OUT_PATH, `${header}${JSON.stringify(records)}${tail}`);
console.log(`wrote ${OUT_PATH}`);
