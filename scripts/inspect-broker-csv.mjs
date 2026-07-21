#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULT_FILE = "data/evals/coach/raw/2026-07-02-AccountStatement.csv";

const TOS_SECTIONS = [
  "Cash Balance",
  "Futures Statements",
  "Forex Statements",
  "Account Order History",
  "Account Trade History",
  "Equities",
  "Profits and Losses",
];

function usage() {
  console.log(`
Usage:
  npm run broker:inspect
  npm run broker:inspect -- --file data/evals/coach/raw/export.csv
  npm run broker:inspect -- --file data/evals/coach/raw/export.csv --json

Options:
  --file PATH  Broker CSV to inspect. Default: ${DEFAULT_FILE}
  --json       Print machine-readable JSON.
`);
}

function parseArgs(argv) {
  const args = { file: DEFAULT_FILE, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg !== "--file") throw new Error(`Unknown option: ${arg}`);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error("Missing value for --file.");
    args.file = value;
    i += 1;
  }
  return args;
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
      row.push(cleanCell(field));
      field = "";
    } else if (char === "\n") {
      row.push(cleanCell(field.replace(/\r$/, "")));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) row.push(cleanCell(field.replace(/\r$/, "")));
  if (row.length > 0) rows.push(row);
  return rows;
}

function cleanCell(value) {
  return String(value ?? "").trim().replace(/^\uFEFF/, "").replace(/^="(.*)"$/, "$1");
}

function nonEmptyCells(row) {
  return row.map(cleanCell).filter(Boolean);
}

function rowLabel(row) {
  const cells = nonEmptyCells(row);
  return cells.length === 1 ? cells[0] : "";
}

function isBlank(row) {
  return nonEmptyCells(row).length === 0;
}

function findSectionIndex(rows, name) {
  return rows.findIndex((row) => {
    const label = rowLabel(row);
    return label === name || label.startsWith(`${name} filtered by `);
  });
}

function headerIndexAfter(rows, sectionIndex) {
  for (let i = sectionIndex + 1; i < rows.length; i += 1) {
    if (!isBlank(rows[i])) return i;
  }
  return -1;
}

function sliceSection(rows, name) {
  const sectionIndex = findSectionIndex(rows, name);
  if (sectionIndex < 0) return { present: false, filteredBy: null, headers: [], rows: [] };
  const title = rowLabel(rows[sectionIndex]);
  const filteredBy = title.startsWith(`${name} filtered by `)
    ? title.slice(`${name} filtered by `.length).trim() || "unknown filter"
    : null;
  const headerIndex = headerIndexAfter(rows, sectionIndex);
  if (headerIndex < 0) return { present: true, filteredBy, headers: [], rows: [] };

  const headers = rows[headerIndex].map(cleanCell);
  const sectionRows = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const current = rows[i];
    const label = rowLabel(current);
    if (TOS_SECTIONS.some((section) => label === section || label.startsWith(`${section} filtered by `))) break;
    if (isBlank(current)) break;
    sectionRows.push(current.map(cleanCell));
  }
  return { present: true, filteredBy, headers, rows: sectionRows };
}

function indexByHeader(headers) {
  const out = new Map();
  headers.forEach((header, index) => {
    if (header && !out.has(header)) out.set(header, index);
  });
  return out;
}

function numberOrNull(value) {
  const normalized = String(value ?? "").replace(/[,+$()%]/g, "").trim();
  if (!normalized || normalized === "~") return null;
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return String(value).includes("(") && String(value).includes(")") ? -number : number;
}

function valueAt(row, headerIndex, name) {
  const index = headerIndex.get(name);
  return index == null ? "" : cleanCell(row[index]);
}

function inspectAppExport(rows) {
  const firstNonBlank = rows.find((row) => !isBlank(row)) ?? [];
  const headers = firstNonBlank.map(cleanCell);
  const required = [
    "trade_id",
    "symbol",
    "side",
    "quantity",
    "entry_at",
    "exit_at",
    "avg_entry_price",
    "avg_exit_price",
    "net_pnl",
  ];
  if (!required.every((header) => headers.includes(header))) {
    return { detected: false, tradeRows: 0 };
  }
  return {
    detected: true,
    tradeRows: rows.slice(rows.indexOf(firstNonBlank) + 1).filter((row) => !isBlank(row)).length,
  };
}

