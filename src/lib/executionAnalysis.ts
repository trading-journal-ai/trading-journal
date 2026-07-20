export type TradeSide = "long" | "short";
export type ExecutionSide = "buy" | "sell";
export type ExecutionLifecycle = "open" | "increase" | "reduce" | "close";
export type ExecutionGrouping = "broker_ref" | "timestamp" | "single";

export type TradeExecutionInput = {
  id?: number;
  executedAt: number;
  price: number;
  quantity: number;
  side: ExecutionSide;
  posEffect?: string | null;
  brokerOrderKey?: string | null;
};

export type AnalyzedTradeExecution = TradeExecutionInput & {
  fillIds: number[];
  fillCount: number;
  grouping: ExecutionGrouping;
  lifecycle: ExecutionLifecycle;
  positionAfter: number;
  averageEntryBefore: number | null;
  realizedPnl: number | null;
  addedAgainstPosition: boolean;
  adverseAddPercent: number | null;
  secondsAfterOpen: number;
};

export type TradeExecutionAnalysis = {
  executions: AnalyzedTradeExecution[];
  fillCount: number;
  executionCount: number;
  entryExecutionCount: number;
  exitExecutionCount: number;
  partialExitCount: number;
  maxPosition: number;
  addedAgainstPosition: boolean;
  averagedDown: boolean;
  adverseAddCount: number;
  maxAdverseAddPercent: number | null;
};

export type CoachTradeExecutionFacts = {
  fillCount: number;
  executionCount: number;
  entryExecutionCount: number;
  exitExecutionCount: number;
  partialExitCount: number;
  maxPosition: number;
  addedAgainstPosition: boolean;
  averagedDown: boolean;
  adverseAddCount: number;
  maxAdverseAddPercent: number | null;
  adverseAdds: Array<{
    side: ExecutionSide;
    quantity: number;
    price: number;
    executedAt: number;
    secondsAfterOpen: number;
    averageEntryBefore: number;
    adverseAddPercent: number;
  }>;
};

function validExecutions(executions: TradeExecutionInput[]): TradeExecutionInput[] {
  return executions
    .filter((execution) => (
      Number.isFinite(execution.executedAt)
      && Number.isFinite(execution.price)
      && Number.isFinite(execution.quantity)
      && execution.quantity !== 0
    ))
    .map((execution) => ({ ...execution, quantity: Math.abs(execution.quantity) }))
    .sort((left, right) => left.executedAt - right.executedAt || (left.id ?? 0) - (right.id ?? 0));
}

type GroupedTradeExecution = TradeExecutionInput & {
  fillIds: number[];
  fillCount: number;
  grouping: ExecutionGrouping;
};

/**
 * Collapse raw broker fills into review-level order actions without discarding
 * fill provenance. A broker reference is authoritative. The exact-timestamp
 * fallback exists for older TOS imports that predate broker-order persistence.
 */
export function groupTradeExecutions(
  inputExecutions: TradeExecutionInput[],
): GroupedTradeExecution[] {
  const executions = validExecutions(inputExecutions);
  const groups = new Map<string, GroupedTradeExecution & { notional: number }>();

  executions.forEach((execution) => {
    const posEffect = execution.posEffect?.trim() || null;
    const brokerOrderKey = execution.brokerOrderKey?.trim() || null;
    const grouping: ExecutionGrouping = brokerOrderKey
      ? "broker_ref"
      : "timestamp";
    const groupingKey = brokerOrderKey
      ? `ref|${brokerOrderKey}|${execution.side}|${posEffect ?? ""}`
      : `time|${execution.executedAt}|${execution.side}|${posEffect ?? ""}`;
    const existing = groups.get(groupingKey);

    if (existing) {
      existing.quantity += execution.quantity;
      existing.notional += execution.price * execution.quantity;
      existing.price = existing.notional / existing.quantity;
      existing.executedAt = Math.min(existing.executedAt, execution.executedAt);
      existing.fillCount += 1;
      if (execution.id != null) existing.fillIds.push(execution.id);
      return;
    }

    groups.set(groupingKey, {
      ...execution,
      id: execution.id,
      posEffect,
      brokerOrderKey,
      fillIds: execution.id == null ? [] : [execution.id],
      fillCount: 1,
      grouping,
      notional: execution.price * execution.quantity,
    });

  });

  return [...groups.values()]
    .map((execution) => {
      const { notional, ...groupedExecution } = execution;
      void notional;
      return {
        ...groupedExecution,
        grouping: groupedExecution.fillCount === 1
          ? "single" as const
          : groupedExecution.grouping,
      };
    })
    .sort((left, right) => (
      left.executedAt - right.executedAt || (left.id ?? 0) - (right.id ?? 0)
    ));
}

