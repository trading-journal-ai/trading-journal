#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MARKET_TZ = "America/New_York";
const BASE_URL = "https://api.massive.com";
const DEFAULTS = {
  db: "data/tradingjournaldemo.db",
  delayMs: "1200",
  limit: "",
  adjusted: "false",
  force: "false",
};

function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function loadLocalEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = next;
    i += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node scripts/cache-demo-candles.mjs [options]

Options:
  --db PATH          SQLite DB to hydrate. Default: ${DEFAULTS.db}
  --delay-ms N      Delay between Massive API calls. Default: ${DEFAULTS.delayMs}
  --limit N         Hydrate only the first N missing symbol/date pairs.
  --force true      Fetch all symbol/date pairs even when candles already exist.
  --adjusted BOOL   Massive adjusted flag. Default: ${DEFAULTS.adjusted}
  --help            Show this help.

Examples:
  node scripts/cache-demo-candles.mjs --limit 5
  node scripts/cache-demo-candles.mjs --delay-ms 12000
`);
}

function timeZoneParts(ms, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtcMs(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;

  for (let i = 0; i < 5; i += 1) {
    const p = timeZoneParts(guess, timeZone);
    const renderedAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const diff = targetAsUtc - renderedAsUtc;
    guess += diff;
    if (diff === 0) break;
  }
  return guess;
}

const etDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function etDateString(epochSeconds) {
  return etDateFmt.format(new Date(epochSeconds * 1000));
}

function dayBounds(date) {
  const start = Math.round(zonedDateTimeToUtcMs(date, "00:00:00", MARKET_TZ) / 1000);
  return { start: start - 3600, end: start + 26 * 3600 };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function buildUrl(symbol, date, apiKey, adjusted) {
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${date}/${date}`, BASE_URL);
  url.searchParams.set("adjusted", adjusted);
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function fetchCandles(symbol, date, apiKey, adjusted) {
  const response = await fetch(buildUrl(symbol, date, apiKey, adjusted), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Massive ${response.status}: ${(await response.text()).slice(0, 160)}`);
  }

  const body = await response.json();
  const results = Array.isArray(body?.results) ? body.results : [];
  return results
    .filter((bar) => Number.isFinite(bar.t) && Number.isFinite(bar.o))
    .map((bar) => ({
      t: Math.round(bar.t / 1000),
      o: bar.o,
      h: bar.h,
      l: bar.l,
      c: bar.c,
      vol: bar.v ?? 0,
    }));
}

function loadPairs(db, force) {
  const trades = db
    .prepare("select symbol, entry_at as entryAt from trades where entry_at is not null order by entry_at, symbol")
    .all();
  const pairMap = new Map();

  for (const trade of trades) {
    const symbol = String(trade.symbol).toUpperCase();
    const date = etDateString(trade.entryAt);
    pairMap.set(`${symbol}|${date}`, { symbol, date });
  }

  const hasCandles = db.prepare(
    "select 1 from candles where symbol = ? and timeframe = '1m' and t >= ? and t <= ? limit 1",
  );

  return [...pairMap.values()].filter((pair) => {
    if (force) return true;
    const { start, end } = dayBounds(pair.date);
    return !hasCandles.get(pair.symbol, start, end);
  });
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) throw new Error("Set MASSIVE_API_KEY in .env.local or your shell before running this script.");

  const delayMs = Number(args.delayMs);
  const limit = args.limit ? Number(args.limit) : null;
  const db = new Database(resolve(args.db));
  db.pragma("journal_mode = WAL");

  const insert = db.prepare(`
    insert or ignore into candles (symbol, timeframe, t, o, h, l, c, vol)
    values (?, '1m', ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((symbol, candles) => {
    for (const candle of candles) {
      insert.run(symbol, candle.t, candle.o, candle.h, candle.l, candle.c, candle.vol);
    }
  });

  const allPairs = loadPairs(db, args.force === "true");
  const pairs = limit == null ? allPairs : allPairs.slice(0, limit);
  console.log(`Candle pairs to hydrate: ${pairs.length}${limit == null ? "" : ` of ${allPairs.length}`}`);

  let inserted = 0;
  let empty = 0;
  let failed = 0;

  for (let index = 0; index < pairs.length; index += 1) {
    const pair = pairs[index];
    process.stdout.write(`[${index + 1}/${pairs.length}] ${pair.symbol} ${pair.date} ... `);

    try {
      const candles = await fetchCandles(pair.symbol, pair.date, apiKey, args.adjusted);
      insertMany(pair.symbol, candles);
      inserted += candles.length;
      if (candles.length === 0) empty += 1;
      console.log(`${candles.length} bars`);
    } catch (error) {
      failed += 1;
      console.log(`failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (index < pairs.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  db.pragma("wal_checkpoint(FULL)");
  console.log(`Done. Inserted/seen bars: ${inserted}. Empty pairs: ${empty}. Failed pairs: ${failed}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
