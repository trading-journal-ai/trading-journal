import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JournalWeeklyRecap from './JournalWeeklyRecap';
import { buildWeeklyRecap } from '../lib/weeklyRecap';
it('renders Tuesday, Thursday and Friday with stage-specific visible content', () => {
  const dates = ['2026-06-08','2026-06-09','2026-06-10','2026-06-11','2026-06-12'];
  const pnls = [100,-40,20,-110,80];
  const sessions = dates.map((date,i)=>({date,pnl:pnls[i],trades:[{id:i+1,symbol:['DEMOA','DEMOB','DEMOC','DEMOB','DEMOD'][i],pnl:pnls[i]}]}));
  for(const [stage, index] of [['early',1],['developing',3],['full',4]] as const) {
    const recap = buildWeeklyRecap({weekStart:dates[0],asOfDate:dates[index],sessions});
    const html=renderToStaticMarkup(createElement(JournalWeeklyRecap,{recap,returnTo:'/journal?scope=week'}));
    expect(html).toContain(`data-recap-stage="${stage}"`);
    if(stage==='early') expect(html.indexOf('<details')).toBeLessThan(html.indexOf('Biggest contributor'));
    if(stage==='full') expect(html).toContain('One question to carry forward');
  }
});

it("combines a selected day's reasons into a single link to the day review", () => {
  const recap = buildWeeklyRecap({ weekStart: "2026-06-08", asOfDate: "2026-06-12", sessions: [] });
  recap.sessionReview = {
    date: "2026-06-10", closingPnl: -20, importedSessions: 3,
    reasons: ["only_red_session", "largest_loss", "green_to_red"],
    curve: { peakPnl: 80, closingPnl: -20, giveback: 100 },
    largestLoss: { id: 123, symbol: "SYN", date: "2026-06-10", pnl: -60, weekPnl: -60, dates: ["2026-06-10"] },
    note: null, readOnly: false,
  };
  const html = renderToStaticMarkup(createElement(JournalWeeklyRecap, { recap, returnTo: "/journal?scope=week&date=2026-06-08" }));
  expect(html).toContain("Revisit Wednesday");
  expect(html).toContain("only red session among 3 imported sessions");
  expect(html).toContain("week’s largest recorded trade loss");
  expect(html).toContain("+$80.00");
  expect(html).toContain("−$20.00");
  expect(html).toContain("Review day");
  expect(html).toContain("view=coach");
  expect(html).toContain("#day-reflection");
  expect(html).toContain("returnTo=%2Fjournal%3Fscope%3Dweek%26date%3D2026-06-08");
  expect(html.match(/aria-label="Session to revisit"/g)).toHaveLength(1);
  expect(html).not.toContain("textarea");
  expect(html).not.toContain("Questions for a closer review");
  expect(html).not.toContain("trade=123");
  expect(html).not.toContain("revenge trading");
});

it("continues a day review when any note field is nonblank without exposing the note in Week", () => {
  const recap = buildWeeklyRecap({ weekStart: "2026-06-08", asOfDate: "2026-06-12", sessions: [] });
  recap.sessionReview = {
    date: "2026-06-10", closingPnl: -20, importedSessions: 3, reasons: ["only_red_session"],
    note: { text: "  ", thesis: "My private reflection", whatWentWell: "", whatWentWrong: "", emotionalState: "" },
    readOnly: false,
  };
  const render = () => renderToStaticMarkup(createElement(JournalWeeklyRecap, { recap, returnTo: "/journal?scope=week" }));
  expect(render()).toContain("Continue review");
  expect(render()).not.toContain("My private reflection");
  recap.sessionReview.note!.thesis = "  ";
  expect(render()).toContain("Review day");
  expect(render()).not.toContain("Continue review");
});

it("qualifies a multi-session loss as this week's contribution and its amount on the selected day", () => {
  const recap = buildWeeklyRecap({ weekStart: "2026-06-08", asOfDate: "2026-06-12", sessions: [] });
  recap.sessionReview = {
    date: "2026-06-10", closingPnl: -30, importedSessions: 3, reasons: ["largest_loss"],
    largestLoss: { id: 123, symbol: "SYN", date: "2026-06-10", pnl: -30, weekPnl: -20, dates: ["2026-06-08", "2026-06-10"] },
    note: null, readOnly: false,
  };
  const html = renderToStaticMarkup(createElement(JournalWeeklyRecap, { recap, returnTo: "/journal?scope=week" }));
  expect(html).toContain("largest loss across this week’s recorded trade activity (−$20.00)");
  expect(html).toContain("−$30.00 was realized on this day");
});
