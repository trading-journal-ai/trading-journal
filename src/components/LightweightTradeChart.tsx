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
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";
import type { AnalyzedTradeExecution, TradeExecutionAnalysis } from "@/lib/executionAnalysis";

export type TradeChartSummary = {
  tradeNumber: number;
  executionAnalysis: TradeExecutionAnalysis;
  holdDuration: string | null;
  shares: string;
};

type LightweightTradeChartProps = {
  candles: ChartCandle[];
  markers: ChartMarker[];
  enableFullscreen?: boolean;
  focusMinutesAfter?: number;
  focusMinutesBefore?: number;
  initialFocusTime?: number;
  chartHeightClass?: string;
  tradeSummaries?: TradeChartSummary[];
};

type InteractiveLightweightTradeChartProps = LightweightTradeChartProps & {
  footerAction?: ReactNode;
};

/** Event other review components dispatch to scroll the chart to a moment. */
export const CHART_FOCUS_EVENT = "tj:focus-chart-time";

const OVERLAY_COLORS = { ema9: "#f59e0b", ema20: "#3b82f6", vwap: "#a855f7" } as const;

function emaLine(candles: ChartCandle[], period: number): LineData[] {
  const k = 2 / (period + 1);
  let ema: number | null = null;
  const points: LineData[] = [];
  candles.forEach((candle, index) => {
    ema = ema == null ? candle.c : candle.c * k + ema * (1 - k);
    if (index >= period - 1) points.push({ time: candle.t as UTCTimestamp, value: ema });
  });
  return points;
}

function vwapLine(candles: ChartCandle[]): LineData[] {
  let cumTypicalVol = 0;
  let cumVol = 0;
  const points: LineData[] = [];
  for (const candle of candles) {
    cumTypicalVol += ((candle.h + candle.l + candle.c) / 3) * candle.vol;
    cumVol += candle.vol;
    if (cumVol > 0) points.push({ time: candle.t as UTCTimestamp, value: cumTypicalVol / cumVol });
  }
  return points;
}

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

function markerTooltipDetail(marker: ChartMarker) {
  const quantity = Math.abs(marker.quantity ?? 0);
  const action = marker.side === "buy" ? "Buy" : "Sell";
  const execution = `${action} ${quantity.toLocaleString("en-US")} at $${formatExecutionPrice(marker.price)}`;
  if (!marker.addedAgainstPosition) return execution;
  const behavior = marker.side === "buy"
    ? "Averaged down"
    : "Averaged up";
  return `${execution}\n${behavior}`;
}

