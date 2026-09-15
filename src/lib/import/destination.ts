import "server-only";

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";

export class ImportDestinationError extends Error {}
export type ImportDestination = { id: number; name: string };

// There is no account-type field yet. Recorded Schwab API activity is evidence
// that this journal account supports Schwab; editable names are not capabilities.
export async function supportsSchwabImport(accountId: number) {
  const imported = await db.select({ id: schema.importBatches.id })
    .from(schema.importBatches)
    .where(and(eq(schema.importBatches.accountId, accountId), eq(schema.importBatches.source, "schwab_api")))
    .limit(1);
  return imported.length > 0;
}

export async function getActiveImportDestination() {
  const account = await getActiveAccount();
  return { account: { id: account.id, name: account.name }, supported: await supportsSchwabImport(account.id) };
}

export async function requireImportDestination(value: unknown, requireActive = true): Promise<ImportDestination> {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new ImportDestinationError("Choose an account in the app header, then reopen Import.");
  }
  const account = await db.select({ id: schema.accounts.id, name: schema.accounts.name })
    .from(schema.accounts).where(eq(schema.accounts.id, value)).get();
  if (!account || !(await supportsSchwabImport(account.id))) {
    throw new ImportDestinationError("Import is not available for this account yet.");
  }
  if (requireActive && (await getActiveAccount()).id !== account.id) {
    throw new ImportDestinationError("The header account changed. Close and reopen Import to continue.");
  }
  return account;
}
