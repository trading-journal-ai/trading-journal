import Link from "next/link";
import { recapMoney, recapWeekday, type WeeklyRecap, type WeeklyTradeHighlight } from "@/lib/weeklyRecap";
import JournalWeeklyCoaching from "@/components/JournalWeeklyCoaching";
import JournalWeeklySessionReview from "@/components/JournalWeeklySessionReview";

const linkClass = "rounded-sm text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]";
const headingClass = "text-[15px] font-semibold leading-6 text-[var(--foreground)]";

function Highlight({ trade, returnTo }: { trade: WeeklyTradeHighlight; returnTo: string }) {
  const href = `/trades/review?${new URLSearchParams({ date: trade.date, symbol: trade.symbol, trade: String(trade.id), returnTo })}`;
  return (
    <div>
      <h4 className={headingClass}>{trade.label}</h4>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link href={href} className={`${linkClass} text-[16px] font-semibold`} aria-label={`Review ${trade.symbol} ${trade.label.toLowerCase()}`}>{trade.symbol}</Link>
        <span className={`font-mono text-[15px] tabular-nums ${trade.pnl > 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{recapMoney(trade.pnl)}</span>
        <span className="text-[13px] text-[var(--muted)]">{trade.dates.map(recapWeekday).join(" · ")}</span>
      </div>
    </div>
  );
}

function Highlights({ recap, returnTo }: { recap: WeeklyRecap; returnTo: string }) {
  if (!recap.highlights.length) return null;
  return (
    <div className="mt-6 grid gap-6 sm:grid-cols-2">
      {recap.highlights.map((trade) => <Highlight key={trade.id} trade={trade} returnTo={returnTo} />)}
    </div>
  );
}

export default function JournalWeeklyRecap({ recap, returnTo }: { recap: WeeklyRecap; returnTo: string }) {
  const early = recap.stage === "early";
  const full = recap.stage === "full";
  const hasCoachingFindings = Boolean(recap.coaching?.findings.length);
  const hasCoachingQuestion = recap.coaching?.findings.some((finding) => Boolean(finding.question)) ?? false;
  return (
    <section aria-label="Weekly recap" className="mt-8" data-recap-stage={recap.stage}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="text-[20px] font-semibold leading-7 tracking-[-0.01em] text-[var(--foreground)]">{recap.title}</h3>
        <span className="text-[12px] font-medium text-[var(--muted)]">{recap.status} · {recap.status === "Upcoming week" ? "Awaiting sessions" : "Based on available imports"}</span>
      </div>
      <p className="mt-4 max-w-[70ch] text-[18px] font-medium leading-7 text-[var(--foreground)]">{recap.story}</p>
      {recap.sessionReview ? <JournalWeeklySessionReview review={recap.sessionReview} returnTo={returnTo} /> : null}
      <JournalWeeklyCoaching coaching={recap.coaching} market={recap.sharedMarket} stage={recap.stage} returnTo={returnTo} />
      {!early && recap.development && !hasCoachingFindings ? <p className="mt-3 max-w-[75ch] text-[15px] leading-7 text-[var(--body)]">{recap.development}</p> : null}
      {!early ? <Highlights recap={recap} returnTo={returnTo} /> : null}
      {full && recap.breadth && !hasCoachingFindings ? (
        <div className="mt-7 border-t border-[var(--hairline)] pt-5">
          <h4 className={headingClass}>Where the result came from</h4>
          <p className="mt-2 max-w-[75ch] text-[15px] leading-7 text-[var(--body)]">{recap.breadth}</p>
        </div>
      ) : null}
      {!recap.sharedMarket && !early && (recap.market.length > 0 || (full && recap.evidence.length > 0)) ? (
        <div className="mt-6">
          <h4 className={headingClass}>Market context</h4>
          {recap.market.length ? (
            <>
              <p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">
                {recap.market.map(({ date, observation }) => `${recapWeekday(date)}: ${observation.over50} recorded movers ≥50% (${observation.over100} ≥100%)${observation.coverage === "partial" ? ", partial coverage" : ""}`).join(". ")}.
              </p>
              <p className="mt-1 max-w-[75ch] text-[13px] leading-6 text-[var(--muted)]">Recorded mover counts describe opportunity in the covered universe; they do not establish a hot or cold market or what was visible at entry.</p>
            </>
          ) : <p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--muted)]">No qualified market observations are available for this recap. Market heat stays unclassified.</p>}
        </div>
      ) : null}
      {recap.focus ? (
        <div className="mt-6">
          <h4 className={headingClass}>Your saved weekly focus</h4>
          <p className="mt-2 max-w-[75ch] text-[15px] leading-7 text-[var(--body)]">{recap.focus.action}</p>
          {!early && recap.focus.trigger ? <p className="mt-1 max-w-[75ch] text-[14px] leading-6 text-[var(--muted)]">When: {recap.focus.trigger}</p> : null}
          {full ? <p className="mt-1 max-w-[75ch] text-[14px] leading-6 text-[var(--muted)]">Use your trade notes to check this focus before carrying it forward. P&amp;L alone does not show whether you followed it.</p> : null}
        </div>
      ) : full && recap.question && !hasCoachingQuestion ? (
        <div className="mt-6">
          <h4 className={headingClass}>One question to carry forward</h4>
          <p className="mt-2 max-w-[75ch] text-[15px] leading-7 text-[var(--body)]">{recap.question}</p>
        </div>
      ) : null}
      <p className="mt-5 max-w-[85ch] text-[12px] leading-5 text-[var(--muted)]">{recap.coverage}</p>
      {recap.evidence.length > 0 ? (
        <details key={`${recap.stage}-${recap.evidence[0].date}`} className="mt-3 border-t border-[var(--hairline)]">
          <summary className="w-fit cursor-pointer rounded-sm py-3 text-[13px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">{early ? "Explore the trades and session evidence" : "View session evidence"}</summary>
          {early ? <>
            {recap.development ? <p className="max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{recap.development}</p> : null}
            <Highlights recap={recap} returnTo={returnTo} />
          </> : null}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full max-w-2xl text-left text-[13px]">
              <caption className="sr-only">Imported sessions supporting the weekly recap</caption>
              <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th scope="col" className="py-2 font-medium">Day</th><th scope="col" className="px-3 py-2 text-right font-medium">Trades</th><th scope="col" className="px-3 py-2 text-right font-medium">P&amp;L</th><th scope="col" className="py-2 text-right font-medium">Running P&amp;L</th></tr></thead>
              <tbody>{recap.evidence.map((row) => <tr key={row.date} className="border-b border-[var(--hairline)]">
                <th scope="row" className="py-3 font-medium"><Link className={linkClass} href={`/journal?${new URLSearchParams({ date: row.date, scope: "day" })}`}>{recapWeekday(row.date)}</Link></th>
                <td className="px-3 py-3 text-right tabular-nums">{row.trades}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{recapMoney(row.pnl)}</td><td className="whitespace-nowrap py-3 text-right tabular-nums">{recapMoney(row.cumulativePnl)}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="mt-3 max-w-[85ch] text-[12px] leading-5 text-[var(--muted)]">Highlights rank net realized contribution within this week, including partial exits and costs recorded on each session. They describe outcomes, not decision quality. The running balance measures session ends, not intraday drawdown.</p>
          {recap.market.length ? <ul className="mt-3 space-y-1 text-[12px] leading-5 text-[var(--muted)]">{recap.market.map(({ date, observation }) => <li key={date}>{recapWeekday(date)} · {observation.source} · {observation.provenance} · {observation.coverage} coverage · Updated {observation.updatedDate}</li>)}</ul> : null}
        </details>
      ) : null}
    </section>
  );
}
