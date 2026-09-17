import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const epoch = (value: string) => Date.parse(value) / 1000;
let load: typeof import("./analyticsTrades").loadAnalyticsTrades;
let daily: typeof import("./analyticsTrades").buildDailyPnl;
let review: typeof import("./loadAnalyticsReview").loadAnalyticsReview;
let calendar: typeof import("./calendarDayTrades").loadCalendarDayTrades;

beforeAll(async () => {
  const path = join(mkdtempSync(join(tmpdir(), "analytics-parity-test-")), "test.db");
  vi.stubEnv("DB_PATH", path);
  vi.stubEnv("DEMO_READ_ONLY", "false");
  const raw = new Database(path);
  for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
    raw.exec(readFileSync(join("drizzle", file), "utf8"));
  }
  raw.exec("INSERT INTO accounts (id, name) VALUES (101, 'Test A'), (102, 'Test B')");
  const trade = raw.prepare(`INSERT INTO trades
    (id, account_id, symbol, side, quantity, entry_at, exit_at, avg_entry_price, avg_exit_price, fees, status)
    VALUES (?, ?, ?, 'long', 10, ?, ?, 10, 11, 2, ?)`);
  const fill = raw.prepare(`INSERT INTO executions
    (account_id, trade_id, symbol, side, quantity, price, fees, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const oldEntry = epoch("2026-01-02T14:00:00Z");
  raw.transaction(() => {
    for (let id = 1; id <= 5001; id++) {
      trade.run(id, 101, "OLD", oldEntry, oldEntry + 60, "closed");
      fill.run(101, id, "OLD", "buy", 10, 10, 1, oldEntry);
      fill.run(101, id, "OLD", "sell", 10, 11, 1, oldEntry + 60);
    }
    const entry = epoch("2026-07-01T14:00:00Z");
    const partial = epoch("2026-07-03T00:30:00Z"); // July 2 in ET.
    const exit = epoch("2026-07-03T14:00:00Z");
    trade.run(6000, 101, "SWING", entry, exit, "closed");
    fill.run(101, 6000, "SWING", "buy", 10, 10, 1, entry);
    fill.run(101, 6000, "SWING", "sell", 4, 11, .4, partial);
    fill.run(101, 6000, "SWING", "sell", 6, 12, .6, exit);
    trade.run(6001, 101, "PARTIAL", entry, null, "open");
    fill.run(101, 6001, "PARTIAL", "buy", 10, 10, 1, entry);
    fill.run(101, 6001, "PARTIAL", "sell", 4, 11, .4, partial);
    trade.run(7000, 102, "OTHER", entry, exit, "closed");
    fill.run(102, 7000, "OTHER", "buy", 10, 10, 0, entry);
    fill.run(102, 7000, "OTHER", "sell", 10, 12, 0, exit);
    // Account scoping must also protect against malformed cross-account links.
    fill.run(102, 6000, "SWING", "sell", 100, 100, 0, partial);
  })();
  raw.exec("INSERT INTO tags (id, name) VALUES (1, 'Test tag'); INSERT INTO trade_tags (trade_id, tag_id) VALUES (6000, 1)");
  raw.close();
  ({ loadAnalyticsReview: review } = await import("./loadAnalyticsReview"));
  ({ loadAnalyticsTrades: load, buildDailyPnl: daily } = await import("./analyticsTrades"));
  ({ loadCalendarDayTrades: calendar } = await import("./calendarDayTrades"));
});
afterAll(() => vi.unstubAllEnvs());

const july = { from: "2026-07-01", to: "2026-07-31" };

describe("Analytics P&L parity", () => {
  it("includes recent sessions after more than 5,000 historical trades", async () => {
    const rows = await load({ range: july }, 101);
    expect(rows.map((row) => row.id)).toEqual([6000, 6001]);
    expect(daily(rows).at(-1)?.cumulative).toBeCloseTo(17.2);
    expect(await load({}, 101)).toHaveLength(5003);
  });

  it("matches the Calendar ledger on every ET date, retaining pre-range cost basis", async () => {
    const points = daily(await load({ range: july }, 101));
    for (const point of points) {
      const ledger = await calendar(101, point.date);
      expect(point.pnl).toBeCloseTo(ledger.reduce((sum, row) => sum + row.pnl, 0));
    }
    const rows = await load({ range: { from: "2026-07-02", to: "2026-07-02" } }, 101);
    expect(daily(rows)).toHaveLength(1);
    expect(daily(rows)[0].pnl).toBeCloseTo(6.4);
  });

  it("keeps all-time totals equal to cumulative realized P&L, including open partial exits", async () => {
    const rows = await load({}, 101);
    expect(rows.find((row) => row.id === 6000)?.pnl).toBeCloseTo(14);
    expect(rows.find((row) => row.id === 6001)?.pnl).toBeCloseTo(3.2);
    expect(rows.reduce((sum, row) => sum + (row.pnl ?? 0), 0)).toBeCloseTo(daily(rows).at(-1)!.cumulative);
    const bounded = await load({ range: { from: "2026-01-01", to: "2026-12-31" } }, 101);
    expect(bounded.map((row) => row.pnl)).toEqual(rows.map((row) => row.pnl));
  });

  it("preserves symbol, side, tag and account filters", async () => {
    expect((await load({ range: july, symbol: "SWI", tag: "Test tag", side: "long" }, 101)).map((row) => row.id)).toEqual([6000]);
    expect(await load({ range: july, side: "short" }, 101)).toEqual([]);
    expect((await load({ range: july }, 102)).map((row) => row.id)).toEqual([7000]);
    expect(daily(await load({ range: july }, 102)).at(-1)?.cumulative).toBeCloseTo(20);
  });

  it("keeps opening-only sessions at zero and empty ranges empty", async () => {
    const opening = await load({ range: { from: "2026-07-01", to: "2026-07-01" } }, 101);
    expect(opening.every((row) => row.pnl === null)).toBe(true);
    expect(daily(opening)[0].cumulative).toBe(0);
    expect(daily(await load({ range: { from: "2026-08-01", to: "2026-08-31" } }, 101))).toEqual([]);
  });
});


describe("completed-trade review loader", () => {
  it("loads full history and excludes partial-open trades without changing the activity ledger", async () => {
    const result = await review(101);
    expect(result.rows).toHaveLength(5002);
    expect(result.rows.find(t => t.id === 6000)?.net).toBe(14);
    expect(result.rows.find(t => t.id === 6000)?.date).toBe("2026-07-03");
    expect(result.rows.find(t => t.id === 6000)?.tags).toEqual(["Test tag"]);
    expect(result.open).toBe(1); expect(result.excluded).toBe(0);
    expect(result.rows.some(t => t.id === 7000)).toBe(false);
  });
  it("scopes executions and fee evidence to the active account", async () => {
    const result = await review(102);
    expect(result.rows.map(t => t.id)).toEqual([7000]);
    expect(result.rows[0].net).toBe(20);
    expect(result.rows[0].unknownFees).toBe(2);
    expect(result.rows[0].tags).toEqual([]);
  });
});
