import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { migrateArchive } from "./migrate-market-archive.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function sourceArchive(directory) {
  const source = join(directory, "source.sqlite");
  const database = new Database(source);
  database.pragma("journal_mode = WAL");
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
    insert into archive_dates values ('2026-08-24', 'one.csv.gz', 1);
    insert into symbol_days values ('2026-08-24', 'CORE', 1, 0, 'CS', 2, '2026-08-21');
    insert into session_stats values ('2026-08-24', 'CORE', 'regular');
  `);
  database.close();
  return source;
}

describe("Market Archive migration", () => {
  it("creates a verified read-only snapshot and leaves the source untouched", async () => {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-migrate-"));
    temporaryDirectories.push(directory);
    const source = sourceArchive(directory);
    const destination = join(directory, "journal-owned", "market-history.sqlite");
    const manifestPath = join(directory, "journal-owned", "manifest.json");

    const result = await migrateArchive({ destination, manifest: manifestPath, source });

    expect(existsSync(source)).toBe(true);
    expect(existsSync(destination)).toBe(true);
    expect(statSync(destination).mode & 0o777).toBe(0o400);
    expect(result.manifest).toMatchObject({
      owner: "trading-journal-ai",
      counts: { archiveDates: 1, coreMovers: 1, symbolDays: 1 },
      integrity: "ok",
      journalMode: "delete",
    });
    expect(JSON.parse(readFileSync(manifestPath, "utf8"))).toMatchObject({
      database: { file: "market-history.sqlite" },
    });
    expect(existsSync(`${destination}-shm`)).toBe(false);
    expect(existsSync(`${destination}-wal`)).toBe(false);
  });
});
