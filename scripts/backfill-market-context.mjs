#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MARKET_TZ = "America/New_York";
const BASE_URL = "https://api.massive.com";
const SOURCE = "massive_grouped_daily";
const SOURCE_VERSION = "massive-grouped-daily:v1";
const DEFAULTS = {
  delayMs: "12500",
  force: "false",
  dryRun: "false",
  priceMin: "1",
  priceMax: "20",
  moveMinPct: "50",
  limit: "",
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
  npm run market-context:backfill -- [options]

Options:
  --db PATH             SQLite DB. Defaults to DB_PATH or data/journal.db.
  --from YYYY-MM-DD     First ET session. Defaults to earliest trade date.
  --to YYYY-MM-DD       Last ET session. Defaults to latest trade date.
  --delay-ms N          Delay between grouped-market calls. Default: ${DEFAULTS.delayMs}.
  --price-min N         Opening-price floor. Default: ${DEFAULTS.priceMin}.
  --price-max N         Opening-price ceiling. Default: ${DEFAULTS.priceMax}.
  --move-min-pct N      Smallest mover retained in payload. Default: ${DEFAULTS.moveMinPct}.
  --limit N             Stop after persisting N market sessions (useful for a sample).
  --force true          Refresh existing retrospective rows.
  --dry-run true        Fetch and summarize without writing.
  --help                Show this help.

Examples:
  npm run market-context:backfill -- --from 2026-07-17 --to 2026-07-20
  npm run market-context:backfill -- --limit 3 --dry-run true
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

export function weekdaysBetween(from, to) {
  const dates = [];
  for (let cursor = from; cursor <= to; cursor = shiftDate(cursor, 1)) {
    const weekday = utcDate(cursor).getUTCDay();
    if (weekday !== 0 && weekday !== 6) dates.push(cursor);
  }
  return dates;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function groupedUrl(date, apiKey) {
  const url = new URL(`/v2/aggs/grouped/locale/us/market/stocks/${date}`, BASE_URL);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("include_otc", "false");
  url.searchParams.set("apiKey", apiKey);
  return url;
}

async function fetchGroupedDay(date, apiKey) {
  let rateLimitAttempts = 0;
  let serverAttempts = 0;

  for (;;) {
    const response = await fetch(groupedUrl(date, apiKey), { cache: "no-store" });
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
    if (!response.ok) {
      throw new Error(`Massive ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }

    const body = await response.json();
    return {
      requestId: typeof body?.request_id === "string" ? body.request_id : null,
      rows: Array.isArray(body?.results) ? body.results : [],
    };
  }
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function rounded(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function closeMap(rows) {
  const map = new Map();
  for (const row of rows) {
    const symbol = typeof row?.T === "string" ? row.T.trim().toUpperCase() : "";
    const close = finiteNumber(row?.c);
    if (symbol && close != null && close > 0) map.set(symbol, close);
  }
  return map;
}

export function opportunitySetLabel(candidateCount) {
  if (candidateCount === 0) return "none";
  if (candidateCount === 1) return "one-stock";
  if (candidateCount <= 3) return "selective";
  return "active";
}

export function buildRetrospectiveContext({
  date,
  rows,
  previousRows,
  requestId = null,
  previousSessionDate,
  priceMin = 1,
  priceMax = 20,
  moveMinPct = 50,
}) {
  const priorCloses = closeMap(previousRows);
  const candidates = [];
  let eligibleSymbols = 0;
  let matchedPreviousClose = 0;

  for (const row of rows) {
    const symbol = typeof row?.T === "string" ? row.T.trim().toUpperCase() : "";
    const open = finiteNumber(row?.o);
    const high = finiteNumber(row?.h);
    const low = finiteNumber(row?.l);
    const close = finiteNumber(row?.c);
    const volume = finiteNumber(row?.v) ?? 0;
    const vwap = finiteNumber(row?.vw);
    if (!symbol || open == null || high == null || low == null || close == null) continue;
    if (open < priceMin || open > priceMax) continue;
    eligibleSymbols += 1;

    const previousClose = priorCloses.get(symbol);
    if (previousClose == null) continue;
    matchedPreviousClose += 1;

    const maximumMovePct = ((high / previousClose) - 1) * 100;
    if (maximumMovePct < moveMinPct) continue;
    const closeChangePct = ((close / previousClose) - 1) * 100;
    candidates.push({
      symbol,
      previousClose: rounded(previousClose, 4),
      open: rounded(open, 4),
      high: rounded(high, 4),
      low: rounded(low, 4),
      close: rounded(close, 4),
      volume: Math.round(volume),
      dollarVolume: Math.round((vwap ?? close) * volume),
      maximumMovePct: rounded(maximumMovePct),
      closeChangePct: rounded(closeChangePct),
      breakingNews: "unknown",
    });
  }

  candidates.sort((left, right) => right.maximumMovePct - left.maximumMovePct);
  const countAtOrAbove = (threshold) => candidates.filter((item) => item.maximumMovePct >= threshold).length;
  const counts = {
    rawMovers: candidates.length,
    over50Pct: countAtOrAbove(50),
    over100Pct: countAtOrAbove(100),
    over200Pct: countAtOrAbove(200),
    breakingNews: null,
  };

  return {
    version: 1,
    sessionDateEt: date,
    provenance: "retrospective",
    source: SOURCE,
    sourceVersion: SOURCE_VERSION,
    leadership: {
      state: opportunitySetLabel(counts.over100Pct),
      basis: "count-at-or-above-100pct",
    },
    coverage: {
      status: "full",
      providerRequestId: requestId,
      previousSessionDate,
      returnedSymbols: rows.length,
      eligibleSymbols,
      matchedPreviousClose,
    },
    criteria: {
      priceAtOpen: { min: priceMin, max: priceMax },
      minimumMaximumMovePct: moveMinPct,
      moveBasis: "previous-close-to-daily-high",
      adjusted: true,
      includeOtc: false,
      minimumVolume: null,
      securityTypeFilter: "not-applied",
    },
    counts,
    strongestMover: candidates[0] ?? null,
    candidates,
    caveats: [
      "Retrospective daily bars do not reconstruct scanner alert timing.",
      "Historical breaking-news coverage is unknown in this payload.",
      "Security-type filtering is deferred; review warrants, units, funds, and corporate actions before product scoring.",
    ],
  };
}

function tradeDateRange(db) {
  const trades = db.prepare("select entry_at as entryAt from trades where entry_at is not null").all();
  const dates = trades.map((trade) => etDateFmt.format(new Date(trade.entryAt * 1000))).sort();
  if (dates.length === 0) throw new Error("No dated trades found; pass --from and --to explicitly.");
  return { from: dates[0], to: dates.at(-1) };
}

function assertTable(db) {
  const table = db.prepare("select 1 from sqlite_master where type = 'table' and name = 'market_context_days'").get();
  if (!table) throw new Error("market_context_days is missing; run npm run db:migrate first.");
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

  const dbPath = resolve(args.db || process.env.DB_PATH || "data/journal.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  assertTable(db);

  const derivedRange = tradeDateRange(db);
  const from = args.from || derivedRange.from;
  const to = args.to || derivedRange.to;
  if (!validDate(from) || !validDate(to) || from > to) throw new Error(`Invalid date range: ${from} to ${to}`);

  const delayMs = Number(args.delayMs);
  const priceMin = Number(args.priceMin);
  const priceMax = Number(args.priceMax);
  const moveMinPct = Number(args.moveMinPct);
  const limit = args.limit ? Number(args.limit) : null;
  if (![delayMs, priceMin, priceMax, moveMinPct].every(Number.isFinite)) throw new Error("Numeric options must be finite numbers.");
  if (priceMin <= 0 || priceMax <= priceMin || moveMinPct < 0) throw new Error("Invalid price or move thresholds.");
  if (limit != null && (!Number.isInteger(limit) || limit <= 0)) throw new Error("--limit must be a positive integer.");

  const force = args.force === "true";
  const dryRun = args.dryRun === "true";
  const existingRows = new Map(
    db.prepare("select session_date_et as date, provenance from market_context_days").all()
      .map((row) => [row.date, row.provenance]),
  );
  const upsert = db.prepare(`
    insert into market_context_days (
      session_date_et, source, provenance, coverage_status, source_version, payload_json, created_at, updated_at
    ) values (?, ?, 'retrospective', 'full', ?, ?, unixepoch(), unixepoch())
    on conflict(session_date_et) do update set
      source = excluded.source,
      provenance = excluded.provenance,
      coverage_status = excluded.coverage_status,
      source_version = excluded.source_version,
      payload_json = excluded.payload_json,
      updated_at = unixepoch()
  `);

  const warmupFrom = shiftDate(from, -7);
  const dates = weekdaysBetween(warmupFrom, to);
  console.log(`Market-context range: ${from} to ${to} (${dates.length} weekday requests including warmup).`);

  let previousRows = null;
  let previousSessionDate = null;
  let written = 0;
  let skipped = 0;
  let closed = 0;

  for (let index = 0; index < dates.length; index += 1) {
    const date = dates[index];
    process.stdout.write(`[${index + 1}/${dates.length}] ${date} ... `);
    const grouped = await fetchGroupedDay(date, apiKey);
    if (grouped.rows.length === 0) {
      closed += 1;
      console.log("no market rows");
    } else if (date < from || previousRows == null) {
      console.log(`${grouped.rows.length} symbols (warmup)`);
      previousRows = grouped.rows;
      previousSessionDate = date;
    } else {
      const context = buildRetrospectiveContext({
        date,
        rows: grouped.rows,
        previousRows,
        requestId: grouped.requestId,
        previousSessionDate,
        priceMin,
        priceMax,
        moveMinPct,
      });
      const existingProvenance = existingRows.get(date);
      const protectedCapturedRow = existingProvenance === "scanner-captured";
      const shouldWrite = !dryRun && !protectedCapturedRow && (force || existingProvenance == null);
      if (shouldWrite) {
        upsert.run(date, SOURCE, SOURCE_VERSION, JSON.stringify(context));
        existingRows.set(date, "retrospective");
        written += 1;
      } else {
        skipped += 1;
      }
      const suffix = protectedCapturedRow
        ? "protected scanner snapshot"
        : dryRun
          ? "dry run"
          : shouldWrite
            ? "saved"
            : "already cached";
      console.log(`${context.counts.rawMovers} raw movers · ${context.counts.over50Pct}/50 · ${context.counts.over100Pct}/100 · ${suffix}`);
      previousRows = grouped.rows;
      previousSessionDate = date;

      if (limit != null && written + (dryRun ? skipped : 0) >= limit) break;
    }

    if (index < dates.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  if (!dryRun) db.pragma("wal_checkpoint(FULL)");
  console.log(`Done. Saved ${written}; skipped ${skipped}; non-market weekdays ${closed}.`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
