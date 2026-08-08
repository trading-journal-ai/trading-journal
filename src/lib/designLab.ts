import { ALL_TOKEN_NAMES } from "@/lib/designSystem";

export type LabTokenDrafts = Record<string, string>;

const LAB_TOKEN_NAMES = new Set(ALL_TOKEN_NAMES);
const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const COLOR_FUNCTION = /^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\(.+\)$/i;
const CSS_VARIABLE = /^var\(--[a-z0-9-]+(?:\s*,\s*.+)?\)$/i;
const SAFE_NAMED_COLORS = new Set(["transparent", "currentcolor"]);

export function isLabTokenName(name: string): boolean {
  return LAB_TOKEN_NAMES.has(name);
}

export function isValidLabColor(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || /[;{}]/.test(normalized)) return false;
  if (HEX_COLOR.test(normalized)) return true;
  if (SAFE_NAMED_COLORS.has(normalized.toLowerCase())) return true;
  if (!COLOR_FUNCTION.test(normalized) && !CSS_VARIABLE.test(normalized)) return false;

  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports("color", normalized);
  }

  return true;
}

export function labTokenErrors(drafts: LabTokenDrafts): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [name, value] of Object.entries(drafts)) {
    if (!isLabTokenName(name)) {
      errors[name] = "Unknown design token.";
    } else if (!isValidLabColor(value)) {
      errors[name] = "Enter a valid CSS color.";
    }
  }
  return errors;
}

export function validLabTokenOverrides(drafts: LabTokenDrafts): Record<string, string> {
  const overrides: Record<string, string> = {};
  for (const [name, value] of Object.entries(drafts)) {
    const normalized = value.trim();
    if (isLabTokenName(name) && isValidLabColor(normalized)) overrides[name] = normalized;
  }
  return overrides;
}

export function mergeLabTokenValues(
  baseValues: Record<string, string>,
  overrides: Record<string, string>,
): Record<string, string> {
  return { ...baseValues, ...overrides };
}

export function colorInputValue(value: string): string | null {
  const normalized = value.trim();
  if (/^#[\da-f]{6}$/i.test(normalized)) return normalized;
  if (/^#[\da-f]{8}$/i.test(normalized)) return normalized.slice(0, 7);
  if (/^#[\da-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[\da-f]{4}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1, 4).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}
