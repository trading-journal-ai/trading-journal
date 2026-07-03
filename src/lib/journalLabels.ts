export type JournalLabelTone = "positive" | "negative" | "neutral";

export type JournalLabelOption = {
  value: string;
  label: string;
  tone: JournalLabelTone;
};

export const PRIMARY_TRADE_LABELS: JournalLabelOption[] = [
  { value: "Best setup", label: "Best setup", tone: "positive" },
  { value: "Good trade", label: "Good trade", tone: "positive" },
  { value: "Bad trade", label: "Bad trade", tone: "negative" },
  { value: "Needs review", label: "Needs review", tone: "neutral" },
  { value: "Rule break", label: "Rule break", tone: "negative" },
  { value: "Revenge trade", label: "Revenge trade", tone: "negative" },
  { value: "Chased", label: "Chased", tone: "negative" },
  { value: "Overtraded", label: "Overtraded", tone: "negative" },
];

export const SETUP_PATTERN_CUES: JournalLabelOption[] = [
  { value: "VWAP reclaim", label: "VWAP reclaim", tone: "neutral" },
  { value: "HOD retest", label: "HOD retest", tone: "neutral" },
  { value: "Failed breakdown reclaim", label: "Failed breakdown reclaim", tone: "neutral" },
  { value: "EMA rail", label: "EMA rail", tone: "neutral" },
  { value: "Opening range continuation", label: "Opening range", tone: "neutral" },
  { value: "Extension chase", label: "Extension chase", tone: "neutral" },
];

export const PROCESS_PILLS: JournalLabelOption[] = [
  { value: "Followed plan", label: "Followed plan", tone: "positive" },
  { value: "Patient", label: "Patient", tone: "positive" },
  { value: "Focused", label: "Focused", tone: "positive" },
  { value: "Sized correctly", label: "Sized correctly", tone: "positive" },
  { value: "Cut loss", label: "Cut loss", tone: "positive" },
  { value: "Let winner work", label: "Let winner work", tone: "positive" },
  { value: "Oversized", label: "Oversized", tone: "negative" },
  { value: "Moved stop", label: "Moved stop", tone: "negative" },
  { value: "Added to loser", label: "Added to loser", tone: "negative" },
  { value: "Held too long", label: "Held too long", tone: "negative" },
  { value: "Took profits early", label: "Took profits early", tone: "negative" },
  { value: "Forced trade", label: "Forced trade", tone: "negative" },
];

export const EMOTION_PILLS: JournalLabelOption[] = [
  { value: "Calm", label: "Calm", tone: "positive" },
  { value: "Confident", label: "Confident", tone: "positive" },
  { value: "Frustrated", label: "Frustrated", tone: "negative" },
  { value: "Impatient", label: "Impatient", tone: "negative" },
  { value: "Fearful", label: "Fearful", tone: "negative" },
  { value: "Tilted", label: "Tilted", tone: "negative" },
  { value: "FOMO", label: "FOMO", tone: "negative" },
];

export function journalLabelTone(value: string | null | undefined): JournalLabelTone {
  return (
    PRIMARY_TRADE_LABELS.find((option) => option.value === value)?.tone ??
    PROCESS_PILLS.find((option) => option.value === value)?.tone ??
    EMOTION_PILLS.find((option) => option.value === value)?.tone ??
    "neutral"
  );
}

export function encodeJournalTags(tags: string[]): string | null {
  const cleanTags = tags.map((tag) => tag.trim()).filter(Boolean);
  return cleanTags.length > 0 ? JSON.stringify(cleanTags) : null;
}

export function decodeJournalTags(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
    }
  } catch {
    // Older notes may have used plain text in these fields.
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function filterKnownJournalTags(
  values: FormDataEntryValue[],
  options: JournalLabelOption[],
): string[] {
  const allowed = new Set(options.map((option) => option.value));
  return values
    .map((value) => String(value).trim())
    .filter((value) => allowed.has(value));
}
