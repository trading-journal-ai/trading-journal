"use client";

import Link from "next/link";
import { useMemo, useState, type KeyboardEvent } from "react";
import { priceActionCandidates, type PriceActionCandidate, type PriceActionCandle } from "@/lib/preview/dataVizV6Data";

const BLUE = "var(--blue)";
const GREEN = "var(--green)";
const RED = "var(--red)";

type SeriesPoint = { minute: number; value: number };
type PriceActionRead = "Clean expansion" | "Whippy expansion" | "Tight grind" | "Dead chop";
type IndicatorKey = "ema9" | "ema20" | "ema30" | "ema50" | "vwap";
type RailKey = "ema9" | "ema20" | "vwap";
type RailEventKind = "hold" | "loss" | "reclaim";

type RailEvent = {
  id: string;
  minute: number;
  rail: RailKey;
  kind: RailEventKind;
  label: string;
  detail: string;
  distancePct: number;
};

type PriceActionMetrics = {
  medianRangePct: number;
  bodySharePct: number;
  wickSharePct: number;
  overlapPct: number;
  efficiencyPct: number;
  maxPullbackPct: number;
  maxCocStreak: number;
  cocStartMinute: number;
  cocEndMinute: number;
  vwapHoldPct: number;
  ema9HoldPct: number;
  ema20HoldPct: number;
  bullStackPct: number;
  railEvents: RailEvent[];
  read: PriceActionRead;
  ema9: SeriesPoint[];
  ema20: SeriesPoint[];
  ema30: SeriesPoint[];
  ema50: SeriesPoint[];
  vwap: SeriesPoint[];
};

