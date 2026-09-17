import type Database from "better-sqlite3";
import { qualifyCoreMover } from "./rules";
import type {
  ArchiveMoverAggregate,
  ArchiveMoverSort,
  ArchiveMoverSummary,
  ArchivePeakSession,
  ArchiveSessionEvidence,
  ArchiveUniverse,
  ListMoversInput,
  ListMoversResult,
  TradingDaySummary,
} from "./types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** Instrument-quality rules, independent of the 50% threshold. */
const CORE_QUALITY = `
  d.split_event = 0
  and d.instrument_type in ('CS', 'ADRC')
  and d.previous_regular_close > 0
  and julianday(d.session_date) - julianday(d.previous_close_date) between 1 and 7
`;
const MOVER_SOURCE = `
  from symbol_days d
  left join session_stats p on p.session_date = d.session_date and p.symbol = d.symbol and p.session = 'premarket'
  left join session_stats r on r.session_date = d.session_date and r.symbol = d.symbol and r.session = 'regular'
  left join session_stats a on a.session_date = d.session_date and a.symbol = d.symbol and a.session = 'afterHours'
`;
const BARE_SOURCE = "from symbol_days d";

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

function universeFilter(universe: ArchiveUniverse, belowThreshold = false): string {
  const threshold = belowThreshold ? "d.qualifies_mover = 0" : "d.qualifies_mover = 1";
  return universe === "raw" ? threshold : `${threshold} and ${CORE_QUALITY}`;
}

/**
 * Every measure is all-session. The peak-session control filters which rows appear;
 * it never changes what a column means.
 */
const GAIN_EXPRESSION = "d.max_gain_pct";
const HIGH_EXPRESSION = "d.max_high";
const VOLUME_EXPRESSION = "coalesce(p.volume, 0) + coalesce(r.volume, 0) + coalesce(a.volume, 0)";
const DOLLAR_VOLUME_EXPRESSION =
  "coalesce(p.estimated_dollar_volume, 0) + coalesce(r.estimated_dollar_volume, 0) + coalesce(a.estimated_dollar_volume, 0)";
/** A missing RVOL ranks below every real reading, so a floor never admits an unmeasured row. */
const RVOL_FLOOR_EXPRESSION =
  "max(coalesce(p.rvol20_mean, -1), coalesce(r.rvol20_mean, -1), coalesce(a.rvol20_mean, -1))";
const RVOL_SORT_EXPRESSION =
  "max(coalesce(p.rvol20_mean, 0), coalesce(r.rvol20_mean, 0), coalesce(a.rvol20_mean, 0))";

/**
 * Which session held the day's high. Ties resolve premarket → regular → afterHours to
 * match peakSession() below, so the three filters partition the set exactly.
 */
const PEAK_SESSION_CONDITIONS = {
  premarket: `d.premarket_high_gain_pct is not null
    and d.premarket_high_gain_pct >= coalesce(d.regular_high_gain_pct, -1e9)
    and d.premarket_high_gain_pct >= coalesce(d.after_hours_high_gain_pct, -1e9)`,
  regular: `d.regular_high_gain_pct is not null
    and d.regular_high_gain_pct > coalesce(d.premarket_high_gain_pct, -1e9)
    and d.regular_high_gain_pct >= coalesce(d.after_hours_high_gain_pct, -1e9)`,
  afterHours: `d.after_hours_high_gain_pct is not null
    and d.after_hours_high_gain_pct > coalesce(d.premarket_high_gain_pct, -1e9)
    and d.after_hours_high_gain_pct > coalesce(d.regular_high_gain_pct, -1e9)`,
} as const;

function sortExpression(sort: ArchiveMoverSort): string {
  if (sort === "date") return "d.session_date";
  if (sort === "name") return "coalesce(nullif(d.instrument_name, ''), d.symbol)";
  if (sort === "symbol") return "d.symbol";
  if (sort === "price") return "d.previous_regular_close";
  if (sort === "gain") return GAIN_EXPRESSION;
  if (sort === "high") return HIGH_EXPRESSION;
  if (sort === "volume") return VOLUME_EXPRESSION;
  if (sort === "rvol") return RVOL_SORT_EXPRESSION;
  return DOLLAR_VOLUME_EXPRESSION;
}

