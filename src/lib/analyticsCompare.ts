import { priceBands, reviewSessions, sizeBands, type PnlBasis, type ReviewTrade } from "./analyticsReview";
import { MARKET_TZ, timeZoneParts } from "./time";
import { validArchiveDate } from "./momentumArchiveDates";

export const sessionWindows = ["Premarket", "Opening 30 min", "10 AM–noon", "Noon–4 PM", "After hours"];
export function entryWindow(row: ReviewTrade) {
  const p = timeZoneParts(row.entryAt * 1000, MARKET_TZ), minute = p.hour * 60 + p.minute;
  return sessionWindows[minute < 570 ? 0 : minute < 600 ? 1 : minute < 720 ? 2 : minute < 960 ? 3 : 4];
}
export type Cohort = {
  from: string; to: string; symbol: string; setup: string; tags: string; tagMode: "any" | "all";
  outcome: "all" | "win" | "loss" | "scratch";
  session: "all" | "win" | "loss" | "scratch";
  price: string; size: string; window: string; duration: "all" | "intraday" | "multiday";
};
export const emptyCohort: Cohort = { from: "", to: "", symbol: "", setup: "", tags: "", tagMode: "all", outcome: "all", session: "all", price: "all", size: "all", window: "", duration: "all" };
export function parseCohort(value: string | null, fallback: Cohort): Cohort {
  if (!value || value.length > 4000) return fallback;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fallback;
    const source = parsed as Record<string, unknown>, result = { ...fallback };
    for (const key of Object.keys(emptyCohort) as (keyof Cohort)[]) {
      const candidate = source[key];
      if (typeof candidate !== "string" || candidate.length > 200) continue;
      const options: Partial<Record<keyof Cohort, string[]>> = {
        outcome: ["all", "win", "loss", "scratch"], session: ["all", "win", "loss", "scratch"],
        tagMode: ["any", "all"], duration: ["all", "intraday", "multiday"],
        price: priceBands.map(b => b.id), size: ["all", ...sizeBands.map(b => b.id)], window: ["", ...sessionWindows],
      };
      if (options[key] && !options[key]!.includes(candidate)) continue;
      if ((key === "from" || key === "to") && candidate && !validArchiveDate(candidate)) continue;
      Object.assign(result, { [key]: candidate });
    }
    return result;
  } catch { return fallback; }
}
const matchesResult = (value: number, outcome: Cohort["outcome"]) => outcome === "all" || (outcome === "win" ? value > 0 : outcome === "loss" ? value < 0 : value === 0);
export function cohortTrades(rows: ReviewTrade[], cohort: Cohort, basis: PnlBasis) {
  // Classify sessions BEFORE each group's symbol/setup/outcome filters.
  const dayResults = new Map(reviewSessions(rows, basis).map(s => [s.date, s.pnl]));
  const price = priceBands.find(b => b.id === cohort.price) ?? priceBands[0];
  const size = sizeBands.find(b => b.id === cohort.size);
  const tags = cohort.tags.split(",").map(tag => tag.trim()).filter(Boolean);
  return rows.filter(row => (!cohort.from || row.date >= cohort.from) && (!cohort.to || row.date <= cohort.to)
    && (!cohort.symbol || row.symbol === cohort.symbol.trim().toUpperCase())
    && (!cohort.setup || row.setup === cohort.setup)
    && (!tags.length || (cohort.tagMode === "all" ? tags.every(tag => row.tags.includes(tag)) : tags.some(tag => row.tags.includes(tag))))
    && matchesResult(row[basis], cohort.outcome) && matchesResult(dayResults.get(row.date) ?? 0, cohort.session)
    && row.price >= price.min && row.price < price.max
    && (!size || (row.peakShares != null && row.peakShares >= size.min && row.peakShares < size.max))
    && (!cohort.window || entryWindow(row) === cohort.window)
    && (cohort.duration === "all" || (row.entryDate === row.date) === (cohort.duration === "intraday")));
}
export function previousPeriod(range: { from: string; to: string }) {
  const start = Date.parse(`${range.from}T12:00:00Z`), end = Date.parse(`${range.to}T12:00:00Z`);
  const days = (end - start) / 86400000 + 1;
  return { from: new Date(start - days * 86400000).toISOString().slice(0,10), to: new Date(start - 86400000).toISOString().slice(0,10) };
}
export type Breakdown = "symbol" | "setup" | "price" | "size" | "window" | "duration";
export function breakdownKey(row: ReviewTrade, dimension: Breakdown) {
  if (dimension === "symbol" || dimension === "setup") return row[dimension];
  if (dimension === "window") return entryWindow(row);
  if (dimension === "duration") return row.entryDate === row.date ? "Intraday" : "Multiday";
  if (dimension === "price") return priceBands.slice(1).find(b => row.price >= b.min && row.price < b.max)?.label ?? "Unknown";
  return row.peakShares == null ? "Split · size unavailable" : sizeBands.find(b => row.peakShares! >= b.min && row.peakShares! < b.max)!.label;
}
