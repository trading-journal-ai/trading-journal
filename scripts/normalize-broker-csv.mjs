#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const DEFAULTS = {
  file: "data/evals/coach/raw/2026-07-02-AccountStatement-V2.csv",
  output: "",
  sourceTimeZone: "America/Los_Angeles",
  marketTimeZone: "America/New_York",
  includeOpen: false,
};

const TRADERVUE_HEADERS = [
  "Open Datetime",
  "Close Datetime",
  "Symbol",
  "Side",
  "Volume",
  "Exec Count",
  "Entry Price",
  "Exit Price",
  "Gross P&L",
  "Gross P&L (%)",
  "Shared",
  "Notes",
  "Tags",
  "Gross P&L (t)",
  "Position MFE",
  "Position MAE",
  "Price MFE",
  "Price MAE",
  "Position MFE Datetime",
  "Position MAE Datetime",
  "Price MFE Datetime",
  "Price MAE Datetime",
];

function usage() {
  console.log(`
Usage:
  npm run broker:normalize
  npm run broker:normalize -- --file data/evals/coach/raw/statement.csv
  npm run broker:normalize -- --file data/evals/coach/raw/statement.csv --output data/evals/coach/outputs/normalized.csv

Options:
  --file PATH             TOS/Schwab account statement CSV. Default: ${DEFAULTS.file}
  --output PATH           Normalized TraderVue-style CSV output path.
  --include-open          Include still-open reconstructed trades.
  --source-time-zone TZ   Source timezone for TOS wall-clock timestamps. Default: ${DEFAULTS.sourceTimeZone}
  --market-time-zone TZ   Output timezone for TraderVue-style timestamps. Default: ${DEFAULTS.marketTimeZone}
`);
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--include-open") {
      args.includeOpen = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    if (arg === "--file") args.file = value;
    else if (arg === "--output") args.output = value;
    else if (arg === "--source-time-zone") args.sourceTimeZone = value;
    else if (arg === "--market-time-zone") args.marketTimeZone = value;
    else throw new Error(`Unknown option: ${arg}`);
    i += 1;
  }
  return args;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      i += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(cleanCell(cell));
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cleanCell(cell));
  return cells;
}

function cleanCell(value) {
  return String(value ?? "").trim().replace(/^\uFEFF/, "").replace(/^="(.*)"$/, "$1");
}

function sliceSection(lines, header) {
  const idx = lines.findIndex((line) => line.trim() === header);
  if (idx === -1) return [];
  const headers = parseCsvLine(lines[idx + 1] ?? "");
  const rows = [];
  for (let i = idx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line?.trim()) break;
    rows.push(parseCsvLine(line));
  }
  return [headers, ...rows];
}

function parseNumber(value) {
  const normalized = String(value ?? "").replace(/[,+$%]/g, "").trim();
  if (!normalized || normalized === "~") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseTosDateTime(value) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Could not parse TOS timestamp: ${value}`);
  const [, month, day, year, hour, minute, second] = match;
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  return {
    date: `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time: `${hour.padStart(2, "0")}:${minute}:${second}`,
  };
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
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function zonedDateTimeToUtcMs(date, time, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = targetAsUtc;
  for (let i = 0; i < 5; i += 1) {
    const parts = timeZoneParts(guess, timeZone);
    const renderedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const diff = targetAsUtc - renderedAsUtc;
    guess += diff;
    if (diff === 0) break;
  }
  return guess;
}

