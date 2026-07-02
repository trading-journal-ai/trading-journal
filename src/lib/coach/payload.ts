import type { SessionFactPack } from "@/lib/coach/reviewEngine";

export type CoachReviewTradeContext = {
  id: number;
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
    outputContract: string[];
  };
};

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
  trades: CoachReviewTradeContext[];
}): CoachReviewPayload {
  return {
    version: 1,
    scope,
    scopeKey,
    generatedAt,
    playbook,
    humanContext,
    deterministicFacts,
    trades,
    instructions: {
      role: "Post-trade review coach. Review completed trades only. Do not give live trade calls.",
      numericBoundary: "Use deterministicFacts for every number. Do not calculate, infer, or modify numeric claims.",
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
