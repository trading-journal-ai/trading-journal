type MoneyProps = {
  /** Signed dollar amount. */
  value: number;
  className?: string;
  fontFamily?: "mono" | "sans";
};

/**
 * P&L figure: tabular, colored by sign (green/red/neutral), signed, no wrap.
 * Mono remains the default; compact editorial surfaces can opt into Geist Sans.
 * See DESIGN_SYSTEM.md.
 */
export default function Money({ value, className = "", fontFamily = "mono" }: MoneyProps) {
  const color = value > 0 ? "var(--green)" : value < 0 ? "var(--red)" : "var(--muted)";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const text = `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <span
      className={`tabular-nums ${className}`}
      style={{ color, whiteSpace: "nowrap", fontFamily: `var(--font-${fontFamily})` }}
    >
      {text}
    </span>
  );
}
