import { parseCoachStoredReview } from "@/lib/coach/generatedReview";

export function failedCoachReviewState(
  existing: { payloadJson: string; reviewJson: string | null } | undefined,
  attemptedPayloadJson: string,
  coachError: string,
  attemptedAt: string,
) {
  const stored = parseCoachStoredReview(existing?.reviewJson ?? null);
  if (stored != null && "review" in stored && existing) {
    return {
      payloadJson: existing.payloadJson,
      reviewJson: JSON.stringify({ ...stored, error: coachError, errorAt: attemptedAt }),
    };
  }
  return {
    payloadJson: attemptedPayloadJson,
    reviewJson: JSON.stringify({ version: 1, generatedAt: attemptedAt, error: coachError }),
  };
}