function sessionRow(row: MoverRow, session: Exclude<ArchivePeakSession, "all">): SessionRow {
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

function peakSession(row: MoverRow): Exclude<ArchivePeakSession, "all"> | null {
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

function evidenceFor(row: MoverRow): ArchiveSessionEvidence {
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

/** The regular-session leg of the day's path, based on wherever premarket ended. */
function continuationPercent(row: MoverRow): number | null {
  const base = row.premarketHigh ?? row.previousRegularClose;
  if (!base || !Number.isFinite(base) || base <= 0) return null;
  if (row.regularHigh === null || !Number.isFinite(row.regularHigh)) return null;
  return ((row.regularHigh / base) - 1) * 100;
}

function moverSummary(row: MoverRow): ArchiveMoverSummary {
  const qualification = qualifyCoreMover({
    instrumentType: row.instrumentType,
    maxGainPercent: row.maxGainPercent,
    previousCloseDate: row.previousCloseDate,
    previousRegularClose: row.previousRegularClose,
    sessionDateEt: row.date,
    splitEvent: Boolean(row.splitEvent),
  });
  return {
    afterHoursGainFromRegularClosePercent: row.afterHoursGainFromRegularClosePercent,
    afterHoursGainPercent: row.afterHoursGainPercent,
    continuationPercent: continuationPercent(row),
    coreExclusionReasons: qualification.excludedBy,
    date: row.date,
    evidence: evidenceFor(row),
    instrumentName: row.instrumentName,
    instrumentType: row.instrumentType,
    peakSession: peakSession(row),
    premarketGainPercent: row.premarketGainPercent,
    previousRegularClose: row.previousRegularClose,
    primaryExchange: row.primaryExchange,
    qualifiesCore: qualification.qualifies,
    regularGainPercent: row.regularGainPercent,
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

type MoverQueryPlan = {
  needsJoins: boolean;
  parameters: Record<string, string | number>;
  where: string;
};

function planMoverQuery(input: ListMoversInput): MoverQueryPlan {
  const universe = input.universe ?? "core";
  const peak = input.peakSession ?? "all";
  const date = validDate(input.date, "date");
  const from = validDate(input.from, "from");
  const to = validDate(input.to, "to");
  if (from && to && from > to) throw new Error("from must not be after to");

  const conditions = [universeFilter(universe, input.belowThreshold === true)];
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
  if (peak !== "all") conditions.push(`(${PEAK_SESSION_CONDITIONS[peak]})`);
  if (input.minGain !== undefined && Number.isFinite(input.minGain)) {
    conditions.push(`${GAIN_EXPRESSION} >= @minGain`);
    parameters.minGain = input.minGain;
  }
  if (input.maxGain !== undefined && Number.isFinite(input.maxGain)) {
    conditions.push(`${GAIN_EXPRESSION} < @maxGain`);
    parameters.maxGain = input.maxGain;
  }
  let needsJoins = false;
  if (input.minPreviousClose !== undefined) {
    if (!Number.isFinite(input.minPreviousClose) || input.minPreviousClose < 0) throw new Error("Invalid minimum previous close");
    conditions.push("d.previous_regular_close >= @minPreviousClose");
    parameters.minPreviousClose = input.minPreviousClose;
  }
  if (input.minRvol !== undefined && Number.isFinite(input.minRvol)) {
    conditions.push(`${RVOL_FLOOR_EXPRESSION} >= @minRvol`);
    parameters.minRvol = input.minRvol;
    needsJoins = true;
  }

  return { needsJoins, parameters, where: conditions.join(" and ") };
}

export function listMoversFromDatabase(
  database: Database.Database,
  input: ListMoversInput = {},
): ListMoversResult {
  const sort = input.sort ?? "gain";
  const direction = input.direction === "asc" ? "asc" : "desc";
  const limit = Math.min(200, Math.max(1, Math.trunc(input.limit ?? 100)));
  const offset = Math.max(0, Math.trunc(input.offset ?? 0));
  const plan = planMoverQuery(input);
  const countSource = plan.needsJoins ? MOVER_SOURCE : BARE_SOURCE;

  const total = database
    .prepare(`select count(*) as count ${countSource} where ${plan.where}`)
    .get(plan.parameters) as { count: number };
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
    ${MOVER_SOURCE}
    where ${plan.where}
    order by ${sortExpression(sort)} ${direction}, d.session_date desc, d.symbol asc
    limit @limit offset @offset
  `).all({ ...plan.parameters, limit, offset }) as MoverRow[];

  return { movers: rows.map((row) => moverSummary(row)), total: total.count };
}

/**
 * Aggregates the whole filtered set rather than the current page, so the stat
 * strip keeps reporting the archive rather than the slice on screen.
 */
export function summarizeMoversFromDatabase(
  database: Database.Database,
  input: ListMoversInput = {},
): ArchiveMoverAggregate {
  const plan = planMoverQuery(input);
  const gain = GAIN_EXPRESSION;
  const source = MOVER_SOURCE;

  const totals = database.prepare(`
    select
      count(*) as total,
      count(distinct d.symbol) as symbols,
      count(distinct d.session_date) as days,
      max(${gain}) as largestGain,
      coalesce(sum(${DOLLAR_VOLUME_EXPRESSION}), 0) as dollarVolume,
      sum(case when ${gain} is null then 0 else 1 end) as gainCount
    ${source}
    where ${plan.where}
  `).get(plan.parameters) as {
    days: number;
    dollarVolume: number;
    gainCount: number | null;
    largestGain: number | null;
    symbols: number;
    total: number;
  };

  const gainCount = totals.gainCount ?? 0;
  let medianGain: number | null = null;
  if (gainCount > 0) {
    const middle = database.prepare(`
      select ${gain} as value
      ${source}
      where ${plan.where} and ${gain} is not null
      order by value asc
      limit @take offset @skip
    `).all({
      ...plan.parameters,
      skip: Math.floor((gainCount - 1) / 2),
      take: gainCount % 2 === 0 ? 2 : 1,
    }) as Array<{ value: number }>;
    if (middle.length > 0) {
      medianGain = middle.reduce((sum, row) => sum + row.value, 0) / middle.length;
    }
  }

  return {
    days: totals.days,
    dollarVolume: totals.dollarVolume,
    largestGain: totals.largestGain,
    medianGain,
    symbols: totals.symbols,
    total: totals.total,
  };
}
