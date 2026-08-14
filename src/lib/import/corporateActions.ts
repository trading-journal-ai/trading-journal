import { etDateString } from "@/lib/time";

export type ShareSplit = {
  symbol: string;
  effectiveDate: string;
  ratio: number;
  source: string;
};

/**
 * Corporate actions are quantity changes, not executions. Keep this registry
 * small and source-backed until a broker/provider feed supplies them directly.
 */
export const KNOWN_SHARE_SPLITS: readonly ShareSplit[] = [
  {
    symbol: "NVDL",
    effectiveDate: "2026-06-26",
    ratio: 3,
    source: "SEC Form 497 filed 2026-06-12",
  },
];

export function shareSplitsBetween(
  symbol: string,
  previousExecutionAt: number,
  nextExecutionAt: number,
): ShareSplit[] {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const previousDate = etDateString(previousExecutionAt);
  const nextDate = etDateString(nextExecutionAt);
  return KNOWN_SHARE_SPLITS.filter(
    (split) =>
      split.symbol === normalizedSymbol
      && split.effectiveDate > previousDate
      && split.effectiveDate <= nextDate,
  ).sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate));
}

export function shareSplitMultiplierBetween(
  symbol: string,
  previousExecutionAt: number,
  nextExecutionAt: number,
): number {
  return shareSplitsBetween(symbol, previousExecutionAt, nextExecutionAt)
    .reduce((multiplier, split) => multiplier * split.ratio, 1);
}
