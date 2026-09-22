import { describe, expect, it } from "vitest";
import { coachScopeDateRange, validCoachScopeKey } from "./reviewService";

describe("coach review scope", () => {
  it("rejects impossible dates and months", () => {
    expect(validCoachScopeKey("day", "2026-02-30")).toBe(false);
    expect(validCoachScopeKey("week", "2026-13-01")).toBe(false);
    expect(validCoachScopeKey("month", "2026-00")).toBe(false);
  });

  it("bounds a week to five session dates", () => {
    expect(coachScopeDateRange("week", "2026-06-08")).toMatchObject({ from: "2026-06-08", to: "2026-06-12" });
  });

  it("bounds a month to its actual final day", () => {
    expect(coachScopeDateRange("month", "2028-02")).toMatchObject({ from: "2028-02-01", to: "2028-02-29" });
  });
});
