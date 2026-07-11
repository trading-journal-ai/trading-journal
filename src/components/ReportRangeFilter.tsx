"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const rangeDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});
const rangeDateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function rangeLabel(from: string | undefined, to: string | undefined): string | null {
  if (!from && !to) return null;
  const formatDate = (date: string) => rangeDateFmt.format(new Date(`${date}T00:00:00Z`));
  if (from && to) {
    if (from === to) return formatDate(from);
    const fromDate = new Date(`${from}T00:00:00Z`);
    const toDate = new Date(`${to}T00:00:00Z`);
    if (fromDate.getUTCFullYear() === toDate.getUTCFullYear()) {
      return `${rangeDayFmt.format(fromDate)} to ${formatDate(to)}`;
    }
    return `${formatDate(from)} to ${formatDate(to)}`;
  }
  return from ? `From ${formatDate(from)}` : `To ${formatDate(to!)}`;
}

export default function ReportRangeFilter({
  from,
  to,
  clearHref,
}: {
  from?: string;
  to?: string;
  clearHref: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const label = rangeLabel(from, to);

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

  function applyRange() {
    const nextFrom = fromInputRef.current?.value ?? "";
    const nextTo = toInputRef.current?.value ?? "";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    params.delete("page");
    params.set("preset", "custom");

    if (nextFrom) params.set("from", nextFrom);
    else params.delete("from");

    if (nextTo) params.set("to", nextTo);
    else params.delete("to");

    setOpen(false);
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleOpen() {
    setOpen((value) => !value);
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleOpen}
          className={`flex h-10 items-center gap-2 rounded-md border bg-[var(--surface)] px-4 text-sm font-semibold transition-colors ${
            open || label
              ? "border-[var(--accent)] text-[var(--foreground)]"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
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
          <span>{label ?? "From - To"}</span>
        </button>

        <Link
          href={clearHref}
          className="flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm text-[var(--muted)] hover:border-[var(--accent)]"
        >
          Clear
        </Link>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-[calc(100vw-2rem)] max-w-xl rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl md:w-[520px]">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-1">
              <span className="block text-sm font-semibold text-[var(--muted)]">From</span>
              <input
                ref={fromInputRef}
                type="date"
                defaultValue={from ?? ""}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <label className="space-y-1">
              <span className="block text-sm font-semibold text-[var(--muted)]">To</span>
              <input
                ref={toInputRef}
                type="date"
                defaultValue={to ?? ""}
                className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
            </label>

            <div className="flex items-end">
              <button
                type="button"
                onClick={applyRange}
                className="h-10 rounded-md border border-[var(--accent)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)]"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Link href={clearHref} className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
              Clear
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
