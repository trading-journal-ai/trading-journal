"use client";

import Link from "next/link";

export type PeriodTabItem = {
  value: string;
  label: string;
  href?: string;
};

function tabClass(active: boolean) {
  return `-mb-px flex min-h-11 cursor-pointer items-center justify-center border-b-2 px-4 py-3 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
    active
      ? "border-[var(--foreground)] text-[var(--foreground)]"
      : "border-transparent text-[var(--muted)] hover:border-[var(--muted)] hover:text-[var(--foreground)]"
  }`;
}

export default function PeriodTabs({
  ariaLabel,
  items,
  value,
  onChange,
  className = "",
  idPrefix,
}: {
  ariaLabel: string;
  items: PeriodTabItem[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Connect local tabs to persistent panels and enable arrow-key navigation. */
  idPrefix?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex min-w-0 items-center gap-1 ${className}`.trim()}
    >
      {items.map((item) => {
        const active = item.value === value;
        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              role="tab"
              aria-selected={active}
              className={tabClass(active)}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            id={idPrefix ? `${idPrefix}-${item.value}-tab` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-${item.value}-panel` : undefined}
            tabIndex={idPrefix ? (active ? 0 : -1) : undefined}
            onKeyDown={idPrefix ? (event) => {
              const index = items.indexOf(item);
              const next = event.key === "ArrowRight" ? (index + 1) % items.length
                : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length
                  : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              onChange?.(items[next].value);
              document.getElementById(`${idPrefix}-${items[next].value}-tab`)?.focus();
            } : undefined}
            onClick={() => onChange?.(item.value)}
            className={tabClass(active)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
