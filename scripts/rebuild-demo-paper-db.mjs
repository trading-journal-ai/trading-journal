#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const MARKET_TZ = "America/New_York";
const DEFAULTS = {
  db: "data/tradingjournaldemo.db",
  csv: "samples/demo-trades-and-notes.csv",
  account: "Paper Account",
};

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node scripts/rebuild-demo-paper-db.mjs --db data/tradingjournaldemo.db --csv samples/demo-trades-and-notes.csv

Replaces demo trade/import data from a DAS trade-summary CSV while preserving
cached candle rows in the database.
`);
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0]);
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replace(/[,+$%]/g, "").trim());
  return Number.isFinite(n) ? n : null;
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

function parseDasDateTime(value) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) throw new Error(`Could not parse DAS datetime: ${value}`);
  const [, year, month, day, hour, minute, second] = m;
  const date = `${year}-${month}-${day}`;
  const time = `${hour.padStart(2, "0")}:${minute}:${second}`;
  return Math.round(zonedDateTimeToUtcMs(date, time, MARKET_TZ) / 1000);
}

function hashRow(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

function parseDasTradeSummary(csv) {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;
  if (!headers) throw new Error("CSV has no header row.");

  const col = (name) => {
    const index = headers.indexOf(name);
    if (index < 0) throw new Error(`Missing DAS column: ${name}`);
    return index;
  };

  const iOpen = col("Open Datetime");
  const iClose = col("Close Datetime");
  const iSymbol = col("Symbol");
  const iSide = col("Side");
  const iVolume = col("Volume");
  const iEntry = col("Entry Price");
  const iExit = col("Exit Price");
  const iGrossPnl = col("Gross P&L");
  const occurrences = new Map();
  const trades = [];

  for (const row of dataRows) {
    const symbol = (row[iSymbol] ?? "").trim().toUpperCase();
    const rawSide = (row[iSide] ?? "").trim().toUpperCase();
    const roundTripVolume = Math.abs(Math.round(parseNumber(row[iVolume]) ?? 0));
    const quantity = Math.max(1, Math.round(roundTripVolume / 2));
    const avgEntryPrice = parseNumber(row[iEntry]);
    const reportedExitPrice = parseNumber(row[iExit]);
    const grossPnl = parseNumber(row[iGrossPnl]);
    const openValue = row[iOpen] ?? "";
    const closeValue = row[iClose] ?? "";
    if (!symbol || quantity === 0 || avgEntryPrice == null || reportedExitPrice == null || grossPnl == null) {
      continue;
    }

    const side = rawSide === "S" || rawSide === "SHORT" ? "short" : "long";
    const avgExitPrice = side === "long" ? avgEntryPrice + grossPnl / quantity : avgEntryPrice - grossPnl / quantity;
    const entryAt = parseDasDateTime(openValue);
    const exitAt = parseDasDateTime(closeValue);
    const baseKey = ["das", symbol, side, quantity, avgEntryPrice, reportedExitPrice, grossPnl, entryAt, exitAt].join(
      "|",
    );
    const n = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, n + 1);
    const sourceTradeHash = hashRow([baseKey, n]);
    const openSide = side === "long" ? "buy" : "sell";
    const closeSide = side === "long" ? "sell" : "buy";
    trades.push({
      symbol,
      side,
      quantity,
      avgEntryPrice,
      avgExitPrice,
      entryAt,
      exitAt,
      grossPnl,
      executions: [
        {
          symbol,
          side: openSide,
          quantity,
          price: avgEntryPrice,
          executedAt: entryAt,
          posEffect: "TO OPEN",
          sourceRowHash: hashRow([sourceTradeHash, "open"]),
        },
        {
          symbol,
          side: closeSide,
          quantity,
          price: avgExitPrice,
          executedAt: exitAt,
          posEffect: "TO CLOSE",
          sourceRowHash: hashRow([sourceTradeHash, "close"]),
        },
      ],
    });
  }

  trades.sort((a, b) => a.entryAt - b.entryAt || a.symbol.localeCompare(b.symbol));
  return trades;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const db = new Database(resolve(args.db));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
const parsedTrades = parseDasTradeSummary(readFileSync(resolve(args.csv), "utf8"));

const rebuild = db.transaction(() => {
  let account = db.prepare("select id from accounts where name = ?").get(args.account);
  if (!account) {
    const result = db.prepare("insert into accounts (name) values (?)").run(args.account);
    account = { id: Number(result.lastInsertRowid) };
  }
  const accountId = account.id;

  db.prepare("delete from trade_tags").run();
  db.prepare("delete from attachments").run();
  db.prepare("delete from journal_entries").run();
  db.prepare("delete from executions").run();
  db.prepare("delete from trades").run();
  db.prepare("delete from import_batches").run();

  const batch = db
    .prepare(
      "insert into import_batches (account_id, kind, source, file_name, row_count) values (?, 'executions', 'das_csv', ?, ?)",
    )
    .run(accountId, args.csv.split("/").at(-1), parsedTrades.length * 2);
  const batchId = Number(batch.lastInsertRowid);

  const insertTrade = db.prepare(`
    insert into trades (
      account_id, symbol, side, quantity, avg_entry_price, entry_at, avg_exit_price, exit_at, fees, status
    ) values (?, ?, ?, ?, ?, ?, ?, ?, 0, 'closed')
  `);
  const insertExecution = db.prepare(`
    insert into executions (
      account_id, symbol, side, quantity, price, executed_at, fees, pos_effect, trade_id, import_batch_id, source_row_hash
    ) values (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `);

  for (const trade of parsedTrades) {
    const result = insertTrade.run(
      accountId,
      trade.symbol,
      trade.side,
      trade.quantity,
      trade.avgEntryPrice,
      trade.entryAt,
      trade.avgExitPrice,
      trade.exitAt,
    );
    const tradeId = Number(result.lastInsertRowid);
    for (const execution of trade.executions) {
      insertExecution.run(
        accountId,
        execution.symbol,
        execution.side,
        execution.quantity,
        execution.price,
        execution.executedAt,
        execution.posEffect,
        tradeId,
        batchId,
        execution.sourceRowHash,
      );
    }
  }
});

rebuild();
db.pragma("wal_checkpoint(FULL)");

const summary = db
  .prepare(
    `select
      count(*) as trades,
      max(quantity) as maxShares,
      round(avg(quantity), 1) as avgShares,
      round(sum((case when side = 'long' then avg_exit_price - avg_entry_price else avg_entry_price - avg_exit_price end) * quantity - fees), 2) as pnl
    from trades`,
  )
  .get();
const candles = db.prepare("select count(*) as rows from candles").get();

console.log(
  `Rebuilt ${args.db}: ${summary.trades} trades, avg shares ${summary.avgShares}, max shares ${summary.maxShares}, P&L ${summary.pnl}, candles preserved ${candles.rows}.`,
);
