"use server";

import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import { canImportData } from "@/lib/demoMode";
import { inspectBrokerCsv, type BrokerCsvInspection } from "@/lib/import/inspect";
import { importBrokerCsv, type ImportSummary } from "@/lib/import/persist";

export type ImportState =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string; inspection?: BrokerCsvInspection }
  | null;

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (!canImportData()) {
    return { ok: false, error: "This hosted demo is read-only. Download the app to import your own CSV data locally." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a supported CSV file." };
  }
  try {
    const csv = await file.text();
    const inspection = inspectBrokerCsv(csv);
    if (!inspection.importable) {
      return {
        ok: false,
        error: inspection.recommendation,
        inspection,
      };
    }
    const account = await getActiveAccount();
    const summary = await importBrokerCsv(csv, file.name, account.id);
    revalidatePath("/trades");
    revalidatePath("/calendar");
    revalidatePath("/analytics");
    revalidatePath("/journal");
    revalidatePath("/");
    return { ok: true, summary };
  } catch (e) {
    const csv = await file.text().catch(() => "");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Import failed.",
      inspection: csv ? inspectBrokerCsv(csv) : undefined,
    };
  }
}
