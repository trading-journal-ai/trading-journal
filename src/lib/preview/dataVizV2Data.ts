// Synthetic trade-level dataset for the v2 "lens lab" preview.
// One master trade table, generated deterministically from the v1 session
// summaries so every lens derives from the same source and always agrees.
import { sessionPoints } from "./dataVizPrototypeData";

export type LensTrade = {
  id: number;
  date: string; // ISO, e.g. "2026-07-01"
  day: number; // day of month
  weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  minute: number; // minutes since 07:00 ET
  time: string; // "09:42" ET
  symbol: string;
  side: "long" | "short";
  shares: number;
  holdSeconds: number;
  relVol: number; // relative volume multiple at entry
  setup: string | null;
  pnl: number; // net dollars
};

export type VolumeCurvePoint = {
  minute: number; // bin start, minutes since 07:00 ET
  label: string;
  millions: number; // synthetic market share volume for the bin
};

export const lensWeekRanges = [
  { label: "Jun 29 – Jul 3", days: [1, 2, 3] },
  { label: "Jul 6 – 10", days: [6, 7, 8, 9, 10] },
  { label: "Jul 13 – 17", days: [13, 14, 15, 16, 17] },
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
const SYMBOL_POOL = ["GME", "MLGO", "VSEE", "SOUN", "RGTI", "SERV", "MIRA", "KULR"];
const SETUPS = ["Held level", "Compression", "Read"];

// 15-minute bins from 07:00 to 12:30 ET. The 09:30 open carries the spike.
const VOLUME_SHAPE = [
  0.4, 0.5, 0.7, 0.9, 1.4, 1.8, 1.6, 1.3, 2.2, 2.6, 8.5, 6.4, 4.8, 3.6, 2.8, 2.2, 1.8, 1.5, 1.3, 1.1, 1.0, 0.9,
];

export function minuteLabel(minute: number) {
  const h = 7 + Math.floor(minute / 60);
  const m = Math.round(minute) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export const marketVolumeCurve: VolumeCurvePoint[] = VOLUME_SHAPE.map((millions, i) => ({
  minute: i * 15,
  label: minuteLabel(i * 15),
  millions,
}));

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function next() {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Session windows skew premarket + open, matching the small-cap workflow.
function drawMinute(rand: () => number) {
  const roll = rand();
  if (roll < 0.14) return 5 + rand() * 55; // 07:05–08:00
  if (roll < 0.34) return 60 + rand() * 85; // 08:00–09:25
  if (roll < 0.72) return 150 + rand() * 60; // 09:30–10:30
  if (roll < 0.88) return 210 + rand() * 60; // 10:30–11:30
  return 270 + rand() * 55; // 11:30–12:25
}

function weekdayFor(day: number): (typeof WEEKDAYS)[number] {
  // July 1, 2026 is a Wednesday; sessions only fall on weekdays.
  return WEEKDAYS[(day + 1) % 7];
}

function buildTrades(): LensTrade[] {
  const trades: LensTrade[] = [];
  let id = 1;

  for (const session of sessionPoints) {
    const day = Number(session.label);
    const rand = mulberry32(day * 7919 + 104729);
    const n = session.trades;
    const winCount = Math.max(1, Math.round((session.winRate / 100) * n));
    const lossCount = Math.max(0, n - winCount);

    // Raw magnitudes with a right tail, then scaled so the session nets exactly
    // to the published day P&L.
    const rawWins = Array.from({ length: winCount }, () => 40 + rand() ** 2 * 620);
    const rawLosses = Array.from({ length: lossCount }, () => 35 + rand() ** 2 * 440);
    const grossLoss = rawLosses.reduce((a, b) => a + b, 0);
    const grossWinTarget = session.pnl + grossLoss;
    const rawWinSum = rawWins.reduce((a, b) => a + b, 0);
    const winScale = grossWinTarget > winCount * 20 ? grossWinTarget / rawWinSum : (winCount * 20) / rawWinSum;
    const wins = rawWins.map((w) => Math.max(5, Math.round(w * winScale)));
    const losses = rawLosses.map((l) => Math.max(5, Math.round(l)));

    // Absorb rounding drift in the largest win so the session sum stays exact.
    const drift = session.pnl - (wins.reduce((a, b) => a + b, 0) - losses.reduce((a, b) => a + b, 0));
    const biggest = wins.indexOf(Math.max(...wins));
    wins[biggest] = Math.max(5, wins[biggest] + drift);

    const daySymbols = Array.from(
      new Set([
        SYMBOL_POOL[day % SYMBOL_POOL.length],
        SYMBOL_POOL[(day * 3 + 1) % SYMBOL_POOL.length],
        SYMBOL_POOL[(day * 5 + 2) % SYMBOL_POOL.length],
      ]),
    );

    const outcomes = [
      ...wins.map((pnl) => ({ pnl })),
      ...losses.map((pnl) => ({ pnl: -pnl })),
    ];

    const sessionTrades = outcomes.map((outcome) => {
      const isWin = outcome.pnl > 0;
      const minute = drawMinute(rand);
      const bin = Math.min(VOLUME_SHAPE.length - 1, Math.floor(minute / 15));
      const curveFactor = VOLUME_SHAPE[bin] / 1.5;
      const relVol = Math.min(9, Math.max(0.4, curveFactor * (0.7 + rand() * 1.2) * (isWin ? 1.3 : 0.8)));
      const holdBase = isWin ? 8 + rand() ** 2 * 240 : 15 + rand() ** 2 * 600;
      const holdSeconds = Math.round(Math.min(1200, Math.max(5, rand() < 0.12 ? holdBase * 3.4 : holdBase)));
      return {
        minute,
        time: minuteLabel(minute),
        symbol: daySymbols[Math.floor(rand() * daySymbols.length)],
        side: (rand() < 0.18 ? "short" : "long") as LensTrade["side"],
        shares: 100 * (1 + Math.floor(rand() * 13)),
        holdSeconds,
        relVol: Math.round(relVol * 10) / 10,
        setup: rand() < (isWin ? 0.22 : 0.42) ? null : SETUPS[Math.floor(rand() * SETUPS.length)],
        pnl: outcome.pnl,
      };
    });

    sessionTrades.sort((a, b) => a.minute - b.minute);
    for (const t of sessionTrades) {
      trades.push({
        id: id++,
        date: session.date,
        day,
        weekday: weekdayFor(day),
        ...t,
        minute: Math.round(t.minute),
      });
    }
  }

  return trades;
}

export const lensTrades: LensTrade[] = buildTrades();
