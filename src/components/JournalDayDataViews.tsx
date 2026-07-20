"use client";

import dynamic from "next/dynamic";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

const InlineTradeReviewPanel = dynamic(() => import("@/components/InlineTradeReviewPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center px-6 py-8 text-sm text-[var(--muted)]">
      Loading trade review…
    </div>
  ),
});

export type JournalDataScope = "day" | "week" | "month";
export type JournalDataView = "pnl" | "trades" | "process" | "edge" | "alignment" | "horizon" | "risk" | "coach";

const scopeViews: Record<JournalDataScope, { key: JournalDataView; label: string }[]> = {
  day: [
    { key: "pnl", label: "P&L" },
    { key: "trades", label: "Trades" },
    { key: "process", label: "Process" },
    { key: "coach", label: "Coach" },
  ],
  week: [
    { key: "pnl", label: "P&L" },
    { key: "edge", label: "Edge" },
    { key: "alignment", label: "Alignment" },
    { key: "coach", label: "Coach" },
  ],
  month: [
    { key: "pnl", label: "P&L" },
    { key: "horizon", label: "Horizon" },
    { key: "risk", label: "Risk" },
    { key: "coach", label: "Coach" },
  ],
};

export type JournalDayTradeRow = {
  id: number;
  time: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  hold: string;
  setup: string | null;
  tagged: boolean;
  pnl: number;
};

export type JournalDayProcessFact = {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
};

export type JournalCoachSummary = {
  diagnosis: string;
  evidence: string;
  action: string;
  confidence: string;
};

export type JournalRangeSummary = {
  label: string;
  sessions: number;
  trades: number;
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
};

export type JournalSessionRow = {
  date: string;
  label: string;
  trades: number;
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
  activityRead?: string;
};

export type JournalEdgeRow = {
  label: string;
  trades: number;
  winRate: number | null;
  profitFactor: number | null;
  expectancy: number;
  pnl: number;
};

export type JournalHorizonRow = {
  metric: string;
  current: string;
  baseline: string;
  read: string;
  tone: "positive" | "negative" | "neutral";
};

export type JournalComparisonData = {
  week: {
    summary: JournalRangeSummary;
    sessions: JournalSessionRow[];
    edgeRows: JournalEdgeRow[];
    taggedCoverage: number | null;
    plannedRiskCoverage: number;
    coach: JournalCoachSummary;
  };
  month: {
    summary: JournalRangeSummary;
    sessions: JournalSessionRow[];
    horizonRows: JournalHorizonRow[];
    risk: {
      maxDrawdown: number;
      worstDay: number | null;
      worstTwoLossShare: number | null;
      highActivityLossShare: number | null;
      redDays: number;
    };
    coach: JournalCoachSummary;
  };
};

