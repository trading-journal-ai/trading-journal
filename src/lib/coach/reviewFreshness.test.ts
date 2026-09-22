import { describe, expect, it } from "vitest";
import { coachNotesSnapshotFromPayload, coachReviewNotesChanged } from "./reviewFreshness";
import type { CoachReviewPayload } from "./payload";

const payload = {
  version: 1, scope: "week", scopeKey: "2026-06-08", generatedAt: "old",
  playbook: { title: "P", body: "B", rubric: "R" },
  humanContext: { recap: "week", intent: "", didWell: "", standardsDrift: "", emotionalState: "", dailyReflections: [{ date: "2026-06-09", recap: "day", intent: "", didWell: "", standardsDrift: "", emotionalState: "" }] },
  deterministicFacts: {} as CoachReviewPayload["deterministicFacts"], trades: [], instructions: {} as CoachReviewPayload["instructions"],
} satisfies CoachReviewPayload;

describe("coach review note freshness", () => {
  it("ignores non-note payload changes", () => {
    expect(coachReviewNotesChanged(JSON.stringify(payload), coachNotesSnapshotFromPayload({ ...payload, generatedAt: "new" }))).toBe(false);
  });
  it("detects a changed daily reflection", () => {
    const current = coachNotesSnapshotFromPayload(JSON.parse(JSON.stringify(payload)) as CoachReviewPayload);
    current.humanContext.dailyReflections![0].recap = "changed";
    expect(coachReviewNotesChanged(JSON.stringify(payload), current)).toBe(true);
  });
  it("treats invalid legacy payloads as changed", () => {
    expect(coachReviewNotesChanged("bad", coachNotesSnapshotFromPayload(payload))).toBe(true);
  });
});
