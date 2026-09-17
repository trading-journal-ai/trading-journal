"use client";

import { useId, useState, type FocusEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";

export default function MomentumArchiveSymbol({ symbol, name, panelId, open, subdued }: {
  symbol: string; name: string | null; panelId: string; open: boolean; subdued: boolean;
}) {
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  function show(event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 296)), top: rect.bottom + 4 });
  }
  return <>
    <button type="button" aria-controls={panelId} aria-expanded={open} aria-describedby={position ? id : undefined}
      aria-label={`${symbol} — ${name || "Company name unavailable"}. ${open ? "Close" : "Open"} chart`}
      onMouseEnter={show} onMouseLeave={() => setPosition(null)} onFocus={show} onBlur={() => setPosition(null)}
      onKeyDown={(event) => { if (event.key === "Escape") setPosition(null); }}
      className={`text-left font-semibold ${subdued ? "text-[var(--muted)]" : "text-[var(--foreground)]"} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]`}>
      {symbol}
    </button>
    {position ? createPortal(<div id={id} role="tooltip" style={position}
      className="pointer-events-none fixed z-50 max-w-72 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
      {name || "Company name unavailable"}
    </div>, document.body) : null}
  </>;
}
