#!/usr/bin/env node

/**
 * Privacy-safe aggregate coverage audit for the local Coach corpus.
 *
 * The script opens SQLite read-only and prints counts/percentages only. It
 * never prints account names, symbols, dates, note text, trade rows, or model
 * output. See docs/coach/COACH_INTELLIGENCE_RESEARCH_PLAN.md.
 */

import Database from "better-sqlite3";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MARKET_TZ = "America/New_York";
const MIN_OPPORTUNITY_WARMUP_BARS = 15;
const DEFAULT_DB = "data/journal.db";

const etDateFormatter = new Intl.DateTimeFormat("en-CA", {
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
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
}

function loadLocalEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

function usage() {
  console.log(`
Usage:
  npm run coach:coverage
  npm run coach:coverage -- --db data/journal.db
  npm run coach:coverage -- --json

Options:
  --db PATH   Local SQLite database. Defaults to DB_PATH or ${DEFAULT_DB}.
  --json      Print the aggregate report as JSON.
  --help      Show this help.

Privacy:
  Output contains aggregate counts, percentages, and fixed caveats only.
  It never prints symbols, dates, notes, account names, or individual rows.
`);
}

export function parseArgs(argv) {
  const args = { json: false, help: false, db: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--db") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("Missing value for --db.");
      args.db = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return args;
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

export function zonedDateTimeToUtcMs(date, time, timeZone = MARKET_TZ) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;

  for (let index = 0; index < 5; index += 1) {
    const rendered = timeZoneParts(guess, timeZone);
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
    );
    const difference = targetAsUtc - renderedAsUtc;
    guess += difference;
    if (difference === 0) break;
  }
  return guess;
}

function etDateString(epochSeconds) {
  return etDateFormatter.format(new Date(epochSeconds * 1000));
}

function etSeconds(date, time) {
  return Math.round(zonedDateTimeToUtcMs(date, time) / 1000);
}

function tableExists(db, table) {
  return Boolean(
    db.prepare("select 1 from sqlite_master where type = 'table' and name = ?").get(table),
  );
}

function columnNames(db, table) {
  if (!tableExists(db, table)) return new Set();
  return new Set(db.prepare(`pragma table_info(${table})`).all().map((row) => row.name));
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function coverage(covered, total) {
  return {
    covered,
    total,
    percent: total === 0 ? null : Math.round((covered / total) * 1000) / 10,
  };
}

function countBy(rows, predicate) {
  let count = 0;
  for (const row of rows) if (predicate(row)) count += 1;
  return count;
}

function closedTradeRows(db) {
  const columns = columnNames(db, "trades");
  if (columns.size === 0) throw new Error("Database does not contain a trades table.");

  const selected = [
    "id",
    "account_id",
    "symbol",
    "side",
    "quantity",
    "avg_entry_price",
    "entry_at",
    "avg_exit_price",
    "exit_at",
    "stop_loss",
    "target",
    "setup",
  ];
  const projection = selected
    .map((name) => columns.has(name) ? name : `null as ${name}`)
    .join(", ");
  const closedWhere = columns.has("status")
    ? "status = 'closed'"
    : columns.has("exit_at")
      ? "exit_at is not null"
      : "1 = 0";
  return db.prepare(`select ${projection} from trades where ${closedWhere}`).all();
}

function sessionKey(accountId, entryAt) {
  if (!Number.isFinite(entryAt)) return null;
  return `${accountId ?? "unscoped"}|${etDateString(entryAt)}`;
}

function meaningfulNote(row) {
  return (
    nonEmpty(row.thesis) ||
    nonEmpty(row.what_went_well) ||
    nonEmpty(row.what_went_wrong) ||
    nonEmpty(row.lessons) ||
    nonEmpty(row.emotional_state) ||
    row.followed_plan !== null
  );
}

function noteCoverage(db, trades, sessionKeys) {
  const empty = {
    tradeContext: coverage(0, trades.length),
    followedPlan: coverage(0, trades.length),
    processTagPayload: coverage(0, trades.length),
    emotionTagPayload: coverage(0, trades.length),
    primaryLabel: coverage(0, trades.length),
    dayContext: coverage(0, sessionKeys.size),
    tickerNoteCount: 0,
  };
  const columns = columnNames(db, "journal_entries");
  if (columns.size === 0) return empty;

  const desired = [
    "account_id",
    "trade_id",
    "scope",
    "scope_key",
    "thesis",
    "what_went_well",
    "what_went_wrong",
    "lessons",
    "followed_plan",
    "emotional_state",
  ];
  const projection = desired
    .map((name) => columns.has(name) ? name : `null as ${name}`)
    .join(", ");
  const rows = db.prepare(`select ${projection} from journal_entries`).all();
  const closedIds = new Set(trades.map((trade) => trade.id));
  const tradeRows = rows.filter((row) => row.trade_id != null && closedIds.has(row.trade_id));

  const tradeIdsWith = (predicate) => new Set(
    tradeRows.filter(predicate).map((row) => row.trade_id),
  ).size;
  const daySessionKeys = new Set(
    rows
      .filter((row) => row.scope === "day" && nonEmpty(row.scope_key) && meaningfulNote(row))
      .map((row) => `${row.account_id ?? "unscoped"}|${row.scope_key}`)
      .filter((key) => sessionKeys.has(key)),
  );

  return {
    tradeContext: coverage(tradeIdsWith(meaningfulNote), trades.length),
    followedPlan: coverage(tradeIdsWith((row) => row.followed_plan !== null), trades.length),
    processTagPayload: coverage(tradeIdsWith((row) => nonEmpty(row.what_went_well)), trades.length),
    emotionTagPayload: coverage(tradeIdsWith((row) => nonEmpty(row.what_went_wrong)), trades.length),
    primaryLabel: coverage(tradeIdsWith((row) => nonEmpty(row.emotional_state)), trades.length),
    dayContext: coverage(daySessionKeys.size, sessionKeys.size),
    tickerNoteCount: rows.filter((row) => row.scope === "ticker" && meaningfulNote(row)).length,
  };
}

function relationCoverage(db, table, relationColumn, trades) {
  const columns = columnNames(db, table);
  if (!columns.has(relationColumn)) return coverage(0, trades.length);
  const closedIds = new Set(trades.map((trade) => trade.id));
  const ids = new Set(
    db.prepare(`select distinct ${relationColumn} as trade_id from ${table} where ${relationColumn} is not null`)
      .all()
      .map((row) => row.trade_id)
      .filter((id) => closedIds.has(id)),
  );
  return coverage(ids.size, trades.length);
}

function candleCoverage(db, trades) {
  const empty = {
    directSymbolSessionBars: coverage(0, trades.length),
    atEntryWarmup: coverage(0, trades.length),
    heldWindowBars: coverage(0, trades.length),
    currentLongOnlyOpportunityEligibility: coverage(0, trades.length),
    shortTradesBlockedByV1: countBy(trades, (trade) => trade.side === "short"),
    caveat: "Direct-symbol cache check only; historical ticker resolution is not replayed by this audit.",
  };
  const columns = columnNames(db, "candles");
  if (!["symbol", "timeframe", "t"].every((name) => columns.has(name))) return empty;

  const anySessionBars = db.prepare(
    "select count(*) as count from candles where symbol = ? and timeframe = '1m' and t >= ? and t < ?",
  );
  const closedBeforeEntry = db.prepare(
    "select count(*) as count from candles where symbol = ? and timeframe = '1m' and t >= ? and t + 60 <= ?",
  );
  const heldWindowBars = db.prepare(
    "select count(*) as count from candles where symbol = ? and timeframe = '1m' and t + 60 > ? and t < ?",
  );

  let sessionCovered = 0;
  let warmupCovered = 0;
  let heldCovered = 0;
  let eligible = 0;

  for (const trade of trades) {
    if (!nonEmpty(trade.symbol) || !Number.isFinite(trade.entry_at)) continue;
    const date = etDateString(trade.entry_at);
    const premarketStart = etSeconds(date, "04:00:00");
    const reviewStart = etSeconds(date, "07:00:00");
    const reviewEnd = etSeconds(date, "20:00:00");
    const sessionCount = anySessionBars.get(trade.symbol, premarketStart, reviewEnd).count;
    const warmupCount = closedBeforeEntry.get(trade.symbol, reviewStart, trade.entry_at).count;
    const heldCount = Number.isFinite(trade.exit_at) && trade.exit_at > trade.entry_at
      ? heldWindowBars.get(trade.symbol, trade.entry_at, trade.exit_at).count
      : 0;
    if (sessionCount > 0) sessionCovered += 1;
    if (warmupCount >= MIN_OPPORTUNITY_WARMUP_BARS) warmupCovered += 1;
    if (heldCount > 0) heldCovered += 1;
    if (
      trade.side === "long" &&
      Number.isFinite(trade.avg_entry_price) &&
      warmupCount >= MIN_OPPORTUNITY_WARMUP_BARS
    ) {
      eligible += 1;
    }
  }

  return {
    directSymbolSessionBars: coverage(sessionCovered, trades.length),
    atEntryWarmup: coverage(warmupCovered, trades.length),
    heldWindowBars: coverage(heldCovered, trades.length),
    currentLongOnlyOpportunityEligibility: coverage(eligible, trades.length),
    shortTradesBlockedByV1: countBy(trades, (trade) => trade.side === "short"),
    caveat: empty.caveat,
  };
}

function rowCount(db, table) {
  return tableExists(db, table)
    ? db.prepare(`select count(*) as count from ${table}`).get().count
    : 0;
}

function statusCounts(db, table, allowedStatuses) {
  const columns = columnNames(db, table);
  const counts = Object.fromEntries(allowedStatuses.map((status) => [status, 0]));
  if (!columns.has("status")) return { total: rowCount(db, table), ...counts };
  for (const row of db.prepare(`select status, count(*) as count from ${table} group by status`).all()) {
    if (Object.hasOwn(counts, row.status)) counts[row.status] = row.count;
  }
  return { total: rowCount(db, table), ...counts };
}

function staleActiveExperiments(db, nowEpochSeconds) {
  const columns = columnNames(db, "coach_experiments");
  if (!["status", "updated_at"].every((name) => columns.has(name))) {
    return { olderThan7Days: 0, olderThan30Days: 0 };
  }
  const rows = db.prepare(
    "select updated_at from coach_experiments where status = 'active' and updated_at is not null",
  ).all();
  const ageDays = (row) => (nowEpochSeconds - Number(row.updated_at)) / 86400;
  return {
    olderThan7Days: countBy(rows, (row) => ageDays(row) > 7),
    olderThan30Days: countBy(rows, (row) => ageDays(row) > 30),
  };
}

export function buildCoverageAudit(db, options = {}) {
  const nowEpochSeconds = options.nowEpochSeconds ?? Math.floor(Date.now() / 1000);
  const trades = closedTradeRows(db);
  const sessionKeys = new Set(
    trades.map((trade) => sessionKey(trade.account_id, trade.entry_at)).filter(Boolean),
  );
  const accountsWithClosedTrades = new Set(trades.map((trade) => trade.account_id)).size;
  const setupValues = new Set(
    trades.filter((trade) => nonEmpty(trade.setup)).map((trade) => trade.setup.trim().toLowerCase()),
  );
  const riskEligible = countBy(trades, (trade) => (
    Number.isFinite(trade.stop_loss) &&
    Number.isFinite(trade.avg_entry_price) &&
    Number.isFinite(trade.quantity) &&
    trade.quantity !== 0 &&
    Math.abs(trade.avg_entry_price - trade.stop_loss) > 0
  ));
  const experimentStatuses = statusCounts(
    db,
    "coach_experiments",
    ["active", "completed", "retired"],
  );
  const reviewStatuses = statusCounts(db, "coach_reviews", ["draft", "generated", "stale"]);

  return {
    version: 1,
    privacy: "aggregate-only",
    corpus: {
      accounts: rowCount(db, "accounts"),
      accountsWithClosedTrades,
      closedTrades: trades.length,
      tradingSessions: sessionKeys.size,
    },
    intentAndRisk: {
      plannedStop: coverage(countBy(trades, (trade) => Number.isFinite(trade.stop_loss)), trades.length),
      riskMultipleEligible: coverage(riskEligible, trades.length),
      setupIdentity: coverage(countBy(trades, (trade) => nonEmpty(trade.setup)), trades.length),
      uniqueSetupSpellings: setupValues.size,
      target: coverage(countBy(trades, (trade) => Number.isFinite(trade.target)), trades.length),
      intendedTrigger: { available: false, reason: "No dedicated structured field." },
      intendedSizeOrRisk: { available: false, reason: "Actual quantity exists; intended size/risk does not." },
      exitCondition: { available: false, reason: "Target is partial context, not a structured exit condition." },
      conviction: { available: false, reason: "No stable structured field." },
    },
    journalContext: noteCoverage(db, trades, sessionKeys),
    linkedEvidence: {
      executions: relationCoverage(db, "executions", "trade_id", trades),
      tradeTags: relationCoverage(db, "trade_tags", "trade_id", trades),
      attachments: relationCoverage(db, "attachments", "trade_id", trades),
    },
    marketData: candleCoverage(db, trades),
    imports: {
      batches: rowCount(db, "import_batches"),
      executionRows: rowCount(db, "executions"),
      reconstructionWarnings: {
        available: false,
        reason: "Import diagnostics are not persisted in the database.",
      },
    },
    coachLifecycle: {
      playbooks: rowCount(db, "coach_playbooks"),
      reviews: reviewStatuses,
      experiments: {
        ...experimentStatuses,
        ...staleActiveExperiments(db, nowEpochSeconds),
        evaluatedResult: {
          available: false,
          reason: "Experiment status exists, but attempt/result evidence is not stored.",
        },
      },
      findingReactions: {
        available: false,
        reason: "Accepted, corrected, dismissed, and investigated states are not stored.",
      },
    },
  };
}

function percentText(metric) {
  return metric.percent == null
    ? `${metric.covered}/${metric.total} (n/a)`
    : `${metric.covered}/${metric.total} (${metric.percent.toFixed(1)}%)`;
}

export function formatCoverageAudit(audit) {
  const lines = [
    "Coach data coverage audit",
    "Privacy: aggregate-only; no symbols, dates, notes, account names, or rows printed.",
    "Database mode: read-only.",
    "",
    "Corpus",
    `  Accounts: ${audit.corpus.accounts} total; ${audit.corpus.accountsWithClosedTrades} with closed trades`,
    `  Closed trades: ${audit.corpus.closedTrades}`,
    `  Trading sessions: ${audit.corpus.tradingSessions}`,
    "",
    "Intent and risk",
    `  Planned stop: ${percentText(audit.intentAndRisk.plannedStop)}`,
    `  R-multiple eligible: ${percentText(audit.intentAndRisk.riskMultipleEligible)}`,
    `  Setup identity: ${percentText(audit.intentAndRisk.setupIdentity)}`,
    `  Unique setup spellings: ${audit.intentAndRisk.uniqueSetupSpellings}`,
    `  Target: ${percentText(audit.intentAndRisk.target)}`,
    "  Intended trigger: unavailable",
    "  Intended size/risk: unavailable",
    "  Exit condition: unavailable (target alone is insufficient)",
    "  Conviction: unavailable",
    "",
    "Journal context",
    `  Trade context: ${percentText(audit.journalContext.tradeContext)}`,
    `  Followed-plan field: ${percentText(audit.journalContext.followedPlan)}`,
    `  Process-tag payload: ${percentText(audit.journalContext.processTagPayload)}`,
    `  Emotion-tag payload: ${percentText(audit.journalContext.emotionTagPayload)}`,
    `  Primary trade label: ${percentText(audit.journalContext.primaryLabel)}`,
    `  Day context: ${percentText(audit.journalContext.dayContext)}`,
    `  Ticker notes: ${audit.journalContext.tickerNoteCount}`,
    "",
    "Linked evidence",
    `  Executions: ${percentText(audit.linkedEvidence.executions)}`,
    `  Trade tags: ${percentText(audit.linkedEvidence.tradeTags)}`,
    `  Attachments: ${percentText(audit.linkedEvidence.attachments)}`,
    "",
    "Market data",
    `  Direct-symbol 1m session bars: ${percentText(audit.marketData.directSymbolSessionBars)}`,
    `  At-entry warmup (>=${MIN_OPPORTUNITY_WARMUP_BARS} closed review bars): ${percentText(audit.marketData.atEntryWarmup)}`,
    `  Held-window bars: ${percentText(audit.marketData.heldWindowBars)}`,
    `  Current long-only opportunity eligibility: ${percentText(audit.marketData.currentLongOnlyOpportunityEligibility)}`,
    `  Short trades blocked by v1: ${audit.marketData.shortTradesBlockedByV1}`,
    `  Caveat: ${audit.marketData.caveat}`,
    "",
    "Import observability",
    `  Import batches: ${audit.imports.batches}`,
    `  Execution rows: ${audit.imports.executionRows}`,
    `  Reconstruction warnings: unavailable — ${audit.imports.reconstructionWarnings.reason}`,
    "",
    "Coach lifecycle",
    `  Playbooks: ${audit.coachLifecycle.playbooks}`,
    `  Reviews: ${audit.coachLifecycle.reviews.total} total; ${audit.coachLifecycle.reviews.generated} generated; ${audit.coachLifecycle.reviews.draft} draft; ${audit.coachLifecycle.reviews.stale} stale`,
    `  Experiments: ${audit.coachLifecycle.experiments.total} total; ${audit.coachLifecycle.experiments.active} active; ${audit.coachLifecycle.experiments.completed} completed; ${audit.coachLifecycle.experiments.retired} retired`,
    `  Active experiments older than 7/30 days: ${audit.coachLifecycle.experiments.olderThan7Days}/${audit.coachLifecycle.experiments.olderThan30Days}`,
    "  Evaluated experiment result: unavailable",
    "  Finding reactions: unavailable",
  ];
  return lines.join("\n");
}

function localDatabasePath(input) {
  if (input.includes("://")) {
    throw new Error("coach:coverage accepts a local SQLite path only; remote database URLs are refused.");
  }
  const path = resolve(input);
  if (!existsSync(path)) throw new Error(`Database not found: ${path}`);
  return path;
}

export function runCoverageAudit(dbPath) {
  const path = localDatabasePath(dbPath);
  const db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    db.pragma("query_only = ON");
    return buildCoverageAudit(db);
  } finally {
    db.close();
  }
}

async function main() {
  loadLocalEnv();
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const audit = runCoverageAudit(args.db ?? process.env.DB_PATH ?? DEFAULT_DB);
  console.log(args.json ? JSON.stringify(audit, null, 2) : formatCoverageAudit(audit));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
