/**
 * Candle cache: fetch-once on demand, then serve from SQLite.
 *
 * `getCandles` ensures the trade's market day(s) are cached (fetching from
 * Massive if not), then returns the bars within the requested window.
 */
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { canFetchRemoteCandles } from "@/lib/demoMode";
import { MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";
import { isCusip } from "@/lib/import/securityIdentifiers";
import type { Candle } from "./massive";
import { fetchResolvedCandleDay, type CandleResolutionMethod } from "./resolveDay";
import { marketDataSymbolForDate } from "./symbolHistory";

const TIMEFRAME = "1m";

export type CandleDataStatus = "market" | "missing" | "provider_error";
export type { CandleResolutionMethod } from "./resolveDay";

export type CandleDataResult = {
  attemptedSymbols: string[];
  candles: Candle[];
  error?: string;
  marketDataSymbol?: string;
  resolutionMethod?: CandleResolutionMethod | "cache";
  status: CandleDataStatus;
};

type DayCacheResult = {
  attemptedSymbols: string[];
  historyError?: string;
  marketDataSymbol?: string;
  resolutionMethod?: CandleResolutionMethod | "cache";
  status: "cache" | "fetched" | "missing";
};

const etDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ET market date (YYYY-MM-DD) for an epoch-seconds instant. */
function etDate(epochSeconds: number): string {
  return etDateFmt.format(new Date(epochSeconds * 1000));
}

/** Unique set of ET dates spanned by [from, to] (hourly steps cover DST). */
function etDatesBetween(from: number, to: number): string[] {
  const dates = new Set<string>();
  for (let t = from; t <= to; t += 3600) dates.add(etDate(t));
  dates.add(etDate(to));
  return [...dates];
}

function dayBounds(date: string): { start: number; end: number } {
  const start = Math.round(zonedDateTimeToUtcMs(date, "00:00:00", MARKET_TZ) / 1000);
  return { start: start - 3600, end: start + 26 * 3600 };
}

async function storeCandles(symbol: string, bars: Candle[]): Promise<void> {
  if (bars.length === 0) return;
  await db
    .insert(schema.candles)
    .values(
      bars.map((bar) => ({
        symbol,
        timeframe: TIMEFRAME,
        t: bar.t,
        o: bar.o,
        h: bar.h,
        l: bar.l,
        c: bar.c,
        vol: bar.vol,
      })),
    )
    .onConflictDoNothing();
}

async function ensureDayCached(symbol: string, date: string): Promise<DayCacheResult> {
  const { start, end } = dayBounds(date);
  const existing = await db
    .select({ t: schema.candles.t })
    .from(schema.candles)
    .where(
      and(
        eq(schema.candles.symbol, symbol),
        eq(schema.candles.timeframe, TIMEFRAME),
        gte(schema.candles.t, start),
        lte(schema.candles.t, end),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return {
      attemptedSymbols: [],
      marketDataSymbol: marketDataSymbolForDate(symbol, date),
      resolutionMethod: "cache",
      status: "cache",
    };
  }

  const resolvedDay = await fetchResolvedCandleDay(symbol, date);
  if (resolvedDay.bars.length === 0) {
    return {
      attemptedSymbols: resolvedDay.attemptedSymbols,
      historyError: resolvedDay.historyError,
      status: "missing",
    };
  }

  await storeCandles(symbol, resolvedDay.bars);
  return {
    attemptedSymbols: resolvedDay.attemptedSymbols,
    marketDataSymbol: resolvedDay.marketDataSymbol,
    resolutionMethod: resolvedDay.resolutionMethod,
    status: "fetched",
  };
}

async function readCachedCandles(symbol: string, from: number, to: number): Promise<Candle[]> {
  const rows = await db
    .select()
    .from(schema.candles)
    .where(
      and(
        eq(schema.candles.symbol, symbol),
        eq(schema.candles.timeframe, TIMEFRAME),
        gte(schema.candles.t, from),
        lte(schema.candles.t, to),
      ),
    )
    .orderBy(schema.candles.t);

  return rows.map((r) => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, vol: r.vol }));
}

/**
 * Return cached 1-min candles for `symbol` within [from, to] (epoch seconds),
 * fetching any uncached market days first. Errors are swallowed to a degraded
 * empty result so a chart can render "no data" rather than crash.
 */
export async function getCandles(
  symbol: string,
  from: number,
  to: number,
): Promise<CandleDataResult> {
  const requestedSymbol = symbol.trim().toUpperCase();
  const dates = etDatesBetween(from, to);
  if (isCusip(requestedSymbol)) {
    return {
      attemptedSymbols: [requestedSymbol],
      candles: [],
      error: `Market candles are unavailable until CUSIP ${requestedSymbol} is resolved to a ticker.`,
      status: "missing",
    };
  }
  if (!canFetchRemoteCandles()) {
    const candles = await readCachedCandles(requestedSymbol, from, to);
    return {
      attemptedSymbols: [marketDataSymbolForDate(requestedSymbol, dates[0])],
      candles,
      error: candles.length === 0 ? `No cached market candles were found for ${requestedSymbol}.` : undefined,
      marketDataSymbol: marketDataSymbolForDate(requestedSymbol, dates[0]),
      resolutionMethod: candles.length > 0 ? "cache" : undefined,
      status: candles.length > 0 ? "market" : "missing",
    };
  }

  const dayResults: DayCacheResult[] = [];
  try {
    for (const date of dates) {
      dayResults.push(await ensureDayCached(requestedSymbol, date));
    }
  } catch (e) {
    return {
      attemptedSymbols: [...new Set(dayResults.flatMap((result) => result.attemptedSymbols))],
      candles: [],
      error: e instanceof Error ? e.message : "Candle fetch failed.",
      status: "provider_error",
    };
  }

  const candles = await readCachedCandles(requestedSymbol, from, to);
  const attemptedSymbols = [...new Set(dayResults.flatMap((result) => result.attemptedSymbols))];
  const resolvedDay = dayResults.find((result) => result.status === "fetched")
    ?? dayResults.find((result) => result.status === "cache");
  if (candles.length > 0) {
    return {
      attemptedSymbols,
      candles,
      marketDataSymbol: resolvedDay?.marketDataSymbol,
      resolutionMethod: resolvedDay?.resolutionMethod,
      status: "market",
    };
  }

  const historyErrors = dayResults.flatMap((result) => result.historyError ? [result.historyError] : []);
  const attemptedLabel = attemptedSymbols.length > 0 ? ` Checked ${attemptedSymbols.join(", ")}.` : "";
  const historyErrorLabel = historyErrors.length > 0
    ? ` Automatic ticker-history check could not complete: ${historyErrors[0]}`
    : " Automatic ticker-history repair did not find a usable symbol.";
  return {
    attemptedSymbols,
    candles: [],
    error: `No Massive candles were found for ${requestedSymbol} on ${dates.join(", ")}.${attemptedLabel}${historyErrorLabel}`,
    status: "missing",
  };
}

/**
 * Cache-only read: never fetches remotely. For rendering many ticker-days at
 * once (archive/month views) where a missing day must degrade instantly to
 * "no data" instead of burning a rate-limited API call per render.
 */
export async function getCachedCandles(
  symbol: string,
  from: number,
  to: number,
): Promise<Candle[]> {
  if (isCusip(symbol)) return [];
  return readCachedCandles(symbol.trim().toUpperCase(), from, to);
}
