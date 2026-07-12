import { describe, expect, it } from "vitest";
import { normalizeSpokenMentions } from "./dictation";

describe("normalizeSpokenMentions", () => {
  it("converts spoken trade mentions with digits", () => {
    expect(normalizeSpokenMentions("I chased at trade 2 and paid for it")).toBe(
      "I chased @trade2 and paid for it",
    );
  });

  it("converts spoken trade mentions with number words", () => {
    expect(normalizeSpokenMentions("At trade two I sized up too early")).toBe(
      "@trade2 I sized up too early",
    );
  });

  it("converts a transcribed @ with a spaced trade reference", () => {
    expect(normalizeSpokenMentions("look @ trade 3 again")).toBe("look @trade3 again");
  });

  it("handles a comma inserted after 'at' by the engine", () => {
    expect(normalizeSpokenMentions("stopped out at, trade 4")).toBe("stopped out @trade4");
  });

  it("leaves times alone", () => {
    expect(normalizeSpokenMentions("I sold at 10:58 into strength")).toBe(
      "I sold at 10:58 into strength",
    );
  });

  it("leaves ordinary prose alone", () => {
    expect(normalizeSpokenMentions("we met at Trader Joe's after the close")).toBe(
      "we met at Trader Joe's after the close",
    );
  });
});
