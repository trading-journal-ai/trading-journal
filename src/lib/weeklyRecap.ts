import type { WeeklyCoaching, WeeklyMarketReview } from "./weeklyCoachingTypes";
import type { WeeklyReviewFlag } from "./weeklySessionReview";
import { tradingWeekDates } from "./journalPnlViews";

export type WeeklyMarketObservation = {
  over50: number;
  over100: number;
  source: string;
  provenance: "retrospective" | "scanner-captured";
  coverage: "full" | "partial";
  updatedDate: string;
};

export type WeeklyRecapSession = {
  date: string;
  pnl: number;
  trades: { id: number; symbol: string; pnl: number }[];
  market?: WeeklyMarketObservation | null;
};

export type WeeklyTradeHighlight = {
  id: number;
  symbol: string;
  pnl: number;
  date: string;
  dates: string[];
  label: string;
};

export type WeeklyRecap = {
  sessionReview?: WeeklyReviewFlag & {
    note: { text: string; thesis: string; whatWentWell: string; whatWentWrong: string; emotionalState: string } | null;
    readOnly: boolean;
  };
  coaching?: WeeklyCoaching;
  sharedMarket?: WeeklyMarketReview;
  stage: "early" | "developing" | "full";
  status: string;
  title: string;
  story: string;
  development: string | null;
  breadth: string | null;
  coverage: string;
  highlights: WeeklyTradeHighlight[];
  evidence: { date: string; pnl: number; cumulativePnl: number; trades: number }[];
  market: { date: string; observation: WeeklyMarketObservation }[];
  question: string | null;
  focus?: { action: string; trigger: string };
};

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
export const recapWeekday = (date: string) => weekdayFormatter.format(new Date(`${date}T12:00:00Z`));
export function recapMoney(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}$${Math.abs(rounded).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const amount = (value: number) => recapMoney(Math.abs(value)).replace("+", "");
const moneyRound = (value: number) => Math.round(value * 100) / 100;

/** Preserve observed counts, never reinterpret the legacy count-based heat label. */
export function readWeeklyMarketObservation(row: {
  payloadJson: string; source: string; provenance: string; coverageStatus: string; updatedAt: Date;
} | undefined): WeeklyMarketObservation | null {
  if (!row || !["full", "partial"].includes(row.coverageStatus)
    || !["retrospective", "scanner-captured"].includes(row.provenance)) return null;
  try {
    const payload: unknown = JSON.parse(row.payloadJson);
    if (!payload || typeof payload !== "object" || !("counts" in payload)) return null;
    const counts = payload.counts;
    if (!counts || typeof counts !== "object" || !("over50Pct" in counts) || !("over100Pct" in counts)) return null;
    const over50 = counts.over50Pct;
    const over100 = counts.over100Pct;
    if (typeof over50 !== "number" || typeof over100 !== "number"
      || !Number.isSafeInteger(over50) || !Number.isSafeInteger(over100)
      || over50 < 0 || over100 < 0 || over100 > over50) return null;
    const updatedDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(row.updatedAt);
    return { over50, over100, source: row.source,
      provenance: row.provenance as WeeklyMarketObservation["provenance"],
      coverage: row.coverageStatus as WeeklyMarketObservation["coverage"], updatedDate };
  } catch {
    return null;
  }
}

/** Calendar controls depth; only in-range, available sessions can support claims. */
export function buildWeeklyRecap(input: {
  weekStart: string;
  asOfDate: string;
  sessions: WeeklyRecapSession[];
  noTradeDates?: string[];
}): WeeklyRecap {
  const dates = tradingWeekDates(input.weekStart);
  const weekEnd = dates[4];
  const ended = input.asOfDate > weekEnd;
  const upcoming = input.asOfDate < input.weekStart;
  const stage = input.asOfDate >= weekEnd ? "full" : input.asOfDate >= dates[2] ? "developing" : "early";
  const sessions = input.sessions.filter((row) => dates.includes(row.date) && row.date <= input.asOfDate
    && row.trades.length > 0 && Number.isFinite(row.pnl)).sort((a, b) => a.date.localeCompare(b.date));
  let cumulative = 0;
  const evidence = sessions.map((row) => {
    cumulative += row.pnl;
    return { date: row.date, pnl: row.pnl, cumulativePnl: moneyRound(cumulative), trades: row.trades.length };
  });
  const noTrade = dates.filter((date) => date <= input.asOfDate && input.noTradeDates?.includes(date) && !sessions.some((row) => row.date === date));
  // A weekday without activity is unknown, including exchange holidays. We have
  // no authoritative exchange calendar here and must not call it a missing import.
  const unknown = dates.filter((date) => date <= input.asOfDate && !noTrade.includes(date) && !sessions.some((row) => row.date === date));
  const coverage = `${sessions.length} imported ${sessions.length === 1 ? "session" : "sessions"}${noTrade.length ? ` · ${noTrade.length} marked no-trade` : ""}${unknown.length ? ` · No activity recorded for ${unknown.map(recapWeekday).join(", ")}` : ""}. Imports may be incomplete.`;
  const base: WeeklyRecap = {
    stage, status: upcoming ? "Upcoming week" : ended ? "Week ended" : "Week in progress",
    title: stage === "full" ? "Weekly recap" : stage === "developing" ? "The week taking shape" : "The week so far",
    story: upcoming ? "This week has not started yet." : "No imported trading activity to recap yet.",
    development: null, breadth: null, coverage, highlights: [], evidence, market: [], question: null,
  };
  if (!sessions.length) return base;
  const first = evidence[0];
  const last = evidence[evidence.length - 1];
  const total = last.cumulativePnl;
  base.story = sessions.length === 1
    ? `${recapWeekday(first.date)} ${first.pnl === 0 ? "finished flat" : `contributed ${recapMoney(first.pnl)}`}, the only imported session${ended ? " in this week" : " so far"}.`
    : `${recapWeekday(first.date)} started the recorded week at ${recapMoney(first.pnl)}. ${recapWeekday(last.date)} ${last.pnl > 0 ? `added ${amount(last.pnl)}` : last.pnl < 0 ? `gave back ${amount(last.pnl)}` : "was flat"}, bringing the running result to ${recapMoney(total)}.`;
  // "Gave back" requires gains to give back, otherwise this is an additional loss.
  if (sessions.length > 1 && last.pnl < 0 && total - last.pnl <= 0 || (sessions.length > 1 && last.pnl < 0 && Math.abs(last.pnl) > total - last.pnl)) {
    base.story = base.story.replace(`gave back ${amount(last.pnl)}`, `lost ${amount(last.pnl)}`);
  }
  if (sessions.length > 1) {
    const peak = evidence.reduce((best, row) => row.cumulativePnl > best.cumulativePnl ? row : best, first);
    const trough = evidence.reduce((worst, row) => row.cumulativePnl < worst.cumulativePnl ? row : worst, first);
    if (peak.cumulativePnl > 0 && total < peak.cumulativePnl && peak.date !== last.date) {
      base.development = `The session-end high was ${recapMoney(peak.cumulativePnl)} on ${recapWeekday(peak.date)}; subsequent sessions reduced it by ${amount(peak.cumulativePnl - total)}.`;
    } else if (trough.cumulativePnl < 0 && total > trough.cumulativePnl && trough.date !== last.date) {
      base.development = `After reaching ${recapMoney(trough.cumulativePnl)} on ${recapWeekday(trough.date)}, the recorded sessions recovered ${amount(total - trough.cumulativePnl)}${total < 0 ? " but remained below zero" : ""}.`;
    } else if (sessions.length > 2) {
      const largest = sessions.reduce((best, row) => Math.abs(row.pnl) > Math.abs(best.pnl) ? row : best, sessions[0]);
      base.development = `${recapWeekday(largest.date)} made the largest daily move (${recapMoney(largest.pnl)}). The other sessions combined for ${recapMoney(total - largest.pnl)}.`;
    }
  }
  // Combine a swing trade's activity across days, without substituting lifetime P&L.
  const grouped = new Map<number, { id: number; symbol: string; pnl: number; dates: string[]; date: string; largestActivity: number }>();
  for (const session of sessions) for (const trade of session.trades) {
    if (!Number.isFinite(trade.pnl)) continue;
    const row = grouped.get(trade.id) ?? { ...trade, pnl: 0, dates: [], date: session.date, largestActivity: -1 };
    row.pnl += trade.pnl;
    row.dates.push(session.date);
    if (Math.abs(trade.pnl) > row.largestActivity) { row.date = session.date; row.largestActivity = Math.abs(trade.pnl); }
    grouped.set(trade.id, row);
  }
  const trades = [...grouped.values()].map((trade) => ({ ...trade, pnl: moneyRound(trade.pnl) })).sort((a, b) => b.pnl - a.pnl || a.id - b.id);
  const winner = trades.find((trade) => trade.pnl > 0);
  const loser = [...trades].reverse().find((trade) => trade.pnl < 0);
  for (const [trade, label] of [[winner, "Biggest contributor"], [loser, "Largest loss"]] as const) {
    if (!trade) continue;
    base.highlights.push({ id: trade.id, symbol: trade.symbol, pnl: trade.pnl, date: trade.date, dates: trade.dates, label });
  }
  const tickers = new Map<string, number>();
  for (const trade of trades) tickers.set(trade.symbol, moneyRound((tickers.get(trade.symbol) ?? 0) + trade.pnl));
  const positive = [...tickers.values()].filter((pnl) => pnl > 0);
  const negative = [...tickers.values()].filter((pnl) => pnl < 0);
  if (tickers.size > 0) {
    base.breadth = `${positive.length} ${positive.length === 1 ? "ticker contributed" : "tickers contributed"} ${recapMoney(positive.reduce((a, b) => a + b, 0))}; ${negative.length} ${negative.length === 1 ? "ticker subtracted" : "tickers subtracted"} ${amount(negative.reduce((a, b) => a + b, 0))}. These are net results by ticker across the imported sessions.`;
  }
  // Full-session/backfilled context is never presented as a live observation.
  base.market = sessions.flatMap((row) => row.market && row.date < input.asOfDate && row.market.updatedDate <= input.asOfDate
    ? [{ date: row.date, observation: row.market }] : []);
  base.question = winner && loser
    ? `Compare ${winner.symbol === loser.symbol ? `the two ${winner.symbol} trades` : `the ${winner.symbol} contributor and the ${loser.symbol} loss`}: what differed in the entry plan, risk and exit? Record the difference before choosing a change for next week.`
    : trades.some((trade) => trade.pnl !== 0)
      ? `Review the ${winner?.symbol ?? loser?.symbol} trade against your entry plan and exit notes. What would you repeat or change?`
      : null;
  return base;
}
