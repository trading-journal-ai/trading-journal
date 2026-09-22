import {
  median,
  priceBands,
  reviewStats,
  roundMoney,
  total,
  type ReviewTrade,
} from "./analyticsReview";
import type {
  WeeklyCoaching,
  WeeklyCoachingFinding,
  WeeklyCoachingTradeLink,
} from "./weeklyCoachingTypes";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcDate(date: string) {
  if (!ISO_DATE.test(date)) throw new RangeError(`Invalid ISO date: ${date}`);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Invalid ISO date: ${date}`);
  }
  return parsed;
}

function addDays(date: string, days: number) {
  const parsed = utcDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function money(value: number | null, signed = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = roundMoney(value);
  const sign = rounded < 0 ? "−" : signed && rounded > 0 ? "+" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function decimal(value: number | null, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function perShareMoney(value: number | null, signed = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

function minutes(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${decimal(value, 1)} min`;
}

function ratio(value: number | null) {
  return value == null || !Number.isFinite(value) ? "—" : `${value.toFixed(2)}×`;
}

function validIntraday(row: ReviewTrade) {
  return Number.isSafeInteger(row.id)
    && row.entryDate === row.date
    && ISO_DATE.test(row.date)
    && Number.isFinite(row.entryAt)
    && Number.isFinite(row.exitAt)
    && row.exitAt >= row.entryAt
    && Number.isFinite(row.gross)
    && Number.isFinite(row.fees)
    && Number.isFinite(row.net)
    && Number.isFinite(row.holdMinutes);
}

function uniqueById(rows: ReviewTrade[]) {
  const unique = new Map<number, ReviewTrade>();
  for (const row of [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.exitAt - b.exitAt || a.id - b.id)) {
    if (!unique.has(row.id)) unique.set(row.id, row);
  }
  return [...unique.values()];
}

function sessionCount(rows: ReviewTrade[]) {
  return new Set(rows.map((row) => row.date)).size;
}

function tradeLinks(rows: ReviewTrade[]): WeeklyCoachingTradeLink[] {
  return uniqueById(rows)
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.date.localeCompare(b.date) || a.id - b.id)
    .slice(0, 3)
    .map(({ id, symbol, date }) => ({ id, symbol, date }));
}

function comparisonLinks(first: ReviewTrade[], second: ReviewTrade[]): WeeklyCoachingTradeLink[] {
  const mostMaterial = (rows: ReviewTrade[]) => [...rows]
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.date.localeCompare(b.date) || a.id - b.id)[0];
  const representatives = [mostMaterial(first), mostMaterial(second)].filter((row): row is ReviewTrade => row != null);
  const represented = new Set(representatives.map((row) => row.id));
  const third = [...first, ...second]
    .filter((row) => !represented.has(row.id))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net) || a.date.localeCompare(b.date) || a.id - b.id)[0];
  return [...representatives, ...(third ? [third] : [])]
    .map(({ id, symbol, date }) => ({ id, symbol, date }));
}

function confidence(rows: ReviewTrade[]): WeeklyCoachingFinding["confidence"] {
  return sessionCount(rows) > 1 ? "developing" : "observation";
}

function weightedNetPerOpeningShare(rows: ReviewTrade[]) {
  const eligible = rows.filter((row) => Number.isFinite(row.openingShares) && row.openingShares > 0);
  const shares = total(eligible.map((row) => row.openingShares));
  return {
    value: shares > 0 ? total(eligible.map((row) => row.net)) / shares : null,
    trades: eligible.length,
    shares,
  };
}

type FindingCandidate = { finding: WeeklyCoachingFinding; priority: number; strength: number };

function payoffCandidate(rows: ReviewTrade[]): FindingCandidate | null {
  const wins = rows.filter((row) => row.net > 0);
  const losses = rows.filter((row) => row.net < 0);
  if (!wins.length || !losses.length) return null;
  const winCash = total(wins.map((row) => row.net));
  const lossCash = Math.abs(total(losses.map((row) => row.net)));
  const averageWin = winCash / wins.length;
  const averageLoss = lossCash / losses.length;
  if (averageWin <= 0 || averageLoss <= 0 || winCash <= 0) return null;
  const payoff = averageWin / averageLoss;
  const cashLossRatio = lossCash / winCash;
  const read = payoff > 1
    ? `Your average net winner was ${payoff.toFixed(2)}× the size of your average net loser this week.`
    : payoff < 1
      ? `Your average net loser was ${(1 / payoff).toFixed(2)}× the size of your average net winner this week.`
      : "Your average net winners and losers were the same size this week.";
  return {
    priority: 300,
    strength: Math.abs(Math.log(payoff)) + Math.abs(Math.log(cashLossRatio)),
    finding: {
      id: "payoff-asymmetry",
      read,
      evidence: `${wins.length} net ${wins.length === 1 ? "winner" : "winners"} averaged ${money(averageWin, true)}; ${losses.length} net ${losses.length === 1 ? "loser" : "losers"} averaged ${money(-averageLoss)} across ${sessionCount(rows)} ${sessionCount(rows) === 1 ? "session" : "sessions"}.`,
      confidence: confidence(rows),
      trades: comparisonLinks(wins, losses),
    },
  };
}

