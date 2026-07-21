import { describe, expect, it } from "vitest";
import { normalizeBrokerCsv } from "./normalize";

describe("normalizeBrokerCsv", () => {
  it("normalizes TOS trade history into high-confidence normalized trades", () => {
    const csv = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "3/3/26,07:29:38,TRD,100,BOT +100 TMDE @4.52,,,-452.00,90439.83",
      "3/3/26,07:29:58,TRD,101,SOLD -100 TMDE @4.56,-0.02,,456.00,90895.81",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",3/3/26 07:29:38,STOCK,BUY,+100,TO OPEN,TMDE,STOCK,4.52,4.52,LMT",
      ",3/3/26 07:29:58,STOCK,SELL,-100,TO CLOSE,TMDE,STOCK,4.56,4.56,LMT",
    ].join("\n");

    const result = normalizeBrokerCsv(csv);

    expect(result.source).toBe("tos_csv");
    expect(result.sourceConfidence).toBe("high");
    expect(result.executions).toHaveLength(2);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0]).toMatchObject({
      symbol: "TMDE",
      side: "long",
      quantity: 100,
      status: "closed",
      executionCount: 2,
    });
    expect(result.trades[0].grossPnl).toBeCloseTo(4, 2);
    expect(result.trades[0].fees).toBeCloseTo(0.02, 2);
    expect(result.trades[0].netPnl).toBeCloseTo(3.98, 2);
  });

  it("normalizes the full Cash Balance ledger when detailed history is filtered", () => {
    const csv = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "2/18/26,09:12:51,TRD,5001,BOT +100 FTH @26.80,,,0,0",
      "2/18/26,09:13:10,TRD,5002,SOLD -100 FTH @26.90,-0.02,,0,0",
      "7/14/26,04:18:04,TRD,7001,BOT +10 SKDD @13.84,,,0,0",
      "7/14/26,04:20:21,TRD,7002,SOLD -10 SKDD @13.87,-0.01,,0,0",
      "",
      "Account Trade History filtered by SKDD",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",7/14/26 04:18:04,STOCK,BUY,+10,TO OPEN,SKDD,STOCK,13.84,13.84,LMT",
      ",7/14/26 04:20:21,STOCK,SELL,-10,TO CLOSE,SKDD,STOCK,13.87,13.87,LMT",
      "",
      "Profits and Losses",
      "Symbol,Description,P/L Open,P/L %,P/L Day,P/L YTD,P/L Diff,Margin Req",
      "SKDD,STRUXUREWARE INC,$0.00,0.00%,$0.30,$0.30,$0.30,$0.00",
    ].join("\n");

    const result = normalizeBrokerCsv(csv);

    expect(result.sourceConfidence).toBe("medium");
    expect(result.executions).toHaveLength(4);
    expect(result.trades).toHaveLength(2);
    expect(result.warnings).toContain(
      "Imported the full Cash Balance ledger because Account Trade History is filtered by SKDD.",
    );
  });
});
