import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CurlDay } from "./marketInsights";
import type { LevelDetection, LevelReviewInput, LevelReviewState, LevelSubmission } from "./marketLevelReview";

const mocks = vi.hoisted(() => ({ detect: vi.fn() }));
vi.mock("@/lib/marketLevelDetector", () => ({ detectMarketLevels: mocks.detect }));
let dir: string;
const start = Date.parse("2026-01-05T14:30:00Z") / 1_000;
const day: CurlDay = {
  id: "TEST-2026-01-05", sym: "TEST", date: "2026-01-05", pc: 4,
  bars: Array.from({ length: 8 }, (_, i) => [start + i * 60, 4, 5, 3, 4, 100]),
  zones: [], priceZones: [], curls: [],
};
const detection: LevelDetection = {
  detector: "test:v1", parameters: { window: 2 },
  proposals: [{
    id: "support-1", role: "support", low: 2.9, high: 3.1, center: 3,
    startT: start, endT: start + 420, explanation: "Two synthetic wick tests.",
    evidence: [0, 3].map((i) => ({ t: start + i * 60, price: 3, role: "support", basis: "wick", confirmedAt: start + (i + 3) * 60 })),
  }],
};
const level = { role: "resistance" as const, low: 4.9, high: 5.1, startT: start, endT: start + 420 };
const labels = JSON.stringify({ schema: "curl-labels:v1", criteria: ["untouched"], days: {} });
const review = (state: LevelReviewState, extra: Partial<LevelReviewInput> = {}): LevelReviewInput => ({
  dayId: day.id, runId: state.run.id, baseRevision: state.revision, submissionId: "submission-1",
  coverage: "proposals-only", decisions: [{ proposalId: "support-1", verdict: "accepted", reason: "" }], added: [], ...extra,
});
const load = () => import("./marketLevelReviewStore");
const history = async () => JSON.parse(await readFile(join(dir, "level-reviews.json"), "utf8")) as { schema: string; submissions: LevelSubmission[] };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "level-reviews-test-"));
  vi.stubEnv("MARKET_INSIGHTS_DIR", dir); vi.resetModules();
  mocks.detect.mockReset().mockReturnValue(structuredClone(detection));
  await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [day] }));
  await writeFile(join(dir, "labels.json"), labels);
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });

