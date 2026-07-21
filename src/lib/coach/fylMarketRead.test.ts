import { describe, expect, it } from "vitest";
import { evaluateFylDirectionalOpportunity, evaluateFylMarketRead } from "./fylMarketRead";

describe("evaluateFylMarketRead", () => {
  it("calls aligned higher structure an uptrend", () => {
    const read = evaluateFylMarketRead({
      structure: "hh_hl",
      emaStack: "bullish",
      lastEmaCross: "bullish",
      barsSinceEmaCross: 3,
      priceVsEmaRail: "above",
      emaSlope: "rising",
      vwapRelationship: "above",
    });

    expect(read.mode).toBe("uptrend");
    expect(read.confidence).toBe("high");
    expect(read.headline).toBe("Buyers controlled the trend at entry.");
    expect(read.reasonCodes).toContain("EMA9_RECENTLY_CROSSED_ABOVE_EMA20");
  });

  it("treats EMA20 above EMA9 as a bearish vote", () => {
    const read = evaluateFylMarketRead({
      structure: "lh_ll",
      emaStack: "bearish",
      lastEmaCross: "bearish",
      barsSinceEmaCross: 2,
      priceVsEmaRail: "below",
      emaSlope: "falling",
      vwapRelationship: "below",
    });

    expect(read.mode).toBe("downtrend");
    expect(read.confidence).toBe("high");
    expect(read.headline).toBe("Sellers controlled the trend at entry.");
    expect(read.reasonCodes).toContain("EMA20_ABOVE_EMA9");
    expect(read.reasonCodes).toContain("EMA9_RECENTLY_CROSSED_BELOW_EMA20");
  });

  it("does not let an EMA cross override conflicting chart evidence", () => {
    const read = evaluateFylMarketRead({
      structure: "hh_hl",
      emaStack: "bearish",
      lastEmaCross: "bearish",
      barsSinceEmaCross: 1,
      priceVsEmaRail: "inside",
      emaSlope: "mixed",
      vwapRelationship: "above",
    });

    expect(read.mode).toBe("mixed");
    expect(read.confidence).toBe("low");
  });

  it("does not let aligned indicators turn a range into a trend", () => {
    const read = evaluateFylMarketRead({
      structure: "range",
      emaStack: "bullish",
      lastEmaCross: "bullish",
      barsSinceEmaCross: 1,
      priceVsEmaRail: "above",
      emaSlope: "rising",
      vwapRelationship: "above",
    });

    expect(read.mode).toBe("mixed");
  });

  it("withholds a trend when too little evidence is available", () => {
    const read = evaluateFylMarketRead({
      structure: null,
      emaStack: null,
      lastEmaCross: null,
      barsSinceEmaCross: null,
      priceVsEmaRail: null,
      emaSlope: null,
      vwapRelationship: "above",
    });

    expect(read.mode).toBe("insufficient_evidence");
  });

  it("separates the chart read from directional opportunity support", () => {
    const downtrend = evaluateFylMarketRead({
      structure: "lh_ll",
      emaStack: "bearish",
      lastEmaCross: "bearish",
      barsSinceEmaCross: 2,
      priceVsEmaRail: "below",
      emaSlope: "falling",
      vwapRelationship: "below",
    });

    expect(evaluateFylDirectionalOpportunity(downtrend, "long").status).toBe("contradicted");
    expect(evaluateFylDirectionalOpportunity(downtrend, "short").status).toBe("supported");
  });
});
