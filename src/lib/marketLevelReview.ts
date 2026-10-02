/** Local prototype contract. All proposals in v1 are completed-chart hindsight. */
export type LevelRole = "support" | "resistance";
export type LevelGeometry = {
  role: LevelRole; low: number; high: number; startT: number; endT: number;
};
export type LevelEvidence = {
  t: number; price: number; role: LevelRole; basis: "wick";
  /** Availability of this pivot only, NOT confirmation of the full-day level. */
  confirmedAt: number;
};
export type LevelProposal = LevelGeometry & {
  id: string; center: number; evidence: LevelEvidence[]; explanation: string;
};
export type LevelDetection = {
  detector: string; parameters: Record<string, number>; proposals: LevelProposal[];
};
export type LevelRun = LevelDetection & {
  id: string; dayId: string; sourceHash: string; mode: "hindsight";
  /** Last input candle start timestamp; availableAt is its close timestamp. */
  asOf: number; availableAt: number;
};
export type LevelDecision = {
  proposalId: string; verdict: "accepted" | "corrected" | "rejected" | "unsure";
  geometry?: LevelGeometry; reason: string;
};
export type AddedLevel = LevelGeometry & { id: string; reason: string };
export type LevelReviewInput = {
  dayId: string; runId: string; baseRevision: number; submissionId: string;
  decisions: LevelDecision[]; added: AddedLevel[];
  /** Whole-chart is an explicit reviewer attestation; absence is otherwise unknown. */
  coverage: "proposals-only" | "whole-chart";
};
export type LevelSubmission = LevelReviewInput & {
  revision: number; submittedAt: string; run: LevelRun;
};
export type LevelReviewState = {
  run: LevelRun; revision: number; latest: LevelSubmission | null;
};
