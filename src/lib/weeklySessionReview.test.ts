import { describe, expect, it } from "vitest";
import type { ReviewTrade } from "./analyticsReview";
import { buildWeeklyReviewFlag, buildWeeklySessionReview } from "./weeklySessionReview";

const weekStart = "2026-09-14";
const asOfDate = "2026-09-18";

function session(
  date: string,
  pnl: number,
  values: Array<number | [number, number]>,
  trades: Array<{ id: number; symbol: string; pnl: number }> = [],
) {
  return {
    date,
    pnl,
    points: values.map((point, index) => Array.isArray(point)
      ? { timestamp: point[0], value: point[1] }
      : { timestamp: index + 1, value: point }),
    trades,
  };
}

function reviewTrade(overrides: Partial<ReviewTrade> & Pick<ReviewTrade, "id" | "date">): ReviewTrade {
  const { id, date, ...rest } = overrides;
  return {
    id,
    symbol: `SYN${id}`,
    side: "long",
    entryAt: id * 100 + 10,
    exitAt: id * 100 + 20,
    date,
    entryDate: date,
    price: 4,
    gross: 0,
    net: 0,
    fees: 0,
    unknownFees: 0,
    fills: 2,
    peakShares: 100,
    peakCapital: 400,
    openingShares: 100,
    initialShares: 100,
    holdMinutes: 1,
    adds: 0,
    reductions: 0,
    setup: "Synthetic",
    tags: [],
    attempt: 1,
    ...rest,
  };
}

describe("weekly recorded-curve session review", () => {
  it("selects the largest positive-peak-to-negative-close giveback and breaks ties by date", () => {
    const result = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [
        session("2026-09-16", -20, [0, 80, -20]),
        session("2026-09-15", -40, [0, 60, -40], [
          { id: 8, symbol: "LOSS", pnl: -45 },
          { id: 9, symbol: "WIN", pnl: 5 },
        ]),
        session("2026-09-17", -10, [0, 50, -10]),
      ],
    });
    expect(result).toEqual({
      date: "2026-09-15",
      peakPnl: 60,
      closingPnl: -40,
      giveback: 100,
      largestLoss: { id: 8, symbol: "LOSS", date: "2026-09-15", pnl: -45 },
    });
  });

  it("uses the last stable point at a shared timestamp so transient ordering cannot create a peak", () => {
    const artificial = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [session("2026-09-14", -10, [[1, 0], [2, 50], [2, 0], [3, -10]])],
    });
    expect(artificial).toBeNull();

    const recorded = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [session("2026-09-14", -10, [[1, 0], [2, 0], [2, 50], [3, -10]])],
    });
    expect(recorded).toMatchObject({ peakPnl: 50, closingPnl: -10, giveback: 60 });
  });

  it("rejects future and out-of-week sessions plus incoherent endpoint curves", () => {
    const invalidCurves = [
      session("2026-09-14", -10, [0, -10]),
      session("2026-09-15", 10, [0, 20, 10]),
      session("2026-09-16", -10, [[2, 20], [1, -10]]),
      session("2026-09-17", -10, [[1, 20], [2, Number.NaN]]),
      session("2026-09-18", -10, [0, 20, -9.97]),
      session("2026-09-19", -20, [0, 100, -20]),
      session("2026-09-21", -30, [0, 200, -30]),
    ];
    expect(buildWeeklySessionReview({ weekStart, asOfDate: "2026-09-17", sessions: invalidCurves })).toBeNull();
  });

  it("accepts a final endpoint exactly two cents from the reconciled session result", () => {
    const result = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [session("2026-09-14", -10, [0, 20, -9.98])],
    });
    expect(result).toMatchObject({ closingPnl: -9.98, peakPnl: 20, giveback: 29.98 });
  });

  it("deduplicates trade ids before choosing the day's largest net loss", () => {
    const result = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [session("2026-09-14", -20, [0, 10, -20], [
        { id: 2, symbol: "FIRST", pnl: -12 },
        { id: 2, symbol: "DUPLICATE", pnl: -99 },
        { id: 1, symbol: "TIE", pnl: -12 },
      ])],
    });
    expect(result?.largestLoss).toEqual({ id: 1, symbol: "TIE", date: "2026-09-14", pnl: -12 });
  });
});

