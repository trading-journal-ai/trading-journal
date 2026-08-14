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
import {
  journalPeriodLabel,
  type JournalPeriodScope,
} from "@/lib/journalPeriodLabel";

export type JournalScope = JournalPeriodScope;

type JournalDateNavigationValue = {
  pendingDate: string | null;
  selectedDate: string;
  setPendingDate: (date: string) => void;
  visualDate: string;
  scope: JournalScope;
  setScope: (scope: JournalScope) => void;
};

const JournalDateNavigationContext = createContext<JournalDateNavigationValue | null>(null);

export function JournalDateNavigationProvider({
  children,
  className,
  initialScope = "day",
  selectedDate,
  syncScopeToUrl = false,
}: {
  children: ReactNode;
  className?: string;
  initialScope?: JournalScope;
  selectedDate: string;
  syncScopeToUrl?: boolean;
}) {
  const [pendingSelection, setPendingSelection] = useState<{ date: string; from: string } | null>(null);
  const pendingDate = pendingSelection?.from === selectedDate ? pendingSelection.date : null;
  const setPendingDate = useCallback((date: string) => {
    if (date === selectedDate) return;
    setPendingSelection({ date, from: selectedDate });
  }, [selectedDate]);
  const visualDate = pendingDate ?? selectedDate;
  const [scope, setScopeState] = useState<JournalScope>(initialScope);
  const setScope = useCallback((nextScope: JournalScope) => {
    setScopeState(nextScope);
    if (!syncScopeToUrl) return;

    const url = new URL(window.location.href);
    if (nextScope === "day") url.searchParams.delete("scope");
    else url.searchParams.set("scope", nextScope);
    window.history.replaceState(window.history.state, "", url);
  }, [syncScopeToUrl]);
  const value = useMemo(() => ({
    pendingDate,
    selectedDate,
    setPendingDate,
    visualDate,
    scope,
    setScope,
  }), [pendingDate, selectedDate, setPendingDate, visualDate, scope, setScope]);

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

export function useOptionalJournalDateNavigation(): JournalDateNavigationValue | null {
  return useContext(JournalDateNavigationContext);
}

export function JournalDateHeading({
  className,
  level,
}: {
  className: string;
  level: 1 | 2;
}) {
  const { scope, visualDate } = useJournalDateNavigation();
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

  const content = journalPeriodLabel(scope, displayedDate);
  const contentNode = (
    <span
      key={`${scope}-${displayedDate}`}
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
