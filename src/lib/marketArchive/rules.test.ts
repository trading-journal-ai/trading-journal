import { describe, expect, it } from "vitest";
import { CORE_MOVER_RULE_VERSION, calendarDayGap, qualifyCoreMover } from "./rules";

const candidate = {
  instrumentType: "CS",
  maxGainPercent: 75,
  previousCloseDate: "2026-08-21",
  previousRegularClose: 2,
  sessionDateEt: "2026-08-24",
  splitEvent: false,
};

describe("Core common-equity mover rules", () => {
  it("admits a non-split common stock with a recent positive close and 50%+ move", () => {
    expect(qualifyCoreMover(candidate)).toEqual({
      excludedBy: [],
      qualifies: true,
      ruleVersion: CORE_MOVER_RULE_VERSION,
    });
  });

  it("includes common-stock ADRs and sub-dollar common shares", () => {
    for (const instrumentType of ["CS", "ADRC"]) {
      expect(qualifyCoreMover({ ...candidate, instrumentType, previousRegularClose: 0.25 }).qualifies).toBe(true);
    }
  });

  it("rejects unusable closing prices and non-equity structures", () => {
    for (const previousRegularClose of [0, -1, NaN, Infinity, null]) {
      expect(qualifyCoreMover({ ...candidate, previousRegularClose }).excludedBy).toContain("missing_previous_close");
    }
    for (const instrumentType of ["ETF", "WARRANT", "RIGHT", "UNIT", "PFD", "ADRP", null]) {
      expect(qualifyCoreMover({ ...candidate, instrumentType }).qualifies).toBe(false);
    }
  });

  it("excludes non-common structures without inferring type from the ticker", () => {
    expect(qualifyCoreMover({ ...candidate, instrumentType: "ETF" }).excludedBy).toContain(
      "instrument_not_common_stock",
    );
  });

  it("records every controlling exclusion reason", () => {
    expect(qualifyCoreMover({
      ...candidate,
      instrumentType: "WARRANT",
      maxGainPercent: 49.9,
      previousCloseDate: "2026-08-01",
      previousRegularClose: 0.99,
      splitEvent: true,
    }).excludedBy).toEqual([
      "instrument_not_common_stock",
      "known_split_execution_date",
      "previous_close_too_old",
      "move_below_fifty_percent",
    ]);
  });

  it("treats malformed dates and a missing close as explicit data-quality failures", () => {
    expect(qualifyCoreMover({
      ...candidate,
      previousCloseDate: null,
      previousRegularClose: null,
      sessionDateEt: "2026-02-30",
    }).excludedBy).toEqual([
      "invalid_session_date",
      "missing_previous_close",
      "previous_close_too_old",
    ]);
  });

  it("uses calendar-day distance so Friday's close remains valid on Monday", () => {
    expect(calendarDayGap("2026-08-21", "2026-08-24")).toBe(3);
  });
});