function inspectDasTradeSummary(rows) {
  const firstNonBlank = rows.find((row) => !isBlank(row)) ?? [];
  const headers = firstNonBlank.map(cleanCell);
  const required = [
    "Open Datetime",
    "Close Datetime",
    "Symbol",
    "Side",
    "Volume",
    "Entry Price",
    "Exit Price",
    "Gross P&L",
  ];
  if (!required.every((header) => headers.includes(header))) {
    return { detected: false, tradeRows: 0 };
  }
  return {
    detected: true,
    tradeRows: rows.slice(rows.indexOf(firstNonBlank) + 1).filter((row) => !isBlank(row)).length,
  };
}

function summarizeTosTradeHistory(section) {
  if (!section.present) {
    return { present: false, filteredBy: null, rows: 0, usableFills: 0, missingPrice: 0 };
  }
  const headerIndex = indexByHeader(section.headers);
  let usableFills = 0;
  let missingPrice = 0;
  for (const row of section.rows) {
    const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
    const price = numberOrNull(valueAt(row, headerIndex, "Net Price")) ?? numberOrNull(valueAt(row, headerIndex, "Price"));
    const symbol = valueAt(row, headerIndex, "Symbol");
    const execTime = valueAt(row, headerIndex, "Exec Time");
    if (symbol && execTime && qty > 0 && price != null) usableFills += 1;
    if (symbol && execTime && qty > 0 && price == null) missingPrice += 1;
  }
  return {
    present: true,
    filteredBy: section.filteredBy,
    rows: section.rows.length,
    usableFills,
    missingPrice,
  };
}

function parseCashTradeDescription(value) {
  const match = String(value ?? "").match(/^(BOT|SOLD)\s+([+-][\d,]+)\s+(\S+)\s+@([\d.]+)/);
  if (!match) return null;
  const [, rawSide, rawQuantity, rawSymbol, rawPrice] = match;
  const quantity = Math.abs(numberOrNull(rawQuantity) ?? 0);
  const price = numberOrNull(rawPrice);
  if (quantity === 0 || price == null) return null;
  return {
    side: rawSide === "BOT" ? "BUY" : "SELL",
    quantity,
    symbol: rawSymbol.toUpperCase(),
    price,
  };
}

function tradeHistoryFillKey(row, headerIndex) {
  const execTime = valueAt(row, headerIndex, "Exec Time");
  const side = valueAt(row, headerIndex, "Side").toUpperCase();
  const symbol = valueAt(row, headerIndex, "Symbol").toUpperCase();
  const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
  const price = numberOrNull(valueAt(row, headerIndex, "Net Price")) ?? numberOrNull(valueAt(row, headerIndex, "Price"));
  if (!execTime || !["BUY", "SELL"].includes(side) || !symbol || qty === 0 || price == null) return null;
  return `${execTime}|${side}|${qty}|${symbol}|${price}`;
}

function summarizeCashBalance(section, tradeHistorySection) {
  if (!section.present) {
    return {
      present: false,
      rows: 0,
      tradeRows: 0,
      botRows: 0,
      soldRows: 0,
      feesRows: 0,
      tradeHistoryExactMatches: null,
      tradeHistoryUnmatched: null,
      cashUnmatched: null,
    };
  }

  const headerIndex = indexByHeader(section.headers);
  const cashKeys = new Map();
  let botRows = 0;
  let soldRows = 0;
  let feesRows = 0;

  for (const row of section.rows) {
    const parsed = parseCashTradeDescription(valueAt(row, headerIndex, "DESCRIPTION"));
    const fees = numberOrNull(valueAt(row, headerIndex, "Misc Fees")) ?? 0;
    if (fees !== 0) feesRows += 1;
    if (!parsed) continue;
    if (parsed.side === "BUY") botRows += 1;
    else soldRows += 1;
    const key = `${valueAt(row, headerIndex, "DATE")} ${valueAt(row, headerIndex, "TIME")}|${parsed.side}|${parsed.quantity}|${parsed.symbol}|${parsed.price}`;
    cashKeys.set(key, (cashKeys.get(key) ?? 0) + 1);
  }

  let tradeHistoryExactMatches = null;
  let tradeHistoryUnmatched = null;
  let cashUnmatched = null;
  if (tradeHistorySection.present) {
    const tradeHeaderIndex = indexByHeader(tradeHistorySection.headers);
    tradeHistoryExactMatches = 0;
    tradeHistoryUnmatched = 0;
    for (const row of tradeHistorySection.rows) {
      const key = tradeHistoryFillKey(row, tradeHeaderIndex);
      if (!key) continue;
      const count = cashKeys.get(key) ?? 0;
      if (count > 0) {
        cashKeys.set(key, count - 1);
        tradeHistoryExactMatches += 1;
      } else {
        tradeHistoryUnmatched += 1;
      }
    }
    cashUnmatched = [...cashKeys.values()].reduce((total, count) => total + count, 0);
  }

  return {
    present: true,
    rows: section.rows.length,
    tradeRows: botRows + soldRows,
    botRows,
    soldRows,
    feesRows,
    tradeHistoryExactMatches,
    tradeHistoryUnmatched,
    cashUnmatched,
  };
}

