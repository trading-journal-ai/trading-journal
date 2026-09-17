import Link from "next/link";

const tabs = [
  { href: "/analytics", label: "Performance", value: "performance" },
  { href: "/analytics/momentum-archive", label: "Top Gainers", value: "momentum" },
] as const;

export default function AnalyticsSectionTabs({
  active,
  className = "mb-8",
  compact = false,
}: {
  active: "momentum" | "performance";
  className?: string;
  compact?: boolean;
}) {
  return (
    <nav aria-label="Analytics sections" className={`${className} ${compact ? "" : "border-b border-[var(--hairline)]"}`}>
      <div className="flex gap-6 whitespace-nowrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active === tab.value ? "page" : undefined}
            className={`${compact ? "" : "-mb-px border-b-2"} py-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              active === tab.value
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
