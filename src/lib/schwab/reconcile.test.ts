import { describe, expect, it } from "vitest";
import type { ReconciliationExecution } from "./reconcile";
import {
  classifyHistoricalTradeExecutions,
  planHistoricalTradeReconciliation,
  planTradeReconciliation,
  TradeReconciliationError,
} from "./reconcile";

function execution(
  id: number,
  overrides: Partial<ReconciliationExecution> = {},
): ReconciliationExecution {
  return {
    id,
    tradeId: null,
    isNew: true,
    symbol: "SYNTH",
    side: id === 1 ? "buy" : "sell",
    quantity: 10,
    price: id === 1 ? 10 : 11,
    executedAt: 1_700_000_000 + id,
    posEffect: id === 1 ? "TO OPEN" : "TO CLOSE",
    fees: 0,
    brokerOrderKey: null,
    sourceRowHash: `hash-${id}`,
    ...overrides,
  };
}

describe("planTradeReconciliation", () => {
  it("updates an existing open trade in place when a later close arrives", () => {
    const groups = planTradeReconciliation([
      execution(1, {
        isNew: false,
        tradeId: 42,
        side: "buy",
      }),
      execution(2, {
        isNew: true,
        tradeId: null,
        side: "sell",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      existingTradeId: 42,
      newExecutionIds: [2],
      trade: {
        status: "closed",
        avgEntryPrice: 10,
        avgExitPrice: 11,
      },
    });
  });

  it("creates a new trade when every execution in the group is new", () => {
    const groups = planTradeReconciliation([
      execution(1),
      execution(2),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.existingTradeId).toBeNull();
  });

  it("fails closed instead of merging existing trade identities", () => {
    expect(() => planTradeReconciliation([
      execution(1, { isNew: false, tradeId: 10, side: "buy", quantity: 5 }),
      execution(2, { isNew: false, tradeId: 11, side: "buy", quantity: 5 }),
      execution(3, { isNew: true, side: "sell", quantity: 10 }),
    ])).toThrow(TradeReconciliationError);
  });

  it("fails closed on a fill that flips through zero", () => {
    expect(() => planTradeReconciliation([
      execution(1, { isNew: false, tradeId: 10, side: "buy", quantity: 5 }),
      execution(2, { isNew: true, side: "sell", quantity: 10 }),
    ])).toThrow("position-flip");
  });

  it("accepts self-contained closed trades inside a historical gap", () => {
    const groups = planHistoricalTradeReconciliation([
      execution(1, { side: "buy", posEffect: "TO OPEN" }),
      execution(2, { side: "sell", posEffect: "TO CLOSE" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.trade.status).toBe("closed");
  });

  it("rejects an incomplete historical position", () => {
    expect(() => planHistoricalTradeReconciliation([
      execution(1, { side: "buy", posEffect: "TO OPEN" }),
    ])).toThrow("incomplete historical fills");
  });

  it("separates safe historical trades from fills that need review", () => {
    const classification = classifyHistoricalTradeExecutions([
      execution(1, { symbol: "SAFE", side: "buy", posEffect: "TO OPEN" }),
      execution(2, { symbol: "SAFE", side: "sell", posEffect: "TO CLOSE" }),
      execution(3, { symbol: "REVIEW", side: "buy", posEffect: "TO OPEN" }),
    ]);

    expect(classification.safeExecutions.map((item) => item.symbol)).toEqual([
      "SAFE",
      "SAFE",
    ]);
    expect(classification.reviewExecutions.map((item) => item.symbol)).toEqual([
      "REVIEW",
    ]);
    expect(classification.reviewSymbols).toEqual(["REVIEW"]);
  });
});