describe("level review history", () => {
  it("creates deterministic full-day runs without writing on GET", async () => {
    const store = await load();
    const first = await store.getLevelReview(day.id), second = await store.getLevelReview(day.id);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ revision: 0, latest: null, run: { mode: "hindsight", asOf: start + 420, availableAt: start + 480 } });
    expect(first.run.id).toMatch(/^[a-f0-9]{64}$/); expect(first.run.sourceHash).toMatch(/^[a-f0-9]{64}$/);
    await expect(readFile(join(dir, "level-reviews.json"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("persists original proposals, corrections, additions and explicit coverage across reloads", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    const saved = await store.submitLevelReview(review(initial, {
      coverage: "whole-chart", decisions: [{ proposalId: "support-1", verdict: "corrected", geometry: level, reason: "Actually resistance." }],
      added: [{ ...level, id: "manual-1", reason: "Missed region." }],
    }));
    expect(saved.revision).toBe(1); expect(saved.latest?.run).toEqual(initial.run);
    expect(saved.latest?.run.proposals[0].role).toBe("support");
    expect(saved.latest?.decisions[0].geometry?.role).toBe("resistance");
    vi.resetModules(); expect(await (await load()).getLevelReview(day.id)).toEqual(saved);
    expect(await readFile(join(dir, "labels.json"), "utf8")).toBe(labels);
    expect((await history()).submissions).toHaveLength(1);
  });

  it("retains immutable earlier submissions and returns the newest submission for the current run", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    const first = await store.submitLevelReview(review(initial));
    const second = await store.submitLevelReview(review(first, { submissionId: "submission-2", decisions: [{ proposalId: "support-1", verdict: "rejected", reason: "Single reaction, not a repeated level." }] }));
    expect(second.revision).toBe(2);
    const data = await history();
    expect(data.submissions).toHaveLength(2); expect(data.submissions[0]).toEqual(first.latest);
    expect(second.latest?.decisions[0].verdict).toBe("rejected");
  });

  it("is idempotent for identical current retries but rejects retries after a later review or ID reuse", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id), input = review(initial);
    const first = await store.submitLevelReview(input);
    expect(await store.submitLevelReview(input)).toEqual(first);
    const second = await store.submitLevelReview(review(first, { submissionId: "submission-2" }));
    await expect(store.submitLevelReview(input)).rejects.toMatchObject({ status: 409 });
    expect(await store.getLevelReview(day.id)).toEqual(second);
    await expect(store.submitLevelReview({ ...input, coverage: "whole-chart" })).rejects.toMatchObject({ status: 409 });
    expect((await history()).submissions).toHaveLength(2);
  });

  it("rejects a response-loss retry after the source run changes without duplicating its saved review", async () => {
    let store = await load();
    const initial = await store.getLevelReview(day.id), input = review(initial);
    await store.submitLevelReview(input);
    const before = await readFile(join(dir, "level-reviews.json"), "utf8");
    const changed = structuredClone(day); changed.bars[0][5] = 101;
    await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [changed] }));
    vi.resetModules(); store = await load();
    await expect(store.submitLevelReview(input)).rejects.toMatchObject({ status: 409 });
    const state = await store.getLevelReview(day.id);
    expect(state).toMatchObject({ revision: 1, latest: null });
    expect(state.run.id).not.toBe(initial.run.id);
    expect(await readFile(join(dir, "level-reviews.json"), "utf8")).toBe(before);
  });

  it("serializes competing writes and permits simultaneous identical retries", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    const results = await Promise.allSettled([store.submitLevelReview(review(initial)), store.submitLevelReview(review(initial, { submissionId: "competing" }))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    const next = review(await store.getLevelReview(day.id), { submissionId: "next" });
    const retries = await Promise.all([store.submitLevelReview(next), store.submitLevelReview(next)]);
    expect(retries[0]).toEqual(retries[1]); expect((await history()).submissions).toHaveLength(2);
  });

  it("does not lose another day's concurrent review", async () => {
    const other = { ...day, id: "OTHER-2026-01-05", sym: "OTHER" };
    await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [day, other] }));
    const store = await load(), initial = await store.getLevelReview(day.id), otherInitial = await store.getLevelReview(other.id);
    const results = await Promise.all([store.submitLevelReview(review(initial)), store.submitLevelReview(review(otherInitial, { dayId: other.id, submissionId: "other-day" }))]);
    expect(results.map((r) => r.revision)).toEqual([1, 1]); expect((await history()).submissions).toHaveLength(2);
  });

  it("changes runs when source candles change, retaining per-day revision and stale-run protection", async () => {
    let store = await load();
    const initial = await store.getLevelReview(day.id), first = await store.submitLevelReview(review(initial));
    const changed = structuredClone(day); changed.bars[0][5] = 101;
    await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [changed] }));
    vi.resetModules(); store = await load();
    const next = await store.getLevelReview(day.id);
    expect(next.run.sourceHash).not.toBe(initial.run.sourceHash); expect(next.run.id).not.toBe(initial.run.id);
    expect(next.revision).toBe(1); expect(next.latest).toBeNull();
    await expect(store.submitLevelReview(review(first, { submissionId: "old-run" }))).rejects.toMatchObject({ status: 409 });
    await expect(store.submitLevelReview(review(next, { submissionId: "old-revision", baseRevision: 0 }))).rejects.toMatchObject({ status: 409 });
    const saved = await store.submitLevelReview(review(next, { submissionId: "new-run" }));
    expect(saved.revision).toBe(2); expect((await history()).submissions[0].run).toEqual(initial.run);
  });

  it("includes detector version, parameters and proposed geometry in the run identity", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    for (const changed of [
      { ...detection, detector: "test:v2" }, { ...detection, parameters: { window: 3 } },
      { ...detection, proposals: [{ ...detection.proposals[0], high: 3.2 }] },
    ]) {
      mocks.detect.mockReturnValue(changed);
      const next = await store.getLevelReview(day.id);
      expect(next.run.id).not.toBe(initial.run.id); expect(next.run.sourceHash).toBe(initial.run.sourceHash);
    }
  });

  it("persists a real detector run using timestamped synthetic candle data", async () => {
    const actual = await vi.importActual<typeof import("./marketLevelDetector")>("./marketLevelDetector");
    mocks.detect.mockImplementation(actual.detectMarketLevels);
    const fixture: CurlDay = { ...day, bars: Array.from({ length: 23 }, (_, i) => [start + i * 60, 10, [3, 10, 18].includes(i) ? 10.5 : 10.1, 9.9, 10, 100]) };
    await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [fixture] }));
    const store = await load(), initial = await store.getLevelReview(day.id);
    expect(initial.run.proposals).toHaveLength(1);
    const saved = await store.submitLevelReview(review(initial, { coverage: "whole-chart", decisions: initial.run.proposals.map((proposal) => ({ proposalId: proposal.id, verdict: "accepted", reason: "" })) }));
    expect(await store.getLevelReview(day.id)).toEqual(saved);
    expect(saved.latest?.run.detector).toBe(initial.run.detector);
  });

  it("rejects malformed source data rather than proposing or writing against it", async () => {
    const invalid = structuredClone(day); invalid.bars[1][0] = start - 60;
    await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [invalid] }));
    await expect((await load()).getLevelReview(day.id)).rejects.toMatchObject({ status: 503 });
    expect(mocks.detect).not.toHaveBeenCalled();
  });

  it.each(["not-json", JSON.stringify({ schema: "other", submissions: [] }), JSON.stringify({ schema: "level-reviews:v1", submissions: [{}] })])("fails closed on invalid stored history", async (corrupt) => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    await writeFile(join(dir, "level-reviews.json"), corrupt);
    await expect(store.getLevelReview(day.id)).rejects.toMatchObject({ status: 500 });
    await expect(store.submitLevelReview(review(initial))).rejects.toMatchObject({ status: 500 });
    expect(await readFile(join(dir, "level-reviews.json"), "utf8")).toBe(corrupt);
  });

  it("detects a tampered run hash and revision gaps in otherwise valid JSON", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    await store.submitLevelReview(review(initial));
    const original = await history();
    for (const change of [
      (data: typeof original) => { data.submissions[0].run.proposals[0].high = 3.2; },
      (data: typeof original) => { data.submissions[0].revision = 2; },
    ]) {
      const invalid = structuredClone(original); change(invalid);
      const raw = JSON.stringify(invalid); await writeFile(join(dir, "level-reviews.json"), raw);
      await expect(store.submitLevelReview(review(initial))).rejects.toMatchObject({ status: 500 });
      expect(await readFile(join(dir, "level-reviews.json"), "utf8")).toBe(raw);
    }
  });
});

