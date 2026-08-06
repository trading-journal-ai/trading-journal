"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type JournalDateNavigationValue = {
  pendingDate: string | null;
  selectedDate: string;
  setPendingDate: (date: string) => void;
  visualDate: string;
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
    setPendingSelection({ date, from: selectedDate });
  }, [selectedDate]);
  const visualDate = pendingDate ?? selectedDate;
  const value = useMemo(() => ({
    pendingDate,
    selectedDate,
    setPendingDate,
    visualDate,
  }), [pendingDate, selectedDate, setPendingDate, visualDate]);

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

export function JournalDateHeading({
  className,
  level,
}: {
  className: string;
  level: 1 | 2;
}) {
  const { visualDate } = useJournalDateNavigation();
  const date = utcDate(visualDate);
  const content = `${weekdayFmt.format(date)}, ${monthDayFmt.format(date)}`;

  return level === 1
    ? <h1 className={className}>{content}</h1>
    : <h2 className={className}>{content}</h2>;
}
