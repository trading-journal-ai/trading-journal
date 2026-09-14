import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { etDayRange } from "@/lib/time";
import { tradeDayActivities } from "@/lib/tradeActivity";
import type { CalendarTradeRow } from "@/lib/monthCalendar";

const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });

/** One day's light ledger. Full execution history preserves swing-trade cost basis. */
export async function loadCalendarDayTrades(accountId: number, date: string): Promise<CalendarTradeRow[]> {
  const { start, end } = etDayRange(date);
  const activityRows = await db.select({ tradeId: schema.executions.tradeId }).from(schema.executions)
    .where(and(eq(schema.executions.accountId, accountId), gte(schema.executions.executedAt, start), lte(schema.executions.executedAt, end)));
  const ids = [...new Set(activityRows.flatMap((row) => row.tradeId == null ? [] : [row.tradeId]))];
  if (!ids.length) return [];
  const trades = await db.select({ id: schema.trades.id, symbol: schema.trades.symbol, side: schema.trades.side, entryAt: schema.trades.entryAt, exitAt: schema.trades.exitAt })
    .from(schema.trades).where(and(eq(schema.trades.accountId, accountId), inArray(schema.trades.id, ids)));
  const scopedIds = trades.map((trade) => trade.id);
  if (!scopedIds.length) return [];
  const [executions, tags] = await Promise.all([
    db.select({ tradeId: schema.executions.tradeId, executedAt: schema.executions.executedAt, side: schema.executions.side, quantity: schema.executions.quantity, price: schema.executions.price, fees: schema.executions.fees })
      .from(schema.executions).where(and(eq(schema.executions.accountId, accountId), inArray(schema.executions.tradeId, scopedIds)))
      .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id)),
    db.select({ tradeId: schema.tradeTags.tradeId, name: schema.tags.name }).from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId))
      .where(inArray(schema.tradeTags.tradeId, scopedIds)).orderBy(asc(schema.tags.name)),
  ]);
  const executionsByTrade = new Map<number, typeof executions>();
  for (const execution of executions) {
    if (execution.tradeId == null) continue;
    const group = executionsByTrade.get(execution.tradeId) ?? [];
    group.push(execution); executionsByTrade.set(execution.tradeId, group);
  }
  const tagsByTrade = new Map<number, string[]>();
  for (const tag of tags) {
    const group = tagsByTrade.get(tag.tradeId) ?? [];
    group.push(tag.name); tagsByTrade.set(tag.tradeId, group);
  }
  return trades.flatMap((trade) => {
    const activity = tradeDayActivities(trade, executionsByTrade.get(trade.id) ?? []).find((day) => day.date === date);
    return activity ? [{ id: trade.id, symbol: trade.symbol, pnl: activity.realizedPnl,
      time: timeFormatter.format(new Date(activity.firstExecutionAt * 1000)), tags: tagsByTrade.get(trade.id) ?? [], timestamp: activity.firstExecutionAt }] : [];
  }).sort((a, b) => a.timestamp - b.timestamp || a.id - b.id)
    .map(({ id, symbol, pnl, time, tags: context }) => ({ id, symbol, pnl, time, tags: context }));
}
