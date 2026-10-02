"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import CompactSelect from "@/components/ui/CompactSelect";
import Eyebrow from "@/components/ui/Eyebrow";
import PeriodTabs from "@/components/ui/PeriodTabs";
import TradingStatsBar from "@/components/ui/TradingStatsBar";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import {
  SIGNALS, buildMatrix, etClock,
  type InsightCase, type InsightsData, type MatrixBox, type SignalKey,
} from "@/lib/marketInsights";

const LightweightTradeChart = dynamic(() => import("@/components/LightweightTradeChart"), {
  ssr: false,
  loading: () => <div className="h-[380px] animate-pulse rounded-md bg-[var(--surface)]" />,
});

type SessionFilter = "all" | InsightCase["session"];

const SESSION_TABS = [
  { value: "all", label: "All sessions" },
  { value: "premarket", label: "Premarket" },
  { value: "regular", label: "Regular" },
  { value: "after-hours", label: "After hours" },
];

const BOXES: { box: MatrixBox; title: string; note: string; highlight: boolean }[] = [
  { box: "strongRecovered", title: "Read was right", note: "Looked strong, recovered", highlight: false },
  { box: "strongFailed", title: "The trap", note: "Looked strong, did not recover", highlight: true },
  { box: "weakRecovered", title: "Written off, but recovered", note: "Looked weak, recovered", highlight: true },
  { box: "weakFailed", title: "Correctly passed", note: "Looked weak, did not recover", highlight: false },
];

