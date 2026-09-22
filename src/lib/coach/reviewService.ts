import "server-only";

import { and, asc, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { analyzeTradeExecutions, coachTradeExecutionFacts } from "@/lib/executionAnalysis";
import { decodeJournalTags } from "@/lib/journalLabels";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";
import { db, schema } from "@/lib/db";
import { opportunityContextsForTrades } from "@/lib/coach/opportunityContextService";
import { buildCoachReviewPayload, type CoachReviewHumanContext, type CoachReviewPayload, type CoachReviewTradeContext } from "@/lib/coach/payload";
import { generateCoachReview } from "@/lib/coach/openai";
import { buildSessionFactPack } from "@/lib/coach/reviewEngine";
import { coachReviewNotesChanged, type CoachNotesSnapshot } from "@/lib/coach/reviewFreshness";
import { runCoachRefresh } from "@/lib/coach/reviewRefresh";

export type CoachReviewScope = "day" | "week" | "month";

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

export async function ensureCoachPlaybook(accountId: number) {
  const existing = await db.select().from(schema.coachPlaybooks).where(eq(schema.coachPlaybooks.accountId, accountId)).limit(1).get();
  if (existing) return existing;
  return db.insert(schema.coachPlaybooks).values({ accountId, title: "Trading Playbook", body: DEFAULT_PLAYBOOK, rubric: DEFAULT_RUBRIC }).returning().get();
}

export function validCoachScopeKey(scope: CoachReviewScope, scopeKey: string): boolean {
  if (scope === "month") {
    if (!/^\d{4}-\d{2}$/.test(scopeKey)) return false;
    const [year, month] = scopeKey.split("-").map(Number);
    return month >= 1 && month <= 12 && new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 7) === scopeKey;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scopeKey)) return false;
  const [year, month, day] = scopeKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === scopeKey;
}

export function coachScopeDateRange(scope: CoachReviewScope, scopeKey: string) {
  const from = scope === "month" ? `${scopeKey}-01` : scopeKey;
  const to = scope === "day"
    ? scopeKey
    : scope === "week"
      ? new Date(Date.UTC(Number(scopeKey.slice(0, 4)), Number(scopeKey.slice(5, 7)) - 1, Number(scopeKey.slice(8, 10)) + 4)).toISOString().slice(0, 10)
      : new Date(Date.UTC(Number(scopeKey.slice(0, 4)), Number(scopeKey.slice(5, 7)), 0)).toISOString().slice(0, 10);
  return { from, to, start: etDayRange(from).start, end: etDayRange(to).end };
}

async function loadTrades(accountId: number, scope: CoachReviewScope, scopeKey: string) {
  const { from, to, start, end } = coachScopeDateRange(scope, scopeKey);
  return (await db.select().from(schema.trades)
    .where(and(eq(schema.trades.accountId, accountId), gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
    .orderBy(asc(schema.trades.entryAt)))
    .filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) >= from && etDateString(trade.entryAt) <= to);
}

function humanContextFromRow(row: typeof schema.journalEntries.$inferSelect | undefined): CoachReviewHumanContext {
  return {
    recap: row?.lessons ?? "",
    intent: row?.thesis ?? "",
    didWell: row?.whatWentWell ?? "",
    standardsDrift: row?.whatWentWrong ?? "",
    emotionalState: row?.emotionalState ?? "",
  };
}

async function loadHumanContext(accountId: number, scope: CoachReviewScope, scopeKey: string) {
  const [recapRow] = await db.select().from(schema.journalEntries).where(and(
    eq(schema.journalEntries.accountId, accountId), eq(schema.journalEntries.scope, scope), eq(schema.journalEntries.scopeKey, scopeKey),
  )).limit(1);
  const context = humanContextFromRow(recapRow);
  if (scope === "day") return context;
  const { from, to } = coachScopeDateRange(scope, scopeKey);
  const dayRows = await db.select().from(schema.journalEntries).where(and(
    eq(schema.journalEntries.accountId, accountId), eq(schema.journalEntries.scope, "day"),
    gte(schema.journalEntries.scopeKey, from), lte(schema.journalEntries.scopeKey, to),
  )).orderBy(asc(schema.journalEntries.scopeKey));
  return {
    ...context,
    dailyReflections: dayRows.flatMap((row) => row.scopeKey == null ? [] : [{
      date: row.scopeKey,
      recap: row.lessons ?? "",
      intent: row.thesis ?? "",
      didWell: row.whatWentWell ?? "",
      standardsDrift: row.whatWentWrong ?? "",
      emotionalState: row.emotionalState ?? "",
    }]),
  };
}

