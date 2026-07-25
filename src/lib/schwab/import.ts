import "server-only";

import { getActiveAccount } from "@/lib/accountScope";
import { loadSchwabNormalizedHistory } from "./load";
import { persistSchwabExecutions } from "./persist";
import type { SchwabImportSummary } from "./types";

export async function importSchwabExecutions(input: {
  accountSelection: string;
  from: string;
  to: string;
}): Promise<SchwabImportSummary> {
  const { range, accountOption, history, normalized } =
    await loadSchwabNormalizedHistory(input);
  const journalAccount = await getActiveAccount();
  const persisted = await persistSchwabExecutions({
    accountId: journalAccount.id,
    from: range.from,
    to: range.to,
    executions: normalized.executions,
  });

  return {
    ...persisted,
    accountLabel: accountOption.label,
    journalAccountLabel: journalAccount.name,
    from: range.from,
    to: range.to,
    warnings: [
      ...history.warnings,
      ...normalized.warnings,
      persisted.inserted === 0
        && persisted.reviewExecutions === 0
        && normalized.executions.length > 0
        ? "Every Schwab execution found was already represented in this Journal account."
        : null,
      persisted.reviewExecutions > 0
        ? `${persisted.reviewExecutions} unmatched ${persisted.reviewExecutions === 1 ? "fill was" : "fills were"} skipped because ${persisted.reviewSymbols.join(", ")} appears to belong to existing trade data. Existing trades and notes were not changed.`
        : null,
      "Append-only sync: no existing executions, trades, notes, tags, attachments, or import batches were deleted.",
    ].filter((warning): warning is string => warning != null),
  };
}
