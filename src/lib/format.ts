import { MARKET_TZ } from "./time";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: MARKET_TZ,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Format an epoch-seconds instant as a market-date string (e.g. "04 Mar 2026"). */
export function fmtDate(epochSeconds: number | null): string {
  if (epochSeconds == null) return "—";
  return dateFmt.format(new Date(epochSeconds * 1000));
}

/** Price with up to 4 decimals, trailing zeros trimmed. */
export function fmtPrice(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(4).replace(/\.?0+$/, "")}`;
}

/** Signed dollar amount, 2 decimals. */
export function fmtMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}
