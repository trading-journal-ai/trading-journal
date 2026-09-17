import { describe, expect, it } from "vitest";
import { analyticsHistogram } from "./analyticsHistogram";
import type { ReviewTrade } from "./analyticsReview";
const rows = (values: number[]) => values.map((net, id) => ({ id, net, gross: net + 1 }) as ReviewTrade);

describe("P&L histogram", () => {
  it("counts every trade exactly once including zero, exact edges and the largest result", () => {
    const input = rows([-10, -2, -0.01, 0, 0.01, 2, 10]);
    const result = analyticsHistogram(input, "net");
    expect(result.width).toBe(2);
    expect(result.bins.flatMap(bin => bin.rows).map(row => row.id).sort()).toEqual(input.map(row => row.id));
    expect(result.bins.find(bin => bin.from === -2)?.rows.map(row => row.net)).toEqual([-2, -0.01]);
    expect(result.bins.find(bin => bin.from === 0)?.rows.map(row => row.net)).toEqual([0, 0.01]);
    expect(result.bins.at(-1)?.rows.map(row => row.net)).toEqual([10]);
    expect(result.bins.every(bin => bin.to - bin.from === result.width)).toBe(true);
  });
  it("handles empty, all-zero, single-sided and cent-sized samples without dropping outliers", () => {
    expect(analyticsHistogram([], "net").bins).toEqual([]);
    for (const values of [[0, 0], [4, 4], [-5, -5], [-0.01, 0, 0.01], [-10000, 0.01, 0.02]]) {
      const result = analyticsHistogram(rows(values), "net");
      expect(result.bins.flatMap(bin => bin.rows)).toHaveLength(values.length);
      expect(result.bins.length).toBeLessThanOrEqual(12);
      expect(result.bins.some(bin => bin.from === 0)).toBe(true);
      expect(result.width).toBeGreaterThan(0);
    }
  });
  it("uses the selected P&L basis when fees change a trade's outcome", () => {
    const input = rows([-0.5]);
    expect(analyticsHistogram(input, "net").bins.find(bin => bin.rows.length)?.to).toBeLessThanOrEqual(0);
    expect(analyticsHistogram(input, "gross").bins.find(bin => bin.rows.length)?.from).toBeGreaterThanOrEqual(0);
  });
});