describe("review validation", () => {
  it("requires every proposal for whole-chart coverage, while allowing partial/uncertain review", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    await expect(store.submitLevelReview(review(initial, { coverage: "whole-chart", decisions: [] }))).rejects.toMatchObject({ status: 400 });
    const partial = await store.submitLevelReview(review(initial, { decisions: [] }));
    const whole = await store.submitLevelReview(review(partial, { submissionId: "whole", coverage: "whole-chart", decisions: [{ proposalId: "support-1", verdict: "unsure", reason: "Needs another test." }] }));
    expect(whole.latest?.coverage).toBe("whole-chart");
  });

  it("rejects invalid payloads without touching existing history", async () => {
    const store = await load(), initial = await store.getLevelReview(day.id);
    const saved = await store.submitLevelReview(review(initial));
    const good = review(saved, { submissionId: "next" }), original = await readFile(join(dir, "level-reviews.json"), "utf8");
    const invalid: unknown[] = [
      { ...good, unrecognized: true }, { ...good, baseRevision: 1.5 }, { ...good, coverage: "all" },
      { ...good, decisions: [{ proposalId: "support-1", verdict: "accepted", reason: "", geometry: level }] },
      { ...good, decisions: [{ proposalId: "support-1", verdict: "corrected", reason: "", geometry: level }] },
      { ...good, decisions: [{ proposalId: "support-1", verdict: "corrected", reason: "Change" }] },
      { ...good, decisions: [{ proposalId: "support-1", verdict: "rejected", reason: " " }] },
      { ...good, decisions: [{ proposalId: "unknown", verdict: "accepted", reason: "" }] },
      { ...good, decisions: [...good.decisions, ...good.decisions] },
      ...[
        { ...level, high: Number.NaN }, { ...level, low: Number.POSITIVE_INFINITY }, { ...level, high: 0 },
        { ...level, low: level.high }, { ...level, role: "flip" }, { ...level, startT: start + 1 },
        { ...level, endT: start + 480 }, { ...level, startT: start - 60 }, { ...level, endT: start - 60 },
        { ...level, unexpected: true },
      ].map((geometry) => ({ ...good, decisions: [{ proposalId: "support-1", verdict: "corrected", reason: "Correction", geometry }] })),
      { ...good, added: [{ ...level, id: "support-1", reason: "Duplicate" }] },
      { ...good, added: [{ ...level, id: "manual", reason: "" }] },
      { ...good, added: [1, 2].map(() => ({ ...level, id: "manual", reason: "Duplicate" })) },
    ];
    for (const input of invalid) await expect(store.submitLevelReview(input)).rejects.toMatchObject({ status: 400 });
    expect(await readFile(join(dir, "level-reviews.json"), "utf8")).toBe(original);
  });
});
