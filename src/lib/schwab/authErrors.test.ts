import { describe, expect, it } from "vitest";
import { schwabRequiresReauthorization } from "./authErrors";

describe("schwabRequiresReauthorization", () => {
  it("recognizes expired and rejected OAuth credentials", () => {
    expect(schwabRequiresReauthorization(new Error("401 Unauthorized"))).toBe(true);
    expect(schwabRequiresReauthorization(new Error("invalid_grant"))).toBe(true);
    expect(schwabRequiresReauthorization(
      new Error("failed to update access token"),
    )).toBe(true);
  });

  it("does not misclassify network and payload errors as reauthorization", () => {
    expect(schwabRequiresReauthorization(new Error("fetch failed"))).toBe(false);
    expect(schwabRequiresReauthorization(new Error("invalid account response"))).toBe(false);
  });
});
