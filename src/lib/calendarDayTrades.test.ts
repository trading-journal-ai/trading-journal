import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const epoch = (value: string) => Date.parse(value) / 1000;
let load: typeof import("./calendarDayTrades").loadCalendarDayTrades;

beforeAll(async () => {
  const path = join(mkdtempSync(join(tmpdir(), "calendar-day-test-")), "test.db");
  vi.stubEnv("DB_PATH", path); vi.stubEnv("DEMO_READ_ONLY", "false");
  const raw = new Database(path);
  for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) raw.exec(readFileSync(join("drizzle", file), "utf8"));
  raw.close();
  const { db, schema } = await import("@/lib/db");
  await db.insert(schema.accounts).values([{ id: 101, name: "Test account A" }, { id: 102, name: "Test account B" }]);
  const entry = epoch("2026-07-01T14:00:00Z");
  const partial = epoch("2026-07-03T00:30:00Z"); // Still July 2 in ET.
  const exit = epoch("2026-07-03T14:00:00Z");
  await db.insert(schema.trades).values([
    { id: 1, accountId: 101, symbol: "TEST", side: "long", quantity: 10, entryAt: entry, exitAt: exit },
    { id: 2, accountId: 102, symbol: "OTHER", side: "long", quantity: 10, entryAt: entry, exitAt: exit },
  ]);
  await db.insert(schema.executions).values([
    { accountId: 101, tradeId: 1, symbol: "TEST", side: "buy", quantity: 10, price: 10, fees: 1, executedAt: entry },
    { accountId: 101, tradeId: 1, symbol: "TEST", side: "sell", quantity: 4, price: 11, fees: .4, executedAt: partial },
    { accountId: 101, tradeId: 1, symbol: "TEST", side: "sell", quantity: 6, price: 12, fees: .6, executedAt: exit },
    { accountId: 102, tradeId: 2, symbol: "OTHER", side: "buy", quantity: 10, price: 20, fees: 0, executedAt: entry },
    { accountId: 102, tradeId: 2, symbol: "OTHER", side: "sell", quantity: 10, price: 21, fees: 0, executedAt: exit },
    // A malformed cross-account reference must not leak a trade or alter its cost basis.
    { accountId: 102, tradeId: 1, symbol: "TEST", side: "sell", quantity: 100, price: 100, fees: 0, executedAt: partial },
  ]);
  await db.insert(schema.tags).values({ id: 1, name: "Test context" });
  await db.insert(schema.tradeTags).values({ tradeId: 1, tagId: 1 });
  ({ loadCalendarDayTrades: load } = await import("./calendarDayTrades"));
});
afterAll(() => vi.unstubAllEnvs());

describe("calendar day ledger", () => {
  it("uses full history for partial exits, attributes ET dates and retains context", async () => {
    const rows = await load(101, "2026-07-02");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 1, symbol: "TEST", time: "20:30", tags: ["Test context"] });
    expect(rows[0].pnl).toBeCloseTo(3.2);
    expect((await load(101, "2026-07-03"))[0].pnl).toBeCloseTo(10.8);
  });
  it("never returns another account's trades, even with a malformed execution reference", async () => {
    expect(await load(102, "2026-07-02")).toEqual([]);
    expect((await load(102, "2026-07-03")).map((row) => row.symbol)).toEqual(["OTHER"]);
  });
  it("returns an empty list for a date without activity", async () => {
    expect(await load(101, "2026-07-06")).toEqual([]);
  });
});
