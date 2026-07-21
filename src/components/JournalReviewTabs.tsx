"use client";

import PeriodTabs from "@/components/PeriodTabs";

export type JournalDataScope = "day" | "week" | "month";
export type JournalDataView =
  | "pnl"
  | "trades"
  | "process"
  | "edge"
  | "alignment"
  | "horizon"
  | "risk"
  | "coach";

export const JOURNAL_SCOPE_VIEWS: Record<
  JournalDataScope,
  { key: JournalDataView; label: string }[]
> = {
  day: [
    { key: "pnl", label: "P&L" },
    { key: "trades", label: "Trades" },
    { key: "process", label: "Process" },
    { key: "coach", label: "Coach" },
  ],
  week: [
    { key: "pnl", label: "P&L" },
    { key: "edge", label: "Edge" },
    { key: "alignment", label: "Alignment" },
    { key: "coach", label: "Coach" },
  ],
  month: [
    { key: "pnl", label: "P&L" },
    { key: "horizon", label: "Horizon" },
    { key: "risk", label: "Risk" },
    { key: "coach", label: "Coach" },
  ],
};

export default function JournalReviewTabs({
  scope,
  view,
  onScopeChange,
  onViewChange,
}: {
  scope: JournalDataScope;
  view: JournalDataView;
  onScopeChange: (scope: JournalDataScope) => void;
  onViewChange: (view: JournalDataView) => void;
}) {
  const views = JOURNAL_SCOPE_VIEWS[scope];

  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--hairline)]">
      <PeriodTabs
        ariaLabel="Journal time range"
        items={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value={scope}
        onChange={(nextScope) => onScopeChange(nextScope as JournalDataScope)}
      />

      <div
        role="tablist"
        aria-label={`${scope} data view`}
        className="flex min-w-0 gap-1 overflow-x-auto pb-2.5"
      >
        {views.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={view === item.key}
            onClick={() => onViewChange(item.key)}
            className={`min-h-8 cursor-pointer whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
              view === item.key
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
