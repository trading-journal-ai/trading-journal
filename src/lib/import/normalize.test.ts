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
});
