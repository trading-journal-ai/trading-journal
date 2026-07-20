"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ScannerSetupField } from "@/components/ScannerSetupField";
import {
  opportunityCandidates,
  opportunityDays,
  scannerMoments,
  v5Candles,
  v5Trades,
  type OpportunityCandidate,
  type OpportunityDay,
  type PillarState,
  type V5Trade,
} from "@/lib/preview/dataVizV5Data";

const GREEN = "var(--green)";
const RED = "var(--red)";
const BLUE = "var(--blue)";
const tradeNumberById = new Map(v5Trades.map((trade, index) => [trade.id, index + 1]));
const rankedOpportunityCandidates = [...opportunityCandidates].sort((a, b) => a.rank - b.rank);

function tradeLabel(tradeId: number) {
  return `Trade ${tradeNumberById.get(tradeId) ?? "—"}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMin === domainMax) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function pointsPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function formatTime(minuteFromOpen: number) {
  const minuteET = Math.round(570 + minuteFromOpen);
  const hour = Math.floor(minuteET / 60);
  const minute = minuteET % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function money(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function signedPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

function pnlTone(value: number | null) {
  if (value === null || value === 0) return "var(--muted)";
  return value > 0 ? GREEN : RED;
}

function tradeMetrics(trade: V5Trade) {
  const adversePct = ((trade.maePrice - trade.entryPrice) / trade.entryPrice) * 100;
  const favorablePct = ((trade.mfePrice - trade.entryPrice) / trade.entryPrice) * 100;
  const realizedPct = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
  const capturePct = favorablePct > 0 ? (realizedPct / favorablePct) * 100 : 0;
  return { adversePct, favorablePct, realizedPct, capturePct };
}

function handleEnter(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function Specimen({
  index,
  family,
  title,
  description,
  children,
  useWhen,
  mobile,
  caveat,
  plainLanguage,
  dataUsed,
}: {
  index: string;
  family: string;
  title: string;
  description: string;
  children: ReactNode;
  useWhen: string;
  mobile: string;
  caveat: string;
  plainLanguage: ReactNode;
  dataUsed: ReactNode;
}) {
  const [explanationPinned, setExplanationPinned] = useState(false);
  const [explanationHovered, setExplanationHovered] = useState(false);
  const [explanationTab, setExplanationTab] = useState<"human" | "data">("human");
  const explanationVisible = explanationPinned || explanationHovered;
  const explanationId = `plain-language-${index}`;

  return (
    <article className="border-t border-[var(--border)] py-12 sm:py-16">
      <header className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(360px,1fr)] lg:gap-16">
        <div>
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {index} · {family}
          </p>
          <h2 className="mt-4 max-w-xl text-[26px] font-semibold leading-[1.12] tracking-[-0.025em] text-[var(--foreground)] sm:text-[32px]">
            {title}
          </h2>
        </div>
        <div className="relative max-w-2xl pr-12">
          <p className="text-[14px] leading-7 text-[var(--body)] sm:text-[15px]">{description}</p>
          <div
            className="absolute right-0 top-0 z-20"
            onMouseEnter={() => setExplanationHovered(true)}
            onMouseLeave={() => setExplanationHovered(false)}
            onFocusCapture={() => setExplanationHovered(true)}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExplanationHovered(false);
            }}
          >
            <button
              type="button"
              aria-label={`Explain ${family} in plain language`}
              aria-expanded={explanationVisible}
              aria-controls={explanationId}
              onClick={() => setExplanationPinned((pinned) => !pinned)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setExplanationPinned(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
            >
              <span className="font-mono text-[13px] font-semibold lowercase" aria-hidden="true">i</span>
            </button>
            {explanationVisible ? (
              <div id={explanationId} role="note" className="absolute right-0 top-10 w-[min(380px,calc(100vw-32px))] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-xl">
                <div role="tablist" aria-label={`${family} explanation`} className="flex border-b border-[var(--hairline)]">
                  <button type="button" role="tab" aria-selected={explanationTab === "human"} onClick={() => setExplanationTab("human")} className={`border-b-2 px-1 pb-2 pr-4 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] ${explanationTab === "human" ? "border-[var(--blue)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--body)]"}`}>Human explanation</button>
                  <button type="button" role="tab" aria-selected={explanationTab === "data"} onClick={() => setExplanationTab("data")} className={`border-b-2 px-1 pb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] ${explanationTab === "data" ? "border-[var(--blue)] text-[var(--foreground)]" : "border-transparent text-[var(--muted)] hover:text-[var(--body)]"}`}>Data used</button>
                </div>
                <div role="tabpanel" className="mt-3 text-[12.5px] leading-6 text-[var(--body)]">{explanationTab === "human" ? plainLanguage : dataUsed}</div>
                <p className="mt-3 border-t border-[var(--hairline)] pt-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--muted)]">Hover to preview · click to pin</p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mt-8 sm:mt-10">{children}</div>

      <footer className="mt-7 grid gap-4 border-t border-[var(--hairline)] pt-5 text-[12px] leading-5 text-[var(--muted)] md:grid-cols-3">
        <p><span className="font-semibold text-[var(--body)]">Use when:</span> {useWhen}</p>
        <p><span className="font-semibold text-[var(--body)]">Mobile:</span> {mobile}</p>
        <p><span className="font-semibold text-[var(--body)]">Caveat:</span> {caveat}</p>
      </footer>
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0 border-l border-[var(--hairline)] pl-3 first:border-l-0 first:pl-0 sm:pl-4">
      <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1.5 truncate font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)] sm:text-[15px]" style={{ color: tone }}>
        {value}
      </dd>
    </div>
  );
}


function ExcursionRange() {
  const [selectedId, setSelectedId] = useState(3502);
  const selectedTrade = v5Trades.find((trade) => trade.id === selectedId) ?? v5Trades[0];
  const selected = tradeMetrics(selectedTrade);
  const width = 980;
  const height = 370;
  const left = 132;
  const right = 54;
  const axisY = height - 34;
  const x = (value: number) => scale(value, -4, 5, left, width - right);
  const zeroX = x(0);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
      <div className="overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]" aria-label="Scrollable excursion range">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[650px]" role="img" aria-labelledby="excursion-title excursion-desc">
          <title id="excursion-title">Excursion range for five RXT trades</title>
          <desc id="excursion-desc">Each row shows maximum adverse excursion left of zero, maximum favorable excursion right of zero, and the realized exit as a diamond.</desc>
          <line x1={zeroX} x2={zeroX} y1="20" y2={axisY} stroke="var(--foreground)" opacity="0.55" />
          {[-4, -2, 0, 2, 4].map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} x2={x(tick)} y1="20" y2={axisY} stroke="var(--hairline)" strokeDasharray={tick === 0 ? undefined : "3 5"} />
              <text x={x(tick)} y={height - 10} textAnchor="middle" fill="var(--muted)" fontSize="11" fontFamily="var(--font-mono)">{tick > 0 ? "+" : ""}{tick}%</text>
            </g>
          ))}

          {v5Trades.map((trade, index) => {
            const metrics = tradeMetrics(trade);
            const rowY = 54 + index * 58;
            const isSelected = selectedId === trade.id;
            const realizedX = x(clamp(metrics.realizedPct, -4, 5));
            return (
              <g
                key={trade.id}
                role="button"
                tabIndex={0}
                aria-label={`Select ${tradeLabel(trade.id)}; MAE ${signedPercent(metrics.adversePct)}; MFE ${signedPercent(metrics.favorablePct)}`}
                onClick={() => setSelectedId(trade.id)}
                onPointerEnter={() => setSelectedId(trade.id)}
                onFocus={() => setSelectedId(trade.id)}
                onKeyDown={(event) => handleEnter(event, () => setSelectedId(trade.id))}
                className="cursor-pointer outline-none"
              >
                {isSelected ? <rect x="4" y={rowY - 21} width={width - 8} height="42" rx="5" fill="color-mix(in srgb, var(--blue) 8%, transparent)" stroke={BLUE} /> : null}
                <text x={left - 14} y={rowY + 4} textAnchor="end" fill="var(--body)" fontSize="12" fontFamily="var(--font-mono)">{tradeLabel(trade.id)}</text>
                <rect x={x(metrics.adversePct)} y={rowY - 7} width={Math.max(1, zeroX - x(metrics.adversePct))} height="14" fill="color-mix(in srgb, var(--red) 28%, transparent)" />
                <rect x={zeroX} y={rowY - 7} width={Math.max(1, x(metrics.favorablePct) - zeroX)} height="14" fill="color-mix(in srgb, var(--green) 28%, transparent)" />
                <line x1={x(metrics.adversePct)} x2={x(metrics.favorablePct)} y1={rowY} y2={rowY} stroke="var(--muted)" strokeWidth="1" />
                <circle cx={x(metrics.adversePct)} cy={rowY} r="3" fill={RED} />
                <circle cx={x(metrics.favorablePct)} cy={rowY} r="3" fill={GREEN} />
                <path d={`M ${realizedX} ${rowY - 7} L ${realizedX + 7} ${rowY} L ${realizedX} ${rowY + 7} L ${realizedX - 7} ${rowY} Z`} fill={pnlTone(trade.pnl)} stroke="var(--surface)" strokeWidth="2" />
                <text x={width - right + 10} y={rowY + 4} fill={pnlTone(trade.pnl)} fontSize="11" fontFamily="var(--font-mono)">{Math.round(metrics.capturePct)}%</text>
              </g>
            );
          })}
          <text x={left} y="18" fill={RED} fontSize="10" fontFamily="var(--font-mono)">HEAT ABSORBED (MAE)</text>
          <text x={zeroX + 10} y="18" fill={GREEN} fontSize="10" fontFamily="var(--font-mono)">MOVE AVAILABLE (MFE)</text>
          <text x={width - right + 10} y="18" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">CAPTURE</text>
        </svg>
      </div>

      <aside className="border-t border-[var(--hairline)] pt-5 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Selected · {tradeLabel(selectedTrade.id)} <span className="font-normal tracking-normal">· journal #{selectedTrade.id}</span></p>
        <p className="mt-4 text-[20px] font-semibold leading-7 text-[var(--foreground)]">
          You absorbed <span style={{ color: RED }}>{Math.abs(selected.adversePct).toFixed(1)}% heat</span> for a <span style={{ color: GREEN }}>{selected.favorablePct.toFixed(1)}% available move</span>.
        </p>
        <p className="mt-3 text-[13px] leading-6 text-[var(--body)]">
          The exit realized <span className="font-mono font-semibold" style={{ color: pnlTone(selectedTrade.pnl) }}>{signedPercent(selected.realizedPct)}</span>, or {Math.round(selected.capturePct)}% of MFE.
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-y-5">
          <Metric label="Held" value={`${Math.round((selectedTrade.exitMinute - selectedTrade.entryMinute) * 60)}s`} />
          <Metric label="Shares" value={selectedTrade.quantity.toLocaleString()} />
          <Metric label="MAE" value={signedPercent(selected.adversePct)} tone={RED} />
          <Metric label="MFE" value={signedPercent(selected.favorablePct)} tone={GREEN} />
        </dl>
      </aside>

      <details className="lg:col-span-2 border-t border-[var(--hairline)] pt-4 text-[12px] text-[var(--muted)]">
        <summary className="cursor-pointer font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)]">Read all excursions as data</summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {v5Trades.map((trade) => {
            const metrics = tradeMetrics(trade);
            return <button key={trade.id} type="button" onClick={() => setSelectedId(trade.id)} className="border-l border-[var(--hairline)] px-3 py-2 text-left font-mono leading-5 hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-[var(--blue)]"><span className="text-[var(--body)]">{tradeLabel(trade.id)}</span><br />MAE {signedPercent(metrics.adversePct)} · MFE {signedPercent(metrics.favorablePct)}<br />Exit {signedPercent(metrics.realizedPct)}</button>;
          })}
        </div>
      </details>
    </div>
  );
}

function OpportunityGlyph({ day }: { day: OpportunityDay }) {
  const radius = 23;
  const circumference = Math.PI * 2 * radius;
  const opportunityProgress = day.opportunityPct === null ? 0 : clamp(day.opportunityPct / 50, 0, 1);
  const resultProgress = day.pnl === null ? 0 : clamp(Math.abs(day.pnl) / 1000, 0, 1);
  const isMissing = day.coverage === "no-coverage";
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" aria-hidden="true">
      <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--hairline)" strokeWidth="4" />
      {day.opportunityPct !== null ? <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--muted)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circumference * opportunityProgress} ${circumference}`} transform="rotate(-90 32 32)" /> : null}
      {isMissing ? <circle cx="32" cy="32" r="16" fill="none" stroke="var(--faint)" strokeWidth="2" strokeDasharray="3 4" /> : null}
      {day.coverage === "no-opportunity" ? <circle cx="32" cy="32" r="3" fill="var(--faint)" /> : null}
      {day.coverage === "no-trades" ? <circle cx="32" cy="32" r="12" fill="none" stroke="var(--faint)" strokeWidth="1.5" /> : null}
      {day.coverage === "captured" ? <circle cx="32" cy="32" r="15" fill="none" stroke={pnlTone(day.pnl)} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 15 * resultProgress} ${2 * Math.PI * 15}`} transform="rotate(-90 32 32)" /> : null}
    </svg>
  );
}

function OpportunityMonth() {
  const [selectedDate, setSelectedDate] = useState("2026-07-16");
  const selected = opportunityDays.find((day) => day.date === selectedDate) ?? opportunityDays[0];
  const leadingBlanks = 2;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-[var(--hairline)] py-3 text-[11px] leading-5 text-[var(--muted)]">
        <p><strong className="text-[var(--body)]">Outer gray arc:</strong> largest qualifying market move that day.</p>
        <p><strong className="text-[var(--body)]">Inner green/red arc:</strong> your daily P&amp;L magnitude and sign.</p>
        <p><strong className="text-[var(--body)]">Dashed center:</strong> scanner data is missing.</p>
      </div>
      <div className="hidden grid-cols-5 border-b border-[var(--hairline)] pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] sm:grid">
        {(["MON", "TUE", "WED", "THU", "FRI"] as const).map((weekday) => <div key={weekday} className="px-2">{weekday}</div>)}
      </div>
      <div className="grid grid-cols-1 border-l border-t border-[var(--hairline)] sm:grid-cols-5">
        {Array.from({ length: leadingBlanks }).map((_, index) => <div key={`blank-${index}`} className="hidden min-h-36 border-b border-r border-[var(--hairline)] sm:block" />)}
        {opportunityDays.map((day) => {
          const selectedDay = day.date === selectedDate;
          const statusLabel = day.coverage === "no-coverage" ? "NO COVERAGE" : day.coverage === "no-opportunity" ? "NO OPPORTUNITY" : day.coverage === "no-trades" ? "NO TRADES" : `${day.trades} TRADES`;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelectedDate(day.date)}
              onMouseEnter={() => setSelectedDate(day.date)}
              className={`group relative flex min-h-24 items-center gap-4 border-b border-r border-[var(--hairline)] px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[var(--blue)] sm:min-h-36 sm:block sm:px-3 sm:py-3 ${selectedDay ? "z-[1] bg-[color-mix(in_srgb,var(--blue)_7%,transparent)] outline outline-1 outline-[var(--blue)]" : "hover:bg-[var(--surface)]"}`}
              aria-pressed={selectedDay}
            >
              <div className="flex min-w-16 items-baseline gap-2 sm:justify-between">
                <span className="font-mono text-[10px] text-[var(--muted)] sm:hidden">{day.weekday}</span>
                <span className="font-mono text-[12px] font-semibold text-[var(--body)]">{day.day}</span>
              </div>
              <div className="flex flex-1 items-center gap-4 sm:mt-2 sm:block">
                <OpportunityGlyph day={day} />
                <div className="min-w-0 sm:mt-1">
                  <p className="font-mono text-[11px] font-semibold tabular-nums text-[var(--foreground)]">{day.opportunityPct === null ? "—" : `+${day.opportunityPct}%`} <span className="text-[var(--muted)]">opp.</span></p>
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums" style={{ color: pnlTone(day.pnl) }}>{day.pnl === null ? statusLabel : money(day.pnl)}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Selected · {selected.weekday} JUL {selected.day}</p>
          <p className="mt-3 max-w-2xl text-[20px] font-semibold leading-7 text-[var(--foreground)]">
            {selected.coverage === "captured" ? <>The market offered <span>{selected.opportunityPct}%</span>; you finished <span style={{ color: pnlTone(selected.pnl) }}>{money(selected.pnl)}</span> across {selected.trades} trades.</> : selected.coverage === "no-trades" ? <>A {selected.opportunityPct}% move was present, but no journal trades were recorded.</> : selected.coverage === "no-opportunity" ? <>No qualifying +10% move was detected in this prototype threshold.</> : <>Scanner evidence is missing, so opportunity cannot be inferred.</>}
          </p>
          <p className="mt-4 max-w-2xl border-l-2 border-[var(--border)] pl-4 text-[12.5px] leading-6 text-[var(--muted)]">
            <strong className="text-[var(--body)]">How opportunity is estimated:</strong> the largest scanner-covered move from the session base to the day high. A move begins qualifying at +10%; a complete outer ring represents +50% in this prototype.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-2">
          <Metric label="Opportunity" value={selected.opportunityPct === null ? "—" : `+${selected.opportunityPct}%`} />
          <Metric label="Result" value={money(selected.pnl)} tone={pnlTone(selected.pnl)} />
          <Metric label="Trades" value={selected.trades === null ? "—" : String(selected.trades)} />
          <Metric label="Coverage" value={selected.coverage.replaceAll("-", " ").toUpperCase()} />
        </div>
      </div>

      <details className="mt-6 border-t border-[var(--hairline)] pt-4 text-[12px] text-[var(--muted)]">
        <summary className="cursor-pointer font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)]">Legend and data fallback</summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="text-[var(--body)]">Outer arc</span><br />Market opportunity, scaled to a +50% reference.</p>
          <p><span className="text-[var(--body)]">Inner arc</span><br />Daily P&amp;L magnitude; sign is labeled and color-redundant.</p>
          <p><span className="text-[var(--body)]">Empty inner ring</span><br />Opportunity existed; no trades were recorded.</p>
          <p><span className="text-[var(--body)]">Dashed center</span><br />Scanner coverage is missing; never read as no opportunity.</p>
        </div>
      </details>
    </div>
  );
}

type TraceStage = "seen" | "entered" | "participated" | "captured";

function ScannerTradeTrace() {
  const [selectedId, setSelectedId] = useState(3501);
  const [stage, setStage] = useState<TraceStage>("captured");
  const trade = v5Trades.find((candidate) => candidate.id === selectedId) ?? v5Trades[0];
  const metrics = tradeMetrics(trade);
  const scanner = scannerMoments.find((moment) => moment.minute === trade.scannerMinute);
  const scannerAge = Math.max(0, trade.entryMinute - trade.scannerMinute);
  const base = v5Candles[0].open;
  const entryMove = ((trade.entryPrice - base) / base) * 100;
  const aligned = trade.side === "long" && trade.exitPrice >= trade.entryPrice;
  const stages = useMemo(() => [
    { key: "seen" as const, label: "Seen", value: formatTime(trade.scannerMinute), detail: `${trade.scannerLabel}${scanner ? ` · ${signedPercent(scanner.changePct)}` : ""}` },
    { key: "entered" as const, label: "Entered", value: formatTime(trade.entryMinute), detail: `${Math.round(scannerAge * 60)}s after signal · ${signedPercent(entryMove)}` },
    { key: "participated" as const, label: "Participated", value: trade.side.toUpperCase(), detail: aligned ? "Aligned with realized move" : "Move reversed during hold" },
    { key: "captured" as const, label: "Captured", value: `${Math.round(metrics.capturePct)}%`, detail: `${signedPercent(metrics.realizedPct)} of ${signedPercent(metrics.favorablePct)} MFE` },
  ], [aligned, entryMove, metrics.capturePct, metrics.favorablePct, metrics.realizedPct, scanner, scannerAge, trade]);
  const activeStage = stages.find((item) => item.key === stage) ?? stages[0];

  return (
    <div>
      <p className="mb-4 text-[12.5px] leading-6 text-[var(--body)]"><strong>This view follows one trade at a time.</strong> Choose a trade to connect its scanner signal, first fill, direction during the hold, and realized exit.</p>
      <div className="flex flex-wrap gap-2" aria-label="Select trade trace">
        {v5Trades.slice(0, 4).map((candidate) => (
          <button key={candidate.id} type="button" onClick={() => setSelectedId(candidate.id)} onMouseEnter={() => setSelectedId(candidate.id)} className={`rounded-[5px] border px-3 py-2 font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--blue)] ${selectedId === candidate.id ? "border-[var(--blue)] bg-[var(--surface-2)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}>{tradeLabel(candidate.id)} · {money(candidate.pnl)}</button>
        ))}
      </div>

      <div className="mt-7 grid border-l border-t border-[var(--hairline)] md:grid-cols-4">
        {stages.map((item, index) => {
          const active = stage === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setStage(item.key)}
              onMouseEnter={() => setStage(item.key)}
              aria-pressed={active}
              className={`relative min-h-36 border-b border-r border-[var(--hairline)] px-5 py-5 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[var(--blue)] ${active ? "bg-[color-mix(in_srgb,var(--blue)_7%,transparent)]" : "hover:bg-[var(--surface)]"}`}
            >
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">0{index + 1} · {item.label}</span>
              <span className="mt-4 block font-mono text-[20px] font-semibold tabular-nums text-[var(--foreground)]" style={{ color: item.key === "captured" ? (metrics.capturePct >= 50 ? GREEN : RED) : undefined }}>{item.value}</span>
              <span className="mt-2 block text-[12px] leading-5 text-[var(--body)]">{item.detail}</span>
              {index < stages.length - 1 ? <span className="absolute -right-2.5 top-1/2 z-[2] hidden h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] font-mono text-[11px] text-[var(--muted)] md:flex" aria-hidden="true">›</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">{activeStage.label} · persistent detail</p>
          <p className="mt-3 max-w-2xl text-[24px] font-semibold leading-8 text-[var(--foreground)]">
            {stage === "seen" ? <>RXT was visible before the trade—not discovered at the entry.</> : stage === "entered" ? <>You entered {Math.round(scannerAge * 60)} seconds after the scanner moment, already {signedPercent(entryMove)} from the session base.</> : stage === "participated" ? <>{aligned ? "The long was aligned with the realized move during the hold." : "The long did not participate in the realized move during the hold."}</> : <>The trade captured {Math.round(metrics.capturePct)}% of its best available move.</>}
          </p>
          <p className="mt-3 text-[13px] leading-6 text-[var(--body)]">{activeStage.detail}</p>
        </div>
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-2">
          <Metric label="Signal age" value={`${Math.round(scannerAge * 60)}s`} />
          <Metric label="Entry move" value={signedPercent(entryMove)} />
          <Metric label="Shares" value={trade.quantity.toLocaleString()} />
          <Metric label="Result" value={money(trade.pnl)} tone={pnlTone(trade.pnl)} />
        </dl>
      </div>

      <details className="mt-6 border-t border-[var(--hairline)] pt-4 text-[12px] text-[var(--muted)]">
        <summary className="cursor-pointer font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)]">Read trace as a ledger</summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left font-mono tabular-nums">
            <thead><tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.12em]"><th className="py-2">Seen</th><th>Entered</th><th>Side</th><th>Shares</th><th>MAE</th><th>MFE</th><th>Realized</th><th>Captured</th></tr></thead>
            <tbody><tr className="text-[var(--body)]"><td className="py-3">{formatTime(trade.scannerMinute)}</td><td>{formatTime(trade.entryMinute)}</td><td>{trade.side.toUpperCase()}</td><td>{trade.quantity.toLocaleString()}</td><td>{signedPercent(metrics.adversePct)}</td><td>{signedPercent(metrics.favorablePct)}</td><td>{signedPercent(metrics.realizedPct)}</td><td>{Math.round(metrics.capturePct)}%</td></tr></tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

type CandidatePillar = {
  label: string;
  value: string;
  state: PillarState;
};

function candidatePillars(candidate: OpportunityCandidate): CandidatePillar[] {
  const priceState: PillarState = candidate.price >= 1 && candidate.price <= 20 ? "pass" : "fail";
  const floatState: PillarState = candidate.floatMillions === null ? "unknown" : candidate.floatMillions < 10 ? "pass" : "fail";
  const relativeVolumeState: PillarState = candidate.relativeVolume === null ? "unknown" : candidate.relativeVolume >= 5 ? "pass" : candidate.relativeVolume >= 3 ? "watch" : "fail";
  const changeState: PillarState = candidate.dayChangePct >= 10 ? "pass" : candidate.dayChangePct >= 8 ? "watch" : "fail";

  return [
    { label: "Price", value: `$${candidate.price.toFixed(2)}`, state: priceState },
    { label: "Float", value: candidate.floatMillions === null ? "Not captured" : `${candidate.floatMillions.toFixed(candidate.floatMillions < 100 ? 1 : 0)}M`, state: floatState },
    { label: "RVOL", value: candidate.relativeVolume === null ? "Not captured" : `${candidate.relativeVolume.toFixed(1)}×`, state: relativeVolumeState },
    { label: "Day move", value: signedPercent(candidate.dayChangePct), state: changeState },
    { label: "Catalyst", value: candidate.catalyst, state: candidate.catalystState },
  ];
}

function pillarStateLabel(state: PillarState) {
  if (state === "pass") return "Pass";
  if (state === "watch") return "Context";
  if (state === "fail") return "Fail";
  return "Unknown";
}

function PillarCell({ pillar, compact = false, secondaryValue }: { pillar: CandidatePillar; compact?: boolean; secondaryValue?: string }) {
  return (
    <div className={`${compact ? secondaryValue ? "min-h-[74px] px-2.5 py-2" : "min-h-[62px] px-2.5 py-2" : "min-h-[76px] px-3 py-3"} border-l border-[var(--hairline)] first:border-l-0`}>
      <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{pillar.label}</p>
      <p className={`${compact ? "mt-1 text-[10.5px]" : "mt-1.5 text-[12px]"} line-clamp-2 font-mono font-semibold leading-4 tabular-nums text-[var(--foreground)]`}>{pillar.value}{secondaryValue ? <span className="ml-1 text-[7.5px] font-normal text-[var(--muted)]">AT ALERT</span> : null}</p>
      {secondaryValue ? <p className="font-mono text-[9px] font-semibold leading-4 tabular-nums text-[var(--body)]">{secondaryValue} <span className="text-[7.5px] font-normal text-[var(--muted)]">DAY HOD</span></p> : null}
      <p className={`mt-1 font-mono text-[8.5px] font-semibold uppercase tracking-[0.1em] ${pillar.state === "pass" ? "text-[var(--body)]" : pillar.state === "unknown" ? "text-[var(--faint)]" : "text-[var(--muted)]"}`}>
        {pillar.state === "pass" ? "✓ " : pillar.state === "fail" ? "× " : "· "}{pillarStateLabel(pillar.state)}
      </p>
    </div>
  );
}

function outcomeTone(disposition: OpportunityCandidate["disposition"]) {
  if (disposition === "Traded") return "var(--blue)";
  if (disposition === "Missed") return "var(--foreground)";
  return "var(--muted)";
}

function clockAfter(time: string, minutesAfter: number) {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + Math.round(minutesAfter);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function opportunityPhases(candidate: OpportunityCandidate) {
  const initialPoints = candidate.postAlertPath.filter((point) => point.minute <= 15);
  const initialHigh = initialPoints.reduce((best, point) => point.movePct > best.movePct ? point : best, initialPoints[0]);
  const hod = candidate.postAlertPath.reduce((best, point) => point.movePct > best.movePct ? point : best, candidate.postAlertPath[0]);
  const pullbackWindow = candidate.postAlertPath.filter((point) => point.minute >= initialHigh.minute && (hod.minute > initialHigh.minute ? point.minute <= hod.minute : true));
  const pullbackLow = pullbackWindow.reduce((lowest, point) => point.movePct < lowest.movePct ? point : lowest, pullbackWindow[0]);
  const givebackPoints = Math.max(0, initialHigh.movePct - pullbackLow.movePct);
  const heldPercent = initialHigh.movePct > 0 ? (pullbackLow.movePct / initialHigh.movePct) * 100 : 0;
  const continuationPoints = Math.max(0, hod.movePct - initialHigh.movePct);
  const hasContinuation = hod.minute > 15 && continuationPoints >= 3;
  const dayHodPct = ((1 + candidate.dayChangePct / 100) * (1 + hod.movePct / 100) - 1) * 100;
  const label = initialHigh.movePct <= 0
    ? "No clean first move"
    : hasContinuation && heldPercent >= 50
      ? "Held strong · continued"
      : hasContinuation
        ? "Deep pullback · continued"
        : pullbackLow.movePct < 0
          ? "First move failed"
          : "First move only";

  return { initialHigh, hod, pullbackLow, givebackPoints, heldPercent, continuationPoints, hasContinuation, dayHodPct, label };
}

function OpportunityPhasePath({ candidate }: { candidate: OpportunityCandidate }) {
  const phases = opportunityPhases(candidate);
  const width = 760;
  const height = 280;
  const left = 52;
  const right = 24;
  const top = 36;
  const bottom = 232;
  const visibleEnd = Math.max(120, phases.hod.minute + 15);
  const visiblePath = candidate.postAlertPath.filter((point) => point.minute <= visibleEnd);
  const minMove = Math.min(0, ...visiblePath.map((point) => point.movePct));
  const maxMove = Math.max(5, ...visiblePath.map((point) => point.movePct));
  const domainMin = Math.floor(minMove - Math.max(2, (maxMove - minMove) * 0.08));
  const domainMax = Math.ceil(maxMove + Math.max(3, (maxMove - minMove) * 0.12));
  const x = (minute: number) => scale(minute, 0, visibleEnd, left, width - right);
  const y = (movePct: number) => scale(movePct, domainMin, domainMax, bottom, top);
  const path = pointsPath(visiblePath.map((point) => ({ x: x(point.minute), y: y(point.movePct) })));
  const axisTicks = Array.from(new Set([0, 15, 60, visibleEnd].filter((tick) => tick <= visibleEnd))).sort((a, b) => a - b);
  const yTicks = Array.from(new Set([0, Math.round(phases.initialHigh.movePct), Math.round(phases.hod.movePct)])).sort((a, b) => a - b);
  const hodLabelOnLeft = x(phases.hod.minute) > width - 235;
  const pullbackIsDistinct = phases.pullbackLow.minute !== phases.initialHigh.minute && phases.pullbackLow.minute !== phases.hod.minute;

  return (
    <div className="overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[680px]" role="img" aria-label={`${candidate.symbol} opportunity path. The first fifteen minutes are shaded; labels mark the initial high, pullback, continuation, and high of day after the first scanner alert.`}>

        <rect x={x(0)} y={top} width={x(15) - x(0)} height={bottom - top} fill="color-mix(in srgb, var(--blue) 7%, transparent)" />
        <line x1={x(15)} x2={x(15)} y1={top} y2={bottom} stroke={BLUE} strokeDasharray="3 4" opacity="0.6" />
        <text x={(x(0) + x(15)) / 2} y="19" textAnchor="middle" fill={BLUE} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">FIRST 15 MIN</text>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" strokeDasharray={tick === 0 ? undefined : "3 5"} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="9.5" fontFamily="var(--font-mono)">{signedPercent(tick, 0)}</text>
          </g>
        ))}

        <path d={path} fill="none" stroke="var(--foreground)" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(0)} cy={y(0)} r="5" fill="var(--surface)" stroke={BLUE} strokeWidth="2" />
        <text x={x(0) + 8} y={y(0) - 9} fill={BLUE} fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)">ALERT {candidate.firstSeen}</text>

        <circle cx={x(phases.initialHigh.minute)} cy={y(phases.initialHigh.movePct)} r="5.5" fill="var(--surface)" stroke={BLUE} strokeWidth="2" />
        <text x={x(phases.initialHigh.minute) + 8} y={y(phases.initialHigh.movePct) - 10} fill={BLUE} fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)">INITIAL HIGH {signedPercent(phases.initialHigh.movePct)} · +{phases.initialHigh.minute}m</text>

        {pullbackIsDistinct ? (
          <>
            <circle cx={x(phases.pullbackLow.minute)} cy={y(phases.pullbackLow.movePct)} r="4" fill="var(--surface)" stroke="var(--muted)" strokeWidth="1.5" />
            <text x={x(phases.pullbackLow.minute) + 8} y={y(phases.pullbackLow.movePct) + 17} fill="var(--muted)" fontSize="9.5" fontFamily="var(--font-mono)">PULLBACK · GAVE BACK {phases.givebackPoints.toFixed(1)} PTS</text>
          </>
        ) : null}

        <path d={`M ${x(phases.hod.minute)} ${y(phases.hod.movePct) - 7} L ${x(phases.hod.minute) + 7} ${y(phases.hod.movePct)} L ${x(phases.hod.minute)} ${y(phases.hod.movePct) + 7} L ${x(phases.hod.minute) - 7} ${y(phases.hod.movePct)} Z`} fill={phases.hod.movePct > 0 ? GREEN : RED} stroke="var(--surface)" strokeWidth="1.5" />
        <text x={x(phases.hod.minute) + (hodLabelOnLeft ? -10 : 10)} y={y(phases.hod.movePct) - 12} textAnchor={hodLabelOnLeft ? "end" : "start"} fill={phases.hod.movePct > 0 ? GREEN : RED} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">HOD {signedPercent(phases.dayHodPct)} DAY · {clockAfter(candidate.firstSeen, phases.hod.minute)}</text>

        {axisTicks.map((tick) => (
          <g key={tick}>
            <line x1={x(tick)} x2={x(tick)} y1={bottom} y2={bottom + 5} stroke="var(--border)" />
            <text x={x(tick)} y={height - 19} textAnchor={tick === 0 ? "start" : tick === visibleEnd ? "end" : "middle"} fill="var(--muted)" fontSize="9.5" fontFamily="var(--font-mono)">{tick === 0 ? "ALERT" : `+${Math.round(tick)}m`}</text>
          </g>
        ))}
        <text x={width - right} y={height - 3} textAnchor="end" fill="var(--faint)" fontSize="8.5" fontFamily="var(--font-mono)">ALERT-TO-HOD FOCUS · CLOSE SHOWN IN METRICS</text>
      </svg>
    </div>
  );
}

