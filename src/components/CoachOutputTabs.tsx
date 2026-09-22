"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Two-tier coach output switcher: the deterministic (no-AI) read vs the
 * LLM-generated review. Makes the tier boundary explicit so a fresh
 * generation is verifiable against the math it narrates.
 */
export default function CoachOutputTabs({
  deterministic,
  ai,
  hasAiReview,
  reviewScope,
}: {
  deterministic: ReactNode;
  ai: ReactNode;
  hasAiReview: boolean;
  reviewScope?: { scope: string; scopeKey: string };
}) {
  const [tab, setTab] = useState<"deterministic" | "ai">("deterministic");

  const scope = reviewScope?.scope;
  const scopeKey = reviewScope?.scopeKey;
  useEffect(() => {
    function refreshed(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      if (event.detail?.scope === scope && event.detail?.scopeKey === scopeKey) setTab("ai");
    }
    window.addEventListener("coach-review-refreshed", refreshed);
    return () => window.removeEventListener("coach-review-refreshed", refreshed);
  }, [scope, scopeKey]);

  const tabClass = (active: boolean) =>
    `min-h-8 cursor-pointer whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
      active
        ? "bg-[var(--foreground)] text-[var(--background)]"
        : "text-[var(--muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div>
      <div role="tablist" aria-label="Coach output" className="flex gap-1 border-b border-[var(--hairline)] pb-2.5">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "deterministic"}
          onClick={() => setTab("deterministic")}
          className={tabClass(tab === "deterministic")}
        >
          Automatic · no AI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "ai"}
          onClick={() => setTab("ai")}
          className={tabClass(tab === "ai")}
        >
          AI review{hasAiReview ? "" : " · none yet"}
        </button>
      </div>
      <div className="mt-4">
        {tab === "deterministic" ? deterministic : ai}
      </div>
    </div>
  );
}
