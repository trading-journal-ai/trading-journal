import { describe, expect, it } from "vitest";
import { failedCoachReviewState } from "./reviewPersistence";

const review = {
  dayVerdict: "Review",
  whatMatchedPlaybook: [], whatDriftedFromPlaybook: [],
  keyTradeToStudy: { tradeId: null, symbol: null, reason: "None" },
  behaviorPattern: "None", statisticalRead: "None",
  oneExperiment: { hypothesis: "h", trigger: "t", action: "a", scope: "day", expires: "soon", measure: [] },
  confidenceAndMissingContext: [],
};

describe("failedCoachReviewState", () => {
  it("retains the last valid review and its payload snapshot", () => {
    const state = failedCoachReviewState({ payloadJson: "old payload", reviewJson: JSON.stringify({ version: 1, model: "m", generatedAt: "old", review }) }, "new payload", "offline", "now");
    expect(state.payloadJson).toBe("old payload");
    expect(JSON.parse(state.reviewJson)).toMatchObject({ model: "m", generatedAt: "old", review, error: "offline", errorAt: "now" });
  });

  it("records the attempted payload when there is no valid prior review", () => {
    const state = failedCoachReviewState(undefined, "new payload", "offline", "now");
    expect(state.payloadJson).toBe("new payload");
    expect(JSON.parse(state.reviewJson)).toEqual({ version: 1, generatedAt: "now", error: "offline" });
  });
});