async function loadTradeNoteRows(accountId: number, tradeIds: number[]) {
  if (tradeIds.length === 0) return [];
  return db.select().from(schema.journalEntries).where(and(
    eq(schema.journalEntries.accountId, accountId), inArray(schema.journalEntries.tradeId, tradeIds),
  ));
}

async function loadTickerNoteRows(accountId: number, scope: CoachReviewScope, scopeKey: string) {
  const { from, to } = coachScopeDateRange(scope, scopeKey);
  return db.select().from(schema.journalEntries).where(and(
    eq(schema.journalEntries.accountId, accountId),
    eq(schema.journalEntries.scope, "ticker"),
    gte(schema.journalEntries.scopeKey, `${from}:`),
    lte(schema.journalEntries.scopeKey, `${to}:\uffff`),
  ));
}

function noteMaps(notes: Array<typeof schema.journalEntries.$inferSelect>, tickerNotes: Array<typeof schema.journalEntries.$inferSelect>) {
  return {
    byTradeId: new Map(notes.flatMap((note) => note.tradeId == null ? [] : [[note.tradeId, note] as const])),
    byTickerKey: new Map(tickerNotes.map((note) => [note.scopeKey, note] as const)),
  };
}

export async function getCoachReviewFreshness(
  accountId: number,
  scope: CoachReviewScope,
  scopeKey: string,
  savedPayloadJson: string,
): Promise<{ notesChanged: boolean }> {
  if (!Number.isInteger(accountId) || accountId <= 0 || !validCoachScopeKey(scope, scopeKey)) return { notesChanged: true };
  const trades = await loadTrades(accountId, scope, scopeKey);
  const [notes, tickerNotes] = await Promise.all([loadTradeNoteRows(accountId, trades.map((trade) => trade.id)), loadTickerNoteRows(accountId, scope, scopeKey)]);
  const { byTradeId, byTickerKey } = noteMaps(notes, tickerNotes);
  const current: CoachNotesSnapshot = {
    humanContext: await loadHumanContext(accountId, scope, scopeKey),
    tradeNotes: trades.map((trade) => {
      const date = trade.entryAt == null ? "" : etDateString(trade.entryAt);
      const note = byTradeId.get(trade.id);
      const tickerNote = byTickerKey.get(`${date}:${trade.symbol}`);
      return { id: trade.id, primaryLabel: note?.emotionalState ?? null, note: note?.lessons ?? null, tickerNote: tickerNote?.lessons ?? null, processTags: decodeJournalTags(note?.whatWentWell ?? null), emotionTags: decodeJournalTags(note?.whatWentWrong ?? null) };
    }),
  };
  return { notesChanged: coachReviewNotesChanged(savedPayloadJson, current) };
}

