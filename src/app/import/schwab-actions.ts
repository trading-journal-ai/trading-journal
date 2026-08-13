"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { canImportData } from "@/lib/demoMode";
import { schwabRequiresReauthorization } from "@/lib/schwab/authErrors";
import { getSchwabConnectionState } from "@/lib/schwab/connection";
import { SchwabDateRangeError } from "@/lib/schwab/dates";
import { SchwabHistoryResponseError } from "@/lib/schwab/history";
import { importSchwabExecutions } from "@/lib/schwab/import";
import {
  authorizeSchwabLocally,
  SchwabLocalAuthorizationError,
} from "@/lib/schwab/localAuthorization";
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

function isLocalJournalHost(host: string | null) {
  if (!host) return false;
  const normalized = host.trim().toLowerCase();
  if (normalized.startsWith("[::1]")) return true;
  const hostname = normalized.split(":")[0];
  return hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname === "127.0.0.1"
    || hostname === "0.0.0.0";
}

export async function authorizeSchwabAction(): Promise<SchwabConnectionState> {
  if (!canImportData() || process.env.VERCEL) {
    return {
      status: "unavailable",
      error: "Schwab authorization is unavailable in the read-only hosted demo.",
    };
  }

  const requestHeaders = await headers();
  if (!isLocalJournalHost(requestHeaders.get("host"))) {
    return {
      status: "unavailable",
      error: "For your security, Schwab authorization can only start from the Journal running on this computer.",
    };
  }

  const currentConnection = await getSchwabConnectionState();
  if (
    currentConnection.status === "missing_credentials"
    && currentConnection.missing.some((key) => key !== "SCHWAB_REFRESH_TOKEN")
  ) {
    return currentConnection;
  }

  try {
    await authorizeSchwabLocally();
    return getSchwabConnectionState();
  } catch (error) {
    if (
      error instanceof SchwabLocalAuthorizationError
      && error.kind === "setup_required"
    ) {
      return {
        status: "missing_credentials",
        missing: ["SCHWAB_APP_KEY", "SCHWAB_SECRET"],
        recovery: "Add this Journal’s Schwab developer credentials once, then authorize Schwab.",
      };
    }
    return {
      status: "unavailable",
      error: "Schwab authorization did not finish. Try again and complete the Schwab window that opens in your browser.",
    };
  }
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
        error: "Schwab authorization expired. Authorize Schwab again, then retry the import.",
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
        error: "Schwab authorization expired. Authorize Schwab again, then retry the import.",
      };
    }
    return {
      ok: false,
      kind: "unavailable",
      error: "The Journal could not complete the Schwab import. The transaction was rolled back, so no partial data was saved.",
    };
  }
}
