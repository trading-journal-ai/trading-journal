type DotTone = "positive" | "negative" | "neutral";

type DotProps = {
  tone?: DotTone;
  className?: string;
};

const DOT_COLOR: Record<DotTone, string> = {
  positive: "var(--green)",
  negative: "var(--red)",
  neutral: "var(--muted)",
};

/**
 * Small valence circle. Use sparingly — never on the calendar. Pair with a
 * label; do not rely on color alone. See DESIGN_SYSTEM.md.
 */
export default function Dot({ tone = "positive", className = "" }: DotProps) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${className}`}
      style={{ background: DOT_COLOR[tone] }}
      aria-hidden="true"
    />
  );
}
