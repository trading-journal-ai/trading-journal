import { shareSplitMultiplierBetween } from "@/lib/import/corporateActions";
import { etDateString } from "@/lib/time";

export type TradeActivityExecution = {
  executedAt: number;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fees: number;
};

export type TradeActivityTrade = {
  symbol: string;
  side: "long" | "short";
  entryAt: number | null;
  exitAt: number | null;
};

export type TradeActivityKind = "opened" | "adjusted" | "closed" | "opened_closed";

export type TradeDayActivity = {
  date: string;
  kind: TradeActivityKind;
  firstExecutionAt: number;
  lastExecutionAt: number;
  executionCount: number;
  realizedPnl: number;
};

export function tradeDayActivities(
  trade: TradeActivityTrade,
  executions: TradeActivityExecution[],
): TradeDayActivity[] {
  const ordered = [...executions].sort(
    (left, right) => left.executedAt - right.executedAt,
  );
  const byDate = new Map<string, TradeDayActivity>();
  const entryDate = trade.entryAt == null ? null : etDateString(trade.entryAt);
  const exitDate = trade.exitAt == null ? null : etDateString(trade.exitAt);
  const openingSide = trade.side === "long" ? "buy" : "sell";
  let position = 0;
  let entryValuePerShare = 0;
  let previousExecutionAt: number | null = null;

  for (const execution of ordered) {
    if (previousExecutionAt != null && position > 0) {
      const multiplier = shareSplitMultiplierBetween(
        trade.symbol,
        previousExecutionAt,
        execution.executedAt,
      );
      if (multiplier !== 1) {
        position *= multiplier;
        entryValuePerShare /= multiplier;
      }
    }

    let realizedPnl = 0;
    if (execution.side === openingSide) {
      const feePerShare = execution.quantity === 0
        ? 0
        : execution.fees / execution.quantity;
      const executionEntryValue = trade.side === "long"
        ? execution.price + feePerShare
        : execution.price - feePerShare;
      const nextPosition = position + execution.quantity;
      entryValuePerShare = nextPosition === 0
        ? 0
        : (
            entryValuePerShare * position
            + executionEntryValue * execution.quantity
          ) / nextPosition;
      position = nextPosition;
    } else {
      const closedQuantity = Math.min(position, execution.quantity);
      const allocatedFee = execution.quantity === 0
        ? 0
        : execution.fees * (closedQuantity / execution.quantity);
      realizedPnl = trade.side === "long"
        ? (execution.price - entryValuePerShare) * closedQuantity - allocatedFee
        : (entryValuePerShare - execution.price) * closedQuantity - allocatedFee;
      position -= closedQuantity;
      if (position === 0) entryValuePerShare = 0;
    }

    const date = etDateString(execution.executedAt);
    const current = byDate.get(date) ?? {
      date,
      kind: "adjusted" as const,
      firstExecutionAt: execution.executedAt,
      lastExecutionAt: execution.executedAt,
      executionCount: 0,
      realizedPnl: 0,
    };
    current.firstExecutionAt = Math.min(current.firstExecutionAt, execution.executedAt);
    current.lastExecutionAt = Math.max(current.lastExecutionAt, execution.executedAt);
    current.executionCount += 1;
    current.realizedPnl += realizedPnl;
    byDate.set(date, current);
    previousExecutionAt = execution.executedAt;
  }

  return [...byDate.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((activity) => ({
      ...activity,
      kind:
        activity.date === entryDate && activity.date === exitDate
          ? "opened_closed"
          : activity.date === entryDate
            ? "opened"
            : activity.date === exitDate
              ? "closed"
              : "adjusted",
    }));
}

export function heldCalendarDays(entryAt: number | null, exitAt: number | null): number | null {
  if (entryAt == null || exitAt == null || exitAt < entryAt) return null;
  const entry = Date.parse(`${etDateString(entryAt)}T12:00:00Z`);
  const exit = Date.parse(`${etDateString(exitAt)}T12:00:00Z`);
  return Math.round((exit - entry) / 86_400_000);
}
