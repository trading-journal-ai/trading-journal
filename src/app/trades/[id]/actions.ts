"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { getActiveAccount } from "@/lib/accountScope";
import {
  PRIMARY_TRADE_LABELS,
} from "@/lib/journalLabels";

export async function addTradeNoteAction(formData: FormData) {
  const tradeId = Number(formData.get("tradeId"));
  const note = String(formData.get("note") ?? "").trim();
  const primaryLabel = String(formData.get("primaryLabel") ?? "").trim();
  const validPrimaryLabel = PRIMARY_TRADE_LABELS.some((option) => option.value === primaryLabel)
    ? primaryLabel
    : "";

  if (
    !Number.isInteger(tradeId) ||
    tradeId <= 0 ||
    (!note && !validPrimaryLabel)
  ) {
    return;
  }
  const activeAccount = await getActiveAccount();

  await db.insert(schema.journalEntries).values({
    accountId: activeAccount.id,
    tradeId,
    lessons: note || null,
    emotionalState: validPrimaryLabel || null,
  });

  revalidatePath(`/trades/${tradeId}`);
  revalidatePath("/journal");
}
