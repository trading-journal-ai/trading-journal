import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "insights-review-test-"));
  vi.stubEnv("MARKET_INSIGHTS_DIR", dir); vi.resetModules();
  await writeFile(join(dir, "curl-days.json"), JSON.stringify({ days: [{ id: "TEST", curls: [], bars: [[60,4,5,3,4,100], [120,4,5,3,4,100]] }] }));
  await writeFile(join(dir, "labels.json"), JSON.stringify({ schema: "curl-labels:v1", criteria: ["preserve"], days: { TEST: { curls: { "60": { label: "yes", at: "before" } }, missed: [] } } }));
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(dir, { recursive: true, force: true }); });
const observation = { kind: "entry", startT: 60, endT: 60, low: 4, high: 4, mode: "replay", cutoffT: 60, seenThroughT: 60, reason: "Test observation" };
describe("review persistence", () => {
  it("serializes concurrent saves and retains old labels and source provenance", async () => {
    const store = await import("./marketInsightsStore");
    await Promise.all([1,2,3].map(() => store.applyCurlLabelChange(store.parseCurlLabelChange({ dayId: "TEST", observation }))));
    const labels = await store.readCurlLabels();
    expect(labels.days.TEST.observations).toHaveLength(3);
    expect(labels.days.TEST.curls["60"].label).toBe("yes");
    expect(labels.criteria).toEqual(["preserve"]);
    expect(labels.days.TEST.observations?.[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
    const id = labels.days.TEST.observations![0].id;
    await store.applyCurlLabelChange(store.parseCurlLabelChange({ dayId: "TEST", removeObservation: id }));
    expect((await store.readCurlLabels()).days.TEST.observations![0].removedAt).toBeTruthy();
  });
  it("does not replace corrupted labels when saving", async () => {
    const store = await import("./marketInsightsStore");
    await writeFile(join(dir, "labels.json"), "invalid json");
    await expect(store.applyCurlLabelChange(store.parseCurlLabelChange({ dayId: "TEST", observation }))).rejects.toThrow();
    expect(await readFile(join(dir, "labels.json"), "utf8")).toBe("invalid json");
  });
  it("rejects nonexistent day/candle evidence without overwriting the file", async () => {
    const store = await import("./marketInsightsStore");
    const before = await readFile(join(dir, "labels.json"), "utf8");
    await expect(store.applyCurlLabelChange(store.parseCurlLabelChange({ dayId: "MISSING", observation }))).rejects.toThrow();
    await expect(store.applyCurlLabelChange(store.parseCurlLabelChange({ dayId: "TEST", observation: { ...observation, startT: 61, endT: 61, cutoffT: 61, seenThroughT: 61 } }))).rejects.toThrow();
    expect(await readFile(join(dir, "labels.json"), "utf8")).toBe(before);
  });
});
