import { and, asc, eq, gte, inArray, lte, max } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { ParsedExecution } from "@/lib/import/tos";
import { etDateString } from "@/lib/time";
import { compareExecutions } from "./duplicates";
import type { SchwabNormalizedExecution } from "./normalize";
import {
  classifyHistoricalTradeExecutions,
  planTradeReconciliation,
  type ReconciliationExecution,
} from "./reconcile";

const INSERT_CHUNK_SIZE = 100;

export type ExecutionPersistenceSummary = {
  batchId: number | null;
  parsed: number;
  inserted: number;
  duplicates: number;
  reviewExecutions: number;
  reviewSymbols: string[];
  reviewDates: string[];
  tradesCreated: number;
  tradesUpdated: number;
  insertedFrom: string | null;
  insertedTo: string | null;
  insertedDates: string[];
  duplicateDates: string[];
};

export type PersistableExecution = ParsedExecution & {
  brokerExecutionKey?: string | null;
};

type PersistExecutionLedgerInput = {
  accountId: number;
  from: string;
  to: string;
  executions: PersistableExecution[];
  source: "schwab_api" | "tos_csv";
  fileName: string;
  requireBrokerExecutionKeys?: boolean;
  symbolAliases?: Array<{ brokerSymbol: string; canonicalSymbol: string }>;
};

export class SchwabAppendSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchwabAppendSafetyError";
  }
}

function dateRange(executions: Array<{ executedAt: number }>) {
  if (executions.length === 0) return { from: null, to: null };
  const dates = executions.map((execution) => etDateString(execution.executedAt)).sort();
  return { from: dates[0], to: dates.at(-1) ?? dates[0] };
}

function executionDates(executions: Array<{ executedAt: number }>) {
  return [
    ...new Set(executions.map((execution) => etDateString(execution.executedAt))),
  ].sort();
}

