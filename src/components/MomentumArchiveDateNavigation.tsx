"use client";

import Link from "next/link";
import MomentumArchiveRangePicker from "./MomentumArchiveRangePicker";

const buttonClass = "inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const borderedClass = `${buttonClass} border border-[var(--border)] text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--foreground)]`;

export default function MomentumArchiveDateNavigation({ from, to, today, href }: {
  from: string;
  to: string;
  today: string;
  href: { current: string; previous?: string; next?: string };
}) {
  return (
    <nav aria-label="Archive date navigation" className="flex max-w-full flex-wrap items-center gap-2">
      {href.previous ? <Link href={href.previous} className={borderedClass}>Previous</Link> : null}
      {href.next ? <Link href={href.next} className={borderedClass}>Next</Link> : null}
      <MomentumArchiveRangePicker from={from} to={to} today={today} href={href.current} className={borderedClass} />
    </nav>
  );
}
