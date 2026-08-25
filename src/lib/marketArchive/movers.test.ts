import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { listMoversFromDatabase, listTradingDaysFromDatabase } from "./movers";

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
    expect(result.movers[0].lens).toMatchObject({
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

  it("uses the active session's comparison and metrics", () => {
    const result = listMoversFromDatabase(fixtureDatabase(), {
      date: "2026-08-24",
      session: "afterHours",
    });

    expect(result.movers[0].lens).toMatchObject({
      activeMinutes: 30,
      dollarVolume: 8200,
      gainPercent: 22.2222,
      high: 4.40,
      rvol: 5,
    });
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

  it("validates date ranges before querying", () => {
    const database = fixtureDatabase();
    expect(() => listMoversFromDatabase(database, { from: "2026-08-24", to: "2026-08-23" }))
      .toThrow("from must not be after to");
    expect(() => listMoversFromDatabase(database, { date: "08/24/2026" }))
      .toThrow("date must use YYYY-MM-DD");
  });
});