function summarizeTosOrderHistory(section) {
  if (!section.present) {
    return {
      present: false,
      filteredBy: null,
      rows: 0,
      filledRows: 0,
      usableFilledRows: 0,
      canceledRows: 0,
      missingPrice: 0,
    };
  }
  const headerIndex = indexByHeader(section.headers);
  let filledRows = 0;
  let canceledRows = 0;
  let usableFilledRows = 0;
  let missingPrice = 0;
  const symbols = new Set();

  for (const row of section.rows) {
    const status = valueAt(row, headerIndex, "Status").toUpperCase();
    const symbol = valueAt(row, headerIndex, "Symbol").toUpperCase();
    const side = valueAt(row, headerIndex, "Side").toUpperCase();
    const timePlaced = valueAt(row, headerIndex, "Time Placed");
    const qty = Math.abs(numberOrNull(valueAt(row, headerIndex, "Qty")) ?? 0);
    const price = numberOrNull(valueAt(row, headerIndex, "PRICE"));
    if (symbol) symbols.add(symbol);
    if (status === "FILLED") filledRows += 1;
    if (status.startsWith("CANCEL")) canceledRows += 1;
    if (status === "FILLED" && symbol && timePlaced && ["BUY", "SELL"].includes(side) && qty > 0 && price != null) {
      usableFilledRows += 1;
    }
    if (status === "FILLED" && symbol && timePlaced && qty > 0 && price == null) missingPrice += 1;
  }

  return {
    present: true,
    filteredBy: section.filteredBy,
    rows: section.rows.length,
    filledRows,
    usableFilledRows,
    canceledRows,
    missingPrice,
    symbolCount: symbols.size,
  };
}

function summarizePnl(section) {
  if (!section.present) return { present: false, rows: 0, symbols: 0, netYtdPnl: null };
  const headerIndex = indexByHeader(section.headers);
  let netYtdPnl = 0;
  let symbols = 0;
  for (const row of section.rows) {
    const symbol = valueAt(row, headerIndex, "Symbol");
    if (!symbol || symbol === "OVERALL TOTALS") continue;
    symbols += 1;
    netYtdPnl += numberOrNull(valueAt(row, headerIndex, "P/L YTD")) ?? 0;
  }
  return {
    present: true,
    rows: section.rows.length,
    symbols,
    netYtdPnl: Math.round(netYtdPnl * 100) / 100,
  };
}

function summarizeEquities(section) {
  if (!section.present) return { present: false, rows: 0, positions: 0 };
  const headerIndex = indexByHeader(section.headers);
  let positions = 0;
  for (const row of section.rows) {
    const symbol = valueAt(row, headerIndex, "Symbol");
    if (symbol && symbol !== "OVERALL TOTALS") positions += 1;
  }
  return { present: true, rows: section.rows.length, positions };
}

function inspectBrokerCsv(path) {
  const text = readFileSync(resolve(path), "utf8");
  const rows = parseCsvRows(text);
  const appExport = inspectAppExport(rows);
  const dasTradeSummary = inspectDasTradeSummary(rows);
  const cashBalanceSection = sliceSection(rows, "Cash Balance");
  const orderHistorySection = sliceSection(rows, "Account Order History");
  const tradeHistorySection = sliceSection(rows, "Account Trade History");
  const cashBalance = summarizeCashBalance(cashBalanceSection, tradeHistorySection);
  const orderHistory = summarizeTosOrderHistory(orderHistorySection);
  const tradeHistory = summarizeTosTradeHistory(tradeHistorySection);
  const pnl = summarizePnl(sliceSection(rows, "Profits and Losses"));
  const equities = summarizeEquities(sliceSection(rows, "Equities"));

  const format = dasTradeSummary.detected
    ? "das-trade-summary"
    : appExport.detected
      ? "app-export"
      : orderHistory.present || tradeHistory.present || pnl.present
      ? "tos-account-statement"
      : "unknown";

  return {
    file: path,
    format,
    appExport,
    dasTradeSummary,
    tos: {
      cashBalance,
      orderHistory,
      tradeHistory,
      equities,
      pnl,
    },
    recommendation: recommend({
      format,
      appExport,
      dasTradeSummary,
      cashBalance,
      orderHistory,
      tradeHistory,
      pnl,
    }),
  };
}

