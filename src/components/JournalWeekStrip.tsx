import type { ReactNode } from "react";
import Link from "next/link";

import Money from "@/components/ui/Money";

export type JournalWeekStripDay = {
  date: string;
  trades: number;
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
  state: "trades" | "no_trade" | "future" | "empty";
};

type JournalWeekStripProps = {
  selectedDate: string;
  weekStart: string;
  days: JournalWeekStripDay[];
  previousWeekHref: string;
  nextWeekHref: string;
  calendarHref: string;
  basePath: string;
};

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function addIsoDays(date: string, days: number): string {
  const next = utcDate(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function rangeLabel(weekStart: string): string {
  const start = utcDate(weekStart);
  const end = utcDate(addIsoDays(weekStart, 4));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  if (sameMonth && sameYear) {
    return `${monthFmt.format(start)} ${start.getUTCDate()}–${end.getUTCDate()} · ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${monthFmt.format(start)} ${start.getUTCDate()}–${monthFmt.format(end)} ${end.getUTCDate()} · ${end.getUTCFullYear()}`;
  }

  return `${monthFmt.format(start)} ${start.getUTCDate()}, ${start.getUTCFullYear()}–${monthFmt.format(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
}

function dayHref(basePath: string, date: string): string {
  return `${basePath}?date=${date}`;
}

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

function EmptyDayValue({ state }: { state: JournalWeekStripDay["state"] }) {
  const label = state === "no_trade" ? "No-trade" : state === "future" ? "Upcoming" : "No session";
  return (
    <span className="mt-4 flex min-h-12 items-center">
      <span className="text-[12px] leading-4 text-[var(--muted)]">{label}</span>
    </span>
  );
}

function MetricPill({
  trades,
  accuracy,
  profitFactor,
}: {
  trades: number;
  accuracy: number | null;
  profitFactor: number | null;
}) {
  return (
    <span
      className="journal-week-day__metrics mt-[6px] inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--surface-2)] px-[11px] py-1 font-sans text-[11px] font-normal leading-4 text-[var(--muted)] tabular-nums"
      aria-label={`${trades} ${trades === 1 ? "trade" : "trades"}${accuracy == null ? "" : `, ${accuracy}% win rate`}${profitFactor == null ? "" : `, ${profitFactor.toFixed(2)} profit factor`}`}
    >
      <span>{trades} {trades === 1 ? "Trade" : "Trades"}</span>
      {accuracy == null ? null : <span>{accuracy}% Win</span>}
      {profitFactor == null ? null : <span>{profitFactor.toFixed(2)} PF</span>}
    </span>
  );
}

export default function JournalWeekStrip({
  selectedDate,
  weekStart,
  days,
  previousWeekHref,
  nextWeekHref,
  calendarHref,
  basePath,
}: JournalWeekStripProps) {
  return (
    <nav aria-label="Journal week">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <p className="font-sans text-[11px] font-normal uppercase tracking-[0.16em] text-[var(--muted)]">
          {rangeLabel(weekStart)}
        </p>
        <div className="flex items-center gap-2">
          <IconLink href={previousWeekHref} label="Previous week">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m14.5 6-6 6 6 6" />
            </svg>
          </IconLink>
          <IconLink href={nextWeekHref} label="Next week">
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

      <div className="overflow-x-auto rounded-[4px] border border-[var(--hairline)] [scrollbar-width:thin]">
        <div className="grid min-w-[900px] grid-cols-5">
          {days.map((day) => {
            const selected = day.date === selectedDate;
            const date = utcDate(day.date);
            return (
              <Link
                key={day.date}
                href={dayHref(basePath, day.date)}
                aria-current={selected ? "date" : undefined}
                className={`journal-week-day relative flex flex-col border-r border-[var(--hairline)] px-3.5 py-4 font-sans last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] ${
                  selected ? "journal-week-day--selected z-[1]" : ""
                }`}
              >
                <span className="flex items-baseline gap-1.5 text-[16px] font-semibold leading-5 text-[var(--foreground)]">
                  {weekdayFmt.format(date)}
                  <span>{date.getUTCDate()}</span>
                </span>
                {day.state === "trades" ? (
                  <span className="mt-4 flex flex-col items-start">
                    <Money value={day.pnl} fontFamily="sans" className="text-[14px] font-semibold leading-5" />
                    <MetricPill
                      trades={day.trades}
                      accuracy={day.accuracy}
                      profitFactor={day.profitFactor}
                    />
                  </span>
                ) : (
                  <EmptyDayValue state={day.state} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
