"use client";

import { useEffect, useMemo, useState } from "react";
import {
  journalAnchorMarketContext,
  journalScopeViews,
  type JournalPrototypePageState,
  type JournalPrototypePayload,
  type JournalPrototypeScope,
  type JournalPrototypeView,
  type PrototypeDatum,
  type PrototypeMetric,
  type PrototypeMarketContext,
  type PrototypeSection,
} from "@/lib/preview/journalPrototypeData";

type PrototypeProps = {
  initialPageState: JournalPrototypePageState;
  initialPayload: JournalPrototypePayload;
};

const pageStates: { value: JournalPrototypePageState; label: string; shortLabel: string }[] = [
  { value: "before", label: "1a · Before review", shortLabel: "Before" },
  { value: "after", label: "1b · After review", shortLabel: "After" },
  { value: "feed", label: "1c · Coach feed", shortLabel: "Feed" },
];

const allViewKeys = Object.entries(journalScopeViews).flatMap(([scope, views]) =>
  views.map((view) => `${scope}:${view}`),
);

function titleCase(value: string) {
  if (value === "pnl") return "P&L";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toneText(tone: PrototypeMetric["tone"]) {
  if (tone === "positive") return "text-[#26774f]";
  if (tone === "negative") return "text-[#aa4e3e]";
  if (tone === "watch") return "text-[#a75a2d]";
  return "text-[#24211d]";
}

function Eyebrow({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "active" | "saved" }) {
  const color = tone === "active" ? "text-[#ae592c]" : tone === "saved" ? "text-[#26774f]" : "text-[#6f6a5f]";
  return <div className={`font-mono text-[11px] font-bold uppercase tracking-[0.18em] ${color}`}>{children}</div>;
}

function WirePanel({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "active" | "saved";
  className?: string;
}) {
  const border = tone === "active" ? "border-[#b75c2c]" : tone === "saved" ? "border-[#26774f]" : "border-[#b8b1a2]";
  return (
    <section className={`rounded-xl border ${tone === "neutral" ? "border-dashed" : "border-solid"} ${border} p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#817a6e]">{label}</div>
      <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-[#b8b1a2] bg-[#fbfaf6] p-1" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-9 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae592c] ${
              option === value ? "bg-[#25221e] text-[#f7f5ef]" : "text-[#746e63] hover:bg-[#eee9dc]"
            }`}
          >
            {titleCase(option)}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricStrip({ metrics }: { metrics: PrototypeMetric[] }) {
  if (!metrics.length) return null;
  return (
    <div className="grid border-y border-[#d8d2c6] sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="border-b border-[#e4dfd4] px-3 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#817a6e]">{metric.label}</div>
          <div className={`mt-1 font-mono text-base font-bold tabular-nums ${toneText(metric.tone)}`}>{metric.value}</div>
          {metric.detail ? <div className="mt-1 text-xs text-[#8b8478]">{metric.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

function MarketContextCard({ context }: { context: PrototypeMarketContext }) {
  return (
    <WirePanel tone="active">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow tone="active">Market context · opportunity quality</Eyebrow>
          <h2 className="mt-3 text-xl font-medium sm:text-2xl">G{context.grade} · {context.label}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#746e63]">{context.summary}</p>
        </div>
        <div className="text-left sm:text-right">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#817a6e]">Participation</div>
          <div className={`mt-1 font-mono text-base font-bold ${toneText(context.participation.tone)}`}>{context.participation.label}</div>
        </div>
      </div>

      <div className="mt-5 grid border-y border-[#d8d2c6] grid-cols-2 sm:grid-cols-4">
        {context.moverCounts.map((item) => (
          <div key={item.threshold} className="border-b border-r border-[#e4dfd4] px-3 py-3 sm:border-b-0 last:border-r-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#817a6e]">Stocks {item.threshold}</div>
            <div className="mt-1 font-mono text-base font-bold tabular-nums">{item.count}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <Eyebrow>Opportunity set</Eyebrow>
          <p className="mt-2 text-sm leading-6">{context.qualifiedCandidates}</p>
          <p className="text-sm leading-6 text-[#746e63]">{context.leadership}</p>
        </div>
        <div>
          <Eyebrow>Catalyst + broad tape</Eyebrow>
          <p className="mt-2 text-sm leading-6">{context.catalystMix}</p>
          <p className="text-sm leading-6 text-[#746e63]">{context.broadMarket}</p>
        </div>
        <div>
          <Eyebrow>Context alignment</Eyebrow>
          <p className="mt-2 text-sm leading-6">{context.participation.detail}</p>
        </div>
      </div>

      <div className="mt-5 border-y border-[#ddd7cb]">
        {context.timeline.map((item) => (
          <div key={item.time} className="grid gap-1 border-b border-[#e5e0d5] py-3 last:border-b-0 sm:grid-cols-[70px_130px_1fr] sm:items-baseline">
            <div className="font-mono text-xs font-bold tabular-nums">{item.time}</div>
            <div className="font-mono text-xs font-bold uppercase text-[#a75a2d]">G{item.grade} · {item.label}</div>
            <div className="text-sm leading-6 text-[#746e63]">{item.detail}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-[#8b8478]">Coverage · {context.coverage}</p>
    </WirePanel>
  );
}

function datumColor(item: PrototypeDatum) {
  if (item.tone === "positive") return "bg-[#b9d0c0]";
  if (item.tone === "negative") return "bg-[#dfc0b7]";
  if (item.tone === "watch") return "bg-[#dfccb2]";
  return "bg-[#e9e6d8]";
}

function BarsSection({ section }: { section: Extract<PrototypeSection, { kind: "bars" }> }) {
  const max = Math.max(...section.items.map((item) => Math.abs(item.value)), 1);
  return (
    <div>
      <Eyebrow>{section.title}</Eyebrow>
      <div className="mt-4 flex min-h-48 items-end gap-2 border-b border-[#cfc8bb] px-2">
        {section.items.map((item) => {
          const height = Math.max(18, Math.round((Math.abs(item.value) / max) * 150));
          return (
            <div key={`${item.label}:${item.display}`} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <span className="font-mono text-[10px] font-bold tabular-nums text-[#5f594e]">{item.display}</span>
              <div className={`w-full max-w-20 rounded-t-md ${datumColor(item)}`} style={{ height }} title={`${item.label}: ${item.display}`} />
              <div className="min-h-10 text-center text-[10px] leading-4 text-[#817a6e]">
                <div>{item.label}</div>
                {item.detail ? <div className="font-semibold text-[#a75a2d]">{item.detail}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
      {section.footnote ? <p className="mt-3 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function RowsSection({ section }: { section: Extract<PrototypeSection, { kind: "rows" }> }) {
  const max = Math.max(...section.items.map((item) => Math.abs(item.value)), 1);
  return (
    <div>
      <Eyebrow>{section.title}</Eyebrow>
      <div className="mt-4 space-y-3">
        {section.items.map((item) => {
          const width = Math.max(8, Math.round((Math.abs(item.value) / max) * 100));
          return (
            <div key={`${item.label}:${item.display}`}>
              <div className="flex items-end justify-between gap-4 text-sm">
                <span className="text-[#5f594e]">{item.label}</span>
                <span className={`shrink-0 font-mono font-bold tabular-nums ${toneText(item.tone)}`}>{item.display}</span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-sm bg-[#eeebdf]">
                <div className={`h-full rounded-sm ${datumColor(item)}`} style={{ width: `${width}%` }} />
              </div>
              {item.detail ? <div className="mt-1 text-xs text-[#a75a2d]">{item.detail}</div> : null}
            </div>
          );
        })}
      </div>
      {section.footnote ? <p className="mt-4 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function TableSection({ section }: { section: Extract<PrototypeSection, { kind: "table" }> }) {
  return (
    <div>
      <Eyebrow>{section.title}</Eyebrow>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[660px] border-collapse text-left text-xs">
          <thead className="font-mono uppercase tracking-[0.1em] text-[#817a6e]">
            <tr className="border-y border-[#d8d2c6]">
              {section.table.columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {section.table.rows.map((row, rowIndex) => (
              <tr key={`${row[0]}:${rowIndex}`} className="border-b border-[#e5e0d5]">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}:${cellIndex}`} className={`px-3 py-3 ${cellIndex > 1 ? "font-mono tabular-nums" : ""}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {section.footnote ? <p className="mt-3 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function RulesSection({ section }: { section: Extract<PrototypeSection, { kind: "rules" }> }) {
  const statusClass = (status: string) => status === "Honored" || status === "Clear" ? "text-[#26774f]" : status === "Broken" ? "text-[#aa4e3e]" : "text-[#a75a2d]";
  return (
    <div>
      <Eyebrow>{section.title}</Eyebrow>
      <div className="mt-4 divide-y divide-[#ddd7cb] border-y border-[#ddd7cb]">
        {section.rules.map((rule) => (
          <div key={rule.label} className="grid gap-2 py-3 sm:grid-cols-[180px_90px_1fr] sm:items-baseline">
            <div className="font-semibold">{rule.label}</div>
            <div className={`font-mono text-xs font-bold uppercase ${statusClass(rule.status)}`}>{rule.status}</div>
            <div className="text-sm leading-6 text-[#746e63]">{rule.detail}</div>
          </div>
        ))}
      </div>
      {section.footnote ? <p className="mt-3 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function HeatmapSection({ section }: { section: Extract<PrototypeSection, { kind: "heatmap" }> }) {
  const cellClass = (tone: string, intensity: number) => {
    if (tone === "empty") return "bg-[#f0ede4] text-[#aaa395]";
    if (tone === "positive") return intensity === 3 ? "bg-[#8fbea0]" : intensity === 2 ? "bg-[#b5cfbd]" : "bg-[#d8e3d9]";
    return intensity === 3 ? "bg-[#d5a799]" : intensity === 2 ? "bg-[#e3c0b7]" : "bg-[#edd8d2]";
  };
  return (
    <div>
      <Eyebrow>{section.title}</Eyebrow>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {section.cells.map((cell, index) => (
          <div key={`${cell.label}:${index}`} className={`min-h-16 rounded-md p-2 ${cellClass(cell.tone, cell.intensity)}`}>
            <div className="font-mono text-[10px] text-[#655f54]">{cell.label}</div>
            <div className="mt-2 font-mono text-xs font-bold tabular-nums">{cell.value}</div>
          </div>
        ))}
      </div>
      {section.footnote ? <p className="mt-3 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function CoachSection({ section }: { section: Extract<PrototypeSection, { kind: "coach" }> }) {
  return (
    <div>
      <Eyebrow tone="saved">{section.title}</Eyebrow>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {section.columns.map((column) => (
          <div key={column.label}>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.13em] text-[#6f6a5f]">{column.label}</div>
            <p className="mt-2 text-sm leading-6 text-[#4f4a42]">{column.body}</p>
          </div>
        ))}
      </div>
      {section.action ? <div className="mt-5 inline-flex rounded-full border border-[#98b8a4] px-3 py-1.5 text-xs font-semibold text-[#26774f]">{section.action}</div> : null}
      {section.footnote ? <p className="mt-4 text-xs leading-5 text-[#8b8478]">{section.footnote}</p> : null}
    </div>
  );
}

function RenderSection({ section }: { section: PrototypeSection }) {
  if (section.kind === "bars") return <BarsSection section={section} />;
  if (section.kind === "rows") return <RowsSection section={section} />;
  if (section.kind === "table") return <TableSection section={section} />;
  if (section.kind === "rules") return <RulesSection section={section} />;
  if (section.kind === "heatmap") return <HeatmapSection section={section} />;
  return <CoachSection section={section} />;
}

function CoachFeed() {
  const entries = [
    { date: "Tue Jul 14", pnl: "+$1,129", verdict: "Profitable recovery, but the repeatable lesson is the reset before added size.", experiment: "Name the new evidence before increasing size · day 3 / 5", tone: "neutral" },
    { date: "Mon Jul 13", pnl: "−$723", verdict: "Loss stayed bounded; red-state reads remained the main leak.", experiment: "No experiment update", tone: "neutral" },
    { date: "Weekly read · Fri", pnl: "auto", verdict: "Participation matched market quality on four days; Tuesday’s Grade 1 overtrading was the exception.", experiment: "Experiment candidate · cap attempts after leadership fades", tone: "active" },
    { date: "Fri Jul 10", pnl: "$0", verdict: "Thin tape with no sustained leader. The no-trade decision matched the opportunity set.", experiment: "Restraint counted as successful process", tone: "neutral" },
  ];
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm leading-6 text-[#817a6e]">Reverse chronological · one entry per session · experiments woven into the read.</p>
      {entries.map((entry) => (
        <WirePanel key={entry.date} tone={entry.tone === "active" ? "active" : "neutral"}>
          <Eyebrow tone={entry.tone === "active" ? "active" : "neutral"}>{entry.date} · {entry.pnl}</Eyebrow>
          <p className="mt-3 text-base leading-7">{entry.verdict}</p>
          <p className="mt-2 text-sm text-[#817a6e]">{entry.experiment}</p>
        </WirePanel>
      ))}
    </div>
  );
}

export default function JournalWireframePrototype({ initialPageState, initialPayload }: PrototypeProps) {
  const [pageState, setPageState] = useState<JournalPrototypePageState>(initialPageState);
  const [scope, setScope] = useState<JournalPrototypeScope>(initialPayload.scope);
  const [view, setView] = useState<JournalPrototypeView>(initialPayload.view);
  const [payload, setPayload] = useState(initialPayload);
  const [showContract, setShowContract] = useState(false);
  const [generated, setGenerated] = useState(false);

  const activeViews = journalScopeViews[scope] as readonly JournalPrototypeView[];
  const viewNumber = allViewKeys.indexOf(`${scope}:${view}`) + 1;
  const loading = payload.scope !== scope || payload.view !== view;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/preview/journal?scope=${scope}&view=${view}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Preview data failed: ${response.status}`);
        return response.json() as Promise<JournalPrototypePayload>;
      })
      .then((nextPayload) => setPayload(nextPayload))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
      });

    const search = new URLSearchParams(window.location.search);
    search.set("page", pageState);
    search.set("scope", scope);
    search.set("view", view);
    window.history.replaceState(null, "", `${window.location.pathname}?${search.toString()}`);
    return () => controller.abort();
  }, [pageState, scope, view]);

  const statusCopy = useMemo(() => loading ? "loading mock payload…" : `view ${viewNumber} of 12 · ${payload.sample}`, [loading, payload.sample, viewNumber]);

  function changeScope(nextScope: JournalPrototypeScope) {
    setScope(nextScope);
    setView(journalScopeViews[nextScope][0]);
    setShowContract(false);
  }

  function generateReview() {
    setGenerated(true);
    setPageState("after");
  }

  return (
    <main className="min-h-screen bg-[#11110f] px-3 py-5 text-[#25221e] sm:px-6 md:py-8">
      <div className="mx-auto w-full max-w-[1120px] rounded-[18px] bg-[#f7f5ef] px-4 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-7 md:px-9 md:py-8">
        <header className="border-b border-[#ddd7cb] pb-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Journal data exploration · low fidelity</Eyebrow>
              <h1 className="mt-2 text-2xl font-medium tracking-[-0.02em] sm:text-3xl">What belongs in the review?</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746e63]">Click through the page states and all 12 data views. The purpose is to debate the data, not approve visual polish.</p>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8478]">typed mock endpoint · no schema changes</div>
          </div>
          <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-1" role="group" aria-label="Page wireframe state">
            {pageStates.map((state) => (
              <button
                key={state.value}
                type="button"
                onClick={() => setPageState(state.value)}
                className={`min-h-10 shrink-0 rounded-lg border px-4 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae592c] ${
                  pageState === state.value ? "border-[#25221e] bg-[#25221e] text-[#f7f5ef]" : "border-[#b8b1a2] text-[#696358] hover:bg-white"
                }`}
              >
                <span className="hidden sm:inline">{state.label}</span>
                <span className="sm:hidden">{state.shortLabel}</span>
              </button>
            ))}
          </div>
        </header>

        {pageState === "feed" ? (
          <div className="mt-6"><CoachFeed /></div>
        ) : (
          <div className="mt-6 space-y-5">
            <WirePanel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Header · deterministic</Eyebrow>
                  <h2 className="mt-3 text-xl font-medium sm:text-2xl">Tuesday, July 14 · Session recap</h2>
                  <p className="mt-2 text-sm text-[#817a6e]">22 trades · 45.5% win · PF 1.55 · 5 tickers</p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xl font-bold text-[#26774f]">+$1,129.31</div>
                  <div className="mt-1 text-xs text-[#8b8478]">net of fees</div>
                </div>
              </div>
            </WirePanel>

            <MarketContextCard context={journalAnchorMarketContext} />

            <div className="grid gap-5 md:grid-cols-2">
              <WirePanel tone={pageState === "after" ? "saved" : "neutral"}>
                <Eyebrow tone={pageState === "after" ? "saved" : "neutral"}>Session verdict · {pageState === "after" ? "coach generated" : "starter"}</Eyebrow>
                <p className="mt-3 text-base leading-7">
                  {pageState === "after" ? "Profitable recovery, but the strongest repeatable behavior was waiting for new evidence before the second entry." : "Positive session with no deterministic contradiction to the current baseline."}
                </p>
                <p className="mt-2 text-xs leading-5 text-[#8b8478]">{pageState === "after" ? "Medium confidence · generated 4:32 PM" : "Pre-review · deterministic checks only"}</p>
              </WirePanel>
              <WirePanel tone={pageState === "after" ? "saved" : "neutral"}>
                <Eyebrow tone={pageState === "after" ? "saved" : "neutral"}>Process read</Eyebrow>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div><div className="text-sm font-semibold">Aligned</div><p className="mt-1 text-sm leading-6 text-[#746e63]">Held-level re-entry · bounded give-back</p></div>
                  <div><div className="text-sm font-semibold">Unresolved</div><p className="mt-1 text-sm leading-6 text-[#746e63]">Size progression after loss · winning exits versus remaining structure</p></div>
                </div>
                {pageState === "after" ? <p className="mt-3 text-xs text-[#26774f]">Coach cites the NXTC note and T1/T2 evidence.</p> : null}
              </WirePanel>
            </div>

            <WirePanel className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Eyebrow>Data module · 3 scopes × 4 views</Eyebrow>
                  <h2 className="mt-3 text-xl font-medium">{payload.label}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#746e63]">{payload.question}</p>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8478]">{statusCopy}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-5 border-y border-[#ddd7cb] py-4">
                <Segmented label="Scope" value={scope} options={["day", "week", "month"] as const} onChange={changeScope} />
                <Segmented label="View" value={view} options={activeViews} onChange={(nextView) => { setView(nextView); setShowContract(false); }} />
              </div>

              <div className="mt-5 border-l-2 border-[#d6b39e] pl-4">
                <Eyebrow tone={view === "coach" ? "saved" : "active"}>{view === "coach" ? "Coach interpretation" : "Read this first · deterministic"}</Eyebrow>
                <p className="mt-2 text-sm leading-6 text-[#5e584f]">{view === "coach" ? payload.coachStrip : payload.takeaway}</p>
              </div>

              <div className={`mt-5 transition-opacity ${loading ? "opacity-45" : "opacity-100"}`} aria-busy={loading}>
                <MetricStrip metrics={payload.metrics} />
                <div className="mt-6 grid gap-7 lg:grid-cols-2">
                  {payload.sections.map((section, index) => (
                    <div key={`${section.kind}:${section.title}`} className={payload.sections.length === 1 ? "lg:col-span-2" : ""}>
                      <RenderSection section={section} />
                      {index < payload.sections.length - 1 ? <div className="mt-7 border-b border-[#ddd7cb] lg:hidden" /> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 border-t border-[#ddd7cb] pt-4">
                <Eyebrow>Evidence boundary</Eyebrow>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#746e63]">{payload.contract.caveat}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button type="button" onClick={() => setShowContract((visible) => !visible)} className="min-h-10 rounded-lg border border-[#948d80] px-4 text-xs font-semibold hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae592c]">
                    {showContract ? "Hide data contract" : "Show data contract"}
                  </button>
                  <span className="text-xs text-[#817a6e]">Open in Analytics → carries scope + active view</span>
                </div>
              </div>

              {showContract ? (
                <div className="mt-4 rounded-lg border border-[#b8b1a2] bg-[#fbfaf6] p-4">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <Eyebrow>Preview endpoint</Eyebrow>
                      <code className="mt-2 block overflow-x-auto whitespace-nowrap text-xs text-[#3e3932]">GET {payload.contract.endpoint}</code>
                      <div className="mt-4 text-xs leading-6 text-[#746e63]">Parameters · {payload.contract.parameters.join(" · ")}</div>
                    </div>
                    <div>
                      <Eyebrow>Data boundary</Eyebrow>
                      <p className="mt-2 text-xs leading-6 text-[#746e63]">Sources · {payload.contract.sources.join(" · ")}</p>
                      <p className="text-xs leading-6 text-[#746e63]">Fields · {payload.contract.responseFields.join(" · ")}</p>
                    </div>
                  </div>
                  <p className="mt-4 border-l-2 border-[#d6b39e] pl-3 text-xs leading-5 text-[#8b5b3c]">Caveat · {payload.contract.caveat}</p>
                </div>
              ) : null}
            </WirePanel>

            {pageState === "before" ? (
              <WirePanel tone="active">
                <Eyebrow tone="active">Add context before Coach</Eyebrow>
                <p className="mt-3 text-base">① Review material tickers (3/5) → ② day note → ③ generate</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-[#817a6e]">Payload: facts ✓ · day note ✓ · ticker notes 3/5 · tags 14/22</span>
                  <button type="button" onClick={generateReview} className="min-h-10 rounded-lg bg-[#25221e] px-5 text-sm font-semibold text-[#f7f5ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ae592c]">Generate coach review</button>
                </div>
              </WirePanel>
            ) : (
              <>
                {view === "coach" ? (
                  <WirePanel tone="saved">
                    <Eyebrow tone="saved">One thing to try · actionable unit</Eyebrow>
                    <p className="mt-3 text-base leading-7">After a loss, name the new evidence before increasing size.</p>
                    <p className="mt-2 text-sm text-[#817a6e]">Trigger: first red trade · Measure: size progression on the next attempt · 5 sessions</p>
                  </WirePanel>
                ) : (
                  <WirePanel>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <Eyebrow>Active experiment</Eyebrow>
                      <p className="text-sm text-[#746e63]">Name new evidence before increasing size · day 3 / 5</p>
                    </div>
                  </WirePanel>
                )}
                <WirePanel>
                  <Eyebrow>Footer · payload + staleness</Eyebrow>
                  <p className="mt-3 text-sm leading-6">Selected evidence: {payload.sample}</p>
                  <p className="text-sm leading-6 text-[#746e63]">Anchored recap: 22 trades · day note · 3 ticker notes · playbook v3</p>
                  <p className="mt-1 text-xs text-[#817a6e]">{generated ? "Generated in this prototype state." : "Saved review loaded."} Later edits mark the review stale.</p>
                </WirePanel>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
