import "server-only";

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { SchwabHistoryClient } from "./history";
import type { SchwabAccountOption } from "./types";

const DEFAULT_GATEWAY_HOME = path.join(
  /* turbopackIgnore: true */ os.homedir(),
  "Library",
  "Application Support",
  "Schwab Broker Gateway",
);
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
const READ_HEADER = "X-Schwab-Gateway-Read";

type GatewayConfiguration = {
  socketPath: string;
  readCapability: string;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

type GatewayPayload = Record<string, unknown> & { ok?: unknown };

export type SchwabGatewayClient = SchwabHistoryClient & {
  accounts(): Promise<SchwabAccountOption[]>;
};

export class SchwabGatewayError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = "SchwabGatewayError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function gatewayPath(environment: Readonly<Record<string, string | undefined>>) {
  const home = environment.SCHWAB_GATEWAY_HOME?.trim()
    || environment.SCHWAB_BROKER_GATEWAY_HOME?.trim()
    || DEFAULT_GATEWAY_HOME;
  return {
    socketPath: path.resolve(
      /* turbopackIgnore: true */ environment.SCHWAB_GATEWAY_SOCKET?.trim()
        || environment.SCHWAB_BROKER_GATEWAY_SOCKET?.trim()
        || path.join(home, "schwab.sock"),
    ),
    readFile: path.resolve(
      /* turbopackIgnore: true */ environment.SCHWAB_BROKER_GATEWAY_READ_FILE?.trim()
        || path.join(home, "read-token"),
    ),
  };
}

export function readSchwabGatewayConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): GatewayConfiguration {
  const locations = gatewayPath(environment);
  let readCapability = "";
  try {
    readCapability = fs.readFileSync(
      /* turbopackIgnore: true */ locations.readFile,
      "utf8",
    ).trim();
  } catch {
    throw new SchwabGatewayError(
      "SCHWAB_GATEWAY_CONFIGURATION",
      "The Schwab Broker Gateway read capability is unavailable.",
    );
  }
  if (!/^[a-f0-9]{64}$/.test(readCapability)) {
    throw new SchwabGatewayError(
      "SCHWAB_GATEWAY_CONFIGURATION",
      "The Schwab Broker Gateway read capability is invalid.",
    );
  }
  return { socketPath: locations.socketPath, readCapability };
}

function safeGatewayMessage(code: string) {
  if (code === "SCHWAB_AUTHORIZATION_REQUIRED") {
    return "Schwab authorization is required.";
  }
  if (code === "SCHWAB_ACCOUNT_INVALID") {
    return "The selected Schwab account is not authorized.";
  }
  if (code === "SCHWAB_REQUEST_INVALID") {
    return "The Schwab Broker Gateway rejected the history request.";
  }
  return "The Schwab Broker Gateway is unavailable.";
}

function requestJson(
  configuration: GatewayConfiguration,
  requestPath: string,
): Promise<GatewayPayload> {
  const timeoutMs = configuration.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResponseBytes = configuration.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  return new Promise((resolve, reject) => {
    const request = http.request({
      socketPath: configuration.socketPath,
      path: requestPath,
      method: "GET",
      headers: { [READ_HEADER]: configuration.readCapability },
    });
    request.setTimeout(timeoutMs, () => {
      request.destroy(new SchwabGatewayError(
        "SCHWAB_GATEWAY_TIMEOUT",
        "The Schwab Broker Gateway request timed out.",
      ));
    });
    request.on("response", (response) => {
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.length;
        if (received > maxResponseBytes) {
          response.destroy(new SchwabGatewayError(
            "SCHWAB_GATEWAY_RESPONSE_TOO_LARGE",
            "The Schwab Broker Gateway response exceeded the safe size limit.",
          ));
          return;
        }
        chunks.push(buffer);
      });
      response.on("error", reject);
      response.on("end", () => {
        let payload: unknown;
        try {
          payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        } catch {
          reject(new SchwabGatewayError(
            "SCHWAB_GATEWAY_RESPONSE_INVALID",
            "The Schwab Broker Gateway returned an invalid response.",
            response.statusCode ?? null,
          ));
          return;
        }
        if (!isRecord(payload)) {
          reject(new SchwabGatewayError(
            "SCHWAB_GATEWAY_RESPONSE_INVALID",
            "The Schwab Broker Gateway returned an invalid response.",
            response.statusCode ?? null,
          ));
          return;
        }
        if ((response.statusCode ?? 500) >= 400 || payload.ok !== true) {
          const code = typeof payload.code === "string"
            ? payload.code
            : "SCHWAB_GATEWAY_UNAVAILABLE";
          reject(new SchwabGatewayError(
            code,
            safeGatewayMessage(code),
            response.statusCode ?? null,
          ));
          return;
        }
        resolve(payload as GatewayPayload);
      });
    });
    request.on("error", (error) => {
      reject(error instanceof SchwabGatewayError
        ? error
        : new SchwabGatewayError(
          "SCHWAB_GATEWAY_UNAVAILABLE",
          "The Schwab Broker Gateway is unavailable.",
        ));
    });
    request.end();
  });
}

function accountOptions(value: unknown): SchwabAccountOption[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new SchwabGatewayError(
      "SCHWAB_GATEWAY_RESPONSE_INVALID",
      "The Schwab Broker Gateway returned an invalid account list.",
    );
  }
  const accounts = value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const accountValue = typeof entry.value === "string" ? entry.value.trim() : "";
    const label = typeof entry.label === "string" ? entry.label.trim() : "";
    return /^[a-f0-9]{64}$/.test(accountValue) && label
      ? [{ value: accountValue, label }]
      : [];
  });
  if (accounts.length !== value.length) {
    throw new SchwabGatewayError(
      "SCHWAB_GATEWAY_RESPONSE_INVALID",
      "The Schwab Broker Gateway returned an invalid account list.",
    );
  }
  return accounts;
}

function requireArray(payload: GatewayPayload, key: "orders" | "transactions") {
  const value = payload[key];
  if (!Array.isArray(value)) {
    throw new SchwabGatewayError(
      "SCHWAB_GATEWAY_RESPONSE_INVALID",
      `The Schwab Broker Gateway returned an invalid ${key} response.`,
    );
  }
  return value;
}

function historyPath(
  route: "orders" | "transactions",
  account: string,
  from: string,
  to: string,
  maxResults?: number,
) {
  const query = new URLSearchParams({ account, from, to });
  if (maxResults != null) query.set("maxResults", String(maxResults));
  return `/v1/schwab/${route}?${query.toString()}`;
}

export function createSchwabGatewayClient(
  configuration: GatewayConfiguration,
): SchwabGatewayClient {
  return {
    async accounts() {
      const payload = await requestJson(configuration, "/v1/schwab/accounts");
      return accountOptions(payload.accounts);
    },
    async ordersByAccount(account, from, to, _status, maxResults) {
      const payload = await requestJson(
        configuration,
        historyPath("orders", account, from, to, maxResults ?? undefined),
      );
      return requireArray(payload, "orders");
    },
    async transactByAcct(account, transactionTypes, from, to) {
      if (transactionTypes !== "TRADE") {
        throw new SchwabGatewayError(
          "SCHWAB_REQUEST_INVALID",
          "The Journal requests only Schwab trade transactions.",
        );
      }
      const payload = await requestJson(
        configuration,
        historyPath("transactions", account, from, to),
      );
      return requireArray(payload, "transactions");
    },
  };
}

export function getSchwabGatewayClient(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  return createSchwabGatewayClient(readSchwabGatewayConfiguration(environment));
}
