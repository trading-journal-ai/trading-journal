import { netPnl, type TradeLike } from "@/lib/pnl";
import { MARKET_TZ, timeZoneParts } from "@/lib/time";

const TAIL_FRACTION = 0.05;
const RETENTION_BOUNDARY = 0.3;
const WIN_RATE_TREND_THRESHOLD = 0.02;
const EXPECTANCY_TREND_THRESHOLD = 0.02;
const PROFIT_FACTOR_TREND_THRESHOLD = 0.1;

export type ReviewTradeInput = TradeLike & {
  id: number | string;
  symbol: string;
  entryAt: number | null;
  exitAt: number | null;
  stopLoss?: number | null;
  setup?: string | null;
};

export type SegmentFact = {
  key: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  winRate: number | null;
};

export type DistributionLabel =
  | "no closed trades"
  | "flat session"
  | "outlier-carried green"
  | "top-heavy green"
  | "broad green"
  | "tail-caused red"
  | "bottom-heavy red"
  | "broad-based red";

export type ConfidenceLabel = "low" | "medium" | "high";

export type SurpriseCandidate = {
  key: string;
  title: string;
  description: string;
  economicImpact: number;
  contradictionStrength: number;
  sampleSupport: number;
  score: number;
  evidence: string[];
};

export type StarterExperiment = {
  hypothesis: string;
  trigger: string;
  action: string;
  scope: string;
  expires: string;
  measure: string[];
};

export type TrendSignal = {
  key: "win_rate" | "expectancy" | "profit_factor" | "net";
  label: string;
  current: number | null;
  baseline: number | null;
  delta: number | null;
  vote: -1 | 0 | 1;
};

export type SessionFactPack = {
  session: {
    trades: number;
    netPnl: number;
    grossWins: number;
    grossLosses: number;
    winRate: number | null;
    profitFactor: number | null;
    avgWinner: number | null;
    avgLoser: number | null;
    payoffRatio: number | null;
    breakevenWinRate: number | null;
    winRateMargin: number | null;
    expectancyPerTrade: number | null;
    totalR: number | null;
    expectancyR: number | null;
    rCoverage: number;
  };
  robustness: {
    trimTailCount: number;
    trimOneNetPnl: number | null;
    trimTailNetPnl: number | null;
    retention: number | null;
    distributionLabel: DistributionLabel;
  };
  segments: {
    byTicker: SegmentFact[];
    byTimeWindow: SegmentFact[];
    byPriceBand: SegmentFact[];
  };
  history: {
    baselineLabel: string;
    baselineTrades: number;
    trendLabel: "improvement" | "deterioration" | "mixed" | "insufficient baseline";
    signals: TrendSignal[];
  };
  mechanism: {
    key: string;
    label: string;
    evidence: string[];
  };
  surprises: SurpriseCandidate[];
  experiment: StarterExperiment;
  confidence: {
    label: ConfidenceLabel;
    score: number;
    sampleSize: number;
    riskModel: "r-multiple" | "dollar-fallback";
    limitations: string[];
  };
};

type BuildSessionFactPackOptions = {
  baselineTrades?: ReviewTradeInput[];
  baselineLabel?: string;
};

type AnalyzedTrade = {
  id: string;
  symbol: string;
  entryAt: number | null;
  exitAt: number | null;
  avgEntryPrice: number | null;
  pnl: number;
  rMultiple: number | null;
};

