import { chmodSync, createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { createGunzip } from "node:zlib";
import Database from "better-sqlite3";
import type { ChartCandle } from "@/components/TradeChart";
import { MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";
import { resolveMarketArchivePaths, type MarketArchivePaths } from "./config";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.\-]{0,31}$/;

type CachedDayRow = {
  rowCount: number;
  sourceMtimeMs: number;
  sourceSize: number;
};

export type ArchiveCandleResult = {
  cached: boolean;
  candles: ChartCandle[];
  date: string;
  sourceFile: string;
  symbol: string;
};

function normalizedRequest(symbol: string, date: string) {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!SYMBOL_PATTERN.test(normalizedSymbol)) throw new Error("Invalid archive candle symbol.");
  if (!DATE_PATTERN.test(date)) throw new Error("Invalid archive candle date.");
  return { date, symbol: normalizedSymbol };
}

function rawFileForDate(rawDirectory: string, date: string): string {
  const [year, month] = date.split("-");
  return join(rawDirectory, year, month, `${date}.csv.gz`);
}

function extendedHoursBounds(date: string): { end: number; start: number } {
  return {
    start: Math.round(zonedDateTimeToUtcMs(date, "04:00:00", MARKET_TZ) / 1000),
    end: Math.round(zonedDateTimeToUtcMs(date, "20:00:00", MARKET_TZ) / 1000),
  };
}

function openCache(databasePath: string): Database.Database {
  mkdirSync(dirname(databasePath), { mode: 0o700, recursive: true });
  const database = new Database(databasePath);
  chmodSync(databasePath, 0o600);
  database.pragma("journal_mode = DELETE");
  database.pragma("synchronous = NORMAL");
  database.exec(`
    create table if not exists archive_candle_days (
      session_date text not null,
      symbol text not null,
      source_file text not null,
      source_size integer not null,
      source_mtime_ms integer not null,
      row_count integer not null,
      cached_at text not null,
      primary key (session_date, symbol)
    );
    create table if not exists archive_candles (
      session_date text not null,
      symbol text not null,
      t integer not null,
      o real not null,
      h real not null,
      l real not null,
      c real not null,
      vol real not null,
      primary key (session_date, symbol, t)
    ) without rowid;
  `);
  return database;
}

function assertMover(databasePath: string, symbol: string, date: string): void {
  const database = new Database(databasePath, { fileMustExist: true, readonly: true });
  try {
    database.pragma("query_only = ON");
    const row = database.prepare(`
      select 1
      from symbol_days
      where session_date = ? and symbol = ? and qualifies_mover = 1
    `).get(date, symbol);
    if (!row) throw new Error(`${symbol} is not an archived mover on ${date}.`);
  } finally {
    database.close();
  }
}

function readCachedCandles(database: Database.Database, symbol: string, date: string): ChartCandle[] {
  return database.prepare(`
    select t, o, h, l, c, vol
    from archive_candles
    where session_date = ? and symbol = ?
    order by t
  `).all(date, symbol) as ChartCandle[];
}

function parseCandle(fields: string[], indexes: Map<string, number>): ChartCandle | null {
  const field = (name: string) => fields[indexes.get(name) ?? -1];
  const windowStart = field("window_start");
  if (!windowStart || !/^\d+$/.test(windowStart)) return null;
  const candle = {
    t: Number(windowStart.length > 9 ? windowStart.slice(0, -9) : "0"),
    o: Number(field("open")),
    h: Number(field("high")),
    l: Number(field("low")),
    c: Number(field("close")),
    vol: Number(field("volume")),
  };
  return Object.values(candle).every(Number.isFinite) ? candle : null;
}

