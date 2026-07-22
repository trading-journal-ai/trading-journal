#!/usr/bin/env node

import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_DEMO_DB = "samples/demo/tradingjournaldemo.db";
const MIGRATION_JOURNAL = "drizzle/meta/_journal.json";

const REQUIRED_SCHEMA = [
  { table: "executions", column: "broker_order_key" },
  { table: "market_context_days" },
  { table: "journal_day_statuses" },
];

export function verifyDemoDatabaseSchema({
  dbPath = DEFAULT_DEMO_DB,
  journalPath = MIGRATION_JOURNAL,
} = {}) {
  const journal = JSON.parse(readFileSync(resolve(journalPath), "utf8"));
  const expectedMigrations = journal.entries.map((entry) => ({
    tag: entry.tag,
    createdAt: Number(entry.when),
  }));
  const db = new Database(resolve(dbPath), { readonly: true, fileMustExist: true });

  try {
    const applied = new Set(
      db.prepare("select created_at from __drizzle_migrations").all()
        .map((row) => Number(row.created_at)),
    );
    const missingMigrations = expectedMigrations.filter(({ createdAt }) => !applied.has(createdAt));
    if (missingMigrations.length > 0) {
      throw new Error(
        `Bundled demo database is missing migrations: ${missingMigrations.map(({ tag }) => tag).join(", ")}`,
      );
    }

    for (const requirement of REQUIRED_SCHEMA) {
      const table = db.prepare(
        "select 1 from sqlite_master where type = 'table' and name = ?",
      ).get(requirement.table);
      if (!table) throw new Error(`Bundled demo database is missing table: ${requirement.table}`);

      if (requirement.column) {
        const columns = db.prepare(`pragma table_info(${requirement.table})`).all();
        if (!columns.some((column) => column.name === requirement.column)) {
          throw new Error(
            `Bundled demo database is missing column: ${requirement.table}.${requirement.column}`,
          );
        }
      }
    }
  } finally {
    db.close();
  }

  return { migrations: expectedMigrations.length };
}

export function runDemoDatabaseSchemaVerification(options) {
  const result = verifyDemoDatabaseSchema(options);
  console.log(`Bundled demo database schema verified (${result.migrations} migrations).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runDemoDatabaseSchemaVerification();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
