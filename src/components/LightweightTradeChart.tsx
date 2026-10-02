"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import TradeBreathingChart from "@/components/TradeBreathingChart";
import { executionMinute } from "@/lib/candleIntegrity";
import { CHART_FOCUS_EVENT, type ChartFocusDetail } from "@/lib/chartFocusEvent";
import type { AnalyzedTradeExecution, TradeExecutionAnalysis, TradeSide } from "@/lib/executionAnalysis";
import { marketIndicatorSeries } from "@/lib/marketIndicators";
import {
  tradeCandlesDuringHold,
  tradeExcursionFromCandles,
  tradeNumberForCandleMinute,
  type TradeExcursion,
} from "@/lib/tradeExcursion";

export type TradeChartSummary = {
  tradeNumber: number;
  side?: TradeSide;
  entryAt?: number | null;
  exitAt?: number | null;
  entryPrice?: number | null;
  exitPrice?: number | null;
  executionAnalysis: TradeExecutionAnalysis;
  holdDuration: string | null;
  shares: string;
};

/** A horizontal price band drawn behind the candles (support/resistance research). */
export type ChartPriceZone = {
  /** Optional candle-time boundaries for review areas; omitted means full-width. */
  startT?: number;
  endT?: number;
  id: string;
  low: number;
  high: number;
  /** Render only the midpoint price; tolerance stays internal. */
  display?: "band" | "line";
  tone: "support" | "resistance" | "flip" | "candidate";
  label?: string;
  /** Drawn stronger, for the zone being edited. */
  emphasized?: boolean;
};

export type ChartPricePoint = { price: number; time: number | null };

export type LightweightTradeChartProps = {
  /** Optional price bands; off unless a consumer passes zones. */
  priceZones?: ChartPriceZone[];
  /** Reports the price (and candle time) under a click on the chart. */
  onPriceClick?: (point: ChartPricePoint) => void;
  /** Optional vertical drag/keyboard editing for an emphasized research band. */
  onPriceZoneChange?: (id: string, edges: { low: number; high: number }) => void;
  onPriceZoneSelect?: (id: string) => void;
  onPriceZoneRemove?: (id: string) => void;
  indicatorsEnabled?: boolean;
  volumeEnabled?: boolean;
  candles: ChartCandle[];
  markers: ChartMarker[];
  enableFullscreen?: boolean;
  fullscreenHeader?: ReactNode;
  enableTradeScopeToggle?: boolean;
  excursionsEnabled?: boolean;
  focusMinutesAfter?: number;
  focusMinutesBefore?: number;
  initialActiveTradeNumber?: number;
  initialFocusTime?: number;
  chartHeightClass?: string;
  tradeSummaries?: TradeChartSummary[];
};

type InteractiveLightweightTradeChartProps = Omit<LightweightTradeChartProps, "excursionsEnabled"> & {
  footerAction?: ReactNode;
  fillHeight?: boolean;
};

type ChartViewMode = "candles" | "mae";

const EMPTY_TRADE_SUMMARIES: TradeChartSummary[] = [];
const EMPTY_PRICE_ZONES: ChartPriceZone[] = [];
const ZONE_COLORS: Record<ChartPriceZone["tone"], string> = {
  support: "var(--green)",
  resistance: "var(--red)",
  flip: "var(--accent)",
  candidate: "var(--muted)",
};
type ZoneRect = { zone: ChartPriceZone; top: number; bottom: number; left: number; right: number };

function PriceZoneOverlays({ rects, onPriceZoneChange, onPriceZoneSelect, onPriceZoneRemove, beginZoneDrag, moveZoneDrag, endZoneDrag }: {
  rects: ZoneRect[];
  onPriceZoneSelect?: (id: string) => void;
  onPriceZoneRemove?: (id: string) => void;
  onPriceZoneChange?: LightweightTradeChartProps["onPriceZoneChange"];
  beginZoneDrag: (event: ReactPointerEvent<SVGRectElement>, zone: ChartPriceZone, edge: "low" | "high" | "move") => void;
  moveZoneDrag: (event: ReactPointerEvent<SVGRectElement>) => void;
  endZoneDrag: (event: ReactPointerEvent<SVGRectElement>) => void;
}) {
  return <>{rects.map(({ zone, top, bottom, left, right }) => {
            const color = ZONE_COLORS[zone.tone];
            const height = Math.max(2, bottom - top);
            const lineOnly = zone.display === "line";
            const y = (top + bottom) / 2;
            return (
              <g key={`zone-${zone.id}`} data-price-display={zone.display ?? "band"} aria-label={zone.label ?? (lineOnly ? `Level $${((zone.low + zone.high) / 2).toFixed(2)}` : `Price zone ${zone.low}–${zone.high}`)}>
                {lineOnly ? <>
                  <line x1={left} x2={right} y1={y} y2={y} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" strokeOpacity={zone.emphasized ? 1 : 0.6} />
                  {onPriceZoneSelect ? <line x1={left} x2={right} y1={y} y2={y} stroke="transparent" strokeWidth={12}
                    role="button" tabIndex={0} aria-label={`Select level $${((zone.low + zone.high) / 2).toFixed(2)}`}
                    className="pointer-events-auto cursor-pointer focus:outline-none focus-visible:stroke-[var(--accent)]"
                    onClick={(event) => { event.stopPropagation(); onPriceZoneSelect(zone.id); }}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPriceZoneSelect(zone.id); } }} /> : null}
                </> : <>
                <rect x={left} y={top} width={Math.max(2, right - left)} height={height} fill={color} opacity={zone.emphasized ? 0.2 : 0.09} />
                <line x1={left} x2={right} y1={top} y2={top} stroke={color} strokeDasharray="4 4" strokeOpacity={zone.emphasized ? 0.9 : 0.5} />
                <line x1={left} x2={right} y1={top + height} y2={top + height} stroke={color} strokeDasharray="4 4" strokeOpacity={zone.emphasized ? 0.9 : 0.5} />
                </>}
                {zone.label ? (
                  <text x={zone.emphasized ? Math.max(8, Math.min(left + 4, right - 220)) : Math.max(8, left + 4)} y={Math.max(12, (lineOnly ? y : top) - 7)} fill={color} fontFamily="var(--font-mono)" fontSize="10" fontWeight="600">{zone.label}</text>
                ) : null}
                {zone.emphasized && onPriceZoneChange ? (lineOnly ? ["move"] as const : ["high", "move", "low"] as const).map((edge) => (
                  <rect key={edge} role="slider" tabIndex={0}
                    aria-label={edge === "move" ? "Move selected level" : `Adjust ${edge === "low" ? "lower" : "upper"} level edge`}
                    aria-valuenow={edge === "move" ? (zone.low + zone.high) / 2 : zone[edge]}
                    aria-valuetext={`$${(edge === "move" ? (zone.low + zone.high) / 2 : zone[edge]).toFixed(2)}`}
                    aria-orientation="vertical"
                    x={Math.max(8, right - (lineOnly ? 44 : edge === "high" ? 80 : edge === "low" ? 148 : 24))} y={(edge === "high" ? top : edge === "low" ? bottom : (top + bottom) / 2) - 5}
                    width={lineOnly ? 10 : edge === "move" ? 24 : 56} height={10} rx={lineOnly ? 1 : 3} fill={lineOnly ? "var(--background)" : color} stroke={lineOnly ? color : undefined}
                    className="pointer-events-auto cursor-ns-resize touch-none focus:outline-none focus-visible:stroke-[var(--foreground)]"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => beginZoneDrag(event, zone, edge)}
                    onPointerMove={moveZoneDrag}
                    onPointerUp={endZoneDrag}
                    onPointerCancel={endZoneDrag}
                    onLostPointerCapture={endZoneDrag}
                    onKeyDown={(event) => {
                      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
                      event.preventDefault(); event.stopPropagation();
                      const delta = event.key === "ArrowUp" ? 0.01 : -0.01;
                      const low = Number((edge === "high" ? zone.low : zone.low + delta).toFixed(lineOnly ? 6 : 2));
                      const high = Number((edge === "low" ? zone.high : zone.high + delta).toFixed(lineOnly ? 6 : 2));
                      if (low > 0 && high > low) onPriceZoneChange(zone.id, { low, high });
                    }}
                  />
                )) : null}
                {lineOnly && zone.emphasized && onPriceZoneRemove ? <g role="button" tabIndex={0} aria-label="Remove selected level"
                  className="pointer-events-auto cursor-pointer focus:outline-none focus-visible:stroke-[var(--accent)]"
                  onClick={(event) => { event.stopPropagation(); onPriceZoneRemove(zone.id); }}
                  onKeyDown={(event) => { if (["Enter", " ", "Delete", "Backspace"].includes(event.key)) { event.preventDefault(); onPriceZoneRemove(zone.id); } }}>
                  <circle cx={right - 14} cy={y} r={10} fill="var(--background)" stroke={color} />
                  <path d={`M ${right - 17} ${y - 3} l 6 6 m 0 -6 l -6 6`} stroke={color} fill="none" />
                </g> : null}
              </g>
            );
  })}</>;
}

