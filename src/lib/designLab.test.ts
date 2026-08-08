import { describe, expect, it } from "vitest";

import {
  colorInputValue,
  isValidLabColor,
  labTokenErrors,
  mergeLabTokenValues,
  validLabTokenOverrides,
} from "@/lib/designLab";

describe("Design Lab token validation", () => {
  it("accepts the color formats used by the design system", () => {
    expect(isValidLabColor("#ffffff")).toBe(true);
    expect(isValidLabColor("#fff8")).toBe(true);
    expect(isValidLabColor("rgba(31, 35, 40, 0.08)")).toBe(true);
    expect(isValidLabColor("oklch(80% 0.1 220)")).toBe(true);
    expect(isValidLabColor("var(--foreground)")).toBe(true);
    expect(isValidLabColor("transparent")).toBe(true);
  });

  it("rejects empty, malformed, and injectable values", () => {
    expect(isValidLabColor("")).toBe(false);
    expect(isValidLabColor("not a color")).toBe(false);
    expect(isValidLabColor("#fff; background: red")).toBe(false);
    expect(isValidLabColor("rgb(1, 2, 3) }")).toBe(false);
  });

  it("reports unknown tokens and excludes invalid overrides", () => {
    const drafts = {
      "--background": "#ffffff",
      "--surface": "bad",
      "--not-a-token": "#000000",
    };

    expect(labTokenErrors(drafts)).toEqual({
      "--surface": "Enter a valid CSS color.",
      "--not-a-token": "Unknown design token.",
    });
    expect(validLabTokenOverrides(drafts)).toEqual({ "--background": "#ffffff" });
  });
});

describe("Design Lab token presentation", () => {
  it("merges valid overrides over base values without mutating either input", () => {
    const base = { "--background": "#f6f8fa", "--surface": "#ffffff" };
    const overrides = { "--background": "#ffffff" };

    expect(mergeLabTokenValues(base, overrides)).toEqual({
      "--background": "#ffffff",
      "--surface": "#ffffff",
    });
    expect(base["--background"]).toBe("#f6f8fa");
  });

  it("normalizes supported hex values for the native color input", () => {
    expect(colorInputValue("#abc")).toBe("#aabbcc");
    expect(colorInputValue("#11223344")).toBe("#112233");
    expect(colorInputValue("rgba(1, 2, 3, 0.5)")).toBeNull();
  });
});
