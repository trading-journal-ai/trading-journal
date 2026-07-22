import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  buildCoverageAudit,
  formatCoverageAudit,
  parseArgs,
  zonedDateTimeToUtcMs,
} from "./coach-data-coverage.mjs";

function et(date, time) {
  return Math.round(zonedDateTimeToUtcMs(date, time) / 1000);
}

function fixtureDatabase() {
  const db = new Database(":memory:");
  db.exec(`
    create table accounts (id integer primary key, name text);
    create table trades (
      id integer primary key,
      account_id integer,
      symbol text,
      side text,
      quantity integer,
      avg_entry_price real,
      entry_at integer,
      avg_exit_price real,
      exit_at integer,
      stop_loss real,
      target real,
      setup text,
      status text
    );
    create table executions (id integer primary key, trade_id integer);
    create table candles (
      id integer primary key,
      symbol text,
      timeframe text,
      t integer,
      o real,
      h real,
      l real,
      c real,
      vol real
    );
    create table journal_entries (
      id integer primary key,
      account_id integer,
      trade_id integer,
      scope text,
      scope_key text,
      thesis text,
      what_went_well text,
      what_went_wrong text,
      lessons text,
      followed_plan integer,
      emotional_state text
    );
    create table trade_tags (trade_id integer, tag_id integer);
    create table attachments (id integer primary key, trade_id integer);
    create table import_batches (id integer primary key);
    create table coach_playbooks (id integer primary key);
    create table coach_reviews (id integer primary key, status text);
    create table coach_experiments (
      id integer primary key,
      status text,
      updated_at integer
    );
  `);

  const date = "2026-07-15";
  const firstEntry = et(date, "09:45:30");
  const secondEntry = et(date, "10:15:30");
  const thirdEntry = et(date, "11:00:30");
  db.prepare("insert into accounts values (?, ?)").run(1, "PRIVATE_ACCOUNT_MARKER");
  const insertTrade = db.prepare(`
    insert into trades (
      id, account_id, symbol, side, quantity, avg_entry_price, entry_at,
      avg_exit_price, exit_at, stop_loss, target, setup, status
    ) values (?, 1, ?, ?, 100, 10, ?, 10.5, ?, ?, ?, ?, ?)
  `);
  insertTrade.run(1, "PRIVATE_SYMBOL_MARKER", "long", firstEntry, et(date, "10:00:00"), 9.8, 11, "Private setup", "closed");
  insertTrade.run(2, "NO_CANDLES", "long", secondEntry, et(date, "10:30:00"), null, null, null, "closed");
  insertTrade.run(3, "PRIVATE_SYMBOL_MARKER", "short", thirdEntry, et(date, "11:20:00"), null, null, "Private setup", "closed");
  insertTrade.run(4, "OPEN_SYMBOL", "long", thirdEntry, null, null, null, null, "open");

  db.prepare("insert into executions values (?, ?)").run(1, 1);
  db.prepare("insert into executions values (?, ?)").run(2, 3);
  db.prepare("insert into trade_tags values (?, ?)").run(1, 1);
  db.prepare("insert into attachments values (?, ?)").run(1, 1);
  db.prepare("insert into import_batches values (?)").run(1);
  db.prepare("insert into coach_playbooks values (?)").run(1);
  db.prepare("insert into coach_reviews values (?, ?)").run(1, "generated");
  db.prepare("insert into coach_experiments values (?, ?, ?)")
    .run(1, "active", et("2026-07-01", "12:00:00"));

  db.prepare(`
    insert into journal_entries (
      id, account_id, trade_id, scope, scope_key, thesis, what_went_well,
      what_went_wrong, lessons, followed_plan, emotional_state
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    1,
    1,
    "trade",
    null,
    "PRIVATE_NOTE_MARKER",
    '["Patient"]',
    '["Calm"]',
    null,
    1,
    "Good trade",
  );
  db.prepare(`
    insert into journal_entries (
      id, account_id, trade_id, scope, scope_key, thesis, what_went_well,
      what_went_wrong, lessons, followed_plan, emotional_state
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(2, 1, null, "day", date, null, null, null, "PRIVATE_DAY_NOTE", null, null);

  const insertCandle = db.prepare(`
    insert into candles (symbol, timeframe, t, o, h, l, c, vol)
    values ('PRIVATE_SYMBOL_MARKER', '1m', ?, 10, 10.1, 9.9, 10, 1000)
  `);
  for (let minute = 0; minute < 240; minute += 1) {
    insertCandle.run(et(date, "07:00:00") + minute * 60);
  }
  return db;
}

describe("coach data coverage audit", () => {
  it("computes aggregate coverage over closed trades only", () => {
    const db = fixtureDatabase();
    const audit = buildCoverageAudit(db, { nowEpochSeconds: et("2026-07-22", "12:00:00") });
    db.close();

    expect(audit.corpus).toEqual({
      accounts: 1,
      accountsWithClosedTrades: 1,
      closedTrades: 3,
      tradingSessions: 1,
    });
    expect(audit.intentAndRisk.plannedStop).toMatchObject({ covered: 1, total: 3, percent: 33.3 });
    expect(audit.intentAndRisk.riskMultipleEligible.covered).toBe(1);
    expect(audit.intentAndRisk.setupIdentity.covered).toBe(2);
    expect(audit.intentAndRisk.uniqueSetupSpellings).toBe(1);
    expect(audit.journalContext.tradeContext.covered).toBe(1);
    expect(audit.journalContext.dayContext).toMatchObject({ covered: 1, total: 1, percent: 100 });
    expect(audit.linkedEvidence.executions.covered).toBe(2);
    expect(audit.marketData.directSymbolSessionBars.covered).toBe(2);
    expect(audit.marketData.currentLongOnlyOpportunityEligibility.covered).toBe(1);
    expect(audit.marketData.shortTradesBlockedByV1).toBe(1);
    expect(audit.coachLifecycle.experiments.olderThan7Days).toBe(1);
  });

  it("does not leak fixture identifiers or note text in text or JSON output", () => {
    const db = fixtureDatabase();
    const audit = buildCoverageAudit(db, { nowEpochSeconds: et("2026-07-22", "12:00:00") });
    db.close();

    const output = `${formatCoverageAudit(audit)}\n${JSON.stringify(audit)}`;
    expect(output).not.toContain("PRIVATE_ACCOUNT_MARKER");
    expect(output).not.toContain("PRIVATE_SYMBOL_MARKER");
    expect(output).not.toContain("PRIVATE_NOTE_MARKER");
    expect(output).not.toContain("PRIVATE_DAY_NOTE");
    expect(output).not.toContain("2026-07-15");
  });

  it("degrades safely when optional tables are absent", () => {
    const db = new Database(":memory:");
    db.exec(`
      create table trades (
        id integer primary key,
        status text,
        entry_at integer,
        exit_at integer
      );
      insert into trades (id, status, entry_at, exit_at)
      values (1, 'closed', ${et("2026-07-15", "10:00:00")}, ${et("2026-07-15", "10:05:00")});
    `);

    const audit = buildCoverageAudit(db, { nowEpochSeconds: et("2026-07-22", "12:00:00") });
    db.close();

    expect(audit.corpus.closedTrades).toBe(1);
    expect(audit.linkedEvidence.executions).toMatchObject({ covered: 0, total: 1 });
    expect(audit.marketData.directSymbolSessionBars).toMatchObject({ covered: 0, total: 1 });
    expect(audit.coachLifecycle.reviews.total).toBe(0);
  });

  it("rejects unexpected CLI arguments", () => {
    expect(parseArgs(["--json", "--db", "data/journal.db"])).toEqual({
      json: true,
      help: false,
      db: "data/journal.db",
    });
    expect(() => parseArgs(["--write"])).toThrow("Unknown option");
  });
});