function formatWallDateTime(epochSeconds, timeZone) {
  const parts = timeZoneParts(epochSeconds * 1000, timeZone);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function buildFeeIndex(lines, sourceTimeZone) {
  const section = sliceSection(lines, "Cash Balance");
  if (section.length === 0) return new Map();
  const [headers, ...rows] = section;
  const col = (name) => headers.indexOf(name);
  const iDate = col("DATE");
  const iTime = col("TIME");
  const iDesc = col("DESCRIPTION");
  const iMisc = col("Misc Fees");
  const fees = new Map();

  for (const row of rows) {
    const desc = row[iDesc] ?? "";
    const match = desc.match(/^(BOT|SOLD)\s+([+-][\d,]+)\s+(\S+)\s+@([\d.]+)/);
    if (!match) continue;
    const [, , rawQty, symbol, rawPrice] = match;
    const qty = Math.abs(parseNumber(rawQty) ?? 0);
    const price = parseNumber(rawPrice) ?? 0;
    const { date, time } = parseTosDateTime(`${row[iDate]} ${row[iTime]}`);
    const epoch = Math.round(zonedDateTimeToUtcMs(date, time, sourceTimeZone) / 1000);
    const misc = Math.abs(parseNumber(row[iMisc]) ?? 0);
    const key = `${symbol.toUpperCase()}|${epoch}|${qty}|${price}`;
    const previous = fees.get(key) ?? { sum: 0, n: 0 };
    fees.set(key, { sum: previous.sum + misc, n: previous.n + 1 });
  }
  return fees;
}

function hashRow(parts) {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

function parseTosExecutions(csv, { sourceTimeZone }) {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/);
  const section = sliceSection(lines, "Account Trade History");
  if (section.length === 0) throw new Error("Could not find Account Trade History section.");
  const [headers, ...rows] = section;
  const col = (name) => headers.indexOf(name);
  const iExec = col("Exec Time");
  const iSide = col("Side");
  const iQty = col("Qty");
  const iSym = col("Symbol");
  const iPrice = col("Price");
  const iNet = col("Net Price");
  const iPos = col("Pos Effect");
  const feeIndex = buildFeeIndex(lines, sourceTimeZone);
  const out = [];

  for (const row of rows) {
    const execTime = row[iExec];
    const symbol = (row[iSym] ?? "").toUpperCase();
    const quantity = Math.abs(parseNumber(row[iQty]) ?? 0);
    const price = parseNumber(row[iNet]) ?? parseNumber(row[iPrice]);
    if (!execTime || !symbol || quantity === 0 || price == null) continue;

    const { date, time } = parseTosDateTime(execTime);
    const executedAt = Math.round(zonedDateTimeToUtcMs(date, time, sourceTimeZone) / 1000);
    const side = (row[iSide] ?? "").toUpperCase() === "SELL" ? "sell" : "buy";
    const posEffect = (row[iPos] ?? "").trim() || null;
    const feeEntry = feeIndex.get(`${symbol}|${executedAt}|${quantity}|${price}`);
    const fees = feeEntry ? feeEntry.sum / feeEntry.n : 0;
    out.push({ symbol, side, quantity, price, executedAt, posEffect, fees, sourceRowHash: "" });
  }

  out.sort((a, b) => a.executedAt - b.executedAt || a.symbol.localeCompare(b.symbol));
  const occurrences = new Map();
  for (const execution of out) {
    const baseKey = [
      execution.symbol,
      execution.executedAt,
      execution.side,
      execution.quantity,
      execution.price,
      execution.posEffect ?? "",
    ].join("|");
    const n = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, n + 1);
    execution.sourceRowHash = hashRow([baseKey, n]);
  }
  return out;
}

function matchTrades(executions) {
  const bySymbol = new Map();
  for (const execution of executions) {
    if (!bySymbol.has(execution.symbol)) bySymbol.set(execution.symbol, []);
    bySymbol.get(execution.symbol).push(execution);
  }

  const trades = [];
  for (const fills of bySymbol.values()) {
    fills.sort((a, b) => a.executedAt - b.executedAt);
    let builder = null;
    for (const fill of fills) {
      let remaining = fill.quantity;
      const isBuy = fill.side === "buy";
      while (remaining > 0) {
        if (!builder) {
          builder = {
            symbol: fill.symbol,
            side: isBuy ? "long" : "short",
            openQty: 0,
            openCost: 0,
            closeQty: 0,
            closeProceeds: 0,
            fees: 0,
            firstAt: fill.executedAt,
            lastAt: fill.executedAt,
            position: 0,
            hashes: new Set(),
          };
        }
        const opening = (builder.side === "long" && isBuy) || (builder.side === "short" && !isBuy);
        builder.hashes.add(fill.sourceRowHash);
        builder.lastAt = fill.executedAt;
        if (opening) {
          builder.openQty += remaining;
          builder.openCost += fill.price * remaining;
          builder.position += remaining;
          builder.fees += allocFee(fill, remaining);
          remaining = 0;
        } else {
          const closeQty = Math.min(remaining, builder.position);
          builder.closeQty += closeQty;
          builder.closeProceeds += fill.price * closeQty;
          builder.position -= closeQty;
          builder.fees += allocFee(fill, closeQty);
          remaining -= closeQty;
          if (builder.position === 0) {
            trades.push(finalizeTrade(builder));
            builder = null;
          }
        }
      }
    }
    if (builder) trades.push(finalizeTrade(builder));
  }

  trades.sort((a, b) => a.entryAt - b.entryAt || a.symbol.localeCompare(b.symbol));
  return trades;
}

