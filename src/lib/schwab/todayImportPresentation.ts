import type { SchwabImportActionResult } from "./types";

export type SchwabTodayImportPresentation = {
  kind:
    | "imported"
    | "no_trades"
    | "already_imported"
    | "needs_review"
    | "reauth_required"
    | "validation"
    | "unavailable";
  title: string;
  detail: string;
  refreshJournal: boolean;
};

function executionCount(count: number) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "execution" : "executions"}`;
}

export function schwabTodayImportPresentation(
  result: SchwabImportActionResult,
): SchwabTodayImportPresentation {
  if (!result.ok) {
    if (result.kind === "reauth_required") {
      return {
        kind: "reauth_required",
        title: "Schwab authorization expired",
        detail: result.error,
        refreshJournal: false,
      };
    }

    return {
      kind: result.kind,
      title: result.kind === "validation"
        ? "Today’s import needs attention"
        : "Schwab couldn’t complete the import",
      detail: result.error,
      refreshJournal: false,
    };
  }

  const { summary } = result;
  if (summary.inserted > 0) {
    const created = summary.tradesCreated > 0
      ? ` ${summary.tradesCreated.toLocaleString("en-US")} ${summary.tradesCreated === 1 ? "trade is" : "trades are"} ready to review.`
      : " The Journal has been refreshed.";
    const review = summary.reviewExecutions > 0
      ? ` ${executionCount(summary.reviewExecutions)} could not be matched safely and was left for review.`
      : "";
    return {
      kind: "imported",
      title: `${executionCount(summary.inserted)} imported`,
      detail: `Added to ${summary.journalAccountLabel}.${created}${review}`,
      refreshJournal: true,
    };
  }

  if (summary.reviewExecutions > 0) {
    return {
      kind: "needs_review",
      title: "Nothing was imported automatically",
      detail: `${executionCount(summary.reviewExecutions)} may overlap existing history, so the Journal left it unchanged. Open the full importer to review the details.`,
      refreshJournal: false,
    };
  }

  if (summary.duplicates > 0) {
    const duplicateVerb = summary.duplicates === 1 ? "already exists" : "already exist";
    return {
      kind: "already_imported",
      title: "Today’s trades are already imported",
      detail: `${executionCount(summary.duplicates)} ${duplicateVerb} in ${summary.journalAccountLabel}. If this day still looks empty, check the active Journal account.`,
      refreshJournal: true,
    };
  }

  return {
    kind: "no_trades",
    title: "No Schwab trades found today",
    detail: "Schwab returned no filled equity executions for today. If you traded in another account or broker, use the full importer.",
    refreshJournal: false,
  };
}
