/**
 * Persist broker CSV imports. Fill-level imports are matched into trades;
 * grouped trade-summary imports create one trade per source row and attach a
 * synthetic open/close execution pair.
 */
import { inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { etDateString } from "@/lib/time";
import { isDasTradeSummary, parseDasTradeSummary } from "./das";
import { matchTrades } from "./match";
import { parseTosStatement, type ParsedExecution } from "./tos";

export type ImportSummary = {
  batchId: number;
  source: "tos_csv" | "das_csv";
  parsed: number;
  inserted: number;
  duplicates: number;
  trades: number;
  parsedFrom: string | null;
  parsedTo: string | null;
  insertedFrom: string | null;
  insertedTo: string | null;
};

const INSERT_CHUNK_SIZE = 100;

function dateRange(executions: { executedAt: number }[]): { from: string | null; to: string | null } {
  if (executions.length === 0) return { from: null, to: null };
  const dates = executions.map((e) => etDateString(e.executedAt)).sort();
  return { from: dates[0], to: dates.at(-1) ?? dates[0] };
}

function isTosStatement(csv: string): boolean {
  return csv.replace(/^﻿/, "").split(/\r?\n/).some((line) => line.trim() === "Account Trade History");
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

export async function importTosCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  const parsed = parseTosStatement(csv);
  if (parsed.length === 0) {
    throw new Error("No executions found in the Account Trade History section.");
  }
  const parsedRange = dateRange(parsed);

  return db.transaction(async (tx) => {
    const batch = await tx
      .insert(schema.importBatches)
      .values({
        kind: "executions",
        accountId,
        source: "tos_csv",
        fileName,
        rowCount: 0,
      })
      .returning({ id: schema.importBatches.id })
      .get();

    const insertedRows = await insertExecutions(tx, parsed, accountId, batch.id);
    const idByHash = new Map(insertedRows.map((r) => [r.hash, r.id]));
    const newExecutions = parsed.filter((e) => idByHash.has(e.sourceRowHash));
    const insertedRange = dateRange(newExecutions);

    // Match only the newly-inserted fills into trades.
    const matched = matchTrades(newExecutions);
    for (const t of matched) {
      const trade = await tx
        .insert(schema.trades)
        .values({
          symbol: t.symbol,
          accountId,
          side: t.side,
          quantity: t.quantity,
          avgEntryPrice: t.avgEntryPrice,
          entryAt: t.entryAt,
          avgExitPrice: t.avgExitPrice,
          exitAt: t.exitAt,
          fees: t.fees,
          status: t.status,
        })
        .returning({ id: schema.trades.id })
        .get();

      const execIds = t.executionHashes
        .map((h) => idByHash.get(h))
        .filter((id): id is number => id != null);
      if (execIds.length > 0) {
        await tx
          .update(schema.executions)
          .set({ tradeId: trade.id })
          .where(inArray(schema.executions.id, execIds))
          .run();
      }
    }

    await tx
      .update(schema.importBatches)
      .set({ rowCount: insertedRows.length })
      .where(inArray(schema.importBatches.id, [batch.id]))
      .run();

    return {
      batchId: batch.id,
      source: "tos_csv",
      parsed: parsed.length,
      inserted: insertedRows.length,
      duplicates: parsed.length - insertedRows.length,
      trades: matched.length,
      parsedFrom: parsedRange.from,
      parsedTo: parsedRange.to,
      insertedFrom: insertedRange.from,
      insertedTo: insertedRange.to,
    };
  });
}

export async function importDasCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  const parsedTrades = parseDasTradeSummary(csv);
  if (parsedTrades.length === 0) {
    throw new Error("No DAS trade rows found in the CSV.");
  }
  const parsedExecutions = parsedTrades.flatMap((t) => t.executions);
  const parsedRange = dateRange(parsedExecutions);

  return db.transaction(async (tx) => {
    const batch = await tx
      .insert(schema.importBatches)
      .values({
        kind: "executions",
        accountId,
        source: "das_csv",
        fileName,
        rowCount: 0,
      })
      .returning({ id: schema.importBatches.id })
      .get();

    const insertedRows = await insertExecutions(tx, parsedExecutions, accountId, batch.id);
    const idByHash = new Map(insertedRows.map((r) => [r.hash, r.id]));
    const newExecutions = parsedExecutions.filter((e) => idByHash.has(e.sourceRowHash));
    const insertedRange = dateRange(newExecutions);
    let trades = 0;

    for (const parsed of parsedTrades) {
      const execIds = parsed.executions
        .map((execution) => idByHash.get(execution.sourceRowHash))
        .filter((id): id is number => id != null);
      if (execIds.length !== parsed.executions.length) continue;

      const trade = await tx
        .insert(schema.trades)
        .values({
          symbol: parsed.symbol,
          accountId,
          side: parsed.side,
          quantity: parsed.quantity,
          avgEntryPrice: parsed.avgEntryPrice,
          entryAt: parsed.entryAt,
          avgExitPrice: parsed.avgExitPrice,
          exitAt: parsed.exitAt,
          fees: parsed.fees,
          status: parsed.status,
        })
        .returning({ id: schema.trades.id })
        .get();

      await tx
        .update(schema.executions)
        .set({ tradeId: trade.id })
        .where(inArray(schema.executions.id, execIds))
        .run();
      trades += 1;
    }

    await tx
      .update(schema.importBatches)
      .set({ rowCount: insertedRows.length })
      .where(inArray(schema.importBatches.id, [batch.id]))
      .run();

    return {
      batchId: batch.id,
      source: "das_csv",
      parsed: parsedExecutions.length,
      inserted: insertedRows.length,
      duplicates: parsedExecutions.length - insertedRows.length,
      trades,
      parsedFrom: parsedRange.from,
      parsedTo: parsedRange.to,
      insertedFrom: insertedRange.from,
      insertedTo: insertedRange.to,
    };
  });
}

export async function importBrokerCsv(csv: string, fileName: string, accountId: number): Promise<ImportSummary> {
  if (isDasTradeSummary(csv)) return importDasCsv(csv, fileName, accountId);
  if (isTosStatement(csv)) return importTosCsv(csv, fileName, accountId);
  throw new Error("Could not recognize this CSV. Supported formats: ThinkorSwim account statement or DAS trade summary.");
}
