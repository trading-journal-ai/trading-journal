import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import { parseCsvRows } from "./csv";

const TOS_SAMPLE = "data/samples/2026-03-04-AccountStatement.csv";
const DEMO_SAMPLE = "samples/demo/trades.csv";
const HAS_TOS_SAMPLE = readOptional(TOS_SAMPLE) != null;

function readOptional(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

describe("broker CSV imports", () => {
  let mod: typeof import("./persist");
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db/schema");
  let tosCsv: string | null;
  let demoCsv: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), "tj-"));
    process.env.DB_PATH = join(dir, "test.db");
    const raw = new Database(process.env.DB_PATH);
    for (const f of readdirSync("drizzle")
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      raw.exec(readFileSync(join("drizzle", f), "utf8"));
    }
    raw.close();
    tosCsv = readOptional(TOS_SAMPLE);
    demoCsv = readFileSync(DEMO_SAMPLE, "utf8");
    mod = await import("./persist");
    ({ db } = await import("@/lib/db"));
    schema = await import("@/lib/db/schema");
  });

  it.runIf(HAS_TOS_SAMPLE)("inserts TOS executions + trades, then is idempotent", async () => {
    const first = await mod.importBrokerCsv(tosCsv!, "sample.csv", 1);
    expect(first.source).toBe("tos_csv");
    expect(first.parsed).toBe(91);
    expect(first.inserted).toBe(91);
    expect(first.duplicates).toBe(0);
    expect(first.trades).toBe(31);

    const second = await mod.importBrokerCsv(tosCsv!, "sample.csv", 1);
    expect(second.source).toBe("tos_csv");
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(91);
    expect(second.trades).toBe(0);
  });

  it("inserts DAS trade summaries as open/close executions, then is idempotent", async () => {
    const first = await mod.importBrokerCsv(demoCsv, "demo-trades-and-notes.csv", 1);
    expect(first.source).toBe("das_csv");
    expect(first.parsed).toBe(2414);
    expect(first.inserted).toBe(2414);
    expect(first.duplicates).toBe(0);
    expect(first.trades).toBe(1207);
    expect(first.parsedFrom).toBe("2026-01-05");
    expect(first.parsedTo).toBe("2026-06-16");

    const [headers, ...rows] = parseCsvRows(demoCsv);
    const grossPnlIndex = headers.indexOf("Gross P&L");
    const csvPnl = rows.reduce((sum, row) => sum + Number(row[grossPnlIndex] || 0), 0);
    const imported = await db
      .select({
        pnl: sql<number>`sum((case when ${schema.trades.side} = 'long' then ${schema.trades.avgExitPrice} - ${schema.trades.avgEntryPrice} else ${schema.trades.avgEntryPrice} - ${schema.trades.avgExitPrice} end) * ${schema.trades.quantity} - ${schema.trades.fees})`,
      })
      .from(schema.trades)
      .where(sql`${schema.trades.id} in (
        select distinct ${schema.executions.tradeId}
        from ${schema.executions}
        inner join ${schema.importBatches}
          on ${schema.importBatches.id} = ${schema.executions.importBatchId}
        where ${schema.importBatches.source} = 'das_csv'
      )`)
      .get();
    expect(imported?.pnl ?? 0).toBeCloseTo(csvPnl, 2);

    const volumeIndex = headers.indexOf("Volume");
    const firstVolume = Number(rows[0][volumeIndex] || 0);
    const firstTrade = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.trades)
      .where(
        sql`${schema.trades.symbol} = ${rows[0][headers.indexOf("Symbol")]} and ${schema.trades.quantity} = ${Math.round(firstVolume / 2)}`,
      )
      .get();
    expect(firstTrade?.count ?? 0).toBeGreaterThan(0);

    const second = await mod.importBrokerCsv(demoCsv, "demo-trades-and-notes.csv", 1);
    expect(second.source).toBe("das_csv");
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(2414);
    expect(second.trades).toBe(0);
  });

  it("normalizes CUSIP executions and repairs matching historical rows on reimport", async () => {
    const cusipStatement = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "5/15/26,07:16:39,TRD,8001,BOT +10 40423R204 @1.19,,,-11.90,71880.45",
      "5/15/26,07:16:49,TRD,8002,SOLD -5 40423R204 @1.1901,,,5.95,71886.40",
      "5/15/26,07:18:26,TRD,8003,SOLD -5 40423R204 @1.195,,,5.98,71892.38",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",5/15/26 07:16:39,STOCK,BUY,+10,TO OPEN,40423R204,STOCK,1.19,1.19,LMT",
      ",5/15/26 07:16:49,STOCK,SELL,-5,TO CLOSE,40423R204,STOCK,1.1901,1.1901,LMT",
      ",5/15/26 07:18:26,STOCK,SELL,-5,TO CLOSE,40423R204,STOCK,1.195,1.195,LMT",
    ].join("\n");

    const first = await mod.importBrokerCsv(cusipStatement, "cusip.csv", 1);
    expect(first.inserted).toBe(3);
    expect(first.warnings).toContain(
      "Normalized CUSIP 40423R204 to HCWB (HCW Biologics Inc.).",
    );

    await db.update(schema.executions).set({ symbol: "40423R204" }).where(eq(schema.executions.symbol, "HCWB"));
    await db.update(schema.trades).set({ symbol: "40423R204" }).where(eq(schema.trades.symbol, "HCWB"));

    const second = await mod.importBrokerCsv(cusipStatement, "cusip.csv", 1);
    expect(second.inserted).toBe(0);
    expect(second.duplicates).toBe(3);

    const repairedExecutions = await db
      .select({ symbol: schema.executions.symbol })
      .from(schema.executions)
      .where(
        and(
          gte(schema.executions.executedAt, Date.UTC(2026, 4, 15, 14, 16, 39) / 1000),
          lte(schema.executions.executedAt, Date.UTC(2026, 4, 15, 14, 18, 26) / 1000),
        ),
      );
    expect(repairedExecutions).toHaveLength(3);
    expect(repairedExecutions.every((row) => row.symbol === "HCWB")).toBe(true);

    const repairedTrades = await db
      .select({ symbol: schema.trades.symbol })
      .from(schema.trades)
      .where(eq(schema.trades.entryAt, Date.UTC(2026, 4, 15, 14, 16, 39) / 1000));
    expect(repairedTrades).toEqual([{ symbol: "HCWB" }]);
  });
});
