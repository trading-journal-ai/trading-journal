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
  it("preserves gateway identities without receiving the OAuth secret", () => {
    const orderKey = "a".repeat(64);
    const executionKey = "b".repeat(64);
    const result = normalizeSchwabHistory([{
      orderId: 42,
      _schwabGatewayOrderKey: orderKey,
      orderLegCollection: [{
        legId: 7,
        instruction: "BUY",
        positionEffect: "OPENING",
        instrument: { assetType: "EQUITY", symbol: "SYNTH" },
      }],
      orderActivityCollection: [{
        activityId: 9,
        executionType: "FILL",
        executionLegs: [{
          legId: 7,
          quantity: 10,
          price: 4.25,
          time: "2026-01-15T15:00:00Z",
          _schwabGatewayExecutionKey: executionKey,
        }],
      }],
    }], [], {
      identityMode: "gateway",
      startEpoch: JAN_15_2026.startEpoch,
      endEpochExclusive: JAN_15_2026.endEpochExclusive,
    });

    expect(result.executions[0]).toMatchObject({
      brokerOrderKey: orderKey,
      brokerExecutionKey: executionKey,
    });
  });

  it("keeps legacy broker identities stable across the gateway boundary", () => {
    const order = {
      orderId: 42,
      orderLegCollection: [{
        legId: 7,
        instruction: "BUY",
        positionEffect: "OPENING",
        instrument: { assetType: "EQUITY", symbol: "SYNTH" },
      }],
      orderActivityCollection: [{
        activityId: 9,
        executionType: "FILL",
        executionLegs: [{
          legId: 7,
          quantity: 10,
          price: 4.25,
          time: "2026-01-15T15:00:00Z",
        }],
      }],
    };
    const legacy = normalizeSchwabHistory([order], [], JAN_15_2026);
    const legacyExecution = legacy.executions[0];
    const decoratedOrder = {
      ...order,
      _schwabGatewayOrderKey: legacyExecution.brokerOrderKey,
      orderActivityCollection: [{
        ...order.orderActivityCollection[0],
        executionLegs: [{
          ...order.orderActivityCollection[0].executionLegs[0],
          _schwabGatewayExecutionKey: legacyExecution.brokerExecutionKey,
        }],
      }],
    };
    const gateway = normalizeSchwabHistory([decoratedOrder], [], {
      identityMode: "gateway",
      startEpoch: JAN_15_2026.startEpoch,
      endEpochExclusive: JAN_15_2026.endEpochExclusive,
    });

    expect(gateway.executions[0]).toMatchObject({
      brokerOrderKey: legacyExecution.brokerOrderKey,
      brokerExecutionKey: legacyExecution.brokerExecutionKey,
      sourceRowHash: legacyExecution.sourceRowHash,
    });
  });

  it("fails closed when gateway execution identities are missing or malformed", () => {
    const history = [{
      orderId: 42,
      _schwabGatewayOrderKey: "a".repeat(64),
      orderLegCollection: [{
        legId: 7,
        instruction: "BUY",
        positionEffect: "OPENING",
        instrument: { assetType: "EQUITY", symbol: "SYNTH" },
      }],
      orderActivityCollection: [{
        activityId: 9,
        executionType: "FILL",
        executionLegs: [{
          legId: 7,
          quantity: 10,
          price: 4.25,
          time: "2026-01-15T15:00:00Z",
          _schwabGatewayExecutionKey: "not-an-identity",
        }],
      }],
    }];

    expect(() => normalizeSchwabHistory(history, [], {
      identityMode: "gateway",
      startEpoch: JAN_15_2026.startEpoch,
      endEpochExclusive: JAN_15_2026.endEpochExclusive,
    })).toThrow("missing or invalid execution identities");
  });

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

  it("imports Schwab ETFs without admitting other collective investments", () => {
    const result = normalizeSchwabHistory(
      [
        {
          orderId: 10,
          orderLegCollection: [{
            legId: 1,
            instruction: "BUY",
            positionEffect: "OPENING",
            instrument: {
              assetType: "COLLECTIVE_INVESTMENT",
              type: "EXCHANGE_TRADED_FUND",
              symbol: "SYNTHETF",
            },
          }],
          orderActivityCollection: [{
            activityId: 11,
            executionType: "FILL",
            executionLegs: [{
              legId: 1,
              quantity: 10,
              price: 25,
              time: "2026-01-15T15:00:00Z",
            }],
          }],
        },
        {
          orderId: 12,
          orderLegCollection: [{
            legId: 1,
            instruction: "BUY",
            positionEffect: "OPENING",
            instrument: {
              assetType: "COLLECTIVE_INVESTMENT",
              type: "MUTUAL_FUND",
              symbol: "PRIVATE_FUND",
            },
          }],
          orderActivityCollection: [{
            activityId: 13,
            executionType: "FILL",
            executionLegs: [{
              legId: 1,
              quantity: 1,
              price: 100,
              time: "2026-01-15T15:01:00Z",
            }],
          }],
        },
      ],
      [],
      JAN_15_2026,
    );

    expect(result.executions).toHaveLength(1);
    expect(result.executions[0]).toMatchObject({
      symbol: "SYNTHETF",
      side: "buy",
      posEffect: "TO OPEN",
    });
    expect(result.excludedAssets).toBe(1);
    expect(result.warnings.join(" ")).toContain("unsupported-asset");
    expect(result.warnings.join(" ")).not.toContain("PRIVATE_FUND");
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
