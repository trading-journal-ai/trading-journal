import { describe, expect, it } from "vitest";
import type { ReviewTrade } from "./analyticsReview";
import { buildWeeklyCoaching } from "./weeklyCoaching";

const weekStart = "2026-06-08";
const asOfDate = "2026-06-12";

function trade(overrides: Partial<ReviewTrade> & Pick<ReviewTrade, "id" | "date" | "net">): ReviewTrade {
  const gross = overrides.gross ?? overrides.net;
  return {
    symbol: `SYN${overrides.id}`,
    side: "long",
    entryAt: overrides.id * 100 + 1,
    exitAt: overrides.id * 100 + 61,
    entryDate: overrides.date,
    price: 4,
    gross,
    fees: overrides.fees ?? round(gross - overrides.net),
    unknownFees: 0,
    fills: 2,
    peakShares: 100,
    peakCapital: 400,
    openingShares: 100,
    initialShares: 100,
    holdMinutes: 10,
    adds: 0,
    reductions: 0,
    setup: "Synthetic",
    tags: [],
    attempt: 1,
    ...overrides,
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function build(rows: ReviewTrade[], activityTradeIds = rows.map((row) => row.id), date = asOfDate) {
  return buildWeeklyCoaching({ rows, activityTradeIds, weekStart, asOfDate: date });
}

function metric(result: ReturnType<typeof build>, label: string) {
  return result.groups.flatMap((group) => group.rows).find((row) => row.label === label);
}

describe("weekly coaching scope and arithmetic", () => {
  it("keeps all-win, all-loss, and scratch samples finite instead of inventing payoff ratios", () => {
    const allWins = build([trade({ id: 1, date: weekStart, net: 10 }), trade({ id: 2, date: "2026-06-09", net: 30 })]);
    expect(metric(allWins, "Average winner")?.value).toBe("+$20.00");
    expect(metric(allWins, "Average loser")?.value).toBe("—");
    expect(metric(allWins, "Payoff ratio")?.value).toBe("—");
    expect(allWins.findings.some((finding) => finding.id === "payoff-asymmetry")).toBe(false);

    const allLosses = build([trade({ id: 3, date: weekStart, net: -10 }), trade({ id: 4, date: "2026-06-09", net: -30 })]);
    expect(metric(allLosses, "Average winner")?.value).toBe("—");
    expect(metric(allLosses, "Average loser")?.value).toBe("−$20.00");
    expect(metric(allLosses, "Payoff ratio")?.value).toBe("—");

    const scratch = build([trade({ id: 5, date: weekStart, net: 0 })]);
    expect(metric(scratch, "Average winner")?.value).toBe("—");
    expect(metric(scratch, "Average loser")?.value).toBe("—");
    expect(scratch.findings).toEqual([]);
  });

  it("uses summed net dollars over summed fractional opening shares for each outcome", () => {
    const result = build([
      trade({ id: 1, date: weekStart, net: 10, openingShares: 0.5, peakShares: 0.75 }),
      trade({ id: 2, date: "2026-06-09", net: 15, openingShares: 1.5, peakShares: 2.25 }),
      trade({ id: 3, date: "2026-06-10", net: -5, openingShares: 0.25, peakShares: 0.5 }),
      trade({ id: 4, date: "2026-06-11", net: -15, openingShares: 0.75, peakShares: 1 }),
    ]);
    expect(metric(result, "Winners · net / opening share")).toEqual({
      label: "Winners · net / opening share",
      value: "+$12.50",
      detail: "Net P&L ÷ 2 opening shares across 2 of 2 winners",
    });
    expect(metric(result, "Losers · net / opening share")?.value).toBe("−$20.00");
    expect(metric(result, "Losers · net / opening share")?.detail).toContain("÷ 1 opening shares");
    expect(metric(result, "Median peak shares")?.value).toBe("0.875");
    const subCent = build([trade({ id: 1, date: weekStart, net: 1, openingShares: 1000 })]);
    expect(metric(subCent, "Winners · net / opening share")?.value).toBe("+$0.001");
  });

  it("labels recorded fees and provisional net when fee components are unknown", () => {
    const result = build([
      trade({ id: 1, date: weekStart, gross: 12, fees: 2, net: 10, unknownFees: 1 }),
      trade({ id: 2, date: "2026-06-09", gross: 7, fees: 2, net: 5 }),
    ]);
    expect(result.scope.unknownFeeTrades).toBe(1);
    expect(metric(result, "Recorded fees")?.value).toBe("$4.00");
    expect(metric(result, "Recorded fees")?.detail).toContain("recorded fees are incomplete");
    expect(metric(result, "Net P&L")?.detail).toContain("Provisional");
    expect(result.findings.find((finding) => finding.id === "fees-absorbed-gains")?.evidence).toContain("percentage is provisional");
  });

  it("counts unique activity and excludes swing, open/unmatched, out-of-week, and later trades", () => {
    const rows = [
      trade({ id: 1, date: weekStart, net: 10 }),
      trade({ id: 2, date: "2026-06-09", entryDate: "2026-06-08", net: 20 }),
      trade({ id: 4, date: "2026-06-05", net: 30 }),
      trade({ id: 5, date: "2026-06-11", net: 40 }),
      trade({ id: 1, date: weekStart, net: 10 }),
    ];
    const result = build(rows, [1, 1, 2, 3, 4, 5], "2026-06-10");
    expect(result.scope).toMatchObject({ includedTrades: 1, activityTrades: 5, excludedTrades: 4, sessions: 1 });
    expect(result.scope.description).toContain("positions carried across ET dates");
    expect(result.scope.description).toContain("later trades are excluded");
  });

  it("uses only supplied account-scoped rows and exact prior-30-day cutoffs", () => {
    const rows = [
      trade({ id: 1, date: "2026-05-08", net: 999 }),
      trade({ id: 2, date: "2026-05-09", net: 10 }),
      trade({ id: 3, date: "2026-06-07", net: -5 }),
      trade({ id: 4, date: "2026-06-08", net: 20 }),
      trade({ id: 5, date: "2026-06-13", net: 999 }),
    ];
    const result = build(rows, [4]);
    expect(result.baseline).toEqual({
      trades: 2,
      sessions: 2,
      label: "Prior 30 calendar days (2026-05-09–2026-06-07) · same completed-intraday scope",
    });
    expect(result.scope.includedTrades).toBe(1);
    expect(result.findings.find((finding) => finding.id === "net-per-trade-vs-baseline")?.evidence)
      .toContain("Baseline: 2 trades across 2 sessions; 0 have unknown fee components");
    expect(result.findings.find((finding) => finding.id === "net-per-trade-vs-baseline")?.evidence)
      .toContain("trade size and setup mix may differ");
    expect(result.findings.find((finding) => finding.id === "net-per-trade-vs-baseline")?.trades.map((row) => row.id))
      .toEqual(expect.arrayContaining([4, 2]));

    const noHistoryProvided = build([rows[3]], [4]);
    expect(noHistoryProvided.baseline.trades).toBe(0);
    expect(noHistoryProvided.findings.some((finding) => finding.id === "net-per-trade-vs-baseline")).toBe(false);

    const upcoming = build(rows, [], "2026-05-20");
    expect(upcoming.baseline.trades).toBe(1);
    expect(upcoming.baseline.label).toContain("available through 2026-05-20");
  });
});

describe("weekly coaching reads", () => {
  it("compares hold times only inside a side-and-price cohort with independent sessions", () => {
    const result = build([
      trade({ id: 1, date: weekStart, net: 10, holdMinutes: 5, side: "long", price: 4 }),
      trade({ id: 2, date: weekStart, net: -10, holdMinutes: 20, side: "long", price: 4.5 }),
      trade({ id: 3, date: "2026-06-09", net: 20, holdMinutes: 7, side: "long", price: 3 }),
      trade({ id: 4, date: "2026-06-09", net: -20, holdMinutes: 30, side: "long", price: 2 }),
      trade({ id: 5, date: "2026-06-10", net: 5, holdMinutes: 100, side: "short", price: 4 }),
      trade({ id: 6, date: "2026-06-11", net: -5, holdMinutes: 1, side: "short", price: 4 }),
      trade({ id: 7, date: "2026-06-10", net: 5, holdMinutes: 200, side: "long", price: 8 }),
      trade({ id: 8, date: "2026-06-11", net: -5, holdMinutes: 1, side: "long", price: 8 }),
    ]);
    const finding = result.findings.find((row) => row.id === "hold-long-under5");
    expect(finding?.read).toContain("Net losers stayed open longer");
    expect(finding?.evidence).toContain("2 net winners across 2 sessions had a 6 min median hold");
    expect(finding?.evidence).toContain("2 net losers across 2 sessions had a 25 min median hold");
    expect(finding?.read).toContain("among long trades entered under $5");
    expect(finding?.evidence).toContain("grouped by side and entry-price band; setup and asset characteristics may differ");
    expect(finding?.trades.length).toBeLessThanOrEqual(3);
    expect(finding?.trades.map((row) => row.id)).toEqual(expect.arrayContaining([3, 4]));
  });

  it("surfaces gross winners flipped by fees with exact denominators and capped links", () => {
    const result = build([
      trade({ id: 1, date: weekStart, gross: 3, fees: 5, net: -2 }),
      trade({ id: 2, date: "2026-06-09", gross: 2, fees: 3, net: -1, unknownFees: 1 }),
      trade({ id: 3, date: "2026-06-10", gross: 10, fees: 1, net: 9 }),
      trade({ id: 4, date: "2026-06-11", gross: -5, fees: 1, net: -6 }),
    ]);
    const finding = result.findings.find(row => row.id === "fees-flipped-winners")!;
    expect(finding).toBeDefined();
    expect(finding.read).toContain("2 trades went from a gross winner to a net loser");
    expect(finding.evidence).toContain("2 of 3 gross-positive trades");
    expect(finding.evidence).toContain("+$5.00 gross − $8.00 recorded fees = −$3.00 net");
    expect(finding.evidence).toContain("provisional");
    expect(finding.trades.map((row) => row.id)).toEqual([1, 2]);
  });

  it("limits a one-session sample to observations and never calls it a persistent pattern", () => {
    const result = build([
      trade({ id: 1, date: weekStart, net: 30 }),
      trade({ id: 2, date: weekStart, net: -10 }),
    ]);
    expect(result.findings.map((finding) => finding.id)).toEqual(["payoff-asymmetry"]);
    expect(result.findings[0].confidence).toBe("observation");
    expect(`${result.findings[0].read} ${result.findings[0].evidence}`).not.toMatch(/persistent|recurring|pattern/i);
    expect(result.findings[0].evidence).not.toContain("cash-loss ratio");
  });

  it("keeps a tiny fee exception below the week's win/loss-size comparison", () => {
    const result = build([
      trade({ id: 1, date: weekStart, net: 30 }),
      trade({ id: 2, date: weekStart, net: -10 }),
      trade({ id: 3, date: weekStart, gross: 0.02, fees: 0.03, net: -0.01 }),
    ]);
    expect(result.findings[0].id).toBe("payoff-asymmetry");
    expect(result.findings.some(row => row.id === "fees-flipped-winners")).toBe(true);
  });

  it("returns no generic coaching filler when no relationship has evidence", () => {
    const result = build([], [1, 2]);
    expect(result.scope).toMatchObject({ includedTrades: 0, activityTrades: 2, excludedTrades: 2 });
    expect(result.findings).toEqual([]);
    expect(metric(result, "Net P&L")?.value).toBe("$0.00");
  });
});
