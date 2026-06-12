"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";

type ScopedNoteState = { ok: boolean };
const RECAP_SCOPES = ["day", "week", "month"] as const;
type RecapScope = (typeof RECAP_SCOPES)[number];

/** Create-or-update a scoped recap note (day/week/month) keyed by scope+scopeKey. */
export async function upsertScopedNoteAction(
  _prev: ScopedNoteState | null,
  formData: FormData,
): Promise<ScopedNoteState> {
  const scope = String(formData.get("scope") ?? "") as RecapScope;
  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!RECAP_SCOPES.includes(scope) || !scopeKey) return { ok: false };

  const existing = await db
    .select({ id: schema.journalEntries.id })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.scope, scope),
        eq(schema.journalEntries.scopeKey, scopeKey),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.journalEntries)
      .set({ lessons: body || null })
      .where(eq(schema.journalEntries.id, existing[0].id));
  } else {
    await db
      .insert(schema.journalEntries)
      .values({ scope, scopeKey, lessons: body || null });
  }

  revalidatePath("/journal");
  return { ok: true };
}

export async function updateJournalEntryAction(formData: FormData) {
  const noteId = Number(formData.get("noteId"));
  const tradeId = Number(formData.get("tradeId"));
  const note = String(formData.get("note") ?? "").trim();
  const emotionalState = String(formData.get("emotionalState") ?? "").trim();

  if (!Number.isInteger(noteId) || noteId <= 0) return;

  await db
    .update(schema.journalEntries)
    .set({
      lessons: note || null,
      emotionalState: emotionalState || null,
    })
    .where(eq(schema.journalEntries.id, noteId));

  revalidatePath("/journal");
  if (Number.isInteger(tradeId) && tradeId > 0) {
    revalidatePath(`/trades/${tradeId}`);
  }
}
