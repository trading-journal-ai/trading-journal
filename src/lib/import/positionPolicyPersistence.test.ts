import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SchwabNormalizedExecution } from "@/lib/schwab/normalize";

const epoch = (value: string) => Date.parse(value) / 1000;
const entryAt = epoch("2026-06-01T14:00:00Z");
const exitAt = epoch("2026-06-05T14:00:00Z");
function fill(key: string, overrides: Partial<SchwabNormalizedExecution> = {}): SchwabNormalizedExecution {
  return { symbol: "SYNTH", side: "buy", quantity: 10, price: 10, executedAt: entryAt,
    posEffect: "TO OPEN", fees: 0, brokerOrderKey: `order-${key}`, brokerExecutionKey: `broker-${key}`,
    sourceRowHash: `canonical-${key}`, ...overrides };
}
const buy = fill("buy");
const sell = fill("sell", { side: "sell", price: 12, executedAt: exitAt, posEffect: "TO CLOSE" });
let db: typeof import("@/lib/db").db;
let schema: typeof import("@/lib/db/schema");
let persist: typeof import("@/lib/schwab/persist");
let importCsv: typeof import("./persist").importBrokerCsv;
let loadDay: typeof import("@/lib/calendarDayTrades").loadCalendarDayTrades;
let accountId: number;
let accountSequence = 0;
let oldDbPath: string | undefined;

beforeAll(async () => {
  oldDbPath = process.env.DB_PATH;
  process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "long-only-import-")), "test.db");
  const raw = new Database(process.env.DB_PATH);
  for (const file of readdirSync("drizzle").filter(n => n.endsWith(".sql")).sort()) raw.exec(readFileSync(join("drizzle", file), "utf8"));
  raw.close();
  ({ db, schema } = await import("@/lib/db"));
  persist = await import("@/lib/schwab/persist");
  ({ importBrokerCsv: importCsv } = await import("./persist"));
  ({ loadCalendarDayTrades: loadDay } = await import("@/lib/calendarDayTrades"));
});
beforeEach(async () => {
  vi.stubEnv("JOURNAL_IMPORT_POSITION_MODE", "long-only");
  const [account] = await db.insert(schema.accounts).values({ name: `Long-only fixture ${++accountSequence}` }).returning();
  accountId = account.id;
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => { if (oldDbPath === undefined) delete process.env.DB_PATH; else process.env.DB_PATH = oldDbPath; });

const sync = (executions: SchwabNormalizedExecution[]) => persist.persistSchwabExecutions({accountId, from:"2026-06-01", to:"2026-06-05", executions});
async function state() {
  return {
    trades: await db.select().from(schema.trades).where(eq(schema.trades.accountId, accountId)),
    executions: await db.select().from(schema.executions).where(eq(schema.executions.accountId, accountId)),
    batches: await db.select().from(schema.importBatches).where(eq(schema.importBatches.accountId, accountId)),
    fees: await db.select().from(schema.executionFees),
  };
}

describe("long-only import persistence", () => {
  it("rejects a close-first sale atomically, then accepts complete overnight history and dedupes a retry", async () => {
    const before = await state();
    await expect(sync([sell])).rejects.toThrow(/Long-only import stopped: SYNTH.*opening purchase/);
    expect(await state()).toEqual(before);
    await expect(sync([buy, sell])).resolves.toMatchObject({ inserted: 2, tradesCreated: 1 });
    const saved = await state();
    expect(saved.trades).toHaveLength(1);
    expect(saved.trades[0]).toMatchObject({ side: "long", status: "closed", entryAt, exitAt });
    expect(await loadDay(accountId,"2026-06-05")).toMatchObject([{ id:saved.trades[0].id, symbol:"SYNTH", pnl:20 }]);
    await expect(sync([buy, sell])).resolves.toMatchObject({ inserted: 0, duplicates: 2 });
    expect(await state()).toEqual(saved);
  });

  it("rejects invalid configuration before a duplicate-only fee update", async () => {
    await sync([buy]);
    const before = await state();
    vi.stubEnv("JOURNAL_IMPORT_POSITION_MODE", "long-onyl");
    await expect(sync([{...buy,fees:1,feeBreakdown:{COMMISSION:1}}])).rejects.toThrow("must be long-only or long-and-short");
    expect(await state()).toEqual(before);
  });

  it("rejects a sell even when the broker omits position effect", async () => {
    await expect(sync([{...sell, posEffect:null}])).rejects.toThrow("Long-only import stopped");
    expect((await state()).executions).toEqual([]);
  });

  it("uses stored opening fills for partial exits and the final close, preserving trade identity", async () => {
    await sync([buy]);
    const original = (await state()).trades[0];
    await sync([{...sell, quantity:4}]);
    expect((await state()).trades[0]).toMatchObject({id:original.id,side:"long",status:"open"});
    await sync([fill("final", {side:"sell",quantity:6,price:13,executedAt:exitAt+60,posEffect:"TO CLOSE"})]);
    expect((await state()).trades[0]).toMatchObject({id:original.id,side:"long",status:"closed"});
  });

  it("rolls back all changes if a sale exceeds the recorded long", async () => {
    await sync([buy]);
    const before = await state();
    await expect(sync([{...sell,quantity:11}])).rejects.toThrow();
    expect(await state()).toEqual(before);
  });

  it("rolls back fee enrichment and unrelated new fills when a completed short would be created", async () => {
    await sync([buy]);
    const before = await state();
    await expect(sync([
      {...buy,fees:1,feeBreakdown:{COMMISSION:1}},
      fill("valid", {symbol:"VALID"}),
      fill("short-open", {symbol:"SHORTY",side:"sell",posEffect:"TO OPEN"}),
      fill("short-close", {symbol:"SHORTY",side:"buy",executedAt:exitAt,posEffect:"TO CLOSE"}),
    ])).rejects.toThrow("Long-only import stopped: SHORTY");
    expect(await state()).toEqual(before);
  });

  it("does not use another account's buys to cover the sale", async () => {
    const [other] = await db.insert(schema.accounts).values({name:"Other fixture"}).returning();
    await persist.persistSchwabExecutions({accountId:other.id,from:"2026-06-01",to:"2026-06-01",executions:[buy]});
    await expect(sync([sell])).rejects.toThrow("Long-only import stopped");
    expect((await state()).trades).toEqual([]);
  });

  it("blocks grouped short CSV rows before writing any records", async () => {
    const csv = [
      "Open Datetime,Close Datetime,Symbol,Side,Volume,Entry Price,Exit Price,Gross P&L",
      "2026-06-01 10:00:00,2026-06-01 10:01:00,LONGY,L,10,10,11,10",
      "2026-06-01 10:00:00,2026-06-01 10:01:00,SHORTY,S,10,10,9,10",
    ].join("\n");
    const before = await state();
    await expect(importCsv(csv,"synthetic.csv",accountId)).rejects.toThrow("Long-only import stopped: SHORTY");
    expect(await state()).toEqual(before);
  });

  it("blocks close-first execution CSVs through the shared persistence guard", async () => {
    const csv = ["Account Trade History",",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",6/5/26 10:00:00,STOCK,SELL,-10,TO CLOSE,SYNTH,STOCK,12,12,LMT"].join("\n");
    const before = await state();
    await expect(importCsv(csv,"synthetic.csv",accountId)).rejects.toThrow("Long-only import stopped");
    expect(await state()).toEqual(before);
  });
});
