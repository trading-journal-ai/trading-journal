import { describe, expect, it } from "vitest";
import { planFeeEnrichment } from "./feeEnrichment";

describe("planFeeEnrichment", () => {
  it("adds late Schwab fees to a previously zero-fee execution", () => {
    expect(planFeeEnrichment({
      incomingFees: 0.25,
      incomingBreakdown: { SEC_FEE: 0.07, TAF_FEE: 0.18 },
      incomingSource: "schwab_api",
      existingFees: 0,
      existingDetails: [],
    })).toEqual({
      totalFees: 0.25,
      replaceDetails: true,
      details: [
        { feeType: "SEC_FEE", amount: 0.07 },
        { feeType: "TAF_FEE", amount: 0.18 },
      ],
    });
  });

  it("replaces broad statement buckets with broker categories", () => {
    expect(planFeeEnrichment({
      incomingFees: 0.25,
      incomingBreakdown: { SEC_FEE: 0.07, TAF_FEE: 0.18 },
      incomingSource: "schwab_api",
      existingFees: 0.25,
      existingDetails: [{
        feeType: "STATEMENT_MISC_FEES",
        amount: 0.25,
        source: "tos_csv",
      }],
    })?.replaceDetails).toBe(true);
  });

  it("does not downgrade broker categories to a statement bucket", () => {
    expect(planFeeEnrichment({
      incomingFees: 0.25,
      incomingBreakdown: { STATEMENT_MISC_FEES: 0.25 },
      incomingSource: "tos_csv",
      existingFees: 0.25,
      existingDetails: [
        { feeType: "SEC_FEE", amount: 0.07, source: "schwab_api" },
        { feeType: "TAF_FEE", amount: 0.18, source: "schwab_api" },
      ],
    })).toBeNull();
  });

  it("does not erase settled fees when a sync has no transaction details", () => {
    expect(planFeeEnrichment({
      incomingFees: 0,
      incomingBreakdown: {},
      incomingSource: "schwab_api",
      existingFees: 0.25,
      existingDetails: [
        { feeType: "SEC_FEE", amount: 0.07, source: "schwab_api" },
        { feeType: "TAF_FEE", amount: 0.18, source: "schwab_api" },
      ],
    })).toBeNull();
  });
  it("records a reported zero once without erasing earlier charges", () => {
    const input = {
      incomingFees: 0,
      incomingBreakdown: { COMMISSION: 0 },
      incomingSource: "schwab_api" as const,
      existingFees: 0,
      existingDetails: [],
    };
    expect(planFeeEnrichment(input)).toMatchObject({
      totalFees: 0, details: [{ feeType: "COMMISSION", amount: 0 }],
    });
    expect(planFeeEnrichment({ ...input, existingDetails: [
      { feeType: "COMMISSION", amount: 0, source: "schwab_api" },
    ] })).toBeNull();
    expect(planFeeEnrichment({ ...input, existingFees: 0.25 })).toBeNull();
  });

  it("retains unitemized totals and rejects non-finite incoming amounts", () => {
    const input = { incomingFees: 0.3, incomingSource: "tos_csv" as const,
      existingFees: 0, existingDetails: [] };
    expect(planFeeEnrichment(input)?.details).toEqual([
      { feeType: "REPORTED_TOTAL", amount: 0.3 },
    ]);
    expect(planFeeEnrichment({ ...input, incomingFees: Number.NaN })).toBeNull();
  });

  it("accepts positive statement charges after an API observation of zero", () => {
    expect(planFeeEnrichment({ incomingFees: 0.2, incomingBreakdown: { STATEMENT_MISC_FEES: 0.2 },
      incomingSource: "tos_csv", existingFees: 0,
      existingDetails: [{ feeType: "COMMISSION", amount: 0, source: "schwab_api" }],
    })).toMatchObject({ totalFees: 0.2, replaceDetails: true });
  });

});
