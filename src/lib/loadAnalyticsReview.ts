import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assignAttempts, completedReviewTrade, type ReviewFill } from "@/lib/analyticsReview";
import { etDateString, etDayRange } from "@/lib/time";

function validIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** New completed-trade projection; the shared realized-activity loader stays intact. */
export async function loadAnalyticsReview(
  accountId: number,
  executionWindow?: { fromDate: string; toDate: string },
) {
  let scopedTradeIds: number[] | null = null;
  if (executionWindow) {
    if (!validIsoDate(executionWindow.fromDate) || !validIsoDate(executionWindow.toDate)
      || executionWindow.fromDate > executionWindow.toDate) {
      throw new RangeError("Invalid analytics review execution window");
    }
    const { start } = etDayRange(executionWindow.fromDate);
    const { end } = etDayRange(executionWindow.toDate);
    const activity = await db.select({
      tradeId: schema.executions.tradeId,
      executedAt: schema.executions.executedAt,
    }).from(schema.executions).where(and(
      eq(schema.executions.accountId, accountId),
      gte(schema.executions.executedAt, start),
      lte(schema.executions.executedAt, end),
    ));
    scopedTradeIds = [...new Set(activity.flatMap((row) => {
      const date = etDateString(row.executedAt);
      return row.tradeId != null && date >= executionWindow.fromDate && date <= executionWindow.toDate
        ? [row.tradeId]
        : [];
    }))];
    if (!scopedTradeIds.length) return { rows: [], excluded: 0, open: 0 };
  }
  const tradeWhere = scopedTradeIds
    ? and(eq(schema.trades.accountId, accountId), inArray(schema.trades.id, scopedTradeIds))
    : eq(schema.trades.accountId, accountId);
  const executionWhere = scopedTradeIds
    ? and(eq(schema.executions.accountId, accountId), inArray(schema.executions.tradeId, scopedTradeIds))
    : eq(schema.executions.accountId, accountId);
  const [trades, fills, details, tags] = await Promise.all([
    db.select().from(schema.trades).where(tradeWhere),
    db.select().from(schema.executions).where(executionWhere).orderBy(asc(schema.executions.executedAt), asc(schema.executions.id)),
    db.select({ id: schema.executionFees.executionId }).from(schema.executionFees)
      .innerJoin(schema.executions, eq(schema.executions.id, schema.executionFees.executionId)).where(executionWhere),
    db.select({ id: schema.tradeTags.tradeId, name: schema.tags.name }).from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId))
      .innerJoin(schema.trades, eq(schema.trades.id, schema.tradeTags.tradeId)).where(tradeWhere),
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
