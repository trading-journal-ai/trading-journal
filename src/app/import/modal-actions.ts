"use server";

import { canImportData } from "@/lib/demoMode";
import { getActiveImportDestination, requireImportDestination } from "@/lib/import/destination";
import { setActiveAccount } from "@/lib/accountScope";
import { readSchwabImportProvider } from "@/lib/schwab/provider";
import { getSchwabConnectionAction } from "./schwab-actions";

export async function getImportModalContextAction() {
  if (!canImportData()) throw new Error("Import is unavailable in the read-only demo.");
  const destination = await getActiveImportDestination();
  // Paper/unconfigured accounts do not check or expose the live broker connection.
  const connection = destination.supported ? await getSchwabConnectionAction() : null;
  let gateway = false;
  try { gateway = readSchwabImportProvider() === "gateway"; } catch {
    // The connection state carries the setup error; CSV import remains available.
  }
  return { destination, connection, gateway };
}

export async function openImportedJournalAction(accountId: number) {
  const account = await requireImportDestination(accountId, false);
  await setActiveAccount(account.id);
}
