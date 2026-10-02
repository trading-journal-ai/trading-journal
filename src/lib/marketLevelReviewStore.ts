import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { CurlDay } from "@/lib/marketInsights";
import { readCurlDays } from "@/lib/marketInsightsStore";
import { detectMarketLevels } from "@/lib/marketLevelDetector";
import type {
  AddedLevel, LevelDecision, LevelEvidence, LevelGeometry, LevelProposal, LevelReviewInput,
  LevelReviewState, LevelRun, LevelSubmission,
} from "@/lib/marketLevelReview";

const FILE = resolve(process.env.MARKET_INSIGHTS_DIR ?? "data/evals/market-insights", "level-reviews.json");
const SCHEMA = "level-reviews:v1";
const HASH = /^[a-f0-9]{64}$/;
const ET_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
type Store = { schema: typeof SCHEMA; submissions: LevelSubmission[] };

export class LevelReviewError extends Error {
  constructor(message: string, public readonly status: number = 400) { super(message); }
}

function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LevelReviewError("Expected a review object.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key))) throw new LevelReviewError("The review contains an unsupported field.");
  return record;
}

function text(value: unknown, name: string, required = true, limit = 200): string {
  if (typeof value !== "string" || value.length > limit || (required && !value.trim())) throw new LevelReviewError(`Enter a valid ${name}.`);
  return value;
}

function number(value: unknown, name: string, integer = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isSafeInteger(value))) throw new LevelReviewError(`Enter a valid ${name}.`);
  return value;
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value) || value.length > 2_000) throw new LevelReviewError("The review list is invalid or too large.");
  return value;
}

function parseGeometry(value: unknown): LevelGeometry {
  const g = object(value, ["role", "low", "high", "startT", "endT"]);
  if (g.role !== "support" && g.role !== "resistance") throw new LevelReviewError("Choose support or resistance.");
  const low = number(g.low, "low price"), high = number(g.high, "high price");
  const startT = number(g.startT, "start candle", true), endT = number(g.endT, "end candle", true);
  if (low <= 0 || low >= high || high >= 100_000 || startT <= 0 || startT > endT) throw new LevelReviewError("Use a positive price band with low below high and ordered candle boundaries.");
  return { role: g.role, low, high, startT, endT };
}

function parseDecision(value: unknown): LevelDecision {
  const d = object(value, ["proposalId", "verdict", "geometry", "reason"]);
  const proposalId = text(d.proposalId, "proposal ID");
  if (d.verdict !== "accepted" && d.verdict !== "corrected" && d.verdict !== "rejected" && d.verdict !== "unsure") throw new LevelReviewError("Choose a review decision.");
  const reason = text(d.reason, "reason", d.verdict !== "accepted", 2_000);
  if (d.verdict === "corrected") return { proposalId, verdict: d.verdict, geometry: parseGeometry(d.geometry), reason };
  if (d.geometry !== undefined) throw new LevelReviewError("Only a corrected proposal can change its geometry.");
  return { proposalId, verdict: d.verdict, reason };
}

function parseAddition(value: unknown): AddedLevel {
  const a = object(value, ["id", "role", "low", "high", "startT", "endT", "reason"]);
  return { ...parseGeometry({ role: a.role, low: a.low, high: a.high, startT: a.startT, endT: a.endT }), id: text(a.id, "added level ID"), reason: text(a.reason, "reason", true, 2_000) };
}

function unique(ids: string[]) {
  if (new Set(ids).size !== ids.length) throw new LevelReviewError("Review IDs must be unique.");
}

function parseInput(value: unknown): LevelReviewInput {
  const input = object(value, ["dayId", "runId", "baseRevision", "submissionId", "decisions", "added", "coverage"]);
  const dayId = text(input.dayId, "day ID"), runId = text(input.runId, "detector run ID");
  if (!HASH.test(runId)) throw new LevelReviewError("Reload the detector run before submitting.");
  const baseRevision = number(input.baseRevision, "base revision", true);
  const submissionId = text(input.submissionId, "submission ID");
  if (input.coverage !== "proposals-only" && input.coverage !== "whole-chart") throw new LevelReviewError("Choose the review coverage.");
  const decisions = list(input.decisions).map(parseDecision), added = list(input.added).map(parseAddition);
  unique(decisions.map((decision) => decision.proposalId));
  unique(added.map((level) => level.id));
  return { dayId, runId, baseRevision, submissionId, decisions, added, coverage: input.coverage };
}

