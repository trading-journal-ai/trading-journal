type SegmentedOption = { label: string; value: string };

type SegmentedControlProps = {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

/**
 * One segmented control for all peer-view choices (Today / Week / Month, etc.).
 * Replaces the three ad-hoc filters (PeriodTabs, CalendarRangeFilter,
 * ReportRangeFilter). One outer border; active segment uses --surface-2 +
 * foreground; inactive muted; modest radius. See DESIGN_SYSTEM.md.
 */
export default function SegmentedControl({ options, value, onChange, className = "", ...aria }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      aria-label={aria["aria-label"]}
      className={`inline-flex h-10 items-center rounded-md border p-1 ${className}`}
      style={{ borderColor: "var(--border)" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className="h-8 rounded px-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
            style={active ? { background: "var(--surface-2)", color: "var(--foreground)" } : { color: "var(--muted)" }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
