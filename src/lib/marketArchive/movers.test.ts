import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { listMoversFromDatabase, listTradingDaysFromDatabase, summarizeMoversFromDatabase } from "./movers";

const databases: Database.Database[] = [];

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

function fixtureDatabase(): Database.Database {
  const database = new Database(":memory:");
  databases.push(database);
  database.exec(`
    create table symbol_days (
      session_date text not null,
      symbol text not null,
      instrument_type text,
      instrument_name text,
      primary_exchange text,
      split_event integer not null,
      previous_regular_close real,
      previous_close_date text,
      premarket_high real,
      premarket_high_gain_pct real,
      regular_high real,
      regular_high_gain_pct real,
      regular_close real,
      after_hours_high real,
      after_hours_high_gain_pct real,
      after_hours_gain_from_regular_close_pct real,
      max_high real,
      max_gain_pct real,
      qualifies_mover integer not null,
      primary key (session_date, symbol)
    );
    create table session_stats (
      session_date text not null,
      symbol text not null,
      session text not null,
      high_at text,
      close real,
      volume real,
      transactions real,
      active_minutes integer,
      estimated_dollar_volume real,
      transactions_per_active_minute real,
      close_distance_from_high_pct real,
      rvol20_mean real,
      primary key (session_date, symbol, session)
    );

    insert into symbol_days values
      ('2026-08-24', 'CORE', 'CS', 'Core Biotech', 'XNAS', 0, 2.00, '2026-08-21',
       3.00, 50, 3.80, 90, 3.60, 4.40, 120, 22.2222, 4.40, 120, 1),
      ('2026-08-24', 'FUND', 'ETF', 'Fund ETF', 'ARCX', 0, 5.00, '2026-08-21',
       8.00, 60, 7.50, 50, 7.00, 8.50, 70, 21.4286, 8.50, 70, 1),
      ('2026-08-23', 'SPLT', 'CS', 'Split Corp', 'XNYS', 1, 1.50, '2026-08-22',
       2.40, 60, 2.30, 53.3333, 2.20, 2.10, 40, -4.5455, 2.40, 60, 1);

    insert into session_stats values
      ('2026-08-24', 'CORE', 'premarket', '2026-08-24T08:15:00Z', 2.80, 1000, 50, 20, 2800, 2.5, -6.6667, 3),
      ('2026-08-24', 'CORE', 'regular', '2026-08-24T15:30:00Z', 3.60, 5000, 250, 100, 18000, 2.5, -5.2632, 7),
      ('2026-08-24', 'CORE', 'afterHours', '2026-08-24T21:10:00Z', 4.10, 2000, 100, 30, 8200, 3.3333, -6.8182, 5),
      ('2026-08-24', 'FUND', 'regular', '2026-08-24T17:00:00Z', 7.00, 3000, 120, 60, 21000, 2, -6.6667, 2),
      ('2026-08-23', 'SPLT', 'premarket', '2026-08-23T10:00:00Z', 2.00, 800, 40, 10, 1600, 4, -16.6667, 10);
  `);
  return database;
}

