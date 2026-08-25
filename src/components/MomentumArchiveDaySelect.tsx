"use client";

import { useRouter } from "next/navigation";

export type MomentumArchiveDayOption = {
  href: string;
  label: string;
  value: string;
};

export default function MomentumArchiveDaySelect({
  options,
  value,
}: {
  options: MomentumArchiveDayOption[];
  value: string;
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Jump to session"
      value={value}
      onChange={(event) => {
        const option = options.find((candidate) => candidate.value === event.target.value);
        if (option) router.push(option.href);
      }}
      className="h-10 w-[196px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] text-[var(--body)] outline-none transition-colors focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/25"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
