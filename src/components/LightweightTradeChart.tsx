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
};

type InteractiveLightweightTradeChartProps = LightweightTradeChartProps & {
  chartHeightClass?: string;
  footerAction?: ReactNode;
};

type MarkerPoint = {
  x: number;
  y: number;
  side: ChartMarker["side"];
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

function EmptyTradeChart() {
  return (
    <div className="flex h-[520px] items-center justify-center rounded-[6px] bg-[#1a2432] px-6 text-center text-sm text-[var(--muted)]">
      No candle data is available for this trade yet.
    </div>
  );
}

function timeValue(epochSeconds: number): UTCTimestamp {
  return epochSeconds as UTCTimestamp;
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
  markers,
  chartHeightClass = "h-[520px]",
  footerAction,
}: InteractiveLightweightTradeChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rafRef = useRef<number | null>(null);
  const [markerPoints, setMarkerPoints] = useState<MarkerPoint[]>([]);
  const [chartSize, setChartSize] = useState<ChartSize>({ width: 0, height: 520 });

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

  const volumeData = useMemo<HistogramData[]>(
    () =>
      candles.map((candle) => ({
        time: timeValue(candle.t),
        value: candle.vol,
        color: candle.c >= candle.o ? "rgba(19, 195, 120, 0.32)" : "rgba(255, 82, 69, 0.32)",
      })),
    [candles],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const chart = createChart(container, {
      autoSize: true,
      height: 520,
      layout: {
        background: { type: ColorType.Solid, color: "#1a2432" },
        textColor: "#8d98aa",
        fontFamily: "var(--font-mono)",
        fontSize: 16,
        attributionLogo: false,
      },
      grid: {
        horzLines: { color: "rgba(141, 152, 170, 0.16)", style: 2 },
        vertLines: { color: "rgba(141, 152, 170, 0.08)", style: 0 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: { color: "rgba(141, 152, 170, 0.45)", labelBackgroundColor: "#1a2432" },
        vertLine: { color: "rgba(141, 152, 170, 0.35)", labelBackgroundColor: "#1a2432" },
      },
      rightPriceScale: {
        borderVisible: false,
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
        priceFormatter: (price: number) => {
          if (Math.abs(price) >= 10) return price.toFixed(2);
          if (Math.abs(price) >= 1) return price.toFixed(3).replace(/0$/, "");
          return price.toFixed(4);
        },
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#13c378",
      downColor: "#ff5245",
      wickUpColor: "#13c378",
      wickDownColor: "#ff5245",
      borderVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
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
      setChartSize({ width: rect.width, height: rect.height });

      const nextMarkers = markers.flatMap((marker) => {
        const x = chart.timeScale().timeToCoordinate(candleTimeForExecution(candles, marker));
        const y = candleSeries.priceToCoordinate(marker.price);
        if (x == null || y == null) return [];
        return [{ x, y, side: marker.side }];
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

    chart.timeScale().fitContent();
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
      setMarkerPoints([]);
    };
  }, [candleData, candles, markers, volumeData]);

  return (
    <div className="overflow-hidden rounded-[6px] bg-[#1a2432]">
      <div className={`relative w-full ${chartHeightClass}`}>
        <div ref={containerRef} className="relative z-0 h-full w-full" />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          height={chartSize.height}
          viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
          width={chartSize.width}
        >
          {markerPoints.map((marker, index) => {
            const s = 5;
            const buy = marker.side === "buy";
            const points = buy
              ? `${marker.x},${marker.y - 1} ${marker.x - s},${marker.y + 7} ${marker.x + s},${marker.y + 7}`
              : `${marker.x},${marker.y + 1} ${marker.x - s},${marker.y - 7} ${marker.x + s},${marker.y - 7}`;

            return (
              <polygon
                key={`${marker.side}-${marker.x}-${marker.y}-${index}`}
                points={points}
                fill={buy ? "#0f8f5a" : "#b9322b"}
                stroke="rgba(255,255,255,0.9)"
                strokeLinejoin="round"
                strokeWidth={1.2}
              />
            );
          })}
        </svg>
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

  if (props.candles.length === 0) return <EmptyTradeChart />;

  const footerAction = props.enableFullscreen ? (
    <button
      type="button"
      aria-label="Expand chart"
      title="Expand chart"
      onClick={() => setIsFullscreen(true)}
      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[var(--muted)]/70 transition hover:bg-[var(--background)]/40 hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
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
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--border)] font-mono text-[16px] text-[var(--foreground)] transition hover:bg-[var(--surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
              >
                X
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <InteractiveLightweightTradeChart
                candles={props.candles}
                markers={props.markers}
                chartHeightClass="h-[calc(100vh-9rem)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
