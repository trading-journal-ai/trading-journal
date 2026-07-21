/**
 * ThinkorSwim Account Statement parser.
 *
 * Prefers the `Account Trade History` section for fill-level executions. When
 * that section is absent or explicitly filtered, the full `Cash Balance`
 * ledger is used as a medium-confidence execution fallback.
 * (See docs/product/PRODUCT_SPEC.md §8 for the format spec.)
 */
import { createHash } from "node:crypto";
import { tosWallClockToEpochSeconds } from "@/lib/time";
import { parseCsvLine } from "./csv";
import {
  normalizeBrokerSymbol,
  resolveSecurityIdentifier,
  type SecurityIdentifierResolution,
} from "./securityIdentifiers";

export type ParsedExecution = {
  symbol: string;
  brokerSymbol?: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: number; // epoch seconds (UTC)
  posEffect: string | null; // "TO OPEN" | "TO CLOSE"
  fees: number;
  brokerOrderKey: string | null; // hashed Cash Balance REF #; raw broker value is not persisted
  sourceRowHash: string;
};

export type TosExecutionSource = "trade_history" | "cash_balance";

export type ParsedTosStatement = {
  executions: ParsedExecution[];
  executionSource: TosExecutionSource;
  tradeHistoryFilter: string | null;
  securityIdentifiers: SecurityIdentifierResolution[];
};

