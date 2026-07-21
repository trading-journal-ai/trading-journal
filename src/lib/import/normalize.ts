import { MARKET_TZ, timeZoneParts } from "@/lib/time";
import { inspectBrokerCsv, type BrokerCsvInspection } from "./inspect";
import { isDasTradeSummary, parseDasTradeSummary } from "./das";
import { matchTrades } from "./match";
import { parseTosStatementWithMetadata, type ParsedExecution, type TosExecutionSource } from "./tos";

export type NormalizedSource = "tos_csv" | "das_csv";
export type SourceConfidence = "high" | "medium" | "low" | "statement_only";

export type NormalizedTrade = {
  source: NormalizedSource;
  sourceConfidence: SourceConfidence;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  entryAt: number;
  exitAt: number | null;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  grossPnl: number;
  fees: number;
  netPnl: number;
  status: "open" | "closed";
  executionCount: number;
  executionHashes: string[];
  tags: string[];
  notes: string | null;
  diagnostics: string[];
};

export type NormalizedImport = {
  source: NormalizedSource;
  sourceConfidence: SourceConfidence;
  inspection: BrokerCsvInspection;
  executions: ParsedExecution[];
  trades: NormalizedTrade[];
  warnings: string[];
};

export function normalizeBrokerCsv(csv: string): NormalizedImport {
  const inspection = inspectBrokerCsv(csv);

  if (isDasTradeSummary(csv)) {
    const parsedTrades = parseDasTradeSummary(csv);
    const executions = parsedTrades.flatMap((trade) => trade.executions);
    return {
      source: "das_csv",
      sourceConfidence: "medium",
      inspection,
      executions,
      trades: parsedTrades.map((trade) => {
        const grossPnl = grossPnlForTrade(trade.side, trade.quantity, trade.avgEntryPrice, trade.avgExitPrice);
        return {
          source: "das_csv",
          sourceConfidence: "medium",
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          entryAt: trade.entryAt,
          exitAt: trade.exitAt,
          avgEntryPrice: trade.avgEntryPrice,
          avgExitPrice: trade.avgExitPrice,
          grossPnl,
          fees: trade.fees,
          netPnl: grossPnl - trade.fees,
          status: trade.status,
          executionCount: trade.executions.length,
          executionHashes: trade.executions.map((execution) => execution.sourceRowHash),
          tags: [],
          notes: null,
          diagnostics: ["Trade-summary source; fill sequencing is synthetic."],
        };
      }),
      warnings: ["DAS/TraderVue trade-summary imports use synthetic open/close executions."],
    };
  }

  if (inspection.format === "tos_account_statement") {
    const parsedStatement = parseTosStatementWithMetadata(csv);
    const executions = parsedStatement.executions;
    if (executions.length === 0) {
      throw new Error("No executions found in Account Trade History or Cash Balance.");
    }
    const matched = matchTrades(executions);
    const sourceConfidence = parsedStatement.executionSource === "trade_history" ? "high" : "medium";
    const warnings = tosWarnings(inspection, parsedStatement);
    return {
      source: "tos_csv",
      sourceConfidence,
      inspection,
      executions,
      trades: matched.map((trade) => ({
        source: "tos_csv",
        sourceConfidence,
        symbol: trade.symbol,
        side: trade.side,
        quantity: trade.quantity,
        entryAt: trade.entryAt,
        exitAt: trade.exitAt,
        avgEntryPrice: trade.avgEntryPrice,
        avgExitPrice: trade.avgExitPrice,
        grossPnl: trade.pnl + trade.fees,
        fees: trade.fees,
        netPnl: trade.pnl,
        status: trade.status,
        executionCount: trade.executionHashes.length,
        executionHashes: trade.executionHashes,
        tags: [],
        notes: null,
        diagnostics: [],
      })),
      warnings,
    };
  }

  throw new Error("Could not recognize this CSV. Supported formats: ThinkorSwim account statement or DAS/TraderVue trade summary.");
}

export function normalizedTradeToSummaryRow(trade: NormalizedTrade): string[] {
  const basis = trade.avgEntryPrice * trade.quantity;
  const grossPct = basis === 0 ? null : (trade.grossPnl / basis) * 100;
  return [
    formatMarketDateTime(trade.entryAt),
    trade.exitAt == null ? "" : formatMarketDateTime(trade.exitAt),
    trade.symbol,
    trade.side === "long" ? "L" : "S",
    round(trade.quantity * 2, 0),
    round(trade.executionCount, 0),
    round(trade.avgEntryPrice),
    trade.avgExitPrice == null ? "" : round(trade.avgExitPrice),
    round(trade.grossPnl, 2),
    grossPct == null ? "" : round(grossPct, 2),
    "false",
    trade.notes ?? "",
    trade.tags.join(";"),
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
}

function tosWarnings(
  inspection: BrokerCsvInspection,
  statement: ReturnType<typeof parseTosStatementWithMetadata>,
): string[] {
  const warnings: string[] = [];
  const executionSource: TosExecutionSource = statement.executionSource;
  const cash = inspection.tos.cashBalance;
  if (executionSource === "cash_balance") {
    const filter = inspection.tos.tradeHistory.filteredBy;
    warnings.push(
      filter
        ? `Imported the full Cash Balance ledger because Account Trade History is filtered by ${filter}.`
        : "Imported executions from Cash Balance because complete Account Trade History rows were unavailable.",
    );
    warnings.push(
      "Cash Balance does not provide position effect; TO OPEN and TO CLOSE were inferred from position changes.",
    );
  }
  if (
    executionSource === "trade_history" &&
    cash.tradeHistoryUnmatched &&
    cash.tradeHistoryUnmatched > 0
  ) {
    warnings.push(`${cash.tradeHistoryUnmatched} Account Trade History fills did not exactly match Cash Balance trade rows.`);
  }
  if (executionSource === "trade_history" && cash.cashUnmatched && cash.cashUnmatched > 0) {
    warnings.push(`${cash.cashUnmatched} Cash Balance trade rows did not exactly match Account Trade History fills.`);
  }
  if (executionSource === "trade_history" && inspection.tos.orderHistory.missingPrice > 0) {
    warnings.push(`${inspection.tos.orderHistory.missingPrice} filled order-history rows have missing order price; trade history fill prices were used.`);
  }
  if (inspection.tos.equities.positions > 0) {
    warnings.push(`${inspection.tos.equities.positions} open position row found in Equities.`);
  }
  for (const identifier of statement.securityIdentifiers) {
    warnings.push(
      identifier.symbol
        ? `Normalized CUSIP ${identifier.identifier} to ${identifier.symbol}${identifier.issuer ? ` (${identifier.issuer})` : ""}.`
        : `CUSIP ${identifier.identifier} could not be resolved to a ticker; executions were imported with the broker identifier and market candles may be unavailable.`,
    );
  }
  return warnings;
}

function grossPnlForTrade(
  side: "long" | "short",
  quantity: number,
  avgEntryPrice: number,
  avgExitPrice: number,
): number {
  return side === "long"
    ? (avgExitPrice - avgEntryPrice) * quantity
    : (avgEntryPrice - avgExitPrice) * quantity;
}

function formatMarketDateTime(epochSeconds: number): string {
  const parts = timeZoneParts(epochSeconds * 1000, MARKET_TZ);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function round(value: number, digits = 4): string {
  const factor = 10 ** digits;
  return String(Math.round(value * factor) / factor);
}
