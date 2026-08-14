"use client";

import Link from "next/link";

import {
  JournalDateHeading,
  useJournalDateNavigation,
} from "@/components/JournalDateNavigation";
import type { JournalPeriodNavigation } from "@/lib/journalPeriodNavigation";
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

type JournalDayNavigationProps = {
  days: JournalWeekStripDay[];
  basePath: string;
  periodNavigation: JournalPeriodNavigation;
  calendarHref: string;
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

function compactPnl(value: number): string {
  return `$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pnlClass(value: number): string {
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function NavigationLink({
  children,
  href,
  quiet = false,
  targetDate,
}: {
  children: string;
  href: string;
  quiet?: boolean;
  targetDate?: string;
}) {
  const { setPendingDate } = useJournalDateNavigation();

  return (
    <Link
      href={href}
      onPointerDown={(event) => {
        if (event.button === 0 && targetDate) setPendingDate(targetDate);
      }}
      onClick={(event) => {
        if (event.detail === 0 && targetDate) setPendingDate(targetDate);
      }}
      className={`inline-flex h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
        quiet
          ? "text-[var(--muted)] hover:text-[var(--foreground)]"
          : "border border-[var(--border)] text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </Link>
  );
}

export function JournalDayNavigation({
  days,
  basePath,
  periodNavigation,
  calendarHref,
}: JournalDayNavigationProps) {
  const { pendingDate, scope, selectedDate, setPendingDate } = useJournalDateNavigation();
  const navigation = periodNavigation[scope];

  return (
    <section
      aria-label="Journal day navigation"
      className={pendingDate ? "journal-week-strip--navigating" : undefined}
    >
      <nav aria-label="Trading week" className="mb-9 overflow-x-auto [scrollbar-width:thin]">
        <div className="flex w-max min-w-full items-start gap-6">
          {days.map((day) => {
            const selected = day.date === selectedDate;
            const visuallySelected = pendingDate ? day.date === pendingDate : selected;
            const date = utcDate(day.date);
            const hasTrades = day.state === "trades";
            const labelTone = visuallySelected
              ? "font-semibold text-[var(--foreground)]"
              : hasTrades
                ? "font-medium text-[var(--muted)]"
                : "font-medium text-[var(--faint)]";
            const signedPnl = `${day.pnl > 0 ? "+" : day.pnl < 0 ? "−" : ""}${compactPnl(day.pnl)}`;

            return (
              <Link
                key={day.date}
                href={dayHref(basePath, day.date)}
                aria-current={selected ? "date" : undefined}
                aria-label={`${weekdayFmt.format(date)} ${date.getUTCDate()}${hasTrades ? `, ${signedPnl}` : ""}`}
                onPointerDown={(event) => {
                  if (event.button === 0) setPendingDate(day.date);
                }}
                onClick={(event) => {
                  if (event.detail === 0) setPendingDate(day.date);
                }}
                className="grid min-h-12 min-w-16 content-start justify-items-start gap-0.5 rounded-sm py-1 font-sans transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span className={`text-xs leading-4 ${labelTone}`}>
                  {weekdayFmt.format(date).slice(0, 3)} {date.getUTCDate()}
                </span>
                {hasTrades ? (
                  <span className={`whitespace-nowrap text-sm font-medium leading-5 tabular-nums ${pnlClass(day.pnl)}`}>
                    {compactPnl(day.pnl)}
                  </span>
                ) : (
                  <span aria-hidden="true" className="text-sm leading-5">&nbsp;</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <JournalDateHeading
          level={1}
          className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]"
        />
        <nav aria-label="Journal date controls" className="flex max-w-full items-center gap-2 overflow-x-auto">
          <NavigationLink href={navigation.today.href} targetDate={navigation.today.date} quiet>
            Today
          </NavigationLink>
          <NavigationLink href={navigation.previous.href} targetDate={navigation.previous.date}>
            Previous
          </NavigationLink>
          <NavigationLink href={navigation.next.href} targetDate={navigation.next.date}>
            Next
          </NavigationLink>
          <NavigationLink href={calendarHref}>Calendar</NavigationLink>
        </nav>
      </div>
    </section>
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
  days,
  basePath,
}: JournalWeekStripProps) {
  const { pendingDate, selectedDate, setPendingDate } = useJournalDateNavigation();

  return (
    <nav
      aria-label="Week at a glance"
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
