#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULTS = {
  input: "samples/demo-trades-and-notes.csv",
  output: "samples/demo-trades-and-notes.csv",
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
  node scripts/normalize-das-demo-csv.mjs --input PATH --output PATH

Normalizes a DAS trade-summary CSV for public demo use:
  - treats DAS Volume as round-trip volume
  - compresses estimated share size into realistic 100-share lots
  - recalculates Gross P&L from the original per-share result
  - scales MFE/MAE dollar fields to the new share size
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

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}\n`;
}

function parseNumber(value) {
  const n = Number(String(value ?? "").replace(/[,+$%]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function seeded(index) {
  const x = Math.sin((index + 1) * 9999) * 10000;
  return x - Math.floor(x);
}

function roundLot(value) {
  return Math.max(100, Math.round(value / 100) * 100);
}

function normalizeShares(estimatedShares, index) {
  if (estimatedShares <= 500) return roundLot(Math.max(200, estimatedShares));
  if (estimatedShares <= 1000) return roundLot(300 + seeded(index) * 400);
  if (estimatedShares <= 2000) return roundLot(500 + seeded(index) * 600);
  if (estimatedShares <= 4000) return roundLot(700 + seeded(index) * 700);
  if (estimatedShares <= 10000) return roundLot(800 + seeded(index) * 800);
  return roundLot(1000 + seeded(index) * 1000);
}

function money(value) {
  return Number(value.toFixed(2)).toFixed(2);
}

function percent(value) {
  return Number(value.toFixed(2)).toFixed(2);
}

function normalizeCsv(csv) {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;
  if (!headers) throw new Error("CSV has no header row.");

  const col = (name) => {
    const index = headers.indexOf(name);
    if (index < 0) throw new Error(`Missing DAS column: ${name}`);
    return index;
  };

  const iVolume = col("Volume");
  const iEntry = col("Entry Price");
  const iGrossPnl = col("Gross P&L");
  const iGrossPnlPct = col("Gross P&L (%)");
  const iGrossPnlT = headers.indexOf("Gross P&L (t)");
  const iPositionMfe = headers.indexOf("Position MFE");
  const iPositionMae = headers.indexOf("Position MAE");

  let totalPnl = 0;
  let maxShares = 0;
  let totalShares = 0;
  const normalizedRows = dataRows.map((row, index) => {
    const next = [...row];
    const originalVolume = parseNumber(row[iVolume]);
    const entry = parseNumber(row[iEntry]);
    const grossPnl = parseNumber(row[iGrossPnl]);
    if (originalVolume == null || originalVolume <= 0 || entry == null || entry <= 0 || grossPnl == null) {
      return next;
    }

    const estimatedShares = originalVolume / 2;
    const normalizedShareSize = normalizeShares(estimatedShares, index);
    const scale = estimatedShares > 0 ? normalizedShareSize / estimatedShares : 1;
    const normalizedPnl = grossPnl * scale;
    const normalizedVolume = normalizedShareSize * 2;

    next[iVolume] = String(normalizedVolume);
    next[iGrossPnl] = money(normalizedPnl);
    next[iGrossPnlPct] = percent((normalizedPnl / (entry * normalizedShareSize)) * 100);
    if (iGrossPnlT >= 0 && row[iGrossPnlT] !== "") {
      const value = parseNumber(row[iGrossPnlT]);
      if (value != null) next[iGrossPnlT] = money(value * scale);
    }
    if (iPositionMfe >= 0 && row[iPositionMfe] !== "") {
      const value = parseNumber(row[iPositionMfe]);
      if (value != null) next[iPositionMfe] = money(value * scale);
    }
    if (iPositionMae >= 0 && row[iPositionMae] !== "") {
      const value = parseNumber(row[iPositionMae]);
      if (value != null) next[iPositionMae] = money(value * scale);
    }

    totalPnl += normalizedPnl;
    totalShares += normalizedShareSize;
    maxShares = Math.max(maxShares, normalizedShareSize);
    return next;
  });

  return {
    csv: toCsv([headers, ...normalizedRows]),
    rows: normalizedRows.length,
    totalPnl,
    avgShares: totalShares / normalizedRows.length,
    maxShares,
  };
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const input = resolve(args.input);
const output = resolve(args.output);
const result = normalizeCsv(readFileSync(input, "utf8"));
writeFileSync(output, result.csv);
console.log(
  `Normalized ${result.rows} rows -> ${output}. P&L ${money(result.totalPnl)}, avg shares ${Math.round(
    result.avgShares,
  )}, max shares ${result.maxShares}.`,
);
