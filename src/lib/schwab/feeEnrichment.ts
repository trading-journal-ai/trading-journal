import {
  executionFeeEntries,
  feeBreakdownTotal,
  type FeeBreakdown,
} from "@/lib/import/fees";

export type FeeDetailSource = "schwab_api" | "tos_csv";

export type StoredFeeDetail = {
  feeType: string;
  amount: number;
  source: string;
};

export type FeeEnrichmentPlan = {
  totalFees: number;
  replaceDetails: boolean;
  details: Array<{ feeType: string; amount: number }>;
};

const FEE_EPSILON = 1e-8;

function sourcePriority(source: string): number {
  if (source === "schwab_api") return 2;
  if (source === "tos_csv") return 1;
  return 0;
}

function detailsDiffer(
  incoming: Array<{ feeType: string; amount: number }>,
  existing: StoredFeeDetail[],
): boolean {
  const current = [...existing]
    .map(({ feeType, amount }) => ({ feeType, amount }))
    .sort((left, right) => left.feeType.localeCompare(right.feeType));
  if (incoming.length !== current.length) return true;
  return incoming.some((detail, index) => (
    detail.feeType !== current[index]?.feeType
    || Math.abs(detail.amount - (current[index]?.amount ?? 0)) > FEE_EPSILON
  ));
}

/**
 * Prefer the broker's typed fee ledger over broad statement buckets. A zero-fee
 * response never erases a previously observed fee because Schwab transactions
 * can arrive after their order fills.
 */
export function planFeeEnrichment(input: {
  incomingFees: number;
  incomingBreakdown?: FeeBreakdown;
  incomingSource: FeeDetailSource;
  existingFees: number;
  existingDetails: StoredFeeDetail[];
}): FeeEnrichmentPlan | null {
  if (!Number.isFinite(input.incomingFees) || input.incomingFees < 0) return null;
  const details = executionFeeEntries(input.incomingFees, input.incomingBreakdown).map(
    ([feeType, amount]) => ({ feeType, amount }),
  );
  const breakdownTotal = feeBreakdownTotal(input.incomingBreakdown);
  const incomingTotal = input.incomingFees > FEE_EPSILON
    ? input.incomingFees
    : breakdownTotal;
  if (details.length === 0) return null;
  // A zero response can still be an incomplete transaction snapshot. Preserve
  // observed charges; zero observations only resolve previously unknown zeros.
  if (incomingTotal <= FEE_EPSILON && input.existingFees > FEE_EPSILON) return null;

  const incomingPriority = sourcePriority(input.incomingSource);
  const existingPriority = input.existingDetails.reduce(
    (highest, detail) => Math.max(highest, sourcePriority(detail.source)),
    0,
  );
  // Positive statement evidence can fill a previously reported zero even if
  // the earlier API snapshot carried only a zero commission entry.
  if (existingPriority > incomingPriority
    && !(input.existingFees <= FEE_EPSILON && incomingTotal > FEE_EPSILON)) return null;

  const replaceDetails = details.length > 0 && (
    input.existingDetails.length === 0
    || incomingPriority > existingPriority
    || detailsDiffer(details, input.existingDetails)
  );
  const totalChanged = Math.abs(incomingTotal - input.existingFees) > FEE_EPSILON;
  if (!replaceDetails && !totalChanged) return null;

  return {
    totalFees: incomingTotal,
    replaceDetails,
    details,
  };
}
