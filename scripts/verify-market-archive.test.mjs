import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectArchive,
  inspectRawMinuteArchive,
  inspectReferenceArchive,
} from "./verify-market-archive.mjs";

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("raw minute archive verification", () => {
  it("records stable content evidence across nested provider directories", async () => {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-raw-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "2026", "08"), { recursive: true });
    writeFileSync(join(directory, "2026", "08", "2026-08-24.csv.gz"), "minute-one");
    writeFileSync(join(directory, "2026", "08", "2026-08-25.csv.gz"), "minute-two");

    const first = await inspectRawMinuteArchive(directory);
    const second = await inspectRawMinuteArchive(directory);

    expect(first).toEqual(second);
    expect(first).toMatchObject({ bytes: 20, files: 2 });
    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("inventories exact reference snapshots separately from split evidence", async () => {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-reference-"));
    temporaryDirectories.push(directory);
    mkdirSync(join(directory, "2026", "08"), { recursive: true });
    writeFileSync(join(directory, "2026", "08", "2026-08-24.jsonl.gz"), "reference");
    const splitFile = join(directory, "splits.jsonl.gz");
    writeFileSync(splitFile, "splits");

    const evidence = await inspectReferenceArchive(directory, splitFile);

    expect(evidence.referenceArchive).toMatchObject({ bytes: 9, files: 1 });
    expect(evidence.referenceArchive.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.splitArchive).toMatchObject({ bytes: 6, file: "splits.jsonl.gz" });
    expect(evidence.splitArchive.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("exact identity verification", () => {
  function exactArchive() {
    const directory = mkdtempSync(join(tmpdir(), "market-archive-exact-"));
    temporaryDirectories.push(directory);
    const file = join(directory, "market-history.sqlite");
    const database = new Database(file);
    database.exec(`
      create table archive_dates (
        session_date text primary key,
        source_file text not null,
        source_bytes integer not null,
        source_sha256 text not null,
        summary_bytes integer not null,
        summary_sha256 text not null,
        transform_version text not null,
        raw_exact_symbol_count integer not null,
        derived_exact_symbol_count integer not null,
        casefold_collision_count integer not null,
        casefold_collision_groups_json text not null,
        duplicate_minute_rows integer not null,
        reference_covered_symbols integer not null,
        symbol_count integer not null
      );
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
        max_high real,
        max_gain_pct real,
        primary key (session_date, symbol)
      );
      create table session_stats (session_date text not null, symbol text not null, session text not null);
      insert into archive_dates values (
        '2026-08-18', '2026-08-18.csv.gz', 100, '${"a".repeat(64)}', 50, '${"b".repeat(64)}',
        'market-archive-exact-symbol-v2', 2, 2, 1, '[{"foldedSymbol":"TPC","exactSymbols":["TPC","TpC"]}]', 0, 2, 2
      );
      insert into symbol_days values
        ('2026-08-18', 'TPC', 0, 0, 'CS', 97.205, '2026-08-17', 96.4, -0.8281),
        ('2026-08-18', 'TpC', 0, 0, 'PFD', 16.8, '2026-08-17', 16.85, 0.2976);
    `);
    database.close();
    return file;
  }

  it("accepts reconciled exact-case provenance and the TPC regression contract", () => {
    const result = inspectArchive(exactArchive(), { fullIntegrity: false, requireExactIdentity: true });

    expect(result.identity).toMatchObject({
      status: "verified",
      collisionFamilies: 1,
      duplicateMinuteRows: 0,
      referenceCoverageRate: 1,
      tpcIncident: { checked: true, valid: true },
    });
  });

  it("rejects unreconciled exact-symbol counts", () => {
    const file = exactArchive();
    const database = new Database(file);
    database.prepare("update archive_dates set derived_exact_symbol_count = 1").run();
    database.close();

    expect(() => inspectArchive(file, { fullIntegrity: false, requireExactIdentity: true }))
      .toThrow("unreconciled exact-symbol counts");
  });
});
