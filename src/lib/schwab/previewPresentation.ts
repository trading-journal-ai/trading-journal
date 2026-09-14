import type { SchwabImportPreview } from "./types";

export type SchwabPreviewPresentation =
  | "new_executions"
  | "fee_updates"
  | "already_imported"
  | "needs_review"
  | "no_trades";

export function schwabPreviewPresentation(
  preview: Pick<
    SchwabImportPreview,
    "executionsFound" | "newExecutions" | "reviewExecutions" | "feeUpdatesAvailable"
  >,
): SchwabPreviewPresentation {
  if (preview.executionsFound === 0) return "no_trades";
  if (preview.newExecutions === 0 && preview.feeUpdatesAvailable > 0) {
    return "fee_updates";
  }
  if (preview.newExecutions === 0 && preview.reviewExecutions > 0) {
    return "needs_review";
  }
  if (preview.newExecutions === 0) return "already_imported";
  return "new_executions";
}
