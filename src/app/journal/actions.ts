"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { isDemoReadOnly } from "@/lib/demoMode";
import { SETUP_PATTERN_CUES } from "@/lib/journalLabels";

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

export async function deleteTickerReviewAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const returnTo = String(formData.get("returnTo") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}:[A-Z0-9.\-]+$/.test(scopeKey)) return;

  const activeAccount = await getActiveAccount();
  await db
    .delete(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.scope, "ticker"),
        eq(schema.journalEntries.scopeKey, scopeKey),
        eq(schema.journalEntries.accountId, activeAccount.id),
      ),
    );

  revalidateJournalLoop();
  revalidatePath("/trades/review");
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    revalidatePath(returnTo.split("?")[0] || "/journal");
  }
}

export async function markTickerReviewReadyAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const date = String(formData.get("date") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim().toUpperCase();
  const returnTo = String(formData.get("returnTo") ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[A-Z0-9.\-]+$/.test(symbol)) return;

  const activeAccount = await getActiveAccount();
  await db
    .insert(schema.tickerReviews)
    .values({ accountId: activeAccount.id, date, symbol })
    .onConflictDoUpdate({
      target: [schema.tickerReviews.accountId, schema.tickerReviews.date, schema.tickerReviews.symbol],
      set: { status: "ready", updatedAt: new Date() },
    });

  revalidateJournalLoop();
  revalidatePath("/trades/review");
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    revalidatePath(returnTo.split("?")[0] || "/journal");
  }
}

async function ownedTradeId(tradeId: number): Promise<number | null> {
  if (!Number.isInteger(tradeId) || tradeId <= 0) return null;
  const activeAccount = await getActiveAccount();
  const trade = await db
    .select({ id: schema.trades.id })
    .from(schema.trades)
    .where(and(eq(schema.trades.id, tradeId), eq(schema.trades.accountId, activeAccount.id)))
    .limit(1);
  return trade[0]?.id ?? null;
}

export async function setTradeTagAction(formData: FormData) {
  if (isDemoReadOnly()) return { ok: false };

  const tradeId = Number(formData.get("tradeId"));
  const tagName = String(formData.get("tagName") ?? "").trim().replace(/\s+/g, " ");
  const selected = String(formData.get("selected")) === "true";
  if (!(await ownedTradeId(tradeId)) || !tagName || tagName.length > 40) return { ok: false };

  await db.insert(schema.tags).values({ name: tagName }).onConflictDoNothing();
  const tag = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(eq(schema.tags.name, tagName))
    .limit(1);
  if (!tag[0]) return { ok: false };

  if (selected) {
    await db.insert(schema.tradeTags).values({ tradeId, tagId: tag[0].id }).onConflictDoNothing();
  } else {
    await db
      .delete(schema.tradeTags)
      .where(and(eq(schema.tradeTags.tradeId, tradeId), eq(schema.tradeTags.tagId, tag[0].id)));
  }

  revalidatePath("/trades/review");
  revalidatePath(`/trades/${tradeId}`);
  revalidateJournalLoop();
  return { ok: true };
}

export async function setTickerReviewTagAction(formData: FormData) {
  if (isDemoReadOnly()) return { ok: false };

  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  const tagName = String(formData.get("tagName") ?? "").trim().replace(/\s+/g, " ");
  const selected = String(formData.get("selected")) === "true";
  if (!/^\d{4}-\d{2}-\d{2}:[A-Z0-9.\-]+$/.test(scopeKey) || !tagName || tagName.length > 40) {
    return { ok: false };
  }

  const activeAccount = await getActiveAccount();
  const existing = await db
    .select({ id: schema.journalEntries.id })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.accountId, activeAccount.id),
        eq(schema.journalEntries.scope, "ticker"),
        eq(schema.journalEntries.scopeKey, scopeKey),
      ),
    )
    .limit(1);

  let journalEntryId = existing[0]?.id;
  if (!journalEntryId) {
    const inserted = await db
      .insert(schema.journalEntries)
      .values({ accountId: activeAccount.id, scope: "ticker", scopeKey })
      .returning({ id: schema.journalEntries.id });
    journalEntryId = inserted[0]?.id;
  }
  if (!journalEntryId) return { ok: false };

  await db.insert(schema.tags).values({ name: tagName }).onConflictDoNothing();
  const tag = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(eq(schema.tags.name, tagName))
    .limit(1);
  if (!tag[0]) return { ok: false };

  if (selected) {
    await db
      .insert(schema.journalEntryTags)
      .values({ journalEntryId, tagId: tag[0].id })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.journalEntryTags)
      .where(
        and(
          eq(schema.journalEntryTags.journalEntryId, journalEntryId),
          eq(schema.journalEntryTags.tagId, tag[0].id),
        ),
      );
  }

  revalidatePath("/trades/review");
  revalidateJournalLoop();
  return { ok: true };
}

const ATTACHMENT_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/webm": "audio.webm",
};

export async function addTradeAttachmentAction(formData: FormData) {
  if (isDemoReadOnly()) return { ok: false };

  const tradeId = Number(formData.get("tradeId"));
  const file = formData.get("file");
  if (!(await ownedTradeId(tradeId)) || !(file instanceof File) || file.size === 0) return { ok: false };
  if (file.size > 50 * 1024 * 1024) return { ok: false, error: "Files must be 50 MB or smaller." };

  const extension = ATTACHMENT_EXTENSIONS[file.type];
  if (!extension) return { ok: false, error: "Use an image, audio, or MP4/WebM recording." };

  const uploadDirectory = path.join(process.cwd(), "public", "uploads", "ticker-review");
  await mkdir(uploadDirectory, { recursive: true });
  const filename = `${tradeId}-${randomUUID()}.${extension}`;
  const filePath = `/uploads/ticker-review/${filename}`;
  const caption = file.name.slice(0, 160);
  await writeFile(path.join(uploadDirectory, filename), Buffer.from(await file.arrayBuffer()));

  const inserted = await db
    .insert(schema.attachments)
    .values({ tradeId, filePath, caption })
    .returning({ id: schema.attachments.id });

  revalidatePath("/trades/review");
  revalidatePath(`/trades/${tradeId}`);
  revalidateJournalLoop();
  return {
    ok: true,
    attachment: { id: inserted[0].id, filePath, caption },
  };
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
  const setupPattern = String(formData.get("setupPattern") ?? "").trim();
  const validSetupPattern = SETUP_PATTERN_CUES.some((option) => option.value === setupPattern)
    ? setupPattern
    : "";

  if (!Number.isInteger(noteId) || noteId <= 0) return;

  await db
    .update(schema.journalEntries)
    .set({
      lessons: note || null,
      thesis: validSetupPattern || null,
    })
    .where(eq(schema.journalEntries.id, noteId));

  revalidateJournalLoop();
  if (Number.isInteger(tradeId) && tradeId > 0) {
    revalidatePath(`/trades/${tradeId}`);
    revalidatePath("/trades/review");
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
    revalidatePath("/trades/review");
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
