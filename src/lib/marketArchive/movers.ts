import type Database from "better-sqlite3";
import { qualifyCoreMover } from "./rules";
import type {
  ArchiveMoverSort,
  ArchiveMoverSummary,
  ArchiveSessionEvidence,
  ArchiveSessionLens,
  ArchiveUniverse,
  ListMoversInput,
  ListMoversResult,
  TradingDaySummary,
} from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CORE_FILTER = `
  d.qualifies_mover = 1
  and d.split_event = 0
  and d.instrument_type = 'CS'
  and d.previous_regular_close >= 1
  and julianday(d.session_date) - julianday(d.previous_close_date) between 1 and 7
`;
const RAW_FILTER = "d.qualifies_mover = 1";

type SessionRow = {
  activeMinutes: number | null;
  close: number | null;
  closeDistanceFromHighPercent: number | null;
  dollarVolume: number | null;
  high: number | null;
  highAt: string | null;
  rvol: number | null;
  transactions: number | null;
  transactionsPerActiveMinute: number | null;
  volume: number | null;
};

type MoverRow = {
  afterHoursActiveMinutes: number | null;
  afterHoursClose: number | null;
  afterHoursCloseDistanceFromHighPercent: number | null;
  afterHoursDollarVolume: number | null;
  afterHoursGainFromRegularClosePercent: number | null;
  afterHoursGainPercent: number | null;
  afterHoursHigh: number | null;
  afterHoursHighAt: string | null;
  afterHoursRvol: number | null;
  afterHoursTransactions: number | null;
  afterHoursTransactionsPerActiveMinute: number | null;
  afterHoursVolume: number | null;
  date: string;
  instrumentName: string | null;
  instrumentType: string | null;
  maxGainPercent: number | null;
  maxHigh: number | null;
  premarketActiveMinutes: number | null;
  premarketClose: number | null;
  premarketCloseDistanceFromHighPercent: number | null;
  premarketDollarVolume: number | null;
  premarketGainPercent: number | null;
  premarketHigh: number | null;
  premarketHighAt: string | null;
  premarketRvol: number | null;
  premarketTransactions: number | null;
  premarketTransactionsPerActiveMinute: number | null;
  premarketVolume: number | null;
  previousCloseDate: string | null;
  previousRegularClose: number | null;
  primaryExchange: string | null;
  regularActiveMinutes: number | null;
  regularClose: number | null;
  regularCloseDistanceFromHighPercent: number | null;
  regularDollarVolume: number | null;
  regularGainPercent: number | null;
  regularHigh: number | null;
  regularHighAt: string | null;
  regularRvol: number | null;
  regularTransactions: number | null;
  regularTransactionsPerActiveMinute: number | null;
  regularVolume: number | null;
  splitEvent: number;
  symbol: string;
};

