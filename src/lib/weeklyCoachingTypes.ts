/** Compact, server-computed evidence shared by the weekly recap components. */
export type WeeklyCoachingTradeLink = { id: number; symbol: string; date: string };
export type WeeklyCoachingFinding = {
  id: string;
  read: string;
  evidence: string;
  question?: string;
  confidence: "observation" | "developing";
  trades: WeeklyCoachingTradeLink[];
};
export type WeeklyCoaching = {
  scope: {
    includedTrades: number;
    activityTrades: number;
    excludedTrades: number;
    sessions: number;
    unknownFeeTrades: number;
    description: string;
  };
  baseline: { trades: number; sessions: number; label: string };
  groups: { label: string; rows: { label: string; value: string; detail?: string }[] }[];
  findings: WeeklyCoachingFinding[];
};
export type WeeklyMarketReview = {
  matchedPnl?: number | null;
  status: "available" | "partial" | "unavailable";
  summary: string;
  detail: string;
  days: {
    date: string;
    coverage: string;
    eligibleMovers: number | null;
    tradedSymbols: string[];
    leaders: { symbol: string; peakGainPercent: number | null; traded: boolean }[];
    source: string;
  }[];
  note: string;
};
