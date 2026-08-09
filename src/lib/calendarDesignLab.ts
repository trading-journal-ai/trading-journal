import { isValidLabColor } from "@/lib/designLab";

export const CALENDAR_CANDIDATE_ROLES = [
  { key: "cardBg", label: "Card / unselected", cssVar: "--lab-calendar-card-bg" },
  { key: "hoverBg", label: "Hover", cssVar: "--lab-calendar-hover-bg" },
  { key: "selectedBg", label: "Selected", cssVar: "--lab-calendar-selected-bg" },
  { key: "chipBg", label: "Chip fill", cssVar: "--lab-calendar-chip-bg" },
  { key: "chipFg", label: "Chip text", cssVar: "--lab-calendar-chip-fg" },
] as const;

export type CalendarCandidateRole = (typeof CALENDAR_CANDIDATE_ROLES)[number]["key"];
export type CalendarCandidateDrafts = Partial<Record<CalendarCandidateRole, string>>;

const HEX_FRAGMENT = /^(?:#)?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;

export function parsePaletteInput(input: string): string[] {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const part of input.split(/[\s,]+/)) {
    const match = part.trim().match(HEX_FRAGMENT);
    if (!match) continue;
    const value = `#${match[1].toLowerCase()}`;
    if (seen.has(value)) continue;
    seen.add(value);
    values.push(value);
    if (values.length === 8) break;
  }
  return values;
}

export function calendarCandidateErrors(drafts: CalendarCandidateDrafts): Partial<Record<CalendarCandidateRole, string>> {
  const errors: Partial<Record<CalendarCandidateRole, string>> = {};
  for (const role of CALENDAR_CANDIDATE_ROLES) {
    const value = drafts[role.key];
    if (value != null && !isValidLabColor(value)) errors[role.key] = "Enter a valid CSS color.";
  }
  return errors;
}

export function validCalendarCandidates(drafts: CalendarCandidateDrafts): CalendarCandidateDrafts {
  const values: CalendarCandidateDrafts = {};
  for (const role of CALENDAR_CANDIDATE_ROLES) {
    const value = drafts[role.key]?.trim();
    if (value && isValidLabColor(value)) values[role.key] = value;
  }
  return values;
}

export function safeCalendarSelection(value: string, allowedDates: readonly string[], fallback: string): string {
  return allowedDates.includes(value) ? value : fallback;
}
