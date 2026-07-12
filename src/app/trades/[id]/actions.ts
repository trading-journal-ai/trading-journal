"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import { SETUP_PATTERN_CUES } from "@/lib/journalLabels";

export async function addTradeNoteAction(formData: FormData) {
  const tradeId = Number(formData.get("tradeId"));
  const note = String(formData.get("note") ?? "").trim();
  const setupPattern = String(formData.get("setupPattern") ?? "").trim();
  const validSetupPattern = SETUP_PATTERN_CUES.some((option) => option.value === setupPattern)
    ? setupPattern
    : "";

  if (
    !Number.isInteger(tradeId) ||
    tradeId <= 0 ||
    (!note && !validSetupPattern)
  ) {
    return;
  }
  const activeAccount = await getActiveAccount();

  await db.insert(schema.journalEntries).values({
    accountId: activeAccount.id,
    tradeId,
    lessons: note || null,
    thesis: validSetupPattern || null,
  });

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/trades/review");
  revalidatePath("/journal");
}
