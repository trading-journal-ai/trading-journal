import { describe, expect, it } from "vitest";
import {
  parseSchwabAccountOptions,
  resolveSchwabAccountHash,
  SchwabAccountResponseError,
} from "./accounts";

const RAW_ACCOUNTS = [
  { accountNumber: "12345678", hashValue: "private-account-hash-1" },
  { accountNumber: 87654321, hashValue: "private-account-hash-2" },
];

describe("Schwab account options", () => {
  it("returns masked labels and opaque selection values", () => {
    const options = parseSchwabAccountOptions(RAW_ACCOUNTS, "journal-secret");
    expect(options).toHaveLength(2);
    expect(options.map((option) => option.label)).toEqual([
      "Schwab ••••5678",
      "Schwab ••••4321",
    ]);
    expect(options[0].value).not.toContain("private-account-hash");
    expect(options[0].value).not.toContain("12345678");
  });

  it("resolves an opaque selection only against the authorized account response", () => {
    const [selected] = parseSchwabAccountOptions(RAW_ACCOUNTS, "journal-secret");
    expect(resolveSchwabAccountHash(
      RAW_ACCOUNTS,
      "journal-secret",
      selected.value,
    )).toBe("private-account-hash-1");
    expect(resolveSchwabAccountHash(
      RAW_ACCOUNTS,
      "different-secret",
      selected.value,
    )).toBeNull();
  });

  it("rejects malformed or empty account responses", () => {
    expect(() => parseSchwabAccountOptions({}, "secret")).toThrow(
      SchwabAccountResponseError,
    );
    expect(() => parseSchwabAccountOptions([], "secret")).toThrow(
      SchwabAccountResponseError,
    );
  });
});
