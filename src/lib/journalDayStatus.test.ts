import { describe, expect, it } from "vitest";
import { journalDayState } from "./journalDayStatus";

describe("journal day status", () => {
  it("distinguishes an unconfirmed empty day from an intentional no-trade day", () => {
    expect(journalDayState(0, null)).toBe("unconfirmed_empty");
    expect(journalDayState(0, "no_trade")).toBe("no_trade");
  });

  it("shows imported trades even if a stale no-trade marker exists", () => {
    expect(journalDayState(1, "no_trade")).toBe("trades");
  });
});
