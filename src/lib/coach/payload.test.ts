import { describe, expect, it } from "vitest";
import { buildSessionFactPack } from "./reviewEngine";
import { buildCoachReviewPayload } from "./payload";

describe("buildCoachReviewPayload", () => {
  it("preserves deterministic facts and numeric-boundary instructions", () => {
    const deterministicFacts = buildSessionFactPack([
      {
        id: 1,
        symbol: "TEST",
        side: "long",
        quantity: 100,
        avgEntryPrice: 10,
        avgExitPrice: 11,
        fees: 0,
        entryAt: 1000,
        exitAt: 1300,
      },
    ]);

    const payload = buildCoachReviewPayload({
      scope: "day",
      scopeKey: "2026-06-08",
      generatedAt: "2026-06-08T21:00:00.000Z",
      playbook: {
        title: "Test Playbook",
        body: "Trade only clean pullbacks.",
        rubric: "Risk definition: strong / mixed / weak / unknown",
      },
      humanContext: {
        recap: "Green day, but one chase.",
        intent: "Trade pullbacks.",
        didWell: "Waited for confirmation.",
        standardsDrift: "One late entry.",
        emotionalState: "Calm",
      },
      deterministicFacts,
      trades: [{
        id: 1,
        symbol: "TEST",
        side: "long",
        quantity: 100,
        entryAt: 1000,
        exitAt: 1300,
        entryPrice: 10,
        exitPrice: 11,
        pnl: 100,
        setup: null,
        primaryLabel: "Best setup",
        note: "Clean entry.",
        processTags: ["Followed plan"],
        emotionTags: ["Calm"],
        executionAnalysis: null,
      }],
    });

    expect(payload.version).toBe(1);
    expect(payload.deterministicFacts.session.netPnl).toBe(100);
    expect(payload.instructions.numericBoundary).toContain("deterministicFacts");
    expect(payload.instructions.numericBoundary).toContain("executionAnalysis");
    expect(payload.instructions.outputContract).toContain("oneExperiment");
  });
});
