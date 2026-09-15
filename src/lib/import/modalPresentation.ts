import type { ImportSummary } from "./persist";
import type { SchwabImportSummary } from "@/lib/schwab/types";

export type ModalImportSummary = ImportSummary | SchwabImportSummary;

export function importModalPresentation(summary: ModalImportSummary) {
  const routine = (warning: string) =>
    warning.startsWith("Order history includes a seven-day entry lookback")
    || warning.startsWith("Fill-preserving sync:")
    || warning.startsWith("Every Schwab execution found was already represented")
    || /^\d+ existing executions? (was|were) enriched with broker fee details/.test(warning);
  // Unknown warnings stay visible. Only recognized routine explanations collapse.
  const notices = summary.warnings.filter((warning) => !routine(warning));
  const needsReview = ("reviewExecutions" in summary && summary.reviewExecutions > 0)
    || notices.some((warning) => /skipped|held for review|unmatched|could not|missing/i.test(warning));
  const title = needsReview
    ? "Import needs attention"
    : summary.inserted > 0 ? "Import complete"
      : summary.feesUpdated > 0 ? "Fees updated"
        : summary.parsed > 0 ? "Already up to date" : "No trades found";
  return {
    title,
    notices,
    needsReview,
    from: "from" in summary ? summary.from : summary.parsedFrom,
    to: "to" in summary ? summary.to : summary.parsedTo,
    journalDate: summary.insertedTo
      ?? ("to" in summary ? summary.to : summary.parsedTo),
  };
}
