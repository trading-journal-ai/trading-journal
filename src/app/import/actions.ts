"use server";

import { revalidatePath } from "next/cache";
import { importTosCsv, type ImportSummary } from "@/lib/import/persist";

export type ImportState =
  | { ok: true; summary: ImportSummary }
  | { ok: false; error: string }
  | null;

export async function importTosAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a ThinkorSwim Account Statement CSV." };
  }
  try {
    const csv = await file.text();
    const summary = importTosCsv(csv, file.name);
    revalidatePath("/trades");
    revalidatePath("/");
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Import failed.",
    };
  }
}
