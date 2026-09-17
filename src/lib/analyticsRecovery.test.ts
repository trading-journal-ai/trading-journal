import { expect, it } from "vitest";
import { analyticsRecovery } from "./analyticsRecovery";
import type { ReviewTrade } from "./analyticsReview";
const row=(id:number,date:string,net:number)=>({id,date,exitAt:id,net,gross:net} as ReviewTrade);
it("measures separate recovered and ongoing closing-drawdown episodes from a zero baseline",()=>{
 const rows=[row(1,"2026-09-10",-5),row(2,"2026-09-11",5),row(3,"2026-09-14",10),row(4,"2026-09-15",-4),row(5,"2026-09-16",1)];
 const result=analyticsRecovery(rows,"net");
 expect(result.episodes).toEqual([
  {start:"2026-09-10",end:"2026-09-11",recovered:true,depth:5,underwaterSessions:1,trades:2,calendarDays:2},
  {start:"2026-09-15",end:"2026-09-16",recovered:false,depth:4,underwaterSessions:2,trades:2,calendarDays:2},
 ]);
 expect(result.current).toBe(3);expect(result.max).toBe(5);
});
it("keeps no-loss and empty periods free of fabricated drawdown",()=>{
 expect(analyticsRecovery([],"net").episodes).toEqual([]);
 expect(analyticsRecovery([row(1,"2026-09-10",5),row(2,"2026-09-11",0)],"net").episodes).toEqual([]);
});
it("uses completed nonoverlapping recent windows and only full rolling windows",()=>{
 const rows=Array.from({length:45},(_,i)=>row(i+1,"2026-09-10",i+1)).reverse();
 const result=analyticsRecovery(rows,"net");
 expect(result.recent.map(t=>t.id)).toEqual(Array.from({length:20},(_,i)=>i+26));
 expect(result.earlier.map(t=>t.id)).toEqual(Array.from({length:20},(_,i)=>i+6));
 expect(result.rolling.filter(p=>p.value!=null)).toHaveLength(26);
 expect(result.rolling[19].value).toBe(10.5);
 expect(result.rolling.at(-1)?.value).toBe(35.5);
});
