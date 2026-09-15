import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ active: vi.fn(), load: vi.fn(), persist: vi.fn() }));
vi.mock("@/lib/accountScope", () => ({ getActiveAccount: mocks.active }));
vi.mock("@/lib/schwab/load", () => ({ loadSchwabNormalizedHistory: mocks.load }));
vi.mock("@/lib/schwab/persist", () => ({ persistSchwabExecutions: mocks.persist }));

describe("compact import destination", () => {
  let destination: typeof import("./destination");
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db/schema");
  let liveId: number;
  let paperId: number;

  beforeAll(async () => {
    process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "tj-import-destination-")), "test.db");
    const raw = new Database(process.env.DB_PATH);
    for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
      raw.exec(readFileSync(join("drizzle", file), "utf8"));
    }
    raw.close();
    ({ db, schema } = await import("@/lib/db"));
    destination = await import("./destination");
    liveId = (await db.insert(schema.accounts).values({ name: "Renamed journal" }).returning().get()).id;
    paperId = (await db.insert(schema.accounts).values({ name: "Paper fixture" }).returning().get()).id;
  });

  it("keeps an unconfigured header account unavailable instead of guessing", async () => {
    mocks.active.mockResolvedValue({ id: liveId, name: "Renamed journal" });
    expect(await destination.getActiveImportDestination()).toEqual({ account: { id: liveId, name: "Renamed journal" }, supported: false });
    await expect(destination.requireImportDestination(liveId)).rejects.toThrow("not available");
  });

  it("follows the header without redirecting Paper into a supported live account", async () => {
    await db.insert(schema.importBatches).values({ accountId: liveId, kind: "executions", source: "schwab_api", fileName: "synthetic", rowCount: 0 });
    mocks.active.mockResolvedValue({ id: paperId, name: "Paper fixture" });
    expect(await destination.getActiveImportDestination()).toEqual({ account: { id: paperId, name: "Paper fixture" }, supported: false });
    await expect(destination.requireImportDestination(paperId)).rejects.toThrow("not available");
    await expect(destination.requireImportDestination(liveId)).rejects.toThrow("header account changed");
    mocks.active.mockResolvedValue({ id: liveId, name: "Renamed journal" });
    expect((await destination.getActiveImportDestination()).supported).toBe(true);
    expect((await destination.requireImportDestination(liveId)).id).toBe(liveId);
    for (const value of ["1", NaN, 1.5, -1, 0, Infinity, 999999]) {
      await expect(destination.requireImportDestination(value)).rejects.toThrow();
    }
  });

  it("holds the selected header account for the request while history is loading", async () => {
    mocks.active.mockResolvedValue({ id: liveId, name: "Renamed journal" });
    mocks.load.mockImplementation(async () => {
      mocks.active.mockResolvedValue({ id: paperId, name: "Paper fixture" });
      return { range: { from: "2026-09-15", to: "2026-09-15" }, accountOption: { label: "Synthetic broker" }, history: { warnings: [] }, normalized: { executions: [], warnings: [] } };
    });
    mocks.persist.mockResolvedValue({ inserted: 0, feesUpdated: 0, reviewExecutions: 0 });
    const { importSchwabExecutions } = await import("@/lib/schwab/import");
    await importSchwabExecutions({ journalAccountId: liveId, accountSelection: "synthetic", from: "2026-09-15", to: "2026-09-15" });
    expect(mocks.persist).toHaveBeenCalledWith(expect.objectContaining({ accountId: liveId }));
    mocks.load.mockClear();
    await expect(importSchwabExecutions({ journalAccountId: liveId, accountSelection: "synthetic", from: "2026-09-15", to: "2026-09-15" })).rejects.toThrow("header account changed");
    expect(mocks.load).not.toHaveBeenCalled();
  });
});
