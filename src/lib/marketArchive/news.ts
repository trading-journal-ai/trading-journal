export type ArchiveNewsItem = {
  id: string;
  headline: string;
  source: string;
  url: string;
  publishedAt: string;
  timing: "same-day" | "earlier";
};
export type ArchiveNewsResult = {
  items: ArchiveNewsItem[];
  checkedAt: string;
  from: string;
  through: string;
  limited: boolean;
};
const easternDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
});
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function newsWindow(date: string) {
  const time = Date.parse(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(time)
    || new Date(time).toISOString().slice(0, 10) !== date) throw new Error("Invalid archive date.");
  return { from: new Date(time - 7 * 86_400_000).toISOString().slice(0, 10), through: date };
}
export function selectArchiveNews(payload: unknown, symbol: string, date: string): ArchiveNewsResult {
  const window = newsWindow(date);
  if (!record(payload) || !Array.isArray(payload.events)) throw new Error("Invalid news response.");
  const items: ArchiveNewsItem[] = [];
  const seen = new Set<string>();
  for (const event of payload.events) {
    if (!record(event) || !Array.isArray(event.tickers) || !event.tickers.includes(symbol)
      || typeof event.headline !== "string" || !event.headline.trim()
      || event.headline.trim().toLowerCase() === "news detected"
      || typeof event.id !== "string" || typeof event.publishedAt !== "string"
      || typeof event.url !== "string" || !record(event.source) || typeof event.source.name !== "string") continue;
    const published = new Date(event.publishedAt);
    if (!Number.isFinite(published.getTime())) continue;
    const day = easternDate.format(published);
    if (day < window.from || day > date) continue;
    let url: URL;
    try { url = new URL(event.url); } catch { continue; }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);
    items.push({ id: event.id, headline: event.headline, source: event.source.name,
      url: url.href, publishedAt: published.toISOString(), timing: day === date ? "same-day" : "earlier" });
  }
  items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return { items, checkedAt: new Date().toISOString(), ...window, limited: payload.events.length >= 500 };
}
export async function loadArchiveNews(input: { symbol: string; date: string },
  environment: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch) {
  const symbol = input.symbol.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol)) throw new Error("Invalid symbol.");
  const window = newsWindow(input.date);
  const base = new URL(environment.MARKET_HISTORY_SERVER_URL?.trim() || "http://127.0.0.1:8787");
  if (base.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(base.hostname)
    || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("News requires a local Trading Server URL.");
  }
  const url = new URL("/api/news-events", base);
  url.searchParams.set("ticker", symbol);
  url.searchParams.set("since", `${window.from}T00:00:00Z`);
  url.searchParams.set("limit", "500");
  const response = await fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Trading Server news is unavailable.");
  return selectArchiveNews(await response.json(), symbol, input.date);
}