type SessionMetrics = {
  trades: number;
  netPnl: number;
  grossWins: number;
  grossLosses: number;
  winRate: number | null;
  profitFactor: number | null;
  avgWinner: number | null;
  avgLoser: number | null;
  payoffRatio: number | null;
  breakevenWinRate: number | null;
  winRateMargin: number | null;
  expectancyPerTrade: number | null;
  totalR: number | null;
  expectancyR: number | null;
  rCoverage: number;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

function formatMoney(value: number): string {
  const signPrefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${signPrefix}$${Math.abs(value).toFixed(2)}`;
}

function riskDollarsForTrade(trade: ReviewTradeInput): number | null {
  if (trade.avgEntryPrice == null || trade.stopLoss == null) return null;
  const riskPerShare = Math.abs(trade.avgEntryPrice - trade.stopLoss);
  if (riskPerShare <= 0 || trade.quantity === 0) return null;
  return riskPerShare * Math.abs(trade.quantity);
}

function analyzeTrades(trades: ReviewTradeInput[]): AnalyzedTrade[] {
  return trades.flatMap((trade) => {
    const pnl = netPnl(trade);
    if (pnl == null) return [];
    const riskDollars = riskDollarsForTrade(trade);

    return [{
      id: String(trade.id),
      symbol: trade.symbol,
      entryAt: trade.entryAt,
      exitAt: trade.exitAt,
      avgEntryPrice: trade.avgEntryPrice,
      pnl,
      rMultiple: riskDollars == null ? null : pnl / riskDollars,
    }];
  });
}

function trimNetPnl(pnls: number[], eachTailCount: number): number | null {
  if (pnls.length === 0) return null;
  if (eachTailCount <= 0) return pnls.reduce((sum, value) => sum + value, 0);
  if (pnls.length <= eachTailCount * 2) return null;

  return [...pnls]
    .sort((a, b) => a - b)
    .slice(eachTailCount, pnls.length - eachTailCount)
    .reduce((sum, value) => sum + value, 0);
}

function classifyDistribution(pnls: number[]): SessionFactPack["robustness"] {
  const trades = pnls.length;
  const baseline = pnls.reduce((sum, value) => sum + value, 0);
  const trimTailCount = trades === 0 ? 0 : Math.ceil(trades * TAIL_FRACTION);
  const trimOneNetPnl = trimNetPnl(pnls, 1);
  const trimTailNetPnl = trimNetPnl(pnls, trimTailCount);
  const availableTrims = [trimOneNetPnl, trimTailNetPnl].filter((value): value is number => value != null);

  if (trades === 0) {
    return {
      trimTailCount,
      trimOneNetPnl,
      trimTailNetPnl,
      retention: null,
      distributionLabel: "no closed trades",
    };
  }

  if (baseline === 0 || availableTrims.length === 0) {
    return {
      trimTailCount,
      trimOneNetPnl,
      trimTailNetPnl,
      retention: baseline === 0 ? null : 1,
      distributionLabel: baseline === 0 ? "flat session" : baseline > 0 ? "broad green" : "broad-based red",
    };
  }

  if (baseline > 0) {
    const retainedNet = Math.min(...availableTrims);
    const retention = retainedNet / baseline;
    const distributionLabel =
      retainedNet <= 0
        ? "outlier-carried green"
        : retention < RETENTION_BOUNDARY
          ? "top-heavy green"
          : "broad green";

    return {
      trimTailCount,
      trimOneNetPnl,
      trimTailNetPnl,
      retention: rounded(retention),
      distributionLabel,
    };
  }

  const retainedNet = Math.max(...availableTrims);
  const retention = Math.abs(retainedNet) / Math.abs(baseline);
  const distributionLabel =
    retainedNet >= 0
      ? "tail-caused red"
      : retention < RETENTION_BOUNDARY
        ? "bottom-heavy red"
        : "broad-based red";

  return {
    trimTailCount,
    trimOneNetPnl,
    trimTailNetPnl,
    retention: rounded(retention),
    distributionLabel,
  };
}

function winRateFor(wins: number, losses: number): number | null {
  const counted = wins + losses;
  return counted === 0 ? null : wins / counted;
}

function segmentFact(key: string, label: string, trades: AnalyzedTrade[]): SegmentFact {
  const wins = trades.filter((trade) => trade.pnl > 0).length;
  const losses = trades.filter((trade) => trade.pnl < 0).length;
  return {
    key,
    label,
    trades: trades.length,
    wins,
    losses,
    pnl: trades.reduce((sum, trade) => sum + trade.pnl, 0),
    winRate: winRateFor(wins, losses),
  };
}

function groupedSegments(
  trades: AnalyzedTrade[],
  keyForTrade: (trade: AnalyzedTrade) => { key: string; label: string },
): SegmentFact[] {
  const buckets = new Map<string, { label: string; trades: AnalyzedTrade[] }>();

  for (const trade of trades) {
    const { key, label } = keyForTrade(trade);
    const bucket = buckets.get(key) ?? { label, trades: [] };
    bucket.trades.push(trade);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => segmentFact(key, bucket.label, bucket.trades))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}

function timeWindowForTrade(trade: AnalyzedTrade): { key: string; label: string } {
  if (trade.entryAt == null) return { key: "unknown", label: "Unknown time" };
  const parts = timeZoneParts(trade.entryAt * 1000, MARKET_TZ);
  const startMinutes = Math.floor((parts.hour * 60 + parts.minute) / 30) * 30;
  const endMinutes = startMinutes + 30;
  const startHour = Math.floor(startMinutes / 60);
  const startMinute = startMinutes % 60;
  const endHour = Math.floor(endMinutes / 60);
  const endMinute = endMinutes % 60;
  const key = `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`;
  const label = `${key}-${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
  return { key, label };
}

function priceBandForTrade(trade: AnalyzedTrade): { key: string; label: string } {
  const price = trade.avgEntryPrice;
  if (price == null) return { key: "unknown", label: "Unknown price" };
  if (price < 1) return { key: "lt-1", label: "< $1" };
  if (price < 2) return { key: "1-2", label: "$1-2" };
  if (price < 3) return { key: "2-3", label: "$2-3" };
  if (price < 5) return { key: "3-5", label: "$3-5" };
  if (price < 10) return { key: "5-10", label: "$5-10" };
  if (price < 15) return { key: "10-15", label: "$10-15" };
  if (price < 25) return { key: "15-25", label: "$15-25" };
  return { key: "25-plus", label: "$25+" };
}

function tickerFlipSegment(byTicker: SegmentFact[], netPnlValue: number, totalTrades: number): SegmentFact | null {
  const baselineSign = sign(netPnlValue);
  if (baselineSign === 0) return null;
  return byTicker.find((segment) => segment.trades < totalTrades && sign(netPnlValue - segment.pnl) !== baselineSign) ?? null;
}

function materialLossThreshold(trades: AnalyzedTrade[]): number {
  const losses = trades.filter((trade) => trade.pnl < 0).map((trade) => Math.abs(trade.pnl));
  return Math.max(1, average(losses) ?? 1);
}

function findRepeatedMaterialLossTicker(trades: AnalyzedTrade[]): { symbol: string; count: number; pnl: number } | null {
  const threshold = materialLossThreshold(trades);
  const bySymbol = new Map<string, { count: number; pnl: number }>();

  for (const trade of trades) {
    if (trade.pnl > -threshold) continue;
    const current = bySymbol.get(trade.symbol) ?? { count: 0, pnl: 0 };
    current.count += 1;
    current.pnl += trade.pnl;
    bySymbol.set(trade.symbol, current);
  }

  return [...bySymbol.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort(([, a], [, b]) => a.pnl - b.pnl)
    .map(([symbol, value]) => ({ symbol, ...value }))[0] ?? null;
}

function pathGiveback(trades: AnalyzedTrade[]): { peakPnl: number; finalGiveback: number } {
  const ordered = [...trades]
    .filter((trade) => trade.exitAt != null)
    .sort((a, b) => (a.exitAt ?? 0) - (b.exitAt ?? 0));
  let cumulative = 0;
  let peakPnl = 0;

  for (const trade of ordered) {
    cumulative += trade.pnl;
    peakPnl = Math.max(peakPnl, cumulative);
  }

  return { peakPnl, finalGiveback: peakPnl - cumulative };
}

function dominantMechanism(
  trades: AnalyzedTrade[],
  netPnlValue: number,
  distributionLabel: DistributionLabel,
  byTicker: SegmentFact[],
  byTimeWindow: SegmentFact[],
): SessionFactPack["mechanism"] {
  const flipTicker = tickerFlipSegment(byTicker, netPnlValue, trades.length);
  if (flipTicker) {
    return {
      key: "ticker-concentration",
      label: "Ticker concentration",
      evidence: [`Removing ${flipTicker.label} changes the session sign (${formatMoney(flipTicker.pnl)}).`],
    };
  }

  if (distributionLabel === "outlier-carried green" || distributionLabel === "bottom-heavy red" || distributionLabel === "tail-caused red") {
    return {
      key: "tail-concentration",
      label: "Tail concentration",
      evidence: [`Trim review classified the session as ${distributionLabel}.`],
    };
  }

  const repeatedLoss = findRepeatedMaterialLossTicker(trades);
  if (repeatedLoss) {
    return {
      key: "same-symbol-re-entry",
      label: "Same-symbol re-entry",
      evidence: [`${repeatedLoss.symbol} had ${repeatedLoss.count} material losses for ${formatMoney(repeatedLoss.pnl)}.`],
    };
  }

  const giveback = pathGiveback(trades);
  if (giveback.peakPnl > 0 && giveback.finalGiveback > Math.max(Math.abs(netPnlValue) * 0.5, materialLossThreshold(trades))) {
    return {
      key: "post-peak-giveback",
      label: "Post-peak giveback",
      evidence: [`Peak P&L was ${formatMoney(giveback.peakPnl)}; final giveback was ${formatMoney(giveback.finalGiveback)}.`],
    };
  }

  const worstWindow = byTimeWindow.filter((segment) => segment.pnl < 0).sort((a, b) => a.pnl - b.pnl)[0];
  if (worstWindow && Math.abs(worstWindow.pnl) > Math.max(Math.abs(netPnlValue) * 0.5, materialLossThreshold(trades))) {
    return {
      key: "segment-leak",
      label: "Segment leak",
      evidence: [`${worstWindow.label} lost ${formatMoney(worstWindow.pnl)} across ${worstWindow.trades} trades.`],
    };
  }

  if (distributionLabel === "broad-based red") {
    return {
      key: "ordinary-flow-leakage",
      label: "Ordinary-flow leakage",
      evidence: ["Losses were not explained by one removable outlier."],
    };
  }

  return {
    key: "broad-accumulation",
    label: "Broad accumulation",
    evidence: ["No single ticker, tail, or time window explains most of the result."],
  };
}

function sampleSupport(count: number): number {
  if (count >= 15) return 1;
  if (count >= 8) return 0.75;
  if (count >= 4) return 0.5;
  if (count > 0) return 0.25;
  return 0;
}

function sessionMetrics(trades: AnalyzedTrade[]): SessionMetrics {
  const pnls = trades.map((trade) => trade.pnl);
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);
  const netPnlValue = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const grossWins = wins.reduce((sum, pnl) => sum + pnl, 0);
  const grossLosses = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
  const winRate = winRateFor(wins.length, losses.length);
  const avgWinner = average(wins);
  const avgLoser = average(losses);
  const payoffRatio = avgWinner == null || avgLoser == null || avgLoser === 0 ? null : avgWinner / Math.abs(avgLoser);
  const breakevenWinRate = avgWinner == null || avgLoser == null
    ? null
    : Math.abs(avgLoser) / (avgWinner + Math.abs(avgLoser));
  const rMultiples = trades.flatMap((trade) => (trade.rMultiple == null ? [] : [trade.rMultiple]));
  const totalR = rMultiples.length === 0 ? null : rMultiples.reduce((sum, value) => sum + value, 0);

  return {
    trades: trades.length,
    netPnl: netPnlValue,
    grossWins,
    grossLosses,
    winRate,
    profitFactor: grossLosses === 0 ? null : grossWins / grossLosses,
    avgWinner,
    avgLoser,
    payoffRatio,
    breakevenWinRate,
    winRateMargin: winRate == null || breakevenWinRate == null ? null : winRate - breakevenWinRate,
    expectancyPerTrade: trades.length === 0 ? null : netPnlValue / trades.length,
    totalR,
    expectancyR: totalR == null ? null : totalR / rMultiples.length,
    rCoverage: trades.length === 0 ? 0 : rMultiples.length / trades.length,
  };
}

function materialVote(current: number | null, baseline: number | null, threshold: number): TrendSignal["vote"] {
  if (current == null || baseline == null) return 0;
  const delta = current - baseline;
  if (delta > threshold) return 1;
  if (delta < -threshold) return -1;
  return 0;
}

function buildTrendHistory(
  current: SessionMetrics,
  baseline: SessionMetrics,
  baselineLabel: string,
): SessionFactPack["history"] {
  const currentExpectancy = current.expectancyR ?? current.expectancyPerTrade;
  const baselineExpectancy = baseline.expectancyR ?? baseline.expectancyPerTrade;
  const netThreshold = Math.max(50, Math.abs(baseline.netPnl) * 0.1);
  const signals: TrendSignal[] = [
    {
      key: "win_rate",
      label: "Win rate",
      current: current.winRate,
      baseline: baseline.winRate,
      delta: current.winRate == null || baseline.winRate == null ? null : current.winRate - baseline.winRate,
      vote: materialVote(current.winRate, baseline.winRate, WIN_RATE_TREND_THRESHOLD),
    },
    {
      key: "expectancy",
      label: current.expectancyR != null && baseline.expectancyR != null ? "E[R]" : "E[$]",
      current: currentExpectancy,
      baseline: baselineExpectancy,
      delta: currentExpectancy == null || baselineExpectancy == null ? null : currentExpectancy - baselineExpectancy,
      vote: materialVote(currentExpectancy, baselineExpectancy, EXPECTANCY_TREND_THRESHOLD),
    },
    {
      key: "profit_factor",
      label: "Profit factor",
      current: current.profitFactor,
      baseline: baseline.profitFactor,
      delta: current.profitFactor == null || baseline.profitFactor == null ? null : current.profitFactor - baseline.profitFactor,
      vote: materialVote(current.profitFactor, baseline.profitFactor, PROFIT_FACTOR_TREND_THRESHOLD),
    },
    {
      key: "net",
      label: "Net P&L",
      current: current.netPnl,
      baseline: baseline.netPnl,
      delta: current.netPnl - baseline.netPnl,
      vote: materialVote(current.netPnl, baseline.netPnl, netThreshold),
    },
  ];
  const alignedPositive = signals.filter((signal) => signal.vote === 1).length;
  const alignedNegative = signals.filter((signal) => signal.vote === -1).length;
  const trendLabel =
    baseline.trades < 10
      ? "insufficient baseline"
      : alignedPositive >= 3
        ? "improvement"
        : alignedNegative >= 3
          ? "deterioration"
          : "mixed";

  return {
    baselineLabel,
    baselineTrades: baseline.trades,
    trendLabel,
    signals,
  };
}

function surpriseCandidate(input: Omit<SurpriseCandidate, "score">): SurpriseCandidate {
  return {
    ...input,
    score: rounded(input.economicImpact * input.contradictionStrength * input.sampleSupport),
  };
}

function buildSurprises({
  trades,
  netPnlValue,
  winRate,
  byTicker,
  byTimeWindow,
  byPriceBand,
}: {
  trades: AnalyzedTrade[];
  netPnlValue: number;
  winRate: number | null;
  byTicker: SegmentFact[];
  byTimeWindow: SegmentFact[];
  byPriceBand: SegmentFact[];
}): SurpriseCandidate[] {
  const candidates: SurpriseCandidate[] = [];

  if (winRate != null && winRate >= 0.5 && netPnlValue < 0) {
    candidates.push(surpriseCandidate({
      key: "high-win-rate-red",
      title: "Accuracy hid negative expectancy",
      description: "The session won at least half its counted trades but still finished red.",
      economicImpact: Math.abs(netPnlValue),
      contradictionStrength: Math.min(1, winRate - 0.5 + 0.5),
      sampleSupport: sampleSupport(trades.length),
      evidence: [`Win rate ${(winRate * 100).toFixed(1)}%; net ${formatMoney(netPnlValue)}.`],
    }));
  }

  if (winRate != null && winRate <= 0.4 && netPnlValue > 0) {
    candidates.push(surpriseCandidate({
      key: "low-win-rate-green",
      title: "Payoff carried a low-accuracy green day",
      description: "The session won fewer than 40% of counted trades but still finished green.",
      economicImpact: netPnlValue,
      contradictionStrength: Math.min(1, 0.4 - winRate + 0.5),
      sampleSupport: sampleSupport(trades.length),
      evidence: [`Win rate ${(winRate * 100).toFixed(1)}%; net ${formatMoney(netPnlValue)}.`],
    }));
  }

  const flipTicker = tickerFlipSegment(byTicker, netPnlValue, trades.length);
  if (flipTicker) {
    candidates.push(surpriseCandidate({
      key: "ticker-flips-sign",
      title: `${flipTicker.label} explains the session sign`,
      description: "Removing one ticker changes whether the session is green or red.",
      economicImpact: Math.abs(flipTicker.pnl),
      contradictionStrength: 1,
      sampleSupport: sampleSupport(flipTicker.trades),
      evidence: [`${flipTicker.label}: ${flipTicker.trades} trades, ${formatMoney(flipTicker.pnl)}.`],
    }));
  }

  const bestWindow = byTimeWindow.filter((segment) => segment.pnl > 0).sort((a, b) => b.pnl - a.pnl)[0];
  if (bestWindow && bestWindow.pnl > netPnlValue && bestWindow.pnl > 0) {
    candidates.push(surpriseCandidate({
      key: "window-earned-more-than-final",
      title: `${bestWindow.label} earned more than the final session`,
      description: "One time window produced more P&L than the final result, meaning later trading gave part of it back.",
      economicImpact: bestWindow.pnl - netPnlValue,
      contradictionStrength: 0.85,
      sampleSupport: sampleSupport(bestWindow.trades),
      evidence: [`${bestWindow.label}: ${formatMoney(bestWindow.pnl)} vs final ${formatMoney(netPnlValue)}.`],
    }));
  }

  const allSegments = [...byTicker, ...byTimeWindow, ...byPriceBand].filter((segment) => segment.trades >= 2 && segment.winRate != null);
  const negativeHighWinSegment = allSegments
    .filter((segment) => segment.pnl < 0 && (segment.winRate ?? 0) >= 0.5)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0) || a.pnl - b.pnl)[0];

  if (negativeHighWinSegment) {
    candidates.push(surpriseCandidate({
      key: "winning-segment-lost-money",
      title: `${negativeHighWinSegment.label} won often but lost money`,
      description: "A segment with positive accuracy still drained the session.",
      economicImpact: Math.abs(negativeHighWinSegment.pnl),
      contradictionStrength: negativeHighWinSegment.winRate ?? 0.5,
      sampleSupport: sampleSupport(negativeHighWinSegment.trades),
      evidence: [
        `${negativeHighWinSegment.label}: ${negativeHighWinSegment.trades} trades, ${((negativeHighWinSegment.winRate ?? 0) * 100).toFixed(1)}% win rate, ${formatMoney(negativeHighWinSegment.pnl)}.`,
      ],
    }));
  }

  return candidates.sort((a, b) => b.score - a.score);
}

