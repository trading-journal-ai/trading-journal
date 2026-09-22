import { createMarketArchiveClient, createServerArchiveClient, type MarketArchiveClient } from "./marketArchive/provider";
import type { ArchiveMoverSummary, MarketHistoryDay } from "./marketArchive/types";
import type { WeeklyMarketReview } from "./weeklyCoachingTypes";
import { etDateString } from "./time";
import { tradingWeekDates } from "./journalPnlViews";

export type WeeklyMarketDayInput = {
  date: string;
  day: MarketHistoryDay | null;
  movers: ArchiveMoverSummary[];
  total: number;
  failed?: boolean;
};
// Only public market records are cached; account trades and overlaps never are.
// Coalesce concurrent week/month requests and bound retained history.
const marketDays = new Map<string, { expires: number; value: Promise<WeeklyMarketDayInput> }>();
function cachedMarketDay(key: string, read: () => Promise<WeeklyMarketDayInput>) {
  const existing = marketDays.get(key);
  if (existing && existing.expires > Date.now()) return existing.value;
  const value = read();
  marketDays.delete(key);
  const entry = { expires: Date.now() + 180_000, value };
  marketDays.set(key, entry);
  void value.then(record => { if (record.failed) entry.expires = Date.now() + 5_000; });
  while (marketDays.size > 40) marketDays.delete(marketDays.keys().next().value!);
  return value;
}
const unavailable = (): WeeklyMarketReview => ({
  status: "unavailable",
  summary: "Shared market evidence is unavailable for this week.",
  detail: "The trading results remain available. Market conditions are not inferred from your P&L.",
  days: [],
  note: "Market comparisons need recorded candidates and coverage for the same trading dates.",
});

