"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const date = (value: string) => new Date(`${value}T12:00:00Z`);
const iso = (value: Date) => value.toISOString().slice(0, 10);
const dayLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeZone: "UTC" });
const fieldLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function shiftDate(value: string, days: number) {
  const next = date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return iso(next);
}

export function shiftMonth(value: string, months: number) {
  const next = date(value);
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, last));
  return iso(next);
}

export function monthDays(value: string) {
  const first = `${value.slice(0, 7)}-01`;
  const start = shiftDate(first, -date(first).getUTCDay());
  const firstDate = date(first);
  const daysInMonth = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth() + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((firstDate.getUTCDay() + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => shiftDate(start, index));
}

type Props = {
  label: string;
  value: string;
  min: string;
  max: string;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

export default function ImportDatePicker({ label, value, min, max, invalid, describedBy, onChange }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const focusDay = useRef(false);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(value);
  const clamp = (next: string) => next < min ? min : next > max ? max : next;
  const days = monthDays(cursor);

  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const position = () => {
      const popup = panel.current;
      const anchor = trigger.current;
      if (!popup || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const width = Math.min(304, window.innerWidth - 24);
      popup.style.width = `${width}px`;
      popup.style.maxHeight = `${window.innerHeight - 24}px`;
      const height = popup.getBoundingClientRect().height;
      const below = rect.bottom + 8;
      const top = below + height <= window.innerHeight - 12 ? below : rect.top - height - 8;
      popup.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
      popup.style.top = `${Math.max(12, Math.min(top, window.innerHeight - height - 12))}px`;
    };
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, cursor]);

  useLayoutEffect(() => {
    if (open && focusDay.current) {
      panel.current?.querySelector<HTMLButtonElement>(`[data-date="${cursor}"]`)?.focus({ preventScroll: true });
      focusDay.current = false;
    }
  }, [open, cursor]);

  function close(restoreFocus = true) {
    panel.current?.hidePopover();
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  function select(next: string) {
    onChange(next);
    close();
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, value: string) {
    const weekday = date(value).getUTCDay();
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday };
    let next: string;
    if (event.key in offsets) next = shiftDate(value, offsets[event.key]);
    else if (event.key === "PageUp" || event.key === "PageDown") next = shiftMonth(value, (event.key === "PageUp" ? -1 : 1) * (event.shiftKey ? 12 : 1));
    else return;
    event.preventDefault();
    focusDay.current = true;
    setCursor(clamp(next));
  }

  return <div className="min-w-0 space-y-1">
    <span id={`${id}-label`} className="block text-xs text-[var(--muted)]">{label}</span>
    <button ref={trigger} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog" aria-expanded={open} aria-controls={id}
      aria-describedby={describedBy}
      onClick={() => {
        if (panel.current?.matches(":popover-open")) close();
        else {
          focusDay.current = true;
          setCursor(clamp(value));
          panel.current?.showPopover();
        }
      }}
      className={`flex h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg border bg-[var(--background)] px-3 text-sm text-[var(--foreground)] ${invalid ? "border-[var(--red)]" : "border-[var(--hairline)]"} ${focusClass}`}>
      <span id={`${id}-value`} className="truncate">{fieldLabel.format(date(value))}</span>
      <svg aria-hidden="true" className="shrink-0 text-[var(--muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18" /></svg>
    </button>
    <div ref={panel} id={id} popover="auto" role="dialog" aria-label={`Choose ${label.toLowerCase()} date`}
      onToggle={(event) => setOpen(event.newState === "open")}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } }}
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== trigger.current) close(false); }}
      className="fixed inset-auto m-0 w-[304px] overflow-y-auto rounded-2xl border border-[var(--hairline)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm font-semibold">{monthLabel.format(date(cursor))}</p>
        <div className="flex gap-1">
          {([-1, 1] as const).map((direction) => <button key={direction} type="button" aria-label={direction === -1 ? "Previous month" : "Next month"}
            disabled={direction === -1 ? cursor.slice(0, 7) <= min.slice(0, 7) : cursor.slice(0, 7) >= max.slice(0, 7)}
            onClick={() => setCursor(clamp(shiftMonth(cursor, direction)))}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--body)] hover:bg-[var(--surface-2)] disabled:cursor-default disabled:opacity-30 ${focusClass}`}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={direction === -1 ? "m14 6-6 6 6 6" : "m10 6 6 6-6 6"} /></svg>
          </button>)}
        </div>
      </div>
      <div role="grid" aria-label={monthLabel.format(date(cursor))}>
        <div role="row" className="mb-1 grid grid-cols-7">
          {weekdays.map((day) => <span key={day} role="columnheader" aria-label={day} className="text-center text-xs leading-7 text-[var(--muted)]">{day[0]}</span>)}
        </div>
        {Array.from({ length: days.length / 7 }, (_, week) => <div key={week} role="row" className="grid grid-cols-7">
          {days.slice(week * 7, week * 7 + 7).map((day) => <div key={day} role="gridcell" aria-selected={day === value} className="flex justify-center py-0.5">
            <button type="button" data-date={day} tabIndex={day === cursor ? 0 : -1} aria-label={dayLabel.format(date(day))} aria-current={day === max ? "date" : undefined}
              disabled={day < min || day > max} onClick={() => select(day)} onKeyDown={(event) => navigate(event, day)}
              className={`h-9 w-9 cursor-pointer rounded-full text-sm tabular-nums disabled:cursor-default disabled:opacity-25 ${focusClass} ${day === value ? "bg-[var(--action)] font-semibold text-[var(--action-foreground)]" : "hover:bg-[var(--surface-2)]"} ${day !== value && day.slice(0, 7) !== cursor.slice(0, 7) ? "text-[var(--muted)]" : ""} ${day === max && day !== value ? "ring-1 ring-inset ring-[var(--border)]" : ""}`}>
              {date(day).getUTCDate()}
            </button>
          </div>)}
        </div>)}
      </div>
    </div>
  </div>;
}
