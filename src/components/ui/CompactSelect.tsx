"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

/** Compact single-choice control; its top-layer menu opens above the trigger. */
export default function CompactSelect({ label, placeholder, value, options, onChange }: {
  label: string;
  placeholder: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect();
      const width = Math.min(200, window.innerWidth - 24);
      Object.assign(panel.current.style, {
        width: `${width}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
        bottom: `${window.innerHeight - rect.top + 6}px`,
        maxHeight: `${Math.max(32, Math.min(240, rect.top - 18))}px`,
      });
    }
    position();
    const selected = panel.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (selected ?? panel.current?.querySelector<HTMLButtonElement>('[role="option"]'))?.focus({ preventScroll: true });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  function close(restoreFocus = true) {
    panel.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  return <>
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : panel.current?.showPopover()}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          panel.current?.showPopover();
        }
      }}
      className="inline-flex h-7 max-w-48 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2.5 text-[11px] leading-none text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
      <span className="truncate">{options.find((option) => option.value === value)?.label ?? placeholder}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="m7 10 5 5 5-5" /></svg>
    </button>
    <div ref={panel} id={id} popover="auto" role="listbox" aria-label={label}
      onToggle={(event) => setOpen(event.newState === "open")}
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) close(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); return; }
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "ArrowDown" ? Math.min(index + 1, buttons.length - 1)
          : event.key === "ArrowUp" ? Math.max(index - 1, 0)
          : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : null;
        if (next !== null) { event.preventDefault(); buttons[next]?.focus(); }
      }}
      className="fixed inset-auto m-0 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--foreground)]">
      {options.map((option) => <button key={option.value} type="button" tabIndex={-1} role="option" aria-selected={value === option.value}
        onClick={() => { onChange(option.value); close(); }}
        className="block min-h-8 w-full rounded-md px-3 py-1.5 text-left text-[12px] hover:bg-[var(--surface)] focus:bg-[var(--surface)] focus:outline-none aria-selected:font-semibold">
        {option.label}
      </button>)}
    </div>
  </>;
}