function existingExecutionAsReconciliation(
  execution: typeof schema.executions.$inferSelect,
  newExecutionIds: Set<number>,
): ReconciliationExecution {
  return {
    id: execution.id,
    tradeId: execution.tradeId,
    isNew: newExecutionIds.has(execution.id),
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

function validateIncomingIdentities(
  executions: PersistableExecution[],
  requireBrokerExecutionKeys: boolean,
) {
  const brokerKeys = new Set<string>();
  const canonicalKeys = new Set<string>();
  for (const execution of executions) {
    const brokerExecutionKey = execution.brokerExecutionKey ?? null;
    if (
      (requireBrokerExecutionKeys && !brokerExecutionKey)
      || (brokerExecutionKey != null && brokerKeys.has(brokerExecutionKey))
      || !execution.sourceRowHash
      || canonicalKeys.has(execution.sourceRowHash)
    ) {
      throw new SchwabAppendSafetyError(
        "The import contains missing or repeated execution identities. No data was changed.",
      );
    }
    if (brokerExecutionKey != null) brokerKeys.add(brokerExecutionKey);
    canonicalKeys.add(execution.sourceRowHash);
  }
}

export async function persistSchwabExecutions(input: {
  accountId: number;
  from: string;
  to: string;
  executions: SchwabNormalizedExecution[];
}): Promise<ExecutionPersistenceSummary> {
  return persistExecutionLedger({
    ...input,
    source: "schwab_api",
    fileName: `Schwab ${input.from} to ${input.to}`,
    requireBrokerExecutionKeys: true,
  });
}

export async function persistExecutionLedger(
  input: PersistExecutionLedgerInput,
): Promise<ExecutionPersistenceSummary> {
  validateIncomingIdentities(
    input.executions,
    input.requireBrokerExecutionKeys ?? false,
  );
  if (input.executions.length === 0) {
    return {
      batchId: null,
      parsed: 0,
      inserted: 0,
      duplicates: 0,
      reviewExecutions: 0,
      reviewSymbols: [],
      reviewDates: [],
      tradesCreated: 0,
      tradesUpdated: 0,
      insertedFrom: null,
      insertedTo: null,
      insertedDates: [],
      duplicateDates: [],
    };
  }

  return db.transaction(async (tx) => {
    for (const alias of input.symbolAliases ?? []) {
      await tx
        .update(schema.executions)
        .set({ symbol: alias.canonicalSymbol })
        .where(and(
          eq(schema.executions.accountId, input.accountId),
          eq(schema.executions.symbol, alias.brokerSymbol),
        ))
        .run();
      await tx
        .update(schema.trades)
        .set({ symbol: alias.canonicalSymbol })
        .where(and(
          eq(schema.trades.accountId, input.accountId),
          eq(schema.trades.symbol, alias.brokerSymbol),
        ))
        .run();
    }

    const firstExecutionAt = Math.min(
      ...input.executions.map((execution) => execution.executedAt),
    );
    const lastExecutionAt = Math.max(
      ...input.executions.map((execution) => execution.executedAt),
    );
    const existingInRange = await tx
      .select()
      .from(schema.executions)
      .where(and(
        eq(schema.executions.accountId, input.accountId),
        gte(schema.executions.executedAt, firstExecutionAt),
        lte(schema.executions.executedAt, lastExecutionAt),
      ))
      .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id));

    const incomingBrokerKeys = new Set(
      input.executions
        .map((execution) => execution.brokerExecutionKey)
        .filter((key): key is string => key != null),
    );
    const duplicateBrokerKeys = new Set(
      existingInRange
        .map((execution) => execution.brokerExecutionKey)
        .filter(
          (key): key is string => key != null && incomingBrokerKeys.has(key),
        ),
    );
    const brokerDuplicateExecutions = input.executions.filter(
      (execution) =>
        execution.brokerExecutionKey != null
        && duplicateBrokerKeys.has(execution.brokerExecutionKey),
    );
    const withoutBrokerDuplicates = input.executions.filter(
      (execution) =>
        execution.brokerExecutionKey == null
        || !duplicateBrokerKeys.has(execution.brokerExecutionKey),
    );
    const comparableExisting = existingInRange.filter(
      (execution) =>
        execution.brokerExecutionKey == null
        || !duplicateBrokerKeys.has(execution.brokerExecutionKey),
    );
    const compared = compareExecutions(withoutBrokerDuplicates, comparableExisting);
    const newExecutions = compared.newExecutions;
    const duplicateExecutionRows = [
      ...brokerDuplicateExecutions,
      ...compared.duplicateExecutionRows,
    ];
    const duplicates =
      duplicateBrokerKeys.size + compared.duplicateExecutions;

    if (newExecutions.length === 0) {
      return {
        batchId: null,
        parsed: input.executions.length,
        inserted: 0,
        duplicates,
        reviewExecutions: 0,
        reviewSymbols: [],
        reviewDates: [],
        tradesCreated: 0,
        tradesUpdated: 0,
        insertedFrom: null,
        insertedTo: null,
        insertedDates: [],
        duplicateDates: executionDates(duplicateExecutionRows),
      };
    }

    const candidateSymbols = [
      ...new Set(newExecutions.map((execution) => execution.symbol)),
    ];
    const openTrades = await tx
      .select()
      .from(schema.trades)
      .where(and(
        eq(schema.trades.accountId, input.accountId),
        eq(schema.trades.status, "open"),
        inArray(schema.trades.symbol, candidateSymbols),
      ));
    const openTradeCountBySymbol = new Map<string, number>();
    for (const trade of openTrades) {
      openTradeCountBySymbol.set(
        trade.symbol,
        (openTradeCountBySymbol.get(trade.symbol) ?? 0) + 1,
      );
    }
    const ambiguousSymbol = [...openTradeCountBySymbol].find(([, count]) => count > 1);
    if (ambiguousSymbol) {
      throw new SchwabAppendSafetyError(
        `${ambiguousSymbol[0]} has multiple open trade records. The import was rolled back so existing journal relationships remain untouched.`,
      );
    }
    const openTradeBySymbol = new Map(openTrades.map((trade) => [trade.symbol, trade]));
    const latestExisting = await tx
      .select({
        symbol: schema.executions.symbol,
        executedAt: max(schema.executions.executedAt),
      })
      .from(schema.executions)
      .where(and(
        eq(schema.executions.accountId, input.accountId),
        inArray(schema.executions.symbol, candidateSymbols),
      ))
      .groupBy(schema.executions.symbol);
    const latestBySymbol = new Map(
      latestExisting.map((row) => [row.symbol, row.executedAt]),
    );
    const historicalNewExecutions = newExecutions.filter((execution) => {
      const openTrade = openTradeBySymbol.get(execution.symbol);
      if (
        openTrade?.entryAt != null
        && execution.executedAt >= openTrade.entryAt
      ) return false;
      const latest = latestBySymbol.get(execution.symbol);
      return latest != null && execution.executedAt <= latest;
    });
    const historicalClassification = classifyHistoricalTradeExecutions(
      historicalNewExecutions,
    );
    const historicalExecutionHashes = new Set(
      historicalClassification.safeExecutions.map((execution) =>
        execution.sourceRowHash
      ),
    );
    const reviewExecutionHashes = new Set(
      historicalClassification.reviewExecutions.map((execution) =>
        execution.sourceRowHash
      ),
    );
    const importableExecutions = newExecutions.filter((execution) =>
      !reviewExecutionHashes.has(execution.sourceRowHash)
    );
    const forwardExecutionHashes = new Set(
        importableExecutions
          .filter((execution) => !historicalExecutionHashes.has(execution.sourceRowHash))
        .map((execution) => execution.sourceRowHash),
    );
    const affectedSymbols = [
      ...new Set(importableExecutions.map((execution) => execution.symbol)),
    ];
    const forwardSymbols = [
      ...new Set(
        importableExecutions
          .filter((execution) => forwardExecutionHashes.has(execution.sourceRowHash))
          .map((execution) => execution.symbol),
      ),
    ];

    if (importableExecutions.length === 0) {
      return {
        batchId: null,
        parsed: input.executions.length,
        inserted: 0,
        duplicates,
        reviewExecutions: historicalClassification.reviewExecutions.length,
        reviewSymbols: historicalClassification.reviewSymbols,
        reviewDates: executionDates(historicalClassification.reviewExecutions),
        tradesCreated: 0,
        tradesUpdated: 0,
        insertedFrom: null,
        insertedTo: null,
        insertedDates: [],
        duplicateDates: executionDates(duplicateExecutionRows),
      };
    }

    const batch = await tx
      .insert(schema.importBatches)
      .values({
        kind: "executions",
        accountId: input.accountId,
        source: input.source,
        fileName: input.fileName,
        rowCount: 0,
      })
      .returning({ id: schema.importBatches.id })
      .get();

    const insertedRows: Array<{ id: number; hash: string | null }> = [];
    for (let index = 0; index < importableExecutions.length; index += INSERT_CHUNK_SIZE) {
      const chunk = importableExecutions.slice(index, index + INSERT_CHUNK_SIZE);
      const rows = await tx
        .insert(schema.executions)
        .values(chunk.map((execution) => ({
          symbol: execution.symbol,
          accountId: input.accountId,
          side: execution.side,
          quantity: execution.quantity,
          price: execution.price,
          executedAt: execution.executedAt,
          fees: execution.fees,
          posEffect: execution.posEffect,
          brokerOrderKey: execution.brokerOrderKey,
          brokerExecutionKey: execution.brokerExecutionKey ?? null,
          canonicalExecutionKey: execution.sourceRowHash,
          sourceRowHash: execution.sourceRowHash,
          importBatchId: batch.id,
        })))
        .onConflictDoNothing()
        .returning({
          id: schema.executions.id,
          hash: schema.executions.sourceRowHash,
        })
        .all();
      insertedRows.push(...rows);
    }
    if (insertedRows.length !== importableExecutions.length) {
      throw new SchwabAppendSafetyError(
        "Another import saved one of these executions first. Nothing from this attempt was saved; refresh the preview and retry.",
      );
    }

    const newExecutionIds = new Set(insertedRows.map((row) => row.id));
    const forwardOpenTrades = openTrades.filter((trade) => forwardSymbols.includes(trade.symbol));
    const openTradeIds = forwardOpenTrades.map((trade) => trade.id);
    const candidateExecutions = await tx
      .select()
      .from(schema.executions)
      .where(and(
        eq(schema.executions.accountId, input.accountId),
        inArray(schema.executions.symbol, affectedSymbols),
      ))
      .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id));
    const historicalReconciliationExecutions = candidateExecutions
      .filter(
        (execution) =>
          newExecutionIds.has(execution.id)
          && historicalExecutionHashes.has(execution.sourceRowHash ?? ""),
      )
      .map((execution) =>
        existingExecutionAsReconciliation(execution, newExecutionIds),
      );
    const forwardReconciliationExecutions = candidateExecutions
      .filter(
        (execution) =>
          (
            newExecutionIds.has(execution.id)
            && forwardExecutionHashes.has(execution.sourceRowHash ?? "")
          )
          || (execution.tradeId != null && openTradeIds.includes(execution.tradeId)),
      )
      .map((execution) =>
        existingExecutionAsReconciliation(execution, newExecutionIds),
      );
    const persistedHistoricalGroups = planTradeReconciliation(
      historicalReconciliationExecutions,
    );
    if (persistedHistoricalGroups.some((group) => group.trade.status !== "closed")) {
      throw new SchwabAppendSafetyError(
        "Historical trade reconstruction changed during persistence. The transaction was rolled back and no existing data was changed.",
      );
    }
    const groups = [
      ...persistedHistoricalGroups,
      ...planTradeReconciliation(forwardReconciliationExecutions),
    ];

    let tradesCreated = 0;
    let tradesUpdated = 0;
    for (const group of groups) {
      let tradeId = group.existingTradeId;
      const tradeValues = {
        symbol: group.trade.symbol,
        accountId: input.accountId,
        side: group.trade.side,
        quantity: group.trade.quantity,
        avgEntryPrice: group.trade.avgEntryPrice,
        entryAt: group.trade.entryAt,
        avgExitPrice: group.trade.avgExitPrice,
        exitAt: group.trade.exitAt,
        fees: group.trade.fees,
        status: group.trade.status,
      };

      if (tradeId == null) {
        const insertedTrade = await tx
          .insert(schema.trades)
          .values(tradeValues)
          .returning({ id: schema.trades.id })
          .get();
        tradeId = insertedTrade.id;
        tradesCreated += 1;
      } else {
        await tx
          .update(schema.trades)
          .set({ ...tradeValues, updatedAt: new Date() })
          .where(and(
            eq(schema.trades.id, tradeId),
            eq(schema.trades.accountId, input.accountId),
          ))
          .run();
        tradesUpdated += 1;
      }

      await tx
        .update(schema.executions)
        .set({ tradeId })
        .where(and(
          eq(schema.executions.accountId, input.accountId),
          inArray(schema.executions.id, group.newExecutionIds),
        ))
        .run();
    }

    await tx
      .update(schema.importBatches)
      .set({ rowCount: insertedRows.length })
      .where(eq(schema.importBatches.id, batch.id))
      .run();

    const insertedRange = dateRange(importableExecutions);
    return {
      batchId: batch.id,
      parsed: input.executions.length,
      inserted: insertedRows.length,
      duplicates,
      reviewExecutions: historicalClassification.reviewExecutions.length,
      reviewSymbols: historicalClassification.reviewSymbols,
      reviewDates: executionDates(historicalClassification.reviewExecutions),
      tradesCreated,
      tradesUpdated,
      insertedFrom: insertedRange.from,
      insertedTo: insertedRange.to,
      insertedDates: executionDates(importableExecutions),
      duplicateDates: executionDates(duplicateExecutionRows),
    };
  });
}
