#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MARKET_TZ = "America/New_York";
const BASE_URL = "https://api.massive.com";
const TIMEFRAME = "1m";
const DEFAULTS = {
  delayMs: "12500",
  dryRun: "false",
  force: "false",
  limit: "",
  lookbackSessions: "14",
};
const RATE_LIMIT_RETRIES = 5;
const RATE_LIMIT_WAIT_MS = 65_000;
const SERVER_ERROR_RETRIES = 3;

const etDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

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
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = next;
    index += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  npm run market-data:sync -- [options]

Options:
  --db PATH                 SQLite DB. Defaults to DB_PATH or data/journal.db.
  --lookback-sessions N     Prior-session baseline per traded ticker-day. Default: ${DEFAULTS.lookbackSessions}.
  --delay-ms N              Delay between Massive calls. Default: ${DEFAULTS.delayMs} (Free-safe).
  --limit N                 Stop after N planned provider windows.
  --force true              Fetch windows even when sufficient bars are already cached.
  --dry-run true            Show the plan without network calls or database writes.
  --help                    Show this help.

Examples:
  npm run market-data:sync -- --dry-run true
  npm run market-data:sync -- --delay-ms 250
  npm run market-data:sync -- --lookback-sessions 0
`);
}

function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function utcDate(date) {
  return new Date(`${date}T12:00:00.000Z`);
}

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(date, days) {
  const shifted = utcDate(date);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return dateString(shifted);
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

export function etDateFromEpoch(epochSeconds) {
  return etDateFmt.format(new Date(epochSeconds * 1000));
}

/**
 * Convert a desired number of market sessions into a conservative calendar
 * window. The four-day buffer covers common market holidays without requiring
 * a separate calendar provider.
 */
export function calendarLookbackDays(sessionCount) {
  if (sessionCount <= 0) return 0;
  return Math.ceil((sessionCount * 7) / 5) + 4;
}

function looksLikeSecurityIdentifier(symbol) {
  return /^[A-Z0-9*@#]{8}\d$/.test(symbol);
}

export function buildTradeWindows(trades, lookbackSessions = 14) {
  const lookbackDays = calendarLookbackDays(lookbackSessions);
  const windows = new Map();
  const skippedIdentifiers = new Set();

  for (const trade of trades) {
    const symbol = typeof trade?.symbol === "string" ? trade.symbol.trim().toUpperCase() : "";
    const entryAt = Number(trade?.entryAt);
    if (!symbol || !Number.isFinite(entryAt)) continue;
    if (looksLikeSecurityIdentifier(symbol)) {
      skippedIdentifiers.add(symbol);
      continue;
    }

    const anchorDate = etDateFromEpoch(entryAt);
    const key = `${symbol}:${anchorDate}`;
    windows.set(key, {
      anchorDate,
      from: shiftDate(anchorDate, -lookbackDays),
      symbol,
      to: anchorDate,
    });
  }

  return {
    skippedIdentifiers: [...skippedIdentifiers].sort(),
    windows: [...windows.values()].sort(
      (left, right) => left.anchorDate.localeCompare(right.anchorDate)
        || left.symbol.localeCompare(right.symbol),
    ),
  };
}

export function hasSufficientCoverage(window, cachedDates, lookbackSessions) {
  if (!cachedDates?.has(window.anchorDate)) return false;
  if (lookbackSessions === 0) return true;

  let coveredSessions = 0;
  for (const date of cachedDates) {
    if (date >= window.from && date <= window.anchorDate) coveredSessions += 1;
  }
  return coveredSessions >= lookbackSessions + 1;
}

function loadCachedDates(db) {
  const rows = db.prepare(`
    select symbol, date(t, 'unixepoch', '-5 hours') as sessionDate
    from candles
    where timeframe = ?
    group by symbol, sessionDate
  `).all(TIMEFRAME);
  const bySymbol = new Map();
  for (const row of rows) {
    if (!validDate(row.sessionDate)) continue;
    const dates = bySymbol.get(row.symbol) ?? new Set();
    dates.add(row.sessionDate);
    bySymbol.set(row.symbol, dates);
  }
  return bySymbol;
}

function aggregateUrl(symbol, from, to, apiKey) {
  const url = new URL(
    `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${from}/${to}`,
    BASE_URL,
  );
  url.searchParams.set("adjusted", "false");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function fetchJson(url, label, { allowNotFound = false } = {}) {
  let rateLimitAttempts = 0;
  let serverAttempts = 0;

  for (;;) {
    const response = await fetch(url, { cache: "no-store" });
    if (response.status === 429 && rateLimitAttempts < RATE_LIMIT_RETRIES) {
      rateLimitAttempts += 1;
      process.stdout.write(`rate limited, waiting ${Math.round(RATE_LIMIT_WAIT_MS / 1000)}s ... `);
      await sleep(RATE_LIMIT_WAIT_MS);
      continue;
    }
    if (response.status >= 500 && serverAttempts < SERVER_ERROR_RETRIES) {
      serverAttempts += 1;
      await sleep(serverAttempts * 5_000);
      continue;
    }
    if (response.status === 404 && allowNotFound) return null;
    if (!response.ok) {
      throw new Error(`${label} ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    return response.json();
  }
}

