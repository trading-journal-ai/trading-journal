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
const EXACT_IDENTITY_TRANSFORM_VERSION = "market-archive-exact-symbol-v2";
const EXACT_IDENTITY_COLUMNS = [
  "source_bytes",
  "source_sha256",
  "summary_bytes",
  "summary_sha256",
  "transform_version",
  "raw_exact_symbol_count",
  "derived_exact_symbol_count",
  "casefold_collision_count",
  "casefold_collision_groups_json",
  "duplicate_minute_rows",
  "reference_covered_symbols",
];

function parseArgs(argv) {
  const paths = archivePaths();
  const options = {
    database: paths.databasePath,
    fullIntegrity: true,
    rawDirectory: paths.rawMinuteDirectory,
    referenceDirectory: paths.referenceDirectory,
    splitFile: paths.splitFile,
    requireExactIdentity: false,
    verifyRaw: false,
    verifyReference: false,
    writeManifest: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--quick") options.fullIntegrity = false;
    else if (argument === "--require-exact-identity") options.requireExactIdentity = true;
    else if (argument === "--verify-raw") options.verifyRaw = true;
    else if (argument === "--verify-reference") options.verifyReference = true;
    else if (argument === "--write-manifest") options.writeManifest = true;
    else if (["--database", "--raw-directory", "--reference-directory", "--split-file"].includes(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
      if (argument === "--database") options.database = resolve(value);
      else if (argument === "--raw-directory") options.rawDirectory = resolve(value);
      else if (argument === "--reference-directory") options.referenceDirectory = resolve(value);
      else options.splitFile = resolve(value);
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

export async function inspectReferenceArchive(directory, splitFile) {
  const exactSplitFile = resolve(splitFile);
  const files = (await filesBelow(directory))
    .filter((file) => resolve(file) !== exactSplitFile)
    .sort((left, right) => left.localeCompare(right));
  const archiveHash = createHash("sha256");
  let bytes = 0;
  for (const file of files) {
    const fileStat = await stat(file);
    const fileChecksum = await checksum(file);
    const relativePath = relative(directory, file);
    bytes += fileStat.size;
    archiveHash.update(`${relativePath}\0${fileStat.size}\0${fileChecksum}\n`);
  }
  const splitStat = await stat(splitFile);
  return {
    referenceArchive: {
      bytes,
      contentSha256: archiveHash.digest("hex"),
      files: files.length,
    },
    splitArchive: {
      bytes: splitStat.size,
      file: basename(splitFile),
      sha256: await checksum(splitFile),
    },
  };
}

function approximate(left, right, tolerance = 0.00005) {
  return Number.isFinite(left) && Math.abs(left - right) <= tolerance;
}

function inspectExactIdentity(database, coverage, options) {
  const columns = new Set(database.pragma("table_info(archive_dates)").map((column) => column.name));
  const missingProvenanceColumns = EXACT_IDENTITY_COLUMNS.filter((column) => !columns.has(column));
  if (missingProvenanceColumns.length) {
    if (options.requireExactIdentity) {
      throw new Error(`Archive lacks exact-identity provenance columns: ${missingProvenanceColumns.join(", ")}`);
    }
    return { status: "legacy-unverified", missingProvenanceColumns };
  }

  const quality = database.prepare(`
    select
      sum(case when raw_exact_symbol_count != derived_exact_symbol_count
        or derived_exact_symbol_count != symbol_count then 1 else 0 end) as unreconciledDates,
      coalesce(sum(duplicate_minute_rows), 0) as duplicateMinuteRows,
      coalesce(sum(case when casefold_collision_count > 0 then 1 else 0 end), 0) as collisionDates,
      coalesce(sum(reference_covered_symbols), 0) as referenceCoveredSymbols,
      coalesce(sum(symbol_count), 0) as totalSymbols,
      group_concat(distinct transform_version) as transformVersions
    from archive_dates
  `).get();
  const collisionFamilies = database.prepare(`
    select count(*)
    from (
      select upper(symbol)
      from symbol_days
      group by upper(symbol)
      having count(distinct symbol) > 1
    )
  `).pluck().get();
  const errors = [];
  if (quality.unreconciledDates !== 0) errors.push(`${quality.unreconciledDates} dates have unreconciled exact-symbol counts`);
  if (quality.duplicateMinuteRows !== 0) errors.push(`${quality.duplicateMinuteRows} duplicate exact-symbol minute rows were recorded`);
  if (quality.transformVersions !== EXACT_IDENTITY_TRANSFORM_VERSION) {
    errors.push(`unexpected transform versions: ${quality.transformVersions || "none"}`);
  }

  let tpcIncident = { checked: false };
  if (coverage.fromDate <= "2026-08-18" && coverage.toDate >= "2026-08-18") {
    const rows = database.prepare(`
      select symbol, instrument_type as instrumentType,
        previous_regular_close as previousRegularClose,
        max_high as maxHigh, max_gain_pct as maxGainPct,
        qualifies_mover as qualifiesMover
      from symbol_days
      where session_date = '2026-08-18' and symbol in ('TPC', 'TpC')
      order by symbol collate binary
    `).all();
    const common = rows.find((row) => row.symbol === "TPC");
    const preferred = rows.find((row) => row.symbol === "TpC");
    const valid = Boolean(
      common
      && preferred
      && common.instrumentType === "CS"
      && approximate(common.previousRegularClose, 97.205)
      && approximate(common.maxHigh, 96.4)
      && approximate(common.maxGainPct, -0.8281)
      && common.qualifiesMover === 0,
    );
    tpcIncident = { checked: true, valid };
    if (!valid) errors.push("TPC/TpC August 18 regression contract failed");
  }
  if (errors.length) throw new Error(`Exact-identity verification failed: ${errors.join("; ")}`);

  return {
    status: "verified",
    transformVersion: EXACT_IDENTITY_TRANSFORM_VERSION,
    unreconciledDates: quality.unreconciledDates,
    duplicateMinuteRows: quality.duplicateMinuteRows,
    collisionDates: quality.collisionDates,
    collisionFamilies,
    referenceCoverageRate: quality.totalSymbols
      ? Math.round((quality.referenceCoveredSymbols / quality.totalSymbols) * 1_000_000) / 1_000_000
      : 0,
    tpcIncident,
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

    const identity = inspectExactIdentity(database, coverage, options);
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
      identity,
      journalMode,
    };
  } finally {
    database.close();
  }
}

export async function manifestFor(databasePath, inspection, evidence = {}) {
  const file = await stat(databasePath);
  return {
    formatVersion: inspection.identity?.status === "verified" ? 2 : 1,
    owner: "trading-journal-ai",
    verifiedAt: new Date().toISOString(),
    database: {
      bytes: file.size,
      file: basename(databasePath),
      sha256: await checksum(databasePath),
    },
    ...evidence,
    ...inspection,
  };
}

export async function writeArchiveManifest(databasePath, manifestPath, inspection, evidence) {
  const manifest = await manifestFor(databasePath, inspection, evidence);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  await chmod(manifestPath, 0o600);
  return manifest;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inspection = inspectArchive(options.database, {
    fullIntegrity: options.fullIntegrity,
    requireExactIdentity: options.requireExactIdentity,
  });
  const evidence = {};
  if (options.verifyRaw) evidence.rawMinuteArchive = await inspectRawMinuteArchive(options.rawDirectory);
  if (options.verifyReference) {
    Object.assign(evidence, await inspectReferenceArchive(options.referenceDirectory, options.splitFile));
  }
  const manifest = options.writeManifest
    ? await writeArchiveManifest(options.database, resolve(dirname(options.database), "manifest.json"), inspection, evidence)
    : await manifestFor(options.database, inspection, evidence);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Market Archive verification failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
