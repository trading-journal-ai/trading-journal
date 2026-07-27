import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
  buildTradeWindows,
  calendarLookbackDays,
  createBarWriter,
  hasSufficientCoverage,
  historicalSymbolForDate,
  parseAggregateBars,
} from "./sync-market-data.mjs";

function epoch(date, time = "14:30:00Z") {
  return Math.round(new Date(`${date}T${time}`).getTime() / 1000);
}

describe("market-data sync planning", () => {
  it("uses a holiday-tolerant calendar window for session baselines", () => {
    expect(calendarLookbackDays(0)).toBe(0);
    expect(calendarLookbackDays(14)).toBe(24);
  });

  it("deduplicates traded ticker-days and skips unresolved identifiers", () => {
    const plan = buildTradeWindows([
      { symbol: " abc ", entryAt: epoch("2026-07-20") },
      { symbol: "ABC", entryAt: epoch("2026-07-20", "15:00:00Z") },
      { symbol: "40423R204", entryAt: epoch("2026-07-20") },
      { symbol: "", entryAt: epoch("2026-07-20") },
    ], 14);

    expect(plan.windows).toEqual([{
      anchorDate: "2026-07-20",
      from: "2026-06-26",
      symbol: "ABC",
      to: "2026-07-20",
    }]);
    expect(plan.skippedIdentifiers).toEqual(["40423R204"]);
  });

  it("requires the anchor day plus the requested baseline", () => {
    const window = {
      anchorDate: "2026-07-20",
      from: "2026-06-26",
      symbol: "ABC",
      to: "2026-07-20",
    };
    const dates = new Set([
      "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-06", "2026-07-07",
      "2026-07-08", "2026-07-09", "2026-07-10", "2026-07-13", "2026-07-14",
      "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-20",
    ]);

    expect(hasSufficientCoverage(window, dates, 14)).toBe(false);
    dates.add("2026-06-30");
    expect(hasSufficientCoverage(window, dates, 14)).toBe(true);
    dates.delete("2026-07-20");
    expect(hasSufficientCoverage(window, dates, 0)).toBe(false);
  });

  it("selects the ticker effective on the anchor date", () => {
    const events = [
      { date: "2025-06-17", ticker: "OLD" },
      { date: "2026-06-16", ticker: "NEW" },
    ];
    expect(historicalSymbolForDate("2026-02-18", events)).toBe("OLD");
    expect(historicalSymbolForDate("2026-06-16", events)).toBe("NEW");
    expect(historicalSymbolForDate("2025-06-16", events)).toBeNull();
  });

  it("normalizes valid aggregate bars and ignores malformed rows", () => {
    expect(parseAggregateBars([
      { t: 1_700_000_000_000, o: 1, h: 2, l: 0.5, c: 1.5, v: 100 },
      { t: null, o: 1, h: 2, l: 0.5, c: 1.5, v: 100 },
    ])).toEqual([{
      c: 1.5,
      h: 2,
      l: 0.5,
      o: 1,
      t: 1_700_000_000,
      vol: 100,
    }]);
  });

  it("stores bars idempotently under the journal symbol", () => {
    const db = new Database(":memory:");
    db.exec(`
      create table candles (
        id integer primary key autoincrement,
        symbol text not null,
        timeframe text not null,
        t integer not null,
        o real not null,
        h real not null,
        l real not null,
        c real not null,
        vol real not null default 0
      );
      create unique index candles_symbol_tf_t_unq
        on candles (symbol, timeframe, t);
    `);
    const writeBars = createBarWriter(db);
    const bars = [{ t: 1_700_000_000, o: 1, h: 2, l: 0.5, c: 1.5, vol: 100 }];

    expect(writeBars("CURRENT", bars)).toBe(1);
    expect(writeBars("CURRENT", bars)).toBe(0);
    expect(db.prepare("select symbol, timeframe from candles").get()).toEqual({
      symbol: "CURRENT",
      timeframe: "1m",
    });
    db.close();
  });
});
