import type { ReactNode } from "react";

type StatBlockProps = {
  label: string;
  /** The value — plain text, or a <Money /> for P&L. */
  children: ReactNode;
  className?: string;
};

/**
 * Stacked label over mono value. The default for dashboard summary metrics and
 * small metric groups (not the pattern for detailed Reports stats). See
 * DESIGN_SYSTEM.md.
 */
export default function StatBlock({ label, children, className = "" }: StatBlockProps) {
  return (
    <div className={className}>
      <p className="text-[12.5px] font-medium text-[var(--muted)]" style={{ fontFamily: "var(--font-sans)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-[20px] font-semibold leading-[1.2] tabular-nums text-[var(--foreground)]"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {children}
      </p>
    </div>
  );
}
