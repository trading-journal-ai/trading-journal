import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assignAttempts, completedReviewTrade, type ReviewFill } from "@/lib/analyticsReview";

/** New completed-trade projection; the shared realized-activity loader stays intact. */
export async function loadAnalyticsReview(accountId: number) {
  const [trades, fills, details, tags] = await Promise.all([
    db.select().from(schema.trades).where(eq(schema.trades.accountId, accountId)),
    db.select().from(schema.executions).where(eq(schema.executions.accountId, accountId)).orderBy(asc(schema.executions.executedAt), asc(schema.executions.id)),
    db.select({ id: schema.executionFees.executionId }).from(schema.executionFees)
      .innerJoin(schema.executions, eq(schema.executions.id, schema.executionFees.executionId)).where(eq(schema.executions.accountId, accountId)),
    db.select({ id: schema.tradeTags.tradeId, name: schema.tags.name }).from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId))
      .innerJoin(schema.trades, eq(schema.trades.id, schema.tradeTags.tradeId)).where(eq(schema.trades.accountId, accountId)),
  ]);
  const reported = new Set(details.map(d => d.id));
  const byTrade = new Map<number, ReviewFill[]>();
  for (const fill of fills) {
    if (fill.tradeId == null) continue;
    const list = byTrade.get(fill.tradeId) ?? [];
    list.push({ id: fill.id, executedAt: fill.executedAt, side: fill.side, quantity: fill.quantity, price: fill.price,
      fees: fill.fees, posEffect: fill.posEffect, brokerOrderKey: fill.brokerOrderKey,
      feeReported: reported.has(fill.id) || fill.fees !== 0 });
    byTrade.set(fill.tradeId, list);
  }
  const tagsByTrade = new Map<number, string[]>();
  for (const tag of tags) tagsByTrade.set(tag.id, [...(tagsByTrade.get(tag.id) ?? []), tag.name]);
  const rows = trades.map(t => completedReviewTrade(t, byTrade.get(t.id) ?? [], tagsByTrade.get(t.id) ?? []));
  return { rows: assignAttempts(rows.filter((t): t is NonNullable<typeof t> => t != null)),
    excluded: trades.filter((t, i) => t.status === "closed" && rows[i] == null).length,
    open: trades.filter(t => t.status === "open").length };
}
