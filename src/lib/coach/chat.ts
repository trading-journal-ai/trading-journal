const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.5";
const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_CHAT_OUTPUT_TOKENS = 260;

export type CoachChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type CoachChatReply = {
  content: string;
  model: string;
  source: "openai" | "fallback";
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

function extractResponseText(responseBody: unknown): string {
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

function normalizeMessages(messages: CoachChatMessage[]) {
  return messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((message) => message.content.length > 0);
}

export async function generateCoachChatReply(
  messages: CoachChatMessage[],
): Promise<CoachChatReply> {
  const normalizedMessages = normalizeMessages(messages);
  const latestUserMessage = [...normalizedMessages].reverse().find((message) => message.role === "user");
  if (!latestUserMessage) {
    return {
      content: "Start with what happened, what you are feeling, and whether you are still trading.",
      model: "local-fallback",
      source: "fallback",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      content: [
        "The voice loop is working, but the live coach model is not connected yet.",
        "Add OPENAI_API_KEY to .env.local and restart the dev server so I can respond directly to what you said.",
      ].join("\n\n"),
      model: "local-fallback",
      source: "fallback",
    };
  }

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
            "You are an AI trading psychology coach inside a trading journal.",
            "Help the trader debrief completed trades, regulate after frustration, and return to their written process.",
            "Do not give live trade calls, entries, exits, alerts, price targets, or position instructions.",
            "Do not diagnose mental health conditions. If the user suggests self-harm or immediate danger, encourage emergency support.",
            "Be calm, direct, concise, and practical. Prefer questions that create reflection over speeches.",
            "When the trader is spiraling, prioritize stopping new low-quality actions before analysis.",
            "For chat, write 3 to 5 short sentences, usually under 120 words, and end with one clear next question or action.",
          ].join(" "),
        },
        ...normalizedMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      max_output_tokens: MAX_CHAT_OUTPUT_TOKENS,
    }),
  });

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = isRecord(responseBody) && isRecord(responseBody.error) && typeof responseBody.error.message === "string"
      ? responseBody.error.message
      : `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return {
    content: extractResponseText(responseBody).trim(),
    model,
    source: "openai",
  };
}