function money(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function percent(value: number | null) {
  return value == null ? "—" : `${value}%`;
}

function ratio(value: number | null) {
  return value == null ? "—" : value.toFixed(2);
}

function pnlClass(value: number) {
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function factClass(tone: JournalDayProcessFact["tone"] | JournalHorizonRow["tone"]) {
  if (tone === "positive") return "text-[var(--green)]";
  if (tone === "negative") return "text-[var(--red)]";
  return "text-[var(--foreground)]";
}

export default function JournalDayDataViews({
  initialScope = "day",
  initialView = "pnl",
  pnlContent,
  tradeRows,
  processFacts,
  coach,
  summary,
  comparisons,
  date,
  returnTo,
}: {
  initialScope?: JournalDataScope;
  initialView?: JournalDataView;
  pnlContent: ReactNode;
  tradeRows: JournalDayTradeRow[];
  processFacts: JournalDayProcessFact[];
  coach: JournalCoachSummary;
  summary: {
    trades: number;
    accuracy: number | null;
    profitFactor: number | null;
    pnl: number;
    taggedTrades: number;
  };
  comparisons: JournalComparisonData;
  date: string;
  returnTo: string;
}) {
  const [scope, setScope] = useState<JournalDataScope>(initialScope);
  const [view, setView] = useState<JournalDataView>(
    scopeViews[initialScope].some((item) => item.key === initialView) ? initialView : scopeViews[initialScope][0].key,
  );
  const views = scopeViews[scope];

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("scope", scope);
    url.searchParams.set("view", view);
    window.history.replaceState(null, "", `${url.pathname}?${url.searchParams.toString()}`);
  }, [scope, view]);

  function selectScope(nextScope: JournalDataScope) {
    setScope(nextScope);
    setView(scopeViews[nextScope][0].key);
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[var(--hairline)]">
        <div role="tablist" aria-label="Journal time range" className="flex min-w-0 items-center gap-1 text-[14px] font-semibold">
          {(["day", "week", "month"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={scope === item}
              onClick={() => selectScope(item)}
              className={`-mb-px border-b-2 px-4 py-3.5 capitalize transition-colors ${
                scope === item
                  ? "border-[var(--foreground)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div role="tablist" aria-label={`${scope} data view`} className="flex min-w-0 gap-1 overflow-x-auto pb-2.5">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={view === item.key}
              onClick={() => setView(item.key)}
              className={`min-h-8 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
                view === item.key
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        {scope === "day" ? (
          <DayViews
            view={view}
            pnlContent={pnlContent}
            tradeRows={tradeRows}
            processFacts={processFacts}
            coach={coach}
            summary={summary}
            date={date}
            returnTo={returnTo}
          />
        ) : null}
        {scope === "week" ? <WeekViews view={view} data={comparisons.week} /> : null}
        {scope === "month" ? <MonthViews view={view} data={comparisons.month} /> : null}
      </div>
    </section>
  );
}

function DayViews({
  view,
  pnlContent,
  tradeRows,
  processFacts,
  coach,
  summary,
  date,
  returnTo,
}: {
  view: JournalDataView;
  pnlContent: ReactNode;
  tradeRows: JournalDayTradeRow[];
  processFacts: JournalDayProcessFact[];
  coach: JournalCoachSummary;
  summary: { trades: number; accuracy: number | null; profitFactor: number | null; pnl: number; taggedTrades: number };
  date: string;
  returnTo: string;
}) {
  if (view === "pnl") return <div role="tabpanel">{pnlContent}</div>;

  if (view === "trades") {
    return (
      <div role="tabpanel">
        <MetricGrid>
          <Metric label="Trades" value={String(summary.trades)} />
          <Metric label="Accuracy" value={percent(summary.accuracy)} />
          <Metric label="Profit factor" value={ratio(summary.profitFactor)} />
          <Metric label="Total P&L" value={money(summary.pnl)} className={pnlClass(summary.pnl)} />
        </MetricGrid>
        <TradeTable date={date} returnTo={returnTo} tradeRows={tradeRows} />
        <p className="mt-3 text-[12px] text-[var(--muted)]">
          {summary.taggedTrades} of {summary.trades} trades have structured tag context. Missing setup or tag data stays visible instead of being inferred.
        </p>
      </div>
    );
  }

  if (view === "process") {
    return (
      <div role="tabpanel" className="grid gap-3">
        {processFacts.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div className="text-[12px] text-[var(--muted)]">{fact.label}</div>
            <div className={`mt-1 text-sm font-semibold ${factClass(fact.tone)}`}>{fact.value}</div>
            <p className="mt-2 text-[12px] leading-5 text-[var(--body)]">{fact.detail}</p>
          </div>
        ))}
      </div>
    );
  }

  return <CoachRead coach={coach} label="Deterministic diagnosis" />;
}

function WeekViews({ view, data }: { view: JournalDataView; data: JournalComparisonData["week"] }) {
  if (view === "pnl") {
    return (
      <div role="tabpanel">
        <RangeHeader summary={data.summary} question="Was the week carried by one session or built consistently?" />
        <SessionTable rows={data.sessions} />
        <EvidenceBoundary>Imported trade sessions only. A zero-trade day cannot be labeled intentional until scanner or journal-session coverage exists.</EvidenceBoundary>
      </div>
    );
  }

  if (view === "edge") {
    return (
      <div role="tabpanel">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Setup coverage" value={data.taggedCoverage == null ? "—" : `${data.taggedCoverage}%`} />
          <Metric label="Planned-risk coverage" value={`${Math.round(data.plannedRiskCoverage * 100)}%`} />
          <Metric label="Edge unit" value="Net $ / trade" />
        </div>
        <div className="mt-6">
          <SectionLabel>Expectancy by captured setup</SectionLabel>
          {data.edgeRows.length ? (
            <div className="mt-3 overflow-x-auto border-y border-[var(--hairline)]">
              <table className="w-full min-w-[590px] border-collapse text-left text-[12px]">
                <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th className="px-3 py-3 font-medium">Setup</th><th className="px-3 py-3 text-right font-medium">Trades</th><th className="px-3 py-3 text-right font-medium">Win</th><th className="px-3 py-3 text-right font-medium">PF</th><th className="px-3 py-3 text-right font-medium">Exp / trade</th><th className="px-3 py-3 text-right font-medium">P&L</th></tr></thead>
                <tbody>{data.edgeRows.map((row) => <tr key={row.label} className="border-b border-[var(--hairline)]"><td className="px-3 py-3 font-semibold">{row.label}</td><td className="px-3 py-3 text-right font-mono">{row.trades}</td><td className="px-3 py-3 text-right font-mono">{percent(row.winRate)}</td><td className="px-3 py-3 text-right font-mono">{ratio(row.profitFactor)}</td><td className={`px-3 py-3 text-right font-mono ${pnlClass(row.expectancy)}`}>{money(row.expectancy)}</td><td className={`px-3 py-3 text-right font-mono ${pnlClass(row.pnl)}`}>{money(row.pnl)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <EmptyEvidence>No setup data was captured for this week.</EmptyEvidence>}
        </div>
        <EvidenceBoundary>Dollar expectancy is the honest V1 unit. R stays hidden until planned-risk coverage is reliable, and small setup samples remain directional.</EvidenceBoundary>
      </div>
    );
  }

  if (view === "alignment") {
    return (
      <div role="tabpanel">
        <ReadFirst title="Market context not connected">
          Activity is visible, but opportunity quality is not. This view will score participation only after the Stock Info daily summary can distinguish a slow tape from missing coverage.
        </ReadFirst>
        <SessionTable rows={data.sessions} showActivity />
        <EvidenceBoundary>Relative activity is descriptive—not evidence of boredom, FOMO, tilt, or a market-context mismatch.</EvidenceBoundary>
      </div>
    );
  }

  return <CoachRead coach={data.coach} label="Weekly read" />;
}

function MonthViews({ view, data }: { view: JournalDataView; data: JournalComparisonData["month"] }) {
  if (view === "pnl") {
    return (
      <div role="tabpanel">
        <RangeHeader summary={data.summary} question="How were outcomes distributed across the month?" />
        <SessionTable rows={data.sessions} />
        <EvidenceBoundary>Heat and session counts currently reflect imported trading sessions, not every market day in the calendar.</EvidenceBoundary>
      </div>
    );
  }

  if (view === "horizon") {
    return (
      <div role="tabpanel">
        <ReadFirst title="Selected month vs prior 30 days">
          This first live horizon compares the active month with the existing baseline. Longer 60d, 90d, and YTD windows remain a follow-on data contract.
        </ReadFirst>
        <div className="mt-5 overflow-x-auto border-y border-[var(--hairline)]">
          <table className="w-full min-w-[540px] border-collapse text-left text-[12px]">
            <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th className="px-3 py-3 font-medium">Metric</th><th className="px-3 py-3 text-right font-medium">Selected month</th><th className="px-3 py-3 text-right font-medium">Prior 30d</th><th className="px-3 py-3 text-right font-medium">Read</th></tr></thead>
            <tbody>{data.horizonRows.map((row) => <tr key={row.metric} className="border-b border-[var(--hairline)]"><td className="px-3 py-3 font-semibold">{row.metric}</td><td className="px-3 py-3 text-right font-mono">{row.current}</td><td className="px-3 py-3 text-right font-mono text-[var(--body)]">{row.baseline}</td><td className={`px-3 py-3 text-right font-semibold ${factClass(row.tone)}`}>{row.read}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    );
  }

  if (view === "risk") {
    const risk = data.risk;
    return (
      <div role="tabpanel">
        <MetricGrid>
          <Metric label="Daily max drawdown" value={money(risk.maxDrawdown)} className={pnlClass(risk.maxDrawdown)} />
          <Metric label="Worst day" value={risk.worstDay == null ? "—" : money(risk.worstDay)} className={risk.worstDay == null ? undefined : pnlClass(risk.worstDay)} />
          <Metric label="Worst 2 / losses" value={risk.worstTwoLossShare == null ? "—" : `${risk.worstTwoLossShare}%`} />
          <Metric label="Red sessions" value={String(risk.redDays)} />
        </MetricGrid>
        <ReadFirst title="Realized loss concentration">
          {risk.highActivityLossShare == null ? "There are not enough red sessions to estimate activity concentration." : `${risk.highActivityLossShare}% of realized session losses occurred on above-median activity days.`}
        </ReadFirst>
        <EvidenceBoundary>This is descriptive daily-dollar risk. It does not simulate stops, sizing rules, Kelly, or Sharpe-in-R.</EvidenceBoundary>
      </div>
    );
  }

  return <CoachRead coach={data.coach} label="Monthly read" />;
}

function RangeHeader({ summary, question }: { summary: JournalRangeSummary; question: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><SectionLabel>{summary.label}</SectionLabel><p className="mt-2 text-[14px] leading-6 text-[var(--body)]">{question}</p></div>
        <div className={`font-mono text-[18px] font-semibold tabular-nums ${pnlClass(summary.pnl)}`}>{money(summary.pnl)}</div>
      </div>
      <MetricGrid className="mt-5">
        <Metric label="Sessions" value={String(summary.sessions)} />
        <Metric label="Trades" value={String(summary.trades)} />
        <Metric label="Accuracy" value={percent(summary.accuracy)} />
        <Metric label="Profit factor" value={ratio(summary.profitFactor)} />
      </MetricGrid>
    </div>
  );
}

function SessionTable({ rows, showActivity = false }: { rows: JournalSessionRow[]; showActivity?: boolean }) {
  if (!rows.length) return <EmptyEvidence>No imported sessions in this range.</EmptyEvidence>;
  return (
    <div className="mt-5 overflow-x-auto border-y border-[var(--hairline)]">
      <table className="w-full min-w-[580px] border-collapse text-left text-[12px]">
        <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th className="px-3 py-3 font-medium">Session</th>{showActivity ? <th className="px-3 py-3 font-medium">Market context</th> : null}<th className="px-3 py-3 text-right font-medium">Trades</th><th className="px-3 py-3 text-right font-medium">Win</th><th className="px-3 py-3 text-right font-medium">PF</th>{showActivity ? <th className="px-3 py-3 text-right font-medium">Activity read</th> : <th className="px-3 py-3 text-right font-medium">P&L</th>}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.date} className="border-b border-[var(--hairline)]"><td className="px-3 py-3 font-semibold">{row.label}</td>{showActivity ? <td className="px-3 py-3 text-[var(--muted)]">Unavailable</td> : null}<td className="px-3 py-3 text-right font-mono">{row.trades}</td><td className="px-3 py-3 text-right font-mono">{percent(row.accuracy)}</td><td className="px-3 py-3 text-right font-mono">{ratio(row.profitFactor)}</td>{showActivity ? <td className="px-3 py-3 text-right text-[var(--body)]">{row.activityRead}</td> : <td className={`px-3 py-3 text-right font-mono ${pnlClass(row.pnl)}`}>{money(row.pnl)}</td>}</tr>)}</tbody>
      </table>
    </div>
  );
}

function TradeTable({
  date,
  returnTo,
  tradeRows,
}: {
  date: string;
  returnTo: string;
  tradeRows: JournalDayTradeRow[];
}) {
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [closingTradeId, setClosingTradeId] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function closeTrade(tradeId: number) {
    clearCloseTimer();
    setClosingTradeId(tradeId);
    closeTimerRef.current = setTimeout(() => {
      setExpandedTradeId((current) => current === tradeId ? null : current);
      setClosingTradeId((current) => current === tradeId ? null : current);
      closeTimerRef.current = null;
    }, 200);
  }

  function toggleTrade(tradeId: number) {
    if (expandedTradeId === tradeId) {
      if (closingTradeId === tradeId) {
        clearCloseTimer();
        setClosingTradeId(null);
      } else {
        closeTrade(tradeId);
      }
      return;
    }

    clearCloseTimer();
    setClosingTradeId(null);
    setExpandedTradeId(tradeId);
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full min-w-[610px] border-collapse text-left text-[12px]">
        <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th className="px-4 py-3 font-medium">Time</th><th className="px-2 py-3 font-medium">Symbol</th><th className="px-2 py-3 font-medium">Side / shares</th><th className="px-2 py-3 font-medium">Held</th><th className="px-2 py-3 font-medium">Setup</th><th className="px-2 py-3 font-medium">Context</th><th className="px-4 py-3 text-right font-medium">P&L</th></tr></thead>
        <tbody>
          {tradeRows.map((trade) => {
            const expanded = expandedTradeId === trade.id;
            const closing = closingTradeId === trade.id;
            const panelId = `inline-trade-review-${trade.id}`;
            return (
              <Fragment key={trade.id}>
                <tr
                  className={`cursor-pointer border-b border-[var(--hairline)] text-[var(--body)] transition-colors hover:bg-[var(--surface-2)] ${expanded && !closing ? "bg-[var(--surface-2)]" : ""}`}
                  onClick={() => toggleTrade(trade.id)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums">
                    <button
                      type="button"
                      aria-controls={panelId}
                      aria-expanded={expanded && !closing}
                      className="inline-flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <span aria-hidden="true" className={`text-[10px] text-[var(--accent)] transition-transform ${expanded && !closing ? "rotate-90" : ""}`}>›</span>
                      <span>{trade.time}</span>
                      <span className="sr-only">Review {trade.symbol} trade</span>
                    </button>
                  </td>
                  <td className="px-2 py-3 font-semibold text-[var(--foreground)]">{trade.symbol}</td>
                  <td className="px-2 py-3 capitalize">{trade.side} · {trade.quantity.toLocaleString()}</td>
                  <td className="px-2 py-3 font-mono tabular-nums">{trade.hold}</td>
                  <td className="px-2 py-3">{trade.setup ?? "Not captured"}</td>
                  <td className="px-2 py-3">{trade.tagged ? "Tagged" : "Needs context"}</td>
                  <td className={`px-4 py-3 text-right font-mono tabular-nums ${pnlClass(trade.pnl)}`}>{money(trade.pnl)}</td>
                </tr>
                {expanded ? (
                  <tr id={panelId}>
                    <td colSpan={7} className="border-b border-[var(--border)] bg-[var(--background)] p-0">
                      <div className={`inline-trade-disclosure ${closing ? "inline-trade-disclosure--closing" : ""}`}>
                        <div className="inline-trade-disclosure__content">
                          <InlineTradeReviewPanel
                            date={date}
                            onClose={() => closeTrade(trade.id)}
                            returnTo={returnTo}
                            symbol={trade.symbol}
                            tradeId={trade.id}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CoachRead({ coach, label }: { coach: JournalCoachSummary; label: string }) {
  return (
    <div role="tabpanel" className="grid gap-6 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div><div className="text-[12px] text-[var(--muted)]">{label}</div><p className="mt-2 text-[17px] font-medium leading-7 text-[var(--foreground)]">{coach.diagnosis}</p><p className="mt-3 text-[13px] leading-6 text-[var(--body)]">{coach.evidence}</p></div>
      <div className="border-l border-[var(--hairline)] pl-5"><div className="text-[12px] text-[var(--muted)]">One thing to try</div><p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">{coach.action}</p><p className="mt-3 text-[12px] capitalize text-[var(--muted)]">{coach.confidence} confidence</p></div>
    </div>
  );
}

function ReadFirst({ title, children }: { title: string; children: ReactNode }) {
  return <div className="border-l-2 border-[var(--accent)] pl-4"><div className="text-[12px] font-semibold text-[var(--foreground)]">{title}</div><p className="mt-2 text-[13px] leading-6 text-[var(--body)]">{children}</p></div>;
}

function EvidenceBoundary({ children }: { children: ReactNode }) {
  return <p className="mt-5 border-t border-[var(--hairline)] pt-4 text-[12px] leading-5 text-[var(--muted)]">{children}</p>;
}

function EmptyEvidence({ children }: { children: ReactNode }) {
  return <p className="mt-5 rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-[13px] text-[var(--muted)]">{children}</p>;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">{children}</div>;
}

function MetricGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-3 sm:grid-cols-4 ${className}`}>{children}</div>;
}

function Metric({ label, value, className = "text-[var(--foreground)]" }: { label: string; value: string; className?: string }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"><div className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div><div className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${className}`}>{value}</div></div>;
}
