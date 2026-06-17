import { createHash } from "node:crypto";
import { MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";
import { parseCsvRows } from "./csv";
import type { ParsedExecution } from "./tos";

export type ParsedDasTrade = {
  symbol: string;
  side: "long" | "short";
  quantity: number;
  avgEntryPrice: number;
  entryAt: number;
  avgExitPrice: number;
  exitAt: number;
  fees: number;
  status: "closed";
  sourceTradeHash: string;
  executions: ParsedExecution[];
};

const REQUIRED_HEADERS = [
  "Open Datetime",
  "Close Datetime",
  "Symbol",
  "Side",
  "Volume",
  "Entry Price",
  "Exit Price",
  "Gross P&L",
];

function parseNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const n = Number(String(value).replace(/[,+$%]/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function parseDasDateTime(value: string): number {
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  );
  if (!m) throw new Error(`Could not parse DAS datetime: ${value}`);
  const [, year, month, day, hour, minute, second] = m;
  const date = `${year}-${month}-${day}`;
  const time = `${hour.padStart(2, "0")}:${minute}:${second}`;
  return Math.round(zonedDateTimeToUtcMs(date, time, MARKET_TZ) / 1000);
}

function hashRow(parts: (string | number)[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex");
}

export function isDasTradeSummary(csv: string): boolean {
  const [headers] = parseCsvRows(csv);
  if (!headers) return false;
  return REQUIRED_HEADERS.every((header) => headers.includes(header));
}

export function parseDasTradeSummary(csv: string): ParsedDasTrade[] {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;
  if (!headers || !REQUIRED_HEADERS.every((header) => headers.includes(header))) {
    throw new Error("Could not find DAS trade-summary columns in the CSV.");
  }

  const col = (name: string) => headers.indexOf(name);
  const iOpen = col("Open Datetime");
  const iClose = col("Close Datetime");
  const iSymbol = col("Symbol");
  const iSide = col("Side");
  const iVolume = col("Volume");
  const iEntry = col("Entry Price");
  const iExit = col("Exit Price");
  const iGrossPnl = col("Gross P&L");

  const out: ParsedDasTrade[] = [];
  const occurrences = new Map<string, number>();

  dataRows.forEach((row) => {
    const symbol = (row[iSymbol] ?? "").trim().toUpperCase();
    const rawSide = (row[iSide] ?? "").trim().toUpperCase();
    // DAS trade-summary Volume is round-trip volume, so a buy 500 / sell 500
    // closed trade is exported as 1,000 shares.
    const roundTripVolume = Math.abs(Math.round(parseNumber(row[iVolume]) ?? 0));
    const quantity = Math.max(1, Math.round(roundTripVolume / 2));
    const avgEntryPrice = parseNumber(row[iEntry]);
    const reportedExitPrice = parseNumber(row[iExit]);
    const grossPnl = parseNumber(row[iGrossPnl]);
    const openValue = row[iOpen] ?? "";
    const closeValue = row[iClose] ?? "";
    if (
      !symbol ||
      roundTripVolume === 0 ||
      avgEntryPrice == null ||
      reportedExitPrice == null ||
      grossPnl == null ||
      !openValue ||
      !closeValue
    ) {
      return;
    }

    const side: "long" | "short" = rawSide === "S" || rawSide === "SHORT" ? "short" : "long";
    // DAS trade-summary exports do not always reconcile `Volume * (Exit - Entry)`
    // to the reported P&L. Use Gross P&L as the source of truth and synthesize
    // an effective close price so the app's execution-based math stays aligned.
    const avgExitPrice =
      side === "long"
        ? avgEntryPrice + grossPnl / quantity
        : avgEntryPrice - grossPnl / quantity;
    const entryAt = parseDasDateTime(openValue);
    const exitAt = parseDasDateTime(closeValue);
    const baseKey = [
      "das",
      symbol,
      side,
      quantity,
      avgEntryPrice,
      reportedExitPrice,
      grossPnl,
      entryAt,
      exitAt,
    ].join("|");
    const n = occurrences.get(baseKey) ?? 0;
    occurrences.set(baseKey, n + 1);
    const sourceTradeHash = hashRow([baseKey, n]);
    const openHash = hashRow([sourceTradeHash, "open"]);
    const closeHash = hashRow([sourceTradeHash, "close"]);
    const openSide = side === "long" ? "buy" : "sell";
    const closeSide = side === "long" ? "sell" : "buy";

    out.push({
      symbol,
      side,
      quantity,
      avgEntryPrice,
      entryAt,
      avgExitPrice,
      exitAt,
      fees: 0,
      status: "closed",
      sourceTradeHash,
      executions: [
        {
          symbol,
          side: openSide,
          quantity,
          price: avgEntryPrice,
          executedAt: entryAt,
          posEffect: "TO OPEN",
          fees: 0,
          sourceRowHash: openHash,
        },
        {
          symbol,
          side: closeSide,
          quantity,
          price: avgExitPrice,
          executedAt: exitAt,
          posEffect: "TO CLOSE",
          fees: 0,
          sourceRowHash: closeHash,
        },
      ],
    });
  });

  out.sort((a, b) => a.entryAt - b.entryAt || a.symbol.localeCompare(b.symbol));
  return out;
}
