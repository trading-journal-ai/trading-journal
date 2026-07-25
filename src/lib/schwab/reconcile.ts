import { matchTrades, type MatchedTrade } from "@/lib/import/match";
import type { ParsedExecution } from "@/lib/import/tos";

export type ReconciliationExecution = ParsedExecution & {
  id: number;
  tradeId: number | null;
  isNew: boolean;
};

export type TradeReconciliationGroup = {
  trade: MatchedTrade;
  existingTradeId: number | null;
  newExecutionIds: number[];
};

export type HistoricalExecutionClassification = {
  safeExecutions: ParsedExecution[];
  reviewExecutions: ParsedExecution[];
  reviewSymbols: string[];
};

export class TradeReconciliationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TradeReconciliationError";
  }
}

export function planTradeReconciliation(
  executions: ReconciliationExecution[],
): TradeReconciliationGroup[] {
  const byHash = new Map<string, ReconciliationExecution>();
  for (const execution of executions) {
    if (!execution.sourceRowHash || byHash.has(execution.sourceRowHash)) {
      throw new TradeReconciliationError(
        "Execution identities are missing or ambiguous; no changes were saved.",
      );
    }
    byHash.set(execution.sourceRowHash, execution);
  }

  const matched = matchTrades(executions);
  const groupCountByHash = new Map<string, number>();
  for (const trade of matched) {
    for (const hash of trade.executionHashes) {
      groupCountByHash.set(hash, (groupCountByHash.get(hash) ?? 0) + 1);
    }
  }

  for (const execution of executions) {
    if (execution.isNew && groupCountByHash.get(execution.sourceRowHash) !== 1) {
      throw new TradeReconciliationError(
        "A position-flip fill would need to belong to more than one trade. This import was stopped without changing data.",
      );
    }
  }

  const groups: TradeReconciliationGroup[] = [];
  for (const trade of matched) {
    const groupExecutions = trade.executionHashes.map((hash) => {
      const execution = byHash.get(hash);
      if (!execution) {
        throw new TradeReconciliationError(
          "Trade reconstruction referenced an unknown execution; no changes were saved.",
        );
      }
      return execution;
    });
    const newExecutions = groupExecutions.filter((execution) => execution.isNew);
    if (newExecutions.length === 0) continue;

    const existingExecutions = groupExecutions.filter((execution) => !execution.isNew);
    if (existingExecutions.some((execution) => execution.tradeId == null)) {
      throw new TradeReconciliationError(
        "An existing ungrouped execution would need repair. This append-only import was stopped without changing data.",
      );
    }
    const existingTradeIds = [
      ...new Set(
        existingExecutions
          .map((execution) => execution.tradeId)
          .filter((tradeId): tradeId is number => tradeId != null),
      ),
    ];
    if (existingTradeIds.length > 1) {
      throw new TradeReconciliationError(
        "New fills would merge multiple existing trades. This append-only import was stopped without changing data.",
      );
    }

    groups.push({
      trade,
      existingTradeId: existingTradeIds[0] ?? null,
      newExecutionIds: newExecutions.map((execution) => execution.id),
    });
  }

  const groupedNewIds = new Set(groups.flatMap((group) => group.newExecutionIds));
  const missingNew = executions.some(
    (execution) => execution.isNew && !groupedNewIds.has(execution.id),
  );
  if (missingNew) {
    throw new TradeReconciliationError(
      "At least one new execution could not be assigned to a trade. No changes were saved.",
    );
  }

  return groups;
}

export function planHistoricalTradeReconciliation(
  executions: ParsedExecution[],
): TradeReconciliationGroup[] {
  const classification = classifyHistoricalTradeExecutions(executions);
  if (classification.reviewExecutions.length > 0) {
    throw new TradeReconciliationError(
      `${classification.reviewSymbols.join(", ")} has incomplete historical fills that could alter an existing position. No existing trade data was changed; include the complete opening and closing fills for that trade.`,
    );
  }
  return planHistoricalGroups(classification.safeExecutions);
}

function planHistoricalGroups(
  executions: ParsedExecution[],
): TradeReconciliationGroup[] {
  return planTradeReconciliation(
    executions.map((execution, index) => ({
      ...execution,
      id: -(index + 1),
      tradeId: null,
      isNew: true,
    })),
  );
}

export function classifyHistoricalTradeExecutions(
  executions: ParsedExecution[],
): HistoricalExecutionClassification {
  const executionsBySymbol = new Map<string, ParsedExecution[]>();
  for (const execution of executions) {
    const symbolExecutions = executionsBySymbol.get(execution.symbol) ?? [];
    symbolExecutions.push(execution);
    executionsBySymbol.set(execution.symbol, symbolExecutions);
  }

  const safeHashes = new Set<string>();
  const reviewHashes = new Set<string>();
  const reviewSymbols = new Set<string>();

  for (const [symbol, symbolExecutions] of executionsBySymbol) {
    let groups: TradeReconciliationGroup[];
    try {
      groups = planHistoricalGroups(symbolExecutions);
    } catch {
      reviewSymbols.add(symbol);
      for (const execution of symbolExecutions) {
        reviewHashes.add(execution.sourceRowHash);
      }
      continue;
    }

    const byHash = new Map(
      symbolExecutions.map((execution) => [execution.sourceRowHash, execution]),
    );
    for (const group of groups) {
      const firstExecution = group.trade.executionHashes
        .map((hash) => byHash.get(hash))
        .filter((execution): execution is ParsedExecution => execution != null)
        .sort((left, right) => left.executedAt - right.executedAt)[0];
      const isSafe = group.trade.status === "closed"
        && firstExecution?.posEffect !== "TO CLOSE";
      for (const hash of group.trade.executionHashes) {
        if (isSafe) {
          safeHashes.add(hash);
        } else {
          reviewHashes.add(hash);
          reviewSymbols.add(symbol);
        }
      }
    }
  }

  return {
    safeExecutions: executions.filter((execution) =>
      safeHashes.has(execution.sourceRowHash)
    ),
    reviewExecutions: executions.filter((execution) =>
      reviewHashes.has(execution.sourceRowHash)
    ),
    reviewSymbols: [...reviewSymbols].sort(),
  };
}
