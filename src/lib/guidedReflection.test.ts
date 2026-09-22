import { describe, expect, it } from "vitest";
import {
  GUIDED_REFLECTION_PROMPTS,
  parseGuidedReflection,
  serializeGuidedReflection,
} from "./guidedReflection";

const [first, second, third] = GUIDED_REFLECTION_PROMPTS;

describe("guided reflection notes", () => {
  it("extracts a complete ordered set of exact legacy prompts", () => {
    const body = [
      "Synthetic session context.",
      `1. ${first}\nI would stop after the first invalid entry.`,
      `2. ${second}\nA defined share cap and fixed risk.`,
      `3. ${third}\nA five-minute reset and a clean setup.`,
    ].join("\n\n");

    expect(parseGuidedReflection(body)).toEqual({
      freeform: "Synthetic session context.",
      answers: [
        "I would stop after the first invalid entry.",
        "A defined share cap and fixed risk.",
        "A five-minute reset and a clean setup.",
      ],
    });
  });

  it("keeps ambiguous or incomplete prompt-like text entirely freeform", () => {
    const body = `Scratchpad\n\n1. ${first}\nAn answer without the remaining exact questions.`;
    expect(parseGuidedReflection(body)).toEqual({ freeform: body, answers: ["", "", ""] });
  });

  it("retains trailing answer content instead of dropping it during extraction", () => {
    const body = [
      `1. ${first}\nFirst answer`,
      `2. ${second}\nSecond answer`,
      `3. ${third}\nThird answer with a final synthetic observation.`,
    ].join("\n\n");

    expect(parseGuidedReflection(body).answers[2]).toBe("Third answer with a final synthetic observation.");
  });

  it("keeps optional answers out of the body until at least one is provided", () => {
    expect(serializeGuidedReflection({ freeform: "Synthetic note", answers: ["", "", ""] })).toBe("Synthetic note");
    expect(serializeGuidedReflection({ freeform: "", answers: ["First answer", "", ""] })).toContain(`1. ${first}\nFirst answer`);
  });

  it("round-trips an edited structured reflection without duplicating prompts", () => {
    const body = serializeGuidedReflection({
      freeform: "Synthetic freeform context.",
      answers: ["Updated first answer", "", "Updated final answer"],
    });

    expect(parseGuidedReflection(body)).toEqual({
      freeform: "Synthetic freeform context.",
      answers: ["Updated first answer", "", "Updated final answer"],
    });
    expect(body.match(/1\. What was the first decision/g)).toHaveLength(1);
  });
});


it("recognizes CRLF notes with trailing spaces on question lines", () => {
  const body = "Original reflection\r\n\r\n" + GUIDED_REFLECTION_PROMPTS.map((prompt, index) => `${index + 1}. ${prompt}  \r\nAnswer ${index + 1}`).join("\r\n");
  expect(parseGuidedReflection(body)).toEqual({ freeform: "Original reflection", answers: ["Answer 1", "Answer 2", "Answer 3"] });
});


it("preserves guided answers when only the general reflection is edited or cleared", () => {
  const original = serializeGuidedReflection({ freeform: "Original thoughts", answers: ["First answer", "Second answer", "Third answer"] });
  for (const freeform of ["New overall thoughts about SYN", ""]) {
    const parsed = parseGuidedReflection(original);
    const saved = serializeGuidedReflection({ ...parsed, freeform });
    expect(parseGuidedReflection(saved)).toEqual({ freeform, answers: ["First answer", "Second answer", "Third answer"] });
  }
});