/** Stable object ordering for detector parameters and idempotency; array order is significant. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  return JSON.stringify(value);
}
const hash = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");

function runId(run: Omit<LevelRun, "id">) { return hash(run); }

function parseRun(value: unknown): LevelRun {
  const r = object(value, ["id", "dayId", "sourceHash", "mode", "asOf", "availableAt", "detector", "parameters", "proposals"]);
  const id = text(r.id, "run ID"), dayId = text(r.dayId, "day ID"), sourceHash = text(r.sourceHash, "source hash");
  if (!HASH.test(id) || !HASH.test(sourceHash) || r.mode !== "hindsight") throw new LevelReviewError("Invalid stored run provenance.");
  const asOf = number(r.asOf, "cutoff", true), availableAt = number(r.availableAt, "availability", true);
  if (availableAt !== asOf + 60) throw new LevelReviewError("Invalid run availability.");
  const detector = text(r.detector, "detector version");
  if (!r.parameters || typeof r.parameters !== "object" || Array.isArray(r.parameters)) throw new LevelReviewError("Invalid detector parameters.");
  const parameters: Record<string, number> = {};
  for (const [key, value] of Object.entries(r.parameters)) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new LevelReviewError("Invalid detector parameter.");
    parameters[key] = value;
  }
  const proposals = list(r.proposals).map((value): LevelProposal => {
    const p = object(value, ["id", "role", "low", "high", "startT", "endT", "center", "evidence", "explanation"]);
    const geometry = parseGeometry({ role: p.role, low: p.low, high: p.high, startT: p.startT, endT: p.endT });
    const center = number(p.center, "level center");
    if (center < geometry.low || center > geometry.high || geometry.endT > asOf) throw new LevelReviewError("Invalid proposal boundaries.");
    const evidence = list(p.evidence).map((value): LevelEvidence => {
      const e = object(value, ["t", "price", "role", "basis", "confirmedAt"]);
      const t = number(e.t, "evidence time", true), price = number(e.price, "evidence price"), confirmedAt = number(e.confirmedAt, "confirmation time", true);
      if ((e.role !== "support" && e.role !== "resistance") || e.basis !== "wick" || t < geometry.startT || t > geometry.endT || confirmedAt < t || confirmedAt > availableAt || price <= 0) throw new LevelReviewError("Invalid proposal evidence.");
      return { t, price, role: e.role, basis: e.basis, confirmedAt };
    });
    return { ...geometry, id: text(p.id, "proposal ID"), center, evidence, explanation: text(p.explanation, "explanation", true, 2_000) };
  });
  unique(proposals.map((proposal) => proposal.id));
  const run: LevelRun = { id, dayId, sourceHash, mode: "hindsight", asOf, availableAt, detector, parameters, proposals };
  const { id: storedId, ...content } = run;
  if (storedId !== runId(content)) throw new LevelReviewError("Stored detector run does not match its hash.");
  return run;
}

function validateReview(input: LevelReviewInput, run: LevelRun, candleTimes?: Set<number>) {
  if (input.dayId !== run.dayId || input.runId !== run.id) throw new LevelReviewError("The detector run changed. Reload before submitting.", 409);
  const proposalIds = new Set(run.proposals.map((proposal) => proposal.id));
  if (input.decisions.some((decision) => !proposalIds.has(decision.proposalId))) throw new LevelReviewError("A reviewed proposal is not part of this detector run.");
  if (input.added.some((level) => proposalIds.has(level.id))) throw new LevelReviewError("An added level must have its own ID.");
  if (input.coverage === "whole-chart" && input.decisions.length !== run.proposals.length) throw new LevelReviewError("Decide every proposal before marking the whole chart reviewed.");
  for (const geometry of [...input.decisions.flatMap((decision) => decision.geometry ? [decision.geometry] : []), ...input.added]) {
    if (geometry.endT > run.asOf || (candleTimes && (!candleTimes.has(geometry.startT) || !candleTimes.has(geometry.endT)))) throw new LevelReviewError("Choose boundaries on existing candles in this chart day.");
  }
}

async function currentRun(dayId: string): Promise<{ run: LevelRun; candleTimes: Set<number> }> {
  text(dayId, "day ID");
  const days = await readCurlDays();
  if (!Array.isArray(days)) throw new LevelReviewError("The chart source is unavailable. Reload after restoring the source file.", 503);
  const matches = days.filter((day) => day?.id === dayId);
  if (!matches.length) throw new LevelReviewError("This chart day was not found.", 404);
  if (matches.length !== 1) throw new LevelReviewError("The chart source contains duplicate day IDs.", 503);
  const day: CurlDay = matches[0];
  const times = new Set<number>();
  let previous = -1;
  if (typeof day.sym !== "string" || !day.sym || !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Array.isArray(day.bars) || !day.bars.length) throw new LevelReviewError("The chart source is invalid.", 503);
  for (const bar of day.bars) {
    if (!Array.isArray(bar) || bar.length !== 6 || bar.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new LevelReviewError("The chart contains invalid candles.", 503);
    const [t, open, high, low, close, volume] = bar;
    if (!Number.isSafeInteger(t) || t <= previous || t % 60 !== 0 || t > 8_640_000_000_000 || low <= 0 || high < Math.max(open, close, low) || low > Math.min(open, close) || volume < 0 || ET_DATE.format(new Date(t * 1_000)) !== day.date) throw new LevelReviewError("The chart candles must be ordered, valid, and within this Eastern date.", 503);
    times.add(t); previous = t;
  }
  const content: Omit<LevelRun, "id"> = {
    ...detectMarketLevels(day), dayId, sourceHash: hash(day.bars), mode: "hindsight",
    asOf: previous, availableAt: previous + 60,
  };
  const run = parseRun({ ...content, id: runId(content) });
  // The source is one-minute OHLCV; detector geometry must reference actual input bars.
  if (run.proposals.some((proposal) => !times.has(proposal.startT) || !times.has(proposal.endT) || proposal.evidence.some((e) => !times.has(e.t)))) throw new LevelReviewError("The detector returned invalid candle boundaries.", 503);
  return { run, candleTimes: times };
}

function inputOf(submission: LevelSubmission): LevelReviewInput {
  return { dayId: submission.dayId, runId: submission.runId, baseRevision: submission.baseRevision, submissionId: submission.submissionId, decisions: submission.decisions, added: submission.added, coverage: submission.coverage };
}

async function readStore(): Promise<Store> {
  let raw: string;
  try { raw = await readFile(FILE, "utf8"); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return { schema: SCHEMA, submissions: [] };
    throw new LevelReviewError("The review history could not be read. Existing reviews were left untouched.", 500);
  }
  try {
    const data = object(JSON.parse(raw), ["schema", "submissions"]);
    if (data.schema !== SCHEMA || !Array.isArray(data.submissions)) throw new Error("Invalid schema");
    const revisions = new Map<string, number>(), ids = new Set<string>();
    const submissions = data.submissions.map((value): LevelSubmission => {
      const s = object(value, ["dayId", "runId", "baseRevision", "submissionId", "decisions", "added", "coverage", "revision", "submittedAt", "run"]);
      const input = parseInput({ dayId: s.dayId, runId: s.runId, baseRevision: s.baseRevision, submissionId: s.submissionId, decisions: s.decisions, added: s.added, coverage: s.coverage });
      const run = parseRun(s.run), revision = number(s.revision, "revision", true), submittedAt = text(s.submittedAt, "submission time");
      if (Number.isNaN(Date.parse(submittedAt)) || ids.has(input.submissionId) || revision !== (revisions.get(input.dayId) ?? 0) + 1 || input.baseRevision !== revision - 1) throw new Error("Invalid submission history");
      validateReview(input, run);
      ids.add(input.submissionId); revisions.set(input.dayId, revision);
      return { ...input, run, revision, submittedAt };
    });
    return { schema: SCHEMA, submissions };
  } catch {
    throw new LevelReviewError("The review history is corrupt or incompatible. Restore it before saving; existing reviews were left untouched.", 500);
  }
}

function stateFor(run: LevelRun, store: Store): LevelReviewState {
  const history = store.submissions.filter((submission) => submission.dayId === run.dayId);
  return { run, revision: history.at(-1)?.revision ?? 0, latest: history.filter((submission) => submission.runId === run.id).at(-1) ?? null };
}

export async function getLevelReview(dayId: string): Promise<LevelReviewState> {
  const [{ run }, store] = await Promise.all([currentRun(dayId), readStore()]);
  return stateFor(run, store);
}

// One preview process owns this local file. This queue is not a multi-process lock.
let pending: Promise<unknown> = Promise.resolve();

export async function submitLevelReview(value: unknown): Promise<LevelReviewState> {
  const input = parseInput(value);
  const operation = pending.then(async () => {
    const [{ run, candleTimes }, store] = await Promise.all([currentRun(input.dayId), readStore()]);
    const state = stateFor(run, store);
    const retry = store.submissions.find((submission) => submission.submissionId === input.submissionId);
    if (retry) {
      if (canonical(inputOf(retry)) !== canonical(input)) throw new LevelReviewError("This submission ID was already used for a different review.", 409);
      if (retry.runId !== run.id || retry.revision !== state.revision) throw new LevelReviewError("The chart or review changed after this submission. Reload before continuing.", 409);
      return state;
    }
    if (input.baseRevision !== state.revision) throw new LevelReviewError("This day has a newer review. Reload before submitting.", 409);
    validateReview(input, run, candleTimes);
    store.submissions.push({ ...input, run, revision: state.revision + 1, submittedAt: new Date().toISOString() });
    const temporary = `${FILE}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, `${JSON.stringify(store, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(temporary, FILE);
    } catch {
      throw new LevelReviewError("The review could not be saved. Retry with the same submission; existing reviews were left untouched.", 500);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
    return stateFor(run, store);
  });
  pending = operation.catch(() => undefined);
  return operation;
}
