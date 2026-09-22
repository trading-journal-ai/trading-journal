import { failedCoachReviewState } from "@/lib/coach/reviewPersistence";

export type StoredCoachRevision = { payloadJson: string; reviewJson: string | null };

export function isCoachRefreshIntent(value: FormDataEntryValue | null): boolean {
  return value === "refreshCoach";
}

export function sameCoachRevision(a: StoredCoachRevision | undefined, b: StoredCoachRevision | undefined) {
  return a?.payloadJson === b?.payloadJson && a?.reviewJson === b?.reviewJson;
}

export async function runCoachRefresh<TPayload, TResult extends { model: string; review: unknown }>({
  baseline,
  buildPayload,
  generate,
  readCurrent,
  write,
  now,
}: {
  baseline: StoredCoachRevision | undefined;
  buildPayload: () => Promise<TPayload>;
  generate: (payload: TPayload) => Promise<TResult>;
  readCurrent: () => Promise<StoredCoachRevision | undefined>;
  write: (value: { status: "generated" | "stale"; payloadJson: string; reviewJson: string }) => Promise<boolean>;
  now: () => string;
}): Promise<{ ok: true; superseded?: boolean } | { ok: false; coachError: string; superseded?: boolean }> {
  const attemptedAt = now();
  let payloadJson = baseline?.payloadJson ?? "{}";
  try {
    const payload = await buildPayload();
    payloadJson = JSON.stringify(payload);
    const result = await generate(payload);
    if (!sameCoachRevision(baseline, await readCurrent())) return { ok: true, superseded: true };
    if (!await write({ status: "generated", payloadJson, reviewJson: JSON.stringify({ version: 1, model: result.model, generatedAt: attemptedAt, review: result.review }) })) return { ok: true, superseded: true };
    return { ok: true };
  } catch (error) {
    const coachError = error instanceof Error ? error.message : "Coach generation failed.";
    if (!sameCoachRevision(baseline, await readCurrent())) return { ok: false, coachError, superseded: true };
    if (!await write({ status: "stale", ...failedCoachReviewState(baseline, payloadJson, coachError, attemptedAt) })) return { ok: false, coachError, superseded: true };
    return { ok: false, coachError };
  }
}
