import { describe, expect, it } from "vitest";
import { addFeeAmount, executionFeeEntries, feeReportingStatus, scaledFeeBreakdown } from "./fees";

describe("broker fee observations", () => {
  it("distinguishes explicit zero from unavailable data", () => {
    expect(feeReportingStatus(0, {})).toBe("unknown");
    expect(feeReportingStatus(0, { COMMISSION: 0 })).toBe("reported");
    expect(executionFeeEntries(0.4, {})).toEqual([["REPORTED_TOTAL", 0.4]]);
    expect(scaledFeeBreakdown({ COMMISSION: 0, SEC_FEE: 0.2 }, 2))
      .toEqual({ COMMISSION: 0, SEC_FEE: 0.1 });
  });

  it("retains reported categories and ignores missing or malformed observations", () => {
    const details = {};
    addFeeAmount(details, "commission", 0);
    addFeeAmount(details, "sec fee", -0.2);
    addFeeAmount(details, "missing", null);
    addFeeAmount(details, "malformed", Number.NaN);
    expect(details).toEqual({ COMMISSION: 0, SEC_FEE: 0.2 });
  });
});
