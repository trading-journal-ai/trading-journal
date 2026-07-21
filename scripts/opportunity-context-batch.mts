/**
 * Batch-run the opportunity-context calculator over the full journal history.
 *
 * Usage: npx tsx scripts/opportunity-context-batch.mts [--db PATH] [--out DIR]
 *
 * Reads closed trades + cached candles, computes per-trade opportunity
 * context (docs/analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md), writes a JSONL
 * of every result plus a summary, and prints the entry-state expectancy read.
 * Read-only against the DB.
 */
import Database from "better-sqlite3";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  opportunityContextForTrade,
  sessionAnatomy,
  type SessionAnatomy,
  type TradeOpportunityContext,
} from "@/lib/coach/opportunityContext";
import { etDateString, MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";

const args = process.argv.slice(2);
const argOf = (flag: string, fallback: string) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const dbPath = resolve(argOf("--db", process.env.DB_PATH ?? "data/tradingjournaldemo.db"));
const outDir = resolve(argOf("--out", "data/opportunity-context"));

type TradeRow = {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  avg_entry_price: number | null;
  avg_exit_price: number | null;
  entry_at: number | null;
  exit_at: number | null;
  fees: number;
  setup: string | null;
};

const db = new Database(dbPath, { readonly: true });
const trades = db
  .prepare(
    `select id, symbol, side, quantity, avg_entry_price, avg_exit_price,
            entry_at, exit_at, fees, setup
     from trades
     where entry_at is not null and avg_entry_price is not null
     order by entry_at`,
  )
  .all() as TradeRow[];

const candleStmt = db.prepare(
  `select t, o, h, l, c, vol from candles
   where symbol = ? and timeframe = '1m' and t >= ? and t < ?
   order by t`,
);

function etSeconds(date: string, time: string): number {
  return Math.round(zonedDateTimeToUtcMs(date, time, MARKET_TZ) / 1000);
}

const anatomyCache = new Map<string, SessionAnatomy | null>();
function anatomyFor(symbol: string, date: string): SessionAnatomy | null {
  const key = `${symbol}|${date}`;
  const cached = anatomyCache.get(key);
  if (cached !== undefined) return cached;
  const bars = candleStmt.all(symbol, etSeconds(date, "04:00:00"), etSeconds(date, "20:00:00")) as
    Array<{ t: number; o: number; h: number; l: number; c: number; vol: number }>;
  const anatomy = bars.length > 0 ? sessionAnatomy(symbol, date, bars) : null;
  anatomyCache.set(key, anatomy);
  return anatomy;
}

const results: Array<{ ctx: TradeOpportunityContext; pnl: number | null; date: string; symbol: string }> = [];
for (const trade of trades) {
  const date = etDateString(trade.entry_at!);
  const dir = trade.side === "long" ? 1 : -1;
  const pnl = trade.avg_exit_price != null
    ? (trade.avg_exit_price - trade.avg_entry_price!) * dir * trade.quantity - trade.fees
    : null;
  const ctx = opportunityContextForTrade(anatomyFor(trade.symbol, date), {
    id: trade.id,
    symbol: trade.symbol,
    side: trade.side,
    entryAt: trade.entry_at,
    exitAt: trade.exit_at,
    entryPrice: trade.avg_entry_price,
    quantity: trade.quantity,
    pnl,
    setup: trade.setup,
  });
  results.push({ ctx, pnl, date, symbol: trade.symbol });
}
db.close();

type Bucket = { n: number; net: number; wins: number; losses: number };
const bucket = (): Bucket => ({ n: 0, net: 0, wins: 0, losses: 0 });
const add = (b: Bucket, pnl: number | null) => {
  b.n += 1;
  if (pnl != null) {
    b.net += pnl;
    if (pnl > 0) b.wins += 1;
    else if (pnl < 0) b.losses += 1;
  }
};
const fmtBucket = (label: string, b: Bucket) => {
  const winRate = b.wins + b.losses > 0 ? Math.round((b.wins / (b.wins + b.losses)) * 100) : null;
  const avg = b.n > 0 ? b.net / b.n : 0;
  return `${label.padEnd(28)} n=${String(b.n).padStart(4)}  net=$${b.net.toFixed(0).padStart(8)}  avg=$${avg.toFixed(0).padStart(6)}  win=${winRate == null ? " —" : `${winRate}%`}`;
};

const byClassification = new Map<string, Bucket>();
const byExtension = new Map<string, Bucket>();
const byStaleness = new Map<string, Bucket>();
const byConfidence = new Map<string, number>();
const cannotReasons = new Map<string, number>();

for (const { ctx, pnl } of results) {
  const get = (m: Map<string, Bucket>, k: string) => {
    if (!m.has(k)) m.set(k, bucket());
    return m.get(k)!;
  };
  add(get(byClassification, ctx.classification), pnl);
  byConfidence.set(ctx.confidence.label, (byConfidence.get(ctx.confidence.label) ?? 0) + 1);

  if (ctx.classification === "cannot-determine") {
    const reason = ctx.missingContext[0] ?? "unknown";
    cannotReasons.set(reason, (cannotReasons.get(reason) ?? 0) + 1);
    continue;
  }
  const ext = ctx.atEntry?.extensionAtr;
  if (ext != null) {
    const k = ext < 0.75 ? "at/near decision point" : ext < 2 ? "moderately extended" : "extended (≥2 ATR)";
    add(get(byExtension, k), pnl);
  }
  const mins = ctx.atEntry?.minutesSinceHigh;
  if (mins != null) {
    const k = mins <= 5 ? "fresh high (≤5 min)" : mins <= 30 ? "aging (6–30 min)" : "stale (>30 min)";
    add(get(byStaleness, k), pnl);
  }
}

const order = [
  "developing", "still-valid", "good-entry-poor-management", "weakening",
  "valid-stock-late-entry", "valid-setup-poor-execution", "move-mature", "cannot-determine",
];
console.log(`Trades analyzed: ${results.length} across ${anatomyCache.size} ticker-days (${[...anatomyCache.values()].filter(Boolean).length} with candles)\n`);
console.log("── By classification ──");
for (const k of order) {
  const b = byClassification.get(k);
  if (b) console.log(fmtBucket(k, b));
}
console.log("\n── By entry extension (vs last decision point) ──");
for (const k of ["at/near decision point", "moderately extended", "extended (≥2 ATR)"]) {
  const b = byExtension.get(k);
  if (b) console.log(fmtBucket(k, b));
}
console.log("\n── By time since session high ──");
for (const k of ["fresh high (≤5 min)", "aging (6–30 min)", "stale (>30 min)"]) {
  const b = byStaleness.get(k);
  if (b) console.log(fmtBucket(k, b));
}
console.log(`\nConfidence: ${[...byConfidence.entries()].map(([k, n]) => `${k}=${n}`).join("  ")}`);
console.log("Cannot-determine reasons:");
for (const [reason, n] of [...cannotReasons.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${n}× ${reason}`);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, "contexts.jsonl"),
  results.map((r) => JSON.stringify({ date: r.date, symbol: r.symbol, pnl: r.pnl, ...r.ctx })).join("\n"),
);
console.log(`\nPer-trade output: ${join(outDir, "contexts.jsonl")}`);
