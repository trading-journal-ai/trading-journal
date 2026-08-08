"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type JournalScope = "day" | "week" | "month";

type JournalDateNavigationValue = {
  pendingDate: string | null;
  selectedDate: string;
  setPendingDate: (date: string) => void;
  visualDate: string;
  /**
   * Which period the review module is showing. It lives here rather than in the
   * module because the header lockup renders above the module and has to label
   * itself for the active scope.
   */
  scope: JournalScope;
  setScope: (scope: JournalScope) => void;
};

const JournalDateNavigationContext = createContext<JournalDateNavigationValue | null>(null);

const weekdayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
});

const monthYearFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

function utcDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

export function JournalDateNavigationProvider({
  children,
  className,
  selectedDate,
}: {
  children: ReactNode;
  className?: string;
  selectedDate: string;
}) {
  const [pendingSelection, setPendingSelection] = useState<{ date: string; from: string } | null>(null);
  const pendingDate = pendingSelection?.from === selectedDate ? pendingSelection.date : null;
  const setPendingDate = useCallback((date: string) => {
    if (date === selectedDate) return;
    setPendingSelection({ date, from: selectedDate });
  }, [selectedDate]);
  const visualDate = pendingDate ?? selectedDate;
  const [scope, setScope] = useState<JournalScope>("day");
  const value = useMemo(() => ({
    pendingDate,
    selectedDate,
    setPendingDate,
    visualDate,
    scope,
    setScope,
  }), [pendingDate, selectedDate, setPendingDate, visualDate, scope]);

  return (
    <JournalDateNavigationContext.Provider value={value}>
      <div className={className}>{children}</div>
    </JournalDateNavigationContext.Provider>
  );
}

export function useJournalDateNavigation(): JournalDateNavigationValue {
  const context = useContext(JournalDateNavigationContext);
  if (!context) throw new Error("Journal date navigation must be used inside its provider.");
  return context;
}

/**
 * Null outside a provider. The review module is also rendered on mock and
 * preview pages that have no navigation around it, so it falls back to its own
 * scope state rather than throwing.
 */
export function useOptionalJournalDateNavigation(): JournalDateNavigationValue | null {
  return useContext(JournalDateNavigationContext);
}

/** Scope-aware label for the header lockup. */
export function scopeDateLabel(scope: JournalScope, date: string, weekRange: string): string {
  const d = utcDate(date);
  if (scope === "week") return weekRange;
  if (scope === "month") return monthYearFmt.format(d);
  return `${weekdayFmt.format(d)}, ${monthDayFmt.format(d)}`;
}

export function JournalDateHeading({
  className,
  level,
}: {
  className: string;
  level: 1 | 2;
}) {
  const { visualDate } = useJournalDateNavigation();
  const [displayedDate, setDisplayedDate] = useState(visualDate);
  const [hasTransitioned, setHasTransitioned] = useState(false);
  const isChangingDate = visualDate !== displayedDate;

  useEffect(() => {
    if (!isChangingDate) return;

    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 80;
    const swapTimer = window.setTimeout(() => {
      setHasTransitioned(true);
      setDisplayedDate(visualDate);
    }, delay);

    return () => window.clearTimeout(swapTimer);
  }, [isChangingDate, visualDate]);

  const date = utcDate(displayedDate);
  const content = `${weekdayFmt.format(date)}, ${monthDayFmt.format(date)}`;
  const contentNode = (
    <span
      key={displayedDate}
      className={`journal-date-heading-fade${
        isChangingDate
          ? " journal-date-heading-fade--out"
          : hasTransitioned
            ? " journal-date-heading-fade--in"
            : ""
      }`}
    >
      {content}
    </span>
  );

  return level === 1
    ? <h1 className={className}>{contentNode}</h1>
    : <h2 className={className}>{contentNode}</h2>;
}
