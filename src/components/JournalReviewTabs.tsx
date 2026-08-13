"use client";

import PeriodTabs from "@/components/ui/PeriodTabs";

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
    { key: "process", label: "Chart read" },
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
  showViews = true,
}: {
  scope: JournalDataScope;
  view: JournalDataView;
  onScopeChange: (scope: JournalDataScope) => void;
  onViewChange: (view: JournalDataView) => void;
  showViews?: boolean;
}) {
  const views = JOURNAL_SCOPE_VIEWS[scope];

  return (
    <div className="journal-review-tabs flex flex-wrap items-end justify-between gap-2 border-b border-[var(--hairline)]">
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

      {showViews ? (
        <div className="ml-auto max-w-full overflow-x-auto">
          <PeriodTabs
            ariaLabel={`${scope} data view`}
            items={views.map((item) => ({ value: item.key, label: item.label }))}
            value={view}
            onChange={(nextView) => onViewChange(nextView as JournalDataView)}
          />
        </div>
      ) : null}
    </div>
  );
}
