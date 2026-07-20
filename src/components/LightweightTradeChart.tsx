"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import type { ChartCandle, ChartMarker } from "@/components/TradeChart";

type LightweightTradeChartProps = {
  candles: ChartCandle[];
  markers: ChartMarker[];
  enableFullscreen?: boolean;
  focusMinutesAfter?: number;
  focusMinutesBefore?: number;
  initialFocusTime?: number;
  chartHeightClass?: string;
  selectedTradeNumber?: number;
};

type InteractiveLightweightTradeChartProps = LightweightTradeChartProps & {
  footerAction?: ReactNode;
};

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

function formatExecutionPnl(pnl: number) {
  const sign = pnl > 0 ? "+" : pnl < 0 ? "-" : "";
  return sign + "$" + Math.abs(pnl).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function markerTooltipTitle(marker: ChartMarker) {
  const trade = marker.tradeNumber == null ? "Trade" : `Trade ${marker.tradeNumber}`;
  const side = marker.side === "buy" ? "Buy" : "Sell";
  return `${trade} · ${side}`;
}

function markerTooltipDetail(marker: ChartMarker) {
  if (marker.side === "sell" && marker.perShare != null && marker.pnl != null) {
    return `${formatExecutionPnl(marker.perShare)}/share\n${formatExecutionPnl(marker.pnl)}`;
  }

  const quantity = Math.abs(marker.quantity ?? 0);
  return `${quantity.toLocaleString("en-US")} @ $${formatExecutionPrice(marker.price)}`;
}

function markerTooltipLabel(marker: ChartMarker) {
  const title = markerTooltipTitle(marker).replace(" · ", ", ");
  if (marker.side === "sell" && marker.perShare != null && marker.pnl != null) {
    return `${title}, ${formatExecutionPnl(marker.perShare)} per share, ${formatExecutionPnl(marker.pnl)} total`;
  }
  return `${title}, ${markerTooltipDetail(marker)}`;
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
  selectedTradeNumber,
  chartHeightClass = "h-[520px]",
  footerAction,
}: InteractiveLightweightTradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rafRef = useRef<number | null>(null);
  const [markerPoints, setMarkerPoints] = useState<MarkerPoint[]>([]);
  const [chartSize, setChartSize] = useState<ChartSize>({ width: 0, height: 520 });
  const [activeMarkerKey, setActiveMarkerKey] = useState<string | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const activeMarker = activeMarkerKey == null
    ? undefined
    : markerPoints.find((point) => point.key === activeMarkerKey);
  const selectedTradeGuide = selectedTradeNumber == null
    ? undefined
    : markerPoints
        .filter((point) => point.marker.tradeNumber === selectedTradeNumber)
        .reduce<MarkerPoint | undefined>((earliest, point) => (
          !earliest || point.marker.t < earliest.marker.t ? point : earliest
        ), undefined);
  const activeMarkerTitle = activeMarker ? markerTooltipTitle(activeMarker.marker) : "";
  const activeMarkerDetail = activeMarker ? markerTooltipDetail(activeMarker.marker) : "";
  const activeMarkerShowsOutcome = activeMarker?.marker.side === "sell"
    && activeMarker.marker.perShare != null
    && activeMarker.marker.pnl != null;
  const activeMarkerDetailWidth = activeMarkerDetail
    .split("\n")
    .reduce((longest, line) => Math.max(longest, line.length * 6.65), 0);
  const estimatedTooltipWidth = Math.min(
    Math.max(108, Math.ceil(Math.max(activeMarkerTitle.length * 6.2, activeMarkerDetailWidth) + 24)),
    Math.max(108, chartSize.width - 16),
  );

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeMarkerKey == null) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveMarkerKey(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeMarkerKey]);

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

    return () => {
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
      setMarkerPoints([]);
    };
  }, [candleData, candles, focusMinutesAfter, focusMinutesBefore, initialFocusTime, markers, themeKey]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div
        className={`relative w-full ${chartHeightClass}`}
        onPointerDown={() => setActiveMarkerKey(null)}
      >
        <div ref={containerRef} className="relative z-0 h-full w-full" />
        <svg
          aria-label="Trade executions"
          role="group"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 overflow-hidden"
          height={chartSize.height}
          viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
          width={chartSize.width}
        >
          {selectedTradeGuide ? (
            <g aria-label={`Selected Trade ${selectedTradeNumber}`} role="img">
              <line
                x1={selectedTradeGuide.x}
                x2={selectedTradeGuide.x}
                y1={12}
                y2={Math.max(28, chartSize.height - 30)}
                stroke="var(--accent)"
                strokeDasharray="3 4"
                strokeLinecap="round"
                strokeOpacity="0.72"
                strokeWidth="1.5"
              />
              <rect
                x={Math.min(Math.max(4, selectedTradeGuide.x - 13), Math.max(4, chartSize.width - 30))}
                y={7}
                width={26}
                height={18}
                rx={4}
                fill="var(--surface)"
                stroke="var(--accent)"
                strokeWidth="1"
              />
              <text
                x={Math.min(Math.max(17, selectedTradeGuide.x), Math.max(17, chartSize.width - 17))}
                y={19.5}
                fill="var(--accent)"
                fontFamily="var(--font-mono)"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                T{selectedTradeNumber}
              </text>
            </g>
          ) : null}
          {markerPoints.map((marker, index) => {
            const s = 5;
            const buy = marker.marker.side === "buy";
            const points = buy
              ? `${marker.x},${marker.y - 1} ${marker.x - s},${marker.y + 7} ${marker.x + s},${marker.y + 7}`
              : `${marker.x},${marker.y + 1} ${marker.x - s},${marker.y - 7} ${marker.x + s},${marker.y - 7}`;
            const interactive = marker.marker.tradeNumber != null && marker.marker.quantity != null;

            return (
              <g key={`${marker.key}-${index}`}>
                <polygon
                  points={points}
                  fill={buy ? "#22c55e" : "#ef4444"}
                  stroke="#ffffff"
                  strokeLinejoin="round"
                  strokeWidth={1.2}
                />
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
                      setActiveMarkerKey((current) => current === marker.key ? null : marker.key);
                    }}
                    onFocus={() => setActiveMarkerKey(marker.key)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setActiveMarkerKey((current) => current === marker.key ? null : marker.key);
                    }}
                    onMouseEnter={() => setActiveMarkerKey(marker.key)}
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
        {activeMarker ? (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-20 w-max max-w-[calc(100%-16px)] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl"
            style={{
              left: Math.min(
                Math.max(8, activeMarker.x - estimatedTooltipWidth / 2),
                Math.max(8, chartSize.width - estimatedTooltipWidth - 8),
              ),
              top: activeMarker.y > (activeMarkerShowsOutcome ? 82 : 64)
                ? activeMarker.y - (activeMarkerShowsOutcome ? 76 : 58)
                : activeMarker.y + 14,
            }}
          >
            <div className="text-[11px] font-semibold text-[var(--foreground)]">
              {activeMarkerTitle}
            </div>
            <div className="mt-1 whitespace-nowrap font-mono text-[11px] tabular-nums text-[var(--body)]">
              {activeMarkerShowsOutcome ? (
                <div className="space-y-0.5">
                  <div className={activeMarker.marker.perShare! > 0 ? "text-[var(--green)]" : activeMarker.marker.perShare! < 0 ? "text-[var(--red)]" : "text-[var(--muted)]"}>
                    {formatExecutionPnl(activeMarker.marker.perShare!)}/share
                  </div>
                  <div className={activeMarker.marker.pnl! > 0 ? "text-[var(--green)]" : activeMarker.marker.pnl! < 0 ? "text-[var(--red)]" : "text-[var(--muted)]"}>
                    {formatExecutionPnl(activeMarker.marker.pnl!)}
                  </div>
                </div>
              ) : (
                <>
                  {Math.abs(activeMarker.marker.quantity ?? 0).toLocaleString("en-US")}{" "}
                  <span className="text-[var(--muted)]">@</span>{" "}
                  ${formatExecutionPrice(activeMarker.marker.price)}
                </>
              )}
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
                selectedTradeNumber={props.selectedTradeNumber}
                chartHeightClass="h-[calc(100vh-9rem)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
