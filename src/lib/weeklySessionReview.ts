import { median, priceBands, type ReviewTrade } from "./analyticsReview";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PNL_TOLERANCE = 0.02;

export type WeeklySessionReviewInput = {
  weekStart: string;
  asOfDate: string;
  sessions: Array<{
    date: string;
    pnl: number;
    points: Array<{ timestamp: number; value: number }>;
    trades: Array<{ id: number; symbol: string; pnl: number }>;
  }>;
  rows?: ReviewTrade[];
};

export type WeeklySessionReview = {
  date: string;
  peakPnl: number;
  closingPnl: number;
  giveback: number;
  largestLoss?: { id: number; symbol: string; date: string; pnl: number };
  sizeComparison?: {
    peakShares: number;
    priorMedianPeakShares: number;
    multiple: number;
    sampleTrades: number;
  };
};

type Session = WeeklySessionReviewInput["sessions"][number];

export type WeeklyReviewFlag = {
  date: string;
  closingPnl: number;
  importedSessions: number;
  reasons: Array<"only_red_session" | "largest_loss" | "green_to_red">;
  curve?: Pick<WeeklySessionReview, "peakPnl" | "closingPnl" | "giveback">;
  largestLoss?: NonNullable<WeeklySessionReview["largestLoss"]> & {
    weekPnl: number;
    dates: string[];
  };
};