/** Market-only observations and account-scoped ticker overlap remain distinct. */
export function buildWeeklyMarketReview(input: {
  records: WeeklyMarketDayInput[];
  sessions: { date: string; symbols: string[]; tickerPnl?: { symbol: string; pnl: number }[] }[];
  weekStart: string;
  asOfDate: string;
}): WeeklyMarketReview {
  const dates = tradingWeekDates(input.weekStart).filter(date => date < input.asOfDate);
  const records = input.records.filter(row => dates.includes(row.date));
  const days: WeeklyMarketReview["days"] = [];
  let incomplete = records.length < dates.length;
  for (const record of records) {
    if (record.failed || (record.day && record.day.date !== record.date)) { incomplete = true; continue; }
    const candidate = record.day?.candidateContext;
    if (candidate) {
      const published = Date.parse(candidate.publishedAt);
      if (!Number.isFinite(published) || etDateString(published / 1000) > input.asOfDate) { incomplete = true; continue; }
    }
    // Bounded candidate collection is not a complete market census, even when
    // all the selected candidates have been recovered successfully.
    const scanner = record.day?.dts;
    const scannerCoverage = scanner?.coverage && typeof scanner.coverage === "object" && "status" in scanner.coverage
      ? String(scanner.coverage.status) : "unknown";
    const observed = record.day?.massive.available === true || Boolean(candidate) || scanner?.available === true || record.movers.length > 0;
    if (!observed) { incomplete = true; continue; }
    const exactDateMovers = record.movers.filter(row => row.date === record.date && row.qualifiesCore === true && row.splitEvent === false);
    const seen = new Set<string>();
    const movers = exactDateMovers.filter(row => { if (seen.has(row.symbol)) return false; seen.add(row.symbol); return true; });
    const covered = record.day?.massive.available === true && !candidate;
    const partial = !covered || record.total > movers.length;
    incomplete ||= partial;
    const traded = new Set(input.sessions.find(row => row.date === record.date)?.symbols ?? []);
    const matched = movers.filter(row => traded.has(row.symbol)).map(row => row.symbol);
    const gain = (row: ArchiveMoverSummary) => {
      const values = [row.premarketGainPercent, row.regularGainPercent, row.afterHoursGainPercent]
        .filter((value): value is number => value != null && Number.isFinite(value));
      return values.length ? Math.max(...values) : null;
    };
    const leaders = [...movers].sort((a, b) => (gain(b) ?? -Infinity) - (gain(a) ?? -Infinity) || a.symbol.localeCompare(b.symbol)).slice(0, 3);
    const truncated = record.total > record.movers.length;
    days.push({
      date: record.date,
      coverage: (candidate ? `Selected candidates${candidate.state === "partial" ? " · partial recovery" : ""}; scanner ${scannerCoverage}`
        : covered ? "Minute archive" : `Scanner ${scannerCoverage}; candidate coverage unknown`) + (truncated ? `; first ${record.movers.length} of ${record.total} records` : ""),
      eligibleMovers: movers.length > 0 || covered || candidate ? movers.length : null,
      tradedSymbols: matched,
      leaders: leaders.map(row => ({ symbol: row.symbol, peakGainPercent: gain(row), traded: traded.has(row.symbol) })),
      source: candidate ? "Candidate recovery" : "Market archive / scanner",
    });
  }
  if (!days.length) return unavailable();
  const matchedDays = days.filter(day => day.tradedSymbols.length > 0).length;
  const matchedSymbols = new Set(days.flatMap(day => day.tradedSymbols));
  const matchedResults = days.flatMap(day => day.tradedSymbols.map(symbol => input.sessions
    .find(session => session.date === day.date)?.tickerPnl?.find(ticker => ticker.symbol === symbol)?.pnl));
  const matchedPnl = matchedResults.length > 0 && matchedResults.every((value): value is number => typeof value === "number" && Number.isFinite(value))
    ? Math.round(matchedResults.reduce((sum, value) => sum + value, 0) * 100) / 100 : null;
  return {
    status: incomplete ? "partial" : "available",
    matchedPnl,
    summary: matchedSymbols.size
      ? `Your trades overlapped with ${matchedSymbols.size} recorded qualifying ${matchedSymbols.size === 1 ? "mover" : "movers"} across ${matchedDays} ${matchedDays === 1 ? "session" : "sessions"}.`
      : "Your traded tickers did not overlap with the qualifying movers in the available records.",
    detail: `${days.length} completed ${days.length === 1 ? "session has" : "sessions have"} market evidence. ${incomplete ? "Coverage is limited; an unlisted ticker is not proof of a missed opportunity." : "Matches use the same ticker and trading date."}`,
    days,
    note: "These are retrospective ≥50% Core mover rankings, not entry-time signals. Selected-candidate coverage is not the whole market. Same-day context is withheld until the next ET date. Heat and achievable move capture are not graded.",
  };
}

export async function loadWeeklyMarketReview(input: {
  weekStart: string;
  asOfDate: string;
  sessions: { date: string; symbols: string[]; tickerPnl?: { symbol: string; pnl: number }[] }[];
}, client?: MarketArchiveClient): Promise<WeeklyMarketReview> {
  try {
    const provider = process.env.MARKET_HISTORY_PROVIDER?.trim() || "local";
    const reader = client ?? (provider === "server"
      ? createServerArchiveClient(process.env, (url, options) => fetch(url, {
          ...options,
          signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000),
        }))
      : createMarketArchiveClient());
    const records = await Promise.all(tradingWeekDates(input.weekStart).filter(date => date < input.asOfDate).map(date => {
      const read = async (): Promise<WeeklyMarketDayInput> => {
        try {
          const [day, result] = await Promise.all([
            reader.getDay(date),
            reader.listMovers({ date, universe: "core", sort: "gain", direction: "desc", limit: 200, offset: 0 }),
          ]);
          // The endpoint is capped. Do not describe a truncated list as complete.
          return { date, day, movers: result.movers, total: result.total };
        } catch { return { date, day: null, movers: [], total: 0, failed: true }; }
      };
      // Injected readers deliberately bypass global caching for isolation.
      return client ? read() : cachedMarketDay(`${provider}:${process.env.MARKET_HISTORY_SERVER_URL ?? ""}:${date}`, read);
    }));
    return buildWeeklyMarketReview({ ...input, records });
  } catch { return unavailable(); }
}
