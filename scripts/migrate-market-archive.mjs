#!/usr/bin/env node

import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Database from "better-sqlite3";
import { archivePaths } from "./market-archive-paths.mjs";
import { inspectArchive, writeArchiveManifest } from "./verify-market-archive.mjs";

function parseArgs(argv) {
  const paths = archivePaths();
  const options = { destination: paths.databasePath, manifest: paths.manifestPath, source: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source" || argument === "--destination") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
      options[argument.slice(2)] = resolve(value);
      index += 1;
    } else throw new Error(`Unknown option: ${argument}`);
  }
  if (!options.source) throw new Error("--source PATH is required");
  options.manifest = resolve(dirname(options.destination), "manifest.json");
  if (options.source === options.destination) throw new Error("Source and destination must be different files");
  return options;
}

export async function migrateArchive(options) {
  const sharedMarker = resolve(dirname(options.destination), ".shared-market-history.json");
  if (process.env.MARKET_HISTORY_PROVIDER === "server" || await stat(sharedMarker).then(() => true, () => false)) {
    throw new Error("Shared market history is owned by Trading Server. Journal snapshot creation is retired for this installation.");
  }
  const sourceFile = await stat(options.source);
  if (!sourceFile.isFile()) throw new Error("The migration source is not a file");
  try {
    await stat(options.destination);
    throw new Error(`Destination already exists: ${options.destination}. Run market-archive:verify instead.`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const destinationDirectory = dirname(options.destination);
  const temporaryPath = `${options.destination}.partial-${process.pid}`;
  await mkdir(destinationDirectory, { mode: 0o700, recursive: true });
  await chmod(destinationDirectory, 0o700);

  const source = new Database(options.source, { fileMustExist: true, readonly: true });
  source.pragma("query_only = ON");
  try {
    await source.backup(temporaryPath);
  } finally {
    source.close();
  }

  try {
    await chmod(temporaryPath, 0o600);
    const snapshot = new Database(temporaryPath, { fileMustExist: true });
    try {
      snapshot.pragma("wal_checkpoint(TRUNCATE)");
      const journalMode = snapshot.pragma("journal_mode = DELETE", { simple: true });
      if (journalMode !== "delete") {
        throw new Error(`Could not convert staged archive to DELETE journal mode; found ${journalMode}`);
      }
      snapshot.pragma("optimize");
    } finally {
      snapshot.close();
    }
    await rm(`${temporaryPath}-wal`, { force: true });
    await rm(`${temporaryPath}-shm`, { force: true });
    const inspection = inspectArchive(temporaryPath, { fullIntegrity: true });
    await rename(temporaryPath, options.destination);
    await chmod(options.destination, 0o400);
    const manifest = await writeArchiveManifest(options.destination, options.manifest, inspection);
    return { destination: options.destination, manifest };
  } catch (error) {
    await Promise.all(["", "-wal", "-shm"].map((suffix) => rm(`${temporaryPath}${suffix}`, { force: true })));
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  process.stdout.write(`Creating a verified Journal-owned snapshot from ${basename(options.source)}…\n`);
  const result = await migrateArchive(options);
  process.stdout.write(`Market Archive migrated to ${result.destination}\n`);
  process.stdout.write(`${JSON.stringify(result.manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    process.stderr.write(`Market Archive migration failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
