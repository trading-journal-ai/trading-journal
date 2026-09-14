import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import syntheticHistory from "./__fixtures__/synthetic-history.json";
import type { SchwabGatewayClient } from "./gatewayClient";
import { loadSchwabNormalizedHistory } from "./load";

const ACCOUNT = "a".repeat(64);

function identity(label: string) {
  return createHash("sha256").update(label).digest("hex");
}

function decorateOrders(values: unknown[]): unknown[] {
  let executionIndex = 0;
  const visit = (value: unknown): unknown => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
    const order = value as Record<string, unknown>;
    const activities = Array.isArray(order.orderActivityCollection)
      ? order.orderActivityCollection.map((activity) => {
          if (typeof activity !== "object" || activity === null || Array.isArray(activity)) {
            return activity;
          }
          const row = activity as Record<string, unknown>;
          return {
            ...row,
            executionLegs: Array.isArray(row.executionLegs)
              ? row.executionLegs.map((leg) => ({
                  ...(leg as Record<string, unknown>),
                  _schwabGatewayExecutionKey: identity(`execution-${executionIndex++}`),
                }))
              : row.executionLegs,
          };
        })
      : order.orderActivityCollection;
    return {
      ...order,
      _schwabGatewayOrderKey: identity(`order-${String(order.orderId)}`),
      orderActivityCollection: activities,
      childOrderStrategies: Array.isArray(order.childOrderStrategies)
        ? order.childOrderStrategies.map(visit)
        : order.childOrderStrategies,
    };
  };
  return values.map(visit);
}

function gatewayClient(overrides: Partial<SchwabGatewayClient> = {}): SchwabGatewayClient {
  return {
    accounts: vi.fn().mockResolvedValue([
      { value: ACCOUNT, label: "Schwab ••••1234" },
    ]),
    ordersByAccount: vi.fn().mockResolvedValue(
      decorateOrders(syntheticHistory.orders),
    ),
    transactByAcct: vi.fn().mockResolvedValue(syntheticHistory.transactions),
    ...overrides,
  };
}

describe("loadSchwabNormalizedHistory gateway provider", () => {
  it("preserves the Journal normalization pipeline with opaque gateway accounts", async () => {
    const client = gatewayClient();
    const result = await loadSchwabNormalizedHistory({
      accountSelection: ACCOUNT,
      from: "2026-01-15",
      to: "2026-01-15",
    }, {
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client,
    });

    expect(result.accountOption).toEqual({
      value: ACCOUNT,
      label: "Schwab ••••1234",
    });
    expect(result.normalized.executions).toHaveLength(3);
    expect(result.normalized.executions.every(
      (execution) => execution.brokerExecutionKey.length === 64,
    )).toBe(true);
    expect(client.ordersByAccount).toHaveBeenCalled();
    expect(client.transactByAcct).toHaveBeenCalled();
  });

  it("rejects stale account selections before requesting history", async () => {
    const client = gatewayClient();
    await expect(loadSchwabNormalizedHistory({
      accountSelection: "f".repeat(64),
      from: "2026-01-15",
      to: "2026-01-15",
    }, {
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client,
    })).rejects.toMatchObject({ name: "SchwabAccountSelectionError" });
    expect(client.ordersByAccount).not.toHaveBeenCalled();
  });

  it("does not fall back to standalone when the selected gateway fails", async () => {
    const client = gatewayClient({
      accounts: vi.fn().mockRejectedValue(new Error("gateway unavailable")),
    });
    await expect(loadSchwabNormalizedHistory({
      accountSelection: ACCOUNT,
      from: "2026-01-15",
      to: "2026-01-15",
    }, {
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client,
    })).rejects.toThrow("gateway unavailable");
  });
});
