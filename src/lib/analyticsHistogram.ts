import type { PnlBasis, ReviewTrade } from "./analyticsReview";

/** Equal dollar-width bins with zero as an edge. Integer cents avoid boundary drift. */
export function analyticsHistogram(rows: ReviewTrade[], basis: PnlBasis) {
  if (!rows.length) return { width: 0, bins: [] };
  const cents = rows.map(row => Math.round(row[basis] * 100));
  const low = Math.min(0, ...cents), high = Math.max(0, ...cents);
  const target = Math.max(1, (high - low) / 10);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const width = [1, 2, 5, 10].map(step => step * magnitude).find(step => step >= target)!;
  const start = Math.min(-width, Math.floor(low / width) * width);
  // Include a nonnegative bin even when all results are losses or breakeven.
  const end = Math.max(width, Math.ceil(high / width) * width);
  const bins = Array.from({ length: Math.round((end - start) / width) }, (_, index) => ({
    key: `pnl:${start + index * width}:${width}`,
    from: (start + index * width) / 100,
    to: (start + (index + 1) * width) / 100,
    rows: [] as ReviewTrade[],
  }));
  rows.forEach((row, index) => {
    const bin = Math.min(bins.length - 1, Math.floor((cents[index] - start) / width));
    bins[bin].rows.push(row);
  });
  return { width: width / 100, bins };
}
