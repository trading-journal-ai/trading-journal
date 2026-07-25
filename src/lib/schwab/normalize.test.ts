import { describe, expect, it } from "vitest";
import syntheticHistory from "./__fixtures__/synthetic-history.json";
import { normalizeSchwabHistory } from "./normalize";

const JAN_15_2026 = {
  startEpoch: Date.parse("2026-01-15T00:00:00.000Z") / 1000,
  endEpochExclusive: Date.parse("2026-01-16T00:00:00.000Z") / 1000,
  accountHash: "synthetic-account",
  identitySecret: "synthetic-secret",
};

describe("normalizeSchwabHistory", () => {
  it("keeps partial fills separate and reconciles transaction fees", () => {
    const result = normalizeSchwabHistory(
      syntheticHistory.orders,
      syntheticHistory.transactions,
      JAN_15_2026,
    );

    expect(result.executions).toHaveLength(3);
    expect(result.executions.map((execution) => execution.quantity)).toEqual([40, 60, 70]);
    expect(result.executions.map((execution) => execution.side)).toEqual([
      "buy",
      "buy",
      "sell",
    ]);
    expect(result.executions.map((execution) => execution.posEffect)).toEqual([
      "TO OPEN",
      "TO OPEN",
      "TO CLOSE",
    ]);
    expect(result.executions[2]?.fees).toBeCloseTo(0.25, 8);
    expect(new Set(result.executions.map((execution) => execution.brokerExecutionKey)).size)
      .toBe(3);
    expect(result.executions[0]?.brokerOrderKey).toBe(
      result.executions[1]?.brokerOrderKey,
    );
    expect(result.executions.every((execution) => execution.sourceRowHash.length === 40))
      .toBe(true);
  });

  it("walks child orders and reports unsupported assets without leaking symbols", () => {
    const result = normalizeSchwabHistory(
      [{
        orderId: 1,
        childOrderStrategies: [
          {
            orderId: 2,
            orderLegCollection: [{
              legId: 1,
              instruction: "SELL_SHORT",
              positionEffect: "OPENING",
              instrument: { assetType: "EQUITY", symbol: "CHILD" },
            }],
            orderActivityCollection: [{
              activityId: 3,
              executionLegs: [{
                legId: 1,
                quantity: 5,
                price: 10,
                time: "2026-01-15T15:00:00Z",
              }],
            }],
          },
          {
            orderId: 4,
            orderLegCollection: [{
              legId: 1,
              instruction: "BUY_TO_OPEN",
              positionEffect: "OPENING",
              instrument: { assetType: "OPTION", symbol: "PRIVATE" },
            }],
            orderActivityCollection: [{
              executionLegs: [{
                legId: 1,
                quantity: 1,
                price: 1,
                time: "2026-01-15T15:01:00Z",
              }],
            }],
          },
        ],
      }],
      [],
      JAN_15_2026,
    );

    expect(result.ordersRead).toBe(3);
    expect(result.executions).toHaveLength(1);
    expect(result.executions[0]).toMatchObject({
      symbol: "CHILD",
      side: "sell",
      posEffect: "TO OPEN",
    });
    expect(result.excludedAssets).toBe(1);
    expect(result.warnings.join(" ")).not.toContain("PRIVATE");
  });

  it("ignores canceled activity legs instead of reporting them as malformed fills", () => {
    const result = normalizeSchwabHistory(
      [{
        orderId: 5,
        orderLegCollection: [{
          legId: 1,
          instruction: "BUY",
          positionEffect: "OPENING",
          instrument: { assetType: "EQUITY", symbol: "SYNTH" },
        }],
        orderActivityCollection: [{
          activityId: 6,
          executionType: "CANCELED",
          executionLegs: [{
            legId: 1,
            quantity: 100,
            price: 0,
            time: "2026-01-15T16:00:00Z",
          }],
        }],
      }],
      [],
      JAN_15_2026,
    );

    expect(result.executions).toHaveLength(0);
    expect(result.malformedExecutions).toBe(0);
    expect(result.warnings).toEqual([]);
  });
});
