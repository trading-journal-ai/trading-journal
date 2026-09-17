import { etDateString } from "@/lib/time";
import { cashFlowTotal } from "@/lib/analyticsMoney";
import { analyzeTradeExecutions, type TradeExecutionInput } from "@/lib/executionAnalysis";
import { shareSplitMultiplierBetween } from "@/lib/import/corporateActions";

export type ReviewSourceTrade = {
  id: number; symbol: string; side: "long" | "short"; status: "open" | "closed";
  entryAt: number | null; exitAt: number | null; setup: string | null;
};
export type ReviewFill = TradeExecutionInput & { fees: number; feeReported: boolean };
export type ReviewTrade = {
  id: number; symbol: string; side: "long" | "short"; entryAt: number; exitAt: number;
  date: string; entryDate: string; price: number; gross: number; net: number; fees: number;
  unknownFees: number; fills: number; peakShares: number | null; peakCapital: number;
  openingShares: number; initialShares: number; holdMinutes: number;
  adds: number; reductions: number; setup: string; tags: string[]; attempt: number;
};
export type PnlBasis = "net" | "gross";
export const roundMoney = (n: number) => Math.round((n + Math.sign(n) * Number.EPSILON) * 100) / 100;
export const total = (values: number[]) => values.reduce((s, n) => s + n, 0);
export const average = (values: number[]) => values.length ? total(values) / values.length : null;
export function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** A valid single flat-to-flat lifecycle is required; no trade-summary guesses. */
export function completedReviewTrade(trade: ReviewSourceTrade, input: ReviewFill[], tags: string[] = []): ReviewTrade | null {
  if (trade.status !== "closed" || !input.length) return null;
  const fills = [...input].sort((a, b) => a.executedAt - b.executedAt || (a.id ?? 0) - (b.id ?? 0));
  if (fills.some(f => !Number.isFinite(f.executedAt) || !Number.isFinite(f.price) || f.price <= 0 || !Number.isFinite(f.quantity) || f.quantity <= 0 || !Number.isFinite(f.fees))) return null;
  const opening = trade.side === "long" ? "buy" : "sell";
  let position = 0, cost = 0, peakCapital = 0, peakShares = 0, split = false;
  for (let i = 0; i < fills.length; i++) {
    const fill = fills[i];
    if (i && position > 0) {
      const multiplier = shareSplitMultiplierBetween(trade.symbol, fills[i - 1].executedAt, fill.executedAt);
      position *= multiplier; split ||= multiplier !== 1;
    }
    if (fill.side === opening) { position += fill.quantity; cost += fill.quantity * fill.price; }
    else {
      if (fill.quantity > position + 1e-8) return null;
      cost *= (position - fill.quantity) / position;
      position -= fill.quantity;
    }
    peakCapital = Math.max(peakCapital, cost);
    peakShares = Math.max(peakShares, position);
    if (Math.abs(position) < 1e-8 && i < fills.length - 1) return null;
  }
  if (Math.abs(position) > 1e-8) return null;
  const entryAt = fills[0].executedAt, exitAt = fills.at(-1)!.executedAt;
  const gross = cashFlowTotal(fills.map(f => ({ value: f.side === "sell" ? f.price : -f.price, quantity: f.quantity })));
  const fees = cashFlowTotal(fills.map(f => ({ value: f.fees })));
  const analysis = analyzeTradeExecutions(trade.side, fills);
  const openingFills = fills.filter(f => f.side === opening);
  const openingShares = total(openingFills.map(f => f.quantity));
  // Express all opening fills in entry-date units when a split crosses the trade.
  const entryBasisShares = total(openingFills.map(f => f.quantity / shareSplitMultiplierBetween(trade.symbol, entryAt, f.executedAt)));
  return { id: trade.id, symbol: trade.symbol, side: trade.side, entryAt, exitAt,
    date: etDateString(exitAt), entryDate: etDateString(entryAt),
    price: total(openingFills.map(f => f.price * f.quantity)) / entryBasisShares,
    gross, net: roundMoney(gross - fees), fees, unknownFees: fills.filter(f => !f.feeReported).length,
    fills: fills.length, peakShares: split ? null : peakShares, peakCapital: roundMoney(peakCapital),
    openingShares: split ? 0 : openingShares, initialShares: analysis.executions[0]?.quantity ?? 0,
    holdMinutes: (exitAt - entryAt) / 60, adds: Math.max(0, analysis.entryExecutionCount - 1),
    reductions: analysis.partialExitCount, setup: trade.setup?.trim() || "Unclassified", tags, attempt: 1 };
}