function priceCohort(row: ReviewTrade) {
  return priceBands.find((band) => band.id !== "all" && row.price >= band.min && row.price < band.max);
}

function holdCandidate(rows: ReviewTrade[]): FindingCandidate | null {
  const cohorts = new Map<string, { side: ReviewTrade["side"]; price: string; rows: ReviewTrade[] }>();
  for (const row of rows) {
    const band = priceCohort(row);
    if (!band || !Number.isFinite(row.holdMinutes) || row.holdMinutes < 0 || row.net === 0) continue;
    const key = `${row.side}-${band.id}`;
    const cohort = cohorts.get(key) ?? { side: row.side, price: band.label, rows: [] };
    cohort.rows.push(row);
    cohorts.set(key, cohort);
  }
  const eligible = [...cohorts.entries()].flatMap(([key, cohort]) => {
    const wins = cohort.rows.filter((row) => row.net > 0);
    const losses = cohort.rows.filter((row) => row.net < 0);
    const winSessions = sessionCount(wins);
    const lossSessions = sessionCount(losses);
    if (wins.length < 2 || losses.length < 2 || winSessions < 2 || lossSessions < 2) return [];
    const winHold = median(wins.map((row) => row.holdMinutes));
    const lossHold = median(losses.map((row) => row.holdMinutes));
    if (winHold == null || lossHold == null || winHold === lossHold) return [];
    return [{ key, cohort, wins, losses, winHold, lossHold,
      strength: Math.abs(winHold - lossHold) / Math.max(1, Math.min(winHold, lossHold)) }];
  }).sort((a, b) => b.strength - a.strength || a.key.localeCompare(b.key));
  const best = eligible[0];
  if (!best) return null;
  const longer = best.lossHold > best.winHold ? "net losers" : "net winners";
  const shorterHold = Math.min(best.winHold, best.lossHold);
  const longerHold = Math.max(best.winHold, best.lossHold);
  const multiple = shorterHold > 0 ? longerHold / shorterHold : null;
  return {
    priority: 400,
    strength: best.strength,
    finding: {
      id: `hold-${best.key}`,
      read: `${longer[0].toUpperCase()}${longer.slice(1)} stayed open longer among ${best.cohort.side} trades entered ${best.cohort.price.toLowerCase()} this week${multiple == null ? "." : ` (${multiple.toFixed(2)}× by median hold).`}`,
      evidence: `${best.wins.length} net winners across ${sessionCount(best.wins)} sessions had a ${minutes(best.winHold)} median hold; ${best.losses.length} net losers across ${sessionCount(best.losses)} sessions had a ${minutes(best.lossHold)} median hold. Trades are grouped by side and entry-price band; setup and asset characteristics may differ.`,
      question: "What differed in the exit plan between the longer-held and shorter-held trades?",
      confidence: "developing",
      trades: comparisonLinks(best.wins, best.losses),
    },
  };
}

