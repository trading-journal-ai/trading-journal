export type FeeBreakdown = Record<string, number>;

export const FEE_EPSILON = 1e-8;

export function normalizeFeeType(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function addFeeAmount(
  breakdown: FeeBreakdown,
  rawType: string,
  rawAmount: number | null | undefined,
): void {
  const feeType = normalizeFeeType(rawType);
  if (rawAmount == null) return;
  const amount = Math.abs(rawAmount);
  if (!feeType || !Number.isFinite(amount)) return;
  breakdown[feeType] = (breakdown[feeType] ?? 0) + amount;
}

export function feeBreakdownEntries(
  breakdown: FeeBreakdown | null | undefined,
): Array<[feeType: string, amount: number]> {
  if (!breakdown) return [];
  return Object.entries(breakdown)
    .map(([feeType, amount]): [string, number] => [
      normalizeFeeType(feeType),
      Math.abs(amount),
    ])
    .filter(([feeType, amount]) => feeType && Number.isFinite(amount))
    .sort(([left], [right]) => left.localeCompare(right));
}

export function feeBreakdownTotal(
  breakdown: FeeBreakdown | null | undefined,
): number {
  return feeBreakdownEntries(breakdown).reduce((sum, [, amount]) => sum + amount, 0);
}

export function scaledFeeBreakdown(
  breakdown: FeeBreakdown | null | undefined,
  divisor: number,
): FeeBreakdown {
  if (!Number.isFinite(divisor) || divisor <= 0) return {};
  return Object.fromEntries(
    feeBreakdownEntries(breakdown).map(([feeType, amount]) => [feeType, amount / divisor]),
  );
}

/** Keep unitemized observed totals without inventing a broker fee category. */
export function executionFeeEntries(
  fees: number,
  breakdown: FeeBreakdown | null | undefined,
): Array<[string, number]> {
  const entries = feeBreakdownEntries(breakdown);
  return entries.length > 0 ? entries : fees > FEE_EPSILON ? [["REPORTED_TOTAL", fees]] : [];
}

/** Zero without a reported detail is unknown, not a confirmed fee-free fill. */
export function feeReportingStatus(fees: number, breakdown?: FeeBreakdown) {
  return executionFeeEntries(fees, breakdown).length > 0 ? "reported" : "unknown";
}
