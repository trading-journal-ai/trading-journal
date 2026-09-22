"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { archiveDateHref } from "@/lib/momentumArchiveDates";
import { etDateString } from "@/lib/time";
import MomentumArchiveRangePicker from "./MomentumArchiveRangePicker";

const buttonClass = "inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const borderedClass = `${buttonClass} border border-[var(--border)] text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--foreground)]`;

export default function MomentumArchiveDateNavigation({ from, to, today, href }: {
  from: string;
  to: string;
  today: string;
  href: { current: string; previous?: string; next?: string };
}) {
  const router = useRouter();
  return (
    <nav aria-label="Archive date navigation" className="flex max-w-full flex-wrap items-center gap-2">
      <Link
        href={archiveDateHref(href.current, today, "day")}
        className={borderedClass}
        onNavigate={(event) => {
          event.preventDefault();
          // Resolve on activation so pages left open overnight still go to today.
          router.push(archiveDateHref(href.current, etDateString(Date.now() / 1000), "day"));
        }}
      >Today</Link>
      {href.previous ? <Link href={href.previous} className={borderedClass}>Previous</Link> : null}
      {href.next ? <Link href={href.next} className={borderedClass}>Next</Link> : null}
      <MomentumArchiveRangePicker from={from} to={to} today={today} href={href.current} className={borderedClass} />
    </nav>
  );
}