function recommend({ format, appExport, dasTradeSummary, cashBalance, orderHistory, tradeHistory, pnl }) {
  if (dasTradeSummary.detected && dasTradeSummary.tradeRows > 0) {
    return "Usable for import and private coach evals as trade-summary rows.";
  }
  if (appExport.detected && appExport.tradeRows > 0) {
    return "Usable for private coach evals with trade-level P&L facts.";
  }
  if (tradeHistory.usableFills > 0 && !tradeHistory.filteredBy) {
    return "Usable for import/chart reconstruction from TOS fill-level trade history.";
  }
  if (cashBalance.tradeRows > 0) {
    const filterNote = tradeHistory.filteredBy
      ? `; detailed trade history is filtered by ${tradeHistory.filteredBy}`
      : "";
    return `Usable for import from the full Cash Balance ledger${filterNote}.`;
  }
  if (tradeHistory.usableFills > 0 && tradeHistory.filteredBy) {
    return `Trade history is filtered by ${tradeHistory.filteredBy}; export an unfiltered statement or include full Cash Balance rows.`;
  }
  if (orderHistory.usableFilledRows > 0) {
    return "Usable for a first-pass order-history import; treat times/prices as order-history facts, not exact fills.";
  }
  if (pnl.symbols > 0) {
    return "Usable only for symbol-level P&L review unless the order/trade history sections are exported with rows.";
  }
  if (format === "tos-account-statement") {
    return "TOS statement detected, but no usable trade/order rows were found.";
  }
  return "Unknown CSV format; no supported trade sections found.";
}

function printHuman(result) {
  console.log(`${basename(result.file)}: ${result.format}`);
  if (result.dasTradeSummary.detected) {
    console.log(`DAS/TraderVue trade rows: ${result.dasTradeSummary.tradeRows}`);
  }
  if (result.appExport.detected) {
    console.log(`App export trades: ${result.appExport.tradeRows}`);
  }
  const { orderHistory, tradeHistory, equities, pnl } = result.tos;
  if (result.tos.cashBalance.present) {
    console.log(
      `TOS cash balance: ${result.tos.cashBalance.tradeRows} trade rows (${result.tos.cashBalance.botRows} BOT, ${result.tos.cashBalance.soldRows} SOLD), ${result.tos.cashBalance.feesRows} fee rows`,
    );
    if (result.tos.cashBalance.tradeHistoryExactMatches != null) {
      console.log(
        `TOS cash ↔ trade history: ${result.tos.cashBalance.tradeHistoryExactMatches} exact matches, ${result.tos.cashBalance.tradeHistoryUnmatched} trade-history unmatched, ${result.tos.cashBalance.cashUnmatched} cash unmatched`,
      );
    }
  }
  if (orderHistory.present) {
    console.log(
      `TOS order history${orderHistory.filteredBy ? ` (filtered by ${orderHistory.filteredBy})` : ""}: ${orderHistory.rows} rows, ${orderHistory.filledRows} filled, ${orderHistory.usableFilledRows} usable filled, ${orderHistory.canceledRows} canceled`,
    );
  }
  if (tradeHistory.present) {
    console.log(
      `TOS trade history${tradeHistory.filteredBy ? ` (filtered by ${tradeHistory.filteredBy})` : ""}: ${tradeHistory.rows} rows, ${tradeHistory.usableFills} usable fills, ${tradeHistory.missingPrice} missing price`,
    );
  }
  if (equities.present) {
    console.log(`TOS equities: ${equities.positions} open positions`);
  }
  if (pnl.present) {
    console.log(`TOS P&L: ${pnl.symbols} symbols, YTD P&L ${pnl.netYtdPnl}`);
  }
  console.log(`Recommendation: ${result.recommendation}`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  usage();
  process.exit(0);
}

const result = inspectBrokerCsv(args.file);
if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printHuman(result);
}
