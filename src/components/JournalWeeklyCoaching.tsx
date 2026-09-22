import Link from "next/link";
import { recapMoney, recapWeekday } from "@/lib/weeklyRecap";
import type { WeeklyCoaching, WeeklyCoachingFinding, WeeklyMarketReview } from "@/lib/weeklyCoachingTypes";

const linkClass = "rounded-sm text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]";
const headingClass = "text-[15px] font-semibold leading-6 text-[var(--foreground)]";

function findingCount(stage: "early" | "developing" | "full") {
  return stage === "early" ? 1 : stage === "developing" ? 2 : 3;
}

function TradeLinks({ trades, returnTo }: { trades: WeeklyCoachingFinding["trades"]; returnTo: string }) {
  if (!trades.length) return null;
  return (
    <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
      Review: {trades.map((trade, index) => {
        const href = `/trades/review?${new URLSearchParams({ date: trade.date, symbol: trade.symbol, trade: String(trade.id), returnTo })}`;
        return <span key={trade.id}>{index > 0 ? " · " : null}<Link href={href} className={linkClass} aria-label={`Review ${trade.symbol} trade from ${recapWeekday(trade.date)}`}>{trade.symbol} · {recapWeekday(trade.date)}</Link></span>;
      })}
    </p>
  );
}

function Finding({ finding, returnTo }: { finding: WeeklyCoachingFinding; returnTo: string }) {
  return (
    <li className="border-t border-[var(--hairline)] pt-4 first:border-t-0 first:pt-0">
      <p className="text-[15px] font-semibold leading-6 text-[var(--foreground)]">{finding.read}</p>
      <p className="mt-1 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{finding.evidence}</p>
      <TradeLinks trades={finding.trades} returnTo={returnTo} />
      {finding.question ? <p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{finding.question}</p> : null}
    </li>
  );
}

function CoachingRead({ coaching, stage, returnTo }: { coaching: WeeklyCoaching; stage: "early" | "developing" | "full"; returnTo: string }) {
  const findings = coaching.findings.slice(0, findingCount(stage));
  return (
    <section aria-label="Weekly coaching" className="mt-6 border-t border-[var(--hairline)] pt-5">
      <h4 className={headingClass}>Coaching read</h4>
      <p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{coaching.scope.description}</p>
      {findings.length ? <ol className="mt-4 space-y-4">{findings.map((finding) => <Finding key={finding.id} finding={finding} returnTo={returnTo} />)}</ol> : null}
      <details className="mt-4 border-t border-[var(--hairline)]" open={stage === "full"}>
        <summary className="w-fit cursor-pointer rounded-sm py-3 text-[13px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Performance breakdown and methodology</summary>
        {coaching.groups.map((group, index) => <div key={group.label} className={`${index ? "mt-5 border-t border-[var(--hairline)] pt-3" : ""} max-w-3xl`}>
          <h5 className="text-[13px] font-medium text-[var(--foreground)]">{group.label}</h5>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] leading-6 sm:grid-cols-2">
            {group.rows.map((row) => <div key={row.label}><dt className="text-[var(--muted)]">{row.label}</dt><dd className="font-mono tabular-nums text-[var(--foreground)]">{row.value}{row.detail ? <span className="ml-2 font-sans text-[var(--muted)]">{row.detail}</span> : null}</dd></div>)}
          </dl>
        </div>)}
        <div className="mt-5 max-w-3xl border-t border-[var(--hairline)] pt-3">
          <h5 className="text-[13px] font-medium text-[var(--foreground)]">Methodology</h5>
          <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] leading-6 sm:grid-cols-2">
            <div><dt className="text-[var(--muted)]">Included</dt><dd className="font-mono tabular-nums text-[var(--foreground)]">{coaching.scope.includedTrades} completed intraday trades / {coaching.scope.sessions} sessions</dd></div>
            <div><dt className="text-[var(--muted)]">Excluded</dt><dd className="font-mono tabular-nums text-[var(--foreground)]">{coaching.scope.excludedTrades} trades</dd></div>
            <div><dt className="text-[var(--muted)]">Recorded activity</dt><dd className="font-mono tabular-nums text-[var(--foreground)]">{coaching.scope.activityTrades} trades</dd></div>
            <div><dt className="text-[var(--muted)]">Fee status unknown</dt><dd className="font-mono tabular-nums text-[var(--foreground)]">{coaching.scope.unknownFeeTrades} trades</dd></div>
            <div><dt className="text-[var(--muted)]">Baseline</dt><dd className="text-[var(--foreground)]">{coaching.baseline.label} · <span className="font-mono tabular-nums">{coaching.baseline.trades} trades / {coaching.baseline.sessions} sessions</span></dd></div>
          </dl>
        </div>
      </details>
    </section>
  );
}

