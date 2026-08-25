import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";

export const CORE_MOVER_RULE_VERSION = "core-common-stock-v1";

function configuredPath(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes("\0")) throw new Error("Market Archive paths cannot contain null bytes.");
  return resolve(trimmed);
}

export function defaultArchiveHome(environment = process.env) {
  const userHome = homedir();
  if (platform() === "darwin") {
    return join(userHome, "Library", "Application Support", "Trading Journal AI", "market-archive");
  }
  if (platform() === "win32") {
    return join(configuredPath(environment.LOCALAPPDATA) ?? join(userHome, "AppData", "Local"), "Trading Journal AI", "market-archive");
  }
  return join(configuredPath(environment.XDG_DATA_HOME) ?? join(userHome, ".local", "share"), "trading-journal-ai", "market-archive");
}

export function archivePaths(environment = process.env) {
  const configuredDatabase = configuredPath(environment.MARKET_ARCHIVE_DB_PATH);
  const archiveHome = configuredPath(environment.MARKET_ARCHIVE_HOME)
    ?? (configuredDatabase ? dirname(configuredDatabase) : defaultArchiveHome(environment));
  return {
    archiveHome,
    databasePath: configuredDatabase ?? join(archiveHome, "market-history.sqlite"),
    manifestPath: join(archiveHome, "manifest.json"),
    rawMinuteDirectory: join(archiveHome, "raw", "minute-aggs"),
  };
}
