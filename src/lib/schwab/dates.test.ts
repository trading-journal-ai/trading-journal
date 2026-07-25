import { describe, expect, it } from "vitest";
import {
  SCHWAB_ORDER_ENTRY_LOOKBACK_DAYS,
  validateSchwabDateRange,
  SchwabDateRangeError,
} from "./dates";

describe("validateSchwabDateRange", () => {
  it("builds ET boundaries and includes an order-entry lookback", () => {
    const range = validateSchwabDateRange(
      "2026-07-19",
      "2026-07-25",
      new Date("2026-07-25T18:00:00Z"),
    );
    expect(range.startEpoch).toBe(Date.parse("2026-07-19T04:00:00.000Z") / 1000);
    expect(range.endEpochExclusive).toBe(Date.parse("2026-07-26T04:00:00.000Z") / 1000);
    expect(range.transactionChunks).toHaveLength(1);
    expect(range.orderChunks[0]?.from).toBe("2026-07-12");
    expect(SCHWAB_ORDER_ENTRY_LOOKBACK_DAYS).toBe(7);
  });

  it("handles DST-short and DST-long ET days", () => {
    const spring = validateSchwabDateRange(
      "2026-03-08",
      "2026-03-08",
      new Date("2026-03-09T12:00:00Z"),
    );
    expect(spring.endEpochExclusive - spring.startEpoch).toBe(23 * 3600);

    const fall = validateSchwabDateRange(
      "2026-11-01",
      "2026-11-01",
      new Date("2026-11-02T12:00:00Z"),
    );
    expect(fall.endEpochExclusive - fall.startEpoch).toBe(25 * 3600);
  });

  it("rejects invalid, future, reversed, and out-of-range dates", () => {
    const now = new Date("2026-07-25T18:00:00Z");
    expect(() => validateSchwabDateRange("2026-02-30", "2026-07-25", now))
      .toThrow(SchwabDateRangeError);
    expect(() => validateSchwabDateRange("2026-07-25", "2026-07-24", now))
      .toThrow("on or before");
    expect(() => validateSchwabDateRange("2026-07-01", "2026-07-26", now))
      .toThrow("future");
    expect(() => validateSchwabDateRange("2026-05-01", "2026-05-02", now))
      .toThrow("60 days");
  });
});
