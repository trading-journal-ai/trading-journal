import type { TradingApiClient } from "schwab-client-js";
import type { ValidatedSchwabDateRange } from "./dates";

const SCHWAB_ORDER_MAX_RESULTS = 3000;

type HistoryClient = Pick<TradingApiClient, "ordersByAccount" | "transactByAcct">;

export type SchwabHistoryResult = {
  orders: unknown[];
  transactions: unknown[];
  warnings: string[];
};

export class SchwabHistoryResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchwabHistoryResponseError";
  }
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new SchwabHistoryResponseError(`Schwab returned an invalid ${label} response.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordKey(value: unknown, fields: string[]) {
  if (!isRecord(value)) return null;
  const parts = fields.map((field) => value[field]).filter(
    (part) => typeof part === "string" || typeof part === "number",
  );
  return parts.length > 0 ? parts.map(String).join("|") : null;
}

function dedupeRecords(values: unknown[], fields: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = recordKey(value, fields);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchSchwabHistory(
  client: HistoryClient,
  accountHash: string,
  range: ValidatedSchwabDateRange,
): Promise<SchwabHistoryResult> {
  const orders: unknown[] = [];
  const transactions: unknown[] = [];

  for (const chunk of range.orderChunks) {
    const response = requireArray(
      await client.ordersByAccount(
        accountHash,
        chunk.fromIso,
        chunk.toIso,
        null,
        SCHWAB_ORDER_MAX_RESULTS,
      ),
      "order-history",
    );
    if (response.length >= SCHWAB_ORDER_MAX_RESULTS) {
      throw new SchwabHistoryResponseError(
        `Schwab returned ${SCHWAB_ORDER_MAX_RESULTS} orders for ${chunk.from} through ${chunk.to}. Narrow the preview range so results are not silently truncated.`,
      );
    }
    orders.push(...response);
  }

  for (const chunk of range.transactionChunks) {
    const response = requireArray(
      await client.transactByAcct(
        accountHash,
        "TRADE",
        chunk.fromIso,
        chunk.toIso,
      ),
      "trade-transaction",
    );
    transactions.push(...response);
  }

  return {
    orders: dedupeRecords(orders, ["orderId"]),
    transactions: dedupeRecords(transactions, ["activityId", "orderId", "time"]),
    warnings: [
      "Order history includes a seven-day entry lookback so recently entered multi-day orders can contribute fills inside the selected dates.",
    ],
  };
}
