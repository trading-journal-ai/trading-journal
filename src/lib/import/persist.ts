/**
 * Persist broker CSV imports. Fill-level imports are matched into trades;
 * grouped trade-summary imports create one trade per source row and attach a
 * synthetic open/close execution pair.
 */
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { etDateString } from "@/lib/time";
import {
  normalizeBrokerCsv,
  type NormalizedImport,
  type NormalizedTrade,
  type SourceConfidence,
} from "./normalize";
import type { ParsedExecution } from "./tos";

export type ImportSummary = {
  batchId: number;
  source: "tos_csv" | "das_csv";
  sourceConfidence: SourceConfidence;
  parsed: number;
  inserted: number;
  duplicates: number;
  trades: number;
  normalizedTrades: number;
  openTrades: number;
  parsedFrom: string | null;
  parsedTo: string | null;
  insertedFrom: string | null;
  insertedTo: string | null;
  warnings: string[];
};

const INSERT_CHUNK_SIZE = 100;

function dateRange(executions: { executedAt: number }[]): { from: string | null; to: string | null } {
  if (executions.length === 0) return { from: null, to: null };
  const dates = executions.map((e) => etDateString(e.executedAt)).sort();
  return { from: dates[0], to: dates.at(-1) ?? dates[0] };
}

async function insertExecutions(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  parsed: ParsedExecution[],
  accountId: number,
  batchId: number,
) {
  const insertedRows: { id: number; hash: string | null }[] = [];
  for (let i = 0; i < parsed.length; i += INSERT_CHUNK_SIZE) {
    const chunk = parsed.slice(i, i + INSERT_CHUNK_SIZE);
    const rows = await tx
      .insert(schema.executions)
      .values(
        chunk.map((e) => ({
          symbol: e.symbol,
          accountId,
          side: e.side,
          quantity: e.quantity,
          price: e.price,
          executedAt: e.executedAt,
          fees: e.fees,
          posEffect: e.posEffect,
          brokerOrderKey: e.brokerOrderKey,
          importBatchId: batchId,
          sourceRowHash: e.sourceRowHash,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.executions.id, hash: schema.executions.sourceRowHash })
      .all();
    insertedRows.push(...rows);
  }

  return insertedRows;
}

async function insertNormalizedTrade(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  normalizedTrade: NormalizedTrade,
  accountId: number,
  execIds: number[],
) {
  const trade = await tx
    .insert(schema.trades)
    .values({
      symbol: normalizedTrade.symbol,
      accountId,
      side: normalizedTrade.side,
      quantity: normalizedTrade.quantity,
      avgEntryPrice: normalizedTrade.avgEntryPrice,
      entryAt: normalizedTrade.entryAt,
      avgExitPrice: normalizedTrade.avgExitPrice,
      exitAt: normalizedTrade.exitAt,
      fees: normalizedTrade.fees,
      status: normalizedTrade.status,
    })
    .returning({ id: schema.trades.id })
    .get();

  if (execIds.length > 0) {
    await tx
      .update(schema.executions)
      .set({ tradeId: trade.id })
      .where(inArray(schema.executions.id, execIds))
      .run();
  }
}

async function importNormalized(
  normalized: NormalizedImport,
  fileName: string,
  accountId: number,
): Promise<ImportSummary> {
  if (normalized.executions.length === 0) {
    throw new Error("No importable executions found in the CSV.");
  }
  const parsedRange = dateRange(normalized.executions);

  return db.transaction(async (tx) => {
    const batch = await tx
      .insert(schema.importBatches)
      .values({
        kind: "executions",
        accountId,
        source: normalized.source,
        fileName,
        rowCount: 0,
      })
      .returning({ id: schema.importBatches.id })
      .get();

    const insertedRows = await insertExecutions(tx, normalized.executions, accountId, batch.id);
    const idByHash = new Map(insertedRows.map((r) => [r.hash, r.id]));
    const newExecutions = normalized.executions.filter((e) => idByHash.has(e.sourceRowHash));
    const insertedRange = dateRange(newExecutions);
    let trades = 0;
    let skippedPartialTrades = 0;

    for (const normalizedTrade of normalized.trades) {
      const execIds = normalizedTrade.executionHashes
        .map((h) => idByHash.get(h))
        .filter((id): id is number => id != null);
      if (execIds.length !== normalizedTrade.executionHashes.length) {
        if (execIds.length > 0) skippedPartialTrades += 1;
        continue;
      }
      await insertNormalizedTrade(tx, normalizedTrade, accountId, execIds);
      trades += 1;
    }

    await tx
      .update(schema.importBatches)
      .set({ rowCount: insertedRows.length })
      .where(inArray(schema.importBatches.id, [batch.id]))
      .run();

    return {
      batchId: batch.id,
      source: normalized.source,
      sourceConfidence: normalized.sourceConfidence,
      parsed: normalized.executions.length,
      inserted: insertedRows.length,
      duplicates: normalized.executions.length - insertedRows.length,
      trades,
      normalizedTrades: normalized.trades.length,
      openTrades: normalized.trades.filter((trade) => trade.status === "open").length,
      parsedFrom: parsedRange.from,
      parsedTo: parsedRange.to,
      insertedFrom: insertedRange.from,
      insertedTo: insertedRange.to,
      warnings: [
        ...normalized.warnings,
        ...(skippedPartialTrades > 0
          ? [`${skippedPartialTrades} normalized trades were skipped because only part of their executions were new.`]
          : []),
      ],
    };
  });
}

export async function importTosCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  const normalized = normalizeBrokerCsv(csv);
  if (normalized.source !== "tos_csv") {
    throw new Error("Expected a ThinkorSwim account statement CSV.");
  }
  return importNormalized(normalized, fileName, accountId);
}

export async function importDasCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  const normalized = normalizeBrokerCsv(csv);
  if (normalized.source !== "das_csv") {
    throw new Error("Expected a DAS/TraderVue trade-summary CSV.");
  }
  return importNormalized(normalized, fileName, accountId);
}

export async function importBrokerCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  return importNormalized(normalizeBrokerCsv(csv), fileName, accountId);
}