const indicatorStyles: Record<IndicatorKey, { label: string; stroke: string; dash?: string; width: number }> = {
  ema9: { label: "9 EMA", stroke: BLUE, width: 2.2 },
  ema20: { label: "20 EMA", stroke: "var(--body)", dash: "5 4", width: 1.6 },
  ema30: { label: "30 EMA", stroke: "var(--muted)", dash: "2 4", width: 1.4 },
  ema50: { label: "50 EMA", stroke: "var(--faint)", dash: "9 5", width: 1.4 },
  vwap: { label: "VWAP", stroke: "var(--foreground)", dash: "10 3 2 3", width: 1.8 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMin === domainMax) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function signedPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

function emaSeries(candles: PriceActionCandle[], period: number): SeriesPoint[] {
  const alpha = 2 / (period + 1);
  let value = candles[0].close;
  return candles.map((candle, index) => {
    value = index === 0 ? candle.close : candle.close * alpha + value * (1 - alpha);
    return { minute: candle.minute, value };
  });
}

function vwapSeries(candidate: PriceActionCandidate): SeriesPoint[] {
  const sessionStart = -candidate.alertMinuteFromOpen;
  let cumulativeVolume = 0;
  let cumulativePriceVolume = 0;
  return candidate.candles.flatMap((candle) => {
    if (candle.minute < sessionStart) return [];
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeVolume += candle.volume;
    cumulativePriceVolume += typicalPrice * candle.volume;
    return [{ minute: candle.minute, value: cumulativePriceVolume / cumulativeVolume }];
  });
}

function seriesValueAt(series: SeriesPoint[], minute: number) {
  return series.find((point) => point.minute === minute)?.value ?? null;
}

function deriveRailEvents(
  candles: PriceActionCandle[],
  seriesByRail: Record<RailKey, SeriesPoint[]>,
): RailEvent[] {
  const postAlert = candles.filter((candle) => candle.minute >= 0 && candle.minute <= 30);
  const seriesMaps = Object.fromEntries(
    Object.entries(seriesByRail).map(([rail, series]) => [rail, new Map(series.map((point) => [point.minute, point.value]))]),
  ) as Record<RailKey, Map<number, number>>;
  const tolerancePct = 0.35;
  const events: RailEvent[] = [];

  (["ema9", "ema20", "vwap"] as RailKey[]).forEach((rail) => {
    const values = seriesMaps[rail];
    postAlert.forEach((candle, index) => {
      if (index === 0) return;
      const previous = postAlert[index - 1];
      const next = postAlert[index + 1];
      const value = values.get(candle.minute);
      const previousValue = values.get(previous.minute);
      if (value == null || previousValue == null) return;

      const previousAbove = previous.close >= previousValue;
      const closesAbove = candle.close >= value;
      const distancePct = ((candle.close - value) / value) * 100;
      const touchesRail = candle.low <= value * (1 + tolerancePct / 100) && candle.high >= value * (1 - tolerancePct / 100);
      const previousTouchesRail = previous.low <= previousValue * (1 + tolerancePct / 100) && previous.high >= previousValue * (1 - tolerancePct / 100);
      const confirmsBounce = next ? next.close >= (values.get(next.minute) ?? value) : closesAbove;

      let kind: RailEventKind | null = null;
      if (previousAbove && !closesAbove) kind = "loss";
      else if (!previousAbove && closesAbove) kind = "reclaim";
      else if (previousAbove && closesAbove && touchesRail && !previousTouchesRail && confirmsBounce) kind = "hold";
      if (!kind) return;

      const railLabel = rail === "ema9" ? "9 EMA" : rail === "ema20" ? "20 EMA" : "VWAP";
      const verb = kind === "hold" ? "tested and held" : kind === "loss" ? "closed below" : "closed back above";
      events.push({
        id: `${rail}-${kind}-${candle.minute}`,
        minute: candle.minute,
        rail,
        kind,
        label: `${railLabel} ${kind}`,
        detail: `${railLabel} ${verb}; the close finished ${signedPercent(distancePct, 2)} from the line.`,
        distancePct,
      });
    });
  });

  return events;
}

function classifyPath(medianRangePct: number, efficiencyPct: number, wickSharePct: number, overlapPct: number): PriceActionRead {
  if (medianRangePct < 0.8 && efficiencyPct < 42) return "Dead chop";
  if (medianRangePct < 1.5 && efficiencyPct >= 55) return "Tight grind";
  if (efficiencyPct >= 68 && wickSharePct < 52) return "Clean expansion";
  if (medianRangePct >= 3 && (efficiencyPct < 48 || wickSharePct >= 48 || overlapPct >= 64)) return "Whippy expansion";
  if (efficiencyPct >= 55 && wickSharePct < 56 && overlapPct < 74) return "Clean expansion";
  return medianRangePct < 1.2 ? "Dead chop" : "Whippy expansion";
}

function deriveMetrics(candidate: PriceActionCandidate): PriceActionMetrics {
  const postAlert = candidate.candles.filter((candle) => candle.minute >= 0 && candle.minute <= 30);
  const ranges = postAlert.map((candle) => ((candle.high - candle.low) / candle.open) * 100);
  const totalRange = postAlert.reduce((sum, candle) => sum + candle.high - candle.low, 0);
  const totalBody = postAlert.reduce((sum, candle) => sum + Math.abs(candle.close - candle.open), 0);
  const bodySharePct = totalRange > 0 ? (totalBody / totalRange) * 100 : 0;
  const overlaps = postAlert.slice(1).map((candle, index) => {
    const previous = postAlert[index];
    const overlap = Math.max(0, Math.min(previous.high, candle.high) - Math.max(previous.low, candle.low));
    const smallerRange = Math.min(previous.high - previous.low, candle.high - candle.low);
    return smallerRange > 0 ? (overlap / smallerRange) * 100 : 0;
  });
  const pathDistance = postAlert.reduce((sum, candle, index) => {
    const previousClose = index === 0 ? candle.open : postAlert[index - 1].close;
    return sum + Math.abs(candle.close - previousClose);
  }, 0);
  const netDistance = Math.abs(postAlert.at(-1)!.close - postAlert[0].open);
  const efficiencyPct = pathDistance > 0 ? (netDistance / pathDistance) * 100 : 0;

  let currentStreak = 1;
  let currentStart = postAlert[0].minute;
  let maxCocStreak = 1;
  let cocStartMinute = postAlert[0].minute;
  let cocEndMinute = postAlert[0].minute;
  postAlert.slice(1).forEach((candle, index) => {
    const previous = postAlert[index];
    if (candle.high > previous.high && candle.low > previous.low) {
      if (currentStreak === 1) currentStart = previous.minute;
      currentStreak += 1;
    } else {
      currentStreak = 1;
      currentStart = candle.minute;
    }
    if (currentStreak > maxCocStreak) {
      maxCocStreak = currentStreak;
      cocStartMinute = currentStart;
      cocEndMinute = candle.minute;
    }
  });

  let runningHigh = postAlert[0].high;
  let maxPullbackPct = 0;
  postAlert.forEach((candle) => {
    runningHigh = Math.max(runningHigh, candle.high);
    maxPullbackPct = Math.max(maxPullbackPct, ((runningHigh - candle.low) / runningHigh) * 100);
  });

  const ema9 = emaSeries(candidate.candles, 9);
  const ema20 = emaSeries(candidate.candles, 20);
  const ema30 = emaSeries(candidate.candles, 30);
  const ema50 = emaSeries(candidate.candles, 50);
  const vwap = vwapSeries(candidate);
  const firstFifteen = postAlert.filter((candle) => candle.minute <= 15);
  const vwapHoldPct = (firstFifteen.filter((candle) => candle.close >= (seriesValueAt(vwap, candle.minute) ?? Number.POSITIVE_INFINITY)).length / firstFifteen.length) * 100;
  const ema9HoldPct = (firstFifteen.filter((candle) => candle.close >= (seriesValueAt(ema9, candle.minute) ?? Number.POSITIVE_INFINITY)).length / firstFifteen.length) * 100;
  const ema20HoldPct = (firstFifteen.filter((candle) => candle.close >= (seriesValueAt(ema20, candle.minute) ?? Number.POSITIVE_INFINITY)).length / firstFifteen.length) * 100;
  const bullStackPct = (firstFifteen.filter((candle) => {
    const ema9Value = seriesValueAt(ema9, candle.minute);
    const ema20Value = seriesValueAt(ema20, candle.minute);
    const vwapValue = seriesValueAt(vwap, candle.minute);
    return ema9Value != null && ema20Value != null && vwapValue != null && candle.close >= ema9Value && ema9Value >= ema20Value && candle.close >= vwapValue;
  }).length / firstFifteen.length) * 100;
  const railEvents = deriveRailEvents(candidate.candles, { ema9, ema20, vwap });
  const medianRangePct = median(ranges);
  const wickSharePct = 100 - bodySharePct;
  const overlapPct = overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length;

  return {
    medianRangePct,
    bodySharePct,
    wickSharePct,
    overlapPct,
    efficiencyPct,
    maxPullbackPct,
    maxCocStreak,
    cocStartMinute,
    cocEndMinute,
    vwapHoldPct,
    ema9HoldPct,
    ema20HoldPct,
    bullStackPct,
    railEvents,
    read: classifyPath(medianRangePct, efficiencyPct, wickSharePct, overlapPct),
    ema9,
    ema20,
    ema30,
    ema50,
    vwap,
  };
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 border-l border-[var(--hairline)] pl-4 first:border-l-0 first:pl-0">
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-2 font-mono text-[16px] font-semibold tabular-nums text-[var(--foreground)]">{value}</dd>
      {detail ? <p className="mt-1 text-[11px] leading-4 text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

function StudyHeader({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <header className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(420px,1fr)] lg:gap-16">
      <div>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{index} · Price action quality</p>
        <h2 className="mt-4 max-w-xl text-[30px] font-semibold leading-[1.08] tracking-[-0.025em] text-[var(--foreground)]">{title}</h2>
      </div>
      <p className="max-w-2xl text-[15px] leading-7 text-[var(--body)]">{description}</p>
    </header>
  );
}

function readTone(read: PriceActionRead) {
  if (read === "Clean expansion") return GREEN;
  if (read === "Whippy expansion") return RED;
  if (read === "Tight grind") return BLUE;
  return "var(--muted)";
}

function MoverLedger({
  selected,
  metricsBySymbol,
  onSelect,
}: {
  selected: string;
  metricsBySymbol: Map<string, PriceActionMetrics>;
  onSelect: (symbol: string) => void;
}) {
  return (
    <div className="mt-9 overflow-x-auto border-y border-[var(--hairline)]">
      <div className="min-w-[1080px]">
        <div className="grid grid-cols-[64px_82px_100px_140px_repeat(5,minmax(92px,1fr))_90px] gap-x-3 border-b border-[var(--hairline)] px-3 py-3 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          <span>Alert rank</span><span>Symbol</span><span>Day HOD</span><span>Path read</span><span>COC run</span><span>Range</span><span>Wicks</span><span>Overlap</span><span>Efficiency</span><span>Action</span>
        </div>
        {priceActionCandidates.map((candidate) => {
          const metrics = metricsBySymbol.get(candidate.symbol)!;
          const active = selected === candidate.symbol;
          return (
            <button
              key={candidate.symbol}
              type="button"
              onClick={() => onSelect(candidate.symbol)}
              onFocus={() => onSelect(candidate.symbol)}
              aria-pressed={active}
              className={`grid w-full grid-cols-[64px_82px_100px_140px_repeat(5,minmax(92px,1fr))_90px] items-center gap-x-3 border-t border-[var(--hairline)] px-3 py-4 text-left transition-colors first:border-t-0 focus-visible:outline-2 focus-visible:outline-[var(--blue)] ${active ? "bg-[color-mix(in_srgb,var(--blue)_7%,transparent)]" : "hover:bg-[var(--surface)]"}`}
            >
              <span className="font-mono text-[12px] text-[var(--muted)]">#{candidate.alertRank}</span>
              <span><strong className="block font-mono text-[17px] text-[var(--foreground)]">{candidate.symbol}</strong><span className="font-mono text-[9px] text-[var(--muted)]">OUTCOME #{candidate.outcomeRank}</span></span>
              <span className="font-mono text-[15px] font-semibold tabular-nums text-[var(--foreground)]">{signedPercent(candidate.dayHodPct)}</span>
              <span className="text-[12px] font-semibold" style={{ color: readTone(metrics.read) }}>{metrics.read}</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--body)]">{metrics.maxCocStreak} {metrics.maxCocStreak === 1 ? "candle" : "candles"}</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--body)]">{metrics.medianRangePct.toFixed(1)}%</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--body)]">{metrics.wickSharePct.toFixed(0)}%</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--body)]">{metrics.overlapPct.toFixed(0)}%</span>
              <span className="font-mono text-[13px] tabular-nums text-[var(--body)]">{metrics.efficiencyPct.toFixed(0)}%</span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: candidate.traded ? BLUE : "var(--muted)" }}>{candidate.traded ? "Traded" : "Missed"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pathForSeries(series: SeriesPoint[], x: (minute: number) => number, y: (value: number) => number) {
  return series.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.minute).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
}

function PriceActionChart({ candidate, metrics }: { candidate: PriceActionCandidate; metrics: PriceActionMetrics }) {
  const [indicators, setIndicators] = useState<IndicatorKey[]>(["ema9", "ema20", "vwap"]);
  const visibleCandles = candidate.candles.filter((candle) => candle.minute >= -5 && candle.minute <= 30);
  const width = 1120;
  const height = 500;
  const left = 64;
  const right = 72;
  const top = 38;
  const plotBottom = 350;
  const volumeTop = 380;
  const volumeBottom = 448;
  const x = (minute: number) => scale(minute, -5, 30, left, width - right);
  const selectedSeries = indicators.flatMap((key) => metrics[key].filter((point) => point.minute >= -5 && point.minute <= 30));
  const yValues = [...visibleCandles.flatMap((candle) => [candle.low, candle.high]), ...selectedSeries.map((point) => point.value)];
  const rawMin = Math.min(...yValues);
  const rawMax = Math.max(...yValues);
  const padding = (rawMax - rawMin) * 0.08;
  const minPrice = rawMin - padding;
  const maxPrice = rawMax + padding;
  const y = (price: number) => scale(price, minPrice, maxPrice, plotBottom, top);
  const candleWidth = Math.max(5, (x(1) - x(0)) * 0.58);
  const maxVolume = Math.max(...visibleCandles.map((candle) => candle.volume));
  const priceTicks = Array.from({ length: 5 }, (_, index) => minPrice + ((maxPrice - minPrice) * index) / 4);

  function toggleIndicator(key: IndicatorKey) {
    setIndicators((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[var(--hairline)] py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Indicator overlays · click to compare</p>
        <div className="flex flex-wrap gap-2" aria-label="Toggle indicator overlays">
          {(Object.keys(indicatorStyles) as IndicatorKey[]).map((key) => {
            const style = indicatorStyles[key];
            const active = indicators.includes(key);
            return (
              <button key={key} type="button" aria-pressed={active} onClick={() => toggleIndicator(key)} className={`min-h-9 border px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${active ? "border-[var(--blue)] bg-[var(--surface-2)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]" aria-label={`${candidate.symbol} one-minute price action chart`}>
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[900px]" role="img" aria-label={`${candidate.symbol} one-minute candles from five minutes before the scanner alert through thirty minutes after, with selectable EMA and VWAP overlays.`}>
          {priceTicks.map((price) => (
            <g key={price}>
              <line x1={left} x2={width - right} y1={y(price)} y2={y(price)} stroke="var(--hairline)" strokeDasharray="3 5" />
              <text x={left - 10} y={y(price) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">${price.toFixed(2)}</text>
              <text x={width - right + 10} y={y(price) + 4} textAnchor="start" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{signedPercent(((price - candidate.alertPrice) / candidate.alertPrice) * 100, 0)}</text>
            </g>
          ))}

          <rect x={x(metrics.cocStartMinute) - candleWidth} y={top} width={Math.max(candleWidth * 2, x(metrics.cocEndMinute) - x(metrics.cocStartMinute) + candleWidth * 2)} height={plotBottom - top} fill="color-mix(in srgb, var(--blue) 6%, transparent)" />
          <text x={x(metrics.cocStartMinute)} y={top + 15} fill={BLUE} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">{metrics.maxCocStreak}-CANDLE COC RUN</text>
          <line x1={x(0)} x2={x(0)} y1={top} y2={volumeBottom} stroke={BLUE} strokeDasharray="3 4" opacity="0.65" />
          <text x={x(0) + 7} y={top + 31} fill={BLUE} fontSize="9.5" fontWeight="700" fontFamily="var(--font-mono)">SCANNER · {candidate.firstSeen} · ${candidate.alertPrice.toFixed(2)}</text>

          {visibleCandles.map((candle) => {
            const tone = candle.close >= candle.open ? GREEN : RED;
            const bodyTop = y(Math.max(candle.open, candle.close));
            const bodyHeight = Math.max(2, Math.abs(y(candle.open) - y(candle.close)));
            return (
              <g key={candle.minute}>
                <line x1={x(candle.minute)} x2={x(candle.minute)} y1={y(candle.high)} y2={y(candle.low)} stroke={tone} strokeWidth="1.25" />
                <rect x={x(candle.minute) - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={tone} opacity="0.82" />
              </g>
            );
          })}

          {indicators.map((key) => {
            const style = indicatorStyles[key];
            const series = metrics[key].filter((point) => point.minute >= -5 && point.minute <= 30);
            return <path key={key} d={pathForSeries(series, x, y)} fill="none" stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} strokeLinecap="round" strokeLinejoin="round" opacity="0.92" />;
          })}

          {visibleCandles.map((candle) => {
            const barHeight = scale(candle.volume, 0, maxVolume, 0, volumeBottom - volumeTop);
            return <rect key={`volume-${candle.minute}`} x={x(candle.minute) - candleWidth / 2} y={volumeBottom - barHeight} width={candleWidth} height={barHeight} fill="var(--muted)" opacity="0.2" />;
          })}
          <text x={left} y={volumeTop - 10} fill="var(--muted)" fontSize="9" fontFamily="var(--font-mono)">ONE-MINUTE VOLUME</text>

          {[-5, 0, 5, 15, 30].map((minute) => (
            <text key={minute} x={x(minute)} y={height - 15} textAnchor={minute === -5 ? "start" : minute === 30 ? "end" : "middle"} fill={minute === 0 ? BLUE : "var(--muted)"} fontSize="10" fontWeight={minute === 0 ? "700" : "400"} fontFamily="var(--font-mono)">{minute === 0 ? "ALERT" : minute > 0 ? `+${minute}m` : `${minute}m`}</text>
          ))}
        </svg>
      </div>
      <p className="mt-3 text-[11.5px] leading-5 text-[var(--muted)]">EMA lines include pre-alert warmup candles. VWAP begins at the 9:30 session open. The highlighted COC run requires both a higher high and a higher low on consecutive one-minute candles.</p>
    </div>
  );
}

function handleMatrixKey(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function QualityMap({ selected, metricsBySymbol, onSelect }: { selected: string; metricsBySymbol: Map<string, PriceActionMetrics>; onSelect: (symbol: string) => void }) {
  const width = 760;
  const height = 410;
  const left = 64;
  const right = 30;
  const top = 34;
  const bottom = 54;
  const x = (rangePct: number) => scale(rangePct, 0, 8, left, width - right);
  const y = (efficiencyPct: number) => scale(efficiencyPct, 0, 100, height - bottom, top);
  const splitX = x(1.5);
  const splitY = y(52);

  return (
    <div className="overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]">
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full min-w-[680px]" role="img" aria-label="Four price-action candidates positioned by median candle range and directional efficiency.">
        <rect x={left} y={top} width={splitX - left} height={splitY - top} fill="color-mix(in srgb, var(--blue) 5%, transparent)" />
        <rect x={splitX} y={top} width={width - right - splitX} height={splitY - top} fill="color-mix(in srgb, var(--green) 5%, transparent)" />
        <rect x={left} y={splitY} width={splitX - left} height={height - bottom - splitY} fill="color-mix(in srgb, var(--muted) 5%, transparent)" />
        <rect x={splitX} y={splitY} width={width - right - splitX} height={height - bottom - splitY} fill="color-mix(in srgb, var(--red) 5%, transparent)" />
        <line x1={splitX} x2={splitX} y1={top} y2={height - bottom} stroke="var(--hairline)" />
        <line x1={left} x2={width - right} y1={splitY} y2={splitY} stroke="var(--hairline)" />

        <text x={left + 12} y={top + 20} fill={BLUE} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">TIGHT GRIND</text>
        <text x={splitX + 12} y={top + 20} fill={GREEN} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">CLEAN EXPANSION</text>
        <text x={left + 12} y={splitY + 22} fill="var(--muted)" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">DEAD CHOP</text>
        <text x={splitX + 12} y={splitY + 22} fill={RED} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">WHIPPY EXPANSION</text>

        {[0, 2, 4, 6, 8].map((tick) => <text key={tick} x={x(tick)} y={height - 28} textAnchor={tick === 0 ? "start" : tick === 8 ? "end" : "middle"} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{tick}%</text>)}
        {[0, 25, 50, 75, 100].map((tick) => <text key={tick} x={left - 10} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{tick}%</text>)}
        <text x={(left + width - right) / 2} y={height - 8} textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="var(--font-mono)">MEDIAN ONE-MINUTE RANGE →</text>
        <text x="12" y={(top + height - bottom) / 2} textAnchor="middle" transform={`rotate(-90 12 ${(top + height - bottom) / 2})`} fill="var(--muted)" fontSize="9" fontFamily="var(--font-mono)">DIRECTIONAL EFFICIENCY →</text>

        {priceActionCandidates.map((candidate) => {
          const metrics = metricsBySymbol.get(candidate.symbol)!;
          const active = selected === candidate.symbol;
          const pointX = x(clamp(metrics.medianRangePct, 0, 8));
          const pointY = y(clamp(metrics.efficiencyPct, 0, 100));
          const labelOnLeft = metrics.medianRangePct >= 7;
          return (
            <g key={candidate.symbol} role="button" tabIndex={0} aria-label={`Select ${candidate.symbol}, ${metrics.read}`} onClick={() => onSelect(candidate.symbol)} onFocus={() => onSelect(candidate.symbol)} onKeyDown={(event) => handleMatrixKey(event, () => onSelect(candidate.symbol))} className="cursor-pointer outline-none">
              {active ? <circle cx={pointX} cy={pointY} r="17" fill="color-mix(in srgb, var(--blue) 12%, transparent)" /> : null}
              <circle cx={pointX} cy={pointY} r={active ? 8 : 6} fill={active ? BLUE : "var(--surface)"} stroke={active ? BLUE : readTone(metrics.read)} strokeWidth="2" />
              <text x={pointX + (labelOnLeft ? -11 : 11)} y={pointY - 10} textAnchor={labelOnLeft ? "end" : "start"} fill={active ? BLUE : "var(--body)"} stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)">{candidate.symbol}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function clockFromAlert(firstSeen: string, offsetMinutes: number) {
  const [hours, minutes] = firstSeen.split(":").map(Number);
  const total = hours * 60 + minutes + offsetMinutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function railLabel(rail: RailKey) {
  if (rail === "ema9") return "9 EMA";
  if (rail === "ema20") return "20 EMA";
  return "VWAP";
}

function eventTone(kind: RailEventKind) {
  if (kind === "loss") return RED;
  if (kind === "reclaim") return BLUE;
  return GREEN;
}

function indicatorVerdict(metrics: PriceActionMetrics) {
  const vwapReclaims = metrics.railEvents.filter((event) => event.rail === "vwap" && event.kind === "reclaim").length;
  const fastRailCrosses = metrics.railEvents.filter((event) => event.rail === "ema9" && (event.kind === "loss" || event.kind === "reclaim")).length;
  if (metrics.read === "Whippy expansion" && fastRailCrosses >= 4) return `Price crossed the 9 EMA ${fastRailCrosses} times—active, but not a stable rail.`;
  if (metrics.bullStackPct >= 75) return "The move stayed organized above its fast trend rails.";
  if (vwapReclaims > 0) return `VWAP was reclaimed ${vwapReclaims} ${vwapReclaims === 1 ? "time" : "times"}, but the trend stack was not consistently clean.`;
  if (metrics.ema9HoldPct < 50 && metrics.vwapHoldPct < 50) return "Price spent more time fighting its rails than using them as support.";
  return "The indicator picture was mixed; exact entry location would decide whether the setup was actionable.";
}

function RailEventStudy({ candidate, metrics }: { candidate: PriceActionCandidate; metrics: PriceActionMetrics }) {
  const [selectedEventId, setSelectedEventId] = useState(metrics.railEvents[0]?.id ?? null);
  const selectedEvent = metrics.railEvents.find((event) => event.id === selectedEventId) ?? metrics.railEvents[0] ?? null;
  const bounceCount = metrics.railEvents.filter((event) => (event.rail === "ema9" || event.rail === "ema20") && event.kind === "hold").length;
  const vwapReclaimCount = metrics.railEvents.filter((event) => event.rail === "vwap" && event.kind === "reclaim").length;

  return (
    <div className="mt-9">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">{candidate.symbol} · first 30 minutes after scanner</p>
          <p className="mt-3 max-w-3xl text-[25px] font-semibold leading-8 text-[var(--foreground)]">{indicatorVerdict(metrics)}</p>
          <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[var(--body)]">This study turns indicator lines into reviewable events: a test that held, a close that lost the rail, or a close that reclaimed it.</p>
        </div>
        <dl className="grid grid-cols-2 gap-y-6">
          <Metric label="Bull stack" value={`${metrics.bullStackPct.toFixed(0)}%`} detail="close ≥ 9 ≥ 20 + above VWAP" />
          <Metric label="Rail holds" value={String(bounceCount).padStart(2, "0")} detail="9/20 EMA tests" />
          <Metric label="VWAP reclaims" value={String(vwapReclaimCount).padStart(2, "0")} />
          <Metric label="Above 20 EMA" value={`${metrics.ema20HoldPct.toFixed(0)}%`} detail="first 15m closes" />
        </dl>
      </div>

      <div className="mt-8 border-y border-[var(--hairline)] bg-[var(--surface)] px-5 py-6">
        <div className="grid grid-cols-[110px_minmax(720px,1fr)_86px] gap-x-5 border-b border-[var(--hairline)] pb-3 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          <span>Rail</span>
          <div className="flex justify-between"><span>Alert</span><span>+15m</span><span>+30m</span></div>
          <span className="text-right">Events</span>
        </div>
        {(["ema9", "ema20", "vwap"] as RailKey[]).map((rail) => {
          const events = metrics.railEvents.filter((event) => event.rail === rail);
          return (
            <div key={rail} className="grid min-h-16 grid-cols-[110px_minmax(720px,1fr)_86px] items-center gap-x-5 border-b border-[var(--hairline)] last:border-b-0">
              <span className="font-mono text-[12px] font-semibold text-[var(--body)]">{railLabel(rail)}</span>
              <div className="relative h-8">
                <span className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />
                <span className="absolute left-1/2 top-[calc(50%-3px)] h-[7px] w-px bg-[var(--muted)]" />
                {events.map((event) => {
                  const active = event.id === selectedEvent?.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onMouseEnter={() => setSelectedEventId(event.id)}
                      onFocus={() => setSelectedEventId(event.id)}
                      onClick={() => setSelectedEventId(event.id)}
                      aria-label={`${event.label} at ${clockFromAlert(candidate.firstSeen, event.minute)}`}
                      className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-[var(--surface)] outline-none transition-transform hover:scale-125 focus-visible:scale-125"
                      style={{ left: `${(event.minute / 30) * 100}%`, borderColor: eventTone(event.kind), boxShadow: active ? `0 0 0 4px color-mix(in srgb, ${eventTone(event.kind)} 18%, transparent)` : undefined }}
                    >
                      <span className="sr-only">{event.label}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-right font-mono text-[12px] tabular-nums text-[var(--muted)]">{events.length}</span>
            </div>
          );
        })}
      </div>

      <div className="grid border-b border-[var(--hairline)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-28 px-5 py-5 lg:border-r lg:border-[var(--hairline)]">
          {selectedEvent ? (
            <>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: eventTone(selectedEvent.kind) }}>{clockFromAlert(candidate.firstSeen, selectedEvent.minute)} · {selectedEvent.label}</p>
              <p className="mt-3 text-[14px] leading-6 text-[var(--body)]">{selectedEvent.detail}</p>
            </>
          ) : <p className="text-[13px] text-[var(--muted)]">No rail interaction was detected in this 30-minute window.</p>}
        </div>
        <div className="px-5 py-5 text-[12px] leading-5 text-[var(--muted)]">
          <p><strong className="text-[var(--body)]">Next join:</strong> place entries and exits on this sequence, then compare MAE, MFE, hold time, and outcome for rail-based entries versus entries made away from support.</p>
        </div>
      </div>

      <p className="mt-3 text-[11.5px] leading-5 text-[var(--muted)]">Prototype rule: a rail test comes within 0.35%; loss/reclaim requires a close across the line. These thresholds are intentionally provisional until your playbook rules are authored.</p>
    </div>
  );
}

export default function DataVizVocabularyV6() {
  const [selectedSymbol, setSelectedSymbol] = useState("MLGO");
  const metricsBySymbol = useMemo(() => new Map(priceActionCandidates.map((candidate) => [candidate.symbol, deriveMetrics(candidate)])), []);
  const selectedCandidate = priceActionCandidates.find((candidate) => candidate.symbol === selectedSymbol) ?? priceActionCandidates[0];
  const selectedMetrics = metricsBySymbol.get(selectedCandidate.symbol)!;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-12 sm:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Preview / Data visualization / V6</p>
            <nav className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em]" aria-label="Data visualization previews">
              <Link href="/preview/data-viz" className="text-[var(--body)] hover:text-[var(--foreground)]">Index</Link>
              <Link href="/preview/data-viz/v1" className="text-[var(--muted)] hover:text-[var(--foreground)]">V1</Link>
              <Link href="/preview/data-viz/v2" className="text-[var(--muted)] hover:text-[var(--foreground)]">V2</Link>
              <Link href="/preview/data-viz/v3" className="text-[var(--muted)] hover:text-[var(--foreground)]">V3</Link>
              <Link href="/preview/data-viz/v4" className="text-[var(--muted)] hover:text-[var(--foreground)]">V4</Link>
              <Link href="/preview/data-viz/v5" className="text-[var(--muted)] hover:text-[var(--foreground)]">V5</Link>
              <span className="text-[var(--blue)]">V6</span>
              <Link href="/preview/data-viz/v7" className="text-[var(--muted)] hover:text-[var(--foreground)]">V7</Link>
            </nav>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[60px]">How did the stock move—not just how far?</h1>
              <p className="mt-6 max-w-3xl text-[15px] leading-7 text-[var(--body)]">A price-action vocabulary for top movers. It separates magnitude from path quality so a missed clean leader does not look the same as a skipped whippy runner or a stock that simply went nowhere.</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4">
              <Metric label="Movers" value="04" />
              <Metric label="Bars" value="1 min" />
              <Metric label="Studies" value="04" />
            </dl>
          </div>
        </header>

        <section className="grid gap-4 border-y border-[var(--hairline)] py-5 text-[12px] leading-5 text-[var(--muted)] md:grid-cols-3">
          <p><strong className="text-[var(--body)]">Question:</strong> did the move offer clean, repeatable entries—or only a large final percentage?</p>
          <p><strong className="text-[var(--body)]">Evidence:</strong> one-minute OHLCV, scanner time/price, HOD, VWAP, and EMA context.</p>
          <p><strong className="text-[var(--body)]">Boundary:</strong> alert rank stays prospective; path quality and HOD remain hindsight review.</p>
        </section>

        <section className="border-t border-[var(--border)] py-16">
          <StudyHeader index="01" title="Which stock moved the most—and which one moved best?" description="Two ranks stay visible. Alert rank records what the five pillars said at discovery; outcome rank records the final HOD. The remaining columns describe the path between those moments without letting hindsight rewrite the original selection decision." />
          <MoverLedger selected={selectedSymbol} metricsBySymbol={metricsBySymbol} onSelect={setSelectedSymbol} />
          <div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">Selected · {selectedCandidate.symbol} · outcome #{selectedCandidate.outcomeRank}</p>
              <p className="mt-3 max-w-3xl text-[25px] font-semibold leading-8 text-[var(--foreground)]">{selectedCandidate.symbol} reached {signedPercent(selectedCandidate.dayHodPct)}, but its path reads as <span style={{ color: readTone(selectedMetrics.read) }}>{selectedMetrics.read.toLowerCase()}</span>.</p>
              <p className="mt-3 max-w-3xl text-[13px] leading-6 text-[var(--body)]">{selectedCandidate.reviewPrompt}</p>
            </div>
            <dl className="grid grid-cols-2 gap-y-6">
              <Metric label="Alert rank" value={`#${selectedCandidate.alertRank}`} />
              <Metric label="Outcome rank" value={`#${selectedCandidate.outcomeRank}`} />
              <Metric label="First seen" value={selectedCandidate.firstSeen} />
              <Metric label="Participation" value={selectedCandidate.traded ? "Traded" : "Missed"} />
            </dl>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-16">
          <StudyHeader index="02" title="Did price continue candle over candle—or merely print a big range?" description="The one-minute anatomy keeps candles primary and technical overlays optional. A highlighted COC run requires consecutive higher highs and higher lows; wick, overlap, VWAP, and EMA behavior explain whether that run was orderly enough to trade." />
          <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">{selectedCandidate.symbol} · first 30 minutes after scanner</p>
              <p className="mt-3 text-[24px] font-semibold leading-8 text-[var(--foreground)]">Best clean sequence: {selectedMetrics.maxCocStreak} one-minute candles.</p>
            </div>
            <dl className="grid grid-cols-2 gap-y-6">
              <Metric label="Above 9 EMA" value={`${selectedMetrics.ema9HoldPct.toFixed(0)}%`} detail="first 15m closes" />
              <Metric label="Above VWAP" value={`${selectedMetrics.vwapHoldPct.toFixed(0)}%`} detail="first 15m closes" />
              <Metric label="Max pullback" value={`${selectedMetrics.maxPullbackPct.toFixed(1)}%`} />
              <Metric label="Median range" value={`${selectedMetrics.medianRangePct.toFixed(1)}%`} />
            </dl>
          </div>
          <PriceActionChart key={selectedCandidate.symbol} candidate={selectedCandidate} metrics={selectedMetrics} />
        </section>

        <section className="border-t border-[var(--border)] py-16">
          <StudyHeader index="03" title="Was the move energetic, efficient, both—or neither?" description="Range measures energy; directional efficiency measures how much of the minute-to-minute travel became actual progress. Together they distinguish clean expansion, whippy expansion, a tight grind, and low-range dead chop." />
          <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <QualityMap selected={selectedSymbol} metricsBySymbol={metricsBySymbol} onSelect={setSelectedSymbol} />
            <aside>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Coach interpretation · {selectedCandidate.symbol}</p>
              <p className="mt-4 text-[26px] font-semibold leading-8" style={{ color: readTone(selectedMetrics.read) }}>{selectedMetrics.read}</p>
              <p className="mt-4 text-[13px] leading-6 text-[var(--body)]">{selectedCandidate.reviewPrompt}</p>
              <dl className="mt-8 grid grid-cols-2 gap-y-6">
                <Metric label="Range" value={`${selectedMetrics.medianRangePct.toFixed(1)}%`} detail="median 1m candle" />
                <Metric label="Efficiency" value={`${selectedMetrics.efficiencyPct.toFixed(0)}%`} detail="progress ÷ travel" />
                <Metric label="Wick share" value={`${selectedMetrics.wickSharePct.toFixed(0)}%`} detail="of total range" />
                <Metric label="Overlap" value={`${selectedMetrics.overlapPct.toFixed(0)}%`} detail="adjacent candles" />
              </dl>
            </aside>
          </div>
        </section>

        <section className="border-t border-[var(--border)] py-16">
          <StudyHeader index="04" title="Did price respect a rail—and was your entry located at the decision point?" description="The useful question is not merely whether a 9 EMA, 20 EMA, or VWAP line was visible. This event sequence records when price tested and held a rail, closed below it, or reclaimed it—then creates a place to compare those moments with your actual entries and outcomes." />
          <RailEventStudy key={selectedCandidate.symbol} candidate={selectedCandidate} metrics={selectedMetrics} />
        </section>

        <details className="border-y border-[var(--hairline)] py-5 text-[12px] leading-6 text-[var(--muted)]">
          <summary className="cursor-pointer font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)]">Data definitions and production boundary</summary>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            <p><strong className="text-[var(--body)]">Recorded:</strong><br />One-minute open, high, low, close, volume; scanner timestamp and price; session HOD; participation and trade links.</p>
            <p><strong className="text-[var(--body)]">Derived:</strong><br />Candle range, body/wick share, adjacent overlap, directional efficiency, COC streak, pullback depth, EMA position, rail tests, losses, reclaims, and VWAP hold rate.</p>
            <p><strong className="text-[var(--body)]">Production:</strong><br />Use sufficient premarket/session history to warm the EMAs. Label the VWAP anchor explicitly; this prototype uses the 09:30 ET reset. Pattern thresholds remain provisional. Values are deterministic illustrations.</p>
          </div>
        </details>
      </div>
    </main>
  );
}
