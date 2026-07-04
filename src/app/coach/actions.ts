"use server";

import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActiveAccount } from "@/lib/accountScope";
import {
  generateCoachChatReply,
  type CoachChatMessage,
  type CoachChatReply,
} from "@/lib/coach/chat";
import { buildCoachReviewPayload, type CoachReviewHumanContext, type CoachReviewTradeContext } from "@/lib/coach/payload";
import { generateCoachReview } from "@/lib/coach/openai";
import { buildSessionFactPack } from "@/lib/coach/reviewEngine";
import { db, schema } from "@/lib/db";
import { isDemoReadOnly } from "@/lib/demoMode";
import { decodeJournalTags } from "@/lib/journalLabels";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";

const DEFAULT_PLAYBOOK = `Trading style:
- Market focus:
- Preferred setups:
- Timeframes:
- Typical trade duration:

Approved setups:
- Setup name:
- Valid conditions:
- Invalid conditions:
- Entry trigger:
- Stop/risk definition:
- Exit logic:
- Common mistakes:

Risk rules:
- Max loss per trade:
- Max daily loss:
- Max position size:
- No-go conditions:

Current improvement focus:
-`;

const DEFAULT_RUBRIC = `Setup quality: strong / mixed / weak / unknown
Entry quality: strong / mixed / weak / unknown
Risk definition: strong / mixed / weak / unknown
Size discipline: strong / mixed / weak / unknown
Exit management: strong / mixed / weak / unknown
Emotional discipline: strong / mixed / weak / unknown
Journal completeness: strong / mixed / weak / unknown`;

type CoachReviewScope = "day" | "week" | "month";

type CoachReviewActionInput = {
  accountId: number;
  scope: CoachReviewScope;
  scopeKey: string;
};

export async function sendCoachChatMessageAction(
  messages: CoachChatMessage[],
): Promise<CoachChatReply> {
  return generateCoachChatReply(messages);
}

