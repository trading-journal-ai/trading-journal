import type { SchwabImportPreview } from "./types";

export type SchwabPreviewPresentation =
  | "new_executions"
  | "already_imported"
  | "needs_review"
  | "no_trades";

export function schwabPreviewPresentation(
  preview: Pick<
    SchwabImportPreview,
    "executionsFound" | "newExecutions" | "reviewExecutions"
  >,
): SchwabPreviewPresentation {
  if (preview.executionsFound === 0) return "no_trades";
  if (preview.newExecutions === 0 && preview.reviewExecutions > 0) {
    return "needs_review";
  }
  if (preview.newExecutions === 0) return "already_imported";
  return "new_executions";
}
