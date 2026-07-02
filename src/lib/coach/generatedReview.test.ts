import { describe, expect, it } from "vitest";
import { parseCoachGeneratedReview, parseCoachStoredReview } from "./generatedReview";

const validReview = {
  dayVerdict: "Process was mixed: good patience early, weaker discipline late.",
  whatMatchedPlaybook: ["Waited for pullback confirmation."],
  whatDriftedFromPlaybook: ["Added after the best entry had passed."],
  keyTradeToStudy: {
    tradeId: 12,
    symbol: "TEST",
    reason: "It shows the clearest gap between thesis and execution.",
  },
  behaviorPattern: "Strong first decision, then looser follow-up decisions.",
  statisticalRead: "Use deterministicFacts: net P&L and win rate came from the payload.",
  oneExperiment: {
    hypothesis: "Late adds are reducing session quality.",
    trigger: "After first realized win",
    action: "Require a fresh setup note before any add.",
    scope: "Next three sessions",
    expires: "2026-07-09",
    measure: ["Late add count", "P&L after first win"],
  },
  confidenceAndMissingContext: ["Needs cleaner setup labels."],
};

describe("parseCoachGeneratedReview", () => {
  it("accepts the expected review contract", () => {
    expect(parseCoachGeneratedReview(validReview).oneExperiment.action).toContain("fresh setup");
  });

  it("rejects malformed review JSON", () => {
    expect(() => parseCoachGeneratedReview({ ...validReview, whatMatchedPlaybook: "nope" })).toThrow(
      "expected review contract",
    );
  });
});

describe("parseCoachStoredReview", () => {
  it("parses stored generated reviews", () => {
    const stored = parseCoachStoredReview(JSON.stringify({
      version: 1,
      model: "gpt-5.5",
      generatedAt: "2026-07-02T17:00:00.000Z",
      review: validReview,
    }));

    expect(stored && "review" in stored ? stored.review.dayVerdict : null).toContain("mixed");
  });

  it("parses stored generation errors", () => {
    const stored = parseCoachStoredReview(JSON.stringify({
      version: 1,
      generatedAt: "2026-07-02T17:00:00.000Z",
      error: "OPENAI_API_KEY is not set in .env.local.",
    }));

    expect(stored && "error" in stored ? stored.error : null).toContain("OPENAI_API_KEY");
  });
});