function coachReviewScopeFromForm(formData: FormData): { scope: CoachReviewScope; scopeKey: string } | null {
  const scope = String(formData.get("scope") ?? "");
  const scopeKey = String(formData.get("scopeKey") ?? "").trim();
  if ((scope !== "day" && scope !== "week" && scope !== "month") || !scopeKey) return null;
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

export async function ensureCoachPlaybook(accountId: number) {
  const existing = await db
    .select()
    .from(schema.coachPlaybooks)
    .where(eq(schema.coachPlaybooks.accountId, accountId))
    .limit(1)
    .get();
  if (existing) return existing;

  return db
    .insert(schema.coachPlaybooks)
    .values({
      accountId,
      title: "Trading Playbook",
      body: DEFAULT_PLAYBOOK,
      rubric: DEFAULT_RUBRIC,
    })
    .returning()
    .get();
}

export async function saveDraftCoachReviewAction(formData: FormData) {
  if (isDemoReadOnly()) return;

  const account = await getActiveAccount();
  const input = coachReviewScopeFromForm(formData);
  if (!input) return;

  const payload = await buildCoachReviewPayloadForScope({
    accountId: account.id,
    scope: input.scope,
    scopeKey: input.scopeKey,
  });
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

  const payload = await buildCoachReviewPayloadForScope({
    accountId: account.id,
    scope: input.scope,
    scopeKey: input.scopeKey,
  });
  const generatedAt = new Date().toISOString();
  let values:
    | {
        accountId: number;
        scope: CoachReviewScope;
        scopeKey: string;
        status: "generated";
        payloadJson: string;
        reviewJson: string;
        updatedAt: Date;
      }
    | {
        accountId: number;
        scope: CoachReviewScope;
        scopeKey: string;
        status: "stale";
        payloadJson: string;
        reviewJson: string;
        updatedAt: Date;
      };

  try {
    const result = await generateCoachReview(payload);
    values = {
      accountId: account.id,
      scope: input.scope,
      scopeKey: input.scopeKey,
      status: "generated",
      payloadJson: JSON.stringify(payload),
      reviewJson: JSON.stringify({
        version: 1,
        model: result.model,
        generatedAt,
        review: result.review,
      }),
      updatedAt: new Date(),
    };
  } catch (error) {
    values = {
      accountId: account.id,
      scope: input.scope,
      scopeKey: input.scopeKey,
      status: "stale",
      payloadJson: JSON.stringify(payload),
      reviewJson: JSON.stringify({
        version: 1,
        generatedAt,
        error: error instanceof Error ? error.message : "Coach generation failed.",
      }),
      updatedAt: new Date(),
    };
  }

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

async function buildCoachReviewPayloadForScope({
  accountId,
  scope,
  scopeKey,
}: CoachReviewActionInput) {
  const playbook = await ensureCoachPlaybook(accountId);
  const [recapRow] = await db
    .select()
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.accountId, accountId),
        eq(schema.journalEntries.scope, scope),
        eq(schema.journalEntries.scopeKey, scopeKey),
      ),
    )
    .limit(1);
  const trades = await loadTradesForCoachPayload(accountId, scope, scopeKey);
  const tradeIds = trades.map((trade) => trade.id);
  const notes = tradeIds.length === 0 ? [] : await db
    .select()
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.accountId, accountId),
        inArray(schema.journalEntries.tradeId, tradeIds),
      ),
    );
  const noteByTradeId = new Map(notes.flatMap((note) => (note.tradeId == null ? [] : [[note.tradeId, note]])));
  const humanContext: CoachReviewHumanContext = {
    recap: recapRow?.lessons ?? "",
    intent: recapRow?.thesis ?? "",
    didWell: recapRow?.whatWentWell ?? "",
    standardsDrift: recapRow?.whatWentWrong ?? "",
    emotionalState: recapRow?.emotionalState ?? "",
  };
  const tradeContexts: CoachReviewTradeContext[] = trades.map((trade) => {
    const note = noteByTradeId.get(trade.id);
    return {
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      quantity: trade.quantity,
      entryAt: trade.entryAt,
      exitAt: trade.exitAt,
      entryPrice: trade.avgEntryPrice,
      exitPrice: trade.avgExitPrice,
      pnl: netPnl(trade),
      setup: trade.setup,
      primaryLabel: note?.emotionalState ?? null,
      note: note?.lessons ?? null,
      processTags: decodeJournalTags(note?.whatWentWell ?? null),
      emotionTags: decodeJournalTags(note?.whatWentWrong ?? null),
    };
  });
  return buildCoachReviewPayload({
    scope,
    scopeKey,
    generatedAt: new Date().toISOString(),
    playbook: {
      title: playbook.title,
      body: playbook.body,
      rubric: playbook.rubric,
    },
    humanContext,
    deterministicFacts: buildSessionFactPack(trades),
    trades: tradeContexts,
  });
}

async function loadTradesForCoachPayload(accountId: number, scope: "day" | "week" | "month", scopeKey: string) {
  const from = scope === "month" ? `${scopeKey}-01` : scopeKey;
  const to = scope === "day"
    ? scopeKey
    : scope === "week"
      ? new Date(Date.UTC(Number(scopeKey.slice(0, 4)), Number(scopeKey.slice(5, 7)) - 1, Number(scopeKey.slice(8, 10)) + 4)).toISOString().slice(0, 10)
      : new Date(Date.UTC(Number(scopeKey.slice(0, 4)), Number(scopeKey.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const { start } = etDayRange(from);
  const { end } = etDayRange(to);

  return (
    await db
      .select()
      .from(schema.trades)
      .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => {
    if (trade.entryAt == null || trade.entryAt < start || trade.entryAt > end) return false;
    const date = etDateString(trade.entryAt);
    return date >= from && date <= to;
  });
}
