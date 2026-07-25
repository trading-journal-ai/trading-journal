import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, eq, inArray, sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { beforeAll, describe, expect, it } from "vitest";
import type { SchwabNormalizedExecution } from "./normalize";

function schwabExecution(
  identity: string,
  overrides: Partial<SchwabNormalizedExecution> = {},
): SchwabNormalizedExecution {
  return {
    symbol: "SYNTH",
    side: "buy",
    quantity: 10,
    price: 10,
    executedAt: 1_800_000_000,
    posEffect: "TO OPEN",
    fees: 0,
    brokerOrderKey: `order-${identity}`,
    brokerExecutionKey: `broker-${identity}`,
    sourceRowHash: `canonical-${identity}`,
    ...overrides,
  };
}

describe("append-only Schwab persistence", () => {
  let persist: typeof import("./persist");
  let db: typeof import("@/lib/db").db;
  let schema: typeof import("@/lib/db/schema");
  let accountSequence = 0;

  beforeAll(async () => {
    const directory = mkdtempSync(join(tmpdir(), "tj-schwab-"));
    process.env.DB_PATH = join(directory, "test.db");
    const raw = new Database(process.env.DB_PATH);
    for (const file of readdirSync("drizzle")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      raw.exec(readFileSync(join("drizzle", file), "utf8"));
    }
    raw.close();
    persist = await import("./persist");
    ({ db } = await import("@/lib/db"));
    schema = await import("@/lib/db/schema");
  });

  async function createAccount() {
    accountSequence += 1;
    return db
      .insert(schema.accounts)
      .values({ name: `Schwab Test ${accountSequence}` })
      .returning({ id: schema.accounts.id })
      .get();
  }

  it("appends new executions once and creates no batch on a repeated sync", async () => {
    const account = await createAccount();
    const executions = [
      schwabExecution("new-open", {
        symbol: "ONCE",
        executedAt: 1_800_000_100,
      }),
      schwabExecution("new-close", {
        symbol: "ONCE",
        side: "sell",
        price: 11,
        executedAt: 1_800_000_200,
        posEffect: "TO CLOSE",
      }),
    ];

    const first = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions,
    });
    expect(first).toMatchObject({
      parsed: 2,
      inserted: 2,
      duplicates: 0,
      tradesCreated: 1,
      tradesUpdated: 0,
    });
    expect(first.batchId).not.toBeNull();

    const beforeRepeat = await db
      .select({
        executions: sql<number>`count(distinct ${schema.executions.id})`,
        trades: sql<number>`count(distinct ${schema.trades.id})`,
        batches: sql<number>`count(distinct ${schema.importBatches.id})`,
      })
      .from(schema.executions)
      .leftJoin(
        schema.trades,
        eq(schema.trades.accountId, account.id),
      )
      .leftJoin(
        schema.importBatches,
        eq(schema.importBatches.accountId, account.id),
      )
      .where(eq(schema.executions.accountId, account.id))
      .get();

    const second = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions,
    });
    expect(second).toMatchObject({
      batchId: null,
      parsed: 2,
      inserted: 0,
      duplicates: 2,
      tradesCreated: 0,
      tradesUpdated: 0,
    });

    const afterRepeat = await db
      .select({
        executions: sql<number>`count(distinct ${schema.executions.id})`,
        trades: sql<number>`count(distinct ${schema.trades.id})`,
        batches: sql<number>`count(distinct ${schema.importBatches.id})`,
      })
      .from(schema.executions)
      .leftJoin(
        schema.trades,
        eq(schema.trades.accountId, account.id),
      )
      .leftJoin(
        schema.importBatches,
        eq(schema.importBatches.accountId, account.id),
      )
      .where(eq(schema.executions.accountId, account.id))
      .get();
    expect(afterRepeat).toEqual(beforeRepeat);
  });

  it("recognizes an API fill already imported from a file", async () => {
    const account = await createAccount();
    await db.insert(schema.executions).values({
      accountId: account.id,
      symbol: "CROSS",
      side: "buy",
      quantity: 25,
      price: 4.5,
      executedAt: 1_800_001_000,
      fees: 0,
      sourceRowHash: "csv-row-cross",
      canonicalExecutionKey: "csv-row-cross",
    });

    const result = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions: [
        schwabExecution("cross-source", {
          symbol: "CROSS",
          quantity: 25,
          price: 4.5,
          executedAt: 1_800_001_000,
        }),
      ],
    });
    expect(result).toMatchObject({
      batchId: null,
      inserted: 0,
      duplicates: 1,
    });

    const rows = await db
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.accountId, account.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.brokerExecutionKey).toBeNull();
  });

  it("closes an existing trade in place and preserves its journal relationships", async () => {
    const account = await createAccount();
    const trade = await db
      .insert(schema.trades)
      .values({
        accountId: account.id,
        symbol: "KEEP",
        side: "long",
        quantity: 10,
        avgEntryPrice: 10,
        entryAt: 1_800_002_000,
        fees: 0,
        status: "open",
        stopLoss: 9.5,
        target: 12,
        setup: "orb",
      })
      .returning({ id: schema.trades.id })
      .get();
    const openingExecution = await db
      .insert(schema.executions)
      .values({
        accountId: account.id,
        tradeId: trade.id,
        symbol: "KEEP",
        side: "buy",
        quantity: 10,
        price: 10,
        executedAt: 1_800_002_000,
        posEffect: "TO OPEN",
        fees: 0,
        sourceRowHash: "csv-open-keep",
        canonicalExecutionKey: "csv-open-keep",
      })
      .returning()
      .get();
    const note = await db
      .insert(schema.journalEntries)
      .values({
        accountId: account.id,
        tradeId: trade.id,
        scope: "trade",
        thesis: "Keep this note",
      })
      .returning({ id: schema.journalEntries.id })
      .get();
    const tag = await db
      .insert(schema.tags)
      .values({ name: `relationship-${account.id}` })
      .returning({ id: schema.tags.id })
      .get();
    await db.insert(schema.tradeTags).values({ tradeId: trade.id, tagId: tag.id });
    const attachment = await db
      .insert(schema.attachments)
      .values({
        tradeId: trade.id,
        filePath: "/test/keep.png",
        caption: "Keep this attachment",
      })
      .returning({ id: schema.attachments.id })
      .get();

    const result = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions: [
        schwabExecution("overlap-open", {
          symbol: "KEEP",
          quantity: 10,
          price: 10,
          executedAt: 1_800_002_000,
        }),
        schwabExecution("later-close", {
          symbol: "KEEP",
          side: "sell",
          quantity: 10,
          price: 11.25,
          executedAt: 1_800_002_100,
          posEffect: "TO CLOSE",
        }),
      ],
    });
    expect(result).toMatchObject({
      inserted: 1,
      duplicates: 1,
      tradesCreated: 0,
      tradesUpdated: 1,
    });

    const updatedTrade = await db
      .select()
      .from(schema.trades)
      .where(eq(schema.trades.id, trade.id))
      .get();
    expect(updatedTrade).toMatchObject({
      id: trade.id,
      status: "closed",
      avgExitPrice: 11.25,
      stopLoss: 9.5,
      target: 12,
      setup: "orb",
    });
    const preservedOpening = await db
      .select()
      .from(schema.executions)
      .where(eq(schema.executions.id, openingExecution.id))
      .get();
    expect(preservedOpening).toMatchObject({
      tradeId: trade.id,
      sourceRowHash: "csv-open-keep",
      brokerExecutionKey: null,
    });
    expect(
      await db.select().from(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, note.id),
          eq(schema.journalEntries.tradeId, trade.id),
        )),
    ).toHaveLength(1);
    expect(
      await db.select().from(schema.tradeTags)
        .where(and(
          eq(schema.tradeTags.tradeId, trade.id),
          eq(schema.tradeTags.tagId, tag.id),
        )),
    ).toHaveLength(1);
    expect(
      await db.select().from(schema.attachments)
        .where(and(
          eq(schema.attachments.id, attachment.id),
          eq(schema.attachments.tradeId, trade.id),
        )),
    ).toHaveLength(1);
  });

  it("fills missing days between imported days without changing existing trades or notes", async () => {
    const account = await createAccount();
    const epoch = (value: string) => Date.parse(value) / 1000;
    const roundTrip = (day: string, identity: string) => [
      schwabExecution(`${identity}-open`, {
        symbol: "GAPS",
        side: "buy",
        price: 10,
        executedAt: epoch(`${day}T15:00:00Z`),
        posEffect: "TO OPEN",
      }),
      schwabExecution(`${identity}-close`, {
        symbol: "GAPS",
        side: "sell",
        price: 11,
        executedAt: epoch(`${day}T15:05:00Z`),
        posEffect: "TO CLOSE",
      }),
    ];
    const monday = roundTrip("2027-01-18", "gap-mon");
    const tuesday = roundTrip("2027-01-19", "gap-tue");
    const wednesday = roundTrip("2027-01-20", "gap-wed");
    const thursday = roundTrip("2027-01-21", "gap-thu");
    const friday = roundTrip("2027-01-22", "gap-fri");

    const seedClosedTrade = async (
      executions: SchwabNormalizedExecution[],
      setup: string,
    ) => {
      const trade = await db
        .insert(schema.trades)
        .values({
          accountId: account.id,
          symbol: "GAPS",
          side: "long",
          quantity: 10,
          avgEntryPrice: 10,
          entryAt: executions[0]!.executedAt,
          avgExitPrice: 11,
          exitAt: executions[1]!.executedAt,
          fees: 0,
          status: "closed",
          setup,
        })
        .returning()
        .get();
      await db.insert(schema.executions).values(
        executions.map((execution) => ({
          accountId: account.id,
          tradeId: trade.id,
          symbol: execution.symbol,
          side: execution.side,
          quantity: execution.quantity,
          price: execution.price,
          executedAt: execution.executedAt,
          posEffect: execution.posEffect,
          fees: execution.fees,
          brokerOrderKey: execution.brokerOrderKey,
          brokerExecutionKey: execution.brokerExecutionKey,
          canonicalExecutionKey: execution.sourceRowHash,
          sourceRowHash: execution.sourceRowHash,
        })),
      );
      return trade;
    };

    const mondayTrade = await seedClosedTrade(monday, "monday-note-trade");
    const fridayTrade = await seedClosedTrade(friday, "friday-trade");
    const note = await db
      .insert(schema.journalEntries)
      .values({
        accountId: account.id,
        tradeId: mondayTrade.id,
        scope: "trade",
        thesis: "Do not overwrite this Monday note",
      })
      .returning({ id: schema.journalEntries.id })
      .get();
    const existingBefore = await db
      .select()
      .from(schema.trades)
      .where(and(
        eq(schema.trades.accountId, account.id),
        inArray(schema.trades.id, [mondayTrade.id, fridayTrade.id]),
      ))
      .orderBy(schema.trades.id);

    const result = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-18",
      to: "2027-01-22",
      executions: [
        ...monday,
        ...tuesday,
        ...wednesday,
        ...thursday,
        ...friday,
      ],
    });
    expect(result).toMatchObject({
      inserted: 6,
      duplicates: 4,
      tradesCreated: 3,
      tradesUpdated: 0,
      insertedDates: ["2027-01-19", "2027-01-20", "2027-01-21"],
      duplicateDates: ["2027-01-18", "2027-01-22"],
    });

    const existingAfter = await db
      .select()
      .from(schema.trades)
      .where(and(
        eq(schema.trades.accountId, account.id),
        inArray(schema.trades.id, [mondayTrade.id, fridayTrade.id]),
      ))
      .orderBy(schema.trades.id);
    expect(existingAfter).toEqual(existingBefore);
    expect(
      await db
        .select()
        .from(schema.journalEntries)
        .where(and(
          eq(schema.journalEntries.id, note.id),
          eq(schema.journalEntries.tradeId, mondayTrade.id),
        )),
    ).toHaveLength(1);
  });

  it("rolls back every inserted row when a fill flips through zero", async () => {
    const account = await createAccount();
    const trade = await db
      .insert(schema.trades)
      .values({
        accountId: account.id,
        symbol: "FLIP",
        side: "long",
        quantity: 5,
        avgEntryPrice: 10,
        entryAt: 1_800_003_000,
        fees: 0,
        status: "open",
      })
      .returning({ id: schema.trades.id })
      .get();
    await db.insert(schema.executions).values({
      accountId: account.id,
      tradeId: trade.id,
      symbol: "FLIP",
      side: "buy",
      quantity: 5,
      price: 10,
      executedAt: 1_800_003_000,
      fees: 0,
      sourceRowHash: "flip-open",
      canonicalExecutionKey: "flip-open",
    });

    const before = await accountCounts(account.id);
    await expect(persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions: [
        schwabExecution("flip-close", {
          symbol: "FLIP",
          side: "sell",
          quantity: 10,
          price: 11,
          executedAt: 1_800_003_100,
          posEffect: "TO CLOSE",
        }),
      ],
    })).rejects.toThrow("position-flip");
    expect(await accountCounts(account.id)).toEqual(before);
  });

  it("skips an incomplete historical fill without creating an import batch", async () => {
    const account = await createAccount();
    await db.insert(schema.executions).values({
      accountId: account.id,
      symbol: "LATE",
      side: "buy",
      quantity: 10,
      price: 10,
      executedAt: 1_800_004_200,
      fees: 0,
      sourceRowHash: "latest-existing",
      canonicalExecutionKey: "latest-existing",
    });

    const before = await accountCounts(account.id);
    const result = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions: [
        schwabExecution("late-arrival", {
          symbol: "LATE",
          executedAt: 1_800_004_100,
        }),
      ],
    });
    expect(result).toMatchObject({
      batchId: null,
      inserted: 0,
      duplicates: 0,
      reviewExecutions: 1,
      reviewSymbols: ["LATE"],
      tradesCreated: 0,
      tradesUpdated: 0,
    });
    expect(await accountCounts(account.id)).toEqual(before);
  });

  it("imports safe historical trades while skipping ambiguous symbols", async () => {
    const account = await createAccount();
    await db.insert(schema.executions).values([
      {
        accountId: account.id,
        symbol: "SAFEH",
        side: "buy",
        quantity: 1,
        price: 20,
        executedAt: 1_800_006_300,
        fees: 0,
        sourceRowHash: "safeh-latest-existing",
        canonicalExecutionKey: "safeh-latest-existing",
      },
      {
        accountId: account.id,
        symbol: "REVIEW",
        side: "buy",
        quantity: 1,
        price: 20,
        executedAt: 1_800_006_300,
        fees: 0,
        sourceRowHash: "review-latest-existing",
        canonicalExecutionKey: "review-latest-existing",
      },
    ]);
    const before = await accountCounts(account.id);

    const result = await persist.persistSchwabExecutions({
      accountId: account.id,
      from: "2027-01-15",
      to: "2027-01-15",
      executions: [
        schwabExecution("safe-historical-open", {
          symbol: "SAFEH",
          executedAt: 1_800_006_100,
          posEffect: "TO OPEN",
        }),
        schwabExecution("safe-historical-close", {
          symbol: "SAFEH",
          side: "sell",
          price: 11,
          executedAt: 1_800_006_200,
          posEffect: "TO CLOSE",
        }),
        schwabExecution("review-historical-open", {
          symbol: "REVIEW",
          executedAt: 1_800_006_100,
          posEffect: "TO OPEN",
        }),
      ],
    });

    expect(result).toMatchObject({
      inserted: 2,
      duplicates: 0,
      reviewExecutions: 1,
      reviewSymbols: ["REVIEW"],
      tradesCreated: 1,
      tradesUpdated: 0,
    });
    const after = await accountCounts(account.id);
    expect(after).toEqual({
      executions: before.executions + 2,
      trades: before.trades + 1,
      batches: before.batches + 1,
    });
    expect(
      await db.select().from(schema.executions).where(and(
        eq(schema.executions.accountId, account.id),
        eq(schema.executions.symbol, "REVIEW"),
      )),
    ).toHaveLength(1);
  });

  async function accountCounts(accountId: number) {
    const executions = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.executions)
      .where(eq(schema.executions.accountId, accountId))
      .get();
    const trades = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId))
      .get();
    const batches = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.importBatches)
      .where(eq(schema.importBatches.accountId, accountId))
      .get();
    return {
      executions: executions?.count ?? 0,
      trades: trades?.count ?? 0,
      batches: batches?.count ?? 0,
    };
  }
});
