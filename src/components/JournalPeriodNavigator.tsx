import Link from "next/link";
import type { ReactNode } from "react";

import type { JournalDataScope } from "@/components/JournalReviewTabs";
import PeriodTabs from "@/components/ui/PeriodTabs";

type JournalPeriodNavigatorProps = {
  scope: JournalDataScope;
  periodLabel: string;
  todayHref: string;
  previousHref: string;
  nextHref: string;
  calendarHref: string;
  scopeHrefs: Record<JournalDataScope, string>;
};

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-[6px] bg-[var(--surface-2)] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {children}
    </Link>
  );
}

export default function JournalPeriodNavigator({
  scope,
  periodLabel,
  todayHref,
  previousHref,
  nextHref,
  calendarHref,
  scopeHrefs,
}: JournalPeriodNavigatorProps) {
  const scopeLabel = scope === "day" ? "day" : scope;

  return (
    <nav aria-label="Journal period" className="border-b border-[var(--hairline)]">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={todayHref}
            className="mr-1 flex min-h-9 items-center rounded-[6px] bg-[var(--surface-2)] px-3.5 text-[12.5px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--hairline)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Today
          </Link>
          <PeriodTabs
            ariaLabel="Journal time range"
            value={scope}
            items={[
              { value: "day", label: "Day", href: scopeHrefs.day },
              { value: "week", label: "Week", href: scopeHrefs.week },
              { value: "month", label: "Month", href: scopeHrefs.month },
            ]}
          />
        </div>

        <div className="flex min-w-0 items-center gap-2 pb-1">
          <IconLink href={previousHref} label={`Previous ${scopeLabel}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m14.5 6-6 6 6 6" />
            </svg>
          </IconLink>
          <span className="min-w-0 px-1 text-center text-[12px] font-semibold text-[var(--foreground)] sm:min-w-48">
            {periodLabel}
          </span>
          <IconLink href={nextHref} label={`Next ${scopeLabel}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m9.5 6 6 6-6 6" />
            </svg>
          </IconLink>
          <IconLink href={calendarHref} label="Open month calendar">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M7 3v4M17 3v4M4.5 9h15M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
            </svg>
          </IconLink>
        </div>
      </div>
    </nav>
  );
}
