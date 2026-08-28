import { describe, expect, it, vi } from "vitest";
import type { SchwabGatewayClient } from "./gatewayClient";
import { SchwabGatewayError } from "./gatewayClient";
import { getSchwabConnectionState } from "./connection";

function client(accounts: SchwabGatewayClient["accounts"]): SchwabGatewayClient {
  return {
    accounts,
    ordersByAccount: vi.fn(),
    transactByAcct: vi.fn(),
  };
}

describe("Schwab gateway connection", () => {
  it("returns the gateway's masked accounts", async () => {
    await expect(getSchwabConnectionState({
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client(vi.fn().mockResolvedValue([
        { value: "a".repeat(64), label: "Schwab ••••1234" },
      ])),
    })).resolves.toEqual({
      status: "connected",
      accounts: [{ value: "a".repeat(64), label: "Schwab ••••1234" }],
    });
  });

  it("preserves authorization-required as a recoverable state", async () => {
    await expect(getSchwabConnectionState({
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client(vi.fn().mockRejectedValue(new SchwabGatewayError(
        "SCHWAB_AUTHORIZATION_REQUIRED",
        "Schwab authorization is required.",
        401,
      ))),
    })).resolves.toEqual({
      status: "reauth_required",
      recovery: "Authorize Schwab again to continue.",
    });
  });

  it("does not classify gateway outages as authorization failures", async () => {
    const result = await getSchwabConnectionState({
      environment: { SCHWAB_IMPORT_PROVIDER: "gateway" },
      gatewayClient: client(vi.fn().mockRejectedValue(new SchwabGatewayError(
        "SCHWAB_GATEWAY_UNAVAILABLE",
        "The Schwab Broker Gateway is unavailable.",
      ))),
    });
    expect(result.status).toBe("unavailable");
  });
});