export function parseAggregateBars(results) {
  if (!Array.isArray(results)) return [];
  return results.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const bar = value;
    if (
      !Number.isFinite(bar.t)
      || !Number.isFinite(bar.o)
      || !Number.isFinite(bar.h)
      || !Number.isFinite(bar.l)
      || !Number.isFinite(bar.c)
    ) return [];
    return [{
      c: bar.c,
      h: bar.h,
      l: bar.l,
      o: bar.o,
      t: Math.round(bar.t / 1000),
      vol: Number.isFinite(bar.v) ? bar.v : 0,
    }];
  });
}

async function fetchAggregateWindow(symbol, window, apiKey) {
  const body = await fetchJson(
    aggregateUrl(symbol, window.from, window.to, apiKey),
    `Massive aggregates for ${symbol}`,
  );
  return parseAggregateBars(body?.results);
}

async function tickerEvents(symbol, apiKey) {
  const url = new URL(`/vX/reference/tickers/${encodeURIComponent(symbol)}/events`, BASE_URL);
  url.searchParams.set("types", "ticker_change");
  url.searchParams.set("apiKey", apiKey);
  const body = await fetchJson(
    url,
    `Massive ticker events for ${symbol}`,
    { allowNotFound: true },
  );
  const events = Array.isArray(body?.results?.events) ? body.results.events : [];
  return events.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const ticker = value?.ticker_change?.ticker;
    if (value.type !== "ticker_change" || !validDate(value.date) || typeof ticker !== "string") {
      return [];
    }
    return [{ date: value.date, ticker: ticker.trim().toUpperCase() }];
  });
}

export function historicalSymbolForDate(date, events) {
  let match = null;
  for (const event of events) {
    if (!validDate(event.date) || event.date > date) continue;
    if (!match || event.date > match.date) match = event;
  }
  return match?.ticker || null;
}

function containsDate(bars, date) {
  return bars.some((bar) => etDateFromEpoch(bar.t) === date);
}

function coveredSessionCount(bars, window) {
  return new Set(
    bars.flatMap((bar) => {
      const date = etDateFromEpoch(bar.t);
      return date >= window.from && date <= window.anchorDate ? [date] : [];
    }),
  ).size;
}

function mergeBars(...groups) {
  const byTime = new Map();
  for (const bar of groups.flat()) byTime.set(bar.t, bar);
  return [...byTime.values()].sort((left, right) => left.t - right.t);
}

async function resolvedBars(window, apiKey, lookbackSessions) {
  const direct = await fetchAggregateWindow(window.symbol, window, apiKey);
  const anchorPresent = containsDate(direct, window.anchorDate);
  if (anchorPresent && coveredSessionCount(direct, window) >= lookbackSessions + 1) {
    return { bars: direct, marketDataSymbol: window.symbol };
  }

  const events = await tickerEvents(window.symbol, apiKey);
  const lookupDate = anchorPresent ? window.from : window.anchorDate;
  const historicalSymbol = historicalSymbolForDate(lookupDate, events);
  if (!historicalSymbol || historicalSymbol === window.symbol) {
    return { bars: direct, marketDataSymbol: window.symbol };
  }
  const historical = await fetchAggregateWindow(historicalSymbol, window, apiKey);
  return {
    bars: mergeBars(direct, historical),
    marketDataSymbol: `${window.symbol}+${historicalSymbol}`,
  };
}

