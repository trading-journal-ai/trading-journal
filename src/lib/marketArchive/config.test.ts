import { describe, expect, it } from "vitest";
import { defaultMarketArchiveHome, resolveMarketArchivePaths } from "./config";

describe("Market Archive paths", () => {
  it("uses the Trading Journal AI application-data directory on macOS", () => {
    expect(defaultMarketArchiveHome({}, "darwin", "/Users/example")).toBe(
      "/Users/example/Library/Application Support/Trading Journal AI/market-archive",
    );
  });

  it("allows one archive-home override for every Journal-owned artifact", () => {
    expect(resolveMarketArchivePaths(
      { MARKET_ARCHIVE_HOME: "/private/archive" },
      "darwin",
      "/Users/example",
    )).toEqual({
      archiveHome: "/private/archive",
      candleDatabasePath: "/private/archive/candles.sqlite",
      databasePath: "/private/archive/market-history.sqlite",
      manifestPath: "/private/archive/manifest.json",
      rawMinuteDirectory: "/private/archive/raw/minute-aggs",
      referenceDirectory: "/private/archive/raw/reference",
      splitFile: "/private/archive/raw/reference/splits.jsonl.gz",
    });
  });

  it("keeps the exact database-path override backward compatible", () => {
    expect(resolveMarketArchivePaths(
      { MARKET_ARCHIVE_DB_PATH: "/private/legacy/archive.sqlite" },
      "darwin",
      "/Users/example",
    )).toMatchObject({
      archiveHome: "/private/legacy",
      databasePath: "/private/legacy/archive.sqlite",
    });
  });

  it("rejects a relative user-home directory", () => {
    expect(() => defaultMarketArchiveHome({}, "darwin", "relative/home")).toThrow(
      "must be absolute",
    );
  });
});