function markerTooltipLabel(marker: ChartMarker) {
  const trade = marker.tradeNumber == null ? "Trade" : `Trade ${marker.tradeNumber}`;
  return `${trade}, ${markerTooltipDetail(marker).replace("\n", ", ")}`;
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
  markers,
  initialFocusTime,
  tradeSummaries = [],
  chartHeightClass = "h-[520px]",
  footerAction,
}: InteractiveLightweightTradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rafRef = useRef<number | null>(null);
  const [markerPoints, setMarkerPoints] = useState<MarkerPoint[]>([]);
  const [chartSize, setChartSize] = useState<ChartSize>({ width: 0, height: 520 });
  const [activeMarkerKey, setActiveMarkerKey] = useState<string | null>(null);
  const [activeTradeNumber, setActiveTradeNumber] = useState<number | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const activeMarker = activeMarkerKey == null
    ? undefined
    : markerPoints.find((point) => point.key === activeMarkerKey);
  const tradeGuides = tradeGuidesForSummaries(markerPoints, tradeSummaries, chartSize.width);
  const activeTradeGuide = activeTradeNumber == null
    ? undefined
    : tradeGuides.find((guide) => guide.summary.tradeNumber === activeTradeNumber);
  const activeTradeCardId = activeTradeNumber == null ? undefined : `trade-${activeTradeNumber}-summary`;
  const activeMarkerTitle = activeMarker
    ? `${activeMarker.marker.side === "buy" ? "Buy" : "Sell"} ${Math.abs(activeMarker.marker.quantity ?? 0).toLocaleString("en-US")}`
    : "";
  const activeMarkerHasBehavior = activeMarker?.marker.addedAgainstPosition === true;
  const activeMarkerPrice = activeMarker ? `$${formatExecutionPrice(activeMarker.marker.price)}` : "";
  const activeMarkerBehavior = activeMarkerHasBehavior
    ? activeMarker?.marker.side === "buy" ? "Avg down" : "Avg up"
    : "";
  const activeMarkerDetailWidth = Math.max(
    activeMarkerPrice.length * 6.65,
    activeMarkerBehavior.length * 6.65,
  );
  const estimatedTooltipWidth = Math.min(
    Math.max(72, Math.ceil(Math.max(activeMarkerTitle.length * 6.2, activeMarkerDetailWidth) + 24)),
    Math.max(72, chartSize.width - 16),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeMarkerKey == null && activeTradeNumber == null) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActiveMarkerKey(null);
      setActiveTradeNumber(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeMarkerKey, activeTradeNumber]);

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

    // Indicator overlays the review vocabulary leans on (EMA rail, VWAP).
    const overlayOptions = {
      lineWidth: 1 as const,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    };
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.ema9 })
      .setData(emaLine(candles, 9));
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.ema20 })
      .setData(emaLine(candles, 20));
    chart.addSeries(LineSeries, { ...overlayOptions, color: OVERLAY_COLORS.vwap, lineStyle: LineStyle.Dashed })
      .setData(vwapLine(candles));

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
      const time = (event as CustomEvent<{ time?: number }>).detail?.time;
      if (time == null || !Number.isFinite(time)) return;
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
      setActiveMarkerKey(null);
      setActiveTradeNumber(null);
      setMarkerPoints([]);
    };
  }, [candleData, candles, focusMinutesAfter, focusMinutesBefore, initialFocusTime, markers, themeKey]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div
        className={`relative w-full ${chartHeightClass}`}
        onPointerDown={() => {
          setActiveMarkerKey(null);
          setActiveTradeNumber(null);
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
                  strokeOpacity="0.72"
                  strokeWidth="1.5"
                />
                <circle
                  aria-describedby={cardOpen ? cardId : undefined}
                  aria-label={`Trade ${tradeNumber} execution summary`}
                  className="pointer-events-auto cursor-pointer focus:outline-none focus-visible:stroke-[var(--foreground)]"
                  cx={guide.badgeX}
                  cy={guide.badgeY}
                  fill="var(--blue)"
                  onBlur={() => setActiveTradeNumber((current) => current === tradeNumber ? null : current)}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveMarkerKey(null);
                    setActiveTradeNumber(tradeNumber);
                  }}
                  onFocus={() => {
                    setActiveMarkerKey(null);
                    setActiveTradeNumber(tradeNumber);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setActiveMarkerKey(null);
                    setActiveTradeNumber((current) => current === tradeNumber ? null : tradeNumber);
                  }}
                  onMouseEnter={() => {
                    setActiveMarkerKey(null);
                    setActiveTradeNumber(tradeNumber);
                  }}
                  onMouseLeave={() => setActiveTradeNumber((current) => current === tradeNumber ? null : current)}
                  onPointerDown={(event) => event.stopPropagation()}
                  r={cardOpen ? 14 : 13}
                  role="button"
                  stroke="var(--surface)"
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
            const interactive = marker.marker.tradeNumber != null && marker.marker.quantity != null;

            return (
              <g key={`${marker.key}-${index}`}>
                {boundary ? (
                  <polygon
                    points={points}
                    fill={buy ? "var(--execution-buy)" : "var(--execution-sell)"}
                    stroke="var(--surface)"
                    strokeLinejoin="round"
                    strokeWidth={1.2}
                  />
                ) : (
                  <circle
                    cx={marker.x}
                    cy={marker.y}
                    fill={buy ? "var(--execution-buy)" : "var(--execution-sell)"}
                    r={4.5}
                    stroke="var(--surface)"
                    strokeWidth={1.2}
                  />
                )}
                {interactive ? (
                  <circle
                    aria-label={markerTooltipLabel(marker.marker)}
                    className="pointer-events-auto focus:outline-none focus-visible:stroke-[var(--accent)]"
                    cx={marker.x}
                    cy={marker.y}
                    fill="transparent"
                    onBlur={() => setActiveMarkerKey(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTradeNumber(null);
                      setActiveMarkerKey((current) => current === marker.key ? null : marker.key);
                    }}
                    onFocus={() => {
                      setActiveTradeNumber(null);
                      setActiveMarkerKey(marker.key);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setActiveTradeNumber(null);
                      setActiveMarkerKey((current) => current === marker.key ? null : marker.key);
                    }}
                    onMouseEnter={() => {
                      setActiveTradeNumber(null);
                      setActiveMarkerKey(marker.key);
                    }}
                    onMouseLeave={() => setActiveMarkerKey(null)}
                    onPointerDown={(event) => event.stopPropagation()}
                    r={10}
                    role="button"
                    stroke="transparent"
                    strokeWidth={3}
                    tabIndex={0}
                  />
                ) : null}
              </g>
            );
          })}
        </svg>
        {activeTradeGuide && activeTradeCardId ? (
          <div
            id={activeTradeCardId}
            role="tooltip"
            className="pointer-events-none absolute z-20 w-[228px] max-w-[calc(100%-16px)] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 shadow-xl"
            style={{
              left: Math.min(
                Math.max(8, activeTradeGuide.badgeX - 114),
                Math.max(8, chartSize.width - 236),
              ),
              top: activeTradeGuide.badgeY + 20,
            }}
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
        {activeMarker ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 w-max max-w-[calc(100%-16px)] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-xl"
            style={{
              left: Math.min(
                Math.max(8, activeMarker.x - estimatedTooltipWidth / 2),
                Math.max(8, chartSize.width - estimatedTooltipWidth - 8),
              ),
              top: activeMarker.y > (activeMarkerHasBehavior ? 82 : 64)
                ? activeMarker.y - (activeMarkerHasBehavior ? 76 : 58)
                : activeMarker.y + 14,
            }}
          >
            <div className={`flex items-center justify-end gap-1.5 font-mono text-[11px] font-semibold tabular-nums ${
              activeMarker.marker.side === "buy" ? "text-[var(--green-chart)]" : "text-[var(--red-chart)]"
            }`}>
              <ExecutionGlyph
                lifecycle={activeMarker.marker.executionLifecycle}
                side={activeMarker.marker.side}
              />
              <span>{activeMarker.marker.side === "buy" ? "Buy" : "Sell"}</span>
              <span>{Math.abs(activeMarker.marker.quantity ?? 0).toLocaleString("en-US")}</span>
            </div>
            <div className="mt-1 whitespace-nowrap text-right font-mono text-[11px] tabular-nums text-[var(--muted)]">
              ${formatExecutionPrice(activeMarker.marker.price)}
              {activeMarkerHasBehavior ? (
                <div className="mt-0.5 text-[10px] text-[var(--red-chart)]">
                  {activeMarker.marker.side === "buy" ? "Avg down" : "Avg up"}
                </div>
              ) : null}
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

export default function LightweightTradeChart(props: LightweightTradeChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const footerAction = props.enableFullscreen ? (
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
  ) : null;

  return (
    <>
      <InteractiveLightweightTradeChart {...props} footerAction={footerAction} />

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
              <InteractiveLightweightTradeChart
                candles={props.candles}
                focusMinutesAfter={props.focusMinutesAfter}
                focusMinutesBefore={props.focusMinutesBefore}
                initialFocusTime={props.initialFocusTime}
                markers={props.markers}
                tradeSummaries={props.tradeSummaries}
                chartHeightClass="h-[calc(100vh-9rem)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
