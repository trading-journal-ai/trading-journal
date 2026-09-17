"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import ImportDatePicker from "./ImportDatePicker";
import { validArchiveRange } from "@/lib/momentumArchiveDates";

export default function DateRangePicker({ from, to, today, onApply, className, dialogLabel = "Date range", triggerLabel = "Calendar", description = "Both dates included · Eastern Time" }: {
  from: string;
  to: string;
  today: string;
  onApply: (from: string, to: string) => void;
  dialogLabel?: string;
  triggerLabel?: ReactNode;
  description?: string;
  className: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const valid = validArchiveRange(start, end);

  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      if (!panel.current || !trigger.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(440, window.innerWidth - 24);
      panel.current.style.width = `${width}px`;
      panel.current.style.maxHeight = `${window.innerHeight - 24}px`;
      const height = panel.current.getBoundingClientRect().height;
      panel.current.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      panel.current.style.top = `${Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12))}px`;
    };
    position();
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  function close() {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  }

  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      className={`${className} cursor-pointer`}
      onClick={() => {
        if (panel.current?.matches(":popover-open")) close();
        else {
          setStart(from);
          setEnd(to);
          panel.current?.showPopover();
        }
      }}>{triggerLabel}</button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-label={dialogLabel}
      onToggle={(event) => {
        // React bubbles child calendar toggles; only this panel owns its focus.
        if (event.target === event.currentTarget) setOpen(event.newState === "open");
      }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}
      className="fixed inset-auto m-0 overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-xl">
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onApply(start, end);
        close();
      }}>
        <h2 className="mb-4 text-sm font-semibold">Date range</h2>
        <div className="grid grid-cols-2 gap-3">
          <ImportDatePicker label="Start date" value={start} min="1900-01-01" max="9999-12-31" today={today}
            onChange={(value) => { setStart(value); if (value > end) setEnd(value); }} />
          <ImportDatePicker label="End date" value={end} min={start} max="9999-12-31" today={today} onChange={setEnd} />
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">{description}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="h-10 cursor-pointer rounded-md px-3 text-sm text-[var(--muted)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]" onClick={close}>Cancel</button>
          <button type="submit" disabled={!valid} className="h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Apply range</button>
        </div>
      </form>
    </div>
  </>;
}
