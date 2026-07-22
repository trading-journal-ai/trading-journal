import type { SessionFactPack } from "@/lib/coach/reviewEngine";
import type { TradeOpportunityContext } from "@/lib/coach/opportunityContext";
import type { CoachTradeExecutionFacts } from "@/lib/executionAnalysis";

export type CoachReviewTradeContext = {
  id: number;
  /** Human-facing citation for prose, e.g. "ADVB #19097". Ticker + trade id so a
   * reference never reads as a bare number the reader mistakes for a timestamp. */
  ref: string;
  symbol: string;
  side: string;
  quantity: number;
  entryAt: number | null;
  exitAt: number | null;
  entryPrice: number | null;
  exitPrice: number | null;
  pnl: number | null;
  setup: string | null;
  primaryLabel: string | null;
  note: string | null;
  processTags: string[];
  emotionTags: string[];
  executionAnalysis: CoachTradeExecutionFacts | null;
  /** Chart-evidence entry read (fills × candles); null when not computable. */
  opportunityContext: TradeOpportunityContext | null;
};

export type CoachReviewHumanContext = {
  recap: string;
  intent: string;
  didWell: string;
  standardsDrift: string;
  emotionalState: string;
};

export type CoachReviewPlaybookContext = {
  title: string;
  body: string;
  rubric: string;
};

export type CoachReviewPayload = {
  version: 1;
  scope: "day" | "week" | "month";
  scopeKey: string;
  generatedAt: string;
  playbook: CoachReviewPlaybookContext;
  humanContext: CoachReviewHumanContext;
  deterministicFacts: SessionFactPack;
  trades: CoachReviewTradeContext[];
  instructions: {
    role: string;
    numericBoundary: string;
    tradeReference: string;
    outputContract: string[];
  };
};

/**
 * Round every number in the payload before it reaches the LLM: raw floats
 * ("-102.90049999999985") otherwise get echoed verbatim under the numeric
 * boundary. One decimal by default; two for prices and sub-1 fractions
 * (win rates, capture ratios) where a tenth would erase the meaning.
 */
const TWO_DECIMAL_KEYS = new Set(["entryPrice", "exitPrice", "price", "averageEntryBefore"]);

function roundNumbersDeep(value: unknown, key?: string): unknown {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Number.isInteger(value)) return value;
    const decimals = (key != null && TWO_DECIMAL_KEYS.has(key)) || Math.abs(value) < 1 ? 2 : 1;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
  if (Array.isArray(value)) return value.map((item) => roundNumbersDeep(item));
  if (value != null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, roundNumbersDeep(v, k)]),
    );
  }
  return value;
}

export function buildCoachReviewPayload({
  scope,
  scopeKey,
  generatedAt,
  playbook,
  humanContext,
  deterministicFacts,
  trades,
}: {
  scope: CoachReviewPayload["scope"];
  scopeKey: string;
  generatedAt: string;
  playbook: CoachReviewPlaybookContext;
  humanContext: CoachReviewHumanContext;
  deterministicFacts: SessionFactPack;
  trades: Omit<CoachReviewTradeContext, "ref">[];
}): CoachReviewPayload {
  const tradesWithRef = trades.map((trade) => ({
    ...trade,
    ref: `${trade.symbol} #${trade.id}`,
  }));

  return {
    version: 1,
    scope,
    scopeKey,
    generatedAt,
    playbook,
    humanContext,
    deterministicFacts: roundNumbersDeep(deterministicFacts) as SessionFactPack,
    trades: roundNumbersDeep(tradesWithRef) as CoachReviewTradeContext[],
    instructions: {
      role: "Post-trade review coach. Review completed trades only. Do not give live trade calls.",
      numericBoundary: "Use deterministicFacts, trades[].executionAnalysis, and trades[].opportunityContext for every number. Do not calculate, infer, or modify numeric claims. opportunityContext.atEntry contains only facts knowable at entry; opportunityContext.postTrade is hindsight and must never be used to grade the entry decision.",
      tradeReference: "When citing an individual trade in prose, use its trades[].ref value (ticker and trade number, e.g. \"ADVB #19097\"). Never write a trade's raw numeric id on its own — a bare number reads as a timestamp.",
      outputContract: [
        "dayVerdict",
        "whatMatchedPlaybook",
        "whatDriftedFromPlaybook",
        "keyTradeToStudy",
        "behaviorPattern",
        "statisticalRead",
        "oneExperiment",
        "confidenceAndMissingContext",
      ],
    },
  };
}
