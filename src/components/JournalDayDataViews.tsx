"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import JournalReviewTabs, {
  JOURNAL_SCOPE_VIEWS,
  type JournalDataScope,
  type JournalDataView,
} from "@/components/JournalReviewTabs";
import { useOptionalJournalDateNavigation } from "@/components/JournalDateNavigation";
import JournalWeekPnlChart from "@/components/JournalWeekPnlChart";
import JournalWeeklyRecap from "@/components/JournalWeeklyRecap";
import type { WeeklyRecap } from "@/lib/weeklyRecap";
import InlineLedgerDisclosure, { useInlineLedgerDisclosure } from "@/components/ui/InlineLedgerDisclosure";

import { averagePnlPerShare, formatPerShareMoney as perShareMoney, AVERAGE_PNL_PER_SHARE_DESCRIPTION } from "@/lib/averagePnlPerShare";
import TradingStatsBar, { type TradingStatMetric } from "@/components/ui/TradingStatsBar";
import MonthCalendar from "@/components/MonthCalendar";
import type { CalendarMonthData } from "@/lib/monthCalendar";

export type { JournalDataScope, JournalDataView } from "@/components/JournalReviewTabs";

const InlineTradeReviewPanel = dynamic(() => import("@/components/InlineTradeReviewPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[360px] place-items-center px-6 py-8 text-sm text-[var(--muted)]">
      Loading trade review…
    </div>
  ),
});

export type JournalDayTradeRow = {
  id: number;
  time: string;
  symbol: string;
  side: "long" | "short";
  quantity: number;
  executionCount: number;
  entryPrice: number | null;
  exitPrice: number | null;
  perShare: number | null;
  hold: string;
  setup: string | null;
  tags: string[];
  pnl: number;
};

export type JournalDayProcessFact = {
  label: string;
  value: string;
  detail: string;
  tone?: "positive" | "negative" | "neutral";
};

export type JournalChartReadSummary = {
  total: number;
  readable: number;
  supported: number;
  contradicted: number;
  unclear: number;
  consolidating: number;
  exhaustion: number;
  cleanExpansion: number;
  whippyExpansion: number;
  headline: string;
};

export type JournalCoachSummary = {
  diagnosis: string;
  evidence: string;
  action: string;
  confidence: string;
};

