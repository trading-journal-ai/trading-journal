#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { archivePaths, CORE_MOVER_RULE_VERSION } from "./market-archive-paths.mjs";

const REQUIRED_TABLES = [
  "archive_dates",
  "corporate_action_splits",
  "instrument_snapshots",
  "session_stats",
  "symbol_days",
];

function parseArgs(argv) {
  const paths = archivePaths();
  const options = {
    database: paths.databasePath,
    fullIntegrity: true,
    rawDirectory: paths.rawMinuteDirectory,
    verifyRaw: false,
    writeManifest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--quick") options.fullIntegrity = false;
    else if (argument === "--verify-raw") options.verifyRaw = true;
    else if (argument === "--write-manifest") options.writeManifest = true;
    else if (argument === "--database" || argument === "--raw-directory") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
      if (argument === "--database") options.database = resolve(value);
      else options.rawDirectory = resolve(value);
      index += 1;
    } else throw new Error(`Unknown option: ${argument}`);
  }
  return options;
}

export function checksum(file) {
  return new Promise((resolveChecksum, reject) => {
    const hash = createHash("sha256");
    const input = createReadStream(file);
    input.on("error", reject);
    input.on("data", (chunk) => hash.update(chunk));
    input.on("end", () => resolveChecksum(hash.digest("hex")));
  });
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

export async function inspectRawMinuteArchive(directory) {
  const files = (await filesBelow(directory)).sort((left, right) => left.localeCompare(right));
  const archiveHash = createHash("sha256");
  let bytes = 0;
  for (const file of files) {
    const fileStat = await stat(file);
    const fileChecksum = await checksum(file);
    const relativePath = relative(directory, file);
    bytes += fileStat.size;
    archiveHash.update(`${relativePath}\0${fileStat.size}\0${fileChecksum}\n`);
  }
  return {
    bytes,
    contentSha256: archiveHash.digest("hex"),
    files: files.length,
  };
}

export function inspectArchive(databasePath, options = {}) {
  const database = new Database(databasePath, { fileMustExist: true, readonly: true });
  database.pragma("query_only = ON");
  database.pragma("foreign_keys = ON");
  try {
    const journalMode = database.pragma("journal_mode", { simple: true });
    if (journalMode !== "delete") {
      throw new Error(`Journal-owned archives must use DELETE journal mode; found ${journalMode}`);
    }
    const tables = new Set(database.prepare("select name from sqlite_master where type = 'table'").pluck().all());
    const missingTables = REQUIRED_TABLES.filter((table) => !tables.has(table));
    if (missingTables.length) throw new Error(`Archive is missing required tables: ${missingTables.join(", ")}`);

    const coverage = database.prepare(`
      select count(*) as tradingDays, min(session_date) as fromDate, max(session_date) as toDate,
             coalesce(sum(symbol_count), 0) as symbolDays
      from archive_dates
    `).get();
    const sessionStats = database.prepare("select count(*) from session_stats").pluck().get();
    const rawMoversExcludingSplits = database.prepare(`
      select count(*) from symbol_days where qualifies_mover = 1 and split_event = 0
    `).pluck().get();
    const coreMovers = database.prepare(`
      select count(*)
      from symbol_days
      where qualifies_mover = 1 and split_event = 0 and instrument_type = 'CS'
        and previous_regular_close >= 1
        and julianday(session_date) - julianday(previous_close_date) between 1 and 7
    `).pluck().get();
    const integrityRows = options.fullIntegrity === false
      ? database.pragma("quick_check")
      : database.pragma("integrity_check");
    const foreignKeyErrors = database.pragma("foreign_key_check").length;
    const integrity = integrityRows.map((row) => row.integrity_check ?? row.quick_check).join("\n");
    if (integrity !== "ok") throw new Error(`SQLite integrity check failed: ${integrity}`);
    if (foreignKeyErrors !== 0) throw new Error(`SQLite foreign-key check returned ${foreignKeyErrors} errors`);

    return {
      coreRuleVersion: CORE_MOVER_RULE_VERSION,
      counts: {
        archiveDates: coverage.tradingDays,
        coreMovers,
        rawMoversExcludingSplits,
        sessionStats,
        symbolDays: coverage.symbolDays,
      },
      coverage: { from: coverage.fromDate, to: coverage.toDate },
      foreignKeyErrors,
      integrity,
      journalMode,
    };
  } finally {
    database.close();
  }
}

export async function manifestFor(databasePath, inspection, rawMinuteArchive) {
  const file = await stat(databasePath);
  return {
    formatVersion: 1,
    owner: "trading-journal-ai",
    verifiedAt: new Date().toISOString(),
    database: {
      bytes: file.size,
      file: basename(databasePath),
      sha256: await checksum(databasePath),
    },
    ...(rawMinuteArchive ? { rawMinuteArchive } : {}),
    ...inspection,
  };
}

export async function writeArchiveManifest(databasePath, manifestPath, inspection, rawMinuteArchive) {
  const manifest = await manifestFor(databasePath, inspection, rawMinuteArchive);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await chmod(manifestPath, 0o600);
  return manifest;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inspection = inspectArchive(options.database, { fullIntegrity: options.fullIntegrity });
  const rawMinuteArchive = options.verifyRaw
    ? await inspectRawMinuteArchive(options.rawDirectory)
    : undefined;
  const manifest = options.writeManifest
    ? await writeArchiveManifest(options.database, resolve(dirname(options.database), "manifest.json"), inspection, rawMinuteArchive)
    : await manifestFor(options.database, inspection, rawMinuteArchive);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Market Archive verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