function OpportunitySet() {
  const [selectedSymbol, setSelectedSymbol] = useState("RXT");
  const selected = opportunityCandidates.find((candidate) => candidate.symbol === selectedSymbol) ?? opportunityCandidates[0];
  const selectedPhases = opportunityPhases(selected);
  const selectedPillars = candidatePillars(selected);
  const strongPillarCount = selectedPillars.filter((pillar) => pillar.state === "pass").length;
  const aPlusCount = opportunityCandidates.filter((candidate) => candidate.profile === "A+ candidate").length;
  const tradedCount = opportunityCandidates.filter((candidate) => candidate.disposition === "Traded").length;
  const candidateOutcomes = opportunityCandidates.map((candidate) => ({ candidate, phases: opportunityPhases(candidate) }));
  const maxMover = candidateOutcomes.reduce((best, outcome) => outcome.phases.dayHodPct > best.phases.dayHodPct ? outcome : best, candidateOutcomes[0]);
  const fiftyPercentMovers = candidateOutcomes.filter((outcome) => outcome.phases.dayHodPct >= 50).length;
  const hundredPercentMovers = candidateOutcomes.filter((outcome) => outcome.phases.dayHodPct >= 100).length;
  const marketHeat = hundredPercentMovers >= 2 ? "Hot day" : hundredPercentMovers === 1 ? "One true leader" : fiftyPercentMovers >= 2 ? "Active · no 100% leader" : "Thin / selective";
  const profileArticle = selected.profile === "A+ candidate" ? "an" : "a";
  const profilePhrase = selected.profile === "A+ candidate" ? "A+ candidate" : selected.profile === "Watchable" ? "watchable candidate" : "low-quality candidate";

  return (
    <div>
      <div className="grid gap-7 border-y border-[var(--hairline)] py-5 lg:grid-cols-[minmax(0,1fr)_560px] lg:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">Market context snapshot · {marketHeat}</p>
          <p className="mt-3 max-w-2xl text-[22px] font-semibold leading-8 text-[var(--foreground)] sm:text-[26px]">
            {hundredPercentMovers === 0 ? "No stock cleared +100%." : `${hundredPercentMovers} ${hundredPercentMovers === 1 ? "stock cleared" : "stocks cleared"} +100%.`} {maxMover.candidate.symbol} set the ceiling at {signedPercent(maxMover.phases.dayHodPct)}, with {fiftyPercentMovers} names above +50%.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-y-5 sm:grid-cols-5">
          <Metric label="Candidates" value={String(opportunityCandidates.length).padStart(2, "0")} />
          <Metric label="A+ candidates" value={String(aPlusCount).padStart(2, "0")} />
          <Metric label="Traded" value={String(tradedCount).padStart(2, "0")} />
          <Metric label="Above +50%" value={String(fiftyPercentMovers).padStart(2, "0")} />
          <Metric label="Above +100%" value={String(hundredPercentMovers).padStart(2, "0")} />
        </dl>
      </div>

      <div className="mt-8">
        <div className="hidden grid-cols-[54px_116px_minmax(430px,1fr)_110px_118px] items-end gap-0 border-b border-[var(--hairline)] pb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] lg:grid">
          <span>Alert rank</span>
          <span>Candidate</span>
          <span>Five-pillar snapshot at first alert</span>
          <span>Decision</span>
          <span className="text-right">15m / day HOD</span>
        </div>

        <div className="border-b border-[var(--hairline)]">
          {rankedOpportunityCandidates.map((candidate) => {
            const isSelected = selected.symbol === candidate.symbol;
            const phases = opportunityPhases(candidate);
            return (
              <button
                key={candidate.symbol}
                type="button"
                onClick={() => setSelectedSymbol(candidate.symbol)}
                onFocus={() => setSelectedSymbol(candidate.symbol)}
                aria-pressed={isSelected}
                className={`grid w-full gap-4 border-t border-[var(--hairline)] px-3 py-4 text-left transition-colors focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[var(--blue)] lg:grid-cols-[38px_100px_minmax(430px,1fr)_94px_118px] lg:items-center lg:gap-4 lg:px-2 lg:py-0 ${isSelected ? "bg-[color-mix(in_srgb,var(--blue)_7%,transparent)]" : "hover:bg-[var(--surface)]"}`}
              >
                <div className="flex items-baseline justify-between lg:block">
                  <span className="font-mono text-[12px] font-semibold tabular-nums text-[var(--muted)]">#{candidate.rank}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)] lg:hidden">Alert-quality rank</span>
                </div>
                <div>
                  <span className="block font-mono text-[18px] font-semibold text-[var(--foreground)]">{candidate.symbol}</span>
                  <span className="mt-1 block font-mono text-[9.5px] tabular-nums text-[var(--muted)]">First seen {candidate.firstSeen}</span>
                  <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--body)]">{candidate.profile}</span>
                </div>
                <div className="grid grid-cols-2 border-y border-[var(--hairline)] sm:grid-cols-5 lg:border-y-0">
                  {candidatePillars(candidate).map((pillar) => (
                    <PillarCell
                      key={pillar.label}
                      pillar={pillar}
                      compact
                      secondaryValue={pillar.label === "Day move" ? signedPercent(phases.dayHodPct) : undefined}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between lg:block">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: outcomeTone(candidate.disposition) }}>{candidate.disposition}</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--muted)] lg:mt-1 lg:block">{candidate.leadership}</span>
                </div>
                <span className="text-right font-mono tabular-nums">
                  <span className="block text-[14px] font-semibold text-[var(--foreground)]">{signedPercent(candidate.postAlert15mPct)} <span className="text-[8px] font-normal text-[var(--muted)]">15M</span></span>
                  <span className="mt-1 block text-[10px] font-semibold text-[var(--body)]">{signedPercent(phases.dayHodPct)} <span className="text-[8px] font-normal text-[var(--muted)]">HOD</span></span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">Selected · {selected.symbol} · rank #{selected.rank}</p>
          <p className="mt-3 max-w-3xl text-[24px] font-semibold leading-8 text-[var(--foreground)]">
            {selectedPhases.hasContinuation ? <>{selected.symbol} ran {signedPercent(selectedPhases.initialHigh.movePct)} in the first 15 minutes, held {Math.max(0, Math.round(selectedPhases.heldPercent))}% of that move, then continued to a {signedPercent(selectedPhases.dayHodPct)} day high.</> : <>{selected.symbol} topped at {signedPercent(selectedPhases.initialHigh.movePct)} in the first 15 minutes and did not create a meaningful continuation.</>}
          </p>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-[var(--body)]">{selected.disposition === "Traded" ? <>You traded {profileArticle} {profilePhrase}. </> : <>{selected.disposition}. </>}{selected.selectionNote}</p>

          <dl className="mt-7 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
            <Metric label="First seen" value={selected.firstSeen} />
            <Metric label="Strong pillars" value={`${strongPillarCount} / 5`} />
            <Metric label="Leadership" value={selected.leadership} />
            <Metric label="Trade result" value={money(selected.pnl)} tone={pnlTone(selected.pnl)} />
          </dl>
        </div>

        <aside className="border-t border-[var(--hairline)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Opportunity read</p>
          <p className="mt-3 text-[20px] font-semibold leading-7 text-[var(--foreground)]">{selectedPhases.label}</p>
          <p className="mt-3 text-[12.5px] leading-6 text-[var(--body)]">HOD printed at {clockAfter(selected.firstSeen, selectedPhases.hod.minute)}, {Math.round(selectedPhases.hod.minute)} minutes after the first alert.</p>
        </aside>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Initial move → pullback → continuation</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--faint)]">Zero = first scanner alert</p>
          </div>
          <OpportunityPhasePath candidate={selected} />
        </div>
        <dl className="grid grid-cols-2 gap-y-5 border-t border-[var(--hairline)] pt-5 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <Metric label="First 15m high" value={signedPercent(selectedPhases.initialHigh.movePct)} />
          <Metric label="Pullback gave back" value={`${selectedPhases.givebackPoints.toFixed(1)} pts`} />
          <Metric label="Move retained" value={`${Math.max(0, Math.round(selectedPhases.heldPercent))}%`} />
          <Metric label="Continuation added" value={`${selectedPhases.continuationPoints.toFixed(1)} pts`} />
          <Metric label="Max gain of day" value={signedPercent(selectedPhases.dayHodPct)} />
          <Metric label="Close after alert" value={signedPercent(selected.endOfDayPct)} />
        </dl>
      </div>

      <details className="mt-7 border-t border-[var(--hairline)] pt-4 text-[12px] leading-6 text-[var(--muted)]">
        <summary className="cursor-pointer font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)]">Rules, evidence boundary, and production contract</summary>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          <p><strong className="text-[var(--body)]">Five pillars:</strong><br />Price $1–$20 · float under 10M · RVOL at least 5× · daily change at least +10% · catalyst context.</p>
          <p><strong className="text-[var(--body)]">Freeze the decision:</strong><br />Pillar values, leadership, spread, and scanner rank must be stored at the first qualifying alert—not reconstructed from the final high.</p>
          <p><strong className="text-[var(--body)]">Keep hindsight separate:</strong><br />The first-15-minute high, pullback, continuation, HOD, and close judge what happened next. They must never rewrite what was knowable at the alert.</p>
        </div>
      </details>
    </div>
  );
}

export default function DataVizVocabularyV5() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-12 sm:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Preview / Data visualization / V5</p>
            <nav className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Data visualization previews">
              <Link href="/preview/data-viz" className="text-[var(--body)] hover:text-[var(--foreground)]">Index</Link>
              <Link href="/preview/data-viz/v1" className="text-[var(--muted)] hover:text-[var(--foreground)]">V1</Link>
              <Link href="/preview/data-viz/v2" className="text-[var(--muted)] hover:text-[var(--foreground)]">V2</Link>
              <Link href="/preview/data-viz/v3" className="text-[var(--muted)] hover:text-[var(--foreground)]">V3</Link>
              <Link href="/preview/data-viz/v4" className="text-[var(--muted)] hover:text-[var(--foreground)]">V4</Link>
              <span className="text-[var(--blue)]">V5</span>
              <Link href="/preview/data-viz/v6" className="text-[var(--muted)] hover:text-[var(--foreground)]">V6</Link>
              <Link href="/preview/data-viz/v7" className="text-[var(--muted)] hover:text-[var(--foreground)]">V7</Link>
            </nav>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">Opportunity → participation → capture</p>
              <h1 className="mt-4 max-w-4xl text-[40px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[58px]">Five lenses for reviewing the trade inside the move.</h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[var(--body)]">A focused vocabulary test, not a dashboard. Each specimen asks one review question and keeps its evidence readable without hover.</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4">
              <Metric label="Families" value="05" />
              <Metric label="Renderer" value="SVG + DOM" />
              <Metric label="Data" value="Prototype" />
            </dl>
          </div>
        </header>

        <section className="grid gap-4 border-y border-[var(--hairline)] py-5 text-[12px] leading-5 text-[var(--muted)] md:grid-cols-3">
          <p><strong className="text-[var(--body)]">Interaction:</strong> hover previews; click, tap, or keyboard focus persists the selection.</p>
          <p><strong className="text-[var(--body)]">Evidence:</strong> OHLC and executions reuse the V1 synthetic RXT study; scanner moments are reconstructed for visual testing.</p>
          <p><strong className="text-[var(--body)]">Boundary:</strong> missing scanner coverage stays visibly different from no opportunity.</p>
        </section>

        <Specimen
          index="01"
          family="Scanner setup response"
          title="Did the alert form a setup—or did you chase the pop?"
          description="Every meaningful scanner alert becomes a short one-minute case study, including false positives. Candles expose the flat period, ignition, pullback, trigger, and entry so the review can distinguish a patient setup, an early chase, a disciplined pass, and a valid setup that simply failed."
          plainLanguage={<><strong>The alert is only the beginning.</strong> Look for a controlled one-to-three-candle pullback, contracting volume, a held higher low, and renewed volume when a one-minute candle breaks the setup high. Your entry is judged against that decision point—not against whether the trade later won.</>}
          dataUsed={<><p><strong>Recorded:</strong> one-minute OHLCV, scanner timestamp and price, percent move, relative volume, catalyst, and exact entry.</p><p className="mt-2"><strong>Derived:</strong> ignition and pullback phases, pullback candle count, pullback-volume change, one-minute high-break trigger, entry distance from alert/trigger, and fifteen-minute maximum move.</p></>}
          useWhen="Reviewing every meaningful scanner pop from the day to ask whether a tradable micro pullback or bull flag formed before the entry."
          mobile="Desktop-first. On a narrow screen the analytical canvas scrolls horizontally and the selected-opportunity data remains available below it."
          caveat="The four episodes are illustrative one-minute cases. Production needs immutable scanner timestamps joined to cached one-minute candles; setup thresholds remain descriptive until the trader-authored rules are versioned."
        >
          <ScannerSetupField />
        </Specimen>

        <Specimen
          index="02"
          family="Trade breathing · MAE / MFE"
          title="How much room did each trade use—and how much did you keep?"
          description="MAE and MFE become one signed range around entry. The exit diamond answers the practical question the old braid obscured: how far price moved against you, how far it moved for you, and where you chose—or were forced—to leave."
          plainLanguage={<><strong>Entry is zero.</strong> Red shows the deepest move against you (MAE). Green shows the best move in your favor (MFE). The diamond is your exit. Capture tells you how much of the best green move was still yours when you sold.</>}
          dataUsed={<><p><strong>Recorded:</strong> entry and exit price/time, trade side, shares and P&amp;L; the highest and lowest prices observed while the trade was open.</p><p className="mt-2"><strong>Derived:</strong> MAE, MFE and realized return as percentages of entry; capture = realized return ÷ MFE.</p></>}
          useWhen="Comparing entry quality and exit efficiency trade by trade without needing the full price path."
          mobile="Rows retain the zero line, endpoints, and selected-trade explanation; the data fallback prevents precision from disappearing."
          caveat="MAE/MFE are bounded by the available bar interval. They describe excursion, not intrabar event order or execution causality."
        >
          <ExcursionRange />
        </Specimen>

        <Specimen
          index="03"
          family="Market opportunity vs. your trading"
          title="When the market moved, did you participate?"
          description="Each weekday-aware glyph carries two related measures: the market’s largest qualifying move outside, and the trader’s daily result inside. Explicit missingness keeps scanner gaps from masquerading as quiet markets."
          plainLanguage={<><strong>The outer gray arc belongs to the market.</strong> It estimates the largest qualifying move the scanner captured that day. The inner green or red arc belongs to you: your daily P&amp;L. An empty center means there was opportunity but no trade; a dashed center means scanner evidence is missing.</>}
          dataUsed={<><p><strong>Recorded:</strong> date/weekday, scanner coverage, scanner ticker moves, journal trade count and daily net P&amp;L.</p><p className="mt-2"><strong>Derived:</strong> largest scanner-covered move from session base to day high, +10% qualification state, no-trade/no-opportunity/no-coverage status, and a +50% ring reference.</p></>}
          useWhen="Scanning a week or month for missed days, overtrading, opportunity concentration, and gaps in scanner coverage."
          mobile="The calendar becomes a chronological weekday list; every glyph keeps opportunity, result, and coverage status beside it."
          caveat="Opportunity needs a stable universe and threshold definition. July values are illustrative until immutable daily scanner summaries exist."
        >
          <OpportunityMonth />
        </Specimen>

        <Specimen
          index="04"
          family="Trade-level scanner trace"
          title="Seen, entered, participated, captured: where did the edge leak?"
          description="The trace turns four timestamps and derived measures into a review sentence. It separates discovery latency, entry location, directional alignment, and exit capture so the trader can diagnose a missed move without conflating the stages."
          plainLanguage={<><strong>This is one trade, followed from discovery to exit.</strong> Seen is the scanner timestamp. Entered is your first fill and delay. Participated asks whether your long/short direction matched the move during the hold. Captured compares your realized move with MFE.</>}
          dataUsed={<><p><strong>Recorded:</strong> scanner event time, label and price change; first entry time/price, side, shares, exit time/price and P&amp;L; OHLC during the hold.</p><p className="mt-2"><strong>Derived:</strong> scanner-to-entry latency, entry move from session base, direction alignment, MAE/MFE and captured percentage.</p></>}
          useWhen="A ticker moved, you traded it, but the P&L does not explain whether the leak was discovery, hesitation, direction, size, or exit."
          mobile="Four stages stack vertically and remain tap-selectable; the active explanation follows immediately below."
          caveat="‘Participated’ means the trade side aligned with the measured move during the hold. It is descriptive, not proof of skill or causality."
        >
          <ScannerTradeTrace />
        </Specimen>

        <Specimen
          index="05"
          family="Five-pillar opportunity set"
          title="Did you trade the best stock—or just the stock you noticed?"
          description="A ranked daily opportunity set compares every notable scanner candidate with the same five-pillar rubric, then separates the first move from the later opportunity. The selected path shows whether the stock held after its first 15 minutes, continued higher, and eventually set the day’s ceiling."
          plainLanguage={<><strong>This is the day’s selection board and market-heat snapshot.</strong> The five middle cells show what was knowable at the alert. The right side compares the first 15-minute move with the stock’s maximum gain of day. Select a row to see its first expansion, pullback, continuation, HOD, and whether you participated.</>}
          dataUsed={<><p><strong>Frozen at alert:</strong> symbol, first qualifying timestamp, price, float, RVOL, daily percentage change, catalyst classification, scanner rank and leadership state.</p><p className="mt-2"><strong>Joined later:</strong> one-minute OHLCV for the first-15-minute high, pullback low, continuation high, HOD percentage/time and close; traded/missed/avoided status, executions and P&amp;L.</p><p className="mt-2"><strong>Daily breadth:</strong> maximum percentage gainer and unique-symbol counts above +50% and +100%.</p></>}
          useWhen="Reviewing stock selection after a session: how many candidates qualified, which leaders you chose, which you missed, and whether an avoidance was correct."
          mobile="Candidate rows become stacked five-pillar profiles; tap keeps the selected explanation and post-alert outcome immediately below the ledger."
          caveat="The seven candidates are illustrative. Production analysis requires a durable scanner snapshot with float, RVOL, catalyst, and first-alert provenance—not only candles for the stocks you traded."
        >
          <OpportunitySet />
        </Specimen>
      </div>
    </main>
  );
}
