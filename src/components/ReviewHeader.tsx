import type { ReactNode } from "react";

type ReviewHeaderMetric = {
  label: string;
  className?: string;
};

export default function ReviewHeader({
  eyebrow,
  title,
  date,
  metrics = [],
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  date: string;
  metrics?: ReviewHeaderMetric[];
  action?: ReactNode;
}) {
  const hasMeta = metrics.length > 0 || action;

  return (
    <header className="space-y-4">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
        {eyebrow}
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <h1 className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
              {title}
            </h1>
            <span className="font-mono text-base text-[var(--muted)]">{date}</span>
          </div>
        </div>
        {hasMeta ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[13px] font-medium text-[var(--muted)]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {metrics.map((metric, index) => (
                <span key={`${metric.label}-${index}`} className="flex items-center gap-x-3">
                  {index > 0 ? <span className="text-[var(--faint)]">·</span> : null}
                  <span className={`tabular-nums ${metric.className ?? ""}`}>{metric.label}</span>
                </span>
              ))}
            </div>
            {action ? <div className="ml-auto shrink-0">{action}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
