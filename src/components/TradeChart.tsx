"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { ExecutionLifecycle } from "@/lib/executionAnalysis";

export type ChartCandle = {
  t: number; // epoch seconds (bar start)
  o: number;
  h: number;
  l: number;
  c: number;
  vol: number;
};

export type ChartMarker = {
  id?: number;
  t: number; // epoch seconds
  price: number;
  side: "buy" | "sell";
  quantity?: number;
  tradeNumber?: number;
  executionLifecycle?: ExecutionLifecycle;
  addedAgainstPosition?: boolean;
};

const W = 900;
const H = 480;
const PAD = { top: 12, right: 58, bottom: 24, left: 8 };
const VOLUME_H = 70;
const VOLUME_GAP = 16;
const axisTextStyle = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 500,
} as const;

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type Viewport = {
  key: string;
  start: number;
  end: number;
};

type MotionSettings = {
  pan: number;
  zoom: number;
  ease: number;
};

const DEFAULT_MOTION: MotionSettings = {
  pan: 100,
  zoom: 35,
  ease: 22,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nicePriceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const fraction = rawStep / magnitude;
  let niceFraction = 10;

  if (fraction <= 1.2) niceFraction = 1;
  else if (fraction <= 2.5) niceFraction = 2;
  else if (fraction <= 6) niceFraction = 5;

  return niceFraction * magnitude;
}

function buildPriceAxis(min: number, max: number): { min: number; max: number; ticks: number[]; step: number } {
  const span = max - min || Math.max(Math.abs(max), 1);
  const step = nicePriceStep(span / 6);
  const axisMin = Math.floor(min / step) * step;
  const axisMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let value = axisMin; value <= axisMax + step * 0.5; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }

  return { min: axisMin, max: axisMax, ticks, step };
}

function formatPriceTick(price: number, step: number): string {
  if (step >= 1) return price.toFixed(2);
  if (step >= 0.01) return price.toFixed(2);
  if (step >= 0.001) return price.toFixed(3);
  return price.toFixed(4);
}

function clampViewport(start: number, end: number, candleCount: number, key: string): Viewport {
  if (candleCount <= 1) return { key, start: 0, end: Math.max(candleCount - 1, 0) };

  const maxEnd = candleCount - 1;
  const minWindow = Math.min(candleCount - 1, 12);
  let nextStart = start;
  let nextEnd = end;

  if (nextEnd - nextStart < minWindow) {
    const center = (nextStart + nextEnd) / 2;
    nextStart = center - minWindow / 2;
    nextEnd = center + minWindow / 2;
  }

  if (nextStart < 0) {
    nextEnd -= nextStart;
    nextStart = 0;
  }
  if (nextEnd > maxEnd) {
    nextStart -= nextEnd - maxEnd;
    nextEnd = maxEnd;
  }

  return {
    key,
    start: clamp(nextStart, 0, maxEnd),
    end: clamp(nextEnd, 0, maxEnd),
  };
}

function candleIndexForMarker(candles: ChartCandle[], t: number): number {
  const minuteStart = Math.floor(t / 60) * 60;
  const containingIndex = candles.findIndex((c) => c.t === minuteStart);
  if (containingIndex !== -1) return containingIndex;

  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < candles.length; i += 1) {
    const d = Math.abs(candles[i].t - t);
    if (d < bestDiff) {
      bestDiff = d;
      best = i;
    }
  }
  return best;
}

