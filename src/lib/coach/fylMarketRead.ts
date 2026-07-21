import type { ConfidenceLabel } from "@/lib/coach/reviewEngine";

export const FYL_MARKET_READ_VERSION = "fyl-market-read-v1" as const;

export type FylMarketMode = "uptrend" | "downtrend" | "mixed" | "insufficient_evidence";

export type FylReasonCode =
  | "STRUCTURE_HIGHER_HIGHS_HIGHER_LOWS"
  | "STRUCTURE_LOWER_HIGHS_LOWER_LOWS"
  | "EMA9_ABOVE_EMA20"
  | "EMA20_ABOVE_EMA9"
  | "EMA9_RECENTLY_CROSSED_ABOVE_EMA20"
  | "EMA9_RECENTLY_CROSSED_BELOW_EMA20"
  | "EMA_RAIL_RISING"
  | "EMA_RAIL_FALLING"
  | "PRICE_ABOVE_EMA_RAIL"
  | "PRICE_BELOW_EMA_RAIL"
  | "PRICE_ABOVE_VWAP"
  | "PRICE_BELOW_VWAP";

export type FylMarketReadInput = {
  structure: "hh_hl" | "lh_ll" | "compression" | "range" | "transitioning" | null;
  emaStack: "bullish" | "bearish" | "touching" | null;
  lastEmaCross: "bullish" | "bearish" | null;
  barsSinceEmaCross: number | null;
  priceVsEmaRail: "above" | "inside" | "below" | null;
  emaSlope: "rising" | "falling" | "mixed" | "flat" | null;
  vwapRelationship: "above" | "below" | "at" | null;
};

export type FylMarketRead = {
  mode: FylMarketMode;
  confidence: ConfidenceLabel;
  headline: string;
  bullishVotes: number;
  bearishVotes: number;
  evidenceCount: number;
  reasonCodes: FylReasonCode[];
  calculationVersion: typeof FYL_MARKET_READ_VERSION;
};

export type FylOpportunityStatus = "supported" | "contradicted" | "insufficient_evidence";

export type FylDirectionalOpportunity = {
  status: FylOpportunityStatus;
  headline: string;
  calculationVersion: typeof FYL_MARKET_READ_VERSION;
};

const RECENT_CROSS_BARS = 5;

/**
 * Translate causal chart facts into the first FYL trend read. This is a
 * versioned rule prior, not a P&L-trained model. Indicators vote on structure;
 * no single cross is allowed to declare a trend by itself.
 */
export function evaluateFylMarketRead(input: FylMarketReadInput): FylMarketRead {
  let bullishVotes = 0;
  let bearishVotes = 0;
  let evidenceCount = 0;
  const reasonCodes: FylReasonCode[] = [];

  if (input.structure != null) {
    evidenceCount += 1;
    if (input.structure === "hh_hl") {
      bullishVotes += 1;
      reasonCodes.push("STRUCTURE_HIGHER_HIGHS_HIGHER_LOWS");
    } else if (input.structure === "lh_ll") {
      bearishVotes += 1;
      reasonCodes.push("STRUCTURE_LOWER_HIGHS_LOWER_LOWS");
    }
  }

  if (input.emaStack != null) {
    evidenceCount += 1;
    if (input.emaStack === "bullish") {
      bullishVotes += 1;
      reasonCodes.push("EMA9_ABOVE_EMA20");
    } else if (input.emaStack === "bearish") {
      bearishVotes += 1;
      reasonCodes.push("EMA20_ABOVE_EMA9");
    }
  }

  if (input.priceVsEmaRail != null) {
    evidenceCount += 1;
    if (input.priceVsEmaRail === "above") {
      bullishVotes += 1;
      reasonCodes.push("PRICE_ABOVE_EMA_RAIL");
    } else if (input.priceVsEmaRail === "below") {
      bearishVotes += 1;
      reasonCodes.push("PRICE_BELOW_EMA_RAIL");
    }
  }

  if (input.emaSlope != null) {
    evidenceCount += 1;
    if (input.emaSlope === "rising") {
      bullishVotes += 1;
      reasonCodes.push("EMA_RAIL_RISING");
    } else if (input.emaSlope === "falling") {
      bearishVotes += 1;
      reasonCodes.push("EMA_RAIL_FALLING");
    }
  }

  if (input.vwapRelationship != null) {
    evidenceCount += 1;
    if (input.vwapRelationship === "above") {
      bullishVotes += 1;
      reasonCodes.push("PRICE_ABOVE_VWAP");
    } else if (input.vwapRelationship === "below") {
      bearishVotes += 1;
      reasonCodes.push("PRICE_BELOW_VWAP");
    }
  }

  if (input.barsSinceEmaCross != null && input.barsSinceEmaCross <= RECENT_CROSS_BARS) {
    if (input.lastEmaCross === "bullish") {
      reasonCodes.push("EMA9_RECENTLY_CROSSED_ABOVE_EMA20");
    } else if (input.lastEmaCross === "bearish") {
      reasonCodes.push("EMA9_RECENTLY_CROSSED_BELOW_EMA20");
    }
  }

  const voteDifference = bullishVotes - bearishVotes;
  let mode: FylMarketMode;
  if (evidenceCount < 2 || input.structure == null) {
    mode = "insufficient_evidence";
  } else if (input.structure === "hh_hl" && bullishVotes >= 2 && voteDifference >= 2) {
    mode = "uptrend";
  } else if (input.structure === "lh_ll" && bearishVotes >= 2 && voteDifference <= -2) {
    mode = "downtrend";
  } else {
    mode = "mixed";
  }

  const leadingVotes = Math.max(bullishVotes, bearishVotes);
  const opposingVotes = Math.min(bullishVotes, bearishVotes);
  const confidence: ConfidenceLabel = mode === "insufficient_evidence" || mode === "mixed"
    ? "low"
    : leadingVotes >= 3 && opposingVotes === 0
      ? "high"
      : "medium";

  const headline = mode === "uptrend"
    ? "Buyers controlled the trend at entry."
    : mode === "downtrend"
      ? "Sellers controlled the trend at entry."
      : mode === "mixed"
        ? "The chart was giving mixed signals at entry."
        : "There was not enough chart evidence to call the trend at entry.";

  return {
    mode,
    confidence,
    headline,
    bullishVotes,
    bearishVotes,
    evidenceCount,
    reasonCodes,
    calculationVersion: FYL_MARKET_READ_VERSION,
  };
}

/** Compare the frozen market read with the broker-recorded trade direction. */
export function evaluateFylDirectionalOpportunity(
  read: FylMarketRead,
  side: "long" | "short",
): FylDirectionalOpportunity {
  const aligned = (side === "long" && read.mode === "uptrend")
    || (side === "short" && read.mode === "downtrend");
  const opposed = (side === "long" && read.mode === "downtrend")
    || (side === "short" && read.mode === "uptrend");

  if (aligned) {
    return {
      status: "supported",
      headline: `The ${side} direction fit the chart.`,
      calculationVersion: FYL_MARKET_READ_VERSION,
    };
  }
  if (opposed) {
    return {
      status: "contradicted",
      headline: `The ${side} direction was fighting the chart.`,
      calculationVersion: FYL_MARKET_READ_VERSION,
    };
  }
  return {
    status: "insufficient_evidence",
    headline: `The chart did not give enough agreement to support the ${side} direction.`,
    calculationVersion: FYL_MARKET_READ_VERSION,
  };
}
