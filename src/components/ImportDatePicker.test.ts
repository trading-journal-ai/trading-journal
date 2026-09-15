import { describe, expect, it } from "vitest";
import { monthDays, shiftDate, shiftMonth } from "./ImportDatePicker";

describe("import calendar navigation", () => {
  it("clamps month navigation to the destination month's final day", () => {
    expect(shiftMonth("2024-01-31", 1)).toBe("2024-02-29");
    expect(shiftMonth("2025-03-31", -1)).toBe("2025-02-28");
    expect(shiftMonth("2024-02-29", 12)).toBe("2025-02-28");
  });
  it("moves across year and daylight-saving boundaries by calendar day", () => {
    expect(shiftDate("2025-12-31", 1)).toBe("2026-01-01");
    expect(shiftDate("2026-03-08", -1)).toBe("2026-03-07");
    expect(shiftDate("2026-11-01", 1)).toBe("2026-11-02");
  });
  it("includes leap day without an extra trailing week", () => {
    const days = monthDays("2024-02-15");
    expect(days).toHaveLength(35);
    expect(days[0]).toBe("2024-01-28");
    expect(days[34]).toBe("2024-03-02");
    expect(days).toContain("2024-02-29");
    expect(new Set(days).size).toBe(35);
  });
  it("uses four or six weeks only when the month needs them", () => {
    expect(monthDays("2026-02-01")).toHaveLength(28);
    const days = monthDays("2026-08-01");
    expect(days).toHaveLength(42);
    expect(days[41]).toBe("2026-09-05");
  });
});
