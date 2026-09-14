import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { SchwabNormalizedExecution } from "./normalize";

const loadHistory = vi.hoisted(() => vi.fn());
const account = vi.hoisted(() => ({ id: 0, name: "Synthetic preview account" }));
vi.mock("./load", () => ({ loadSchwabNormalizedHistory: loadHistory }));
vi.mock("@/lib/accountScope", () => ({ getActiveAccount: async () => account }));

describe("fee-only import preview", () => {
  beforeAll(() => {
    process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "tj-fee-preview-")), "test.db");
    const raw = new Database(process.env.DB_PATH);
    for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
      raw.exec(readFileSync(join("drizzle", file), "utf8"));
    }
    raw.close();
  });

  it("shows actionable fee updates without writing, and agrees with confirmed persistence", async () => {
    const { db, schema } = await import("@/lib/db");
    const { persistSchwabExecutions } = await import("./persist");
    const { buildSchwabImportPreview } = await import("./preview");
    account.id = (await db.insert(schema.accounts).values({ name: account.name }).returning().get()).id;
    const startEpoch = Date.parse("2026-01-15T00:00:00Z") / 1000;
    const fills: SchwabNormalizedExecution[] = [
      { symbol: "SYNTH", side: "buy", quantity: 10, price: 10, executedAt: startEpoch + 600,
        posEffect: "TO OPEN", fees: 0, brokerOrderKey: "order-open", brokerExecutionKey: "fill-open", sourceRowHash: "hash-open" },
      { symbol: "SYNTH", side: "sell", quantity: 10, price: 11, executedAt: startEpoch + 660,
        posEffect: "TO CLOSE", fees: 0, brokerOrderKey: "order-close", brokerExecutionKey: "fill-close", sourceRowHash: "hash-close" },
    ];
    const input = { accountId: account.id, from: "2026-01-15", to: "2026-01-15" };
    await persistSchwabExecutions({ ...input, executions: fills });
    const incoming = [fills[0], { ...fills[1], fees: 0.25, feeBreakdown: { SEC_FEE: 0.25 } }];
    loadHistory.mockResolvedValue({
      range: { from: input.from, to: input.to, startEpoch, endEpochExclusive: startEpoch + 86400 },
      accountOption: { label: "Synthetic broker account" }, history: { warnings: [] },
      normalized: { executions: incoming, ordersRead: 2, transactionsRead: 1, excludedAssets: 0, warnings: [] },
    });
    const beforeExecutions = await db.select().from(schema.executions);
    const beforeTrades = await db.select().from(schema.trades);
    const previewInput = { from: input.from, to: input.to, accountSelection: "synthetic" };
    expect(await buildSchwabImportPreview(previewInput)).toMatchObject({ newExecutions: 0, feeUpdatesAvailable: 1 });
    expect(await db.select().from(schema.executions)).toEqual(beforeExecutions);
    expect(await db.select().from(schema.trades)).toEqual(beforeTrades);
    expect(await db.select().from(schema.executionFees)).toEqual([]);
    expect((await persistSchwabExecutions({ ...input, executions: incoming })).feesUpdated).toBe(1);
    expect(await buildSchwabImportPreview(previewInput)).toMatchObject({ newExecutions: 0, feeUpdatesAvailable: 0 });
  });
});
