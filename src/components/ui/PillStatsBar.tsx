import type { ReactNode } from "react";

export type PillStatMetric = {
  label: string;
  value: ReactNode;
  width?: number;
  tone?: "default" | "positive" | "negative" | "muted";
};

type PillStatsBarProps = {
  ariaLabel: string;
  metrics: readonly PillStatMetric[];
  className?: string;
};

const toneClass = {
  default: "text-[var(--foreground)]",
  positive: "text-[var(--green)]",
  negative: "text-[var(--red)]",
  muted: "text-[var(--muted)]",
} as const;

/**
 * Compact summary metrics with one shared label capsule and centered values.
 * Individual widths keep labels and figures aligned without forcing equal tracks.
 */
export default function PillStatsBar({ ariaLabel, metrics, className = "" }: PillStatsBarProps) {
  const gridTemplateColumns = metrics.map((metric) => `${metric.width ?? 74}px`).join(" ");

  return (
    <section aria-label={ariaLabel} className={`overflow-x-auto pb-1 ${className}`}>
      <dl
        className="relative grid w-max gap-x-10 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[22px] before:rounded-full before:bg-[var(--surface-2)] before:content-['']"
        style={{ gridTemplateColumns }}
      >
        {metrics.map((metric) => (
          <div key={metric.label} className="relative z-10 grid grid-rows-[22px_27px] gap-0.5 text-center">
            <dt className="flex items-center justify-center whitespace-nowrap text-[12.5px] font-medium leading-4 text-[var(--muted)]">
              {metric.label}
            </dt>
            <dd
              className={`whitespace-nowrap text-[22px] font-semibold leading-[1.2] tabular-nums ${toneClass[metric.tone ?? "default"]}`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
