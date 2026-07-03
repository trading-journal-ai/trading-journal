"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { isDemoReadOnly } from "@/lib/demoMode";
import {
  PRIMARY_TRADE_LABELS,
} from "@/lib/journalLabels";

type ScopedNoteState = { ok: boolean };
type TradeNoteState = { ok: boolean };
const RECAP_SCOPES = ["day", "week", "month"] as const;
type RecapScope = (typeof RECAP_SCOPES)[number];

function revalidateJournalLoop() {
  revalidatePath("/dashboard");
  revalidatePath("/journal");
  revalidatePath("/reports");
}

/** Create-or-update a scoped recap note (day/week/month) keyed by scope+scopeKey. */
export async function upsertScopedNoteAction(
  _prev: ScopedNoteState | null,
  formData: FormData,
): Promise<ScopedNoteState> {
  if (isDemoReadOnly()) return { ok: false };

  const scope = String(formData.get("scope") ?? "") as RecapScope;
  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const thesis = String(formData.get("thesis") ?? "").trim();
  const whatWentWell = String(formData.get("whatWentWell") ?? "").trim();
  const whatWentWrong = String(formData.get("whatWentWrong") ?? "").trim();
  const emotionalState = String(formData.get("emotionalState") ?? "").trim();

  if (!RECAP_SCOPES.includes(scope) || !scopeKey) return { ok: false };
  const activeAccount = await getActiveAccount();

  const existing = await db
    .select({ id: schema.journalEntries.id })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.scope, scope),
        eq(schema.journalEntries.scopeKey, scopeKey),
        eq(schema.journalEntries.accountId, activeAccount.id),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.journalEntries)
      .set({
        lessons: body || null,
        thesis: thesis || null,
        whatWentWell: whatWentWell || null,
        whatWentWrong: whatWentWrong || null,
        emotionalState: emotionalState || null,
      })
      .where(eq(schema.journalEntries.id, existing[0].id));
  } else {
    await db
      .insert(schema.journalEntries)
      .values({
        accountId: activeAccount.id,
        scope,
        scopeKey,
        lessons: body || null,
        thesis: thesis || null,
        whatWentWell: whatWentWell || null,
        whatWentWrong: whatWentWrong || null,
        emotionalState: emotionalState || null,
      });
  }

  revalidateJournalLoop();
  return { ok: true };
}

export async function upsertTickerReviewAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}:[A-Z0-9.\-]+$/.test(scopeKey)) return;

  const activeAccount = await getActiveAccount();
  const existing = await db
    .select({ id: schema.journalEntries.id })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.scope, "ticker"),
        eq(schema.journalEntries.scopeKey, scopeKey),
        eq(schema.journalEntries.accountId, activeAccount.id),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(schema.journalEntries)
      .set({ lessons: body || null })
      .where(eq(schema.journalEntries.id, existing[0].id));
  } else if (body) {
    await db.insert(schema.journalEntries).values({
      accountId: activeAccount.id,
      scope: "ticker",
      scopeKey,
      lessons: body,
    });
  }

  revalidateJournalLoop();
  revalidatePath("/trades/review");
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    revalidatePath(returnTo.split("?")[0] || "/journal");
  }
}

export async function saveCoachExperimentAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const scope = String(formData.get("scope") ?? "") as RecapScope;
  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const hypothesis = String(formData.get("hypothesis") ?? "").trim();
  const trigger = String(formData.get("trigger") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const experimentScope = String(formData.get("experimentScope") ?? "").trim();
  const expires = String(formData.get("expires") ?? "").trim();
  const measure = String(formData.get("measure") ?? "").trim();

  if (
    !RECAP_SCOPES.includes(scope) ||
    !scopeKey ||
    !hypothesis ||
    !trigger ||
    !action ||
    !experimentScope ||
    !expires ||
    !measure
  ) {
    return;
  }

  const activeAccount = await getActiveAccount();
  const values = {
    accountId: activeAccount.id,
    scope,
    scopeKey,
    hypothesis,
    trigger,
    action,
    experimentScope,
    expires,
    measure,
    status: "active" as const,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.coachExperiments)
    .values(values)
    .onConflictDoUpdate({
      target: [
        schema.coachExperiments.accountId,
        schema.coachExperiments.scope,
        schema.coachExperiments.scopeKey,
      ],
      set: values,
    });

  revalidateJournalLoop();
}

export async function updateJournalEntryAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const noteId = Number(formData.get("noteId"));
  const tradeId = Number(formData.get("tradeId"));
  const note = String(formData.get("note") ?? "").trim();
  const primaryLabel = String(formData.get("primaryLabel") ?? "").trim();
  const validPrimaryLabel = PRIMARY_TRADE_LABELS.some((option) => option.value === primaryLabel)
    ? primaryLabel
    : "";

  if (!Number.isInteger(noteId) || noteId <= 0) return;

  await db
    .update(schema.journalEntries)
    .set({
      lessons: note || null,
      emotionalState: validPrimaryLabel || null,
    })
    .where(eq(schema.journalEntries.id, noteId));

  revalidateJournalLoop();
  if (Number.isInteger(tradeId) && tradeId > 0) {
    revalidatePath(`/trades/${tradeId}`);
  }
}

export async function deleteJournalEntryAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const noteId = Number(formData.get("noteId"));
  const tradeId = Number(formData.get("tradeId"));

  if (!Number.isInteger(noteId) || noteId <= 0) return;

  await db
    .delete(schema.journalEntries)
    .where(eq(schema.journalEntries.id, noteId));

  revalidateJournalLoop();
  if (Number.isInteger(tradeId) && tradeId > 0) {
    revalidatePath(`/trades/${tradeId}`);
  }
}

export async function updateJournalEntryStateAction(
  _prev: TradeNoteState | null,
  formData: FormData,
): Promise<TradeNoteState> {
  if (isDemoReadOnly()) return { ok: false };

  await updateJournalEntryAction(formData);
  return { ok: true };
}
