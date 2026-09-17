"use client";

import { useEffect, useState } from "react";
import type { ArchiveNewsResult } from "@/lib/marketArchive/news";

export default function MomentumArchiveNews({ symbol, date }: { symbol: string; date: string }) {
  const [state, setState] = useState<{ key: string; result: ArchiveNewsResult | null } | null>(null);
  const key = `${date}:${symbol}`;
  const loaded = state?.key === key;
  const result = loaded ? state.result : null;

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      // Every displayed row is checked automatically. Retry a failed read once;
      // source errors must never become a definitive No news result.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetch(`/api/analytics/momentum-archive/news?${new URLSearchParams({ symbol, date })}`,
            { signal: controller.signal });
          if (!response.ok) throw new Error("News unavailable");
          const news = await response.json() as ArchiveNewsResult;
          if (!controller.signal.aborted) setState({ key, result: news });
          return;
        } catch {
          if (controller.signal.aborted) return;
          if (attempt === 1) setState({ key, result: null });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [symbol, date, key]);

  if (!loaded) return <span className="inline-block py-1 text-[var(--muted)]" aria-label="Loading news">—</span>;
  if (!result || (result.limited && result.items.length === 0)) {
    return (
      <span className="inline-flex py-1 text-[var(--muted)]" title="Saved news could not be verified. Reload to try again.">
        <svg role="img" aria-label="News lookup unavailable" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="9" /><path d="M12 7v6m0 3v1" />
        </svg>
      </span>
    );
  }
  const status = result.items.some(item => item.timing === "same-day")
    ? "Fresh news"
    : result.items.length > 0 ? "Earlier news" : "No news";
  const explanation = {
    "Fresh news": "Saved news was published on this trading date. This does not confirm it caused the move.",
    "Earlier news": "Saved news was published within the seven days before this trading date.",
    "No news": "No matching news was found in the saved data for this date and the preceding seven days. Coverage may be incomplete.",
  }[status];

  return <div className="whitespace-nowrap py-1 text-[var(--muted)]" title={explanation}>{status}</div>;
}
