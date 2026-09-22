import { describe, expect, it } from "vitest";
import { buildWeeklyRecap, readWeeklyMarketObservation, type WeeklyRecapSession } from "./weeklyRecap";

// Deliberately synthetic; not copied from any account.
const dates = ["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12"];
function session(day: number, pnl: number, id = day + 1): WeeklyRecapSession {
  return { date: dates[day], pnl, trades: [{ id, symbol: `EXAMPLE${id}`, pnl }] };
}
const sessions = [session(0, 100), session(1, -40), session(2, 20), session(3, -110), session(4, 80)];
function recap(asOfDate: string, rows = sessions) {
  return buildWeeklyRecap({ weekStart: dates[0], asOfDate, sessions: rows });
}

describe("weekly recap progression and evidence", () => {
  it("stays light Monday/Tuesday, adds detail Wednesday/Thursday, and opens Friday's full recap provisionally", () => {
    expect(dates.map((date) => recap(date).stage)).toEqual(["early", "early", "developing", "developing", "full"]);
    expect(recap(dates[4]).status).toBe("Week in progress");
    expect(recap("2026-06-13").status).toBe("Week ended");
  });
  it("excludes later sessions, highlights and out-of-week facts", () => {
    const result = recap(dates[1], [...sessions, { ...session(0, 9999), date: "2026-06-05" }]);
    expect(result.evidence.map((row) => row.cumulativePnl)).toEqual([100, 60]);
    expect(result.highlights.map((trade) => trade.id)).toEqual([1, 2]);
    expect(result.story).toContain("+$60.00");
    expect(result.story).not.toMatch(/Wednesday|Thursday|Friday/);
  });
  it("describes giveback using session-end equity and recovery from a negative balance", () => {
    expect(recap(dates[3]).development).toContain("reduced it by $130.00");
    expect(recap(dates[4], [session(0, -100), session(4, 60)]).development).toContain("recovered $60.00 but remained below zero");
    expect(recap(dates[4], [session(0, -100), session(4, 160)]).development).toContain("recovered $160.00");
    expect(recap(dates[1], [session(0, -100), session(1, -40)]).story).toContain("lost $40.00");
  });
  it("keeps missing weekdays distinct from intentional no-trade and from a completed data set", () => {
    const result = buildWeeklyRecap({ weekStart: dates[0], asOfDate: "2026-06-13", sessions: [session(0, 100)], noTradeDates: [dates[1], dates[0]] });
    expect(result.coverage).toContain("1 marked no-trade");
    expect(result.coverage).toContain("Wednesday, Thursday, Friday");
    expect(result.coverage).toContain("Imports may be incomplete");
    expect(result.story).toContain("only imported session in this week");
    expect(result.development).toBeNull();
  });
  it("handles upcoming, empty, and flat weeks without invented verdicts", () => {
    expect(recap("2026-06-07").evidence).toEqual([]);
    expect(recap("2026-06-07").story).toBe("This week has not started yet.");
    expect(recap(dates[4], []).highlights).toEqual([]);
    const flat = recap(dates[4], [session(0, 0)]);
    expect(flat.story).toContain("finished flat");
    expect(flat.question).toBeNull();
    expect(flat.highlights).toEqual([]);
  });
  it("aggregates one trade across multiple sessions and links to its largest activity day", () => {
    const result = recap(dates[4], [session(0, 30, 1), session(1, 90, 1), session(2, -10, 2)]);
    expect(result.highlights[0]).toMatchObject({ id: 1, pnl: 120, date: dates[1], dates: [dates[0], dates[1]] });
    expect(result.highlights[1].label).toBe("Largest loss");
  });
  it("keeps positive-only and negative-only selections honest", () => {
    expect(recap(dates[4], [session(0, 50), session(1, 20)]).highlights.map((row) => row.label)).toEqual(["Biggest contributor"]);
    expect(recap(dates[4], [session(0, -50), session(1, -20)]).highlights.map((row) => row.label)).toEqual(["Largest loss"]);
  });
  it("preserves fractional-cent arithmetic until display and groups ticker breadth by net results", () => {
    const result = recap(dates[4], [session(0, 0.004, 1), session(1, 0.004, 1), session(2, 0.004, 1)]);
    expect(result.evidence.at(-1)?.cumulativePnl).toBe(0.01);
    expect(result.highlights[0].pnl).toBe(0.01);
    const mixed = recap(dates[4], [{ date: dates[0], pnl: 30, trades: [{ id: 1, symbol: "EXAMPLE", pnl: 50 }, { id: 2, symbol: "EXAMPLE", pnl: -20 }] }]);
    expect(mixed.breadth).toContain("1 ticker contributed +$30.00; 0 tickers subtracted $0.00");
  });
});

describe("market context qualification", () => {
  const raw = { payloadJson: JSON.stringify({ counts: { over50Pct: 4, over100Pct: 1 } }), coverageStatus: "partial", provenance: "retrospective", source: "massive_grouped_daily", updatedAt: new Date("2026-06-10T20:00:00Z") };
  it("keeps valid counts and coverage without generating a heat label", () => {
    const observation = readWeeklyMarketObservation(raw);
    expect(observation).toMatchObject({ over50: 4, over100: 1, coverage: "partial", updatedDate: dates[2] });
    expect(JSON.stringify(observation)).not.toMatch(/Hot|Cold|Selective/);
  });
  it("never converts absent, invalid or impossible counts to zero", () => {
    for (const counts of [null, {}, { over50Pct: -1, over100Pct: 0 }, { over50Pct: 1, over100Pct: 2 }, { over50Pct: "4", over100Pct: 0 }]) {
      expect(readWeeklyMarketObservation({ ...raw, payloadJson: JSON.stringify({ counts }) })).toBeNull();
    }
    expect(readWeeklyMarketObservation({ ...raw, payloadJson: "null" })).toBeNull();
    expect(readWeeklyMarketObservation({ ...raw, coverageStatus: "unavailable" })).toBeNull();
  });
  it("excludes later-known context and same-day completed-session observations", () => {
    const rows = [{ ...session(0, 10), market: readWeeklyMarketObservation(raw) }];
    expect(recap(dates[1], rows).market).toHaveLength(0);
    expect(recap(dates[2], rows).market).toHaveLength(1);
    expect(recap(dates[2], [{ ...rows[0], date: dates[2] }]).market).toHaveLength(0);
  });
});
