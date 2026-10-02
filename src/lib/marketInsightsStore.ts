import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { parseReviewDraft, validateReviewDay, type ReviewDraft } from "@/lib/marketChartReview";
import { readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  curlAgreement, emptyCurlLabels, zoneReview,
  type CurlDay, type CurlDaySummary, type CurlLabels, type CurlLabelValue, type ZoneRole,
} from "@/lib/marketInsights";

/** Local research files only (gitignored data/evals). Never read by production pages or committed. */
const DIR = resolve(process.env.MARKET_INSIGHTS_DIR ?? "data/evals/market-insights");
const CURL_DAYS = resolve(DIR, "curl-days.json");
const LABELS = resolve(DIR, "labels.json");

let cache: { mtimeMs: number; days: CurlDay[] } | null = null;

export async function readCurlDays(): Promise<CurlDay[] | null> {
  try {
    const { mtimeMs } = await stat(CURL_DAYS);
    if (cache?.mtimeMs !== mtimeMs) {
      const parsed = JSON.parse(await readFile(CURL_DAYS, "utf8")) as { days: CurlDay[] };
      cache = { mtimeMs, days: parsed.days };
    }
    return cache.days;
  } catch {
    return null;
  }
}

export async function curlDaySummaries(): Promise<CurlDaySummary[] | null> {
  const days = await readCurlDays();
  return days?.map(({ id, sym, date, pc, curls }) => ({ id, sym, date, pc, curls: curls.length })) ?? null;
}

type LegacyLabels = { schema?: string; criteria?: string[] };

export async function readCurlLabels(): Promise<CurlLabels> {
  try {
    const parsed = JSON.parse(await readFile(LABELS, "utf8")) as CurlLabels | LegacyLabels;
    if (parsed.schema === "curl-labels:v1") return parsed as CurlLabels;
    // v0 was hand-written from chat; keep its criteria, drop its loose episode list.
    return { ...emptyCurlLabels(), criteria: parsed.criteria ?? [] };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return emptyCurlLabels();
    throw error; // Never replace unreadable existing research labels with an empty file.
  }
}

async function writeCurlLabels(labels: CurlLabels) {
  const temporary = `${LABELS}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(labels, null, 2)}\n`, "utf8");
  await rename(temporary, LABELS);
}

const VALUES = new Set<CurlLabelValue>(["yes", "strong", "maybe", "no", "no-entry"]);
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

const ROLES = new Set<ZoneRole>(["support", "resistance", "flip"]);

type ZoneEdges = { low?: number; high?: number };

export type CurlLabelChange =
  | { dayId: string; observation: ReviewDraft }
  | { dayId: string; removeObservation: string }
  | { dayId: string; key: string; label: CurlLabelValue | null; comment?: string }
  | { dayId: string; missed: { low: string; high: string; label: CurlLabelValue; comment?: string } }
  | { dayId: string; removeMissed: string }
  | { dayId: string; zoneDecision: { id: string; verdict: "keep" | "reject" | null; role?: ZoneRole } & ZoneEdges }
  | { dayId: string; zoneAdd: { id?: string; low: number; high: number; role: ZoneRole; comment?: string } }
  | { dayId: string; zoneRemove: string };

function parseEdges(input: Record<string, unknown>, required: boolean): ZoneEdges {
  const price = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 && value < 100_000;
  if (required && (!price(input.low) || !price(input.high))) throw new Error("Enter the zone's low and high prices.");
  const low = price(input.low) ? Math.round((input.low as number) * 100) / 100 : undefined;
  const high = price(input.high) ? Math.round((input.high as number) * 100) / 100 : undefined;
  if (low != null && high != null && low >= high) throw new Error("A zone's low must be below its high.");
  return { low, high };
}