async function extractSymbolCandles(
  sourceFile: string,
  symbol: string,
  date: string,
): Promise<ChartCandle[]> {
  const input = createReadStream(sourceFile).pipe(createGunzip({ chunkSize: 1024 * 1024 }));
  input.setEncoding("utf8");
  const { start, end } = extendedHoursBounds(date);
  const candles: ChartCandle[] = [];
  let indexes: Map<string, number> | null = null;
  let buffer = "";
  let foundSymbol = false;

  function consume(line: string): boolean {
    const fields = line.split(",");
    if (!indexes) {
      indexes = new Map(fields.map((name, index) => [name.trim(), index]));
      for (const required of ["ticker", "volume", "open", "close", "high", "low", "window_start"]) {
        if (!indexes.has(required)) throw new Error(`Raw archive is missing the ${required} column.`);
      }
      return false;
    }
    const ticker = fields[indexes.get("ticker") ?? -1]?.trim().toUpperCase();
    if (foundSymbol && ticker !== symbol) return true;
    if (ticker !== symbol) return false;
    foundSymbol = true;
    const candle = parseCandle(fields, indexes);
    if (candle && candle.t >= start && candle.t < end) candles.push(candle);
    return false;
  }

  for await (const chunk of input) {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).replace(/\r$/, "");
      buffer = buffer.slice(newline + 1);
      if (consume(line)) return candles.sort((left, right) => left.t - right.t);
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer && consume(buffer.replace(/\r$/, ""))) return candles.sort((left, right) => left.t - right.t);

  return candles.sort((left, right) => left.t - right.t);
}

function storeCandles(
  database: Database.Database,
  candles: ChartCandle[],
  input: { date: string; sourceFile: string; sourceMtimeMs: number; sourceSize: number; symbol: string },
): void {
  const replaceDay = database.transaction(() => {
    database.prepare("delete from archive_candles where session_date = ? and symbol = ?")
      .run(input.date, input.symbol);
    const insert = database.prepare(`
      insert into archive_candles (session_date, symbol, t, o, h, l, c, vol)
      values (@date, @symbol, @t, @o, @h, @l, @c, @vol)
    `);
    for (const candle of candles) insert.run({ ...candle, date: input.date, symbol: input.symbol });
    database.prepare(`
      insert into archive_candle_days (
        session_date, symbol, source_file, source_size, source_mtime_ms, row_count, cached_at
      ) values (?, ?, ?, ?, ?, ?, ?)
      on conflict (session_date, symbol) do update set
        source_file = excluded.source_file,
        source_size = excluded.source_size,
        source_mtime_ms = excluded.source_mtime_ms,
        row_count = excluded.row_count,
        cached_at = excluded.cached_at
    `).run(
      input.date,
      input.symbol,
      input.sourceFile,
      input.sourceSize,
      input.sourceMtimeMs,
      candles.length,
      new Date().toISOString(),
    );
  });
  replaceDay();
}

export async function loadArchiveCandles(
  input: { date: string; symbol: string },
  paths: MarketArchivePaths = resolveMarketArchivePaths(),
): Promise<ArchiveCandleResult> {
  const request = normalizedRequest(input.symbol, input.date);
  assertMover(paths.databasePath, request.symbol, request.date);
  const sourceFile = rawFileForDate(paths.rawMinuteDirectory, request.date);
  const cache = openCache(paths.candleDatabasePath);
  try {
    const cachedDay = cache.prepare(`
      select source_size as sourceSize, source_mtime_ms as sourceMtimeMs, row_count as rowCount
      from archive_candle_days
      where session_date = ? and symbol = ?
    `).get(request.date, request.symbol) as CachedDayRow | undefined;

    if (cachedDay && !existsSync(sourceFile)) {
      return { ...request, cached: true, candles: readCachedCandles(cache, request.symbol, request.date), sourceFile };
    }
    if (!existsSync(sourceFile)) throw new Error(`Raw minute archive is missing ${request.date}.`);

    const source = statSync(sourceFile);
    const sourceMtimeMs = Math.trunc(source.mtimeMs);
    if (cachedDay && cachedDay.sourceSize === source.size && cachedDay.sourceMtimeMs === sourceMtimeMs) {
      return { ...request, cached: true, candles: readCachedCandles(cache, request.symbol, request.date), sourceFile };
    }

    const candles = await extractSymbolCandles(sourceFile, request.symbol, request.date);
    storeCandles(cache, candles, {
      ...request,
      sourceFile,
      sourceMtimeMs,
      sourceSize: source.size,
    });
    return { ...request, cached: false, candles, sourceFile };
  } finally {
    cache.close();
  }
}
