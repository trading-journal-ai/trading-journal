import type { CoachReviewPayload } from "@/lib/coach/payload";
import {
  COACH_REVIEW_JSON_SCHEMA,
  parseCoachGeneratedReview,
  type CoachGeneratedReview,
} from "./generatedReview";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.5";

type GenerateCoachReviewResult = {
  model: string;
  review: CoachGeneratedReview;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTextFromContent(content: unknown): string | null {
  if (!Array.isArray(content)) return null;

  for (const item of content) {
    if (!isRecord(item)) continue;
    const text = item.text ?? item.output_text;
    if (typeof text === "string") return text;
  }

  return null;
}

export function extractResponseText(responseBody: unknown): string {
  if (!isRecord(responseBody)) throw new Error("OpenAI response was not a JSON object.");
  if (typeof responseBody.output_text === "string") return responseBody.output_text;

  const output = responseBody.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (!isRecord(item)) continue;
      const text = extractTextFromContent(item.content);
      if (text) return text;
    }
  }

  throw new Error("OpenAI response did not include output text.");
}

function parseResponseJson(responseBody: unknown): CoachGeneratedReview {
  const text = extractResponseText(responseBody);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI response was not valid JSON.");
  }
  return parseCoachGeneratedReview(parsed);
}

export async function generateCoachReview(payload: CoachReviewPayload): Promise<GenerateCoachReviewResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env.local.");

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "You are a post-trade review coach for a momentum trader.",
            "Use only the provided payload. Do not give live trading advice or predict future trades.",
            "Every numeric claim must come from deterministicFacts, executionAnalysis, or opportunityContext. Do not recalculate or invent metrics.",
            "Treat opportunityContext.atEntry.fylMarketRead as the frozen Find Your Levels chart read: explain it, but do not override it from notes, P&L, or hindsight.",
            "Lead with what the chart meant in plain trader language. Use technical terms and measurements only as brief supporting proof; never expose internal reason-code labels in the prose.",
            "Be direct, human, specific, and process-focused. Separate outcome from decision quality.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "coach_review",
          strict: true,
          schema: COACH_REVIEW_JSON_SCHEMA,
        },
      },
    }),
  });

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(responseBody) && isRecord(responseBody.error) && typeof responseBody.error.message === "string"
      ? responseBody.error.message
      : `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return { model, review: parseResponseJson(responseBody) };
}