export default function TradeChart({
  candles,
  markers,
}: {
  candles: ChartCandle[];
  markers: ChartMarker[];
}) {
  const fullEnd = Math.max(candles.length - 1, 0);
  const firstCandleTime = candles[0]?.t ?? 0;
  const lastCandleTime = candles[candles.length - 1]?.t ?? 0;
  const candleKey = `${candles.length}:${firstCandleTime}:${lastCandleTime}`;
  const [viewport, setViewport] = useState<Viewport>({
    key: candleKey,
    start: 0,
    end: fullEnd,
  });
  const [targetViewport, setTargetViewport] = useState<Viewport>({
    key: candleKey,
    start: 0,
    end: fullEnd,
  });
  const [motion, setMotion] = useState<MotionSettings>(DEFAULT_MOTION);
  const activeViewport = viewport.key === candleKey ? viewport : { key: candleKey, start: 0, end: fullEnd };
  const activeTargetViewport =
    targetViewport.key === candleKey ? targetViewport : { key: candleKey, start: 0, end: fullEnd };
  const dragRef = useRef<{ clientX: number; start: number; end: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const plotW = W - PAD.left - PAD.right;

  const handleWheel = useCallback((event: globalThis.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (candles.length <= 1) return;

    let deltaX = event.deltaX;
    let deltaY = event.deltaY;
    if (event.deltaMode === 1) {
      deltaX *= 20;
      deltaY *= 20;
    } else if (event.deltaMode === 2) {
      deltaX *= 400;
      deltaY *= 400;
    }

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * W;
    const anchorRatio = clamp((svgX - PAD.left) / plotW, 0, 1);
    const currentSize = activeTargetViewport.end - activeTargetViewport.start;
    const panMultiplier = motion.pan / 100;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const indexDelta = (deltaX / plotW) * currentSize * panMultiplier;
      setTargetViewport(
        clampViewport(
          activeTargetViewport.start + indexDelta,
          activeTargetViewport.end + indexDelta,
          candles.length,
          candleKey,
        ),
      );
      return;
    }

    const normalizedDelta = clamp(Math.abs(deltaY) / 100, 0.08, 1.25);
    const zoomStep = 1 + (motion.zoom / 100) * 0.035 * normalizedDelta;
    const zoomFactor = deltaY < 0 ? 1 / zoomStep : zoomStep;
    const nextSize = clamp(currentSize * zoomFactor, Math.min(candles.length - 1, 12), candles.length - 1);
    const anchor = activeTargetViewport.start + currentSize * anchorRatio;

    setTargetViewport(
      clampViewport(
        anchor - nextSize * anchorRatio,
        anchor + nextSize * (1 - anchorRatio),
        candles.length,
        candleKey,
      ),
    );
  }, [
    activeTargetViewport.end,
    activeTargetViewport.start,
    candleKey,
    candles.length,
    motion.pan,
    motion.zoom,
    plotW,
  ]);

  useEffect(() => {
    if (targetViewport.key !== candleKey) return undefined;

    let raf = 0;
    let done = false;
    const step = () => {
      setViewport((current) => {
        const source = current.key === candleKey ? current : { key: candleKey, start: 0, end: fullEnd };
        const startDelta = targetViewport.start - source.start;
        const endDelta = targetViewport.end - source.end;

        if (Math.abs(startDelta) < 0.01 && Math.abs(endDelta) < 0.01) {
          done = true;
          return targetViewport;
        }

        const ease = clamp(motion.ease / 100, 0.08, 0.45);
        return {
          key: candleKey,
          start: source.start + startDelta * ease,
          end: source.end + endDelta * ease,
        };
      });

      if (!done) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [candleKey, fullEnd, motion.ease, targetViewport]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const visibleEntries = useMemo(() => {
    if (candles.length === 0) return [];
    const start = clamp(Math.floor(activeViewport.start), 0, candles.length - 1);
    const end = clamp(Math.ceil(activeViewport.end), 0, candles.length - 1);
    return candles.slice(start, end + 1).map((candle, offset) => ({
      candle,
      index: start + offset,
    }));
  }, [activeViewport.end, activeViewport.start, candles]);

  const markerEntries = useMemo(
    () =>
      markers.map((marker, index) => ({
        marker,
        index,
        candleIndex: candleIndexForMarker(candles, marker.t),
      })),
    [candles, markers],
  );

  if (candles.length === 0) {
    return (
      <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
        No candle data available for this trade&apos;s window.
      </div>
    );
  }

  const plotH = H - PAD.top - PAD.bottom - VOLUME_H - VOLUME_GAP;
  const viewSize = Math.max(1, activeViewport.end - activeViewport.start + 1);
  const cw = plotW / viewSize;
  const volumeTop = PAD.top + plotH + VOLUME_GAP;
  const volumeMax = Math.max(...visibleEntries.map(({ candle }) => candle.vol), 0);

  // price range over candles + marker prices, with 4% padding
  let pMin = Infinity;
  let pMax = -Infinity;
  for (const { candle: c } of visibleEntries) {
    pMin = Math.min(pMin, c.l);
    pMax = Math.max(pMax, c.h);
  }
  for (const { marker, candleIndex } of markerEntries) {
    if (candleIndex < activeViewport.start || candleIndex > activeViewport.end) continue;
    pMin = Math.min(pMin, marker.price);
    pMax = Math.max(pMax, marker.price);
  }
  if (!Number.isFinite(pMin) || !Number.isFinite(pMax)) {
    pMin = 0;
    pMax = 1;
  }
  const span = pMax - pMin || 1;
  pMin -= span * 0.04;
  pMax += span * 0.04;
  const priceAxis = buildPriceAxis(pMin, pMax);
  pMin = priceAxis.min;
  pMax = priceAxis.max;

  const x = (i: number) => PAD.left + (i - activeViewport.start + 0.5) * cw;
  const y = (p: number) => PAD.top + ((pMax - p) / (pMax - pMin)) * plotH;
  const volumeY = (vol: number) =>
    volumeTop + VOLUME_H - (volumeMax > 0 ? (vol / volumeMax) * VOLUME_H : 0);
  const bodyW = Math.max(1, cw * 0.6);
  const volumeW = Math.max(1, cw * 0.72);

  const priceTicks = priceAxis.ticks;
  const timeTickIdx = Array.from(
    new Set(
      Array.from({ length: 5 }, (_, i) =>
        clamp(
          Math.round(activeViewport.start + (activeViewport.end - activeViewport.start) * (i / 4)),
          0,
          candles.length - 1,
        ),
      ),
    ),
  );

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (candles.length <= 1) return;
    dragRef.current = {
      clientX: event.clientX,
      start: activeViewport.start,
      end: activeViewport.end,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const svgDelta = ((event.clientX - drag.clientX) / rect.width) * W;
    const indexDelta = (svgDelta / plotW) * Math.max(1, drag.end - drag.start) * (motion.pan / 100);
    const nextViewport = clampViewport(drag.start - indexDelta, drag.end - indexDelta, candles.length, candleKey);
    setViewport(nextViewport);
    setTargetViewport(nextViewport);
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const resetViewport = () => {
    const nextViewport = { key: candleKey, start: 0, end: Math.max(candles.length - 1, 0) };
    setViewport(nextViewport);
    setTargetViewport(nextViewport);
  };

  const shellClass = "overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]";

  return (
    <div className={shellClass}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full cursor-grab select-none touch-none active:cursor-grabbing"
        role="img"
        aria-label="Trade chart with volume"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onDoubleClick={resetViewport}
      >
        {/* grid + price axis */}
        {priceTicks.map((p, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(p)}
              y2={y(p)}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <text
              x={W - PAD.right + 5}
              y={y(p) + 3.5}
              fill="var(--muted)"
              fontSize={12}
              style={axisTextStyle}
            >
              {formatPriceTick(p, priceAxis.step)}
            </text>
          </g>
        ))}

        {/* time axis */}
        {timeTickIdx.map((idx) => (
          <text
            key={idx}
            x={x(idx)}
            y={H - 8}
            fill="var(--muted)"
            fontSize={12}
            style={axisTextStyle}
            textAnchor="middle"
          >
            {timeFmt.format(new Date(candles[idx].t * 1000))}
          </text>
        ))}

        {/* volume */}
        {visibleEntries.map(({ candle: c, index: i }) => {
          const up = c.c >= c.o;
          const color = up ? "var(--green-chart)" : "var(--red-chart)";
          const barY = volumeY(c.vol);
          return (
            <rect
              key={`vol-${c.t}`}
              x={x(i) - volumeW / 2}
              y={barY}
              width={volumeW}
              height={volumeTop + VOLUME_H - barY}
              fill={color}
              opacity={0.35}
            />
          );
        })}

        {/* candles */}
        {visibleEntries.map(({ candle: c, index: i }) => {
          const up = c.c >= c.o;
          const color = up ? "var(--green-chart)" : "var(--red-chart)";
          const bodyTop = y(Math.max(c.o, c.c));
          const bodyH = Math.max(1, Math.abs(y(c.o) - y(c.c)));
          return (
            <g key={c.t}>
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
              <rect
                x={x(i) - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                fill={color}
              />
            </g>
          );
        })}

        {/* entry/exit markers */}
        {markerEntries.map(({ marker: m, index: i, candleIndex }) => {
          if (candleIndex < activeViewport.start || candleIndex > activeViewport.end) return null;

          const mx = x(candleIndex);
          const my = y(m.price);
          const s = 5;
          const buy = m.side === "buy";
          const pts = buy
            ? `${mx},${my + 3} ${mx - s},${my + 3 + s * 1.6} ${mx + s},${my + 3 + s * 1.6}`
            : `${mx},${my - 3} ${mx - s},${my - 3 - s * 1.6} ${mx + s},${my - 3 - s * 1.6}`;
          return (
            <polygon
              key={i}
              points={pts}
              fill={buy ? "var(--green)" : "var(--red)"}
              stroke="var(--surface)"
              strokeWidth={0.8}
            />
          );
        })}
      </svg>
      <div className="border-t border-[var(--hairline)] px-4 py-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
              Pan speed
              <span className="tracking-normal">{motion.pan}</span>
            </span>
            <input
              type="range"
              min="25"
              max="200"
              step="5"
              value={motion.pan}
              onChange={(event) => setMotion((current) => ({ ...current, pan: Number(event.target.value) }))}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
              Zoom speed
              <span className="tracking-normal">{motion.zoom}</span>
            </span>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={motion.zoom}
              onChange={(event) => setMotion((current) => ({ ...current, zoom: Number(event.target.value) }))}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
              Easing
              <span className="tracking-normal">{motion.ease}</span>
            </span>
            <input
              type="range"
              min="8"
              max="45"
              step="1"
              value={motion.ease}
              onChange={(event) => setMotion((current) => ({ ...current, ease: Number(event.target.value) }))}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            onClick={resetViewport}
            className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
