import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

describe("execution fee migration", () => {
  it("preserves existing rows and records legacy totals without inventing zero evidence", () => {
    const db = new Database(":memory:");
    try {
      for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql") && name < "0012").sort()) {
        db.exec(readFileSync(join("drizzle", file), "utf8"));
      }
      db.exec(`INSERT INTO trades (id, symbol, side, quantity, fees) VALUES (1, 'SYNTH', 'long', 10, 0.25);
        INSERT INTO executions (id, symbol, side, quantity, price, executed_at, fees, trade_id)
        VALUES (1, 'SYNTH', 'buy', 10, 10, 1800000000, 0, 1),
               (2, 'SYNTH', 'sell', 10, 11, 1800000060, 0.25, 1);`);
      const beforeTrades = db.prepare("SELECT * FROM trades").all();
      const beforeExecutions = db.prepare("SELECT * FROM executions").all();
      db.exec(readFileSync("drizzle/0012_open_overlord.sql", "utf8"));
      expect(db.prepare("SELECT * FROM trades").all()).toEqual(beforeTrades);
      expect(db.prepare("SELECT * FROM executions").all()).toEqual(beforeExecutions);
      expect(db.prepare("SELECT * FROM execution_fees").all()).toEqual([
        { execution_id: 2, fee_type: "REPORTED_TOTAL", amount: 0.25, source: "legacy" },
      ]);
      expect(db.pragma("integrity_check", { simple: true })).toBe("ok");
      expect(db.pragma("foreign_key_check")).toEqual([]);
    } finally { db.close(); }
  });
});
