"use client";
export default function AnalyticsError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-6xl py-12"><h1 className="text-3xl font-semibold">Analytics couldn’t load</h1><p className="mt-4 text-sm text-[var(--muted)]">The trade data could not be read. Retry the request; your trades have not been changed.</p><button className="mt-6 rounded-md bg-[var(--action)] px-4 py-3 text-sm text-[var(--action-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]" onClick={reset}>Retry analytics</button></div>;
}