function allocFee(fill, quantity) {
  if (fill.quantity === 0) return 0;
  return (fill.fees * quantity) / fill.quantity;
}

function finalizeTrade(builder) {
  const avgEntryPrice = builder.openCost / builder.openQty;
  const avgExitPrice = builder.closeQty > 0 ? builder.closeProceeds / builder.closeQty : null;
  const matched = Math.min(builder.openQty, builder.closeQty);
  const closed = builder.position === 0 && builder.closeQty > 0;
  const grossPnl =
    avgExitPrice == null
      ? 0
      : (builder.side === "long" ? avgExitPrice - avgEntryPrice : avgEntryPrice - avgExitPrice) * matched;
  return {
    symbol: builder.symbol,
    side: builder.side,
    quantity: builder.openQty,
    avgEntryPrice,
    entryAt: builder.firstAt,
    avgExitPrice,
    exitAt: closed ? builder.lastAt : null,
    fees: builder.fees,
    status: closed ? "closed" : "open",
    grossPnl,
    netPnl: grossPnl - builder.fees,
    executionCount: builder.hashes.size,
  };
}

function csvValue(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function round(value, digits = 4) {
  if (value == null || !Number.isFinite(value)) return "";
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}

function toTraderVueRows(trades, { includeOpen, marketTimeZone }) {
  return trades
    .filter((trade) => includeOpen || trade.status === "closed")
    .map((trade) => {
      const basis = trade.avgEntryPrice * trade.quantity;
      const grossPct = basis === 0 ? null : (trade.grossPnl / basis) * 100;
      return [
        formatWallDateTime(trade.entryAt, marketTimeZone),
        trade.exitAt == null ? "" : formatWallDateTime(trade.exitAt, marketTimeZone),
        trade.symbol,
        trade.side === "long" ? "L" : "S",
        round(trade.quantity * 2, 0),
        round(trade.executionCount, 0),
        round(trade.avgEntryPrice),
        trade.avgExitPrice == null ? "" : round(trade.avgExitPrice),
        round(trade.grossPnl, 2),
        grossPct == null ? "" : round(grossPct, 2),
        "false",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ];
    });
}

function defaultOutputPath(inputPath) {
  const name = basename(inputPath).replace(/\.csv$/i, "");
  return `data/evals/coach/outputs/${name}.normalized-tradervue.csv`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const csv = readFileSync(resolve(args.file), "utf8");
const executions = parseTosExecutions(csv, args);
const trades = matchTrades(executions);
const rows = toTraderVueRows(trades, args);
const output = args.output || defaultOutputPath(args.file);
const outputCsv = [TRADERVUE_HEADERS, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(resolve(output), `${outputCsv}\n`);

const closed = trades.filter((trade) => trade.status === "closed");
const open = trades.filter((trade) => trade.status === "open");
const grossPnl = closed.reduce((total, trade) => total + trade.grossPnl, 0);
const fees = closed.reduce((total, trade) => total + trade.fees, 0);
console.log(`${basename(args.file)}: ${executions.length} fills -> ${trades.length} trades (${closed.length} closed, ${open.length} open)`);
console.log(`Wrote ${rows.length} TraderVue-style rows -> ${output}`);
console.log(`Closed gross P&L ${round(grossPnl, 2)}, fees ${round(fees, 2)}, net ${round(grossPnl - fees, 2)}`);
