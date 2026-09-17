import { reviewSessions, roundMoney, type PnlBasis, type ReviewTrade } from "./analyticsReview";

export function analyticsRecovery(rows: ReviewTrade[], basis: PnlBasis) {
  const sessions = reviewSessions(rows, basis);
  type Episode = { start: string; end: string; recovered: boolean; depth: number; underwaterSessions: number; trades: number; calendarDays: number };
  const episodes: Episode[] = [];
  let active: Episode | null = null;
  for (const session of sessions) {
    if (session.drawdown > 0 && !active) active = { start: session.date, end: session.date, recovered: false, depth: 0, underwaterSessions: 0, trades: 0, calendarDays: 0 };
    if (!active) continue;
    active.end = session.date;
    active.trades += session.trades.length;
    active.depth = Math.max(active.depth, session.drawdown);
    if (session.drawdown > 0) active.underwaterSessions++;
    active.calendarDays = (Date.parse(active.end) - Date.parse(active.start)) / 86400000 + 1;
    if (session.drawdown === 0) { active.recovered = true; episodes.push(active); active = null; }
  }
  if (active) episodes.push(active);
  const ordered = [...rows].sort((a,b) => a.exitAt - b.exitAt || a.id - b.id);
  const recent = ordered.slice(-20), earlier = ordered.slice(-40,-20);
  const rolling = ordered.map((row, index) => ({ date: row.date, index: index + 1,
    value: index < 19 ? null : roundMoney(ordered.slice(index - 19, index + 1).reduce((sum, t) => sum + t[basis], 0) / 20) }));
  return { sessions, episodes, recent, earlier, rolling,
    current: sessions.at(-1)?.drawdown ?? 0,
    max: Math.max(0, ...sessions.map(s => s.drawdown)),
    underwaterSessions: sessions.filter(s => s.drawdown > 0).length };
}
