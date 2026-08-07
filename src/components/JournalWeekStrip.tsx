"use client";

import Link from "next/link";

import { useJournalDateNavigation } from "@/components/JournalDateNavigation";
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
  days: JournalWeekStripDay[];
  basePath: string;
};

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function dayHref(basePath: string, date: string): string {
  return `${basePath}?date=${date}`;
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
  days,
  basePath,
}: JournalWeekStripProps) {
  const { pendingDate, selectedDate, setPendingDate } = useJournalDateNavigation();

  return (
    <nav
      aria-label="Journal sessions"
      className={pendingDate ? "journal-week-strip--navigating" : undefined}
    >
      <div className="overflow-x-auto rounded-[4px] border border-[var(--hairline)] [scrollbar-width:thin]">
        <div className="grid min-w-[900px] grid-cols-5">
          {days.map((day) => {
            const selected = day.date === selectedDate;
            const visuallySelected = pendingDate ? day.date === pendingDate : selected;
            const date = utcDate(day.date);
            return (
              <Link
                key={day.date}
                href={dayHref(basePath, day.date)}
                aria-current={selected ? "date" : undefined}
                onPointerDown={(event) => {
                  if (event.button === 0) setPendingDate(day.date);
                }}
                onClick={(event) => {
                  // Pointer activation is handled on pointer-down for immediate
                  // feedback. A zero-detail click covers keyboard/programmatic use
                  // without replaying the pending state after navigation resolves.
                  if (event.detail === 0) setPendingDate(day.date);
                }}
                className={`journal-week-day relative flex flex-col border-r border-[var(--hairline)] px-3.5 py-4 font-sans last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)] ${
                  visuallySelected ? "journal-week-day--selected z-[1]" : ""
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
