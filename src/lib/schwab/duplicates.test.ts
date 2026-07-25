import { describe, expect, it } from "vitest";
import type { ParsedExecution } from "@/lib/import/tos";
import { compareExecutions } from "./duplicates";

function execution(overrides: Partial<ParsedExecution> = {}): ParsedExecution {
  return {
    symbol: "SYNTH",
    side: "buy",
    quantity: 10,
    price: 20.25,
    executedAt: 1_700_000_000,
    posEffect: "TO OPEN",
    fees: 0,
    brokerOrderKey: null,
    sourceRowHash: "hash",
    ...overrides,
  };
}

describe("compareExecutions", () => {
  it("uses multiset matching for overlapping API and CSV fills", () => {
    const incoming = [
      execution({ sourceRowHash: "api-1" }),
      execution({ sourceRowHash: "api-2" }),
      execution({ price: 20.3, sourceRowHash: "api-3" }),
    ];
    const result = compareExecutions(incoming, [execution({ sourceRowHash: "csv-1" })]);

    expect(result.duplicateExecutions).toBe(1);
    expect(result.duplicateExecutionRows.map((item) => item.sourceRowHash)).toEqual([
      "api-1",
    ]);
    expect(result.newExecutions.map((item) => item.sourceRowHash)).toEqual([
      "api-2",
      "api-3",
    ]);
  });

  it("does not require matching source hashes or position-effect labels", () => {
    const result = compareExecutions(
      [execution({ sourceRowHash: "api", posEffect: "TO CLOSE" })],
      [execution({ sourceRowHash: "csv", posEffect: null })],
    );
    expect(result.duplicateExecutions).toBe(1);
    expect(result.newExecutions).toHaveLength(0);
  });
});