describe("weekly session size comparison", () => {
  it("compares the matched loss with unique prior completed intraday trades in its side and price band", () => {
    const target = reviewTrade({ id: 10, date: "2026-09-17", symbol: "TARGET", entryAt: 1_000, exitAt: 1_100, net: -50, peakShares: 400 });
    const rows = [
      reviewTrade({ id: 1, date: "2026-09-17", entryAt: 100, exitAt: 200, peakShares: 100 }),
      reviewTrade({ id: 2, date: "2026-09-17", entryAt: 300, exitAt: 400, peakShares: 200 }),
      reviewTrade({ id: 2, date: "2026-09-17", entryAt: 300, exitAt: 400, peakShares: 900 }),
      reviewTrade({ id: 3, date: "2026-09-16", entryAt: 900, exitAt: 1_000, peakShares: 900 }),
      reviewTrade({ id: 4, date: "2026-09-17", entryAt: 950, exitAt: 1_050, peakShares: 900 }),
      reviewTrade({ id: 5, date: "2026-09-17", entryAt: 500, exitAt: 600, side: "short", peakShares: 900 }),
      reviewTrade({ id: 6, date: "2026-09-17", entryAt: 500, exitAt: 600, price: 8, peakShares: 900 }),
      reviewTrade({ id: 7, date: "2026-09-17", entryDate: "2026-09-16", entryAt: 500, exitAt: 600, peakShares: 900 }),
      reviewTrade({ id: 8, date: "2026-09-18", entryAt: 1_200, exitAt: 1_300, peakShares: 900 }),
      target,
    ];
    const result = buildWeeklySessionReview({
      weekStart,
      asOfDate,
      sessions: [session("2026-09-17", -50, [0, 100, -50], [{ id: 10, symbol: "TARGET", pnl: -50 }])],
      rows,
    });
    expect(result?.sizeComparison).toEqual({
      peakShares: 400,
      priorMedianPeakShares: 150,
      multiple: 400 / 150,
      sampleTrades: 2,
    });
  });

  it("omits size comparison without a grounded target and at least two valid predecessors", () => {
    const target = reviewTrade({ id: 10, date: "2026-09-17", symbol: "TARGET", entryAt: 1_000, exitAt: 1_100, net: -50, peakShares: 400 });
    const input = {
      weekStart,
      asOfDate,
      sessions: [session("2026-09-17", -50, [0, 100, -50], [{ id: 10, symbol: "TARGET", pnl: -50 }])],
    };
    expect(buildWeeklySessionReview({
      ...input,
      rows: [
        reviewTrade({ id: 1, date: "2026-09-17", exitAt: 200, peakShares: 100 }),
        reviewTrade({ id: 2, date: "2026-09-16", exitAt: 400, peakShares: 200 }),
        target,
      ],
    })?.sizeComparison).toBeUndefined();
    expect(buildWeeklySessionReview({
      ...input,
      rows: [{ ...target, peakShares: null }],
    })?.sizeComparison).toBeUndefined();
    expect(buildWeeklySessionReview({
      ...input,
      rows: [{ ...target, symbol: "WRONG" }],
    })?.sizeComparison).toBeUndefined();
  });
});


