"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPnlAxisTime, pnlTimeline } from "@/lib/pnlAxisTime";
import { formatPnlPriceTick, pnlPriceTicks } from "@/lib/pnlPriceScale";
import {
  BaselineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type BaselineData,
  type UTCTimestamp,
  type WhitespaceData,
} from "lightweight-charts";

export type JournalPnlPoint = {
  time: string;
  timestamp: number;
  value: number;
};

type ChartColors = {
  background: string;
  grid: string;
  negative: string;
  positive: string;
  text: string;
};

const chartTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatMoney(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatChartTime(time: unknown): string {
  if (typeof time !== "number") return String(time);
  return chartTimeFormatter.format(new Date(time * 1000)).replace(/^24:/, "00:");
}

function readChartColors(): ChartColors {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    background: token("--review-card-bg", "#ffffff"),
    grid: token("--hairline", "rgba(0,0,0,0.08)"),
    negative: token("--red-chart", "#c4553f"),
    positive: token("--green-chart", "#2c9a63"),
    text: token("--muted", "#8a8375"),
  };
}

function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  const match = normalized.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i);
  if (!match) return normalized;

  return `rgba(${Number.parseInt(match[1], 16)}, ${Number.parseInt(match[2], 16)}, ${Number.parseInt(match[3], 16)}, ${alpha})`;
}

function chartData(points: JournalPnlPoint[]): (BaselineData | WhitespaceData)[] {
  let previousTimestamp = Number.NEGATIVE_INFINITY;

  const values = points.map((point) => {
    const timestamp = Math.max(point.timestamp, previousTimestamp + 1);
    previousTimestamp = timestamp;
    return {
      time: timestamp as UTCTimestamp,
      value: point.value,
    };
  });
  return pnlTimeline(values).map((point) => ({ ...point, time: point.time as UTCTimestamp }));
}

export default function JournalPnlChart({ points }: { points: JournalPnlPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const data = useMemo(() => chartData(points), [points]);
  const finalPoint = points.at(-1);
  const chartTransitionKey = points.length === 0
    ? "empty"
    : `${points[0].timestamp}-${finalPoint?.timestamp}-${points.length}`;
  const chartLabel = finalPoint == null
    ? "Daily cumulative P&L by time of day"
    : `Daily cumulative P&L ending at ${formatMoney(finalPoint.value)} at ${finalPoint.time}`;

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((key) => key + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.length === 0) return undefined;

    const colors = readChartColors();
    const values = data.flatMap((point) => "value" in point ? [point.value] : []);
    let priceTicks = pnlPriceTicks(values, container.clientHeight || 320);
    const chart = createChart(container, {
      autoSize: true,
      height: 320,
      layout: {
        attributionLogo: false,
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      },
      grid: {
        horzLines: { visible: false },
        vertLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        horzLine: {
          color: colors.text,
          labelBackgroundColor: colors.background,
          style: LineStyle.Dotted,
        },
        vertLine: {
          color: colors.text,
          labelBackgroundColor: colors.background,
          style: LineStyle.Dotted,
        },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        minimumWidth: 56,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        minBarSpacing: 0.001,
        uniformDistribution: true,
        allowBoldLabels: false,
        secondsVisible: false,
        tickMarkFormatter: formatPnlAxisTime,
        timeVisible: true,
      },
      handleScroll: false,
      handleScale: false,
      localization: {
        priceFormatter: formatMoney,
        tickmarksPriceFormatter: (prices: number[]) => prices.map(() => ""),
        timeFormatter: formatChartTime,
      },
    });

    const series = chart.addSeries(BaselineSeries, {
      baseValue: { type: "price", price: 0 },
      bottomFillColor1: withAlpha(colors.negative, 0.06),
      bottomFillColor2: withAlpha(colors.negative, 0.28),
      bottomLineColor: colors.negative,
      crosshairMarkerBackgroundColor: colors.background,
      crosshairMarkerBorderColor: colors.text,
      crosshairMarkerRadius: 4,
      lastValueVisible: false,
      lineWidth: 2,
      priceFormat: {
        type: "custom",
        minMove: 0.01,
        formatter: formatMoney,
      },
      autoscaleInfoProvider: () => ({
        priceRange: { minValue: priceTicks[0], maxValue: priceTicks[priceTicks.length - 1] },
      }),
      priceLineVisible: false,
      priceScaleId: "right",
      topFillColor1: withAlpha(colors.positive, 0.28),
      topFillColor2: withAlpha(colors.positive, 0.06),
      topLineColor: colors.positive,
    });

    const makeAxisViews = () => priceTicks.map((price) => ({
      coordinate: () => series.priceToCoordinate(price) ?? -1000,
      text: () => formatPnlPriceTick(price, priceTicks[1] - priceTicks[0]),
      textColor: () => colors.text,
      backColor: () => colors.background,
      tickVisible: () => false,
    }));
    const makeGridLines = () => priceTicks.map((price) => series.createPriceLine({
      price,
      color: colors.grid,
      lineStyle: LineStyle.Dotted,
      lineWidth: 1,
      axisLabelVisible: false,
    }));
    let axisViews = makeAxisViews();
    let gridLines = makeGridLines();
    series.attachPrimitive({ priceAxisViews: () => axisViews });
    series.setData(data);
    chart.timeScale().fitContent();

    const observer = new ResizeObserver(() => {
      const nextTicks = pnlPriceTicks(values, container.clientHeight || 320);
      if (nextTicks.join() === priceTicks.join()) return;
      priceTicks = nextTicks;
      axisViews = makeAxisViews();
      gridLines.forEach((line) => series.removePriceLine(line));
      gridLines = makeGridLines();
      series.applyOptions({ autoscaleInfoProvider: () => ({
        priceRange: { minValue: priceTicks[0], maxValue: priceTicks[priceTicks.length - 1] },
      }) });
    });
    observer.observe(container);
    return () => { observer.disconnect(); chart.remove(); };
  }, [data, themeKey]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--muted)]">
        Intraday P&amp;L is unavailable.
      </div>
    );
  }

  return (
    <div className="journal-pnl-chart-shell relative min-h-0 flex-1 pl-2">
      <div
        key={chartTransitionKey}
        ref={containerRef}
        className="journal-pnl-chart-enter h-full w-full"
        role="img"
        aria-label={chartLabel}
      />
      <div
        className="journal-pnl-chart-loader pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
        aria-hidden="true"
      >
        <span className="inline-flex flex-col items-center gap-2 font-sans text-[11px] font-medium text-[var(--muted)]">
          <svg
            aria-hidden="true"
            viewBox="0 0 58 24"
            className="h-6 w-[58px] overflow-visible"
            fill="none"
          >
            <path
              d="M2 18 11 15 18 17 27 9 35 12 43 5 56 2"
              className="journal-pnl-loader-line stroke-[var(--accent)]"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
            <circle
              cx="56"
              cy="2"
              r="2"
              className="journal-pnl-loader-point fill-[var(--accent)]"
            />
          </svg>
          Plotting P&amp;L
        </span>
      </div>
    </div>
  );
}