export type JournalRangeSummary = {
  avgPnlPerShare?: number | null;
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
  tickerTrades?: { symbol: string; trades: number }[];
  activityRead?: string;
  marketContextLabel?: string;
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
    key: string;
    asOfDate: string;
    recap: WeeklyRecap;
    summary: JournalRangeSummary;
    sessions: JournalSessionRow[];
    edgeRows: JournalEdgeRow[];
    taggedCoverage: number | null;
    plannedRiskCoverage: number;
    marketContextCoverage: { available: number; sessions: number };
    chartRead: JournalChartReadSummary;
    coach: JournalCoachSummary;
  };
  month: {
    calendar: CalendarMonthData;
    key: string;
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
    chartRead: JournalChartReadSummary;
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

function price(value: number | null) {
  return value == null ? "—" : `$${value.toFixed(2)}`;
}

function factClass(tone: JournalDayProcessFact["tone"] | JournalHorizonRow["tone"]) {
  if (tone === "positive") return "text-[var(--green)]";
  if (tone === "negative") return "text-[var(--red)]";
  return "text-[var(--foreground)]";
}

export default function JournalReviewModule({
  pnlContent,
  tradeRows,
  processFacts,
  coach,
  summary,
  comparisons,
  date,
  returnTo,
  weekCoachSlot,
  monthCoachSlot,
  dayCoachSlot,
  weekOverview,
}: {
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
  /** Server-rendered scope-aware coach review panels (generation lives here). */
  weekCoachSlot?: ReactNode;
  monthCoachSlot?: ReactNode;
  dayCoachSlot?: ReactNode;
  weekOverview?: ReactNode;
}) {
  const navigation = useOptionalJournalDateNavigation();
  const [localScope, setLocalScope] = useState<JournalDataScope>("day");
  const scope = navigation?.scope ?? localScope;
  const setScope = navigation?.setScope ?? setLocalScope;
  const searchParams = useSearchParams();
  const [selectedView, setView] = useState<JournalDataView>(searchParams.get("view") === "coach" ? "coach" : "pnl");
  // Date controls can switch scope independently of the period tabs.
  const view = JOURNAL_SCOPE_VIEWS[scope].some((item) => item.key === selectedView)
    ? selectedView
    : "pnl";

  function selectScope(nextScope: JournalDataScope) {
    setScope(nextScope);
    if (nextScope === "day" && summary.trades === 0) {
      setView("pnl");
      return;
    }
    // Keep the current view when the next scope offers it (e.g. Coach exists
    // in all three scopes) — resetting to P&L made content "disappear".
    const nextViews = JOURNAL_SCOPE_VIEWS[nextScope];
    if (!nextViews.some((item) => item.key === view)) {
      setView(nextViews[0].key);
    }
  }

  return (
    <section>
      <JournalReviewTabs
        scope={scope}
        view={view}
        onScopeChange={selectScope}
        onViewChange={setView}
        showViews={scope !== "day" || summary.trades > 0}
      />

      <div
        key={`${scope}-${view}`}
        className={`mt-7 ${scope === "day" && view === "pnl" ? "" : "journal-review-panel-enter"}`}
      >
        {scope === "day" ? (
          <DayViews
            view={view}
            pnlContent={pnlContent}
            tradeRows={tradeRows}
            processFacts={processFacts}
            coach={coach}
            coachSlot={dayCoachSlot}
            summary={summary}
            date={date}
            returnTo={returnTo}
          />
        ) : null}
        {scope === "week" ? <WeekViews view={view} data={comparisons.week} coachSlot={weekCoachSlot} overview={weekOverview} returnTo={returnTo} /> : null}
        {scope === "month" ? <MonthViews view={view} data={comparisons.month} coachSlot={monthCoachSlot} returnTo={returnTo} /> : null}
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
  coachSlot,
  summary,
  date,
  returnTo,
}: {
  view: JournalDataView;
  pnlContent: ReactNode;
  tradeRows: JournalDayTradeRow[];
  processFacts: JournalDayProcessFact[];
  coach: JournalCoachSummary;
  coachSlot?: ReactNode;
  summary: { trades: number; accuracy: number | null; profitFactor: number | null; pnl: number; taggedTrades: number };
  date: string;
  returnTo: string;
}) {
  const perShare = averagePnlPerShare(tradeRows);
  const summaryMetrics: TradingStatMetric[] = [
    { label: "Trades", value: String(summary.trades) },
    { label: "Accuracy", value: percent(summary.accuracy) },
    { label: "Profit factor", value: ratio(summary.profitFactor) },
    { label: "Per share", value: perShareMoney(perShare), tone: perShare == null || perShare === 0 ? "muted" : perShare > 0 ? "positive" : "negative", description: AVERAGE_PNL_PER_SHARE_DESCRIPTION },
    { label: "P&L", value: money(summary.pnl), tone: summary.pnl > 0 ? "positive" : summary.pnl < 0 ? "negative" : "muted" },
  ];

  if (view === "pnl") return <div role="tabpanel">
    {summary.trades > 0 ? <TradingStatsBar ariaLabel="Daily trading summary" metrics={summaryMetrics} className="mb-4" /> : null}
    {pnlContent}
  </div>;

  if (view === "trades") {
    return (
      <div role="tabpanel">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <TradingStatsBar ariaLabel="Trade summary" metrics={summaryMetrics} size="regular" />
          <WinLossBar tradeRows={tradeRows} />
        </div>
        <TradeTable date={date} returnTo={returnTo} tradeRows={tradeRows} />
      </div>
    );
  }

  if (view === "process") {
    return (
      <div role="tabpanel" className="divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
        {processFacts.map((fact) => (
          <div key={fact.label} className="grid gap-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
            <div className="text-[12px] text-[var(--muted)]">{fact.label}</div>
            <div>
              <div className={`text-sm font-semibold ${factClass(fact.tone)}`}>{fact.value}</div>
              <p className="mt-1 text-[12px] leading-5 text-[var(--body)]">{fact.detail}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return coachSlot ? <div role="tabpanel">{coachSlot}</div> : <CoachRead coach={coach} label="Deterministic diagnosis" />;
}

function WinLossBar({ tradeRows }: { tradeRows: JournalDayTradeRow[] }) {
  const wins = tradeRows.filter((trade) => trade.pnl > 0).length;
  const losses = tradeRows.filter((trade) => trade.pnl < 0).length;
  const flats = tradeRows.length - wins - losses;
  const decisiveTrades = wins + losses;
  const label = [
    `${wins} ${wins === 1 ? "win" : "wins"}`,
    `${losses} ${losses === 1 ? "loss" : "losses"}`,
    ...(flats > 0 ? [`${flats} flat`] : []),
  ].join(" · ");

  return (
    <div className="grid min-w-[180px] justify-items-end gap-1.5 pb-1">
      <span className="text-[12.5px] leading-5 text-[var(--muted)] tabular-nums">{label}</span>
      <div
        role="img"
        aria-label={`${label}. Win-loss distribution.`}
        className="flex h-1.5 w-[180px] overflow-hidden rounded-full bg-[var(--surface-2)]"
      >
        {decisiveTrades === 0 ? null : (
          <>
            {wins > 0 ? <span aria-hidden="true" className="bg-[var(--green)]" style={{ flexGrow: wins }} /> : null}
            {wins > 0 && losses > 0 ? <span aria-hidden="true" className="w-0.5 shrink-0 bg-[var(--review-card-bg)]" /> : null}
            {losses > 0 ? <span aria-hidden="true" className="bg-[var(--red)]" style={{ flexGrow: losses }} /> : null}
          </>
        )}
      </div>
    </div>
  );
}

function WeekViews({
  view,
  data,
  coachSlot,
  overview,
  returnTo,
}: {
  view: JournalDataView;
  data: JournalComparisonData["week"];
  coachSlot?: ReactNode;
  overview?: ReactNode;
  returnTo: string;
}) {
  if (view === "pnl") {
    return (
      <div role="tabpanel">
        <TradingStatsBar ariaLabel="Weekly trading summary" className="mb-4" metrics={[
          { label: "Trades", value: String(data.summary.trades) },
          { label: "Accuracy", value: percent(data.summary.accuracy) },
          { label: "Profit factor", value: ratio(data.summary.profitFactor) },
          { label: "Per share", value: perShareMoney(data.summary.avgPnlPerShare ?? null), tone: data.summary.avgPnlPerShare == null || data.summary.avgPnlPerShare === 0 ? "muted" : data.summary.avgPnlPerShare > 0 ? "positive" : "negative", description: AVERAGE_PNL_PER_SHARE_DESCRIPTION },
          { label: "P&L", value: money(data.summary.pnl), tone: data.summary.pnl > 0 ? "positive" : data.summary.pnl < 0 ? "negative" : "muted" },
        ]} />
        {overview ? <div className="mb-6">{overview}</div> : null}
        <JournalWeekPnlChart
          asOfDate={data.asOfDate}
          weekStart={data.key}
          rows={data.sessions}
        />
        <JournalWeeklyRecap recap={data.recap} returnTo={returnTo} />
        <EvidenceBoundary>The curve connects cumulative results from imported sessions. Days without an import have no dot; they are not treated as intentional no-trade days.</EvidenceBoundary>
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
    const coverage = data.marketContextCoverage;
    return (
      <div role="tabpanel">
        <ChartReadOverview read={data.chartRead} />
        <ReadFirst title={coverage.available > 0 ? "Retrospective market context" : "Market context unavailable"}>
          {coverage.available > 0
            ? `${coverage.available} of ${coverage.sessions} imported sessions have completed-day market context. This can describe market heat and leadership, but not scanner timing or what was knowable before entry.`
            : "The chart read can judge the trades you took, but it cannot judge the opportunities you skipped or whether the whole market was hot, selective, or slow."}
        </ReadFirst>
        <SessionTable rows={data.sessions} showActivity />
        <EvidenceBoundary>Retrospective daily bars and relative activity are descriptive—not evidence of scanner compliance, boredom, FOMO, tilt, or what was known at entry.</EvidenceBoundary>
      </div>
    );
  }

  return <div role="tabpanel">{coachSlot ?? <CoachRead coach={data.coach} label="Weekly read" />}</div>;
}

function MonthViews({ view, data, coachSlot, returnTo }: { view: JournalDataView; data: JournalComparisonData["month"]; coachSlot?: ReactNode; returnTo: string }) {
  const navigation = useOptionalJournalDateNavigation();
  if (view === "pnl") {
    return (
      <div role="tabpanel">
        <MonthCalendar data={data.calendar} returnTo={monthCalendarReturnTo(returnTo)} onNavigateDay={navigation?.focusDay} />
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

  return <div role="tabpanel">{coachSlot ?? <CoachRead coach={data.coach} label="Monthly read" />}</div>;
}

function monthCalendarReturnTo(returnTo: string) {
  const url = new URL(returnTo, "http://journal.local");
  url.searchParams.set("scope", "month");
  return `${url.pathname}${url.search}`;
}

function ChartReadOverview({ read }: { read: JournalChartReadSummary }) {
  return (
    <section className="mb-6 border-y border-[var(--hairline)] py-4">
      <SectionLabel>Chart read at entry</SectionLabel>
      <p className="mt-2 text-[14px] leading-6 text-[var(--body)]">{read.headline}</p>
      <p className="mt-3 font-mono text-[12px] leading-5 text-[var(--muted)] tabular-nums">
        {read.supported} with trend · {read.contradicted} against · {read.unclear} unclear · {read.consolidating} tightening · {read.exhaustion} stalled
      </p>
      <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">
        {read.readable} of {read.total} trades had enough candle history to judge.
      </p>
    </section>
  );
}

function SessionTable({ rows, showActivity = false }: { rows: JournalSessionRow[]; showActivity?: boolean }) {
  if (!rows.length) return <EmptyEvidence>No imported sessions in this range.</EmptyEvidence>;
  return (
    <div className="mt-5 overflow-x-auto border-y border-[var(--hairline)]">
      <table className="w-full min-w-[580px] border-collapse text-left text-[12px]">
        <thead className="text-[var(--muted)]"><tr className="border-b border-[var(--hairline)]"><th className="px-3 py-3 font-medium">Session</th>{showActivity ? <th className="px-3 py-3 font-medium">Market context</th> : null}<th className="px-3 py-3 text-right font-medium">Trades</th><th className="px-3 py-3 text-right font-medium">Win</th><th className="px-3 py-3 text-right font-medium">PF</th>{showActivity ? <th className="px-3 py-3 text-right font-medium">Activity read</th> : <th className="px-3 py-3 text-right font-medium">P&L</th>}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.date} className="border-b border-[var(--hairline)]"><td className="px-3 py-3 font-semibold">{row.label}</td>{showActivity ? <td className="px-3 py-3 text-[var(--muted)]">{row.marketContextLabel ?? "Unavailable"}</td> : null}<td className="px-3 py-3 text-right font-mono">{row.trades}</td><td className="px-3 py-3 text-right font-mono">{percent(row.accuracy)}</td><td className="px-3 py-3 text-right font-mono">{ratio(row.profitFactor)}</td>{showActivity ? <td className="px-3 py-3 text-right text-[var(--body)]">{row.activityRead}</td> : <td className={`px-3 py-3 text-right font-mono ${pnlClass(row.pnl)}`}>{money(row.pnl)}</td>}</tr>)}</tbody>
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
  const disclosure = useInlineLedgerDisclosure<number>();
  const [showAll, setShowAll] = useState(false);
  const hasMore = tradeRows.length > 5;
  const visibleTradeRows = showAll ? tradeRows : tradeRows.slice(0, 5);

  return (
    <div className="mt-5 overflow-x-auto rounded-lg border border-[var(--review-card-border)] bg-[var(--review-card-bg)] shadow-[var(--review-card-shadow)]">
      <div className="min-w-[1060px]">
        <table className="w-full table-fixed border-collapse text-left text-[13px] leading-5">
          <colgroup>
            <col className="w-[9%]" />
            <col className="w-[9%]" />
            <col className="w-[8%]" />
            <col className="w-[7%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)] text-[12.5px]">
              <th className="px-4 py-3.5 font-semibold">Time</th>
              <th className="px-3 py-3.5 font-semibold">Symbol</th>
              <th className="px-3 py-3.5 font-semibold">Shares</th>
              <th className="px-3 py-3.5 font-semibold">Execs</th>
              <th className="px-3 py-3.5 font-semibold">Entry</th>
              <th className="px-3 py-3.5 font-semibold">Exit</th>
              <th className="px-3 py-3.5 font-semibold">Per share</th>
              <th className="px-3 py-3.5 font-semibold">Held</th>
              <th className="px-3 py-3.5 font-semibold">Context</th>
              <th className="px-4 py-3.5 text-right font-semibold">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
          {visibleTradeRows.map((trade) => {
            const expanded = disclosure.expandedId === trade.id;
            const closing = disclosure.closingId === trade.id;
            const panelId = `inline-trade-review-${trade.id}`;
            return (
              <Fragment key={trade.id}>
                <tr
                  className={`cursor-pointer border-b border-[var(--hairline)] text-[var(--body)] transition-colors hover:bg-[var(--review-card-hover)] ${expanded && !closing ? "bg-[var(--review-card-selected)]" : ""}`}
                  onClick={() => disclosure.toggle(trade.id)}
                >
                  <td className="px-4 py-3.5 tabular-nums text-[var(--muted)]">
                    <button
                      type="button"
                      aria-controls={panelId}
                      aria-expanded={expanded && !closing}
                      className="inline-flex cursor-pointer items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      <span>{trade.time}</span>
                      <span className="sr-only">Review {trade.symbol} trade</span>
                    </button>
                  </td>
                  <td className="px-3 py-3.5 font-semibold text-[var(--foreground)]">{trade.symbol}</td>
                  <td className="px-3 py-3.5 tabular-nums">{trade.quantity.toLocaleString("en-US")}</td>
                  <td className="px-3 py-3.5 tabular-nums text-[var(--muted)]">{trade.executionCount}</td>
                  <td className="px-3 py-3.5 tabular-nums">{price(trade.entryPrice)}</td>
                  <td className="px-3 py-3.5 tabular-nums">{price(trade.exitPrice)}</td>
                  <td className={`px-3 py-3.5 tabular-nums ${trade.perShare == null ? "text-[var(--muted)]" : pnlClass(trade.perShare)}`}>
                    {trade.perShare == null ? "—" : perShareMoney(trade.perShare)}
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap tabular-nums text-[var(--muted)]">{trade.hold}</td>
                  <td className="px-3 py-3.5"><TradeContext trade={trade} /></td>
                  <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${pnlClass(trade.pnl)}`}>{money(trade.pnl)}</td>
                </tr>
                {expanded ? (
                  <tr id={panelId}>
                    <td colSpan={10} className="border-b border-[var(--border)] bg-[var(--background)] p-0">
                      <InlineLedgerDisclosure closing={closing}>
                        <InlineTradeReviewPanel
                          date={date}
                          onClose={() => disclosure.close(trade.id)}
                          returnTo={returnTo}
                          symbol={trade.symbol}
                          tradeId={trade.id}
                        />
                      </InlineLedgerDisclosure>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          </tbody>
        </table>
        <div className="flex items-center justify-between gap-4 px-4 py-3.5 text-[13px]">
          <span className="text-[var(--faint)]">
            {hasMore && !showAll ? `Showing 5 of ${tradeRows.length} trades` : `All ${tradeRows.length} trades`}
          </span>
          {hasMore ? (
            <button
              type="button"
              className="font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              onClick={() => setShowAll((current) => !current)}
            >
              {showAll ? "Show less" : "Show all"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TradeContext({ trade }: { trade: JournalDayTradeRow }) {
  const labels = [...new Set([...(trade.tags ?? []), ...(trade.setup ? [trade.setup] : [])])];
  const label = labels[0];
  if (!label) return <span className="text-[var(--faint)]">Needs context</span>;

  const normalized = label.trim().toLowerCase();
  const tone = normalized === "needs review"
    ? { background: "var(--tag-review-bg)", foreground: "var(--tag-review-fg)" }
    : normalized === "good trade" || normalized === "best setup"
      ? { background: "var(--tag-reinforcing-bg)", foreground: "var(--tag-reinforcing-fg)" }
      : { background: "var(--tag-neutral-bg)", foreground: "var(--tag-neutral-fg)" };

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span
        className="inline-flex max-w-[150px] items-center truncate rounded-full px-2.5 py-1 text-[11px] font-medium leading-4"
        style={{ backgroundColor: tone.background, color: tone.foreground }}
        title={labels.join(", ")}
      >
        {label}
      </span>
      {labels.length > 1 ? <span className="text-[11px] text-[var(--faint)]">+{labels.length - 1}</span> : null}
    </span>
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
  return <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>{children}</div>;
}

function Metric({ label, value, className = "text-[var(--foreground)]" }: { label: string; value: string; className?: string }) {
  return <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"><div className="text-[11px] uppercase tracking-[0.08em] text-[var(--muted)]">{label}</div><div className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${className}`}>{value}</div></div>;
}
