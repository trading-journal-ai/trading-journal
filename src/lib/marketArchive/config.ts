import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

export const MARKET_ARCHIVE_DATABASE_FILE = "market-history.sqlite";
export const MARKET_ARCHIVE_CANDLE_DATABASE_FILE = "candles.sqlite";
export const MARKET_ARCHIVE_MANIFEST_FILE = "manifest.json";

type MarketArchiveEnvironment = Readonly<Record<string, string | undefined>>;

export type MarketArchivePaths = {
  archiveHome: string;
  candleDatabasePath: string;
  databasePath: string;
  manifestPath: string;
  rawMinuteDirectory: string;
};

function environmentPath(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes("\0")) throw new Error("Market Archive paths cannot contain null bytes.");
  return resolve(trimmed);
}

export function defaultMarketArchiveHome(
  environment: MarketArchiveEnvironment = process.env,
  platform: NodeJS.Platform = process.platform,
  userHome: string = homedir(),
): string {
  if (!isAbsolute(userHome)) throw new Error("The user home directory must be absolute.");

  if (platform === "darwin") {
    return join(userHome, "Library", "Application Support", "Trading Journal AI", "market-archive");
  }

  if (platform === "win32") {
    const localAppData = environmentPath(environment.LOCALAPPDATA)
      ?? join(userHome, "AppData", "Local");
    return join(localAppData, "Trading Journal AI", "market-archive");
  }

  const dataHome = environmentPath(environment.XDG_DATA_HOME)
    ?? join(userHome, ".local", "share");
  return join(dataHome, "trading-journal-ai", "market-archive");
}

export function resolveMarketArchivePaths(
  environment: MarketArchiveEnvironment = process.env,
  platform: NodeJS.Platform = process.platform,
  userHome: string = homedir(),
): MarketArchivePaths {
  const configuredHome = environmentPath(environment.MARKET_ARCHIVE_HOME);
  const configuredDatabase = environmentPath(environment.MARKET_ARCHIVE_DB_PATH);
  const archiveHome = configuredHome
    ?? (configuredDatabase ? dirname(configuredDatabase) : defaultMarketArchiveHome(environment, platform, userHome));
  const databasePath = configuredDatabase ?? join(archiveHome, MARKET_ARCHIVE_DATABASE_FILE);

  return {
    archiveHome,
    candleDatabasePath: join(archiveHome, MARKET_ARCHIVE_CANDLE_DATABASE_FILE),
    databasePath,
    manifestPath: join(archiveHome, MARKET_ARCHIVE_MANIFEST_FILE),
    rawMinuteDirectory: join(archiveHome, "raw", "minute-aggs"),
  };
}
