import type { ReactNode } from "react";

type ReviewHeaderMetric = {
  label: string;
  className?: string;
};

export default function ReviewHeader({
  title,
  date,
  pnl,
  metrics = [],
  action,
}: {
  title: ReactNode;
  date: string;
  pnl?: { value: number; formatted: string };
  metrics?: ReviewHeaderMetric[];
  action?: ReactNode;
}) {
  const pnlTone =
    pnl == null
      ? ""
      : pnl.value > 0
        ? "text-[var(--green)]"
        : pnl.value < 0
          ? "text-[var(--red)]"
          : "text-[var(--muted)]";

  return (
    <header>
      <div className="text-[15px] text-[var(--muted)]">{date}</div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h1>
        {pnl ? (
          <span className={`font-mono text-[15px] font-semibold tabular-nums ${pnlTone}`}>
            {pnl.formatted}
            {pnl.value !== 0 ? (
              <span className="ml-1 text-[10px]">{pnl.value > 0 ? "▲" : "▼"}</span>
            ) : null}
          </span>
        ) : null}
      </div>
      {metrics.length > 0 || action ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {metrics.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-full bg-[var(--surface-2)] px-4 py-1.5 text-[13px] text-[var(--muted)] tabular-nums">
              {metrics.map((metric, index) => (
                <span key={`${metric.label}-${index}`} className="inline-flex items-center gap-x-2.5">
                  {index > 0 ? (
                    <span aria-hidden="true" className="text-[var(--faint)]">·</span>
                  ) : null}
                  <span className={metric.className ?? ""}>{metric.label}</span>
                </span>
              ))}
            </span>
          ) : (
            <span />
          )}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