function compileExperiment(mechanism: SessionFactPack["mechanism"], topSurprise: SurpriseCandidate | undefined): StarterExperiment {
  if (mechanism.key === "same-symbol-re-entry" || mechanism.key === "ticker-concentration") {
    return {
      hypothesis: "A single ticker is driving too much of the session outcome.",
      trigger: "One ticker produces a material loss or dominates session P&L.",
      action: "Pause that ticker for 30 minutes and write the next valid setup before re-entry.",
      scope: "That ticker only.",
      expires: "Session close.",
      measure: ["blocked trades", "avoided P&L", "missed opportunity"],
    };
  }

  if (mechanism.key === "post-peak-giveback" || topSurprise?.key === "window-earned-more-than-final") {
    return {
      hypothesis: "Later trading is giving back a meaningful chunk of the clean window.",
      trigger: "Session P&L gives back at least half of the best closed-trade window.",
      action: "Drop to half size or stop new entries until a fresh A setup is written.",
      scope: "Rest of session.",
      expires: "Session close.",
      measure: ["post-trigger P&L", "trades skipped", "A setup count"],
    };
  }

  if (mechanism.key === "segment-leak" || topSurprise?.key === "winning-segment-lost-money") {
    return {
      hypothesis: "One segment has hidden negative expectancy despite looking active or accurate.",
      trigger: "The weak segment appears again.",
      action: "Require a written reason and defined stop before taking the next trade in that segment.",
      scope: "Matched time, ticker, or price segment.",
      expires: "Next 5 matching trades.",
      measure: ["segment P&L", "rule-followed count", "skipped trades"],
    };
  }

  return {
    hypothesis: "The next useful review needs cleaner process labels and planned risk.",
    trigger: "Before entering a trade.",
    action: "Tag the intended setup and define the stop before entry when practical.",
    scope: "All trades next session.",
    expires: "Session close.",
    measure: ["trades with setup", "trades with planned stop", "rule-break tags"],
  };
}

