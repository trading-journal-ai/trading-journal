import type { CoachReviewHumanContext, CoachReviewPayload } from "@/lib/coach/payload";

export type CoachNotesSnapshot = {
  humanContext: CoachReviewHumanContext;
  tradeNotes: Array<{
    id: number;
    primaryLabel: string | null;
    note: string | null;
    tickerNote: string | null;
    processTags: string[];
    emotionTags: string[];
  }>;
};

function normalizedHumanContext(value: CoachReviewHumanContext): CoachReviewHumanContext {
  return {
    recap: value.recap ?? "",
    intent: value.intent ?? "",
    didWell: value.didWell ?? "",
    standardsDrift: value.standardsDrift ?? "",
    emotionalState: value.emotionalState ?? "",
    dailyReflections: [...(value.dailyReflections ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function coachNotesSnapshotFromPayload(payload: CoachReviewPayload): CoachNotesSnapshot {
  return {
    humanContext: normalizedHumanContext(payload.humanContext),
    tradeNotes: payload.trades.map((trade) => ({
      id: trade.id,
      primaryLabel: trade.primaryLabel,
      note: trade.note,
      tickerNote: trade.tickerNote ?? null,
      processTags: trade.processTags,
      emotionTags: trade.emotionTags,
    })).sort((a, b) => a.id - b.id),
  };
}

export function coachReviewNotesChanged(savedPayloadJson: string, current: CoachNotesSnapshot): boolean {
  try {
    const saved = JSON.parse(savedPayloadJson) as CoachReviewPayload;
    return JSON.stringify(coachNotesSnapshotFromPayload(saved)) !== JSON.stringify({
      humanContext: normalizedHumanContext(current.humanContext),
      tradeNotes: [...current.tradeNotes].sort((a, b) => a.id - b.id),
    });
  } catch {
    return true;
  }
}