function feeCandidate(rows: ReviewTrade[]): FindingCandidate | null {
  const grossPositive = rows.filter((row) => row.gross > 0);
  const flipped = grossPositive.filter((row) => row.net < 0);
  if (flipped.length) {
    const gross = total(flipped.map((row) => row.gross));
    const fees = total(flipped.map((row) => row.fees));
    const net = total(flipped.map((row) => row.net));
    const unknown = flipped.filter((row) => row.unknownFees > 0).length;
    const typicalAbsoluteResult = total(rows.map(row => Math.abs(row.net))) / rows.length;
    return {
      // A minor fee exception should not displace the week's payoff/hold read.
      priority: Math.abs(net) >= typicalAbsoluteResult ? 500 : 100,
      strength: fees / gross,
      finding: {
        id: "fees-flipped-winners",
        read: `${flipped.length} ${flipped.length === 1 ? "trade went" : "trades went"} from a gross winner to a net loser after recorded fees this week.`,
        evidence: `${flipped.length} of ${grossPositive.length} gross-positive ${grossPositive.length === 1 ? "trade" : "trades"}: ${money(gross, true)} gross − ${money(fees)} recorded fees = ${money(net)} net.${unknown ? ` ${unknown} affected ${unknown === 1 ? "trade has" : "trades have"} unreported fee components, so the fee total and net result remain provisional.` : ""}`,
        question: "Did the expected move justify the transaction cost at this size and price?",
        confidence: confidence(flipped),
        trades: tradeLinks(flipped),
      },
    };
  }
  const gross = total(grossPositive.map((row) => row.gross));
  const fees = total(grossPositive.map((row) => row.fees));
  if (!grossPositive.length || gross <= 0 || fees <= 0) return null;
  const absorbed = fees / gross;
  const unknown = grossPositive.filter((row) => row.unknownFees > 0).length;
  return {
    priority: 150,
    strength: absorbed,
    finding: {
      id: "fees-absorbed-gains",
      read: `Recorded fees absorbed ${(absorbed * 100).toFixed(1)}% of gross gains on gross-positive trades this week.`,
      evidence: `${grossPositive.length} gross-positive ${grossPositive.length === 1 ? "trade produced" : "trades produced"} ${money(gross, true)} gross and carried ${money(fees)} in recorded fees.${unknown ? ` ${unknown} ${unknown === 1 ? "trade has" : "trades have"} unreported fee components, so this percentage is provisional.` : ""}`,
      confidence: confidence(grossPositive),
      trades: tradeLinks(grossPositive),
    },
  };
}

function baselineCandidate(rows: ReviewTrade[], baseline: ReviewTrade[]): FindingCandidate | null {
  if (!rows.length || !baseline.length) return null;
  const currentAverage = total(rows.map((row) => row.net)) / rows.length;
  const baselineAverage = total(baseline.map((row) => row.net)) / baseline.length;
  const currentUnknown = rows.filter((row) => row.unknownFees > 0).length;
  const baselineUnknown = baseline.filter((row) => row.unknownFees > 0).length;
  if (currentAverage === baselineAverage) return null;
  const signChange = Math.sign(currentAverage) !== Math.sign(baselineAverage);
  return {
    priority: signChange ? 350 : 200,
    strength: Math.abs(currentAverage - baselineAverage) / Math.max(1, Math.abs(baselineAverage)),
    finding: {
      id: "net-per-trade-vs-baseline",
      read: `This week's completed intraday trades averaged ${money(currentAverage, true)} net per trade versus ${money(baselineAverage, true)} in the prior 30-calendar-day window.`,
      evidence: `Current: ${rows.length} ${rows.length === 1 ? "trade" : "trades"} across ${sessionCount(rows)} ${sessionCount(rows) === 1 ? "session" : "sessions"}; ${currentUnknown} have unknown fee components. Baseline: ${baseline.length} ${baseline.length === 1 ? "trade" : "trades"} across ${sessionCount(baseline)} ${sessionCount(baseline) === 1 ? "session" : "sessions"}; ${baselineUnknown} have unknown fee components. Both windows use completed intraday trades and net P&L, but trade size and setup mix may differ; unequal fee coverage can weaken the comparison.`,
      question: "What changed in the setups selected or the way they were executed between these windows?",
      confidence: sessionCount(rows) > 1 && sessionCount(baseline) > 1 ? "developing" : "observation",
      trades: comparisonLinks(rows, baseline),
    },
  };
}

/**
 * Builds deterministic weekly evidence from an already account-scoped review set.
 * Activity IDs define the visible week's denominator; history is used only for
 * the compatible prior-30-calendar-day baseline.
 */
