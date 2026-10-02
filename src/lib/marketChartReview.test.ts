import { describe, expect, it } from "vitest";
import { parseReviewDraft, validateReviewDay, visibleReviewObservations, type ReviewDraft, type ReviewObservation } from "./marketChartReview";
import type { CurlDay } from "./marketInsights";
const draft: ReviewDraft = { kind: "curl", startT: 60, endT: 120, low: 4, high: 5, reason: "Higher low with expanding range", mode: "replay", cutoffT: 120, seenThroughT: 120 };
const item: ReviewObservation = { ...draft, id: "a", at: "2026-10-02", sourceHash: "fixture" };
const day: CurlDay = { id: "TEST-2026-10-02", sym: "TEST", date: "2026-10-02", pc: 4, curls: [], zones: [], priceZones: [], bars: [60,120,180].map((t) => [t,4,5,3,4,100]) };
describe("review evidence boundary", () => {
  it("hides observations until the review cutoff, not merely their marked candle", () => {
    expect(visibleReviewObservations([item], "replay", 60)).toEqual([]);
    expect(visibleReviewObservations([item], "replay", 120)).toEqual([item]);
  });
  it("never exposes hindsight or future-informed observations in earlier replay", () => {
    const later = { ...item, seenThroughT: 180 };
    const hindsight = { ...item, mode: "hindsight" as const };
    expect(visibleReviewObservations([later, hindsight], "replay", 120)).toEqual([]);
    expect(visibleReviewObservations([later, hindsight], "replay", 180)).toEqual([later]);
    expect(visibleReviewObservations([later, hindsight], "hindsight", 180)).toHaveLength(2);
  });
  it("retains removed evidence but excludes it from overlays", () => {
    expect(visibleReviewObservations([{ ...item, removedAt: "now" }], "hindsight", 180)).toEqual([]);
  });
  it("accepts point observations and trims reasons", () => {
    expect(parseReviewDraft({ ...draft, kind: "entry", endT: 60, high: 4, reason: "  rejection  " }).reason).toBe("rejection");
  });
  it.each([{ kind: "unknown" }, { reason: " " }, { reason: "x".repeat(1001) }, { high: 3 }, { low: Infinity }, { endT: 180 }, { seenThroughT: 60 }, { cutoffT: 120.5 }, { startT: 180 }, { mode: "live" }])("rejects invalid evidence %j", (change) => {
    expect(() => parseReviewDraft({ ...draft, ...change })).toThrow();
  });
  it("requires real candle timestamps and a complete-day hindsight cutoff", () => {
    expect(() => validateReviewDay(draft, day)).not.toThrow();
    expect(() => validateReviewDay({ ...draft, startT: 61 }, day)).toThrow();
    expect(() => validateReviewDay({ ...draft, mode: "hindsight" }, day)).toThrow();
  });
});
