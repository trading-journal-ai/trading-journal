// Pre-destruction guard for the journal database.
//
// Call snapshotBeforeDestroy(dbPath, reason) before deleting or rebuilding a
// DB file. If the DB contains anything worth keeping — user-authored journal
// content or fetched OHLCV candle data — it takes a consistent VACUUM INTO
// snapshot in data/backups/ and prints what was protected and why it matters.
// See docs/product/DATA_BACKUP.md.

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const BACKUP_DIR = "data/backups";
const FREE_PLAN_CALLS_PER_MIN = 5;

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function count(db, table) {
  try {
    return db.prepare(`select count(*) as n from ${table}`).get().n;
  } catch {
    return 0; // table may not exist in older DBs
  }
}

/**
 * Snapshot `dbPath` into data/backups/ if it holds meaningful data.
 * Returns the snapshot path, or null when there was nothing to protect.
 */
export function snapshotBeforeDestroy(dbPath, reason) {
  const src = resolve(dbPath);
  if (!existsSync(src)) return null;

  const db = new Database(src, { readonly: true });
  let contents;
  try {
    contents = {
      trades: count(db, "trades"),
      candles: count(db, "candles"),
      candleDays: db.prepare("select count(distinct symbol || date(t,'unixepoch')) as n from candles").get()?.n ?? 0,
      journalEntries: count(db, "journal_entries"),
      tickerReviews: count(db, "ticker_reviews"),
      coachReviews: count(db, "coach_reviews"),
    };
  } catch {
    contents = null; // not a journal DB (or corrupt) — still snapshot below
  }

  const meaningful =
    contents == null ||
    Object.values(contents).some((n) => n > 0);
  if (!meaningful) {
    db.close();
    return null;
  }

  mkdirSync(resolve(BACKUP_DIR), { recursive: true });
  const outPath = join(resolve(BACKUP_DIR), `${basename(src, ".db")}-preDestroy-${timestamp()}.db`);
  try {
    db.prepare("VACUUM INTO ?").run(outPath);
  } finally {
    db.close();
  }

  console.log("");
  console.log(`⚠ About to ${reason}: ${src}`);
  if (contents) {
    const lines = [];
    if (contents.trades) lines.push(`${contents.trades} trades`);
    const notes = contents.journalEntries + contents.tickerReviews;
    if (notes) lines.push(`${notes} journal entries/notes (NOT recoverable if lost)`);
    if (contents.coachReviews) lines.push(`${contents.coachReviews} coach reviews (NOT recoverable if lost)`);
    if (contents.candles) {
      const refetchMin = Math.ceil(contents.candleDays / FREE_PLAN_CALLS_PER_MIN);
      lines.push(
        `${contents.candles} fetched OHLCV candle bars across ${contents.candleDays} symbol-days ` +
        `(~${refetchMin} min of rate-limited API calls to re-fetch)`,
      );
    }
    if (lines.length) console.log(`  It contains: ${lines.join("; ")}.`);
  }
  console.log(`  Backed up first → ${outPath}`);
  console.log(`  To restore: quit the app, copy that file back over the DB path, relaunch.`);
  console.log("");
  return outPath;
}