function validDate(date: string) {
  if (!ISO_DATE.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

function addDays(date: string, days: number) {
  if (!validDate(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isWeekday(date: string) {
  if (!validDate(date)) return false;
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/**
 * Data boundary: points are recorded trade-activity endpoints, not a true
 * mark-to-market curve; open-position P&L and between-fill peaks are not measured.
 */
function recordedCurve(session: Session) {
  if (!Number.isFinite(session.pnl) || session.points.length === 0) return null;
  const collapsed: Array<{ timestamp: number; value: number }> = [];
  let previousTimestamp = -Infinity;

  for (const point of session.points) {
    if (!Number.isFinite(point.timestamp)
      || !Number.isFinite(point.value)
      || point.timestamp < previousTimestamp) return null;
    previousTimestamp = point.timestamp;
    if (collapsed.at(-1)?.timestamp === point.timestamp) collapsed[collapsed.length - 1] = point;
    else collapsed.push(point);
  }

  const closingPoint = collapsed.at(-1)!;
  if (Math.abs(closingPoint.value - session.pnl) > PNL_TOLERANCE + Number.EPSILON) return null;
  let peakIndex = 0;
  for (let index = 1; index < collapsed.length; index += 1) {
    if (collapsed[index].value > collapsed[peakIndex].value) peakIndex = index;
  }
  const peakPnl = collapsed[peakIndex].value;
  if (peakPnl <= 0 || closingPoint.value >= 0 || peakIndex >= collapsed.length - 1) return null;
  return {
    peakPnl,
    closingPnl: closingPoint.value,
    giveback: peakPnl - closingPoint.value,
  };
}

function largestLoss(session: Session): WeeklySessionReview["largestLoss"] {
  const unique = new Map<number, Session["trades"][number]>();
  for (const trade of session.trades) {
    if (!Number.isSafeInteger(trade.id)
      || !trade.symbol.trim()
      || !Number.isFinite(trade.pnl)
      || unique.has(trade.id)) continue;
    unique.set(trade.id, trade);
  }
  const loss = [...unique.values()]
    .filter((trade) => trade.pnl < 0)
    .sort((left, right) => left.pnl - right.pnl || left.id - right.id)[0];
  return loss == null
    ? undefined
    : { id: loss.id, symbol: loss.symbol, date: session.date, pnl: loss.pnl };
}

function priceBand(row: ReviewTrade) {
  if (!Number.isFinite(row.price) || row.price <= 0) return null;
  return priceBands.find((band) => band.id !== "all" && row.price >= band.min && row.price < band.max) ?? null;
}

function validCompletedIntraday(row: ReviewTrade) {
  return Number.isSafeInteger(row.id)
    && validDate(row.date)
    && row.entryDate === row.date
    && Number.isFinite(row.entryAt)
    && Number.isFinite(row.exitAt)
    && row.exitAt >= row.entryAt
    && Number.isFinite(row.gross)
    && Number.isFinite(row.fees)
    && Number.isFinite(row.net)
    && Number.isFinite(row.holdMinutes)
    && (row.side === "long" || row.side === "short")
    && priceBand(row) != null;
}

function sizeComparison(
  loss: NonNullable<WeeklySessionReview["largestLoss"]>,
  rows: ReviewTrade[],
): WeeklySessionReview["sizeComparison"] {
  const target = rows.find((row) => row.id === loss.id
    && row.date === loss.date
    && row.symbol === loss.symbol
    && validCompletedIntraday(row)
    && row.net < 0
    && row.peakShares != null
    && Number.isFinite(row.peakShares)
    && row.peakShares > 0);
  if (!target) return undefined;
  const targetBand = priceBand(target)!;
  const uniquePrior = new Map<number, ReviewTrade>();

  for (const row of [...rows].sort((left, right) => left.exitAt - right.exitAt || left.id - right.id)) {
    if (row.id === target.id
      || uniquePrior.has(row.id)
      || !validCompletedIntraday(row)
      || row.date !== loss.date
      || row.exitAt >= target.entryAt
      || row.side !== target.side
      || priceBand(row)?.id !== targetBand.id
      || row.peakShares == null
      || !Number.isFinite(row.peakShares)
      || row.peakShares <= 0) continue;
    uniquePrior.set(row.id, row);
  }

  const priorShares = [...uniquePrior.values()].map((row) => row.peakShares!);
  if (priorShares.length < 2) return undefined;
  const priorMedianPeakShares = median(priorShares);
  if (priorMedianPeakShares == null || !Number.isFinite(priorMedianPeakShares) || priorMedianPeakShares <= 0) return undefined;
  return {
    peakShares: target.peakShares!,
    priorMedianPeakShares,
    multiple: target.peakShares! / priorMedianPeakShares,
    sampleTrades: priorShares.length,
  };
}

export function buildWeeklySessionReview(input: WeeklySessionReviewInput): WeeklySessionReview | null {
  const weekEnd = addDays(input.weekStart, 4);
  if (!weekEnd || !validDate(input.asOfDate)) return null;
  const currentEnd = input.asOfDate < weekEnd ? input.asOfDate : weekEnd;
  const candidates = input.sessions.flatMap((session) => {
    if (!isWeekday(session.date)
      || session.date < input.weekStart
      || session.date > currentEnd) return [];
    const curve = recordedCurve(session);
    return curve == null ? [] : [{ session, curve }];
  }).sort((left, right) => right.curve.giveback - left.curve.giveback
    || left.session.date.localeCompare(right.session.date));
  const selected = candidates[0];
  if (!selected) return null;

  const loss = largestLoss(selected.session);
  const comparison = loss && input.rows ? sizeComparison(loss, input.rows) : undefined;
  return {
    date: selected.session.date,
    ...selected.curve,
    ...(loss ? { largestLoss: loss } : {}),
    ...(comparison ? { sizeComparison: comparison } : {}),
  };
}

/** One day to open from the week overview; reflection remains in the day review. */
export function buildWeeklyReviewFlag(input: WeeklySessionReviewInput): WeeklyReviewFlag | null {
  const weekEnd = addDays(input.weekStart, 4);
  if (!weekEnd || !validDate(input.asOfDate)
    || new Date(`${input.weekStart}T00:00:00Z`).getUTCDay() !== 1) return null;
  const currentEnd = input.asOfDate < weekEnd ? input.asOfDate : weekEnd;
  const byDate = new Map<string, Session>();
  const duplicateDates = new Set<string>();
  for (const session of input.sessions) {
    if (!isWeekday(session.date) || session.date < input.weekStart || session.date > currentEnd
      || !Number.isFinite(session.pnl) || !session.trades.some(validFlagTrade)) continue;
    // Ambiguous duplicate sessions must not manufacture a second imported day.
    if (byDate.has(session.date)) duplicateDates.add(session.date);
    else byDate.set(session.date, session);
  }
  const sessions = [...byDate.values()].filter((session) => !duplicateDates.has(session.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  if (!sessions.length) return null;

  const flags = new Map<string, WeeklyReviewFlag>();
  const flagFor = (session: Session): WeeklyReviewFlag => {
    const flag = flags.get(session.date) ?? {
      date: session.date, closingPnl: session.pnl, importedSessions: sessions.length, reasons: [],
    };
    flags.set(session.date, flag);
    return flag;
  };
  const redSessions = sessions.filter((session) => session.pnl < 0);
  if (sessions.length >= 2 && redSessions.length === 1) {
    flagFor(redSessions[0]).reasons.push("only_red_session");
  }

  // Rank each trade's net contribution inside this week, then attribute a
  // multi-session trade to the day of its largest negative contribution.
  const trades = new Map<number, { id: number; symbol: string; pnl: number; contributions: Array<{ date: string; pnl: number }> }>();
  const ambiguousTrades = new Set<number>();
  for (const session of sessions) {
    const seen = new Set<number>();
    for (const trade of session.trades) {
      if (!validFlagTrade(trade)) continue;
      if (seen.has(trade.id)) { ambiguousTrades.add(trade.id); continue; }
      seen.add(trade.id);
      const row = trades.get(trade.id) ?? { id: trade.id, symbol: trade.symbol.trim(), pnl: 0, contributions: [] };
      if (row.symbol !== trade.symbol.trim()) ambiguousTrades.add(trade.id);
      row.pnl += trade.pnl;
      row.contributions.push({ date: session.date, pnl: trade.pnl });
      trades.set(trade.id, row);
    }
  }
  const largest = [...trades.values()]
    .map((trade) => ({ ...trade, pnl: Math.round(trade.pnl * 100) / 100 }))
    .filter((trade) => !ambiguousTrades.has(trade.id) && Number.isFinite(trade.pnl) && trade.pnl < 0)
    .sort((left, right) => left.pnl - right.pnl || left.id - right.id)[0];
  if (largest) {
    const contribution = [...largest.contributions].sort((left, right) => left.pnl - right.pnl
      || left.date.localeCompare(right.date))[0];
    const flag = flagFor(byDate.get(contribution.date)!);
    flag.reasons.push("largest_loss");
    flag.largestLoss = {
      id: largest.id, symbol: largest.symbol, date: contribution.date, pnl: contribution.pnl,
      weekPnl: largest.pnl, dates: largest.contributions.map((row) => row.date),
    };
  }
  for (const session of sessions) {
    const curve = recordedCurve(session);
    if (!curve || !Number.isFinite(curve.giveback)) continue;
    const flag = flagFor(session);
    flag.reasons.push("green_to_red");
    flag.curve = curve;
  }
  const impact = (flag: WeeklyReviewFlag) => Math.max(
    Math.abs(flag.closingPnl), flag.curve?.giveback ?? 0, Math.abs(flag.largestLoss?.weekPnl ?? 0),
  );
  return [...flags.values()].sort((left, right) => right.reasons.length - left.reasons.length
    || impact(right) - impact(left) || left.date.localeCompare(right.date))[0] ?? null;
}

function validFlagTrade(trade: Session["trades"][number]) {
  return Number.isSafeInteger(trade.id) && trade.id > 0 && trade.symbol.trim().length > 0 && Number.isFinite(trade.pnl);
}
