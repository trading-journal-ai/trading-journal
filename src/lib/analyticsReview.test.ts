import { describe, expect, it } from "vitest";
import { assignAttempts, completedReviewTrade, reviewSessions, reviewStats, type ReviewFill, type ReviewSourceTrade } from "./analyticsReview";
const at = (date: string) => Date.parse(date) / 1000;
const trade: ReviewSourceTrade = { id: 1, symbol: "TEST", side: "long", status: "closed", entryAt: null, exitAt: null, setup: null };
const fill = (side: "buy" | "sell", quantity: number, price: number, time: string, fees = 1): ReviewFill => ({ side, quantity, price, executedAt: at(time), fees, feeReported: true });
const simple = (id: number, pnl: number) => completedReviewTrade({ ...trade,id }, [fill("buy",100,10,`2026-09-10T14:00:00Z`,0), fill("sell",100,10+pnl/100,`2026-09-10T14:10:00Z`,0)])!;

describe("completed-trade Analytics", () => {
  it("counts buy, partial sale, add and full exit once using peak rather than turnover", () => {
    const t = completedReviewTrade(trade,[fill("buy",100,10,"2026-09-10T14:00:00Z"),fill("sell",50,11,"2026-09-10T14:01:00Z"),fill("buy",100,12,"2026-09-10T14:02:00Z"),fill("sell",150,13,"2026-09-11T00:30:00Z")])!;
    expect(t.peakShares).toBe(150); expect(t.openingShares).toBe(200);
    expect(t.gross).toBe(300); expect(t.net).toBe(296); expect(t.fees).toBe(4);
    expect(t.peakCapital).toBe(1700); expect(t.date).toBe("2026-09-10");
    expect(t.adds).toBe(1); expect(t.reductions).toBe(1);
  });
  it("measures concurrent size from raw fills even when one order spans a reduction", () => {
    const t=completedReviewTrade(trade,[
      {...fill("buy",100,10,"2026-09-10T14:00:00Z"),brokerOrderKey:"one-order"},
      fill("sell",50,11,"2026-09-10T14:01:00Z"),
      {...fill("buy",100,10,"2026-09-10T14:02:00Z"),brokerOrderKey:"one-order"},
      fill("sell",150,11,"2026-09-10T14:03:00Z")
    ])!;
    expect(t.peakShares).toBe(150);
  });
  it("uses the final exit date and whole result across a date boundary", () => {
    const t = completedReviewTrade(trade,[fill("buy",10,10,"2026-09-10T14:00:00Z"),fill("sell",4,11,"2026-09-10T15:00:00Z"),fill("sell",6,12,"2026-09-11T14:00:00Z")])!;
    expect(t.date).toBe("2026-09-11"); expect(t.net).toBe(13);
    expect(reviewSessions([t],"net").map(s=>[s.date,s.pnl])).toEqual([["2026-09-11",13]]);
  });
  it("does not turn open, incomplete or repeated flat-to-flat records into completed trades", () => {
    const entry = fill("buy",10,10,"2026-09-10T14:00:00Z"), exit = fill("sell",10,11,"2026-09-10T14:05:00Z");
    expect(completedReviewTrade({...trade,status:"open"},[entry,exit])).toBeNull();
    expect(completedReviewTrade(trade,[entry])).toBeNull();
    expect(completedReviewTrade(trade,[entry,exit,{...entry,executedAt:exit.executedAt+1},{...exit,executedAt:exit.executedAt+2}])).toBeNull();
    expect(completedReviewTrade(trade,[])).toBeNull();
  });
  it("distinguishes confirmed zero from unknown and classifies using the selected basis", () => {
    const t=completedReviewTrade(trade,[{...fill("buy",10,10,"2026-09-10T14:00:00Z",0),feeReported:false},fill("sell",10,10.1,"2026-09-10T14:05:00Z",2)])!;
    expect(t.unknownFees).toBe(1); expect(t.net).toBe(-1);
    expect(reviewStats([t],"gross").wins).toBe(1); expect(reviewStats([t],"net").losses).toBe(1);
    expect(simple(2,0).unknownFees).toBe(0);
  });
  it("handles exact scratches, missing denominators and a losing first session", () => {
    const rows=[simple(1,20),simple(2,-10),simple(3,0)];
    expect(reviewStats(rows,"net").winRate).toBe(50); expect(reviewStats(rows,"net").pf).toBe(2);
    expect(reviewStats([],"net").avg).toBeNull(); expect(reviewStats([rows[0]],"net").pf).toBeNull();
    expect(reviewSessions([rows[1]],"net")[0].drawdown).toBe(10);
    expect(reviewSessions(rows,"net")[0].giveback).toBe(10);
  });
  it("numbers attempts before filtering, separately by entry day and side", () => {
    const rows=assignAttempts([simple(2,-10),simple(1,20),{...simple(3,10),side:"short"},{...simple(4,10),entryDate:"2026-09-11"}]);
    expect(rows.map(t=>t.attempt)).toEqual([1,2,1,1]);
    expect(rows.filter(t=>t.net<0)[0].attempt).toBe(2);
  });
  it("keeps split-adjusted money while excluding incomparable share sizing", () => {
    const t=completedReviewTrade({...trade,symbol:"NVDL"},[fill("buy",10,90,"2026-06-25T14:00:00Z"),fill("sell",30,31,"2026-06-26T14:00:00Z")])!;
    expect(t.gross).toBe(30); expect(t.net).toBe(28); expect(t.peakShares).toBeNull(); expect(t.openingShares).toBe(0);
  });
  it("preserves supported short calculations", () => {
    const t=completedReviewTrade({...trade,side:"short"},[fill("sell",10,20,"2026-09-10T14:00:00Z"),fill("buy",10,19,"2026-09-10T14:01:00Z")])!;
    expect(t.net).toBe(8); expect(t.peakShares).toBe(10);
  });
  it("normalizes opening price when an add occurs after a share split", () => {
    const t = completedReviewTrade({...trade,symbol:"NVDL"},[
      fill("buy",10,90,"2026-06-25T14:00:00Z",0),
      fill("buy",30,30,"2026-06-26T14:00:00Z",0),
      fill("sell",60,31,"2026-06-26T14:10:00Z",0),
    ])!;
    expect(t.price).toBe(90); expect(t.gross).toBe(60);
    expect(t.peakCapital).toBe(1800); expect(t.peakShares).toBeNull();
  });
  it("uses Eastern local dates in both standard and daylight time", () => {
    for (const [entry,exit,date] of [
      ["2026-01-10T04:45:00Z","2026-01-10T04:59:00Z","2026-01-09"],
      ["2026-07-10T03:45:00Z","2026-07-10T03:59:00Z","2026-07-09"],
    ]) {
      expect(completedReviewTrade(trade,[fill("buy",10,10,entry),fill("sell",10,11,exit)])!.date).toBe(date);
    }
  });
  it("reconciles generated scale-in/out lifecycles against independent cash flows", () => {
    for (let i=1;i<=40;i++) {
      const q=i*10, p=1+i/7;
      const fills=[fill("buy",q,p,"2026-09-10T14:00:00Z",.01),
        fill("sell",q/2,p+.1,"2026-09-10T14:01:00Z",.02),
        fill("buy",q,p+.2,"2026-09-10T14:02:00Z",.03),
        fill("sell",q*1.5,p-.1,"2026-09-10T14:03:00Z",.04)];
      const t=completedReviewTrade(trade,fills)!;
      const cash=fills.reduce((sum,f)=>sum+(f.side==="sell"?1:-1)*f.quantity*f.price,0);
      const rounded=Math.round(cash*100)/100;
      expect(t.gross).toBeCloseTo(rounded,8);
      expect(t.net).toBeCloseTo(rounded-.10,8);
      expect(t.peakShares).toBe(q*1.5);
      expect(t.peakCapital).toBeCloseTo(Math.round((q*p/2+q*(p+.2))*100)/100,8);
    }
  });

});
