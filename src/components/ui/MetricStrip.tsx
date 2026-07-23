import type { ReactNode } from "react";

type MetricStripProps = {
  /** Segments shown, dot-separated (e.g. "14 trades", "64%", "PF 2.1"). */
  items: ReactNode[];
  className?: string;
};

/**
 * Compact header metadata line — dot-separated, muted, tabular.
 *
 * The font treatment is **theme-controlled** via `--font-metric`: Geist Mono for
 * the cool themes (dark, light) — the ledger/terminal feel — and Geist Sans for
 * the warm editorial themes (daylight, evening). The component references the
 * token; each theme owns the look, so this stays inside the system rather than
 * hard-coding two treatments. See DESIGN_SYSTEM.md.
 */
export default function MetricStrip({ items, className = "" }: MetricStripProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--muted)] ${className}`}
      style={{ fontFamily: "var(--font-metric)", fontVariantNumeric: "tabular-nums" }}
    >
      {items.map((item, index) => (
        <span key={index} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true" className="text-[var(--faint)]">·</span> : null}
          {item}
        </span>
      ))}
    </div>
  );
}
