import { existsSync, statSync } from "node:fs";
import Database from "better-sqlite3";
import { resolveMarketArchivePaths, type MarketArchivePaths } from "./config";
import { listMoversFromDatabase, listTradingDaysFromDatabase } from "./movers";
import { CORE_MOVER_RULE_VERSION } from "./rules";
import type { ArchiveUniverse, ListMoversInput, ListMoversResult, TradingDaySummary } from "./types";

const REQUIRED_TABLES = [
  "archive_dates",
  "corporate_action_splits",
  "instrument_snapshots",
  "session_stats",
  "symbol_days",
] as const;

export type MarketArchiveHealth = {
  available: boolean;
  coreRuleVersion: typeof CORE_MOVER_RULE_VERSION;
  counts?: {
    archiveDates: number;
    coreMovers: number;
    rawMoversExcludingSplits: number;
    sessionStats: number;
    symbolDays: number;
  };
  coverage?: { from: string; to: string };
  databaseBytes?: number;
  reason?: "missing" | "not_a_file" | "invalid_archive";
};

type CoverageRow = {
  archiveDates: number;
  fromDate: string | null;
  symbolDays: number;
  toDate: string | null;
};

type CountRow = { count: number };
type TableRow = { name: string };

export type MarketArchiveClient = {
  health(): MarketArchiveHealth;
  listMovers(input?: ListMoversInput): ListMoversResult;
  listTradingDays(universe?: ArchiveUniverse): TradingDaySummary[];
  paths: MarketArchivePaths;
  verifyIntegrity(): { foreignKeyErrors: number; integrity: string };
};

function openReadOnly(databasePath: string): Database.Database {
  const database = new Database(databasePath, {
    fileMustExist: true,
    readonly: true,
  });
  database.pragma("query_only = ON");
  database.pragma("foreign_keys = ON");
  return database;
}

function queryHealth(database: Database.Database, databaseBytes: number): MarketArchiveHealth {
  if (database.pragma("journal_mode", { simple: true }) !== "delete") {
    return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "invalid_archive" };
  }
  const tables = database
    .prepare("select name from sqlite_master where type = 'table'")
    .all() as TableRow[];
  const tableNames = new Set(tables.map((row) => row.name));
  if (REQUIRED_TABLES.some((table) => !tableNames.has(table))) {
    return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "invalid_archive" };
  }

  const coverage = database.prepare(`
    select
      count(*) as archiveDates,
      min(session_date) as fromDate,
      max(session_date) as toDate,
      coalesce(sum(symbol_count), 0) as symbolDays
    from archive_dates
  `).get() as CoverageRow;
  const sessionStats = database
    .prepare("select count(*) as count from session_stats")
    .get() as CountRow;
  const rawMovers = database.prepare(`
    select count(*) as count
    from symbol_days
    where qualifies_mover = 1 and split_event = 0
  `).get() as CountRow;
  const coreMovers = database.prepare(`
    select count(*) as count
    from symbol_days
    where qualifies_mover = 1
      and split_event = 0
      and instrument_type = 'CS'
      and previous_regular_close >= 1
      and julianday(session_date) - julianday(previous_close_date) between 1 and 7
  `).get() as CountRow;

  if (!coverage.fromDate || !coverage.toDate) {
    return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "invalid_archive" };
  }

  return {
    available: true,
    coreRuleVersion: CORE_MOVER_RULE_VERSION,
    counts: {
      archiveDates: coverage.archiveDates,
      coreMovers: coreMovers.count,
      rawMoversExcludingSplits: rawMovers.count,
      sessionStats: sessionStats.count,
      symbolDays: coverage.symbolDays,
    },
    coverage: { from: coverage.fromDate, to: coverage.toDate },
    databaseBytes,
  };
}

export function createMarketArchiveClient(
  paths: MarketArchivePaths = resolveMarketArchivePaths(),
): MarketArchiveClient {
  return {
    paths,
    health() {
      try {
        if (!existsSync(paths.databasePath)) {
          return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "missing" };
        }
        const file = statSync(paths.databasePath);
        if (!file.isFile()) {
          return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "not_a_file" };
        }
        const database = openReadOnly(paths.databasePath);
        try {
          return queryHealth(database, file.size);
        } finally {
          database.close();
        }
      } catch {
        return { available: false, coreRuleVersion: CORE_MOVER_RULE_VERSION, reason: "invalid_archive" };
      }
    },
    listMovers(input) {
      const database = openReadOnly(paths.databasePath);
      try {
        return listMoversFromDatabase(database, input);
      } finally {
        database.close();
      }
    },
    listTradingDays(universe) {
      const database = openReadOnly(paths.databasePath);
      try {
        return listTradingDaysFromDatabase(database, universe);
      } finally {
        database.close();
      }
    },
    verifyIntegrity() {
      const database = openReadOnly(paths.databasePath);
      try {
        const integrityRows = database.pragma("integrity_check") as Array<{ integrity_check: string }>;
        const foreignKeyRows = database.pragma("foreign_key_check") as unknown[];
        return {
          foreignKeyErrors: foreignKeyRows.length,
          integrity: integrityRows.map((row) => row.integrity_check).join("\n"),
        };
      } finally {
        database.close();
      }
    },
  };
}
