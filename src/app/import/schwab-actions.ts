"use server";

import { revalidatePath } from "next/cache";
import { canImportData } from "@/lib/demoMode";
import { schwabRequiresReauthorization } from "@/lib/schwab/authErrors";
import { getSchwabConnectionState } from "@/lib/schwab/connection";
import { SchwabDateRangeError } from "@/lib/schwab/dates";
import { SchwabHistoryResponseError } from "@/lib/schwab/history";
import { importSchwabExecutions } from "@/lib/schwab/import";
import { SchwabAppendSafetyError } from "@/lib/schwab/persist";
import { TradeReconciliationError } from "@/lib/schwab/reconcile";
import {
  buildSchwabImportPreview,
  SchwabAccountSelectionError,
} from "@/lib/schwab/preview";
import type {
  SchwabConnectionState,
  SchwabImportActionResult,
  SchwabPreviewActionResult,
} from "@/lib/schwab/types";

export async function getSchwabConnectionAction(): Promise<SchwabConnectionState> {
  if (!canImportData()) {
    return {
      status: "unavailable",
      error: "Schwab connection is unavailable in the read-only hosted demo.",
    };
  }
  return getSchwabConnectionState();
}

function previewInput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    typeof input.accountSelection !== "string"
    || typeof input.from !== "string"
    || typeof input.to !== "string"
  ) {
    return null;
  }
  return {
    accountSelection: input.accountSelection.trim(),
    from: input.from.trim(),
    to: input.to.trim(),
  };
}

export async function previewSchwabImportAction(
  value: unknown,
): Promise<SchwabPreviewActionResult> {
  if (!canImportData()) {
    return {
      ok: false,
      kind: "unavailable",
      error: "Schwab preview is unavailable in the read-only hosted demo.",
    };
  }

  const input = previewInput(value);
  if (!input || !input.accountSelection) {
    return {
      ok: false,
      kind: "validation",
      error: "Choose an authorized Schwab account and date range.",
    };
  }

  try {
    return {
      ok: true,
      preview: await buildSchwabImportPreview(input),
    };
  } catch (error) {
    if (
      error instanceof SchwabDateRangeError
      || error instanceof SchwabAccountSelectionError
      || error instanceof SchwabHistoryResponseError
      || error instanceof TradeReconciliationError
    ) {
      return {
        ok: false,
        kind: "validation",
        error: error.message,
      };
    }
    if (schwabRequiresReauthorization(error)) {
      return {
        ok: false,
        kind: "reauth_required",
        error: "Schwab authorization expired. Run npm run schwab:authorize, restart the Journal, and try again.",
      };
    }
    return {
      ok: false,
      kind: "unavailable",
      error: "The Journal could not build the Schwab preview. No data was changed; retry shortly or use file import.",
    };
  }
}

export async function importSchwabExecutionsAction(
  value: unknown,
): Promise<SchwabImportActionResult> {
  if (!canImportData()) {
    return {
      ok: false,
      kind: "unavailable",
      error: "Schwab import is unavailable in the read-only hosted demo.",
    };
  }

  const input = previewInput(value);
  if (!input || !input.accountSelection) {
    return {
      ok: false,
      kind: "validation",
      error: "Choose an authorized Schwab account and date range.",
    };
  }

  try {
    const summary = await importSchwabExecutions(input);
    revalidatePath("/");
    revalidatePath("/trades");
    revalidatePath("/calendar");
    revalidatePath("/analytics");
    revalidatePath("/journal");
    return { ok: true, summary };
  } catch (error) {
    if (
      error instanceof SchwabDateRangeError
      || error instanceof SchwabAccountSelectionError
      || error instanceof SchwabHistoryResponseError
      || error instanceof SchwabAppendSafetyError
      || error instanceof TradeReconciliationError
    ) {
      return {
        ok: false,
        kind: "validation",
        error: error.message,
      };
    }
    if (schwabRequiresReauthorization(error)) {
      return {
        ok: false,
        kind: "reauth_required",
        error: "Schwab authorization expired. Run npm run schwab:authorize, restart the Journal, and try again.",
      };
    }
    return {
      ok: false,
      kind: "unavailable",
      error: "The Journal could not complete the Schwab import. The transaction was rolled back, so no partial data was saved.",
    };
  }
}
