type MoneyProps = {
  /** Signed dollar amount. */
  value: number;
  className?: string;
};

/**
 * P&L figure: mono, tabular, colored by sign (green/red/neutral), signed, no
 * wrap. The one place a saturated color lands on a number. See DESIGN_SYSTEM.md.
 */
export default function Money({ value, className = "" }: MoneyProps) {
  const color = value > 0 ? "var(--green)" : value < 0 ? "var(--red)" : "var(--muted)";
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const text = `${sign}$${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return (
    <span
      className={`tabular-nums ${className}`}
      style={{ color, whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}
    >
      {text}
    </span>
  );
}