export function createBarWriter(db) {
  const insert = db.prepare(`
    insert or ignore into candles (symbol, timeframe, t, o, h, l, c, vol)
    values (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return db.transaction((symbol, bars) => {
    let inserted = 0;
    for (const bar of bars) {
      const result = insert.run(symbol, TIMEFRAME, bar.t, bar.o, bar.h, bar.l, bar.c, bar.vol);
      inserted += result.changes;
    }
    return inserted;
  });
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const lookbackSessions = Number(args.lookbackSessions);
  const delayMs = Number(args.delayMs);
  const limit = args.limit ? Number(args.limit) : null;
  if (!Number.isInteger(lookbackSessions) || lookbackSessions < 0) {
    throw new Error("--lookback-sessions must be a non-negative integer.");
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number.");
  }
  if (limit != null && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer.");
  }

  const dryRun = args.dryRun === "true";
  const force = args.force === "true";
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!dryRun && !apiKey) {
    throw new Error("Set MASSIVE_API_KEY in .env.local or your shell before running the sync.");
  }

  const dbPath = resolve(args.db || process.env.DB_PATH || "data/journal.db");
  const db = new Database(dbPath, { readonly: dryRun, fileMustExist: dryRun });
  if (!dryRun) db.pragma("journal_mode = WAL");

  try {
    const trades = db.prepare(`
      select symbol, entry_at as entryAt
      from trades
      where entry_at is not null
      order by entry_at, symbol
    `).all();
    const plan = buildTradeWindows(trades, lookbackSessions);
    const cachedBySymbol = loadCachedDates(db);
    const pending = plan.windows.filter((window) => (
      force || !hasSufficientCoverage(
        window,
        cachedBySymbol.get(window.symbol),
        lookbackSessions,
      )
    ));
    const selected = limit == null ? pending : pending.slice(0, limit);

    console.log(
      `Market-data sync: ${plan.windows.length} traded ticker-days; ${pending.length} provider windows pending; `
      + `${plan.skippedIdentifiers.length} unresolved identifiers.`,
    );
    console.log(
      `Baseline: ${lookbackSessions} prior sessions; delay: ${delayMs}ms; mode: ${dryRun ? "plan only" : "fetch and cache"}.`,
    );
    if (dryRun) {
      for (const window of selected.slice(0, 20)) {
        console.log(`${window.symbol} ${window.from} → ${window.to}`);
      }
      if (selected.length > 20) console.log(`… ${selected.length - 20} more windows`);
      return;
    }

    const writeBars = createBarWriter(db);
    let inserted = 0;
    let missing = 0;
    let failed = 0;

    for (let index = 0; index < selected.length; index += 1) {
      const window = selected[index];
      process.stdout.write(
        `[${index + 1}/${selected.length}] ${window.symbol} ${window.from} → ${window.to} ... `,
      );
      try {
        const result = await resolvedBars(window, apiKey, lookbackSessions);
        if (!containsDate(result.bars, window.anchorDate)) {
          missing += 1;
          console.log(`no anchor-day bars (tried ${result.marketDataSymbol})`);
        } else {
          const written = writeBars(window.symbol, result.bars);
          inserted += written;
          console.log(`${result.bars.length} bars · ${written} new`);
        }
      } catch (error) {
        failed += 1;
        console.log(error instanceof Error ? error.message : String(error));
      }

      if (index < selected.length - 1 && delayMs > 0) await sleep(delayMs);
    }

    db.pragma("wal_checkpoint(FULL)");
    console.log(`Done. Inserted ${inserted} bars; ${missing} missing windows; ${failed} failed windows.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    db.close();
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
