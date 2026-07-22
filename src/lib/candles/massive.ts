/**
 * Massive (Polygon-platform) candle provider. Fetches 1-minute aggregate bars
 * for a symbol on a single market date. Key is read server-side from the env
 * (never exposed to the client). See docs/product/PRODUCT_SPEC.md §9.
 */
import type { TickerChangeEvent } from "./symbolHistory";

const BASE = "https://api.massive.com";

const tickerEventRequests = new Map<string, Promise<TickerChangeEvent[]>>();

export type Candle = {
  t: number; // bar start, epoch seconds (UTC)
  o: number;
  h: number;
  l: number;
  c: number;
  vol: number;
};

/** Fetch 1-min bars for `symbol` on an ET market date (YYYY-MM-DD). */
export async function fetchMassiveDay(
  symbol: string,
  date: string,
): Promise<Candle[]> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY is not set (.env.local).");

  const url = new URL(
    `/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/minute/${date}/${date}`,
    BASE,
  );
  url.searchParams.set("adjusted", "false");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", "50000");
  url.searchParams.set("apiKey", key);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Massive ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  const results: unknown[] = Array.isArray(body?.results) ? body.results : [];
  return results
    .map((r) => r as Record<string, number>)
    .filter((b) => Number.isFinite(b.t) && Number.isFinite(b.o))
    .map((b) => ({
      t: Math.round(b.t / 1000),
      o: b.o,
      h: b.h,
      l: b.l,
      c: b.c,
      vol: b.v ?? 0,
    }));
}

async function requestMassiveTickerEvents(symbol: string): Promise<TickerChangeEvent[]> {
  const key = process.env.MASSIVE_API_KEY;
  if (!key) throw new Error("MASSIVE_API_KEY is not set (.env.local).");

  const url = new URL(`/vX/reference/tickers/${encodeURIComponent(symbol)}/events`, BASE);
  url.searchParams.set("types", "ticker_change");
  url.searchParams.set("apiKey", key);

  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Massive ticker events ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const body = await res.json();
  const events: unknown[] = Array.isArray(body?.results?.events) ? body.results.events : [];
  return events.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const event = value as Record<string, unknown>;
    const tickerChange = event.ticker_change;
    if (
      event.type !== "ticker_change"
      || typeof event.date !== "string"
      || !tickerChange
      || typeof tickerChange !== "object"
    ) return [];
    const ticker = (tickerChange as Record<string, unknown>).ticker;
    return typeof ticker === "string" ? [{ date: event.date, ticker }] : [];
  });
}

/** Fetch and process-cache a ticker's point-in-time symbol history. */
export async function fetchMassiveTickerEvents(symbol: string): Promise<TickerChangeEvent[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const existingRequest = tickerEventRequests.get(normalizedSymbol);
  if (existingRequest) return existingRequest;

  const request = requestMassiveTickerEvents(normalizedSymbol);
  tickerEventRequests.set(normalizedSymbol, request);
  try {
    return await request;
  } catch (error) {
    tickerEventRequests.delete(normalizedSymbol);
    throw error;
  }
}
