"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

function lastDayOfMonth(date: string): string {
  const [year, month] = date.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${date.slice(0, 7)}-${String(day).padStart(2, "0")}`;
}

export default function MonthPicker({ selectedDate }: { selectedDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(selectedDate.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(selectedDate.slice(5, 7)));

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function applyMonth() {
    const params = new URLSearchParams(searchParams.toString());
    const from = isoDate(year, month, 1);

    params.delete("date");
    params.delete("page");
    params.set("preset", "month");
    params.set("from", from);
    params.set("to", lastDayOfMonth(from));

    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors ${
          open
            ? "border-[var(--blue)] text-[var(--foreground)]"
            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
        }`}
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M7 3v4M17 3v4M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
        </svg>
        <span>Select month</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setYear((value) => value - 1)}
              className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
              aria-label="Previous year"
            >
              &lt;
            </button>
            <div className="text-base font-semibold tabular-nums text-[var(--foreground)]">{year}</div>
            <button
              type="button"
              onClick={() => setYear((value) => value + 1)}
              className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
              aria-label="Next year"
            >
              &gt;
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((label, index) => {
              const value = index + 1;
              const active = value === month;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMonth(value)}
                  className={`h-9 rounded-md border px-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-[var(--blue)] bg-[var(--background)] text-[var(--foreground)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={applyMonth}
            className="mt-4 h-10 w-full rounded-md border border-[var(--blue)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