function validDate(value: string | undefined, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (!DATE_PATTERN.test(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  return value;
}

function universeFilter(universe: ArchiveUniverse): string {
  return universe === "raw" ? RAW_FILTER : CORE_FILTER;
}

function sortExpression(sort: ArchiveMoverSort, session: ArchiveSessionLens): string {
  if (sort === "symbol") return "d.symbol";
  if (sort === "price") return "d.previous_regular_close";
  if (sort === "gain") {
    if (session === "premarket") return "d.premarket_high_gain_pct";
    if (session === "regular") return "d.regular_high_gain_pct";
    if (session === "afterHours") return "d.after_hours_gain_from_regular_close_pct";
    return "d.max_gain_pct";
  }
  if (sort === "rvol") {
    if (session === "premarket") return "p.rvol20_mean";
    if (session === "regular") return "r.rvol20_mean";
    if (session === "afterHours") return "a.rvol20_mean";
    return "max(coalesce(p.rvol20_mean, 0), coalesce(r.rvol20_mean, 0), coalesce(a.rvol20_mean, 0))";
  }
  if (session === "premarket") return "p.estimated_dollar_volume";
  if (session === "regular") return "r.estimated_dollar_volume";
  if (session === "afterHours") return "a.estimated_dollar_volume";
  return "coalesce(p.estimated_dollar_volume, 0) + coalesce(r.estimated_dollar_volume, 0) + coalesce(a.estimated_dollar_volume, 0)";
}

function sessionRow(row: MoverRow, session: Exclude<ArchiveSessionLens, "all">): SessionRow {
  if (session === "premarket") {
    return {
      activeMinutes: row.premarketActiveMinutes,
      close: row.premarketClose,
      closeDistanceFromHighPercent: row.premarketCloseDistanceFromHighPercent,
      dollarVolume: row.premarketDollarVolume,
      high: row.premarketHigh,
      highAt: row.premarketHighAt,
      rvol: row.premarketRvol,
      transactions: row.premarketTransactions,
      transactionsPerActiveMinute: row.premarketTransactionsPerActiveMinute,
      volume: row.premarketVolume,
    };
  }
  if (session === "regular") {
    return {
      activeMinutes: row.regularActiveMinutes,
      close: row.regularClose,
      closeDistanceFromHighPercent: row.regularCloseDistanceFromHighPercent,
      dollarVolume: row.regularDollarVolume,
      high: row.regularHigh,
      highAt: row.regularHighAt,
      rvol: row.regularRvol,
      transactions: row.regularTransactions,
      transactionsPerActiveMinute: row.regularTransactionsPerActiveMinute,
      volume: row.regularVolume,
    };
  }
  return {
    activeMinutes: row.afterHoursActiveMinutes,
    close: row.afterHoursClose,
    closeDistanceFromHighPercent: row.afterHoursCloseDistanceFromHighPercent,
    dollarVolume: row.afterHoursDollarVolume,
    high: row.afterHoursHigh,
    highAt: row.afterHoursHighAt,
    rvol: row.afterHoursRvol,
    transactions: row.afterHoursTransactions,
    transactionsPerActiveMinute: row.afterHoursTransactionsPerActiveMinute,
    volume: row.afterHoursVolume,
  };
}

function gainFor(row: MoverRow, session: Exclude<ArchiveSessionLens, "all">): number | null {
  if (session === "premarket") return row.premarketGainPercent;
  if (session === "regular") return row.regularGainPercent;
  return row.afterHoursGainFromRegularClosePercent;
}

function peakSession(row: MoverRow): Exclude<ArchiveSessionLens, "all"> | null {
  const values = [
    ["premarket", row.premarketGainPercent],
    ["regular", row.regularGainPercent],
    ["afterHours", row.afterHoursGainPercent],
  ] as const;
  let peak: (typeof values)[number] | null = null;
  for (const value of values) {
    if (value[1] === null || !Number.isFinite(value[1])) continue;
    if (!peak || value[1] > (peak[1] ?? Number.NEGATIVE_INFINITY)) peak = value;
  }
  return peak?.[0] ?? null;
}

function evidenceFor(row: MoverRow, session: ArchiveSessionLens): ArchiveSessionEvidence {
  if (session !== "all") {
    const source = sessionRow(row, session);
    return {
      activeMinutes: source.activeMinutes ?? 0,
      close: source.close,
      closeDistanceFromHighPercent: source.closeDistanceFromHighPercent,
      dollarVolume: source.dollarVolume ?? 0,
      gainPercent: gainFor(row, session),
      high: source.high,
      highAt: source.highAt,
      rvol: source.rvol,
      transactions: source.transactions ?? 0,
      transactionsPerActiveMinute: source.transactionsPerActiveMinute,
      volume: source.volume ?? 0,
    };
  }

  const sessions = (["premarket", "regular", "afterHours"] as const).map((value) => sessionRow(row, value));
  const peak = peakSession(row);
  const peakEvidence = peak ? sessionRow(row, peak) : null;
  const lastClose = row.afterHoursClose ?? row.regularClose ?? row.premarketClose;
  const finiteRvols = sessions
    .map((value) => value.rvol)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  return {
    activeMinutes: sessions.reduce((sum, value) => sum + (value.activeMinutes ?? 0), 0),
    close: lastClose,
    closeDistanceFromHighPercent: lastClose && row.maxHigh
      ? ((lastClose / row.maxHigh) - 1) * 100
      : null,
    dollarVolume: sessions.reduce((sum, value) => sum + (value.dollarVolume ?? 0), 0),
    gainPercent: row.maxGainPercent,
    high: row.maxHigh,
    highAt: peakEvidence?.highAt ?? null,
    rvol: finiteRvols.length > 0 ? Math.max(...finiteRvols) : null,
    transactions: sessions.reduce((sum, value) => sum + (value.transactions ?? 0), 0),
    transactionsPerActiveMinute: null,
    volume: sessions.reduce((sum, value) => sum + (value.volume ?? 0), 0),
  };
}

function moverSummary(row: MoverRow, session: ArchiveSessionLens): ArchiveMoverSummary {
  const qualification = qualifyCoreMover({
    instrumentType: row.instrumentType,
    maxGainPercent: row.maxGainPercent,
    previousCloseDate: row.previousCloseDate,
    previousRegularClose: row.previousRegularClose,
    sessionDateEt: row.date,
    splitEvent: Boolean(row.splitEvent),
  });
  return {
    coreExclusionReasons: qualification.excludedBy,
    date: row.date,
    instrumentName: row.instrumentName,
    instrumentType: row.instrumentType,
    lens: evidenceFor(row, session),
    peakSession: peakSession(row),
    previousRegularClose: row.previousRegularClose,
    primaryExchange: row.primaryExchange,
    qualifiesCore: qualification.qualifies,
    splitEvent: Boolean(row.splitEvent),
    symbol: row.symbol,
  };
}

export function listTradingDaysFromDatabase(
  database: Database.Database,
  universe: ArchiveUniverse = "core",
): TradingDaySummary[] {
  return database.prepare(`
    select d.session_date as date, count(*) as moverCount
    from symbol_days d
    where ${universeFilter(universe)}
    group by d.session_date
    order by d.session_date desc
  `).all() as TradingDaySummary[];
}

export function listMoversFromDatabase(
  database: Database.Database,
  input: ListMoversInput = {},
): ListMoversResult {
  const universe = input.universe ?? "core";
  const session = input.session ?? "all";
  const sort = input.sort ?? "gain";
  const direction = input.direction === "asc" ? "asc" : "desc";
  const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 100)));
  const offset = Math.max(0, Math.trunc(input.offset ?? 0));
  const date = validDate(input.date, "date");
  const from = validDate(input.from, "from");
  const to = validDate(input.to, "to");
  if (from && to && from > to) throw new Error("from must not be after to");

  const conditions = [universeFilter(universe)];
  const parameters: Record<string, string | number> = {};
  if (date) {
    conditions.push("d.session_date = @date");
    parameters.date = date;
  } else {
    if (from) {
      conditions.push("d.session_date >= @from");
      parameters.from = from;
    }
    if (to) {
      conditions.push("d.session_date <= @to");
      parameters.to = to;
    }
  }
  const query = input.query?.trim().toUpperCase();
  if (query) {
    conditions.push("(upper(d.symbol) like @query or upper(coalesce(d.instrument_name, '')) like @query)");
    parameters.query = `%${query}%`;
  }
  const where = conditions.join(" and ");
  const total = database.prepare(`select count(*) as count from symbol_days d where ${where}`).get(parameters) as { count: number };
  const rows = database.prepare(`
    select
      d.session_date as date,
      d.symbol,
      d.instrument_name as instrumentName,
      d.instrument_type as instrumentType,
      d.primary_exchange as primaryExchange,
      d.split_event as splitEvent,
      d.previous_regular_close as previousRegularClose,
      d.previous_close_date as previousCloseDate,
      d.max_high as maxHigh,
      d.max_gain_pct as maxGainPercent,
      d.premarket_high as premarketHigh,
      d.premarket_high_gain_pct as premarketGainPercent,
      d.regular_high as regularHigh,
      d.regular_high_gain_pct as regularGainPercent,
      d.after_hours_high as afterHoursHigh,
      d.after_hours_high_gain_pct as afterHoursGainPercent,
      d.after_hours_gain_from_regular_close_pct as afterHoursGainFromRegularClosePercent,
      p.high_at as premarketHighAt,
      p.close as premarketClose,
      p.volume as premarketVolume,
      p.transactions as premarketTransactions,
      p.active_minutes as premarketActiveMinutes,
      p.estimated_dollar_volume as premarketDollarVolume,
      p.transactions_per_active_minute as premarketTransactionsPerActiveMinute,
      p.close_distance_from_high_pct as premarketCloseDistanceFromHighPercent,
      p.rvol20_mean as premarketRvol,
      r.high_at as regularHighAt,
      r.close as regularClose,
      r.volume as regularVolume,
      r.transactions as regularTransactions,
      r.active_minutes as regularActiveMinutes,
      r.estimated_dollar_volume as regularDollarVolume,
      r.transactions_per_active_minute as regularTransactionsPerActiveMinute,
      r.close_distance_from_high_pct as regularCloseDistanceFromHighPercent,
      r.rvol20_mean as regularRvol,
      a.high_at as afterHoursHighAt,
      a.close as afterHoursClose,
      a.volume as afterHoursVolume,
      a.transactions as afterHoursTransactions,
      a.active_minutes as afterHoursActiveMinutes,
      a.estimated_dollar_volume as afterHoursDollarVolume,
      a.transactions_per_active_minute as afterHoursTransactionsPerActiveMinute,
      a.close_distance_from_high_pct as afterHoursCloseDistanceFromHighPercent,
      a.rvol20_mean as afterHoursRvol
    from symbol_days d
    left join session_stats p on p.session_date = d.session_date and p.symbol = d.symbol and p.session = 'premarket'
    left join session_stats r on r.session_date = d.session_date and r.symbol = d.symbol and r.session = 'regular'
    left join session_stats a on a.session_date = d.session_date and a.symbol = d.symbol and a.session = 'afterHours'
    where ${where}
    order by ${sortExpression(sort, session)} ${direction}, d.session_date desc, d.symbol asc
    limit @limit offset @offset
  `).all({ ...parameters, limit, offset }) as MoverRow[];

  return { movers: rows.map((row) => moverSummary(row, session)), total: total.count };
}
