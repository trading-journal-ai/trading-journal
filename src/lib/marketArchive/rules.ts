export const CORE_MOVER_RULE_VERSION = "core-common-stock-v1" as const;

export const CORE_MOVER_RULES = {
  instrumentType: "CS",
  maxPreviousCloseGapDays: 7,
  minMovePercent: 50,
  minPreviousRegularClose: 1,
  splitExecutionDatesIncluded: false,
} as const;

export type CoreMoverCandidate = {
  instrumentType: string | null;
  maxGainPercent: number | null;
  previousCloseDate: string | null;
  previousRegularClose: number | null;
  sessionDateEt: string;
  splitEvent: boolean;
};

export type CoreMoverExclusionReason =
  | "instrument_not_common_stock"
  | "invalid_session_date"
  | "known_split_execution_date"
  | "missing_previous_close"
  | "previous_close_below_one_dollar"
  | "previous_close_too_old"
  | "move_below_fifty_percent";

export type CoreMoverQualification = {
  excludedBy: CoreMoverExclusionReason[];
  qualifies: boolean;
  ruleVersion: typeof CORE_MOVER_RULE_VERSION;
};

function utcDateNumber(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const rendered = new Date(timestamp).toISOString().slice(0, 10);
  return rendered === value ? timestamp : null;
}

export function calendarDayGap(previousDate: string | null, sessionDate: string): number | null {
  const previous = utcDateNumber(previousDate);
  const session = utcDateNumber(sessionDate);
  if (previous === null || session === null) return null;
  return Math.round((session - previous) / 86_400_000);
}

export function qualifyCoreMover(candidate: CoreMoverCandidate): CoreMoverQualification {
  const excludedBy: CoreMoverExclusionReason[] = [];
  const sessionDate = utcDateNumber(candidate.sessionDateEt);
  const closeGap = calendarDayGap(candidate.previousCloseDate, candidate.sessionDateEt);

  if (candidate.instrumentType !== CORE_MOVER_RULES.instrumentType) {
    excludedBy.push("instrument_not_common_stock");
  }
  if (sessionDate === null) excludedBy.push("invalid_session_date");
  if (candidate.splitEvent) excludedBy.push("known_split_execution_date");
  if (candidate.previousRegularClose === null || !Number.isFinite(candidate.previousRegularClose)) {
    excludedBy.push("missing_previous_close");
  } else if (candidate.previousRegularClose < CORE_MOVER_RULES.minPreviousRegularClose) {
    excludedBy.push("previous_close_below_one_dollar");
  }
  if (closeGap === null || closeGap < 1 || closeGap > CORE_MOVER_RULES.maxPreviousCloseGapDays) {
    excludedBy.push("previous_close_too_old");
  }
  if (
    candidate.maxGainPercent === null
    || !Number.isFinite(candidate.maxGainPercent)
    || candidate.maxGainPercent < CORE_MOVER_RULES.minMovePercent
  ) {
    excludedBy.push("move_below_fifty_percent");
  }

  return {
    excludedBy,
    qualifies: excludedBy.length === 0,
    ruleVersion: CORE_MOVER_RULE_VERSION,
  };
}
