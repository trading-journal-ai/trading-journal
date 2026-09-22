import { describe, expect, it, vi } from "vitest";
import { isCoachRefreshIntent, runCoachRefresh } from "./reviewRefresh";

const prior = { payloadJson: "old payload", reviewJson: JSON.stringify({ version: 1, model: "old", generatedAt: "old", review: { dayVerdict: "old", whatMatchedPlaybook: [], whatDriftedFromPlaybook: [], keyTradeToStudy: { tradeId: null, symbol: null, reason: "" }, behaviorPattern: "", statisticalRead: "", oneExperiment: { hypothesis: "", trigger: "", action: "", scope: "", expires: "", measure: [] }, confidenceAndMissingContext: [] } }) };

describe("runCoachRefresh", () => {
  it("generates only for the explicit refresh intent", () => {
    expect(isCoachRefreshIntent("refreshCoach")).toBe(true);
    expect(isCoachRefreshIntent("save")).toBe(false);
    expect(isCoachRefreshIntent(null)).toBe(false);
  });
  it("builds before generating and writes the successful payload", async () => {
    const order: string[] = [];
    const write = vi.fn(async () => true);
    await runCoachRefresh({ baseline: prior, buildPayload: async () => { order.push("build"); return { note: "new" }; }, generate: async () => { order.push("generate"); return { model: "m", review: {} }; }, readCurrent: async () => prior, write, now: () => "now" });
    expect(order).toEqual(["build", "generate"]);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ status: "generated", payloadJson: '{"note":"new"}' }));
  });

  it("preserves the valid review snapshot on generation failure", async () => {
    const write = vi.fn(async () => true);
    const result = await runCoachRefresh({ baseline: prior, buildPayload: async () => ({ note: "new" }), generate: async () => { throw new Error("offline"); }, readCurrent: async () => prior, write, now: () => "now" });
    expect(result).toEqual({ ok: false, coachError: "offline" });
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ status: "stale", payloadJson: "old payload" }));
  });

  it("does not let an older failed refresh overwrite a newer stored result", async () => {
    const write = vi.fn(async () => true);
    const current = { payloadJson: "newer", reviewJson: "newer review" };
    const result = await runCoachRefresh({ baseline: prior, buildPayload: async () => ({ note: "old attempt" }), generate: async () => { throw new Error("late failure"); }, readCurrent: async () => current, write, now: () => "now" });
    expect(result).toEqual({ ok: false, coachError: "late failure", superseded: true });
    expect(write).not.toHaveBeenCalled();
  });

  it("reports a refresh superseded when the atomic write loses its race", async () => {
    const result = await runCoachRefresh({ baseline: prior, buildPayload: async () => ({ note: "attempt" }), generate: async () => ({ model: "m", review: {} }), readCurrent: async () => prior, write: async () => false, now: () => "now" });
    expect(result).toEqual({ ok: true, superseded: true });
  });
});
