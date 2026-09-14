import { describe, expect, it } from "vitest";
import {
  readSchwabImportProvider,
  SchwabProviderConfigurationError,
} from "./provider";

describe("Schwab import provider", () => {
  it("requires an explicit owner before using standalone authorization", () => {
    expect(() => readSchwabImportProvider({})).toThrow(SchwabProviderConfigurationError);
    expect(readSchwabImportProvider({ SCHWAB_IMPORT_PROVIDER: " standalone " }))
      .toBe("standalone");
  });

  it("selects gateway explicitly and rejects ambiguous values", () => {
    expect(readSchwabImportProvider({ SCHWAB_IMPORT_PROVIDER: "gateway" }))
      .toBe("gateway");
    expect(() => readSchwabImportProvider({ SCHWAB_IMPORT_PROVIDER: "auto" }))
      .toThrow(SchwabProviderConfigurationError);
  });
});
