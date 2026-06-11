import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchTrades } from "./match";
import { parseTosStatement } from "./tos";

const SAMPLE = "data/samples/2026-03-04-AccountStatement.csv";

function loadSample(): string | null {
  try {
    return readFileSync(SAMPLE, "utf8");
  } catch {
    return null; // fixture is gitignored; skip when absent (e.g. CI)
  }
}

describe("parseTosStatement", () => {
  const csv = loadSample();
  const maybe = csv ? it : it.skip;

  maybe("parses all 91 executions from the sample", () => {
    const execs = parseTosStatement(csv!);
    expect(execs.length).toBe(91);
  });

  maybe("splits fees across identical fills (no double-count)", () => {
    const execs = parseTosStatement(csv!);
    // Two identical fills: SOLD -100 AIFF @1.7534 at 11:49:09 PT on 3/4.
    const dupes = execs.filter(
      (e) => e.symbol === "AIFF" && e.price === 1.7534 && e.quantity === 100,
    );
    expect(dupes.length).toBe(2);
    // Each should carry ~0.02 of reg fees, not the summed 0.04.
    for (const e of dupes) expect(e.fees).toBeCloseTo(0.02, 2);
  });

  maybe("maps fields and converts PT→UTC correctly (first TMDE fill)", () => {
    const execs = parseTosStatement(csv!);
    const tmde = execs.find((e) => e.symbol === "TMDE");
    expect(tmde).toBeTruthy();
    // 3/3/26 07:29:38 PT (PST, UTC-8) = 15:29:38 UTC
    expect(tmde!.executedAt).toBe(Date.UTC(2026, 2, 3, 15, 29, 38) / 1000);
    expect(tmde!.side).toBe("buy");
    expect(tmde!.quantity).toBe(100);
    expect(tmde!.price).toBe(4.52);
  });
});

describe("matchTrades", () => {
  const csv = loadSample();
  const maybe = csv ? it : it.skip;

  maybe("builds closed round-trips; sample ends flat (no open trades)", () => {
    const trades = matchTrades(parseTosStatement(csv!));
    expect(trades.length).toBe(31);
    for (const t of trades) {
      expect(t.executionHashes.length).toBeGreaterThan(0);
      if (t.status === "closed") {
        expect(t.avgExitPrice).not.toBeNull();
        expect(t.exitAt).not.toBeNull();
      }
    }
    expect(trades.filter((t) => t.status === "open").length).toBe(0);
  });

  maybe("gross P&L reconciles to TOS 'P/L Day' for 3/4 symbols", () => {
    const trades = matchTrades(parseTosStatement(csv!));
    // gross = net pnl + fees, grouped by symbol
    const gross = new Map<string, number>();
    for (const t of trades) {
      gross.set(t.symbol, (gross.get(t.symbol) ?? 0) + t.pnl + t.fees);
    }
    // From the statement's "Profits and Losses" section (P/L Day, 3/4):
    const expected: Record<string, number> = {
      AIFF: 25.09,
      ASNS: 0.13,
      CCHH: 4.09,
      CDTG: 14.68,
    };
    for (const [symbol, exp] of Object.entries(expected)) {
      expect(gross.get(symbol) ?? 0).toBeCloseTo(exp, 1);
    }
  });
});
