import { describe, expect, it } from "vitest";
import {
  analyzeTradeExecutions,
  coachTradeExecutionFacts,
  groupTradeExecutions,
} from "./executionAnalysis";

describe("analyzeTradeExecutions", () => {
  it("classifies the NXTC scale-in and partial exits and detects averaging down", () => {
    const analysis = analyzeTradeExecutions("long", [
      { id: 1, side: "buy", quantity: 1, price: 11.55, executedAt: 1000 },
      { id: 2, side: "buy", quantity: 10, price: 10.88, executedAt: 1018 },
      { id: 3, side: "sell", quantity: 5, price: 10.6178, executedAt: 1036 },
      { id: 4, side: "sell", quantity: 6, price: 10.262, executedAt: 1091 },
    ]);

    expect(analysis.executions.map((execution) => execution.lifecycle)).toEqual([
      "open",
      "increase",
      "reduce",
      "close",
    ]);
    expect(analysis.executionCount).toBe(4);
    expect(analysis.fillCount).toBe(4);
    expect(analysis.partialExitCount).toBe(1);
    expect(analysis.maxPosition).toBe(11);
    expect(analysis.averagedDown).toBe(true);
    expect(analysis.adverseAddCount).toBe(1);
    expect(analysis.executions[1]?.secondsAfterOpen).toBe(18);
    expect(analysis.executions[1]?.adverseAddPercent).toBeCloseTo((11.55 - 10.88) / 11.55, 6);
    expect(analysis.executions[0]?.realizedPnl).toBeNull();
    expect(analysis.executions[1]?.realizedPnl).toBeNull();
    expect(analysis.executions[2]?.realizedPnl).toBeCloseTo(-1.6155, 4);
    expect(analysis.executions[3]?.realizedPnl).toBeCloseTo(-4.0735, 4);

    const coachFacts = coachTradeExecutionFacts(analysis);
    expect(coachFacts.adverseAdds).toEqual([
      expect.objectContaining({
        quantity: 10,
        price: 10.88,
        secondsAfterOpen: 18,
      }),
    ]);
  });

  it("does not flag a long scale-in above the running average", () => {
    const analysis = analyzeTradeExecutions("long", [
      { side: "buy", quantity: 50, price: 10, executedAt: 1000 },
      { side: "buy", quantity: 50, price: 10.25, executedAt: 1020 },
      { side: "sell", quantity: 100, price: 10.5, executedAt: 1100 },
    ]);

    expect(analysis.averagedDown).toBe(false);
    expect(analysis.addedAgainstPosition).toBe(false);
    expect(analysis.executions.at(-1)?.lifecycle).toBe("close");
    expect(analysis.executions.at(-1)?.realizedPnl).toBeCloseTo(37.5, 6);
  });

  it("mirrors adverse-add detection for a short position", () => {
    const analysis = analyzeTradeExecutions("short", [
      { side: "sell", quantity: 20, price: 10, executedAt: 1000 },
      { side: "sell", quantity: 20, price: 10.5, executedAt: 1010 },
      { side: "buy", quantity: 40, price: 10.25, executedAt: 1100 },
    ]);

    expect(analysis.addedAgainstPosition).toBe(true);
    expect(analysis.averagedDown).toBe(false);
    expect(analysis.executions[1]?.addedAgainstPosition).toBe(true);
    expect(analysis.executions.at(-1)?.realizedPnl).toBeCloseTo(0, 6);
  });

  it("treats NXTC 88 + 12 fills with one broker reference as one 100-share action", () => {
    const analysis = analyzeTradeExecutions("long", [
      {
        id: 1,
        side: "buy",
        quantity: 88,
        price: 10.64,
        executedAt: 1000,
        posEffect: "TO OPEN",
        brokerOrderKey: "order-1",
      },
      {
        id: 2,
        side: "buy",
        quantity: 12,
        price: 10.65,
        executedAt: 1002,
        posEffect: "TO OPEN",
        brokerOrderKey: "order-1",
      },
      {
        id: 3,
        side: "sell",
        quantity: 100,
        price: 10.74,
        executedAt: 1005,
        posEffect: "TO CLOSE",
        brokerOrderKey: "order-2",
      },
    ]);

    expect(analysis.fillCount).toBe(3);
    expect(analysis.executionCount).toBe(2);
    expect(analysis.entryExecutionCount).toBe(1);
    expect(analysis.averagedDown).toBe(false);
    expect(analysis.executions[0]).toMatchObject({
      quantity: 100,
      fillCount: 2,
      fillIds: [1, 2],
      grouping: "broker_ref",
      lifecycle: "open",
    });
    expect(analysis.executions[0]?.price).toBeCloseTo(10.6412, 4);
    expect(coachTradeExecutionFacts(analysis)).toMatchObject({
      fillCount: 3,
      executionCount: 2,
      averagedDown: false,
    });
  });

  it("uses exact timestamp, side, and position effect as the legacy fallback", () => {
    const grouped = groupTradeExecutions([
      { id: 1, side: "buy", quantity: 88, price: 10.64, executedAt: 1000, posEffect: "TO OPEN" },
      { id: 2, side: "buy", quantity: 12, price: 10.64, executedAt: 1000, posEffect: "TO OPEN" },
      { id: 3, side: "buy", quantity: 10, price: 10.5, executedAt: 1010, posEffect: "TO OPEN" },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]).toMatchObject({
      quantity: 100,
      fillCount: 2,
      grouping: "timestamp",
    });
    expect(grouped[1]).toMatchObject({
      quantity: 10,
      fillCount: 1,
      grouping: "single",
    });
  });

  it("keeps separate broker references as intentional actions at the same timestamp", () => {
    const grouped = groupTradeExecutions([
      {
        id: 1,
        side: "buy",
        quantity: 100,
        price: 10.64,
        executedAt: 1000,
        posEffect: "TO OPEN",
        brokerOrderKey: "order-1",
      },
      {
        id: 2,
        side: "buy",
        quantity: 20,
        price: 10.5,
        executedAt: 1000,
        posEffect: "TO OPEN",
        brokerOrderKey: "order-2",
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped.map((execution) => execution.quantity)).toEqual([100, 20]);
  });
});