export function buildWeeklyCoaching(input: {
  rows: ReviewTrade[];
  weekStart: string;
  asOfDate: string;
  activityTradeIds: number[];
}): WeeklyCoaching {
  utcDate(input.weekStart);
  utcDate(input.asOfDate);
  const weekEnd = addDays(input.weekStart, 4);
  const currentEnd = input.asOfDate < weekEnd ? input.asOfDate : weekEnd;
  const baselineStart = addDays(input.weekStart, -30);
  const baselineWindowEnd = addDays(input.weekStart, -1);
  const baselineEnd = input.asOfDate < baselineWindowEnd ? input.asOfDate : baselineWindowEnd;
  const activityIds = new Set(input.activityTradeIds.filter(Number.isSafeInteger));
  const current = uniqueById(input.rows.filter((row) => activityIds.has(row.id)
    && validIntraday(row)
    && row.date >= input.weekStart
    && row.date <= currentEnd
    && row.date <= input.asOfDate));
  const baseline = uniqueById(input.rows.filter((row) => validIntraday(row)
    && row.date >= baselineStart
    && row.date <= baselineEnd
    && row.date <= input.asOfDate));
  const stats = reviewStats(current, "net");
  const wins = current.filter((row) => row.net > 0);
  const losses = current.filter((row) => row.net < 0);
  const payoff = stats.avgWin != null && stats.avgLoss != null && stats.avgLoss < 0
    ? stats.avgWin / Math.abs(stats.avgLoss)
    : null;
  const winnerShares = weightedNetPerOpeningShare(wins);
  const loserShares = weightedNetPerOpeningShare(losses);
  const peakShares = current.filter((row) => row.peakShares != null && Number.isFinite(row.peakShares));
  const peakCapital = current.filter((row) => Number.isFinite(row.peakCapital));
  const unknownFeeTrades = current.filter((row) => row.unknownFees > 0).length;
  const excludedTrades = Math.max(0, activityIds.size - current.length);
  const findings = [
    feeCandidate(current),
    holdCandidate(current),
    baselineCandidate(current, baseline),
    payoffCandidate(current),
  ].filter((candidate): candidate is FindingCandidate => candidate != null)
    .sort((a, b) => b.priority - a.priority || b.strength - a.strength || a.finding.id.localeCompare(b.finding.id))
    .slice(0, 3)
    .map((candidate) => candidate.finding);

  return {
    scope: {
      includedTrades: current.length,
      activityTrades: activityIds.size,
      excludedTrades,
      sessions: sessionCount(current),
      unknownFeeTrades,
      description: `${current.length} of ${activityIds.size} unique weekly activity ${activityIds.size === 1 ? "trade" : "trades"} included. Only valid completed intraday trades closed from ${input.weekStart} through ${currentEnd} are included; open or unmatched activity, positions carried across ET dates, and later trades are excluded.`,
    },
    baseline: {
      trades: baseline.length,
      sessions: sessionCount(baseline),
      label: input.asOfDate < baselineWindowEnd
        ? `Prior 30-calendar-day window (${baselineStart}–${baselineWindowEnd}) · available through ${baselineEnd} · same completed-intraday scope`
        : `Prior 30 calendar days (${baselineStart}–${baselineWindowEnd}) · same completed-intraday scope`,
    },
    groups: [
      {
        label: "Trade economics",
        rows: [
          { label: "Average winner", value: money(stats.avgWin, true), detail: `${wins.length} net ${wins.length === 1 ? "winner" : "winners"}` },
          { label: "Average loser", value: money(stats.avgLoss), detail: `${losses.length} net ${losses.length === 1 ? "loser" : "losers"}` },
          { label: "Payoff ratio", value: ratio(payoff), detail: "Average net winner ÷ absolute average net loser" },
          { label: "Gross P&L", value: money(stats.gross, true), detail: `${current.length} included ${current.length === 1 ? "trade" : "trades"}` },
          { label: "Recorded fees", value: money(stats.fees), detail: unknownFeeTrades ? `${unknownFeeTrades} ${unknownFeeTrades === 1 ? "trade has" : "trades have"} unreported fee components; recorded fees are incomplete` : "All included trades report their fee components" },
          { label: "Net P&L", value: money(stats.pnl, true), detail: unknownFeeTrades ? "Provisional because some fee components are unreported" : "Gross P&L minus recorded fees" },
        ],
      },
      {
        label: "Opening-share economics",
        rows: [
          { label: "Winners · net / opening share", value: perShareMoney(winnerShares.value, true), detail: `Net P&L ÷ ${decimal(winnerShares.shares, 4)} opening shares across ${winnerShares.trades} of ${wins.length} winners` },
          { label: "Losers · net / opening share", value: perShareMoney(loserShares.value), detail: `Net P&L ÷ ${decimal(loserShares.shares, 4)} opening shares across ${loserShares.trades} of ${losses.length} losers` },
        ],
      },
      {
        label: "Hold and scale",
        rows: [
          { label: "Median winner hold", value: minutes(median(wins.map((row) => row.holdMinutes))), detail: `${wins.length} net ${wins.length === 1 ? "winner" : "winners"}` },
          { label: "Median loser hold", value: minutes(median(losses.map((row) => row.holdMinutes))), detail: `${losses.length} net ${losses.length === 1 ? "loser" : "losers"}` },
          { label: "Median peak shares", value: decimal(median(peakShares.map((row) => row.peakShares!)), 4), detail: `${peakShares.length} of ${current.length} included trades have comparable share counts` },
          { label: "Median peak capital", value: money(median(peakCapital.map((row) => row.peakCapital))), detail: `${peakCapital.length} of ${current.length} included trades have maximum deployed capital; this is not planned risk` },
        ],
      },
    ],
    findings,
  };
}
