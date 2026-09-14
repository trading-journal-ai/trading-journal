import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createSchwabGatewayClient,
  readSchwabGatewayConfiguration,
  SchwabGatewayError,
} from "./gatewayClient";

const READ_CAPABILITY = "b".repeat(64);
const sockets: string[] = [];
const servers: http.Server[] = [];

async function gatewayServer(
  handler: (request: http.IncomingMessage, response: http.ServerResponse) => void,
) {
  const socketPath = path.join("/tmp", `journal-gateway-${randomUUID()}.sock`);
  const server = http.createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, resolve);
  });
  sockets.push(socketPath);
  servers.push(server);
  return { socketPath, server };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => {
    server.close(() => resolve());
  })));
  for (const socketPath of sockets.splice(0)) {
    try {
      fs.unlinkSync(socketPath);
    } catch {}
  }
});

describe("Schwab gateway client", () => {
  it("uses the read capability and validates account/history responses", async () => {
    const seen: Array<{ path: string; capability: string | undefined }> = [];
    const { socketPath } = await gatewayServer((request, response) => {
      seen.push({
        path: request.url ?? "",
        capability: request.headers["x-schwab-gateway-read"] as string | undefined,
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      if (request.url === "/v1/schwab/accounts") {
        response.end(JSON.stringify({
          ok: true,
          accounts: [{ value: "a".repeat(64), label: "Schwab ••••1234" }],
        }));
      } else if (request.url?.startsWith("/v1/schwab/orders?")) {
        response.end(JSON.stringify({ ok: true, orders: [{ orderId: 42 }] }));
      } else {
        response.end(JSON.stringify({ ok: true, transactions: [{ activityId: 9 }] }));
      }
    });
    const client = createSchwabGatewayClient({
      socketPath,
      readCapability: READ_CAPABILITY,
    });

    await expect(client.accounts()).resolves.toEqual([
      { value: "a".repeat(64), label: "Schwab ••••1234" },
    ]);
    await expect(client.ordersByAccount(
      "a".repeat(64),
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
      null,
      3000,
    )).resolves.toEqual([{ orderId: 42 }]);
    await expect(client.transactByAcct(
      "a".repeat(64),
      "TRADE",
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    )).resolves.toEqual([{ activityId: 9 }]);
    expect(seen.every((request) => request.capability === READ_CAPABILITY)).toBe(true);
    expect(seen[1]?.path).toContain("maxResults=3000");
  });

  it("returns typed safe errors without reflecting gateway details", async () => {
    const { socketPath } = await gatewayServer((_request, response) => {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        ok: false,
        code: "SCHWAB_AUTHORIZATION_REQUIRED",
        error: "private upstream details",
      }));
    });
    const client = createSchwabGatewayClient({
      socketPath,
      readCapability: READ_CAPABILITY,
    });

    await expect(client.accounts()).rejects.toMatchObject({
      code: "SCHWAB_AUTHORIZATION_REQUIRED",
      status: 401,
      message: "Schwab authorization is required.",
    });
  });

  it("rejects malformed and oversized responses", async () => {
    const malformed = await gatewayServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end("not-json");
    });
    const malformedClient = createSchwabGatewayClient({
      socketPath: malformed.socketPath,
      readCapability: READ_CAPABILITY,
    });
    await expect(malformedClient.accounts()).rejects.toMatchObject({
      code: "SCHWAB_GATEWAY_RESPONSE_INVALID",
    });

    const oversized = await gatewayServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true, accounts: ["x".repeat(200)] }));
    });
    const oversizedClient = createSchwabGatewayClient({
      socketPath: oversized.socketPath,
      readCapability: READ_CAPABILITY,
      maxResponseBytes: 32,
    });
    await expect(oversizedClient.accounts()).rejects.toMatchObject({
      code: "SCHWAB_GATEWAY_RESPONSE_TOO_LARGE",
    });
  });

  it("loads only a valid read capability file", () => {
    const tokenPath = path.join("/tmp", `journal-gateway-token-${randomUUID()}`);
    fs.writeFileSync(tokenPath, `${READ_CAPABILITY}\n`, { mode: 0o600 });
    try {
      expect(readSchwabGatewayConfiguration({
        SCHWAB_GATEWAY_SOCKET: "/tmp/example.sock",
        SCHWAB_BROKER_GATEWAY_READ_FILE: tokenPath,
      })).toEqual({
        socketPath: "/tmp/example.sock",
        readCapability: READ_CAPABILITY,
      });
    } finally {
      fs.unlinkSync(tokenPath);
    }

    expect(() => readSchwabGatewayConfiguration({
      SCHWAB_BROKER_GATEWAY_READ_FILE: "/tmp/does-not-exist-journal-token",
    })).toThrow(SchwabGatewayError);
  });
});
