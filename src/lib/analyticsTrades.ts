import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { grossPnl } from "@/lib/pnl";
import { tradeDayActivities, type TradeDayActivity } from "@/lib/tradeActivity";

export type AnalyticsTradeFilters = {
  range?: { from: string; to: string };
  symbol?: string;
  side?: "long" | "short";
  tag?: string;
};

export type ReportTrade = typeof schema.trades.$inferSelect & {
  pnl: number | null;
  gross: number | null;
  activities: TradeDayActivity[];
  activityAt: number | null;
};

export async function loadAnalyticsTrades(filters: AnalyticsTradeFilters, accountId: number): Promise<ReportTrade[]> {
  // Load the complete account history before slicing activity dates. Limiting
  // trades first silently drops sessions once an account grows beyond the cap.
  const [accountTrades, executions] = await Promise.all([
    db.select().from(schema.trades).where(eq(schema.trades.accountId, accountId)),
    db.select().from(schema.executions)
      .where(eq(schema.executions.accountId, accountId))
      .orderBy(asc(schema.executions.executedAt), asc(schema.executions.id)),
  ]);
  let rows = accountTrades;
  const range = filters.range;
  const executionsByTradeId = new Map<number, typeof executions>();
  for (const execution of executions) {
    if (execution.tradeId == null) continue;
    const group = executionsByTradeId.get(execution.tradeId) ?? [];
    group.push(execution);
    executionsByTradeId.set(execution.tradeId, group);
  }
  const activitiesByTradeId = new Map(rows.map((trade) => [
    trade.id,
    tradeDayActivities(trade, executionsByTradeId.get(trade.id) ?? []),
  ]));

  if (range) {
    rows = rows.filter((trade) =>
      (activitiesByTradeId.get(trade.id) ?? []).some(
        (activity) => activity.date >= range.from && activity.date <= range.to,
      )
    );
  }
  if (filters.symbol) rows = rows.filter((t) => t.symbol.toUpperCase().includes(filters.symbol!));
  if (filters.side) rows = rows.filter((t) => t.side === filters.side);

  if (filters.tag) {
    const taggedRows = await db
      .select({ tradeId: schema.tradeTags.tradeId, name: schema.tags.name })
      .from(schema.tradeTags)
      .innerJoin(schema.tags, eq(schema.tags.id, schema.tradeTags.tagId));
    const taggedTradeIds = new Set(taggedRows.filter((r) => r.name === filters.tag).map((r) => r.tradeId));
    rows = rows.filter((t) => taggedTradeIds.has(t.id));
  }

  return rows
    .map((trade) => {
      const activities = (activitiesByTradeId.get(trade.id) ?? []).filter(
        (activity) =>
          !range || (activity.date >= range.from && activity.date <= range.to),
      );
      const hasExitActivity = activities.some(
        (activity) =>
          activity.kind === "closed"
          || activity.kind === "opened_closed"
          || activity.realizedPnl !== 0,
      );
      // All-time and bounded reports share Calendar/Journal's execution-based
      // realized P&L, including partial exits from positions still open.
      const pnl = hasExitActivity
        ? activities.reduce((sum, activity) => sum + activity.realizedPnl, 0)
        : null;
      return {
        ...trade,
        activities,
        activityAt: activities[0]?.firstExecutionAt ?? trade.entryAt,
        pnl,
        gross: grossPnl(trade),
      };
    })
    .sort((a, b) => (a.activityAt ?? 0) - (b.activityAt ?? 0));
}

export function buildDailyPnl(trades: ReportTrade[]) {
  const byDate = new Map<string, number>();
  for (const trade of trades) {
    for (const activity of trade.activities) {
      byDate.set(
        activity.date,
        (byDate.get(activity.date) ?? 0) + activity.realizedPnl,
      );
    }
  }

  let cumulative = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => {
      cumulative += pnl;
      return { date, pnl, cumulative };
    });
}
