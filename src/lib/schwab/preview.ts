import "server-only";

import { and, eq, gte, inArray, lt, max } from "drizzle-orm";
import { getActiveAccount } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { matchTrades } from "@/lib/import/match";
import type { ParsedExecution } from "@/lib/import/tos";
import { etDateString } from "@/lib/time";
import { compareExecutions } from "./duplicates";
import { loadSchwabNormalizedHistory } from "./load";
import { classifyHistoricalTradeExecutions } from "./reconcile";
import type { SchwabImportPreview } from "./types";

export { SchwabAccountSelectionError } from "./load";

function existingExecutionAsParsed(
  execution: typeof schema.executions.$inferSelect,
): ParsedExecution {
  return {
    symbol: execution.symbol,
    side: execution.side,
    quantity: execution.quantity,
    price: execution.price,
    executedAt: execution.executedAt,
    posEffect: execution.posEffect,
    fees: execution.fees,
    brokerOrderKey: execution.brokerOrderKey,
    sourceRowHash: execution.sourceRowHash ?? `existing-${execution.id}`,
  };
}

export async function buildSchwabImportPreview(input: {
  accountSelection: string;
  from: string;
  to: string;
}): Promise<SchwabImportPreview> {
  const { range, accountOption, history, normalized } =
    await loadSchwabNormalizedHistory(input);
  const journalAccount = await getActiveAccount();

  const existingExecutions = await db
    .select()
    .from(schema.executions)
    .where(and(
      eq(schema.executions.accountId, journalAccount.id),
      gte(schema.executions.executedAt, range.startEpoch),
      lt(schema.executions.executedAt, range.endEpochExclusive),
    ));
  const compared = compareExecutions(
    normalized.executions,
    existingExecutions,
  );
  const candidateSymbols = [
    ...new Set(compared.newExecutions.map((execution) => execution.symbol)),
  ];
  const latestExisting = candidateSymbols.length > 0
    ? await db
        .select({
          symbol: schema.executions.symbol,
          executedAt: max(schema.executions.executedAt),
        })
        .from(schema.executions)
        .where(and(
          eq(schema.executions.accountId, journalAccount.id),
          inArray(schema.executions.symbol, candidateSymbols),
        ))
        .groupBy(schema.executions.symbol)
    : [];
  const latestBySymbol = new Map(
    latestExisting.map((row) => [row.symbol, row.executedAt]),
  );
  const historicalNewExecutions = compared.newExecutions.filter((execution) => {
    const latest = latestBySymbol.get(execution.symbol);
    return latest != null && execution.executedAt <= latest;
  });
  const historicalHashes = new Set(
    historicalNewExecutions.map((execution) => execution.sourceRowHash),
  );
  const historicalClassification = classifyHistoricalTradeExecutions(
    historicalNewExecutions,
  );
  const safeHistoricalHashes = new Set(
    historicalClassification.safeExecutions.map((execution) =>
      execution.sourceRowHash
    ),
  );
  const importableExecutions = compared.newExecutions.filter((execution) =>
    !historicalHashes.has(execution.sourceRowHash)
    || safeHistoricalHashes.has(execution.sourceRowHash)
  );
  const affectedSymbols = [
    ...new Set(importableExecutions.map((execution) => execution.symbol)),
  ];
  const affectedOpenTrades = affectedSymbols.length > 0
    ? await db
        .select()
        .from(schema.trades)
        .where(and(
          eq(schema.trades.accountId, journalAccount.id),
          eq(schema.trades.status, "open"),
          inArray(schema.trades.symbol, affectedSymbols),
        ))
    : [];
  const affectedOpenTradeExecutions = affectedOpenTrades.length > 0
    ? await db
        .select()
        .from(schema.executions)
        .where(inArray(
          schema.executions.tradeId,
          affectedOpenTrades.map((trade) => trade.id),
        ))
    : [];
  const projectedTradeGroups = matchTrades([
    ...affectedOpenTradeExecutions.map(existingExecutionAsParsed),
    ...importableExecutions,
  ]);
  const estimatedNewTrades = Math.max(
    0,
    projectedTradeGroups.length - affectedOpenTrades.length,
  );

  const warnings = [
    ...history.warnings,
    ...normalized.warnings,
    normalized.executions.length === 0
      ? "No equity executions were found inside the selected dates."
      : null,
    normalized.executions.length > 0
      && importableExecutions.length === 0
      && historicalClassification.reviewExecutions.length === 0
      ? "Every execution found is already represented in the active Journal account."
      : null,
    affectedOpenTrades.length > 0
      ? `${affectedOpenTrades.length} existing open ${affectedOpenTrades.length === 1 ? "trade may be" : "trades may be"} updated by a future confirmed import.`
      : null,
    historicalClassification.safeExecutions.length > 0
      ? `${historicalClassification.safeExecutions.length} missing historical ${historicalClassification.safeExecutions.length === 1 ? "execution is" : "executions are"} complete and can be added without changing existing trades.`
      : null,
    "Preview only: no executions, trades, batches, or journal notes were changed.",
  ].filter((warning): warning is string => warning != null);

  return {
    accountLabel: accountOption.label,
    journalAccountLabel: journalAccount.name,
    from: range.from,
    to: range.to,
    ordersRead: normalized.ordersRead,
    transactionsRead: normalized.transactionsRead,
    executionsFound: normalized.executions.length,
    newExecutions: importableExecutions.length,
    duplicateExecutions: compared.duplicateExecutions,
    reviewExecutions: historicalClassification.reviewExecutions.length,
    reviewSymbols: historicalClassification.reviewSymbols,
    reviewDates: [
      ...new Set(
        historicalClassification.reviewExecutions.map((execution) =>
          etDateString(execution.executedAt)
        ),
      ),
    ].sort(),
    newDates: [
      ...new Set(importableExecutions.map((execution) => etDateString(execution.executedAt))),
    ].sort(),
    duplicateDates: [
      ...new Set(
        compared.duplicateExecutionRows.map((execution) =>
          etDateString(execution.executedAt)
        ),
      ),
    ].sort(),
    estimatedNewTrades,
    existingTradesAffected: affectedOpenTrades.length,
    symbols: new Set(normalized.executions.map((execution) => execution.symbol)).size,
    excludedAssets: normalized.excludedAssets,
    warnings,
  };
}
