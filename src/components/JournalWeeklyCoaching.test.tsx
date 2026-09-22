import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import JournalWeeklyCoaching from "./JournalWeeklyCoaching";
import type { WeeklyCoaching, WeeklyMarketReview } from "@/lib/weeklyCoachingTypes";

const coaching: WeeklyCoaching = {
  scope: { description: "Completed intraday trades only.", includedTrades: 3, activityTrades: 4, excludedTrades: 1, sessions: 2, unknownFeeTrades: 1 },
  baseline: { label: "Prior completed sessions", trades: 12, sessions: 4 },
  groups: [{ label: "Results", rows: [{ label: "Net P&L", value: "+$120" }] }],
  findings: [
    { id: "one", read: "Keep the entry rule", evidence: "Two trades followed the plan.", question: "What made the setup clear?", confidence: "observation", trades: [{ id: 1, symbol: "DEMO", date: "2026-06-08" }] },
    { id: "two", read: "Review the exit", evidence: "One exit reversed.", confidence: "observation", trades: [] },
    { id: "three", read: "Compare size", evidence: "Size changed late.", confidence: "developing", trades: [] },
    { id: "four", read: "Hold for more data", evidence: "A fourth finding stays hidden.", confidence: "developing", trades: [] },
  ],
};

const market: WeeklyMarketReview = {
  status: "partial", summary: "One traded ticker overlapped with a recorded mover.", detail: "Coverage is limited.", note: "Retrospective only.",
  days: [{ date: "2026-06-08", coverage: "Partial", eligibleMovers: 3, tradedSymbols: ["DEMO"], leaders: [{ symbol: "DEMO", peakGainPercent: 75, traded: true }], source: "Archive" }],
};

it("limits coaching findings by recap stage while retaining metric methodology", () => {
  const early = renderToStaticMarkup(createElement(JournalWeeklyCoaching, { coaching, market, stage: "early", returnTo: "/journal?scope=week" }));
  const full = renderToStaticMarkup(createElement(JournalWeeklyCoaching, { coaching, market, stage: "full", returnTo: "/journal?scope=week" }));

  expect(early).toContain("Keep the entry rule");
  expect(early).not.toContain("Review the exit");
  expect(early).toContain("Performance breakdown and methodology");
  expect(early).toContain("Completed intraday trades only.");
  expect(early).toContain("/analytics/momentum-archive?date=2026-06-08");
  expect(full).toContain("Compare size");
  expect(full).not.toContain("Hold for more data");
  expect(full).toContain("open=\"\"");
});