export function parseCurlLabelChange(value: unknown): CurlLabelChange {
  if (!value || typeof value !== "object") throw new Error("Send a label change as JSON.");
  const input = value as Record<string, unknown>;
  if (typeof input.dayId !== "string" || !input.dayId) throw new Error("Choose a day before labeling.");
  if (typeof input.removeObservation === "string" && input.removeObservation) return { dayId: input.dayId, removeObservation: input.removeObservation };
  if (input.observation !== undefined) return { dayId: input.dayId, observation: parseReviewDraft(input.observation) };
  const comment = typeof input.comment === "string" ? input.comment.slice(0, 500) : undefined;
  if (typeof input.removeMissed === "string") return { dayId: input.dayId, removeMissed: input.removeMissed };
  if (typeof input.zoneRemove === "string") return { dayId: input.dayId, zoneRemove: input.zoneRemove };
  if (input.zoneDecision && typeof input.zoneDecision === "object") {
    const z = input.zoneDecision as Record<string, unknown>;
    if (typeof z.id !== "string" || !z.id) throw new Error("Choose a zone to review.");
    if (z.verdict !== null && z.verdict !== "keep" && z.verdict !== "reject") throw new Error("Choose Keep or Reject for the zone.");
    if (z.role !== undefined && !ROLES.has(z.role as ZoneRole)) throw new Error("Choose support, resistance or flip.");
    return { dayId: input.dayId, zoneDecision: { id: z.id, verdict: z.verdict as "keep" | "reject" | null, role: z.role as ZoneRole | undefined, ...parseEdges(z, false) } };
  }
  if (input.zoneAdd && typeof input.zoneAdd === "object") {
    const z = input.zoneAdd as Record<string, unknown>;
    if (!ROLES.has(z.role as ZoneRole)) throw new Error("Choose support, resistance or flip for the new zone.");
    const edges = parseEdges(z, true) as Required<ZoneEdges>;
    return { dayId: input.dayId, zoneAdd: { id: typeof z.id === "string" ? z.id : undefined, ...edges, role: z.role as ZoneRole,
      comment: typeof z.comment === "string" ? z.comment.slice(0, 500) : undefined } };
  }
  if (input.missed && typeof input.missed === "object") {
    const missed = input.missed as Record<string, unknown>;
    const missedComment = typeof missed.comment === "string" ? missed.comment.slice(0, 500) : undefined;
    if (typeof missed.low !== "string" || !CLOCK.test(missed.low) || typeof missed.high !== "string" || !CLOCK.test(missed.high)) {
      throw new Error("Enter the curl's low and high times as HH:MM in Eastern Time.");
    }
    if (!VALUES.has(missed.label as CurlLabelValue)) throw new Error("Choose a label for the missed curl.");
    return { dayId: input.dayId, missed: { low: missed.low, high: missed.high, label: missed.label as CurlLabelValue, comment: missedComment } };
  }
  if (typeof input.key !== "string" || !input.key) throw new Error("Choose a curl to label.");
  if (input.label !== null && !VALUES.has(input.label as CurlLabelValue)) throw new Error("Choose Strong, Yes, Maybe, No or No entry.");
  return { dayId: input.dayId, key: input.key, label: input.label as CurlLabelValue | null, comment };
}

// Serialize read/modify/write operations within the single preview server.
let pendingWrite: Promise<unknown> = Promise.resolve();
export function applyCurlLabelChange(change: CurlLabelChange): Promise<CurlLabels> {
  const operation = pendingWrite.then(() => applyChange(change));
  pendingWrite = operation.catch(() => undefined);
  return operation;
}

async function applyChange(change: CurlLabelChange): Promise<CurlLabels> {
  const labels = await readCurlLabels();
  const day = (labels.days[change.dayId] ??= { curls: {}, missed: [] });
  const at = new Date().toISOString();
  const zones = (day.zones ??= { decisions: {}, added: [] });
  if ("observation" in change) {
    const sourceDay = (await readCurlDays())?.find((item) => item.id === change.dayId);
    if (!sourceDay) throw new Error("The chart day is unavailable.");
    validateReviewDay(change.observation, sourceDay);
    const sourceHash = createHash("sha256").update(JSON.stringify(sourceDay.bars)).digest("hex");
    (day.observations ??= []).push({ ...change.observation, id: randomUUID(), at, sourceHash });
  } else if ("removeObservation" in change) {
    const observation = day.observations?.find((item) => item.id === change.removeObservation);
    if (observation) observation.removedAt = at;
  } else if ("zoneDecision" in change) {
    const { id, verdict, role, low, high } = change.zoneDecision;
    if (verdict === null) delete zones.decisions[id];
    else {
      const previous = zones.decisions[id];
      zones.decisions[id] = { verdict, at,
        ...(role ?? previous?.role ? { role: role ?? previous?.role } : {}),
        ...(low ?? previous?.low) != null ? { low: low ?? previous?.low } : {},
        ...(high ?? previous?.high) != null ? { high: high ?? previous?.high } : {} };
    }
  } else if ("zoneAdd" in change) {
    const { id, ...zone } = change.zoneAdd;
    const existing = id ? zones.added.find((item) => item.id === id) : undefined;
    if (existing) Object.assign(existing, zone, { at });
    else zones.added.push({ id: `zone-${Date.now()}`, ...zone, at });
  } else if ("zoneRemove" in change) {
    zones.added = zones.added.filter((item) => item.id !== change.zoneRemove);
  } else if ("removeMissed" in change) {
    day.missed = day.missed.filter((item) => item.id !== change.removeMissed);
  } else if ("missed" in change) {
    day.missed.push({ id: `${change.missed.low}-${change.missed.high}-${Date.now()}`, ...change.missed, at });
  } else if (change.label === null) {
    delete day.curls[change.key];
  } else {
    day.curls[change.key] = { label: change.label, ...(change.comment ? { comment: change.comment } : {}), at };
  }
  await writeCurlLabels(labels);
  return labels;
}

export async function curlLabelState() {
  const [days, labels] = await Promise.all([readCurlDays(), readCurlLabels()]);
  return { labels, agreement: curlAgreement(days ?? [], labels), zoneReview: zoneReview(days ?? [], labels) };
}
