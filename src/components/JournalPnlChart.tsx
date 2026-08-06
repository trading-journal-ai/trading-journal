"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BaselineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type BaselineData,
  type UTCTimestamp,
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
    background: token("--surface", "#ffffff"),
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

function chartData(points: JournalPnlPoint[]): BaselineData[] {
  let previousTimestamp = Number.NEGATIVE_INFINITY;

  return points.map((point) => {
    const timestamp = Math.max(point.timestamp, previousTimestamp + 1);
    previousTimestamp = timestamp;
    return {
      time: timestamp as UTCTimestamp,
      value: point.value,
    };
  });
}

export default function JournalPnlChart({ points }: { points: JournalPnlPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [themeKey, setThemeKey] = useState(0);
  const data = useMemo(() => chartData(points), [points]);
  const finalPoint = points.at(-1);
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
        horzLines: { color: colors.grid, style: LineStyle.Dotted },
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
      leftPriceScale: {
        visible: true,
        borderVisible: false,
        minimumWidth: 72,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      rightPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 0,
        secondsVisible: false,
        tickMarkFormatter: formatChartTime,
        timeVisible: true,
      },
      handleScroll: false,
      handleScale: false,
      localization: {
        priceFormatter: formatMoney,
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
      priceLineVisible: false,
      priceScaleId: "left",
      topFillColor1: withAlpha(colors.positive, 0.28),
      topFillColor2: withAlpha(colors.positive, 0.06),
      topLineColor: colors.positive,
    });

    series.setData(data);
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data, themeKey]);

  if (data.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--muted)]">
        Intraday P&amp;L is unavailable.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-0 flex-1"
      role="img"
      aria-label={chartLabel}
    />
  );
}
