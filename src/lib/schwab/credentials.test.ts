import { describe, expect, it } from "vitest";
import { readSchwabCredentials, SchwabConfigurationError } from "./credentials";

describe("readSchwabCredentials", () => {
  it("returns trimmed Journal-owned Schwab settings", () => {
    expect(readSchwabCredentials({
      SCHWAB_APP_KEY: " app-key ",
      SCHWAB_SECRET: " app-secret ",
      SCHWAB_REFRESH_TOKEN: " refresh ",
      SCHWAB_CALLBACK_URL: " https://127.0.0.1:5556 ",
    })).toEqual({
      appKey: "app-key",
      appSecret: "app-secret",
      refreshToken: "refresh",
      callbackUrl: "https://127.0.0.1:5556",
    });
  });

  it("reports exactly which settings are missing", () => {
    expect(() => readSchwabCredentials({
      SCHWAB_APP_KEY: "key",
      SCHWAB_SECRET: "",
    })).toThrow(SchwabConfigurationError);
    try {
      readSchwabCredentials({ SCHWAB_APP_KEY: "key" });
    } catch (error) {
      expect(error).toBeInstanceOf(SchwabConfigurationError);
      expect((error as SchwabConfigurationError).missing).toEqual([
        "SCHWAB_SECRET",
        "SCHWAB_REFRESH_TOKEN",
        "SCHWAB_CALLBACK_URL",
      ]);
    }
  });
});