const OVERLAY_COLORS = { ema9: "#f59e0b", ema20: "#3b82f6", vwap: "#a855f7" } as const;

type MarkerPoint = {
  key: string;
  x: number;
  y: number;
  marker: ChartMarker;
};

type ChartSize = {
  width: number;
  height: number;
};

type TradeGuide = {
  badgeX: number;
  badgeY: number;
  point: MarkerPoint;
  summary: TradeChartSummary;
};

type TradeCandleOverlayGeometry = {
  bodyBottom: number;
  bodyTop: number;
  closeIsHigher: boolean;
  highY: number;
  lowY: number;
  phase: "single" | "entry" | "held" | "exit";
  x: number;
};

type TradeExcursionOverlayGeometry = {
  adverse: { x: number; y: number };
  candles: TradeCandleOverlayGeometry[];
  entry: { x: number; y: number };
  excursion: TradeExcursion;
  exit: { x: number; y: number };
  favorable: { x: number; y: number };
  labelX: number;
  summary: TradeChartSummary;
};

const chartTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatChartTime(time: unknown): string {
  if (typeof time !== "number") return String(time);

  return chartTimeFormatter.format(new Date(time * 1000));
}

type ChartColors = {
  surface: string;
  text: string;
  grid: string;
  up: string;
  down: string;
  volumeUp: string;
  volumeDown: string;
};

/**
 * Read the resolved theme tokens off <html>. Lightweight Charts renders to a
 * canvas, so it needs concrete color strings, not `var(--token)` references —
 * we re-read these whenever the theme changes and rebuild the chart.
 */
function readChartColors(): ChartColors {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  const up = token("--green-chart", "#2c9a63");
  const down = token("--red-chart", "#c4553f");
  return {
    surface: token("--surface", "#ffffff"),
    text: token("--muted", "#8a8375"),
    grid: token("--hairline", "rgba(0,0,0,0.08)"),
    up,
    down,
    volumeUp: `${up}52`,
    volumeDown: `${down}52`,
  };
}

function EmptyTradeChart({ chartHeightClass = "h-[520px]" }: { chartHeightClass?: string }) {
  return (
    <div className={`flex ${chartHeightClass} items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 text-center text-sm text-[var(--muted)]`}>
      No candle data is available for this trade yet.
    </div>
  );
}

function timeValue(epochSeconds: number): UTCTimestamp {
  return epochSeconds as UTCTimestamp;
}

