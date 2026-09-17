import { describe, expect, it } from "vitest";
import { breakdownKey, cohortTrades, emptyCohort, parseCohort, previousPeriod } from "./analyticsCompare";
import type { ReviewTrade } from "./analyticsReview";
const row = (id:number,date:string,net:number,extra:Partial<ReviewTrade>={}):ReviewTrade => ({id,date,entryDate:date,entryAt:Date.parse(`${date}T13:35:00Z`)/1000,exitAt:Date.parse(`${date}T13:40:00Z`)/1000,symbol:"TEST",side:"long",price:5,net,gross:net+1,fees:1,unknownFees:0,fills:2,peakShares:100,peakCapital:500,openingShares:100,initialShares:100,holdMinutes:5,adds:0,reductions:0,setup:"Breakout",tags:["news","fast"],attempt:1,...extra});

describe("independent Analytics cohorts",()=>{
 it("classifies the session before filtering its winning or losing trades and symbols",()=>{
   const rows=[row(1,"2026-09-10",20),row(2,"2026-09-10",-5,{symbol:"OTHER"}),row(3,"2026-09-11",-10),row(4,"2026-09-12",0)];
   expect(cohortTrades(rows,{...emptyCohort,session:"win",symbol:"OTHER"},"net").map(t=>t.id)).toEqual([2]);
   expect(cohortTrades(rows,{...emptyCohort,session:"loss"},"net").map(t=>t.id)).toEqual([3]);
   expect(cohortTrades(rows,{...emptyCohort,session:"scratch"},"net").map(t=>t.id)).toEqual([4]);
 });
 it("combines date, tag, price, size and outcome filters without including split sizes",()=>{
   const rows=[row(1,"2026-09-10",2),row(2,"2026-09-11",3,{tags:["news"]}),row(3,"2026-09-11",3,{peakShares:null}),row(4,"2026-09-12",3)];
   const group={...emptyCohort,from:"2026-09-10",to:"2026-09-11",tags:"news, fast",size:"100",price:"5to10",outcome:"win" as const};
   expect(cohortTrades(rows,group,"net").map(t=>t.id)).toEqual([1]);
   expect(cohortTrades(rows,{...group,tagMode:"any"},"net").map(t=>t.id)).toEqual([1,2]);
 });
 it("changes winner membership with basis and separates intraday from multiday",()=>{
   const rows=[row(1,"2026-09-11",-.5,{entryDate:"2026-09-10"})];
   expect(cohortTrades(rows,{...emptyCohort,outcome:"win"},"net")).toHaveLength(0);
   expect(cohortTrades(rows,{...emptyCohort,outcome:"win",duration:"multiday"},"gross")).toHaveLength(1);
   expect(breakdownKey(rows[0],"duration")).toBe("Multiday");
   expect(breakdownKey(rows[0],"window")).toBe("Opening 30 min");
 });
 it("uses an adjacent inclusive period of equal calendar length",()=>{
   expect(previousPeriod({from:"2026-09-14",to:"2026-09-18"})).toEqual({from:"2026-09-09",to:"2026-09-13"});
 });
 it("ignores malformed URL groups and invalid fields",()=>{
   expect(parseCohort("not json",emptyCohort)).toEqual(emptyCohort);
   expect(parseCohort(JSON.stringify({from:"2026-02-30",outcome:"bogus",tags:["news"],price:"999",symbol:"TEST"}),emptyCohort)).toEqual({...emptyCohort,symbol:"TEST"});
 });
});