export async function buildCoachReviewPayloadForScope(accountId: number, scope: CoachReviewScope, scopeKey: string): Promise<CoachReviewPayload> {
  if (!Number.isInteger(accountId) || accountId <= 0 || !validCoachScopeKey(scope, scopeKey)) throw new Error("Invalid coach review scope.");
  const [playbook] = await db.select().from(schema.coachPlaybooks).where(eq(schema.coachPlaybooks.accountId, accountId)).limit(1);
  if (!playbook) throw new Error("Coach playbook is unavailable.");
  const trades = await loadTrades(accountId, scope, scopeKey);
  const tradeIds = trades.map((trade) => trade.id);
  const [notes, tickerNotes, executions] = await Promise.all([
    loadTradeNoteRows(accountId, tradeIds),
    loadTickerNoteRows(accountId, scope, scopeKey),
    tradeIds.length === 0 ? Promise.resolve([]) : db.select().from(schema.executions).where(inArray(schema.executions.tradeId, tradeIds)).orderBy(asc(schema.executions.executedAt), asc(schema.executions.id)),
  ]);
  const { byTradeId, byTickerKey } = noteMaps(notes, tickerNotes);
  const executionsByTradeId = new Map<number, typeof executions>();
  for (const execution of executions) if (execution.tradeId != null) executionsByTradeId.set(execution.tradeId, [...(executionsByTradeId.get(execution.tradeId) ?? []), execution]);
  const executionFactsByTradeId = new Map(trades.map((trade) => {
    const rows = executionsByTradeId.get(trade.id) ?? [];
    const facts = rows.length === 0 ? null : coachTradeExecutionFacts(analyzeTradeExecutions(trade.side, rows.map((row) => ({ id: row.id, executedAt: row.executedAt, price: row.price, quantity: row.quantity, side: row.side, posEffect: row.posEffect, brokerOrderKey: row.brokerOrderKey }))));
    return [trade.id, facts] as const;
  }));
  const opportunities = await opportunityContextsForTrades(trades.map((trade) => ({ id: trade.id, symbol: trade.symbol, side: trade.side, entryAt: trade.entryAt, exitAt: trade.exitAt, entryPrice: trade.avgEntryPrice, quantity: trade.quantity, pnl: netPnl(trade), setup: trade.setup, adverseAddTimes: executionFactsByTradeId.get(trade.id)?.adverseAdds.map((add) => add.executedAt) })));
  const tradeContexts: Omit<CoachReviewTradeContext, "ref">[] = trades.map((trade) => {
    const date = trade.entryAt == null ? "" : etDateString(trade.entryAt);
    const note = byTradeId.get(trade.id);
    const tickerNote = byTickerKey.get(`${date}:${trade.symbol}`);
    return { id: trade.id, symbol: trade.symbol, side: trade.side, quantity: trade.quantity, entryAt: trade.entryAt, exitAt: trade.exitAt, entryPrice: trade.avgEntryPrice, exitPrice: trade.avgExitPrice, pnl: netPnl(trade), setup: trade.setup, primaryLabel: note?.emotionalState ?? null, note: note?.lessons ?? null, tickerNote: tickerNote?.lessons ?? null, processTags: decodeJournalTags(note?.whatWentWell ?? null), emotionTags: decodeJournalTags(note?.whatWentWrong ?? null), executionAnalysis: executionFactsByTradeId.get(trade.id) ?? null, opportunityContext: opportunities.get(trade.id) ?? null };
  });
  return buildCoachReviewPayload({ scope, scopeKey, generatedAt: new Date().toISOString(), playbook: { title: playbook.title, body: playbook.body, rubric: playbook.rubric }, humanContext: await loadHumanContext(accountId, scope, scopeKey), deterministicFacts: buildSessionFactPack(trades), trades: tradeContexts });
}

export async function generateAndStoreCoachReview(accountId: number, scope: CoachReviewScope, scopeKey: string): Promise<{ ok: true; superseded?: boolean } | { ok: false; coachError: string; superseded?: boolean }> {
  await ensureCoachPlaybook(accountId);
  const existing = await db.select().from(schema.coachReviews).where(and(eq(schema.coachReviews.accountId, accountId), eq(schema.coachReviews.scope, scope), eq(schema.coachReviews.scopeKey, scopeKey))).limit(1).get();
  return runCoachRefresh({
    baseline: existing,
    buildPayload: () => buildCoachReviewPayloadForScope(accountId, scope, scopeKey),
    generate: generateCoachReview,
    readCurrent: async () => db.select().from(schema.coachReviews).where(and(eq(schema.coachReviews.accountId, accountId), eq(schema.coachReviews.scope, scope), eq(schema.coachReviews.scopeKey, scopeKey))).limit(1).get(),
    write: (value) => compareAndStoreReview(existing, { accountId, scope, scopeKey, ...value }),
    now: () => new Date().toISOString(),
  });
}

async function compareAndStoreReview(
  baseline: typeof schema.coachReviews.$inferSelect | undefined,
  values: { accountId: number; scope: CoachReviewScope; scopeKey: string; status: "generated" | "stale"; payloadJson: string; reviewJson: string },
): Promise<boolean> {
  if (!baseline) {
    const inserted = await db.insert(schema.coachReviews).values({ ...values, updatedAt: new Date() }).onConflictDoNothing().returning({ id: schema.coachReviews.id });
    return inserted.length === 1;
  }
  const updated = await db.update(schema.coachReviews).set({ status: values.status, payloadJson: values.payloadJson, reviewJson: values.reviewJson, updatedAt: new Date() }).where(and(
    eq(schema.coachReviews.id, baseline.id),
    eq(schema.coachReviews.payloadJson, baseline.payloadJson),
    baseline.reviewJson == null ? isNull(schema.coachReviews.reviewJson) : eq(schema.coachReviews.reviewJson, baseline.reviewJson),
  )).returning({ id: schema.coachReviews.id });
  return updated.length === 1;
}
