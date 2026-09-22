export const GUIDED_REFLECTION_PROMPTS = [
  "What was the first decision you would change, before the largest loss?",
  "What setup, position size and maximum loss had you defined before that entry, if any?",
  "What would trigger a pause before another entry, and what would you need to see before resuming?",
] as const;

export type GuidedReflection = {
  freeform: string;
  answers: [string, string, string];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type PromptMatch = {
  index: number;
  end: number;
};

function findExactPrompt(body: string, question: string, number: number): PromptMatch | null {
  const expression = new RegExp(`(?:^|\\n)${number}\\. ${escapeRegExp(question)}[ \t]*(?=\\r?\\n|$)`, "g");
  const matches = [...body.matchAll(expression)];
  if (matches.length !== 1 || matches[0].index === undefined) return null;

  const match = matches[0];
  // The leading newline belongs to the separator, not the numbered prompt.
  const index = match.index + (match[0].startsWith("\n") ? 1 : 0);
  return { index, end: match.index + match[0].length };
}

/**
 * Pull structured answers only from a complete, unambiguous legacy prompt set.
 * Any partial, reordered, or edited prompt text remains freeform so a note can
 * never be silently reinterpreted.
 */
export function parseGuidedReflection(body: string): GuidedReflection {
  const matches = GUIDED_REFLECTION_PROMPTS.map((question, index) => findExactPrompt(body, question, index + 1));
  if (matches.some((match) => match === null)) {
    return { freeform: body, answers: ["", "", ""] };
  }

  const [first, second, third] = matches as [PromptMatch, PromptMatch, PromptMatch];
  if (!(first.index < second.index && second.index < third.index)) {
    return { freeform: body, answers: ["", "", ""] };
  }

  const answer = (start: number, end: number) => body.slice(start, end).replace(/^\r?\n/, "").trim();
  return {
    freeform: body.slice(0, first.index).trimEnd(),
    answers: [
      answer(first.end, second.index),
      answer(second.end, third.index),
      answer(third.end, body.length),
    ],
  };
}

/** Serializes guided answers into the existing day-note body without a schema change. */
export function serializeGuidedReflection({ freeform, answers }: GuidedReflection) {
  const prose = freeform.trim();
  if (answers.every((answer) => !answer.trim())) return prose;

  const promptBlock = GUIDED_REFLECTION_PROMPTS.map(
    (question, index) => `${index + 1}. ${question}\n${answers[index].trim()}`,
  ).join("\n\n");
  return [prose, promptBlock].filter(Boolean).join("\n\n");
}
