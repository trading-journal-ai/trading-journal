import { describe, expect, it } from "vitest";
import {
  buildJournalPeriodNavigation,
  journalPeriodHref,
  shiftJournalPeriod,
} from "./journalPeriodNavigation";

describe("shiftJournalPeriod", () => {
  it("moves Day by trading weekday", () => {
    expect(shiftJournalPeriod("day", "2026-08-13", -1)).toBe("2026-08-12");
    expect(shiftJournalPeriod("day", "2026-08-14", 1)).toBe("2026-08-17");
    expect(shiftJournalPeriod("day", "2026-08-17", -1)).toBe("2026-08-14");
  });

  it("moves Week by seven calendar days", () => {
    expect(shiftJournalPeriod("week", "2026-08-13", -1)).toBe("2026-08-06");
    expect(shiftJournalPeriod("week", "2026-08-13", 1)).toBe("2026-08-20");
  });

  it("moves Month and clamps dates at shorter month boundaries", () => {
    expect(shiftJournalPeriod("month", "2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftJournalPeriod("month", "2028-03-31", -1)).toBe("2028-02-29");
  });
});

describe("journal period navigation", () => {
  it("keeps the active non-day scope in the URL", () => {
    expect(journalPeriodHref("/journal", "2026-08-13", "day")).toBe(
      "/journal?date=2026-08-13",
    );
    expect(journalPeriodHref("/journal", "2026-08-13", "week")).toBe(
      "/journal?date=2026-08-13&scope=week",
    );
  });

  it("builds Today, Previous, and Next destinations for every scope", () => {
    const navigation = buildJournalPeriodNavigation(
      "/journal",
      "2026-08-13",
      "2026-08-18",
    );

    expect(navigation.day.previous.date).toBe("2026-08-12");
    expect(navigation.week.next.date).toBe("2026-08-20");
    expect(navigation.month.previous.date).toBe("2026-07-13");
    expect(navigation.month.today.href).toBe(
      "/journal?date=2026-08-18&scope=month",
    );
  });
});
