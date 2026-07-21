import { describe, expect, it } from "vitest";
import {
  buildRetrospectiveContext,
  opportunitySetLabel,
  weekdaysBetween,
} from "./backfill-market-context.mjs";

describe("market-context backfill", () => {
  it("classifies the opportunity-set breadth plainly", () => {
    expect(opportunitySetLabel(0)).toBe("none");
    expect(opportunitySetLabel(1)).toBe("one-stock");
    expect(opportunitySetLabel(3)).toBe("selective");
    expect(opportunitySetLabel(4)).toBe("active");
  });

  it("skips weekends when building provider dates", () => {
    expect(weekdaysBetween("2026-07-17", "2026-07-21")).toEqual([
      "2026-07-17",
      "2026-07-20",
      "2026-07-21",
    ]);
  });

  it("counts price-qualified movers from previous close to daily high", () => {
    const previousRows = [
      { T: "AAA", c: 2 },
      { T: "BBB", c: 5 },
      { T: "CCC", c: 10 },
      { T: "TOO_HIGH", c: 25 },
    ];
    const rows = [
      { T: "AAA", o: 2.2, h: 6.2, l: 2, c: 5, v: 1_000_000, vw: 4 },
      { T: "BBB", o: 5.1, h: 8, l: 5, c: 7, v: 500_000, vw: 6.5 },
      { T: "CCC", o: 10, h: 11.5, l: 9.8, c: 10.5, v: 250_000, vw: 10.6 },
      { T: "TOO_HIGH", o: 25, h: 60, l: 24, c: 50, v: 1_000_000, vw: 40 },
      { T: "NO_PRIOR", o: 3, h: 9, l: 2.5, c: 8, v: 1_000_000, vw: 6 },
    ];

    const context = buildRetrospectiveContext({
      date: "2026-07-20",
      rows,
      previousRows,
      previousSessionDate: "2026-07-17",
      moveMinPct: 10,
    });

    expect(context.leadership).toEqual({
      state: "one-stock",
      basis: "count-at-or-above-100pct",
    });
    expect(context.counts).toMatchObject({ rawMovers: 3, over50Pct: 2, over100Pct: 1, over200Pct: 1 });
    expect(context.strongestMover).toMatchObject({ symbol: "AAA", maximumMovePct: 210 });
    expect(context.candidates.map((candidate) => candidate.symbol)).toEqual(["AAA", "BBB", "CCC"]);
    expect(context.coverage).toMatchObject({ eligibleSymbols: 4, matchedPreviousClose: 3 });
  });
});