describe("Momentum Archive mover queries", () => {
  it("keeps the default Core universe to qualifying common stocks", () => {
    const result = listMoversFromDatabase(fixtureDatabase(), { date: "2026-08-24" });

    expect(result.total).toBe(1);
    expect(result.movers[0]).toMatchObject({
      coreExclusionReasons: [],
      peakSession: "afterHours",
      qualifiesCore: true,
      symbol: "CORE",
    });
    expect(result.movers[0].evidence).toMatchObject({
      activeMinutes: 150,
      dollarVolume: 29_000,
      gainPercent: 120,
      highAt: "2026-08-24T21:10:00Z",
      rvol: 7,
      transactions: 400,
      volume: 8000,
    });
  });

  it("preserves excluded raw evidence and explains why it is outside Core", () => {
    const result = listMoversFromDatabase(fixtureDatabase(), {
      direction: "asc",
      sort: "symbol",
      universe: "raw",
    });

    expect(result.movers.map((mover) => mover.symbol)).toEqual(["CORE", "FUND", "SPLT"]);
    expect(result.movers[1]).toMatchObject({
      coreExclusionReasons: ["instrument_not_common_stock"],
      qualifiesCore: false,
    });
    expect(result.movers[2]).toMatchObject({
      coreExclusionReasons: ["known_split_execution_date"],
      qualifiesCore: false,
    });
  });

  it("filters by the session that made the day's high", () => {
    const database = fixtureDatabase();
    const peaks = (peakSession: "premarket" | "regular" | "afterHours") =>
      listMoversFromDatabase(database, { peakSession, universe: "raw" }).movers.map((mover) => mover.symbol);

    // CORE peaks after hours (120 > 90 > 50); SPLT peaks premarket (60 > 53.3 > 40).
    expect(peaks("afterHours").sort()).toEqual(["CORE", "FUND"]);
    expect(peaks("premarket")).toEqual(["SPLT"]);
    expect(peaks("regular")).toEqual([]);
  });

  it("breaks peak ties toward the earlier session and partitions the set", () => {
    const database = fixtureDatabase();
    database.exec(`
      insert into symbol_days values
        ('2026-08-25', 'TIEA', 'CS', 'Tie Alpha', 'XNAS', 0, 1.00, '2026-08-24',
         1.80, 80, 1.80, 80, 1.70, null, null, null, 1.80, 80, 1),
        ('2026-08-25', 'TIEB', 'CS', 'Tie Beta', 'XNAS', 0, 1.00, '2026-08-24',
         null, null, 1.70, 70, 1.60, 1.70, 70, 6.25, 1.70, 70, 1);
    `);
    const count = (peakSession?: "all" | "premarket" | "regular" | "afterHours") =>
      listMoversFromDatabase(database, { peakSession, universe: "raw" }).total;

    // A premarket/regular tie belongs to premarket; a regular/after-hours tie to regular.
    expect(listMoversFromDatabase(database, { peakSession: "premarket", universe: "raw" })
      .movers.map((mover) => mover.symbol)).toContain("TIEA");
    expect(listMoversFromDatabase(database, { peakSession: "regular", universe: "raw" })
      .movers.map((mover) => mover.symbol)).toEqual(["TIEB"]);

    // The three filters must exactly partition the universe — no row counted twice or lost.
    expect(count("premarket") + count("regular") + count("afterHours")).toBe(count("all"));
  });

  it("reports identical evidence whichever peak session is selected", () => {
    const database = fixtureDatabase();
    const evidence = (peakSession: "all" | "afterHours") =>
      listMoversFromDatabase(database, { date: "2026-08-24", peakSession }).movers[0].evidence;

    // Evidence is always all-session, so filtering never rewrites a column's meaning.
    expect(evidence("afterHours")).toEqual(evidence("all"));
    expect(evidence("afterHours")).toMatchObject({ dollarVolume: 29_000, gainPercent: 120, rvol: 7 });
  });

  it("summarizes available trading days for each universe", () => {
    const database = fixtureDatabase();
    expect(listTradingDaysFromDatabase(database)).toEqual([
      { date: "2026-08-24", moverCount: 1 },
    ]);
    expect(listTradingDaysFromDatabase(database, "raw")).toEqual([
      { date: "2026-08-24", moverCount: 2 },
      { date: "2026-08-23", moverCount: 1 },
    ]);
  });

  it("applies the minimum peak and RVOL floors", () => {
    const database = fixtureDatabase();

    const byGain = listMoversFromDatabase(database, { minGain: 65, universe: "raw" });
    expect(byGain.movers.map((mover) => mover.symbol)).toEqual(["CORE", "FUND"]);
    expect(byGain.total).toBe(2);

    const byRvol = listMoversFromDatabase(database, { minRvol: 5, universe: "raw" });
    expect(byRvol.movers.map((mover) => mover.symbol)).toEqual(["CORE", "SPLT"]);
    expect(byRvol.total).toBe(2);
  });

  it("keeps an unmeasured RVOL out of an RVOL floor", () => {
    const database = fixtureDatabase();
    database.exec(`
      insert into symbol_days values
        ('2026-08-24', 'QUIET', 'CS', 'Quiet Corp', 'XNAS', 0, 1.00, '2026-08-21',
         null, null, 1.60, 60, 1.55, null, null, null, 1.60, 60, 1);
    `);

    expect(listMoversFromDatabase(database, { date: "2026-08-24" }).movers.map((m) => m.symbol))
      .toEqual(["CORE", "QUIET"]);
    expect(listMoversFromDatabase(database, { date: "2026-08-24", minRvol: 0 }).movers.map((m) => m.symbol))
      .toEqual(["CORE"]);
  });

  it("sorts by date, company name and session volume", () => {
    const database = fixtureDatabase();

    expect(listMoversFromDatabase(database, { sort: "date", universe: "raw" }).movers.map((m) => m.date))
      .toEqual(["2026-08-24", "2026-08-24", "2026-08-23"]);
    expect(listMoversFromDatabase(database, { direction: "asc", sort: "name", universe: "raw" }).movers.map((m) => m.symbol))
      .toEqual(["CORE", "FUND", "SPLT"]);
    expect(listMoversFromDatabase(database, { sort: "volume", universe: "raw" }).movers.map((m) => m.symbol))
      .toEqual(["CORE", "FUND", "SPLT"]);
  });

  it("aggregates the whole filtered set rather than the returned page", () => {
    const database = fixtureDatabase();

    expect(summarizeMoversFromDatabase(database, { limit: 1, universe: "raw" })).toEqual({
      days: 2,
      dollarVolume: 51_600,
      largestGain: 120,
      medianGain: 70,
      symbols: 3,
      total: 3,
    });

    // Even-sized sets average the two middle peaks.
    expect(summarizeMoversFromDatabase(database, { minGain: 65, universe: "raw" }))
      .toMatchObject({ largestGain: 120, medianGain: 95, total: 2 });
    expect(summarizeMoversFromDatabase(database, { date: "2026-08-24" }))
      .toMatchObject({ days: 1, largestGain: 120, medianGain: 120, symbols: 1, total: 1 });
  });

  it("agrees with the peakSession reported on each row", () => {
    const database = fixtureDatabase();
    for (const peakSession of ["premarket", "regular", "afterHours"] as const) {
      const movers = listMoversFromDatabase(database, { peakSession, universe: "raw" }).movers;
      for (const mover of movers) expect(mover.peakSession).toBe(peakSession);
    }
  });

  it("measures the regular leg from where premarket left off", () => {
    const database = fixtureDatabase();
    const [core] = listMoversFromDatabase(database, { date: "2026-08-24" }).movers;

    // CORE: premarket high 3.00, regular high 3.80 -> the regular session added 26.7%
    // on top of premarket, not the 90% it shows against the prior close.
    expect(core.premarketGainPercent).toBe(50);
    expect(core.regularGainPercent).toBe(90);
    expect(core.continuationPercent).toBeCloseTo(26.667, 2);
  });

  it("falls back to the prior close when there was no premarket", () => {
    const database = fixtureDatabase();
    database.exec(`
      insert into symbol_days values
        ('2026-08-24', 'NOPM', 'CS', 'No Premarket Inc', 'XNAS', 0, 2.00, '2026-08-21',
         null, null, 3.20, 60, 3.10, null, null, null, 3.20, 60, 1);
    `);
    const mover = listMoversFromDatabase(database, { date: "2026-08-24" })
      .movers.find((row) => row.symbol === "NOPM");

    // With no premarket bar the leg starts at the prior close, so it equals the gain.
    expect(mover?.premarketGainPercent).toBeNull();
    expect(mover?.continuationPercent).toBeCloseTo(60, 5);
  });

  it("reports a negative regular leg when the move faded", () => {
    const database = fixtureDatabase();
    // SPLT: premarket high 2.40, regular high 2.30 -> never took out the premarket high.
    const [splt] = listMoversFromDatabase(database, { date: "2026-08-23", universe: "raw" }).movers;

    expect(splt.continuationPercent).toBeLessThan(0);
    expect(splt.continuationPercent).toBeCloseTo(-4.167, 2);
  });

  it("validates date ranges before querying", () => {
    const database = fixtureDatabase();
    expect(() => listMoversFromDatabase(database, { from: "2026-08-24", to: "2026-08-23" }))
      .toThrow("from must not be after to");
    expect(() => listMoversFromDatabase(database, { date: "08/24/2026" }))
      .toThrow("date must use YYYY-MM-DD");
  });
});
