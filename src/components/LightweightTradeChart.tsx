"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
} from "lightweight-charts";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import TradeBreathingChart from "@/components/TradeBreathingChart";
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

type LightweightTradeChartProps = {
  candles: ChartCandle[];
  markers: ChartMarker[];
  enableFullscreen?: boolean;
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
};

type ChartViewMode = "candles" | "mae";

const EMPTY_TRADE_SUMMARIES: TradeChartSummary[] = [];

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

function priceDistanceFromCandle(candle: ChartCandle, price: number): number {
  if (price >= candle.l && price <= candle.h) return 0;
  return Math.min(Math.abs(price - candle.l), Math.abs(price - candle.h));
}

function candleTimeForExecution(
  candles: ChartCandle[],
  marker: Pick<ChartMarker, "t" | "price">,
): UTCTimestamp {
  if (candles.length === 0) return timeValue(Math.floor(marker.t / 60) * 60);

  const minuteStart = Math.floor(marker.t / 60) * 60;
  const exactMinute = candles.find((candle) => candle.t === minuteStart);
  if (exactMinute && (!Number.isFinite(marker.price) || priceDistanceFromCandle(exactMinute, marker.price) === 0)) {
    return timeValue(exactMinute.t);
  }

  if (Number.isFinite(marker.price)) {
    const nearbyContainingCandle = candles
      .filter((candle) => Math.abs(candle.t - marker.t) <= 3 * 60 && priceDistanceFromCandle(candle, marker.price) === 0)
      .reduce<ChartCandle | null>((nearest, candle) => {
        if (!nearest) return candle;
        return Math.abs(candle.t - marker.t) < Math.abs(nearest.t - marker.t) ? candle : nearest;
      }, null);

    if (nearbyContainingCandle) return timeValue(nearbyContainingCandle.t);
  }

  let nearest = candles[0]?.t ?? minuteStart;
  let nearestScore = Infinity;
  for (const candle of candles) {
    const timeDistance = Math.abs(candle.t - marker.t);
    const priceDistance = Number.isFinite(marker.price) ? priceDistanceFromCandle(candle, marker.price) : 0;
    const score = priceDistance * 100000 + timeDistance;
    if (score < nearestScore) {
      nearest = candle.t;
      nearestScore = score;
    }
  }

  return timeValue(nearest);
}

function InteractiveLightweightTradeChart({
  candles,
  focusMinutesAfter = 70,
  focusMinutesBefore = 20,
  initialActiveTradeNumber,
  markers,
  initialFocusTime,
  tradeSummaries = EMPTY_TRADE_SUMMARIES,
  chartHeightClass = "h-[520px]",
  footerAction,
}: InteractiveLightweightTradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    const series = marketIndicatorSeries(candles);
    const toLineData = (points: typeof series.ema9): LineData[] => points.map((point) => ({
      time: timeValue(point.t),
      value: point.value,
    }));
    return {
      ema9: toLineData(series.ema9),
      ema20: toLineData(series.ema20),
      vwap: toLineData(series.vwap),
    };
  }, [candles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const colors = readChartColors();
    const volumeData: HistogramData[] = candles.map((candle) => ({
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

      const nextMarkers = markers.flatMap((marker, index) => {
        const candleTime = candleTimeForExecution(candles, marker);
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

    };

    const scheduleMarkerUpdate = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateMarkerPoints();
      });
    };

    const handleVisibleRangeChange = () => scheduleMarkerUpdate();
    const handleSizeChange = () => scheduleMarkerUpdate();

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
    chart.timeScale().subscribeSizeChange(handleSizeChange);
    container.addEventListener("pointermove", scheduleMarkerUpdate);
    container.addEventListener("pointerup", scheduleMarkerUpdate);
    container.addEventListener("wheel", scheduleMarkerUpdate, { passive: true });
    window.addEventListener("resize", scheduleMarkerUpdate);

    if (initialFocusTime != null) {
      const firstCandleTime = candles[0]?.t;
      const lastCandleTime = candles.at(-1)?.t;
      const focusedFrom = firstCandleTime == null
        ? initialFocusTime - focusMinutesBefore * 60
        : Math.max(firstCandleTime, initialFocusTime - focusMinutesBefore * 60);
      const focusedTo = lastCandleTime == null
        ? initialFocusTime + focusMinutesAfter * 60
        : Math.min(lastCandleTime, initialFocusTime + focusMinutesAfter * 60);

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
      const firstTime = candles[0]?.t;
      const lastTime = candles.at(-1)?.t;
      const from = firstTime == null
        ? time - focusMinutesBefore * 60
        : Math.max(firstTime, time - focusMinutesBefore * 60);
      const to = lastTime == null
        ? time + focusMinutesAfter * 60
        : Math.min(lastTime, time + focusMinutesAfter * 60);
      if (from < to) {
        chart.timeScale().setVisibleRange({ from: timeValue(from), to: timeValue(to) });
        scheduleMarkerUpdate();
      }
    };
    window.addEventListener(CHART_FOCUS_EVENT, handleFocusRequest);

    return () => {
      window.removeEventListener(CHART_FOCUS_EVENT, handleFocusRequest);
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
  }, [candleData, candles, focusMinutesAfter, focusMinutesBefore, indicatorData, initialFocusTime, markers, themeKey]);

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
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div
        className={`relative w-full ${chartHeightClass}`}
        onPointerDown={() => {
          setHoveredTradeNumber(null);
          setSelectedTradeNumber(null);
        }}
      >
        <div ref={containerRef} className="relative z-0 h-full w-full" />
        {candles.length > 0 ? (
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
      <div className="flex items-center justify-between gap-4 border-t border-[var(--hairline)] px-4 py-3 text-[12px] text-[var(--muted)]">
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
    if (!isFullscreen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  if (props.candles.length === 0) return <EmptyTradeChart chartHeightClass={props.chartHeightClass} />;

  const footerAction = (
    <div className="flex items-center gap-2">
      {breathingAvailable ? <ChartViewToggle mode={activeViewMode} onChange={setViewMode} /> : null}
      {props.enableFullscreen ? (
        <button
          type="button"
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

      {props.enableFullscreen && isFullscreen ? (
        <div className="fixed inset-0 z-50 bg-[var(--background)]/90 px-6 py-5 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-[1600px] flex-col">
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                aria-label="Close expanded chart"
                onClick={() => setIsFullscreen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--border)] font-mono text-[16px] text-[var(--foreground)] transition hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                X
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {activeViewMode === "mae" ? (
                <TradeBreathingChart
                  allowAllTrades={props.enableTradeScopeToggle}
                  candles={props.candles}
                  chartHeightClass="h-[calc(100vh-9rem)]"
                  footerAction={<ChartViewToggle mode={activeViewMode} onChange={setViewMode} />}
                  initialActiveTradeNumber={props.initialActiveTradeNumber}
                  tradeSummaries={props.tradeSummaries ?? EMPTY_TRADE_SUMMARIES}
                />
              ) : (
                <InteractiveLightweightTradeChart
                  candles={props.candles}
                  focusMinutesAfter={props.focusMinutesAfter}
                  focusMinutesBefore={props.focusMinutesBefore}
                  initialActiveTradeNumber={props.initialActiveTradeNumber}
                  initialFocusTime={props.initialFocusTime}
                  markers={props.markers}
                  tradeSummaries={props.tradeSummaries}
                  chartHeightClass="h-[calc(100vh-9rem)]"
                  footerAction={<ChartViewToggle mode={activeViewMode} onChange={setViewMode} />}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
