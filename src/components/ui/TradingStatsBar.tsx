import type { ReactNode } from "react";

export type TradingStatMetric = {
  label: string;
  value: ReactNode;
  tone?: "default" | "positive" | "negative" | "muted";
  description?: string;
};

const toneClass = {
  default: "text-[var(--foreground)]",
  positive: "text-[var(--green)]",
  negative: "text-[var(--red)]",
  muted: "text-[var(--muted)]",
} as const;

/** Shared, left-aligned summary for Journal periods and the Calendar. */
export default function TradingStatsBar({
  ariaLabel,
  metrics,
  size = "compact",
  className = "",
}: {
  ariaLabel: string;
  metrics: readonly TradingStatMetric[];
  size?: "compact" | "regular";
  className?: string;
}) {
  return (
    <dl aria-label={ariaLabel} className={`flex flex-wrap items-start gap-x-7 gap-y-3 text-left font-sans sm:gap-x-9 ${className}`}>
      {metrics.map((metric) => (
        <div key={metric.label} title={metric.description}>
          <dt className="whitespace-nowrap text-xs leading-5 text-[var(--muted)]">{metric.label}</dt>
          <dd className={`whitespace-nowrap font-semibold tabular-nums ${size === "compact" ? "text-lg leading-6" : "text-[22px] leading-7"} ${toneClass[metric.tone ?? "default"]}`}>
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
