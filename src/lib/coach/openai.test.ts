import { describe, expect, it } from "vitest";
import { extractResponseText } from "./openai";

describe("extractResponseText", () => {
  it("reads SDK-style output_text", () => {
    expect(extractResponseText({ output_text: "{\"ok\":true}" })).toBe("{\"ok\":true}");
  });

  it("reads Responses API output content text", () => {
    expect(extractResponseText({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "{\"ok\":true}",
            },
          ],
        },
      ],
    })).toBe("{\"ok\":true}");
  });

  it("throws when no text is present", () => {
    expect(() => extractResponseText({ output: [] })).toThrow("output text");
  });
});
