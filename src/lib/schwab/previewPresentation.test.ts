import { describe, expect, it } from "vitest";
import { schwabPreviewPresentation } from "./previewPresentation";

describe("schwabPreviewPresentation", () => {
  it("treats a duplicate-only preview as already imported", () => {
    expect(schwabPreviewPresentation({
      executionsFound: 86,
      newExecutions: 0,
      reviewExecutions: 0,
    })).toBe("already_imported");
  });

  it("distinguishes an empty broker response from duplicates", () => {
    expect(schwabPreviewPresentation({
      executionsFound: 0,
      newExecutions: 0,
      reviewExecutions: 0,
    })).toBe("no_trades");
  });

  it("surfaces unmatched historical fills without treating them as new", () => {
    expect(schwabPreviewPresentation({
      executionsFound: 86,
      newExecutions: 0,
      reviewExecutions: 1,
    })).toBe("needs_review");
  });

  it("keeps the full preview when there is something new to import", () => {
    expect(schwabPreviewPresentation({
      executionsFound: 86,
      newExecutions: 12,
      reviewExecutions: 1,
    })).toBe("new_executions");
  });
});
