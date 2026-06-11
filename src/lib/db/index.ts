/**
 * Local-first SQLite client (better-sqlite3 + Drizzle).
 *
 * The DB file lives at `data/journal.db` (gitignored). Override with DB_PATH.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = resolve(process.env.DB_PATH ?? "data/journal.db");
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
