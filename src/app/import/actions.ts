"use server";

import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import { canImportData } from "@/lib/demoMode";
import { importBrokerCsv, type ImportSummary } from "@/lib/import/persist";

export type ImportState =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string }
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
    const account = await getActiveAccount();
    const summary = await importBrokerCsv(csv, file.name, account.id);
    revalidatePath("/trades");
    revalidatePath("/calendar");
    revalidatePath("/reports");
    revalidatePath("/journal");
    revalidatePath("/");
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Import failed.",
    };
  }
}
