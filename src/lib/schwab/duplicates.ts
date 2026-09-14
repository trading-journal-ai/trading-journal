import type { ParsedExecution } from "@/lib/import/tos";

export type ComparableExecution = Pick<
  ParsedExecution,
  "symbol" | "side" | "quantity" | "price" | "executedAt"
>;

function stableNumber(value: number) {
  return Number(value.toFixed(8)).toString();
}

export function executionComparisonKey(execution: ComparableExecution) {
  return [
    execution.symbol.trim().toUpperCase(),
    execution.executedAt,
    execution.side,
    stableNumber(execution.quantity),
    stableNumber(execution.price),
  ].join("|");
}

export function compareExecutions<
  T extends ParsedExecution,
  E extends ComparableExecution,
>(
  incoming: T[],
  existing: E[],
) {
  const existingByKey = new Map<string, E[]>();
  for (const execution of existing) {
    const key = executionComparisonKey(execution);
    existingByKey.set(key, [...(existingByKey.get(key) ?? []), execution]);
  }

  const newExecutions: T[] = [];
  const duplicateExecutionRows: T[] = [];
  const duplicateMatches: Array<{
    incoming: T;
    existing: E;
  }> = [];
  let duplicateExecutions = 0;
  for (const execution of incoming) {
    const key = executionComparisonKey(execution);
    const available = existingByKey.get(key);
    const matched = available?.shift();
    if (matched) {
      duplicateExecutions += 1;
      duplicateExecutionRows.push(execution);
      duplicateMatches.push({ incoming: execution, existing: matched });
    } else {
      newExecutions.push(execution);
    }
  }

  return {
    newExecutions,
    duplicateExecutions,
    duplicateExecutionRows,
    duplicateMatches,
  };
}
