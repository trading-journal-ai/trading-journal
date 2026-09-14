import type { CoreMoverExclusionReason } from "./rules";

export type ArchiveUniverse = "core" | "raw";
/**
 * Which trading session a mover's high occurred in. Used as a *filter*, never as a
 * display lens — the headline number is always the qualifying peak.
 */
export type ArchivePeakSession = "all" | "premarket" | "regular" | "afterHours";
export type ArchiveMoverSort =
  | "date"
  | "dollarVolume"
  | "gain"
  | "high"
  | "name"
  | "price"
  | "rvol"
  | "symbol"
  | "volume";
export type ArchiveSortDirection = "asc" | "desc";

/** All-session evidence for a mover. Never varies with the peak-session filter. */
export type ArchiveSessionEvidence = {
  activeMinutes: number;
  close: number | null;
  closeDistanceFromHighPercent: number | null;
  dollarVolume: number;
  gainPercent: number | null;
  high: number | null;
  highAt: string | null;
  rvol: number | null;
  transactions: number;
  transactionsPerActiveMinute: number | null;
  volume: number;
};

export type ArchiveMoverSummary = {
  /** After-hours high vs the same session's regular close — the "ran after the bell" read. */
  afterHoursGainFromRegularClosePercent: number | null;
  /** After-hours high vs the prior regular close, so it decomposes the peak gain. */
  afterHoursGainPercent: number | null;
  /**
   * The regular session's high measured from where premarket left off (or the prior
   * close when there was no premarket). Negative means it never took out the
   * premarket high — the move faded rather than continued.
   */
  continuationPercent: number | null;
  coreExclusionReasons: CoreMoverExclusionReason[];
  date: string;
  evidence: ArchiveSessionEvidence;
  instrumentName: string | null;
  instrumentType: string | null;
  peakSession: Exclude<ArchivePeakSession, "all"> | null;
  premarketGainPercent: number | null;
  previousRegularClose: number | null;
  primaryExchange: string | null;
  qualifiesCore: boolean;
  regularGainPercent: number | null;
  splitEvent: boolean;
  symbol: string;
};

export type TradingDaySummary = {
  date: string;
  moverCount: number;
};

export type ListMoversInput = {
  /**
   * Return only movers that did NOT clear the archive threshold. Disjoint from the
   * default set, so the two can be listed together without overlap.
   */
  belowThreshold?: boolean;
  date?: string;
  direction?: ArchiveSortDirection;
  from?: string;
  limit?: number;
  maxGain?: number;
  minGain?: number;
  minRvol?: number;
  offset?: number;
  peakSession?: ArchivePeakSession;
  query?: string;
  sort?: ArchiveMoverSort;
  to?: string;
  universe?: ArchiveUniverse;
};

export type ListMoversResult = {
  movers: ArchiveMoverSummary[];
  total: number;
};

/** Whole-result-set aggregates, so paginated views can still report honest totals. */
export type ArchiveMoverAggregate = {
  days: number;
  dollarVolume: number;
  largestGain: number | null;
  medianGain: number | null;
  symbols: number;
  total: number;
};
