import { createHmac } from "node:crypto";
import type { SchwabAccountOption } from "./types";

type RawAccountNumber = {
  accountNumber: string;
  hashValue: string;
};

export class SchwabAccountResponseError extends Error {
  constructor(message = "Schwab returned no usable authorized accounts.") {
    super(message);
    this.name = "SchwabAccountResponseError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function accountNumberRow(value: unknown): RawAccountNumber | null {
  if (!isRecord(value)) return null;
  const accountNumber =
    typeof value.accountNumber === "string" || typeof value.accountNumber === "number"
      ? String(value.accountNumber).trim()
      : "";
  const hashValue = typeof value.hashValue === "string" ? value.hashValue.trim() : "";
  return accountNumber && hashValue ? { accountNumber, hashValue } : null;
}

function maskedAccountLabel(accountNumber: string) {
  const lastFour = accountNumber.slice(-4).padStart(4, "•");
  return `Schwab ••••${lastFour}`;
}

function opaqueAccountValue(hashValue: string, appSecret: string) {
  return createHmac("sha256", appSecret)
    .update(`trading-journal:schwab-account:${hashValue}`)
    .digest("hex");
}

export function parseSchwabAccountOptions(
  response: unknown,
  appSecret: string,
): SchwabAccountOption[] {
  if (!Array.isArray(response)) throw new SchwabAccountResponseError();
  const options = response.flatMap((value) => {
    const account = accountNumberRow(value);
    return account
      ? [{
          value: opaqueAccountValue(account.hashValue, appSecret),
          label: maskedAccountLabel(account.accountNumber),
        }]
      : [];
  });
  if (options.length === 0) throw new SchwabAccountResponseError();
  return options;
}

export function resolveSchwabAccountHash(
  response: unknown,
  appSecret: string,
  opaqueValue: string,
) {
  if (!Array.isArray(response) || !opaqueValue) return null;
  for (const value of response) {
    const account = accountNumberRow(value);
    if (!account) continue;
    if (opaqueAccountValue(account.hashValue, appSecret) === opaqueValue) {
      return account.hashValue;
    }
  }
  return null;
}
