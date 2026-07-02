import type { StarterExperiment } from "@/lib/coach/reviewEngine";

export type CoachGeneratedReview = {
  dayVerdict: string;
  whatMatchedPlaybook: string[];
  whatDriftedFromPlaybook: string[];
  keyTradeToStudy: {
    tradeId: number | null;
    symbol: string | null;
    reason: string;
  };
  behaviorPattern: string;
  statisticalRead: string;
  oneExperiment: StarterExperiment;
  confidenceAndMissingContext: string[];
};

export type CoachStoredReview =
  | {
      version: 1;
      model: string;
      generatedAt: string;
      review: CoachGeneratedReview;
    }
  | {
      version: 1;
      generatedAt: string;
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value;
}

function parseTradeToStudy(value: unknown): CoachGeneratedReview["keyTradeToStudy"] | null {
  if (!isRecord(value)) return null;
  const { tradeId, symbol, reason } = value;
  if (tradeId !== null && typeof tradeId !== "number") return null;
  if (symbol !== null && typeof symbol !== "string") return null;
  if (typeof reason !== "string") return null;
  return { tradeId, symbol, reason };
}

function parseExperiment(value: unknown): StarterExperiment | null {
  if (!isRecord(value)) return null;
  const { hypothesis, trigger, action, scope, expires, measure } = value;
  const parsedMeasure = stringArray(measure);
  if (
    typeof hypothesis !== "string" ||
    typeof trigger !== "string" ||
    typeof action !== "string" ||
    typeof scope !== "string" ||
    typeof expires !== "string" ||
    parsedMeasure == null
  ) {
    return null;
  }

  return { hypothesis, trigger, action, scope, expires, measure: parsedMeasure };
}

export function parseCoachGeneratedReview(value: unknown): CoachGeneratedReview {
  if (!isRecord(value)) throw new Error("Coach response was not a JSON object.");

  const {
    dayVerdict,
    whatMatchedPlaybook,
    whatDriftedFromPlaybook,
    keyTradeToStudy,
    behaviorPattern,
    statisticalRead,
    oneExperiment,
    confidenceAndMissingContext,
  } = value;

  const matched = stringArray(whatMatchedPlaybook);
  const drifted = stringArray(whatDriftedFromPlaybook);
  const missingContext = stringArray(confidenceAndMissingContext);
  const tradeToStudy = parseTradeToStudy(keyTradeToStudy);
  const experiment = parseExperiment(oneExperiment);

  if (
    typeof dayVerdict !== "string" ||
    matched == null ||
    drifted == null ||
    tradeToStudy == null ||
    typeof behaviorPattern !== "string" ||
    typeof statisticalRead !== "string" ||
    experiment == null ||
    missingContext == null
  ) {
    throw new Error("Coach response did not match the expected review contract.");
  }

  return {
    dayVerdict,
    whatMatchedPlaybook: matched,
    whatDriftedFromPlaybook: drifted,
    keyTradeToStudy: tradeToStudy,
    behaviorPattern,
    statisticalRead,
    oneExperiment: experiment,
    confidenceAndMissingContext: missingContext,
  };
}

export function parseCoachStoredReview(value: string | null): CoachStoredReview | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.generatedAt !== "string") return null;
    if (typeof parsed.error === "string") {
      return { version: 1, generatedAt: parsed.generatedAt, error: parsed.error };
    }
    if (typeof parsed.model !== "string") return null;
    return {
      version: 1,
      model: parsed.model,
      generatedAt: parsed.generatedAt,
      review: parseCoachGeneratedReview(parsed.review),
    };
  } catch {
    return null;
  }
}

export const COACH_REVIEW_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "dayVerdict",
    "whatMatchedPlaybook",
    "whatDriftedFromPlaybook",
    "keyTradeToStudy",
    "behaviorPattern",
    "statisticalRead",
    "oneExperiment",
    "confidenceAndMissingContext",
  ],
  properties: {
    dayVerdict: { type: "string" },
    whatMatchedPlaybook: { type: "array", items: { type: "string" } },
    whatDriftedFromPlaybook: { type: "array", items: { type: "string" } },
    keyTradeToStudy: {
      type: "object",
      additionalProperties: false,
      required: ["tradeId", "symbol", "reason"],
      properties: {
        tradeId: { type: ["number", "null"] },
        symbol: { type: ["string", "null"] },
        reason: { type: "string" },
      },
    },
    behaviorPattern: { type: "string" },
    statisticalRead: { type: "string" },
    oneExperiment: {
      type: "object",
      additionalProperties: false,
      required: ["hypothesis", "trigger", "action", "scope", "expires", "measure"],
      properties: {
        hypothesis: { type: "string" },
        trigger: { type: "string" },
        action: { type: "string" },
        scope: { type: "string" },
        expires: { type: "string" },
        measure: { type: "array", items: { type: "string" } },
      },
    },
    confidenceAndMissingContext: { type: "array", items: { type: "string" } },
  },
} as const;
