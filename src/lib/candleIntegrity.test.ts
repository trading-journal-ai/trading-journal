import { describe, expect, it } from "vitest";
import { executionMinute, missingExecutionMinutes } from "./candleIntegrity";

describe("candle execution-time integrity", () => {
  it("anchors executions to their containing minute", () => {
    expect(executionMinute(13 * 60 * 60 + 47 * 60 + 18)).toBe(13 * 60 * 60 + 47 * 60);
    expect(executionMinute(13 * 60 * 60 + 47 * 60 + 27)).toBe(13 * 60 * 60 + 47 * 60);
  });

  it("reports an execution minute beyond an incomplete candle cache", () => {
    const firstCachedMinute = 9 * 60 * 60 + 13 * 60;
    const lastCachedMinute = 12 * 60 * 60;
    const laterExecution = 13 * 60 * 60 + 47 * 60 + 18;

    expect(missingExecutionMinutes(
      [
        { t: firstCachedMinute },
        { t: firstCachedMinute + 60 },
        { t: lastCachedMinute },
      ],
      [laterExecution],
    )).toEqual([executionMinute(laterExecution)]);
  });

  it("deduplicates executions in the same missing minute", () => {
    const entry = 13 * 60 * 60 + 47 * 60 + 18;
    const exit = entry + 9;

    expect(missingExecutionMinutes([], [entry, exit])).toEqual([executionMinute(entry)]);
  });

  it("does not infer time alignment from a price match", () => {
    const executionAt = 13 * 60 * 60 + 47 * 60 + 18;
    const priceMatchingButWrongMinute = 9 * 60 * 60 + 13 * 60;

    expect(missingExecutionMinutes(
      [{ t: priceMatchingButWrongMinute }],
      [executionAt],
    )).toEqual([executionMinute(executionAt)]);
  });
});
