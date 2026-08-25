import Link from "next/link";

const tabs = [
  { href: "/analytics", label: "Performance", value: "performance" },
  { href: "/analytics/momentum-archive", label: "Momentum Archive", value: "momentum" },
] as const;

export default function AnalyticsSectionTabs({ active }: { active: "momentum" | "performance" }) {
  return (
    <nav aria-label="Analytics sections" className="mb-8 border-b border-[var(--hairline)]">
      <div className="flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={active === tab.value ? "page" : undefined}
            className={`-mb-px border-b-2 py-3 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
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
