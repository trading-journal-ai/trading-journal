import { describe, expect, it } from "vitest";
import {
  isCusip,
  normalizeBrokerSymbol,
  resolveSecurityIdentifier,
} from "./securityIdentifiers";

describe("security identifier normalization", () => {
  it("validates CUSIP check digits", () => {
    expect(isCusip("40423R204")).toBe(true);
    expect(isCusip("40423R205")).toBe(false);
    expect(isCusip("HCWB")).toBe(false);
  });

  it("maps the HCW Biologics post-split CUSIP to HCWB", () => {
    expect(resolveSecurityIdentifier("40423r204")).toEqual({
      identifier: "40423R204",
      symbol: "HCWB",
      issuer: "HCW Biologics Inc.",
    });
    expect(normalizeBrokerSymbol("40423R204").symbol).toBe("HCWB");
  });

  it("detects but does not guess an unknown valid CUSIP", () => {
    expect(resolveSecurityIdentifier("037833100")).toEqual({
      identifier: "037833100",
      symbol: null,
      issuer: null,
    });
    expect(normalizeBrokerSymbol("037833100").symbol).toBe("037833100");
  });
});
