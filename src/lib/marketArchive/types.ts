import type { CoreMoverExclusionReason } from "./rules";

export type ArchiveUniverse = "core" | "raw";
export type ArchiveSessionLens = "all" | "premarket" | "regular" | "afterHours";
export type ArchiveMoverSort = "dollarVolume" | "gain" | "price" | "rvol" | "symbol";
export type ArchiveSortDirection = "asc" | "desc";

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
  coreExclusionReasons: CoreMoverExclusionReason[];
  date: string;
  instrumentName: string | null;
  instrumentType: string | null;
  lens: ArchiveSessionEvidence;
  peakSession: Exclude<ArchiveSessionLens, "all"> | null;
  previousRegularClose: number | null;
  primaryExchange: string | null;
  qualifiesCore: boolean;
  splitEvent: boolean;
  symbol: string;
};

export type TradingDaySummary = {
  date: string;
  moverCount: number;
};

export type ListMoversInput = {
  date?: string;
  direction?: ArchiveSortDirection;
  from?: string;
  limit?: number;
  offset?: number;
  query?: string;
  session?: ArchiveSessionLens;
  sort?: ArchiveMoverSort;
  to?: string;
  universe?: ArchiveUniverse;
};

export type ListMoversResult = {
  movers: ArchiveMoverSummary[];
  total: number;
};
