"use server";

import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import {
  generateCoachChatReply,
  type CoachChatMessage,
  type CoachChatReply,
} from "@/lib/coach/chat";
import { buildCoachReviewPayloadForScope, ensureCoachPlaybook, generateAndStoreCoachReview, type CoachReviewScope, validCoachScopeKey } from "@/lib/coach/reviewService";
import { db, schema } from "@/lib/db";
import { isDemoReadOnly } from "@/lib/demoMode";

export async function sendCoachChatMessageAction(
  messages: CoachChatMessage[],
): Promise<CoachChatReply> {
  return generateCoachChatReply(messages);
}

function coachReviewScopeFromForm(formData: FormData): { scope: CoachReviewScope; scopeKey: string } | null {
  const scope = String(formData.get("scope") ?? "");
  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  if ((scope !== "day" && scope !== "week" && scope !== "month") || !validCoachScopeKey(scope, scopeKey)) return null;
  return { scope, scopeKey };
}

export async function saveCoachPlaybookAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const title = String(formData.get("title") ?? "").trim() || "Trading Playbook";
  const body = String(formData.get("body") ?? "").trim();
  const rubric = String(formData.get("rubric") ?? "").trim();
  if (!body || !rubric) return;

  const account = await getActiveAccount();
  const values = {
    accountId: account.id,
    title,
    body,
    rubric,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.coachPlaybooks)
    .values(values)
    .onConflictDoUpdate({
      target: schema.coachPlaybooks.accountId,
      set: values,
    });

  revalidatePath("/settings");
  revalidatePath("/journal");
}

export async function saveDraftCoachReviewAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const account = await getActiveAccount();
  const input = coachReviewScopeFromForm(formData);
  if (!input) return;

  await ensureCoachPlaybook(account.id);

  const payload = await buildCoachReviewPayloadForScope(account.id, input.scope, input.scopeKey);
  const values = {
    accountId: account.id,
    scope: input.scope,
    scopeKey: input.scopeKey,
    status: "draft" as const,
    payloadJson: JSON.stringify(payload),
    reviewJson: null,
    updatedAt: new Date(),
  };

  await db
    .insert(schema.coachReviews)
    .values(values)
    .onConflictDoUpdate({
      target: [
        schema.coachReviews.accountId,
        schema.coachReviews.scope,
        schema.coachReviews.scopeKey,
      ],
      set: values,
    });

  revalidatePath("/journal");
}

export async function generateCoachReviewAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const account = await getActiveAccount();
  const input = coachReviewScopeFromForm(formData);
  if (!input) return;
  await ensureCoachPlaybook(account.id);
  await generateAndStoreCoachReview(account.id, input.scope, input.scopeKey);

  revalidatePath("/journal");
}
