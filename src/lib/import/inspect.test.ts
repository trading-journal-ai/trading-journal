import { describe, expect, it } from "vitest";
import { inspectBrokerCsv } from "./inspect";

describe("inspectBrokerCsv", () => {
  it("detects DAS/TraderVue trade-summary exports as importable", () => {
    const csv = [
      [
        "Open Datetime",
        "Close Datetime",
        "Symbol",
        "Side",
        "Volume",
        "Exec Count",
        "Entry Price",
        "Exit Price",
        "Gross P&L",
        "Gross P&L (%)",
        "Notes",
        "Tags",
      ].join(","),
      "2026-02-11 10:59:42,2026-02-11 11:00:22,QVCGP,L,2000,2,7.26,6.76,-500.0,-6.89,,Paper Trading",
    ].join("\n");

    const result = inspectBrokerCsv(csv);

    expect(result.format).toBe("das_trade_summary");
    expect(result.importable).toBe(true);
    expect(result.importSource).toBe("das_csv");
    expect(result.dasTradeSummary.tradeRows).toBe(1);
  });

  it("detects a TOS statement with empty trade sections as non-importable", () => {
    const csv = [
      "Account Order History",
      "Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      "",
      "Profits and Losses",
      "Symbol,Description,P/L Open,P/L %,P/L Day,P/L YTD,P/L Diff,Margin Req",
      "CAST,CASTELLUM INC,$0.00,0.00%,$0.00,$12.34,$12.34,$0.00",
    ].join("\n");

    const result = inspectBrokerCsv(csv);

    expect(result.format).toBe("tos_account_statement");
    expect(result.importable).toBe(false);
    expect(result.tos.tradeHistory.usableFills).toBe(0);
    expect(result.tos.orderHistory.usableFilledRows).toBe(0);
    expect(result.tos.pnl.symbols).toBe(1);
  });

  it("detects filled TOS order history rows without marking them importable", () => {
    const csv = [
      "Account Order History",
      "Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status",
      ",,6/15/26 07:31:12,STOCK,BUY,10,TO OPEN,CAST,,,STOCK,4.48,LMT,EXT,FILLED",
      ",,6/15/26 07:36:01,STOCK,SELL,-10,TO CLOSE,CAST,,,STOCK,4.59,LMT,EXT,FILLED",
      ",,6/15/26 07:40:00,STOCK,BUY,100,TO OPEN,CAST,,,STOCK,4.45,LMT,EXT,CANCELED",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
    ].join("\n");

    const result = inspectBrokerCsv(csv);

    expect(result.format).toBe("tos_account_statement");
    expect(result.importable).toBe(false);
    expect(result.tos.orderHistory.rows).toBe(3);
    expect(result.tos.orderHistory.filledRows).toBe(2);
    expect(result.tos.orderHistory.usableFilledRows).toBe(2);
    expect(result.tos.orderHistory.canceledRows).toBe(1);
  });

  it("cross-checks TOS cash balance trade rows against trade history fills", () => {
    const csv = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "3/3/26,07:29:38,TRD,100,BOT +100 TMDE @4.52,,,-452.00,90439.83",
      "3/3/26,07:29:58,TRD,101,SOLD -50 TMDE @4.56,-0.01,,228.00,90667.82",
      "",
      "Account Trade History",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",3/3/26 07:29:38,STOCK,BUY,+100,TO OPEN,TMDE,STOCK,4.52,4.52,LMT",
      ",3/3/26 07:29:58,STOCK,SELL,-50,TO CLOSE,TMDE,STOCK,4.56,4.56,LMT",
    ].join("\n");

    const result = inspectBrokerCsv(csv);

    expect(result.importable).toBe(true);
    expect(result.tos.cashBalance.tradeRows).toBe(2);
    expect(result.tos.cashBalance.botRows).toBe(1);
    expect(result.tos.cashBalance.soldRows).toBe(1);
    expect(result.tos.cashBalance.feesRows).toBe(1);
    expect(result.tos.cashBalance.tradeHistoryExactMatches).toBe(2);
    expect(result.tos.cashBalance.tradeHistoryUnmatched).toBe(0);
    expect(result.tos.cashBalance.cashUnmatched).toBe(0);
  });

  it("detects filtered history and selects the full Cash Balance ledger", () => {
    const csv = [
      "Cash Balance",
      "DATE,TIME,TYPE,REF #,DESCRIPTION,Misc Fees,Commissions & Fees,AMOUNT,BALANCE",
      "2/18/26,09:12:51,TRD,5001,BOT +100 FTH @26.80,,,0,0",
      "2/18/26,09:13:10,TRD,5002,SOLD -100 FTH @26.90,-0.02,,0,0",
      "7/14/26,04:18:04,TRD,7001,BOT +10 SKDD @13.84,,,0,0",
      "7/14/26,04:20:21,TRD,7002,SOLD -10 SKDD @13.87,-0.01,,0,0",
      "",
      "Account Order History filtered by SKDD",
      "Notes,,Time Placed,Spread,Side,Qty,Pos Effect,Symbol,Exp,Strike,Type,PRICE,,TIF,Status",
      ",,7/14/26 04:18:04,STOCK,BUY,10,TO OPEN,SKDD,,,STOCK,13.84,LMT,EXT,FILLED",
      "",
      "Account Trade History filtered by SKDD",
      ",Exec Time,Spread,Side,Qty,Pos Effect,Symbol,Type,Price,Net Price,Order Type",
      ",7/14/26 04:18:04,STOCK,BUY,+10,TO OPEN,SKDD,STOCK,13.84,13.84,LMT",
      ",7/14/26 04:20:21,STOCK,SELL,-10,TO CLOSE,SKDD,STOCK,13.87,13.87,LMT",
    ].join("\n");

    const result = inspectBrokerCsv(csv);

    expect(result.importable).toBe(true);
    expect(result.importSource).toBe("tos_csv");
    expect(result.tos.cashBalance.tradeRows).toBe(4);
    expect(result.tos.orderHistory.filteredBy).toBe("SKDD");
    expect(result.tos.tradeHistory.filteredBy).toBe("SKDD");
    expect(result.tos.tradeHistory.usableFills).toBe(2);
    expect(result.recommendation).toContain("full Cash Balance ledger");
  });
});