function confidenceFor(trades: AnalyzedTrade[]): SessionFactPack["confidence"] {
  const sample = trades.length;
  const rTrades = trades.filter((trade) => trade.rMultiple != null);
  const rCoverage = sample === 0 ? 0 : rTrades.length / sample;
  const sampleScore = sample >= 20 ? 1 : sample >= 10 ? 0.72 : sample >= 5 ? 0.45 : sample > 0 ? 0.22 : 0;
  const riskScore = rCoverage >= 0.8 ? 1 : rCoverage >= 0.3 ? 0.82 : 0.65;
  const score = rounded(sampleScore * riskScore);
  const limitations: string[] = [];

  if (sample < 10) limitations.push("Small sample; treat this as a session read, not a persistent pattern.");
  if (rCoverage < 0.8) limitations.push("Most trades lack planned stop data, so R-multiple confidence is limited.");
  limitations.push("No explicit playbook or named-level match is included in this starter layer yet.");

  return {
    label: score >= 0.75 ? "high" : score >= 0.4 ? "medium" : "low",
    score,
    sampleSize: sample,
    riskModel: rCoverage >= 0.8 ? "r-multiple" : "dollar-fallback",
    limitations,
  };
}

export function buildSessionFactPack(
  inputTrades: ReviewTradeInput[],
  options: BuildSessionFactPackOptions = {},
): SessionFactPack {
  const trades = analyzeTrades(inputTrades);
  const baselineTrades = analyzeTrades(options.baselineTrades ?? []);
  const currentMetrics = sessionMetrics(trades);
  const baselineMetrics = sessionMetrics(baselineTrades);
  const pnls = trades.map((trade) => trade.pnl);
  const netPnlValue = currentMetrics.netPnl;
  const winRate = currentMetrics.winRate;
  const byTicker = groupedSegments(trades, (trade) => ({ key: trade.symbol, label: trade.symbol }));
  const byTimeWindow = groupedSegments(trades, timeWindowForTrade).sort((a, b) => a.key.localeCompare(b.key));
  const byPriceBand = groupedSegments(trades, priceBandForTrade);
  const robustness = classifyDistribution(pnls);
  const mechanism = dominantMechanism(trades, netPnlValue, robustness.distributionLabel, byTicker, byTimeWindow);
  const surprises = buildSurprises({ trades, netPnlValue, winRate, byTicker, byTimeWindow, byPriceBand });

  return {
    session: currentMetrics,
    robustness,
    segments: {
      byTicker,
      byTimeWindow,
      byPriceBand,
    },
    history: buildTrendHistory(currentMetrics, baselineMetrics, options.baselineLabel ?? "Prior baseline"),
    mechanism,
    surprises,
    experiment: compileExperiment(mechanism, surprises[0]),
    confidence: confidenceFor(trades),
  };
}
