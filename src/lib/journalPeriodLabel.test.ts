import { describe, expect, it } from "vitest";
import { journalPeriodLabel } from "./journalPeriodLabel";

describe("journalPeriodLabel", () => {
  it("labels the selected trading day", () => {
    expect(journalPeriodLabel("day", "2026-08-13")).toBe("Thursday, August 13");
  });

  it("labels the selected trading week", () => {
    expect(journalPeriodLabel("week", "2026-08-13")).toBe("August 10 - 14");
    expect(journalPeriodLabel("week", "2026-09-01")).toBe("August 31 - September 4");
    expect(journalPeriodLabel("week", "2027-01-01")).toBe("December 28 - January 1");
  });

  it("labels the selected trading month", () => {
    expect(journalPeriodLabel("month", "2026-08-13")).toBe("August 2026");
  });
});
