"use client";

import { useRouter } from "next/navigation";

export type ArchiveLinkOption = {
  href: string;
  label: string;
  value: string;
};

/**
 * A select that navigates. Used for session jumps and page size, both of which
 * are URL state on a server-rendered page.
 */
export default function MomentumArchiveLinkSelect({
  ariaLabel,
  className = "h-10 w-[196px]",
  options,
  value,
}: {
  ariaLabel: string;
  className?: string;
  options: ArchiveLinkOption[];
  value: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => {
        const option = options.find((candidate) => candidate.value === event.target.value);
        if (option) router.push(option.href);
      }}
      className={`${className} rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--body)] outline-none transition-colors focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