/**
 * Derive the lifecycle and management facts for a single flat-to-flat trade.
 *
 * "Averaged down" is intentionally strict: a long position must add shares at
 * a price below the running average entry immediately before that execution.
 * The generic `addedAgainstPosition` flag applies the mirrored rule to shorts.
 */
export function analyzeTradeExecutions(
  tradeSide: TradeSide,
  inputExecutions: TradeExecutionInput[],
): TradeExecutionAnalysis {
  const fillCount = validExecutions(inputExecutions).length;
  const executions = groupTradeExecutions(inputExecutions);
  const openingSide: ExecutionSide = tradeSide === "long" ? "buy" : "sell";
  const openedAt = executions.find((execution) => execution.side === openingSide)?.executedAt
    ?? executions[0]?.executedAt
    ?? 0;
  let position = 0;
  let positionCost = 0;
  let maxPosition = 0;
  let entryExecutionCount = 0;
  let exitExecutionCount = 0;
  let partialExitCount = 0;
  let adverseAddCount = 0;
  let maxAdverseAddPercent: number | null = null;

  const analyzedExecutions = executions.map<AnalyzedTradeExecution>((execution) => {
    const isOpeningSide = execution.side === openingSide;
    const averageEntryBefore = position > 0 ? positionCost / position : null;
    let lifecycle: ExecutionLifecycle;
    let realizedPnl: number | null = null;
    let addedAgainstPosition = false;
    let adverseAddPercent: number | null = null;

    if (isOpeningSide) {
      lifecycle = position === 0 ? "open" : "increase";
      entryExecutionCount += 1;

      if (lifecycle === "increase" && averageEntryBefore != null && averageEntryBefore > 0) {
        addedAgainstPosition = tradeSide === "long"
          ? execution.price < averageEntryBefore
          : execution.price > averageEntryBefore;
        if (addedAgainstPosition) {
          adverseAddPercent = Math.abs(execution.price - averageEntryBefore) / averageEntryBefore;
          adverseAddCount += 1;
          maxAdverseAddPercent = Math.max(maxAdverseAddPercent ?? 0, adverseAddPercent);
        }
      }

      position += execution.quantity;
      positionCost += execution.price * execution.quantity;
      maxPosition = Math.max(maxPosition, position);
    } else {
      const closingQuantity = Math.min(position, execution.quantity);
      const positionAfter = Math.max(0, position - closingQuantity);
      lifecycle = position > 0 && positionAfter === 0 ? "close" : "reduce";
      exitExecutionCount += 1;
      if (lifecycle === "reduce") partialExitCount += 1;

      if (averageEntryBefore != null && closingQuantity > 0) {
        realizedPnl = tradeSide === "long"
          ? (execution.price - averageEntryBefore) * closingQuantity
          : (averageEntryBefore - execution.price) * closingQuantity;
        positionCost = Math.max(0, positionCost - averageEntryBefore * closingQuantity);
      }
      position = positionAfter;
      if (position === 0) positionCost = 0;
    }

    return {
      ...execution,
      lifecycle,
      positionAfter: position,
      averageEntryBefore,
      realizedPnl,
      addedAgainstPosition,
      adverseAddPercent,
      secondsAfterOpen: Math.max(0, execution.executedAt - openedAt),
    };
  });

  return {
    executions: analyzedExecutions,
    fillCount,
    executionCount: analyzedExecutions.length,
    entryExecutionCount,
    exitExecutionCount,
    partialExitCount,
    maxPosition,
    addedAgainstPosition: adverseAddCount > 0,
    averagedDown: tradeSide === "long" && adverseAddCount > 0,
    adverseAddCount,
    maxAdverseAddPercent,
  };
}

/** Compact deterministic facts suitable for the Coach payload. */
export function coachTradeExecutionFacts(
  analysis: TradeExecutionAnalysis,
): CoachTradeExecutionFacts {
  return {
    fillCount: analysis.fillCount,
    executionCount: analysis.executionCount,
    entryExecutionCount: analysis.entryExecutionCount,
    exitExecutionCount: analysis.exitExecutionCount,
    partialExitCount: analysis.partialExitCount,
    maxPosition: analysis.maxPosition,
    addedAgainstPosition: analysis.addedAgainstPosition,
    averagedDown: analysis.averagedDown,
    adverseAddCount: analysis.adverseAddCount,
    maxAdverseAddPercent: analysis.maxAdverseAddPercent,
    adverseAdds: analysis.executions.flatMap((execution) => (
      execution.addedAgainstPosition
        && execution.averageEntryBefore != null
        && execution.adverseAddPercent != null
        ? [{
            side: execution.side,
            quantity: execution.quantity,
            price: execution.price,
            executedAt: execution.executedAt,
            secondsAfterOpen: execution.secondsAfterOpen,
            averageEntryBefore: execution.averageEntryBefore,
            adverseAddPercent: execution.adverseAddPercent,
          }]
        : []
    )),
  };
}
