import { describe, expect, it } from "vitest";
import { assertImportPositionPolicy } from "./positionPolicy";

describe("import position policy", () => {
  const short = [{ symbol: "SYNTH", side: "short" as const }];
  it("preserves compatibility for installations that permit shorts", () => {
    expect(() => assertImportPositionPolicy(short, {})).not.toThrow();
    expect(() => assertImportPositionPolicy(short, { JOURNAL_IMPORT_POSITION_MODE: "long-and-short" })).not.toThrow();
  });
  it("fails closed for an invalid mode", () => {
    expect(() => assertImportPositionPolicy(short, { JOURNAL_IMPORT_POSITION_MODE: "long-onyl" })).toThrow("must be long-only or long-and-short");
  });
});
