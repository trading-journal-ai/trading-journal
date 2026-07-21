#!/usr/bin/env node

// Consistent snapshot of the journal DB via VACUUM INTO (safe under WAL,
// safe while the app runs). See docs/product/DATA_BACKUP.md.
//
// Usage:
//   node scripts/backup-db.mjs                     # DB from .env.local DB_PATH → data/backups/
//   node scripts/backup-db.mjs --dest ~/CloudFolder/journal-backups --keep 14
//   node scripts/backup-db.mjs --db data/journal.db

import Database from "better-sqlite3";
import { readFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const DEFAULTS = { dest: "data/backups", keep: "7" };

function loadEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, "");
  }
}

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
      continue;
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for ${arg}`);
    args[key] = next;
    i += 1;
  }
  return args;
}

function usage() {
  console.log(`
Usage:
  node scripts/backup-db.mjs [options]

Options:
  --db PATH     Database to snapshot. Default: DB_PATH from .env.local, else data/journal.db
  --dest PATH   Backup folder (point this at a cloud-synced folder, external
                drive, or NAS mount for offsite copies). Default: ${DEFAULTS.dest}
  --keep N      Keep the newest N snapshots for this DB, delete older. Default: ${DEFAULTS.keep}
  --help        Show this help.
`);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function rotate(dest, stem, keep) {
  const snapshots = readdirSync(dest)
    .filter((name) => name.startsWith(`${stem}-`) && name.endsWith(".db"))
    .sort()
    .reverse();
  for (const name of snapshots.slice(keep)) {
    unlinkSync(join(dest, name));
    console.log(`Rotated out: ${name}`);
  }
}

function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const dbPath = resolve(args.db ?? process.env.DB_PATH ?? "data/journal.db");
  const dest = resolve(args.dest);
  const keep = Number(args.keep);
  const stem = basename(dbPath, ".db");

  mkdirSync(dest, { recursive: true });
  const outPath = join(dest, `${stem}-${timestamp()}.db`);

  const db = new Database(dbPath, { readonly: true });
  try {
    db.prepare("VACUUM INTO ?").run(outPath);
  } finally {
    db.close();
  }

  const check = new Database(outPath, { readonly: true });
  try {
    const result = check.prepare("PRAGMA integrity_check").get();
    if (result.integrity_check !== "ok") {
      throw new Error(`Snapshot failed integrity check: ${result.integrity_check}`);
    }
  } finally {
    check.close();
  }

  const size = (statSync(outPath).size / 1024 / 1024).toFixed(1);
  console.log(`Snapshot: ${outPath} (${size} MB, integrity ok)`);
  rotate(dest, stem, keep);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
