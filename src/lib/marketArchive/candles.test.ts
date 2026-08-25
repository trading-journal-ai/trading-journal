import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { loadArchiveCandles } from "./candles";
import type { MarketArchivePaths } from "./config";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function fixturePaths(): MarketArchivePaths {
  const archiveHome = mkdtempSync(join(tmpdir(), "archive-candles-"));
  temporaryDirectories.push(archiveHome);
  const databasePath = join(archiveHome, "market-history.sqlite");
  const database = new Database(databasePath);
  database.exec(`
    create table symbol_days (
      session_date text not null,
      symbol text not null,
      qualifies_mover integer not null,
      primary key (session_date, symbol)
    );
    insert into symbol_days values ('2026-08-24', 'CORE', 1), ('2026-08-24', 'QUIET', 0);
  `);
  database.close();

  const rawMinuteDirectory = join(archiveHome, "raw", "minute-aggs");
  const dayDirectory = join(rawMinuteDirectory, "2026", "08");
  mkdirSync(dayDirectory, { recursive: true });
  const csv = [
    "ticker,volume,open,close,high,low,window_start,transactions",
    "OTHER,10,1,1.1,1.2,0.9,1787572800000000000,2",
    "CORE,100,2,2.2,2.3,1.9,1787562000000000000,10",
    "CORE,200,2.2,2.5,2.6,2.1,1787562060000000000,20",
    "CORE,50,2.5,2.4,2.6,2.3,1787616000000000000,5",
    "ZZZZ,400,9,9.5,10,8.8,1787562120000000000,30",
  ].join("\n");
  writeFileSync(join(dayDirectory, "2026-08-24.csv.gz"), gzipSync(csv));

  return {
    archiveHome,
    candleDatabasePath: join(archiveHome, "candles.sqlite"),
    databasePath,
    manifestPath: join(archiveHome, "manifest.json"),
    rawMinuteDirectory,
  };
}

describe("Momentum Archive candidate candle cache", () => {
  it("extracts only the requested mover and caches the extended-hours day", async () => {
    const paths = fixturePaths();
    const first = await loadArchiveCandles({ date: "2026-08-24", symbol: "core" }, paths);
    const second = await loadArchiveCandles({ date: "2026-08-24", symbol: "CORE" }, paths);

    expect(first.cached).toBe(false);
    expect(first.candles).toEqual([
      { t: 1787562000, o: 2, h: 2.3, l: 1.9, c: 2.2, vol: 100 },
      { t: 1787562060, o: 2.2, h: 2.6, l: 2.1, c: 2.5, vol: 200 },
    ]);
    expect(second).toMatchObject({ cached: true, candles: first.candles });

    const cache = new Database(paths.candleDatabasePath, { readonly: true });
    expect(cache.prepare("select count(*) as count from archive_candles").get()).toEqual({ count: 2 });
    cache.close();
  });

  it("refuses non-movers and malformed identifiers", async () => {
    const paths = fixturePaths();
    await expect(loadArchiveCandles({ date: "2026-08-24", symbol: "QUIET" }, paths))
      .rejects.toThrow("not an archived mover");
    await expect(loadArchiveCandles({ date: "08/24/2026", symbol: "CORE" }, paths))
      .rejects.toThrow("Invalid archive candle date");
  });
});