/** Case list and default replay share one order: charted cases first, newest first. */
const byChartThenDate = (a: InsightCase, b: InsightCase) => Number(b.hasChart) - Number(a.hasChart) || b.date.localeCompare(a.date);
const percent = (value: number | null) => (value == null ? "—" : `${Math.round(value * 100)}%`);
const shortDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function MarketInsightsPrototype({ data }: { data: InsightsData }) {
  const [signalKey, setSignalKey] = useState<SignalKey>("volSinceLow");
  const signal = SIGNALS.find((item) => item.key === signalKey) ?? SIGNALS[0];
  const [thresholds, setThresholds] = useState<Record<string, number>>({});
  const threshold = thresholds[signal.key] ?? signal.initial;
  const [session, setSession] = useState<SessionFilter>("all");
  const [box, setBox] = useState<MatrixBox>("weakRecovered");
  const [replayId, setReplayId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const cases = useMemo(() => data.cases.filter((item) => session === "all" || item.session === session), [data.cases, session]);
  const matrix = useMemo(() => buildMatrix(cases, signal, threshold), [cases, signal, threshold]);
  const selected = useMemo(() => [...matrix.boxes[box]].sort(byChartThenDate), [matrix, box]);
  const chartCases = selected.filter((item) => item.hasChart);
  const replayCase = (replayId && data.cases.find((item) => item.id === replayId)) || chartCases[0] || null;

  const replayRef = useRef<HTMLDivElement>(null);
  function openReplay(id: string) {
    setReplayId(id);
    setRevealed(false);
    // The replay card sits below the case list; bring it into view so the click visibly does something.
    window.setTimeout(() => replayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }
  function nextReplay() {
    if (!chartCases.length) return;
    const index = replayCase ? chartCases.findIndex((item) => item.id === replayCase.id) : -1;
    openReplay(chartCases[(index + 1) % chartCases.length].id);
  }

  return (
    <div className="grid gap-14 pb-16">
      <div className="grid gap-5">
        <p className="max-w-3xl text-[15px] leading-7 text-[var(--body)]">
          A place to try visualizations before they earn a spot in Market Context. The first set compares what a dip looked like
          at the moment you could have bought it with what happened afterward. Everything here is built from a local sample; nothing calls Trading Server.
        </p>
        <TradingStatsBar
          ariaLabel="Insights sample"
          metrics={[
            { label: "Dip decisions", value: data.cases.length.toLocaleString() },
            { label: "Recovered within 60 min", value: percent(data.cases.filter((item) => item.outcome.recovered).length / data.cases.length) },
            { label: "Gainer-days sampled", value: data.meta.gainerDays.toLocaleString() },
            { label: "Dates", value: `${shortDate(data.meta.from)} – ${shortDate(data.meta.to)}`, tone: "muted" },
          ]}
        />
      </div>

      <section aria-labelledby="matrix-title" className="grid gap-6">
        <div className="grid gap-2">
          <Eyebrow tone="accent">At the time vs. what happened</Eyebrow>
          <h2 id="matrix-title" className="text-[22px] font-semibold leading-tight text-[var(--foreground)]">Did the read at the decision point hold up?</h2>
          <p className="max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
            Decision point: the first candle that closes above the prior candle’s high after the first pullback reaches 50% of the pop.
            The read uses only candles up to that candle. The outcome is whether price retook the first high within the next 60 minutes.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-y border-[var(--hairline)] py-4">
          <div className="grid gap-1">
            <span className="text-xs text-[var(--muted)]">At-the-time signal</span>
            <CompactSelect label="At-the-time signal" placeholder="Choose a signal" value={signal.key}
              options={SIGNALS.map((item) => ({ value: item.key, label: item.label }))}
              onChange={(value) => { setSignalKey(value as SignalKey); setReplayId(null); }} />
          </div>
          <label htmlFor="insights-threshold" className="grid min-w-[220px] flex-1 gap-1 sm:max-w-[320px]">
            <span className="flex justify-between text-xs text-[var(--muted)]">
              <span>Strong when {signal.higherIsStrong ? "at least" : "at most"}</span>
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{signal.format(threshold)}</span>
            </span>
            <input id="insights-threshold" type="range" min={signal.min} max={signal.max} step={signal.step} value={threshold}
              onChange={(event) => { setThresholds({ ...thresholds, [signal.key]: Number(event.target.value) }); setReplayId(null); }}
              className="accent-[var(--accent)]" />
          </label>
          <PeriodTabs ariaLabel="Session of the first high" items={SESSION_TABS} value={session}
            onChange={(value) => { setSession(value as SessionFilter); setReplayId(null); }} />
        </div>

        <p className="max-w-3xl text-[15px] leading-7 text-[var(--body)]">
          When {signal.strongWhen(signal.format(threshold))}, <strong className="font-semibold text-[var(--foreground)]">{percent(matrix.strongRate)}</strong> recovered.
          Otherwise <strong className="font-semibold text-[var(--foreground)]">{percent(matrix.weakRate)}</strong> did. Across all {cases.length.toLocaleString()} dips, {percent(matrix.baseRate)}.
        </p>

        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[140px_1fr_1fr] gap-2" role="group" aria-label="At the time vs. outcome">
            <div />
            <div className="px-3 text-xs font-medium text-[var(--muted)]">Recovered</div>
            <div className="px-3 text-xs font-medium text-[var(--muted)]">Did not recover</div>
            {(["strong", "weak"] as const).map((row) => (
              <MatrixRow key={row} row={row} boxes={matrix.boxes} active={box}
                onSelect={(next) => { setBox(next); setReplayId(null); }} />
            ))}
          </div>
        </div>

        <CaseList cases={selected} title={BOXES.find((item) => item.box === box)?.title ?? ""} signalKey={signal.key}
          formatSignal={signal.format} signalLabel={signal.label} activeId={replayCase?.id ?? null} onReplay={openReplay} />

        <div ref={replayRef} className="scroll-mt-6" />
        {replayCase && data.charts[replayCase.id] ? (
          <Replay item={replayCase} data={data} revealed={revealed} onReveal={() => setRevealed(!revealed)}
            onNext={chartCases.length > 1 ? nextReplay : undefined} />
        ) : (
          <p className="text-[13px] text-[var(--muted)]">No replay charts in this box. Charts are kept for a random 180 of the dips.</p>
        )}
      </section>

      <section aria-labelledby="hindsight-title" className="grid gap-8 border-t border-[var(--hairline)] pt-8">
        <div className="grid gap-2">
          <Eyebrow>Hindsight</Eyebrow>
          <h2 id="hindsight-title" className="text-[22px] font-semibold leading-tight text-[var(--foreground)]">What happened after first pullbacks</h2>
          <p className="max-w-3xl text-[14px] leading-6 text-[var(--muted)]">These charts sort pullbacks by how they turned out, which you only know afterward. Use them to learn the shapes, not as live signals.</p>
        </div>
        <RecoverChart data={data} />
        <VolumeChart data={data} />
        {data.gap ? <GapChart gap={data.gap} /> : null}
      </section>
    </div>
  );
}

function MatrixRow({ row, boxes, active, onSelect }: {
  row: "strong" | "weak";
  boxes: Record<MatrixBox, InsightCase[]>;
  active: MatrixBox;
  onSelect: (box: MatrixBox) => void;
}) {
  const cells = BOXES.filter((item) => item.box.startsWith(row));
  const total = cells.reduce((sum, item) => sum + boxes[item.box].length, 0);
  return (
    <>
      <div className="flex items-center px-1 text-[13px] font-semibold text-[var(--foreground)]">Looked {row}<span className="ml-2 font-normal text-[var(--muted)]">{total}</span></div>
      {cells.map((item) => {
        const count = boxes[item.box].length;
        const isActive = active === item.box;
        return (
          <button key={item.box} type="button" onClick={() => onSelect(item.box)} aria-pressed={isActive}
            className={`grid gap-1 rounded-md border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${
              isActive ? "border-[var(--foreground)] bg-[var(--surface)]" : item.highlight ? "border-[var(--accent)]/50 hover:bg-[var(--surface)]" : "border-[var(--hairline)] hover:bg-[var(--surface)]"}`}>
            <span className="text-[13px] font-semibold text-[var(--foreground)]">{item.title}</span>
            <span className="text-[26px] font-semibold leading-8 tabular-nums text-[var(--foreground)]">{count}</span>
            <span className="text-xs text-[var(--muted)]">{total ? `${Math.round((100 * count) / total)}% of looked ${row}` : "—"} · {item.note}</span>
          </button>
        );
      })}
    </>
  );
}

function CaseList({ cases, title, signalKey, signalLabel, formatSignal, activeId, onReplay }: {
  cases: InsightCase[];
  title: string;
  signalKey: SignalKey;
  signalLabel: string;
  formatSignal: (value: number) => string;
  activeId: string | null;
  onReplay: (id: string) => void;
}) {
  const rows = cases.slice(0, 30);
  return (
    <div className="grid gap-3">
      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{title} <span className="font-normal text-[var(--muted)]">· {cases.length} dips{cases.length > rows.length ? `, first ${rows.length} shown` : ""}</span></h3>
      <div className="overflow-x-auto border-y border-[var(--hairline)]">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px] tabular-nums">
          <thead className="text-xs text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)]">
              <th className="px-3 py-2.5 font-medium">Symbol</th><th className="px-3 py-2.5 font-medium">Date</th><th className="px-3 py-2.5 font-medium">Decision (ET)</th>
              <th className="px-3 py-2.5 text-right font-medium">Pop</th><th className="px-3 py-2.5 text-right font-medium">{signalLabel}</th>
              <th className="px-3 py-2.5 font-medium">What happened</th><th className="px-3 py-2.5 text-right font-medium">Dip R</th><th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className={`border-b border-[var(--hairline)] ${activeId === item.id ? "bg-[var(--surface)]" : ""}`}>
                <td className="px-3 py-2 font-semibold text-[var(--foreground)]">{item.sym}</td>
                <td className="px-3 py-2 text-[var(--body)]">{shortDate(item.date)}</td>
                <td className="px-3 py-2 text-[var(--body)]">{etClock(item.time)}</td>
                <td className="px-3 py-2 text-right text-[var(--body)]">+{Math.round(item.asOf.popPct)}%</td>
                <td className="px-3 py-2 text-right text-[var(--foreground)]">{formatSignal(item.asOf[signalKey])}</td>
                <td className="px-3 py-2 text-[var(--body)]">{item.outcome.recovered ? `Retook the high in ${item.outcome.minutesToHigh} min` : "Did not retake the high"}</td>
                <td className={`px-3 py-2 text-right ${item.outcome.r > 0 ? "text-[var(--green)]" : item.outcome.r < 0 ? "text-[var(--red)]" : "text-[var(--muted)]"}`}>{item.outcome.r > 0 ? "+" : ""}{item.outcome.r.toFixed(1)}</td>
                <td className="px-3 py-2 text-right">
                  {item.hasChart ? <button type="button" onClick={() => onReplay(item.id)} aria-current={activeId === item.id ? "true" : undefined}
                    className={`text-[13px] font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] ${activeId === item.id ? "text-[var(--foreground)]" : "text-[var(--accent)]"}`}>
                    {activeId === item.id ? "In replay ↓" : "Replay"}</button> : <span className="text-xs text-[var(--muted)]">No chart</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Replay({ item, data, revealed, onReveal, onNext }: {
  item: InsightCase;
  data: InsightsData;
  revealed: boolean;
  onReveal: () => void;
  onNext?: () => void;
}) {
  const chart = data.charts[item.id];
  const candles: ChartCandle[] = chart.bars
    .filter((bar) => revealed || bar[0] <= chart.decisionT)
    .map(([t, o, h, l, c, vol]) => ({ t, o, h, l, c, vol }));
  const markers: ChartMarker[] = [{ t: chart.decisionT, price: chart.decisionPrice, side: "buy" }];
  const read = [
    ["Pop", `+${Math.round(item.asOf.popPct)}%`],
    ["Pullback depth so far", `${Math.round(item.asOf.depth * 100)}% of the move`],
    ["Selling vs buying volume", `${item.asOf.sellVsBuy.toFixed(2)}×`],
    ["Big red candles", String(item.asOf.bigRed)],
    ["Volume since the low", `${item.asOf.volSinceLow.toFixed(1)}× pre-high pace`],
    ["Trigger candle volume", `${item.asOf.triggerVol.toFixed(1)}× pre-high pace`],
    ["Minutes since the high", String(item.asOf.minutesSinceHigh)],
    ["Stop at prior candle low", `${item.asOf.stopCents.toFixed(0)}¢`],
  ];
  return (
    <div className="grid gap-4 border-t border-[var(--hairline)] pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[17px] font-semibold text-[var(--foreground)]">Replay · {item.sym} · {shortDate(item.date)} · decision at {etClock(item.time)} ET</h3>
        <div className="flex gap-2">
          <Button variant={revealed ? "ghost" : "primary"} onClick={onReveal}>{revealed ? "Hide what happened" : "Reveal what happened"}</Button>
          {onNext ? <Button onClick={onNext}>Next case</Button> : null}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <LightweightTradeChart key={`${item.id}-${revealed}`} candles={candles} markers={markers} chartHeightClass="h-[380px]"
            initialFocusTime={chart.decisionT} focusMinutesBefore={40} focusMinutesAfter={revealed ? 60 : 5} />
        </div>
        <div className="grid content-start gap-4">
          <div>
            <Eyebrow tone="accent">At the time</Eyebrow>
            <dl className="mt-2 grid gap-1.5 text-[13px]">
              {read.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{label}</dt><dd className="font-medium tabular-nums text-[var(--foreground)]">{value}</dd></div>
              ))}
            </dl>
          </div>
          <div>
            <Eyebrow>What happened</Eyebrow>
            {revealed ? (
              <dl className="mt-2 grid gap-1.5 text-[13px]">
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Outcome</dt><dd className={`font-medium ${item.outcome.recovered ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{item.outcome.recovered ? `Retook the high in ${item.outcome.minutesToHigh} min` : "Did not retake the high"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Highest in the next hour</dt><dd className="font-medium tabular-nums text-[var(--foreground)]">{item.outcome.peakAfter.toFixed(2)}× the move</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">Dip entry result</dt><dd className="font-medium tabular-nums text-[var(--foreground)]">{item.outcome.r > 0 ? "+" : ""}{item.outcome.r.toFixed(1)}R</dd></div>
              </dl>
            ) : <p className="mt-2 text-[13px] text-[var(--muted)]">Make your call, then reveal the next hour.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Hindsight charts: hand-drawn SVG with theme tokens. */

const W = 720;

function ChartFrame({ title, takeaway, children, legend, axis }: { title: string; takeaway: string; children: ReactNode; legend?: ReactNode; axis?: string }) {
  return (
    <figure className="grid gap-3">
      <figcaption className="grid gap-1">
        <span className="text-[16px] font-semibold text-[var(--foreground)]">{title}</span>
        <span className="max-w-3xl text-[14px] leading-6 text-[var(--body)]">{takeaway}</span>
      </figcaption>
      {legend}
      <div className="overflow-x-auto">{children}</div>
      {axis ? <p className="text-right text-xs text-[var(--muted)]">{axis}</p> : null}
    </figure>
  );
}

function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--muted)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-4" style={{ borderTop: `2px ${item.dashed ? "dashed" : "solid"} ${item.color}` }} />{item.label}
        </span>
      ))}
    </div>
  );
}

function RecoverChart({ data }: { data: InsightsData }) {
  const { held, flush } = data.hindsight.recover;
  const H = 230, padL = 36, padB = 26, padT = 10;
  const max = Math.max(...held.pct, ...flush.pct, 1);
  const n = held.pct.length, slot = (W - padL - 8) / n, bw = Math.min(10, slot / 2 - 1);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  return (
    <ChartFrame title="How high pullbacks curl back"
      takeaway={`Within an hour of the pullback low, ${held.retest}% of pullbacks that held retested the first high, and the median reached ${held.median.toFixed(2)}× the move. Even flushes got back to the high ${flush.retest}% of the time.`}
      legend={<Legend items={[{ label: `Held (n=${held.n})`, color: "var(--accent)" }, { label: `Flushed, gave back over 75% (n=${flush.n})`, color: "var(--red)" }, { label: "First high", color: "var(--muted)", dashed: true }]} />}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Distribution of how far price came back within an hour, held versus flushed pullbacks">
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={padL} x2={W - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--hairline)" /><text x={padL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{Math.round(max * f)}%</text></g>)}
        {held.pct.map((v, i) => {
          const x = padL + i * slot + slot / 2;
          return <g key={i}>
            <rect x={x - bw - 0.5} y={y(v)} width={bw} height={y(0) - y(v)} fill="var(--accent)" rx="1.5" />
            <rect x={x + 0.5} y={y(flush.pct[i])} width={bw} height={y(0) - y(flush.pct[i])} fill="var(--red)" rx="1.5" />
            {i % 5 === 0 ? <text x={x} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{(i / 10).toFixed(1)}{i === n - 1 ? "+" : ""}×</text> : null}
          </g>;
        })}
        <line x1={padL + 10 * slot + slot / 2} x2={padL + 10 * slot + slot / 2} y1={padT} y2={H - padB} stroke="var(--muted)" strokeDasharray="4 4" />
      </svg>
    </ChartFrame>
  );
}

function VolumeChart({ data }: { data: InsightsData }) {
  const { recovered, flushed } = data.hindsight.volume;
  const H = 230, padL = 36, padB = 30, padT = 10;
  const xs = recovered.minutes, max = Math.max(...recovered.median, ...flushed.median, 1);
  const x = (i: number) => padL + (W - padL - 8) * (i / (xs.length - 1));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const zero = xs.indexOf(0);
  const after = (vals: number[]) => vals.slice(zero + 2, zero + 6).reduce((a, b) => a + b, 0) / 4;
  return (
    <ChartFrame title="Volume around the pullback low"
      takeaway={`Both groups trade heavily into the low. Two to five minutes later, dips that recovered still traded about ${after(recovered.median).toFixed(1)}× the pre-high pace; flushes had faded to about ${after(flushed.median).toFixed(1)}×. The low is only known afterward; the live version is volume holding up on the first green candles.`}
      axis="Minutes from the pullback low · volume as a multiple of the 10 minutes before the first high"
      legend={<Legend items={[{ label: `Recovered within 30 min (n=${recovered.n})`, color: "var(--accent)" }, { label: `Flushed (n=${flushed.n})`, color: "var(--red)" }]} />}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Median volume per minute around the pullback low, recovered versus flushed">
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={padL} x2={W - 8} y1={y(max * f)} y2={y(max * f)} stroke="var(--hairline)" /><text x={padL - 6} y={y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{(max * f).toFixed(1)}×</text></g>)}
        <line x1={x(zero)} x2={x(zero)} y1={padT} y2={H - padB} stroke="var(--muted)" strokeDasharray="4 4" />
        <path d={path(recovered.median)} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
        <path d={path(flushed.median)} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" />
        {xs.map((m, i) => (m % 5 === 0 ? <text key={m} x={x(i)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{m > 0 ? `+${m}` : m}</text> : null))}
      </svg>
    </ChartFrame>
  );
}

function GapChart({ gap }: { gap: NonNullable<InsightsData["gap"]> }) {
  const H = 300, padL = 44, padB = 30, padT = 10;
  const x = (v: number) => padL + (W - padL - 8) * ((v + 20) / 320);
  const y = (v: number) => padT + (H - padT - padB) * (1 - (v + 100) / 400);
  const share = (key: "gapDied" | "gapContinued" | "quietPremarket") => Math.round((100 * (gap.quadrants[key] ?? 0)) / gap.n);
  return (
    <ChartFrame title="Gap vs. continuation"
      takeaway={`${share("gapDied")}% of gainers gapped at least 20% premarket and never took out the premarket high after the open. ${share("gapContinued")}% gapped and kept going; ${share("quietPremarket")}% were quiet premarket and moved later. Built only from columns Market Context already has.`}
      axis="Across: premarket gain from the prior close · Up: beyond the premarket high after the open · both clipped at 300%"
      legend={<Legend items={[{ label: "Gapped, kept going", color: "var(--accent)" },{ label: "Gapped, died at the open", color: "var(--red)" }, { label: "Quiet premarket", color: "var(--muted)" }]} />}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[520px]" role="img" aria-label="Premarket gain against continuation after the open">
        {[0, 100, 200, 300].map((v) => <g key={`x${v}`}><line x1={x(v)} x2={x(v)} y1={padT} y2={H - padB} stroke="var(--hairline)" /><text x={x(v)} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">{v}%</text></g>)}
        {[-100, 0, 100, 200, 300].map((v) => <g key={`y${v}`}><line x1={padL} x2={W - 8} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--muted)" : "var(--hairline)"} /><text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}%</text></g>)}
        <line x1={x(20)} x2={x(20)} y1={padT} y2={H - padB} stroke="var(--muted)" strokeDasharray="4 4" />
        {gap.points.map(([pm, cont], i) => (
          <circle key={i} cx={x(pm)} cy={y(cont)} r="1.8" opacity="0.5"
            fill={pm >= 20 ? (cont > 0 ? "var(--accent)" : "var(--red)") : "var(--muted)"} />
        ))}
      </svg>
    </ChartFrame>
  );
}