function parseTosDateTime(value: string): { date: string; time: string } {
  const m = value.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  );
  if (!m) throw new Error(`Could not parse Exec Time: ${value}`);
  const [, month, day, year, hour, minute, second] = m;
  const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
  return {
    date: `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    time: `${hour.padStart(2, "0")}:${minute}:${second}`,
  };
}

function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const n = Number(String(value).replace(/[,+$]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

type StatementSection = {
  filteredBy: string | null;
  rows: string[][];
};

function sectionLabel(line: string): string {
  const cells = parseCsvLine(line).map((cell) => cell.trim()).filter(Boolean);
  return cells.length === 1 ? cells[0] : "";
}

/** Locate a section by its base title; return its title and rows until the next blank. */
function sliceSection(lines: string[], header: string): StatementSection | null {
  const idx = lines.findIndex((line) => {
    const label = sectionLabel(line);
    return label === header || label.startsWith(`${header} filtered by `);
  });
  if (idx === -1) return null;
  const title = sectionLabel(lines[idx]);
  const filteredBy = title.startsWith(`${header} filtered by `)
    ? title.slice(`${header} filtered by `.length).trim() || "unknown filter"
    : null;
  const headers = parseCsvLine(lines[idx + 1]);
  const rows: string[][] = [];
  for (let i = idx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    rows.push(parseCsvLine(line));
  }
  return { filteredBy, rows: [headers, ...rows] };
}

/**
 * Build a lookup of fees and broker order references from the Cash Balance
 * section, keyed by `symbol|epochSeconds|absQty|price` (best-effort join to
 * trade-history rows).
 */
function buildCashBalanceIndex(
  lines: string[],
): Map<string, { feeSum: number; count: number; brokerOrderKeys: Set<string> }> {
  // sum + count per key, so identical fills split the fee instead of each
  // claiming the full summed amount (which double-counts duplicates).
  const entries = new Map<
    string,
    { feeSum: number; count: number; brokerOrderKeys: Set<string> }
  >();
  const idx = lines.findIndex((l) => l.trim() === "Cash Balance");
  if (idx === -1) return entries;
  const headers = parseCsvLine(lines[idx + 1]);
  const col = (name: string) => headers.indexOf(name);
  const iDate = col("DATE");
  const iTime = col("TIME");
  const iDesc = col("DESCRIPTION");
  const iMisc = col("Misc Fees");
  const iCommissions = col("Commissions & Fees");
  const iRef = col("REF #");
  if (iDate < 0 || iTime < 0 || iDesc < 0) return entries;

  for (let i = idx + 2; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) break;
    const c = parseCsvLine(line);
    const desc = c[iDesc] ?? "";
    // e.g. "BOT +100 TMDE @4.52" / "SOLD -2,180 AIFF @1.7117"
    const m = desc.match(/^(BOT|SOLD)\s+([+-][\d,]+)\s+(\S+)\s+@([\d.]+)/);
    if (!m) continue;
    const [, , rawQty, symbol, rawPrice] = m;
    const qty = Math.abs(parseNumber(rawQty) ?? 0);
    const price = parseNumber(rawPrice) ?? 0;
    const [mo, dy, yr] = (c[iDate] ?? "").split("/");
    if (!mo || !dy || !yr) continue;
    const fullYear = Number(yr) < 100 ? 2000 + Number(yr) : Number(yr);
    const date = `${fullYear}-${mo.padStart(2, "0")}-${dy.padStart(2, "0")}`;
    const epoch = tosWallClockToEpochSeconds(date, c[iTime] ?? "");
    const misc = Math.abs(parseNumber(c[iMisc]) ?? 0);
    const commissions = Math.abs(parseNumber(c[iCommissions]) ?? 0);
    const key = `${symbol.toUpperCase()}|${epoch}|${qty}|${price}`;
    const prev = entries.get(key) ?? {
      feeSum: 0,
      count: 0,
      brokerOrderKeys: new Set<string>(),
    };
    const rawRef = iRef >= 0
      ? (c[iRef] ?? "").trim().replace(/^="(.*)"$/, "$1")
      : "";
    if (rawRef) prev.brokerOrderKeys.add(hashRow(["tos-order", rawRef]));
    prev.feeSum += misc + commissions;
    prev.count += 1;
    entries.set(key, prev);
  }
  return entries;
}

function hashRow(parts: (string | number)[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

function assignSourceRowHashes(executions: ParsedExecution[]): ParsedExecution[] {
  executions.sort((a, b) => a.executedAt - b.executedAt || a.symbol.localeCompare(b.symbol));
  const occurrences = new Map<string, number>();
  for (const execution of executions) {
    const baseKey = [
      execution.brokerSymbol ?? execution.symbol,
      execution.executedAt,
      execution.side,
      execution.quantity,
      execution.price,
      execution.posEffect ?? "",
    ].join("|");
    const occurrence = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, occurrence + 1);
    execution.sourceRowHash = hashRow([baseKey, occurrence]);
  }
  return executions;
}

function inferCashPositionEffects(executions: ParsedExecution[]): void {
  const positions = new Map<string, number>();
  executions.sort((a, b) => a.executedAt - b.executedAt || a.symbol.localeCompare(b.symbol));

  for (const execution of executions) {
    const position = positions.get(execution.symbol) ?? 0;
    const delta = execution.side === "buy" ? execution.quantity : -execution.quantity;
    const addsToPosition = position === 0 || Math.sign(position) === Math.sign(delta);
    execution.posEffect = addsToPosition ? "TO OPEN" : "TO CLOSE";
    positions.set(execution.symbol, position + delta);
  }
}

function parseCashBalanceExecutions(lines: string[]): ParsedExecution[] {
  const section = sliceSection(lines, "Cash Balance");
  if (!section) return [];
  const [headers, ...rows] = section.rows;
  const col = (name: string) => headers.indexOf(name);
  const iDate = col("DATE");
  const iTime = col("TIME");
  const iDesc = col("DESCRIPTION");
  const iMisc = col("Misc Fees");
  const iCommissions = col("Commissions & Fees");
  const iRef = col("REF #");
  if (iDate < 0 || iTime < 0 || iDesc < 0) return [];

  const executions: ParsedExecution[] = [];
  for (const row of rows) {
    const description = row[iDesc] ?? "";
    const match = description.match(/^(BOT|SOLD)\s+([+-][\d,]+)\s+(\S+)\s+@([\d.]+)/);
    if (!match) continue;
    const [, rawSide, rawQuantity, rawSymbol, rawPrice] = match;
    const quantity = Math.abs(parseNumber(rawQuantity) ?? 0);
    const price = parseNumber(rawPrice);
    const dateValue = row[iDate] ?? "";
    const timeValue = row[iTime] ?? "";
    if (quantity === 0 || price == null || !dateValue || !timeValue) continue;

    const [month, day, year] = dateValue.split("/");
    if (!month || !day || !year) continue;
    const fullYear = Number(year) < 100 ? 2000 + Number(year) : Number(year);
    const date = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    const rawRef = iRef >= 0
      ? (row[iRef] ?? "").trim().replace(/^="(.*)"$/, "$1")
      : "";

    const rawBrokerSymbol = rawSymbol.toUpperCase();
    const normalizedSymbol = normalizeBrokerSymbol(rawBrokerSymbol);
    executions.push({
      symbol: normalizedSymbol.symbol,
      brokerSymbol: normalizedSymbol.resolution ? rawBrokerSymbol : undefined,
      side: rawSide === "SOLD" ? "sell" : "buy",
      quantity,
      price,
      executedAt: tosWallClockToEpochSeconds(date, timeValue),
      posEffect: null,
      fees:
        Math.abs(parseNumber(row[iMisc]) ?? 0) +
        Math.abs(parseNumber(row[iCommissions]) ?? 0),
      brokerOrderKey: rawRef ? hashRow(["tos-order", rawRef]) : null,
      sourceRowHash: "",
    });
  }

  inferCashPositionEffects(executions);
  return assignSourceRowHashes(executions);
}

function parseTradeHistoryExecutions(lines: string[], section: StatementSection): ParsedExecution[] {
  const [headers, ...rows] = section.rows;
  const col = (name: string) => headers.indexOf(name);
  const iExec = col("Exec Time");
  const iSide = col("Side");
  const iQty = col("Qty");
  const iSym = col("Symbol");
  const iPrice = col("Price");
  const iNet = col("Net Price");
  const iPos = col("Pos Effect");

  const cashBalanceIndex = buildCashBalanceIndex(lines);
  const out: ParsedExecution[] = [];
  const ambiguousOrderOccurrences = new Map<string, number>();

  for (const c of rows) {
    const execTime = c[iExec];
    const rawSymbol = (c[iSym] ?? "").toUpperCase();
    const normalizedSymbol = normalizeBrokerSymbol(rawSymbol);
    const symbol = normalizedSymbol.symbol;
    const qty = Math.abs(parseNumber(c[iQty]) ?? 0);
    const price = parseNumber(c[iNet]) ?? parseNumber(c[iPrice]);
    if (!execTime || !symbol || qty === 0 || price == null) continue;

    const { date, time } = parseTosDateTime(execTime);
    const executedAt = tosWallClockToEpochSeconds(date, time);
    const side = (c[iSide] ?? "").toUpperCase() === "SELL" ? "sell" : "buy";
    const posEffect = (c[iPos] ?? "").trim() || null;
    const cashBalanceKey = `${rawSymbol}|${executedAt}|${qty}|${price}`;
    const cashBalanceEntry = cashBalanceIndex.get(cashBalanceKey);
    const fees = cashBalanceEntry
      ? cashBalanceEntry.feeSum / cashBalanceEntry.count
      : 0;
    let brokerOrderKey: string | null = null;
    if (cashBalanceEntry?.brokerOrderKeys.size === 1) {
      brokerOrderKey = [...cashBalanceEntry.brokerOrderKeys][0];
    } else if (cashBalanceEntry && cashBalanceEntry.brokerOrderKeys.size > 1) {
      // Multiple broker references match the same fill signature. We cannot
      // safely assign a specific reference, so issue stable per-row keys that
      // keep these fills separate and disable timestamp fallback grouping.
      const occurrence = ambiguousOrderOccurrences.get(cashBalanceKey) ?? 0;
      ambiguousOrderOccurrences.set(cashBalanceKey, occurrence + 1);
      brokerOrderKey = hashRow(["tos-ambiguous-order", cashBalanceKey, occurrence]);
    }

    out.push({
      symbol,
      brokerSymbol: normalizedSymbol.resolution ? rawSymbol : undefined,
      side,
      quantity: qty,
      price,
      executedAt,
      posEffect,
      fees,
      brokerOrderKey,
      sourceRowHash: "", // assigned below (per-occurrence)
    });
  }

  return assignSourceRowHashes(out);
}

export function parseTosStatementWithMetadata(csv: string): ParsedTosStatement {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/);
  const tradeHistorySection = sliceSection(lines, "Account Trade History");

  if (tradeHistorySection && !tradeHistorySection.filteredBy) {
    const executions = parseTradeHistoryExecutions(lines, tradeHistorySection);
    if (executions.length > 0) {
      return {
        executions,
        executionSource: "trade_history",
        tradeHistoryFilter: null,
        securityIdentifiers: statementSecurityIdentifiers(executions),
      };
    }
  }

  const cashExecutions = parseCashBalanceExecutions(lines);
  if (cashExecutions.length > 0) {
    return {
      executions: cashExecutions,
      executionSource: "cash_balance",
      tradeHistoryFilter: tradeHistorySection?.filteredBy ?? null,
      securityIdentifiers: statementSecurityIdentifiers(cashExecutions),
    };
  }

  if (tradeHistorySection?.filteredBy) {
    throw new Error(
      `Account Trade History is filtered by ${tradeHistorySection.filteredBy}, and no full Cash Balance executions were found.`,
    );
  }
  throw new Error("Could not find usable executions in Account Trade History or Cash Balance.");
}

function statementSecurityIdentifiers(executions: ParsedExecution[]): SecurityIdentifierResolution[] {
  const resolutions = new Map<string, SecurityIdentifierResolution>();
  for (const execution of executions) {
    if (!execution.brokerSymbol) continue;
    const resolution = resolveSecurityIdentifier(execution.brokerSymbol);
    if (resolution) resolutions.set(resolution.identifier, resolution);
  }
  return [...resolutions.values()].sort((a, b) => a.identifier.localeCompare(b.identifier));
}

export function parseTosStatement(csv: string): ParsedExecution[] {
  return parseTosStatementWithMetadata(csv).executions;
}
