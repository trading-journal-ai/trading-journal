/** Choose a readable 1/2/5 step from the whole curve, including its zero line. */
export function pnlPriceStep(values: number[], height: number): number {
  let low = 0;
  let high = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  const intervals = Math.max(2, Math.min(4, Math.floor(height / 64)));
  const raw = (high - low) / intervals;
  if (raw === 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiple = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10;
  return Math.max(0.01, multiple * magnitude);
}

export function formatPnlPriceTick(value: number, step: number): string {
  const decimals = Math.min(2, Math.max(0, -Math.floor(Math.log10(step))));
  const rounded = Number(value.toFixed(decimals));
  return `${rounded < 0 ? "−" : ""}$${Math.abs(rounded).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}`;
}

/** Explicit levels keep the chart grid and its labels on the same round dollars. */
export function pnlPriceTicks(values: number[], height: number): number[] {
  const finiteValues = values.filter(Number.isFinite);
  const step = pnlPriceStep(finiteValues, height);
  const low = Math.floor(Math.min(0, ...finiteValues) / step);
  const high = Math.max(low + 1, Math.ceil(Math.max(0, ...finiteValues) / step));
  return Array.from({ length: high - low + 1 }, (_, index) =>
    Number(((low + index) * step).toFixed(2)));
}