describe("weekly day-review flag", () => {
  it("combines all overlapping reasons into one day", () => {
    const result = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-14", 30, [0, 30], [{ id: 1, symbol: "FIRST", pnl: 30 }]),
      session("2026-09-16", -20, [0, 40, -20], [
        { id: 2, symbol: "GAIN", pnl: 40 }, { id: 3, symbol: "LOSS", pnl: -60 },
      ]),
    ] });
    expect(result).toMatchObject({ date: "2026-09-16", importedSessions: 2,
      reasons: ["only_red_session", "largest_loss", "green_to_red"],
      curve: { peakPnl: 40, closingPnl: -20, giveback: 60 },
      largestLoss: { id: 3, pnl: -60, weekPnl: -60, dates: ["2026-09-16"] },
    });
  });

  it("flags a losing trade on a green day without requiring a curve", () => {
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-15", 20, [], [
        { id: 1, symbol: "GAIN", pnl: 80 }, { id: 2, symbol: "LOSS", pnl: -60 },
      ]),
    ] })).toMatchObject({ date: "2026-09-15", reasons: ["largest_loss"] });
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-15", -60, [], [{ id: 2, symbol: "LOSS", pnl: -60 }]),
    ] })?.reasons).not.toContain("only_red_session");
  });

  it("prioritizes overlapping reasons over a larger isolated trade loss", () => {
    const result = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-14", 100, [0, 1100, 100], [
        { id: 1, symbol: "GAIN", pnl: 1100 }, { id: 2, symbol: "LOSS", pnl: -1000 },
      ]),
      session("2026-09-16", -5, [0, 10, -5], [
        { id: 3, symbol: "GAIN", pnl: 10 }, { id: 4, symbol: "LOSS", pnl: -15 },
      ]),
    ] });
    expect(result).toMatchObject({ date: "2026-09-16", reasons: ["only_red_session", "green_to_red"] });
    expect(result?.largestLoss).toBeUndefined();
  });

  it("ranks a cross-day trade by its weekly net and attributes its largest negative daily contribution", () => {
    const result = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-14", 10, [], [{ id: 1, symbol: "SWING", pnl: 10 }]),
      session("2026-09-15", -30, [], [{ id: 1, symbol: "SWING", pnl: -30 }]),
      session("2026-09-16", -15, [], [{ id: 2, symbol: "OTHER", pnl: -15 }]),
    ] });
    expect(result).toMatchObject({ date: "2026-09-15", reasons: ["largest_loss"],
      largestLoss: { id: 1, pnl: -30, weekPnl: -20, dates: ["2026-09-14", "2026-09-15"] },
    });
    const winner = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-14", 100, [], [{ id: 1, symbol: "SWING", pnl: 100 }]),
      session("2026-09-15", -30, [], [{ id: 1, symbol: "SWING", pnl: -30 }]),
      session("2026-09-16", -15, [], [{ id: 2, symbol: "OTHER", pnl: -15 }]),
    ] });
    expect(winner?.largestLoss?.id).toBe(2);
  });

  it("breaks equal impact ties by date regardless of input order", () => {
    const sessions = [
      session("2026-09-16", -10, [0, 50, 20, -10], [
        { id: 1, symbol: "A", pnl: 50 }, { id: 2, symbol: "B", pnl: -30 }, { id: 3, symbol: "C", pnl: -30 },
      ]),
      session("2026-09-15", -10, [0, 50, 20, -10], [
        { id: 4, symbol: "D", pnl: 50 }, { id: 5, symbol: "E", pnl: -30 }, { id: 6, symbol: "F", pnl: -30 },
      ]),
      session("2026-09-17", 1, [0, 41, 1], [
        { id: 7, symbol: "G", pnl: 41 }, { id: 8, symbol: "H", pnl: -40 },
      ]),
    ];
    const forward = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions });
    const backward = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [...sessions].reverse() });
    expect(forward).toEqual(backward);
    expect(forward?.date).toBe("2026-09-15");
    expect(forward?.reasons).toEqual(["green_to_red"]);
  });

  it("ignores invalid, non-imported, future and out-of-week evidence", () => {
    const sessions = [
      session("2026-09-14", 20, [0, 20], [{ id: 1, symbol: "GOOD", pnl: 20 }]),
      session("2026-09-15", -10, [0, 50, -10]),
      session("2026-09-16", Number.NaN, [0, 50, -10], [{ id: 3, symbol: "BAD", pnl: -10 }]),
      session("2026-09-17", -10, [0, 50, -10], [{ id: 4, symbol: "BAD", pnl: Number.NaN }]),
      session("2026-09-18", -10, [0, 50, -10], [{ id: 5, symbol: "FUTURE", pnl: -10 }]),
      session("2026-09-19", -10, [0, 50, -10], [{ id: 6, symbol: "WEEKEND", pnl: -10 }]),
      session("2026-09-21", -10, [0, 50, -10], [{ id: 7, symbol: "NEXT", pnl: -10 }]),
    ];
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate: "2026-09-17", sessions })).toBeNull();
    expect(buildWeeklyReviewFlag({ weekStart: "2026-02-30", asOfDate, sessions })).toBeNull();
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate: "invalid", sessions })).toBeNull();
  });

  it("does not derive a giveback from incoherent points or duplicated dates", () => {
    const duplicate = session("2026-09-15", -20, [0, 20, -20], [{ id: 1, symbol: "DUP", pnl: -20 }]);
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [duplicate, duplicate] })).toBeNull();
    const result = buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-15", -20, [0, 20, -10], [{ id: 1, symbol: "LOSS", pnl: -20 }]),
    ] });
    expect(result?.reasons).toEqual(["largest_loss"]);
    expect(result?.curve).toBeUndefined();
  });

  it("returns no flag for an ordinary all-green week", () => {
    expect(buildWeeklyReviewFlag({ weekStart, asOfDate, sessions: [
      session("2026-09-14", 20, [0, 20], [{ id: 1, symbol: "FIRST", pnl: 20 }]),
      session("2026-09-15", 30, [0, 30], [{ id: 2, symbol: "SECOND", pnl: 30 }]),
    ] })).toBeNull();
  });
});
