import type { CurlDay } from "@/lib/marketInsights";

export const REVIEW_KINDS = [
  { value: "advance", label: "Advance" }, { value: "pullback", label: "Pullback" },
  { value: "consolidation", label: "Consolidation" }, { value: "chop", label: "Chop" },
  { value: "curl", label: "Curl" }, { value: "support", label: "Support" },
  { value: "resistance", label: "Resistance" }, { value: "entry", label: "Entry opportunity" },
  { value: "exit", label: "Exit opportunity" },
] as const;
export type ReviewKind = typeof REVIEW_KINDS[number]["value"];
export type ReviewObservation = {
  id: string; kind: ReviewKind; startT: number; endT: number; low: number; high: number;
  reason: string; mode: "replay" | "hindsight"; cutoffT: number; seenThroughT: number;
  at: string; sourceHash: string; removedAt?: string;
};
export type ReviewDraft = Omit<ReviewObservation, "id" | "at" | "sourceHash" | "removedAt">;

export function parseReviewDraft(value: unknown): ReviewDraft {
  if (!value || typeof value !== "object") throw new Error("Choose an observation to save.");
  const v = value as Record<string, unknown>;
  if (!REVIEW_KINDS.some((k) => k.value === v.kind)) throw new Error("Choose an observation type.");
  if (v.mode !== "replay" && v.mode !== "hindsight") throw new Error("Choose a review mode.");
  for (const key of ["startT", "endT", "cutoffT", "seenThroughT"] as const) {
    if (typeof v[key] !== "number" || !Number.isSafeInteger(v[key]) || v[key] <= 0) throw new Error("Choose valid candle times.");
  }
  if (typeof v.low !== "number" || typeof v.high !== "number" || !Number.isFinite(v.low) || !Number.isFinite(v.high) || v.low <= 0 || v.high < v.low) throw new Error("Choose valid prices.");
  if (typeof v.reason !== "string" || !v.reason.trim() || v.reason.length > 1000) throw new Error("Add a reason (up to 1,000 characters).");
  const draft = v as ReviewDraft;
  if (draft.startT > draft.endT || draft.endT > draft.cutoffT || draft.seenThroughT < draft.cutoffT) throw new Error("The observation must fit within the visible candles.");
  return { kind: draft.kind, startT: draft.startT, endT: draft.endT, low: draft.low, high: draft.high,
    reason: draft.reason.trim(), mode: draft.mode, cutoffT: draft.cutoffT, seenThroughT: draft.seenThroughT };
}

export function validateReviewDay(draft: ReviewDraft, day: CurlDay) {
  const times = new Set(day.bars.map((b) => b[0]));
  if (![draft.startT, draft.endT, draft.cutoffT, draft.seenThroughT].every((t) => times.has(t))) throw new Error("Observation times must belong to this day.");
  if (draft.mode === "hindsight" && draft.cutoffT !== day.bars.at(-1)?.[0]) throw new Error("Hindsight review must include the whole day.");
}

/** No full-day detector features or hindsight annotations cross the replay boundary. */
export function visibleReviewObservations(items: ReviewObservation[], mode: "replay" | "hindsight", cutoffT: number) {
  return items.filter((item) => !item.removedAt && (mode === "hindsight" ||
    (item.mode === "replay" && item.cutoffT <= cutoffT && item.seenThroughT <= cutoffT)));
}
