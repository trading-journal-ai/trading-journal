import { describe, expect, it } from "vitest";
import {
  formatCalendarAccuracy,
  formatCalendarProfitFactor,
} from "./calendarMetrics";

describe("calendar metrics", () => {
  it("formats accuracy from decided trades", () => {
    expect(formatCalendarAccuracy(5, 3)).toBe("63%");
    expect(formatCalendarAccuracy(0, 0)).toBe("—");
  });

  it("formats finite and capped profit factors", () => {
    expect(formatCalendarProfitFactor(148, 100)).toBe("1.48");
    expect(formatCalendarProfitFactor(10, 0)).toBe("9.99+");
    expect(formatCalendarProfitFactor(100, 5)).toBe("9.99+");
    expect(formatCalendarProfitFactor(0, 0)).toBe("—");
  });
});