function formatExecutionPrice(price: number) {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRealizedPnl(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function chartColorWithAlpha(color: string, alpha: number) {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!match) return color;
  const [, red, green, blue] = match;
  return `rgba(${Number.parseInt(red, 16)}, ${Number.parseInt(green, 16)}, ${Number.parseInt(blue, 16)}, ${alpha})`;
}

type CompactExecutionRow = AnalyzedTradeExecution | { overflowCount: number };

function compactExecutionRows(executions: AnalyzedTradeExecution[]): CompactExecutionRow[] {
  if (executions.length <= 6) return executions;
  return [
    ...executions.slice(0, 3),
    { overflowCount: executions.length - 5 },
    ...executions.slice(-2),
  ];
}

function ExecutionGlyph({
  lifecycle,
  side,
}: {
  lifecycle?: ChartMarker["executionLifecycle"];
  side: ChartMarker["side"];
}) {
  const color = side === "buy" ? "var(--green-chart)" : "var(--red-chart)";
  const boundary = lifecycle == null || lifecycle === "open" || lifecycle === "close";
  return (
    <svg aria-hidden="true" className="h-2.5 w-2.5 shrink-0" viewBox="0 0 12 12">
      {boundary ? (
        <polygon
          fill={color}
          points={side === "buy" ? "6,1 1,11 11,11" : "1,1 11,1 6,11"}
        />
      ) : (
        <circle cx="6" cy="6" fill={color} r="4" />
      )}
    </svg>
  );
}

function tradeGuidesForSummaries(
  markerPoints: MarkerPoint[],
  summaries: TradeChartSummary[],
  chartWidth: number,
): TradeGuide[] {
  const earliestPointByTrade = new Map<number, MarkerPoint>();
  for (const point of markerPoints) {
    const tradeNumber = point.marker.tradeNumber;
    if (tradeNumber == null) continue;
    const earliest = earliestPointByTrade.get(tradeNumber);
    if (!earliest || point.marker.t < earliest.marker.t) {
      earliestPointByTrade.set(tradeNumber, point);
    }
  }

  const lastBadgeXByLane: number[] = [];
  return summaries
    .flatMap((summary) => {
      const point = earliestPointByTrade.get(summary.tradeNumber);
      return point ? [{ point, summary }] : [];
    })
    .sort((left, right) => left.point.marker.t - right.point.marker.t)
    .map(({ point, summary }) => {
      const badgeX = Math.min(Math.max(15, point.x), Math.max(15, chartWidth - 15));
      let lane = lastBadgeXByLane.findIndex((lastBadgeX) => badgeX - lastBadgeX >= 34);
      if (lane === -1) lane = lastBadgeXByLane.length;
      lastBadgeXByLane[lane] = badgeX;
      return {
        badgeX,
        badgeY: 20 + lane * 30,
        point,
        summary,
      };
    });
}

function TradeExcursionOverlay({
  geometry,
}: {
  geometry: TradeExcursionOverlayGeometry;
}) {
  const { excursion } = geometry;
  const labelOnRight = geometry.labelX > (geometry.candles[0]?.x ?? 0);
  const labelOffset = labelOnRight ? 8 : -8;
  const textAnchor = labelOnRight ? "start" : "end";
  const candleXs = geometry.candles.map((candle) => candle.x);
  const firstCandleX = Math.min(...candleXs);
  const lastCandleX = Math.max(...candleXs);
  const labels = [
    {
      key: "mfe",
      point: geometry.favorable,
      text: `MFE $${formatExecutionPrice(excursion.favorablePrice)} · ${formatSignedPercent(excursion.favorablePct)}`,
      tone: "var(--green-chart)",
    },
    {
      key: "mae",
      point: geometry.adverse,
      text: `MAE $${formatExecutionPrice(excursion.adversePrice)} · ${formatSignedPercent(excursion.adversePct)}`,
      tone: "var(--red-chart)",
    },
  ];

  return (
    <g
      aria-label={`Trade ${geometry.summary.tradeNumber} MAE overlay`}
      pointerEvents="none"
      role="img"
    >
      <line
        x1={Math.max(8, firstCandleX - 34)}
        x2={lastCandleX + 34}
        y1={geometry.entry.y}
        y2={geometry.entry.y}
        stroke="var(--muted)"
        strokeDasharray="4 4"
        strokeOpacity="0.58"
      />
      <text
        x={Math.max(8, firstCandleX - 40)}
        y={geometry.entry.y - 6}
        fill="var(--muted)"
        fontFamily="var(--font-mono)"
        fontSize="10"
        fontWeight="600"
        textAnchor="end"
      >
        Entry ${formatExecutionPrice(excursion.entryPrice)}
      </text>

      {geometry.candles.map((candle) => {
        const opacity = candle.phase === "held" ? 0.76 : candle.phase === "single" ? 0.64 : 0.48;
        return (
          <g key={candle.x} opacity={opacity}>
            <line
              x1={candle.x}
              x2={candle.x}
              y1={candle.highY}
              y2={candle.lowY}
              stroke="var(--muted)"
              strokeWidth="1"
            />
            <rect
              x={candle.x - 5}
              y={candle.bodyTop}
              width="10"
              height={Math.max(2, candle.bodyBottom - candle.bodyTop)}
              fill={candle.closeIsHigher ? "var(--green-chart)" : "var(--red-chart)"}
              stroke="var(--surface)"
              strokeWidth="1"
            />
          </g>
        );
      })}

      <circle cx={geometry.favorable.x} cy={geometry.favorable.y} fill="var(--green-chart)" r="4.5" />
      <circle cx={geometry.adverse.x} cy={geometry.adverse.y} fill="var(--red-chart)" r="4.5" />
      <rect
        x={geometry.exit.x - 5}
        y={geometry.exit.y - 5}
        width="10"
        height="10"
        fill={excursion.realizedPct >= 0 ? "var(--green-chart)" : "var(--red-chart)"}
        stroke="var(--surface)"
        strokeWidth="2"
        transform={`rotate(45 ${geometry.exit.x} ${geometry.exit.y})`}
      />

      {labels.map((label) => (
        <g key={label.key}>
          <line
            x1={label.point.x}
            x2={geometry.labelX}
            y1={label.point.y}
            y2={label.point.y}
            stroke="var(--muted)"
            strokeOpacity="0.65"
          />
          <text
            x={geometry.labelX + labelOffset}
            y={label.point.y + 3.5}
            fill={label.tone}
            fontFamily="var(--font-mono)"
            fontSize="10"
            fontWeight="600"
            textAnchor={textAnchor}
          >
            {label.text}
          </text>
        </g>
      ))}
    </g>
  );
}

function candlePriceFormat(candles: ChartCandle[]) {
  const lowestPositivePrice = candles.reduce((lowest, candle) => {
    const candidate = Math.min(candle.o, candle.h, candle.l, candle.c);
    return candidate > 0 ? Math.min(lowest, candidate) : lowest;
  }, Infinity);
  const precision = lowestPositivePrice < 1 ? 4 : 2;

  return {
    type: "price" as const,
    precision,
    minMove: 10 ** -precision,
  };
}

function InteractiveLightweightTradeChart({
  candles,
  indicatorsEnabled = true,
  volumeEnabled = true,
  focusMinutesAfter = 70,
  focusMinutesBefore = 20,
  initialActiveTradeNumber,
  markers,
  initialFocusTime,
  tradeSummaries = EMPTY_TRADE_SUMMARIES,
  chartHeightClass = "h-[520px]",
  footerAction,
  fillHeight = false,
  priceZones = EMPTY_PRICE_ZONES,
  onPriceClick,
  onPriceZoneChange,
  onPriceZoneSelect,
  onPriceZoneRemove,
}: InteractiveLightweightTradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Review overlays change without rebuilding the chart or resetting its viewport.
  const zonesRef = useRef(priceZones);
  const markersRef = useRef(markers);
  const syncMarkerTimesRef = useRef<(() => void) | null>(null);
  const priceClickRef = useRef(onPriceClick);
  const zoneDragRef = useRef<{ id: string; edge: "low" | "high" | "move"; price: number; low: number; high: number; lineOnly: boolean } | null>(null);
  const scheduleOverlayRef = useRef<(() => void) | null>(null);
  const [zoneRects, setZoneRects] = useState<ZoneRect[]>([]);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rafRef = useRef<number | null>(null);
  const preferredTradeNumberRef = useRef<number | null>(null);
  const tradeSummariesRef = useRef(tradeSummaries);
  const [markerPoints, setMarkerPoints] = useState<MarkerPoint[]>([]);
  const [chartSize, setChartSize] = useState<ChartSize>({ width: 0, height: 520 });
  const [tradeOverlay, setTradeOverlay] = useState<TradeExcursionOverlayGeometry | null>(null);
  const [maeTradeNumber, setMaeTradeNumber] = useState<number | null>(null);
  const [hoveredTradeNumber, setHoveredTradeNumber] = useState<number | null>(null);
  const [selectedTradeNumber, setSelectedTradeNumber] = useState<number | null>(
    initialActiveTradeNumber ?? null,
  );
  const [themeKey, setThemeKey] = useState(0);
  const activeTradeNumber = hoveredTradeNumber ?? selectedTradeNumber;
  function beginZoneDrag(event: ReactPointerEvent<SVGRectElement>, zone: ChartPriceZone, edge: "low" | "high" | "move") {
    event.preventDefault(); event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const p = rect ? candleSeriesRef.current?.coordinateToPrice(event.clientY - rect.top) : null;
    if (p == null) return;
    zoneDragRef.current = { id: zone.id, edge, price: p, low: zone.low, high: zone.high, lineOnly: zone.display === "line" };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveZoneDrag(event: ReactPointerEvent<SVGRectElement>) {
    const drag = zoneDragRef.current;
    if (!drag || !onPriceZoneChange) return;
    event.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const p = rect ? candleSeriesRef.current?.coordinateToPrice(event.clientY - rect.top) : null;
    if (p == null) return;
    const delta = drag.lineOnly ? Math.round(((drag.low + drag.high) / 2 + p - drag.price) * 100) / 100 - (drag.low + drag.high) / 2 : p - drag.price;
    const low = Number((drag.edge === "high" ? drag.low : drag.low + delta).toFixed(drag.lineOnly ? 6 : 2));
    const high = Number((drag.edge === "low" ? drag.high : drag.high + delta).toFixed(drag.lineOnly ? 6 : 2));
    if (low > 0 && high > low) onPriceZoneChange(drag.id, { low, high });
  }
  function endZoneDrag(event: ReactPointerEvent<SVGRectElement>) {
    event.stopPropagation(); zoneDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const tradeGuides = tradeGuidesForSummaries(markerPoints, tradeSummaries, chartSize.width);
  const activeTradeGuide = activeTradeNumber == null
    ? undefined
    : tradeGuides.find((guide) => guide.summary.tradeNumber === activeTradeNumber);
  const chartCoordinateKey = markerPoints
    .map((point) => `${point.x.toFixed(1)}:${point.y.toFixed(1)}`)
    .join("|");
  const activeTradeCardId = activeTradeNumber == null ? undefined : `trade-${activeTradeNumber}-summary`;
  const tradeTooltipWidth = 236;
  const tradeTooltipLeft = activeTradeGuide == null
    ? 8
    : (() => {
        const badgeRadius = 14;
        const tooltipGap = 6;
        const rightPlacement = activeTradeGuide.badgeX + badgeRadius + tooltipGap;
        if (rightPlacement + tradeTooltipWidth <= chartSize.width - 8) return rightPlacement;
        return Math.max(
          8,
          activeTradeGuide.badgeX - badgeRadius - tooltipGap - tradeTooltipWidth,
        );
      })();
  useEffect(() => {
    preferredTradeNumberRef.current = selectedTradeNumber;
  }, [selectedTradeNumber]);

  useEffect(() => {
    zonesRef.current = priceZones;
    scheduleOverlayRef.current?.();
  }, [priceZones]);

  useEffect(() => {
    markersRef.current = markers;
    syncMarkerTimesRef.current?.();
    scheduleOverlayRef.current?.();
  }, [markers]);

  useEffect(() => {
    priceClickRef.current = onPriceClick;
  }, [onPriceClick]);

  useEffect(() => {
    tradeSummariesRef.current = tradeSummaries;
  }, [tradeSummaries]);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      hoveredTradeNumber == null
      && selectedTradeNumber == null
      && maeTradeNumber == null
    ) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setHoveredTradeNumber(null);
      setMaeTradeNumber(null);
      setSelectedTradeNumber(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [hoveredTradeNumber, maeTradeNumber, selectedTradeNumber]);

  const candleData = useMemo<CandlestickData[]>(
    () =>
      candles.map((candle) => ({
        time: timeValue(candle.t),
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
      })),
    [candles],
  );
  const indicatorData = useMemo(() => {
    const series = marketIndicatorSeries(indicatorsEnabled ? candles : []);
    const toLineData = (points: typeof series.ema9): LineData[] => points.map((point) => ({
      time: timeValue(point.t),
      value: point.value,
    }));
    return {
      ema9: toLineData(series.ema9),
      ema20: toLineData(series.ema20),
      vwap: toLineData(series.vwap),
    };
  }, [candles, indicatorsEnabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const colors = readChartColors();
    const volumeData: HistogramData[] = (volumeEnabled ? candles : []).map((candle) => ({
      time: timeValue(candle.t),
      value: candle.vol,
      color: candle.c >= candle.o ? colors.volumeUp : colors.volumeDown,
    }));

    const chart = createChart(container, {
      autoSize: true,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: colors.surface },
        textColor: colors.text,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        attributionLogo: false,
      },
      grid: {
        horzLines: { color: colors.grid, style: 2 },
        vertLines: { color: colors.grid, style: 0 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { color: colors.text, labelBackgroundColor: colors.surface },
        vertLine: { color: colors.text, labelBackgroundColor: colors.surface },
      },
      rightPriceScale: {
        borderVisible: false,
        minimumWidth: 56,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
        barSpacing: 14,
        tickMarkFormatter: formatChartTime,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
      localization: {
        timeFormatter: formatChartTime,
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.up,
      downColor: colors.down,
      wickUpColor: colors.up,
      wickDownColor: colors.down,
      borderVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: candlePriceFormat(candles),
    });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "volume" },
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Preserve broker time even when the market-data cache has a gap. These
    // whitespace points extend the time scale without inventing OHLC data, so
    // an execution can render at its real minute beside a visibly blank chart
    // section instead of being relocated to a price-matching candle.
    const executionTimeSeries = chart.addSeries(LineSeries, {
      color: "transparent",
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      visible: false,
    });
    const chartMinutes = new Set(candles.map((candle) => candle.t));
    const executionMinutes = new Set<number>();
    let firstChartTime = candles[0]?.t ?? Number.POSITIVE_INFINITY;
    let lastChartTime = candles.at(-1)?.t ?? Number.NEGATIVE_INFINITY;
    const syncMarkerTimes = () => {
      let addedTime = false;
      for (const marker of markersRef.current) {
        if (!Number.isFinite(marker.t)) continue;
        const minute = executionMinute(marker.t);
        if (chartMinutes.has(minute) || executionMinutes.has(minute)) continue;
        executionMinutes.add(minute);
        firstChartTime = Math.min(firstChartTime, minute);
        lastChartTime = Math.max(lastChartTime, minute);
        addedTime = true;
      }
      if (!addedTime) return;
      // Keep gap timestamps for this chart's lifetime: deselecting a marker must
      // not shrink the time scale. New out-of-cache executions retain real time.
      const visibleRange = chart.timeScale().getVisibleRange();
      const points: WhitespaceData[] = [...executionMinutes]
        .sort((left, right) => left - right)
        .map((time) => ({ time: timeValue(time) }));
      executionTimeSeries.setData(points);
      if (visibleRange) chart.timeScale().setVisibleRange(visibleRange);
    };
    syncMarkerTimesRef.current = syncMarkerTimes;
    syncMarkerTimes();

    const handleCandleHover = (param: MouseEventParams<Time>) => {
      if (param.point == null || typeof param.time !== "number") {
        setMaeTradeNumber(null);
        return;
      }

      const candleMinute = Number(param.time);
      const candle = candles.find((candidate) => candidate.t === candleMinute);
      if (!candle) {
        setMaeTradeNumber(null);
        return;
      }
      const highY = candleSeries.priceToCoordinate(candle.h);
      const lowY = candleSeries.priceToCoordinate(candle.l);
      if (
        highY == null
        || lowY == null
        || param.point.y < Math.min(highY, lowY) - 10
        || param.point.y > Math.max(highY, lowY) + 10
      ) {
        setMaeTradeNumber(null);
        return;
      }

      const nextTradeNumber = tradeNumberForCandleMinute(
        tradeSummariesRef.current,
        candleMinute,
        preferredTradeNumberRef.current,
      );
      setMaeTradeNumber((current) => current === nextTradeNumber ? current : nextTradeNumber);
    };
    chart.subscribeCrosshairMove(handleCandleHover);

    // Indicator overlays the review vocabulary leans on (EMA rail, VWAP).
    const overlayOptions = {
      lineWidth: 1 as const,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    };
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.ema9 })
      .setData(indicatorData.ema9);
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.ema20 })
      .setData(indicatorData.ema20);
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.vwap, lineStyle: LineStyle.Dashed })
      .setData(indicatorData.vwap);

    const updateMarkerPoints = () => {
      const rect = container.getBoundingClientRect();
      const plotWidth = chart.timeScale().width();
      setChartSize({ width: plotWidth, height: rect.height });

      const nextMarkers = markersRef.current.flatMap((marker, index) => {
        const candleTime = timeValue(executionMinute(marker.t));
        const x = chart.timeScale().timeToCoordinate(candleTime);
        const y = candleSeries.priceToCoordinate(marker.price);
        if (x == null || y == null || x < 0 || x > plotWidth) return [];
        return [{
          key: marker.id == null ? `${marker.side}-${marker.t}-${marker.price}-${index}` : `execution-${marker.id}`,
          x,
          y,
          marker,
        }];
      });
      setMarkerPoints(nextMarkers);

      const nextZones = zonesRef.current.flatMap((zone) => {
        const top = candleSeries.priceToCoordinate(Math.max(zone.low, zone.high));
        const bottom = candleSeries.priceToCoordinate(Math.min(zone.low, zone.high));
        const left = zone.startT == null ? 0 : chart.timeScale().timeToCoordinate(zone.startT as UTCTimestamp);
        const right = zone.endT == null ? container.clientWidth : chart.timeScale().timeToCoordinate(zone.endT as UTCTimestamp);
        if (top == null || bottom == null || left == null || right == null) return [];
        if (zone.display === "line") {
          if (right < 0 || left > plotWidth) return [];
          // Anchor editing controls to the visible segment while zoomed/panned.
          return [{ zone, top, bottom, left: Math.max(0, left), right: Math.min(plotWidth, right) }];
        }
        return [{ zone, top, bottom, left, right }];
      });
      setZoneRects(nextZones);
    };

    const scheduleMarkerUpdate = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateMarkerPoints();
      });
    };

    scheduleOverlayRef.current = scheduleMarkerUpdate;
    const handleVisibleRangeChange = () => scheduleMarkerUpdate();
    const handleSizeChange = () => scheduleMarkerUpdate();
    // Use pointer taps for optional research editing. The library deliberately drops
    // the second of two fast clicks at different coordinates as a non-double-click.
    let tapStart: { x: number; y: number } | null = null;
    const handleTapStart = (event: PointerEvent) => {
      tapStart = event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
    };
    const cancelTap = () => { tapStart = null; };
    const handleTapEnd = (event: PointerEvent) => {
      const start = tapStart; tapStart = null;
      if (!start || !priceClickRef.current || Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y) > 4) return;
      const bounds = container.getBoundingClientRect();
      const price = candleSeries.coordinateToPrice(event.clientY - bounds.top);
      const time = chart.timeScale().coordinateToTime(event.clientX - bounds.left);
      if (price == null || !Number.isFinite(price)) return;
      priceClickRef.current({ price, time: typeof time === "number" ? Number(time) : null });
    };
    container.addEventListener("pointerdown", handleTapStart);
    container.addEventListener("pointerup", handleTapEnd);
    container.addEventListener("pointercancel", cancelTap);

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    chart.timeScale().subscribeSizeChange(handleSizeChange);
    container.addEventListener("pointermove", scheduleMarkerUpdate);
    container.addEventListener("pointerup", scheduleMarkerUpdate);
    container.addEventListener("wheel", scheduleMarkerUpdate, { passive: true });
    window.addEventListener("resize", scheduleMarkerUpdate);

    if (initialFocusTime != null) {
      const focusedFrom = !Number.isFinite(firstChartTime)
        ? initialFocusTime - focusMinutesBefore * 60
        : Math.max(firstChartTime, initialFocusTime - focusMinutesBefore * 60);
      const focusedTo = !Number.isFinite(lastChartTime)
        ? initialFocusTime + focusMinutesAfter * 60
        : Math.min(lastChartTime, initialFocusTime + focusMinutesAfter * 60);

      if (focusedFrom < focusedTo) {
        chart.timeScale().setVisibleRange({
          from: timeValue(focusedFrom),
          to: timeValue(focusedTo),
        });
      } else {
        chart.timeScale().fitContent();
      }
    } else {
      chart.timeScale().fitContent();
    }
    scheduleMarkerUpdate();

    // Other review components (the trade ledger) can scroll the chart to a
    // moment — e.g. clicking a late-day trade that sits outside the window.
    const handleFocusRequest = (event: Event) => {
      const detail = (event as CustomEvent<ChartFocusDetail>).detail;
      const time = detail?.time;
      if (time == null || !Number.isFinite(time)) return;
      if (detail.tradeNumber != null && Number.isFinite(detail.tradeNumber)) {
        setHoveredTradeNumber(null);
        setSelectedTradeNumber(detail.tradeNumber);
      }
      const from = !Number.isFinite(firstChartTime)
        ? time - focusMinutesBefore * 60
        : Math.max(firstChartTime, time - focusMinutesBefore * 60);
      const to = !Number.isFinite(lastChartTime)
        ? time + focusMinutesAfter * 60
        : Math.min(lastChartTime, time + focusMinutesAfter * 60);
      if (from < to) {
        chart.timeScale().setVisibleRange({ from: timeValue(from), to: timeValue(to) });
        scheduleMarkerUpdate();
      }
    };
    window.addEventListener(CHART_FOCUS_EVENT, handleFocusRequest);

    return () => {
      window.removeEventListener(CHART_FOCUS_EVENT, handleFocusRequest);
      container.removeEventListener("pointerdown", handleTapStart);
      container.removeEventListener("pointerup", handleTapEnd);
      container.removeEventListener("pointercancel", cancelTap);
      scheduleOverlayRef.current = null;
      syncMarkerTimesRef.current = null;
      setZoneRects([]);
      chart.unsubscribeCrosshairMove(handleCandleHover);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
      chart.timeScale().unsubscribeSizeChange(handleSizeChange);
      container.removeEventListener("pointermove", scheduleMarkerUpdate);
      container.removeEventListener("pointerup", scheduleMarkerUpdate);
      container.removeEventListener("wheel", scheduleMarkerUpdate);
      window.removeEventListener("resize", scheduleMarkerUpdate);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      setHoveredTradeNumber(null);
      setMaeTradeNumber(null);
      setSelectedTradeNumber(null);
      setMarkerPoints([]);
      setTradeOverlay(null);
    };
  }, [candleData, candles, focusMinutesAfter, focusMinutesBefore, indicatorData, initialFocusTime, themeKey, volumeEnabled]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    if (!chart || !candleSeries) return;

    const colors = readChartColors();
    const restoreCandles = () => {
      chart.applyOptions({
        crosshair: {
          horzLine: { labelVisible: true, visible: true },
          vertLine: { labelVisible: true, visible: true },
        },
      });
      candleSeries.applyOptions({
        upColor: colors.up,
        downColor: colors.down,
        wickUpColor: colors.up,
        wickDownColor: colors.down,
      });
      candleSeries.setData(candleData);
      setTradeOverlay(null);
    };
    const summary = maeTradeNumber == null
      ? undefined
      : tradeSummaries.find((trade) => trade.tradeNumber === maeTradeNumber);
    if (
      summary?.side == null
      || summary.entryAt == null
      || summary.exitAt == null
      || summary.entryPrice == null
      || summary.exitPrice == null
    ) {
      restoreCandles();
      return;
    }

    const tradeWindow = {
      side: summary.side,
      entryAt: summary.entryAt,
      exitAt: summary.exitAt,
      entryPrice: summary.entryPrice,
      exitPrice: summary.exitPrice,
    };
    const excursion = tradeExcursionFromCandles(candles, tradeWindow);
    const heldCandles = tradeCandlesDuringHold(candles, tradeWindow);
    if (!excursion || heldCandles.length === 0) {
      restoreCandles();
      return;
    }

    const transparent = "rgba(0, 0, 0, 0)";
    const heldMinutes = new Set(heldCandles.map((candle) => candle.startedAt));
    chart.applyOptions({
      crosshair: {
        horzLine: { labelVisible: false, visible: false },
        vertLine: { labelVisible: false, visible: false },
      },
    });
    candleSeries.applyOptions({
      upColor: chartColorWithAlpha(colors.up, 0.2),
      downColor: chartColorWithAlpha(colors.down, 0.2),
      wickUpColor: chartColorWithAlpha(colors.up, 0.2),
      wickDownColor: chartColorWithAlpha(colors.down, 0.2),
    });
    candleSeries.setData(candleData.map((datum, index) => (
      heldMinutes.has(candles[index]?.t ?? Number.NaN)
        ? {
            ...datum,
            borderColor: transparent,
            color: transparent,
            wickColor: transparent,
          }
        : datum
    )));

    const xForTime = (epochSeconds: number) => chart.timeScale().timeToCoordinate(
      timeValue(Math.floor(epochSeconds / 60) * 60),
    );
    const pointFor = (epochSeconds: number, price: number) => {
      const x = xForTime(epochSeconds);
      const y = candleSeries.priceToCoordinate(price);
      return x == null || y == null ? null : { x, y };
    };
    const entry = pointFor(excursion.entryAt, excursion.entryPrice);
    const exit = pointFor(excursion.exitAt, excursion.exitPrice);
    const favorable = pointFor(excursion.favorableAt, excursion.favorablePrice);
    const adverse = pointFor(excursion.adverseAt, excursion.adversePrice);
    const overlayCandles = heldCandles.flatMap((candle) => {
      const x = xForTime(candle.startedAt);
      const openY = candleSeries.priceToCoordinate(candle.openPrice);
      const closeY = candleSeries.priceToCoordinate(candle.closePrice);
      const firstExtremeY = candleSeries.priceToCoordinate(candle.maximumPrice);
      const secondExtremeY = candleSeries.priceToCoordinate(candle.minimumPrice);
      if (
        x == null
        || openY == null
        || closeY == null
        || firstExtremeY == null
        || secondExtremeY == null
      ) {
        return [];
      }
      return [{
        bodyBottom: Math.max(openY, closeY),
        bodyTop: Math.min(openY, closeY),
        closeIsHigher: candle.closePrice >= candle.openPrice,
        highY: Math.min(firstExtremeY, secondExtremeY),
        lowY: Math.max(firstExtremeY, secondExtremeY),
        phase: candle.phase,
        x,
      } satisfies TradeCandleOverlayGeometry];
    });

    if (!entry || !exit || !favorable || !adverse || overlayCandles.length !== heldCandles.length) {
      restoreCandles();
      return;
    }

    const firstCandleX = Math.min(...overlayCandles.map((candle) => candle.x));
    const lastCandleX = Math.max(...overlayCandles.map((candle) => candle.x));
    const labelX = chartSize.width - lastCandleX >= 210
      ? lastCandleX + 54
      : Math.max(160, firstCandleX - 54);
    setTradeOverlay({
      adverse,
      candles: overlayCandles,
      entry,
      excursion,
      exit,
      favorable,
      labelX,
      summary,
    });
  }, [candleData, candles, chartCoordinateKey, chartSize.width, maeTradeNumber, themeKey, tradeSummaries]);

  return (
    <div className={`${fillHeight ? "flex h-full min-h-0 flex-col " : ""}overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]`}>
      <div
        className={`relative w-full ${fillHeight ? "min-h-0 flex-1" : chartHeightClass}`}
        onPointerDown={() => {
          setHoveredTradeNumber(null);
          setSelectedTradeNumber(null);
        }}
      >
        <div ref={containerRef} className="relative z-0 h-full w-full" />
        {candles.length > 0 && indicatorsEnabled ? (
          <div className="pointer-events-none absolute left-3 top-2 z-10 flex gap-3 font-mono text-[10px] font-semibold">
            <span style={{ color: OVERLAY_COLORS.ema9 }}>9 EMA</span>
            <span style={{ color: OVERLAY_COLORS.ema20 }}>20 EMA</span>
            <span style={{ color: OVERLAY_COLORS.vwap }}>VWAP</span>
          </div>
        ) : null}
        <svg
          aria-label="Trade executions"
          role="group"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden"
          height={chartSize.height}
          viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
          width={chartSize.width}
        >
          <PriceZoneOverlays rects={zoneRects} onPriceZoneChange={onPriceZoneChange} onPriceZoneSelect={onPriceZoneSelect} onPriceZoneRemove={onPriceZoneRemove}
            beginZoneDrag={beginZoneDrag} moveZoneDrag={moveZoneDrag} endZoneDrag={endZoneDrag} />
          {tradeOverlay ? <TradeExcursionOverlay geometry={tradeOverlay} /> : null}
          {tradeGuides.map((guide) => {
            const tradeNumber = guide.summary.tradeNumber;
            const cardOpen = activeTradeNumber === tradeNumber;
            const cardId = `trade-${tradeNumber}-summary`;

            return (
              <g key={`trade-guide-${tradeNumber}`}>
                <line
                  x1={guide.point.x}
                  x2={guide.point.x}
                  y1={guide.badgeY + 15}
                  y2={Math.max(guide.badgeY + 18, chartSize.height - 30)}
                  stroke="var(--blue)"
                  strokeDasharray="3 4"
                  strokeLinecap="round"
                  strokeOpacity={tradeOverlay == null ? 0.72 : 0}
                  strokeWidth="1.5"
                />
                <circle
                  aria-describedby={cardOpen && tradeOverlay == null ? cardId : undefined}
                  aria-label={`Trade ${tradeNumber} execution summary`}
                  aria-pressed={selectedTradeNumber === tradeNumber}
                  className="pointer-events-auto cursor-pointer focus:outline-none focus-visible:stroke-[var(--foreground)]"
                  cx={guide.badgeX}
                  cy={guide.badgeY}
                  fill={tradeOverlay == null ? "var(--blue)" : "transparent"}
                  onBlur={() => setHoveredTradeNumber((current) => current === tradeNumber ? null : current)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedTradeNumber((current) => current === tradeNumber ? null : tradeNumber);
                  }}
                  onFocus={() => {
                    setSelectedTradeNumber(tradeNumber);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setSelectedTradeNumber(tradeNumber);
                  }}
                  onMouseEnter={() => {
                    setHoveredTradeNumber(tradeNumber);
                  }}
                  onMouseLeave={() => setHoveredTradeNumber((current) => current === tradeNumber ? null : current)}
                  onPointerDown={(event) => event.stopPropagation()}
                  r={cardOpen ? 14 : 13}
                  role="button"
                  stroke={tradeOverlay == null ? "var(--surface)" : "transparent"}
                  strokeWidth="2"
                  tabIndex={0}
                />
                <text
                  x={guide.badgeX}
                  y={guide.badgeY + 3.5}
                  fill="var(--action-foreground)"
                  fontFamily="var(--font-mono)"
                  fontSize="10"
                  fontWeight="700"
                  opacity={tradeOverlay == null ? 1 : 0}
                  pointerEvents="none"
                  textAnchor="middle"
                >
                  T{tradeNumber}
                </text>
              </g>
            );
          })}
          {markerPoints.map((marker, index) => {
            const s = 5;
            const buy = marker.marker.side === "buy";
            const boundary = marker.marker.executionLifecycle == null
              || marker.marker.executionLifecycle === "open"
              || marker.marker.executionLifecycle === "close";
            const points = buy
              ? `${marker.x},${marker.y - 1} ${marker.x - s},${marker.y + 7} ${marker.x + s},${marker.y + 7}`
              : `${marker.x},${marker.y + 1} ${marker.x - s},${marker.y - 7} ${marker.x + s},${marker.y - 7}`;

            return (
              <g key={`${marker.key}-${index}`}>
                {boundary ? (
                  <polygon
                    points={points}
                    fill={buy ? "var(--execution-buy)" : "var(--execution-sell)"}
                    opacity={tradeOverlay == null ? 1 : 0}
                    stroke="var(--surface)"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                  />
                ) : (
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    fill={buy ? "var(--execution-buy)" : "var(--execution-sell)"}
                    opacity={tradeOverlay == null ? 1 : 0}
                    r={4.5}
                    stroke="var(--surface)"
                    strokeWidth={1.2}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {activeTradeGuide && activeTradeCardId && tradeOverlay == null ? (
          <div
            id={activeTradeCardId}
            role="tooltip"
            className="pointer-events-none absolute z-20 w-[236px] max-w-[calc(100%-16px)] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-xl"
            style={chartSize.width < 560
              ? { bottom: 36, left: 8 }
              : { left: tradeTooltipLeft, top: activeTradeGuide.badgeY - 14 }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="shrink-0 text-[12px] font-semibold text-[var(--foreground)]">
                Trade {activeTradeGuide.summary.tradeNumber}
              </div>
              <div className="flex shrink-0 items-baseline gap-1.5 font-mono text-[11px] tabular-nums text-[var(--muted)]">
                <span>{activeTradeGuide.summary.shares} shares</span>
                <span aria-hidden="true">·</span>
                <span>{activeTradeGuide.summary.holdDuration ?? "Open"}</span>
              </div>
            </div>
            <div className="mt-2.5 space-y-1.5 border-t border-[var(--hairline)] pt-2.5 font-mono text-[11px] tabular-nums">
              {compactExecutionRows(activeTradeGuide.summary.executionAnalysis.executions).map((row, index) => (
                "overflowCount" in row ? (
                  <div key={`overflow-${row.overflowCount}`} className="pl-[18px] text-[10px] text-[var(--muted)]">
                    +{row.overflowCount} intermediate executions
                  </div>
                ) : (
                  <div
                    key={row.id ?? `${row.side}-${row.executedAt}-${index}`}
                    className="grid grid-cols-[12px_30px_minmax(20px,1fr)_auto_50px] items-center gap-x-1"
                  >
                    <ExecutionGlyph lifecycle={row.lifecycle} side={row.side} />
                    <span className={`font-semibold ${row.side === "buy" ? "text-[var(--green-chart)]" : "text-[var(--red-chart)]"}`}>
                      {row.side === "buy" ? "Buy" : "Sell"}
                    </span>
                    <span className="text-[var(--body)]">{row.quantity.toLocaleString("en-US")}</span>
                    <span
                      className={`text-right ${
                        row.realizedPnl == null
                          ? ""
                          : row.realizedPnl > 0
                            ? "text-[var(--green)]"
                            : row.realizedPnl < 0
                              ? "text-[var(--red)]"
                              : "text-[var(--muted)]"
                      }`}
                    >
                      {row.realizedPnl == null ? null : formatRealizedPnl(row.realizedPnl)}
                    </span>
                    <span className="text-right font-semibold text-[var(--foreground)]">
                      ${formatExecutionPrice(row.price)}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--hairline)] px-4 py-3 text-[12px] text-[var(--muted)]">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-[var(--muted)]/70 hover:text-[var(--muted)]"
        >
          Charts by TradingView
        </a>
        {footerAction}
      </div>
    </div>
  );
}

function ChartViewToggle({
  mode,
  onChange,
}: {
  mode: ChartViewMode;
  onChange: (mode: ChartViewMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart view"
      className="inline-flex rounded-[6px] bg-[var(--background)] p-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
    >
      {(["candles", "mae"] as const).map((option) => {
        const active = mode === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            className={`h-7 rounded-[4px] px-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${active ? "bg-[var(--surface-2)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--body)]"}`}
          >
            {option === "candles" ? "Candles" : "MAE"}
          </button>
        );
      })}
    </div>
  );
}

export default function LightweightTradeChart(props: LightweightTradeChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenDialogRef = useRef<HTMLDialogElement>(null);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const fullscreenOpen = props.enableFullscreen === true && isFullscreen && props.candles.length > 0;
  const [viewMode, setViewMode] = useState<ChartViewMode>("candles");
  const breathingAvailable = props.excursionsEnabled === true
    && (props.tradeSummaries?.some((summary) => (
      summary.side != null
      && summary.entryAt != null
      && summary.exitAt != null
      && summary.entryPrice != null
      && summary.exitPrice != null
    )) ?? false);
  const activeViewMode: ChartViewMode = breathingAvailable ? viewMode : "candles";

  useEffect(() => {
    if (!fullscreenOpen) return undefined;
    const dialog = fullscreenDialogRef.current;
    if (!dialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";

    // Switching chart views may replace the inline Expand button.
    const restoreExpandFocus = () => expandButtonRef.current?.focus({ preventScroll: true });

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      restoreExpandFocus();
    };
  }, [fullscreenOpen]);

  if (props.candles.length === 0) return <EmptyTradeChart chartHeightClass={props.chartHeightClass} />;

  const footerAction = (
    <div className="flex items-center gap-2">
      {breathingAvailable ? <ChartViewToggle mode={activeViewMode} onChange={setViewMode} /> : null}
      {props.enableFullscreen ? (
        <button
          type="button"
          ref={expandButtonRef}
          aria-label="Expand chart"
          title="Expand chart"
          onClick={() => setIsFullscreen(true)}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--muted)]/70 transition hover:bg-[var(--background)]/40 hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <span aria-hidden="true" className="relative h-4 w-4">
            <span className="absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2 border-current" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 border-r-2 border-t-2 border-current" />
          </span>
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      {activeViewMode === "mae" ? (
        <TradeBreathingChart
          allowAllTrades={props.enableTradeScopeToggle}
          candles={props.candles}
          chartHeightClass={props.chartHeightClass}
          footerAction={footerAction}
          initialActiveTradeNumber={props.initialActiveTradeNumber}
          tradeSummaries={props.tradeSummaries ?? EMPTY_TRADE_SUMMARIES}
        />
      ) : (
        <InteractiveLightweightTradeChart {...props} footerAction={footerAction} />
      )}

      {fullscreenOpen ? createPortal(
        <dialog
          ref={fullscreenDialogRef}
          aria-label="Expanded chart"
          onCancel={() => setIsFullscreen(false)}
          onClose={() => setIsFullscreen(false)}
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-[var(--background)] px-4 py-4 text-[var(--foreground)] sm:px-6"
        >
          <div className="flex h-full w-full flex-col">
            <div className="mb-3 flex shrink-0 items-start justify-end gap-4">
              {props.fullscreenHeader}
              <button
                type="button"
                aria-label="Close expanded chart"
                onClick={() => setIsFullscreen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-[var(--border)] font-mono text-[16px] text-[var(--foreground)] transition hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                X
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {activeViewMode === "mae" ? (
                <TradeBreathingChart
                  allowAllTrades={props.enableTradeScopeToggle}
                  candles={props.candles}
                  fillHeight
                  footerAction={<ChartViewToggle mode={activeViewMode} onChange={setViewMode} />}
                  initialActiveTradeNumber={props.initialActiveTradeNumber}
                  tradeSummaries={props.tradeSummaries ?? EMPTY_TRADE_SUMMARIES}
                />
              ) : (
                <InteractiveLightweightTradeChart
                  {...props}
                  fillHeight
                  footerAction={breathingAvailable ? <ChartViewToggle mode={activeViewMode} onChange={setViewMode} /> : undefined}
                />
              )}
            </div>
          </div>
        </dialog>,
        document.body,
      ) : null}
    </>
  );
}