function Leaders({ leaders }: { leaders: WeeklyMarketReview["days"][number]["leaders"] }) {
  if (!leaders.length) return <>None recorded</>;
  return <>{leaders.slice(0, 3).map((leader, index) => <span key={leader.symbol}>{index > 0 ? " · " : null}{leader.symbol}{leader.peakGainPercent == null ? "" : ` ${leader.peakGainPercent > 0 ? "+" : ""}${leader.peakGainPercent.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`}</span>)}</>;
}

function MarketDays({ market }: { market: WeeklyMarketReview }) {
  if (!market.days.length) return null;
  return (
    <details className="mt-4 border-t border-[var(--hairline)]">
      <summary className="w-fit cursor-pointer rounded-sm py-3 text-[13px] font-medium text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">View market coverage by day</summary>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] max-w-4xl text-left text-[13px] leading-6">
          <caption className="sr-only">Retrospective market coverage by trading day</caption>
          <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th scope="col" className="py-2 font-medium">Day</th><th scope="col" className="px-3 py-2 font-medium">Coverage</th><th scope="col" className="px-3 py-2 text-right font-medium">Observed eligible movers</th><th scope="col" className="px-3 py-2 font-medium">Traded tickers</th><th scope="col" className="py-2 font-medium">Retrospective leaders</th></tr></thead>
          <tbody>{market.days.map((day) => <tr key={day.date} className="border-b border-[var(--hairline)] align-top">
            <th scope="row" className="whitespace-nowrap py-3 font-medium"><Link href={`/analytics/momentum-archive?${new URLSearchParams({ date: day.date })}`} className={linkClass}>{recapWeekday(day.date)}</Link></th>
            <td className="px-3 py-3 text-[var(--body)]">{day.coverage} · {day.source}</td>
            <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--foreground)]">{day.eligibleMovers ?? "—"}</td>
            <td className="px-3 py-3 text-[var(--body)]">{day.tradedSymbols.length ? day.tradedSymbols.join(" · ") : "None"}</td>
            <td className="py-3 text-[var(--body)]"><Leaders leaders={day.leaders} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  );
}

function MarketReview({ market, stage }: { market: WeeklyMarketReview; stage: "early" | "developing" | "full" }) {
  const content = <><p className="mt-2 max-w-[75ch] text-[14px] leading-6 text-[var(--body)]">{market.summary}</p><p className="mt-1 max-w-[75ch] text-[13px] leading-6 text-[var(--muted)]">{market.detail}</p>{market.matchedPnl != null ? <p className="mt-3 text-[13px] leading-6 text-[var(--body)]"><span className="text-[var(--muted)]">Net P&amp;L on matched movers:</span> <span className={`font-mono tabular-nums ${market.matchedPnl > 0 ? "text-[var(--green)]" : market.matchedPnl < 0 ? "text-[var(--red)]" : "text-[var(--foreground)]"}`}>{recapMoney(market.matchedPnl)}</span></p> : null}<MarketDays market={market} /><p className="mt-3 max-w-[85ch] text-[12px] leading-5 text-[var(--muted)]">{market.note}</p></>;
  return (
    <section aria-label="Weekly market review" className="mt-6 border-t border-[var(--hairline)] pt-5">
      {stage === "early" ? <details><summary className="w-fit cursor-pointer rounded-sm text-[15px] font-semibold leading-6 text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">Market review</summary>{content}</details> : <><h4 className={headingClass}>Market review</h4>{content}</>}
    </section>
  );
}

export default function JournalWeeklyCoaching({ coaching, market, stage, returnTo }: { coaching?: WeeklyCoaching; market?: WeeklyMarketReview; stage: "early" | "developing" | "full"; returnTo: string }) {
  if (!coaching && !market) return null;
  return <>{coaching ? <CoachingRead coaching={coaching} stage={stage} returnTo={returnTo} /> : null}{market ? <MarketReview market={market} stage={stage} /> : null}</>;
}
