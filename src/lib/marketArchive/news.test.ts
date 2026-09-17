import { describe, expect, it, vi } from "vitest";
import { loadArchiveNews, newsWindow, selectArchiveNews } from "./news";

const event = (overrides = {}) => ({ id: "one", headline: "Example company announces results", tickers: ["DEMO"],
  publishedAt: "2026-09-15T22:00:00Z", url: "https://example.com/story", source: { name: "Example wire" }, ...overrides });

describe("archive news", () => {
  it("rejects impossible dates and rolls the lookback across months", () => {
    expect(() => newsWindow("2026-02-30")).toThrow();
    expect(newsWindow("2026-09-02").from).toBe("2026-08-26");
  });
  it("matches symbol and ET date, retaining after-hours headlines but excluding later news", () => {
    const result = selectArchiveNews({ events: [event(),
      event({ id: "late", url: "https://example.com/late", publishedAt: "2026-09-16T01:00:00Z" }),
      event({ publishedAt: "2026-09-16T04:00:00Z", url: "https://example.com/future" }),
      event({ tickers: ["OTHER"] }), event({ publishedAt: "2026-09-07T20:00:00Z" }),
      event({ id: "earlier", url: "https://example.com/earlier", publishedAt: "2026-09-12T20:00:00Z" }),
    ] }, "DEMO", "2026-09-15");
    expect(result.items.map(item => item.id)).toEqual(["late", "one", "earlier"]);
    expect(result.items.map(item => item.timing)).toEqual(["same-day", "same-day", "earlier"]);
  });
  it("ignores unsafe links, duplicate URLs, invalid dates and scanner placeholders", () => {
    const result = selectArchiveNews({ events: [event(), event(), event({ url: "javascript:alert(1)" }),
      event({ publishedAt: "bad" }), event({ headline: "News detected" }), null] }, "DEMO", "2026-09-15");
    expect(result.items).toHaveLength(1);
    expect(() => selectArchiveNews({}, "DEMO", "2026-09-15")).toThrow();
  });
  it("marks capped responses as incomplete", () => {
    expect(selectArchiveNews({ events: Array(500).fill(event()) }, "DEMO", "2026-09-15").limited).toBe(true);
  });
  it("only reads the local Server saved-news API and fails distinctly from empty results", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ events: [] })));
    expect((await loadArchiveNews({ symbol: "demo", date: "2026-09-15" }, {}, fetcher)).items).toEqual([]);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/news-events");
    expect(url.searchParams.get("ticker")).toBe("DEMO");
    await expect(loadArchiveNews({ symbol: "../bad", date: "2026-09-15" }, {}, fetcher)).rejects.toThrow();
    await expect(loadArchiveNews({ symbol: "DEMO", date: "2026-09-15" },
      { MARKET_HISTORY_SERVER_URL: "https://example.com" }, fetcher)).rejects.toThrow();
    fetcher.mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(loadArchiveNews({ symbol: "DEMO", date: "2026-09-15" }, {}, fetcher)).rejects.toThrow();
  });
});