/** Assign attempts before price, date or setup filters; same account/symbol/side/entry day. */
export function assignAttempts(rows: ReviewTrade[]) {
  const attempts = new Map<string, number>();
  return [...rows].sort((a,b) => a.entryAt - b.entryAt || a.id - b.id).map(row => {
    const key = `${row.symbol}|${row.side}|${row.entryDate}`;
    const attempt = (attempts.get(key) ?? 0) + 1; attempts.set(key, attempt);
    return { ...row, attempt };
  });
}
export function reviewStats(rows: ReviewTrade[], basis: PnlBasis) {
  const wins = rows.filter(t => t[basis] > 0), losses = rows.filter(t => t[basis] < 0);
  const winTotal = total(wins.map(t => t[basis])), lossTotal = Math.abs(total(losses.map(t => t[basis])));
  const values = [...rows].sort((a,b) => a.exitAt - b.exitAt || a.id - b.id).map(t => t[basis]);
  let winRun = 0, lossRun = 0, maxWins = 0, maxLosses = 0;
  for (const value of values) { winRun = value > 0 ? winRun + 1 : 0; lossRun = value < 0 ? lossRun + 1 : 0; maxWins = Math.max(maxWins,winRun); maxLosses = Math.max(maxLosses,lossRun); }
  const sized = rows.filter(t => t.peakShares != null), perShare = rows.filter(t => t.openingShares > 0);
  return { count: rows.length, sessions: new Set(rows.map(t => t.date)).size,
    pnl: roundMoney(total(values)), gross: roundMoney(total(rows.map(t => t.gross))), fees: roundMoney(total(rows.map(t => t.fees))),
    unknown: rows.filter(t => t.unknownFees > 0).length,
    wins: wins.length, losses: losses.length, scratches: rows.length - wins.length - losses.length,
    winRate: wins.length + losses.length ? wins.length / (wins.length + losses.length) * 100 : null,
    avg: average(values), avgWin: average(wins.map(t => t[basis])), avgLoss: average(losses.map(t => t[basis])),
    medianLoss: median(losses.map(t => t[basis])), worst: losses.length ? Math.min(...losses.map(t => t[basis])) : null,
    best: wins.length ? Math.max(...wins.map(t => t[basis])) : null,
    pf: lossTotal ? winTotal / lossTotal : null,
    winHold: average(wins.map(t => t.holdMinutes)), lossHold: average(losses.map(t => t.holdMinutes)),
    avgPeak: average(sized.map(t => t.peakShares!)), medianPeak: median(sized.map(t => t.peakShares!)),
    perShare: perShare.length ? total(perShare.map(t => t[basis])) / total(perShare.map(t => t.openingShares)) : null,
    maxWins, maxLosses, totalOpeningShares: total(perShare.map(t=>t.openingShares)),
    winPerShare: average(wins.filter(t=>t.openingShares>0).map(t=>t[basis]/t.openingShares)),
    lossPerShare: average(losses.filter(t=>t.openingShares>0).map(t=>t[basis]/t.openingShares)),
    bestPerShare: wins.some(t=>t.openingShares>0) ? Math.max(...wins.filter(t=>t.openingShares>0).map(t=>t[basis]/t.openingShares)) : null,
    worstPerShare: losses.some(t=>t.openingShares>0) ? Math.min(...losses.filter(t=>t.openingShares>0).map(t=>t[basis]/t.openingShares)) : null,
    avgCapital: average(rows.map(t => t.peakCapital)), adds: rows.filter(t => t.adds > 0).length };
}
export function reviewSessions(rows: ReviewTrade[], basis: PnlBasis) {
  const groups = new Map<string, ReviewTrade[]>();
  for (const row of rows) { const group = groups.get(row.date) ?? []; group.push(row); groups.set(row.date, group); }
  let cumulative = 0, high = 0;
  return [...groups.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([date, trades]) => {
    let pnl = 0, peak = 0;
    for (const t of [...trades].sort((a,b) => a.exitAt - b.exitAt || a.id - b.id)) { pnl = roundMoney(pnl + t[basis]); peak = Math.max(peak, pnl); }
    cumulative = roundMoney(cumulative + pnl); high = Math.max(high, cumulative);
    return { date, trades, pnl, peak, giveback: roundMoney(peak - pnl), cumulative, drawdown: roundMoney(high - cumulative) };
  });
}
export const sizeBands = [
  { id: "small", label: "Under 100", min: 0, max: 100 },
  { id: "100", label: "100–499", min: 100, max: 500 },
  { id: "500", label: "500–999", min: 500, max: 1000 },
  { id: "1000", label: "1,000–1,999", min: 1000, max: 2000 },
  { id: "2000", label: "2,000–3,999", min: 2000, max: 4000 },
  { id: "4000", label: "4,000+", min: 4000, max: Infinity },
];
export const priceBands = [
  { id: "all", label: "All prices", min: 0, max: Infinity },
  { id: "under5", label: "Under $5", min: 0, max: 5 },
  { id: "5to10", label: "$5–under $10", min: 5, max: 10 },
  { id: "10to20", label: "$10–under $20", min: 10, max: 20 },
  { id: "20plus", label: "$20+", min: 20, max: Infinity },
];
