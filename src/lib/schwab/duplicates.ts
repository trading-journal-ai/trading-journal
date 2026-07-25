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

export function compareExecutions<T extends ParsedExecution>(
  incoming: T[],
  existing: ComparableExecution[],
) {
  const existingCounts = new Map<string, number>();
  for (const execution of existing) {
    const key = executionComparisonKey(execution);
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  const newExecutions: T[] = [];
  const duplicateExecutionRows: T[] = [];
  let duplicateExecutions = 0;
  for (const execution of incoming) {
    const key = executionComparisonKey(execution);
    const available = existingCounts.get(key) ?? 0;
    if (available > 0) {
      duplicateExecutions += 1;
      duplicateExecutionRows.push(execution);
      existingCounts.set(key, available - 1);
    } else {
      newExecutions.push(execution);
    }
  }

  return { newExecutions, duplicateExecutions, duplicateExecutionRows };
}
