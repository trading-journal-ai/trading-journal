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

  it("attaches the same opaque broker order key to partial fills sharing a REF #", () => {
    const statement = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "7/14/26,04:18:04,TRD,7001,BOT +88 NXTC @10.64,,,0,0",
      "7/14/26,04:18:04,TRD,7001,BOT +12 NXTC @10.64,,,0,0",
      "7/14/26,04:18:09,TRD,7002,SOLD -100 NXTC @10.74,,,0,0",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",7/14/26 04:18:04,STOCK,BUY,+88,TO OPEN,NXTC,STOCK,10.64,10.64,LMT",
      ",7/14/26 04:18:04,STOCK,BUY,+12,TO OPEN,NXTC,STOCK,10.64,10.64,LMT",
      ",7/14/26 04:18:09,STOCK,SELL,-100,TO CLOSE,NXTC,STOCK,10.74,10.74,LMT",
    ].join("\n");

    const executions = parseTosStatement(statement);
    const buys = executions.filter((execution) => execution.side === "buy");
    const sell = executions.find((execution) => execution.side === "sell");

    expect(buys).toHaveLength(2);
    expect(buys[0]?.brokerOrderKey).toBeTruthy();
    expect(buys[0]?.brokerOrderKey).toBe(buys[1]?.brokerOrderKey);
    expect(buys[0]?.brokerOrderKey).not.toContain("7001");
    expect(sell?.brokerOrderKey).toBeTruthy();
    expect(sell?.brokerOrderKey).not.toBe(buys[0]?.brokerOrderKey);
  });

  it("keeps identical fill signatures separate when multiple REF values are ambiguous", () => {
    const statement = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "7/14/26,04:18:04,TRD,1001,BOT +10 NXTC @10.64,,,0,0",
      "7/14/26,04:18:04,TRD,1002,BOT +10 NXTC @10.64,,,0,0",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",7/14/26 04:18:04,STOCK,BUY,+10,TO OPEN,NXTC,STOCK,10.64,10.64,LMT",
      ",7/14/26 04:18:04,STOCK,BUY,+10,TO OPEN,NXTC,STOCK,10.64,10.64,LMT",
    ].join("\n");

    const executions = parseTosStatement(statement);
    expect(executions).toHaveLength(2);
    expect(executions[0]?.brokerOrderKey).toBeTruthy();
    expect(executions[1]?.brokerOrderKey).toBeTruthy();
    expect(executions[0]?.brokerOrderKey).not.toBe(executions[1]?.brokerOrderKey);
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
