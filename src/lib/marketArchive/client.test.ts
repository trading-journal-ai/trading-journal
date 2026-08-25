import { chmodSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createMarketArchiveClient } from "./client";
import type { MarketArchivePaths } from "./config";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function pathsFor(databasePath: string): MarketArchivePaths {
  const archiveHome = join(databasePath, "..");
  return {
    archiveHome,
    candleDatabasePath: join(archiveHome, "candles.sqlite"),
    databasePath,
    manifestPath: join(archiveHome, "manifest.json"),
    rawMinuteDirectory: join(archiveHome, "raw", "minute-aggs"),
    referenceDirectory: join(archiveHome, "raw", "reference"),
    splitFile: join(archiveHome, "raw", "reference", "splits.jsonl.gz"),
  };
}

function fixtureArchive(): MarketArchivePaths {
  const directory = mkdtempSync(join(tmpdir(), "market-archive-client-"));
  temporaryDirectories.push(directory);
  const databasePath = join(directory, "market-history.sqlite");
  const database = new Database(databasePath);
  database.exec(`
    create table archive_dates (session_date text primary key, source_file text not null, symbol_count integer not null);
    create table corporate_action_splits (event_id text primary key);
    create table instrument_snapshots (snapshot_date text not null, symbol text not null);
    create table symbol_days (
      session_date text not null,
      symbol text not null,
      qualifies_mover integer not null,
      split_event integer not null,
      instrument_type text,
      previous_regular_close real,
      previous_close_date text,
      primary key (session_date, symbol)
    );
    create table session_stats (session_date text not null, symbol text not null, session text not null);

    insert into archive_dates values ('2026-08-21', 'one.csv.gz', 1), ('2026-08-24', 'two.csv.gz', 2);
    insert into symbol_days values
      ('2026-08-24', 'CORE', 1, 0, 'CS', 2.00, '2026-08-21'),
      ('2026-08-24', 'ETF', 1, 0, 'ETF', 2.00, '2026-08-21'),
      ('2026-08-24', 'QUIET', 0, 0, 'CS', 2.00, '2026-08-21');
    insert into session_stats values
      ('2026-08-24', 'CORE', 'premarket'),
      ('2026-08-24', 'CORE', 'regular'),
      ('2026-08-24', 'CORE', 'afterHours');
  `);
  database.close();
  chmodSync(databasePath, 0o400);
  return pathsFor(databasePath);
}

describe("Market Archive client", () => {
  it("degrades cleanly when the Journal-owned archive is absent", () => {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-missing-"));
    temporaryDirectories.push(directory);
    const health = createMarketArchiveClient(pathsFor(join(directory, "missing.sqlite"))).health();
    expect(health).toMatchObject({ available: false, reason: "missing" });
  });

  it("opens a filesystem-read-only archive and reports coverage and Core counts", () => {
    const client = createMarketArchiveClient(fixtureArchive());
    expect(client.health()).toMatchObject({
      available: true,
      counts: {
        archiveDates: 2,
        coreMovers: 1,
        rawMoversExcludingSplits: 2,
        sessionStats: 3,
        symbolDays: 3,
      },
      coverage: { from: "2026-08-21", to: "2026-08-24" },
    });
  });

  it("can run explicit integrity diagnostics", () => {
    expect(createMarketArchiveClient(fixtureArchive()).verifyIntegrity()).toEqual({
      foreignKeyErrors: 0,
      integrity: "ok",
    });
  });
});
