"use client";

import { useState, type ReactNode } from "react";

/**
 * Progressive-disclosure wrapper for heavy journal sections (see
 * docs/design/JOURNAL_NAVIGATION_DECISION.md): collapsed by default, showing
 * a one-line status; children are only inserted into the DOM once opened.
 */
export default function CollapsibleSection({
  title,
  status,
  defaultOpen = false,
  children,
}: {
  title: string;
  status?: string | null;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border-t border-[var(--hairline)] pt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-baseline justify-between gap-3 text-left"
      >
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[13px] font-semibold text-[var(--coach)]">{title}</span>
          {status ? <span className="text-[12px] text-[var(--muted)]">{status}</span> : null}
        </span>
        <span className="shrink-0 text-[12px] font-semibold text-[var(--accent)]">
          {open ? "Hide ▴" : "Open ▾"}
        </span>
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </section>
  );
}
