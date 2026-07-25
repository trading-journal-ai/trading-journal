"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { ChartCandle } from "@/components/TradeChart";
import type { TradeChartSummary } from "@/components/LightweightTradeChart";
import { CHART_FOCUS_EVENT, type ChartFocusDetail } from "@/lib/chartFocusEvent";
import {
  tradeCandlesDuringHold,
  tradeExcursionFromCandles,
  type TradeExcursion,
  type TradeHeldCandle,
} from "@/lib/tradeExcursion";

type TradeBreathingChartProps = {
  allowAllTrades?: boolean;
  candles: ChartCandle[];
  chartHeightClass?: string;
  footerAction?: ReactNode;
  initialActiveTradeNumber?: number;
  tradeSummaries: TradeChartSummary[];
};

type TradeBreathingDatum = {
  summary: TradeChartSummary;
  excursion: TradeExcursion;
  heldCandles: TradeHeldCandle[];
};

type TradeScope = "focused" | "all";

type StemGeometry = {
  adverseTop: number;
  adverseOffsetX: number;
  candleGeometries: CandleGeometry[];
  exitTop: number;
  exitOffsetX: number;
  favorableTop: number;
  favorableOffsetX: number;
  entryOffsetX: number;
  rightLabelOffsetX: number;
};

type CandleGeometry = {
  bodyHeight: number;
  bodyTop: number;
  isFavorableClose: boolean;
  maximumTop: number;
  minimumTop: number;
  offsetX: number;
  phase: TradeHeldCandle["phase"];
  startedAt: number;
};

type LabelSide = "left" | "right";

type StemAnnotation = {
  key: string;
  label: string;
  labelTop: number;
  pointOffsetX: number;
  pointTop: number;
  side: LabelSide;
  tone: string;
};

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

function formatPrice(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  })}`;
}

function excursionData(
  candles: ChartCandle[],
  tradeSummaries: TradeChartSummary[],
): TradeBreathingDatum[] {
  return tradeSummaries.flatMap((summary) => {
    if (
      summary.side == null
      || summary.entryAt == null
      || summary.exitAt == null
      || summary.entryPrice == null
      || summary.exitPrice == null
    ) {
      return [];
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

    return excursion && heldCandles.length > 0 ? [{
      summary,
      excursion,
      heldCandles,
    }] : [];
  });
}

function stylePercent(top: number, height: number): CSSProperties {
  return {
    top: `${top}%`,
    height: `${Math.max(0.8, height)}%`,
  };
}

function minuteStart(epochSeconds: number) {
  return Math.floor(epochSeconds / 60) * 60;
}

function candleOffsets(count: number) {
  if (count <= 1) return [0];
  const totalSpan = Math.min((count - 1) * 18, 72);
  const step = totalSpan / (count - 1);
  return Array.from({ length: count }, (_, index) => (-totalSpan / 2) + (index * step));
}

function candleOffsetForTime(
  candles: TradeHeldCandle[],
  offsets: number[],
  epochSeconds: number,
) {
  const targetMinute = minuteStart(epochSeconds);
  const index = candles.findIndex((candle) => candle.startedAt === targetMinute);
  return offsets[index < 0 ? 0 : index] ?? 0;
}

function TradeStemMarks({
  excursion,
  geometry,
  label,
  zeroPercent,
}: {
  excursion: TradeExcursion;
  geometry: StemGeometry;
  label: string;
  zeroPercent: number;
}) {
  return (
    <>
      {geometry.candleGeometries.map((candle) => {
        const opacityClass = candle.phase === "held"
          ? "opacity-[0.68]"
          : candle.phase === "single" ? "opacity-50" : "opacity-35";
        return (
          <span key={candle.startedAt} aria-hidden="true">
            <span
              className={`absolute w-px -translate-x-1/2 bg-[var(--muted)] ${candle.phase === "held" ? "opacity-75" : "opacity-50"}`}
              style={{
                ...stylePercent(
                  candle.maximumTop,
                  candle.minimumTop - candle.maximumTop,
                ),
                left: `calc(50% + ${candle.offsetX}px)`,
              }}
            />
            <span
              className={`absolute w-2.5 -translate-x-1/2 border border-[var(--background)] ${opacityClass} ${candle.isFavorableClose ? "bg-[var(--green-chart)]" : "bg-[var(--red-chart)]"}`}
              style={{
                ...stylePercent(candle.bodyTop, candle.bodyHeight),
                left: `calc(50% + ${candle.offsetX}px)`,
              }}
            />
          </span>
        );
      })}
      <span
        aria-hidden="true"
        className="absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--green-chart)]"
        style={{
          left: `calc(50% + ${geometry.favorableOffsetX}px)`,
          top: `${geometry.favorableTop}%`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--red-chart)]"
        style={{
          left: `calc(50% + ${geometry.adverseOffsetX}px)`,
          top: `${geometry.adverseTop}%`,
        }}
      />
      <span
        aria-hidden="true"
        className={`absolute z-20 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 border-[var(--background)] ${excursion.realizedPct >= 0 ? "bg-[var(--green-chart)]" : "bg-[var(--red-chart)]"}`}
        style={{
          left: `calc(50% + ${geometry.exitOffsetX}px)`,
          top: `${geometry.exitTop}%`,
        }}
      />
      <span
        aria-hidden="true"
        className="absolute z-20 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--muted)] opacity-70"
        style={{
          left: `calc(50% + ${geometry.entryOffsetX}px)`,
          top: `${zeroPercent}%`,
        }}
      />
      <span className="absolute left-1/2 top-full flex h-11 min-w-11 -translate-x-1/2 items-center justify-center rounded-[4px] px-2 whitespace-nowrap font-mono text-[10.5px] font-semibold tabular-nums text-[var(--foreground)] transition-colors group-hover:bg-[var(--surface-2)] group-focus-visible:bg-[var(--surface-2)]">
        {label}
      </span>
    </>
  );
}

function layOutStemAnnotations(
  annotations: Array<Omit<StemAnnotation, "labelTop">>,
): StemAnnotation[] {
  const minimumGap = 7;
  const sorted = annotations.toSorted((left, right) => left.pointTop - right.pointTop);
  const laidOut = sorted.map((annotation, index) => ({
    ...annotation,
    labelTop: Math.max(annotation.pointTop, index === 0 ? 3 : 0),
  }));

  for (let index = 1; index < laidOut.length; index += 1) {
    laidOut[index].labelTop = Math.max(
      laidOut[index].labelTop,
      laidOut[index - 1].labelTop + minimumGap,
    );
  }

  const overflow = Math.max(0, (laidOut.at(-1)?.labelTop ?? 0) - 97);
  if (overflow > 0) {
    for (const annotation of laidOut) annotation.labelTop -= overflow;
  }

  return laidOut;
}

function TradeStemAnnotations({
  geometry,
  trade,
  zeroPercent,
}: {
  geometry: StemGeometry;
  trade: TradeBreathingDatum;
  zeroPercent: number;
}) {
  const outcomeAnnotations = layOutStemAnnotations([
    {
      key: "mfe",
      label: `MFE ${formatPrice(trade.excursion.favorablePrice)} · ${formatSignedPercent(trade.excursion.favorablePct)}`,
      pointOffsetX: geometry.favorableOffsetX,
      pointTop: geometry.favorableTop,
      side: "right",
      tone: "text-[var(--green-chart)]",
    },
    {
      key: "exit",
      label: `Exit ${formatPrice(trade.excursion.exitPrice)} · ${formatSignedPercent(trade.excursion.realizedPct)}`,
      pointOffsetX: geometry.exitOffsetX,
      pointTop: geometry.exitTop,
      side: "right",
      tone: trade.excursion.realizedPct >= 0 ? "text-[var(--green-chart)]" : "text-[var(--red-chart)]",
    },
    {
      key: "mae",
      label: `MAE ${formatPrice(trade.excursion.adversePrice)} · ${formatSignedPercent(trade.excursion.adversePct)}`,
      pointOffsetX: geometry.adverseOffsetX,
      pointTop: geometry.adverseTop,
      side: "right",
      tone: "text-[var(--red-chart)]",
    },
  ]);
  const annotations: StemAnnotation[] = [
    ...outcomeAnnotations,
    {
      key: "entry",
      label: `Entry ${formatPrice(trade.excursion.entryPrice)}`,
      labelTop: zeroPercent,
      pointOffsetX: geometry.entryOffsetX,
      pointTop: zeroPercent,
      side: "left",
      tone: "text-[var(--muted)]",
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-visible" aria-hidden="true">
      {annotations.filter((annotation) => annotation.key !== "entry").map((annotation) => (
        <svg
          key={annotation.key}
          className="absolute top-0 h-full overflow-visible"
          preserveAspectRatio="none"
          style={{
            left: `calc(50% + ${annotation.pointOffsetX}px)`,
            width: `${geometry.rightLabelOffsetX - annotation.pointOffsetX}px`,
          }}
          viewBox="0 0 100 100"
        >
          <line
            className="trade-breathing-leader"
            x1="0"
            x2="100"
            y1={annotation.pointTop}
            y2={annotation.pointTop}
            stroke="var(--muted)"
            strokeOpacity="0.68"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
      {annotations.map((annotation) => (
        <span
          key={annotation.key}
          className={`trade-breathing-value trade-breathing-value--${annotation.side} absolute whitespace-nowrap font-mono text-[9.5px] font-semibold tabular-nums ${annotation.tone}`}
          style={{
            top: `${annotation.labelTop}%`,
            ...(annotation.side === "right"
              ? { left: `calc(50% + ${geometry.rightLabelOffsetX}px)` }
              : { right: `calc(50% + ${40 - geometry.entryOffsetX}px)` }),
          }}
        >
          {annotation.label}
        </span>
      ))}
    </div>
  );
}

function ScopeToggle({
  scope,
  onChange,
}: {
  scope: TradeScope;
  onChange: (scope: TradeScope) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Trades shown"
      className="inline-flex rounded-[5px] bg-[var(--background)] p-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.08em]"
    >
      {(["focused", "all"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={scope === option}
          onClick={() => onChange(option)}
          className={`h-6 rounded-[3px] px-2.5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] ${scope === option ? "bg-[var(--surface-2)] text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--body)]"}`}
        >
          {option === "focused" ? "Focused" : "All"}
        </button>
      ))}
    </div>
  );
}

export default function TradeBreathingChart({
  allowAllTrades = false,
  candles,
  chartHeightClass = "h-[520px]",
  footerAction,
  initialActiveTradeNumber,
  tradeSummaries,
}: TradeBreathingChartProps) {
  const trades = useMemo(
    () => excursionData(candles, tradeSummaries),
    [candles, tradeSummaries],
  );
  const [selectedTradeNumber, setSelectedTradeNumber] = useState<number | null>(
    initialActiveTradeNumber ?? trades[0]?.summary.tradeNumber ?? null,
  );
  const [hoveredTradeNumber, setHoveredTradeNumber] = useState<number | null>(null);
  const [scope, setScope] = useState<TradeScope>("focused");
  const activeScope: TradeScope = allowAllTrades ? scope : "focused";
  const activeTrade = trades.find((trade) => trade.summary.tradeNumber === selectedTradeNumber)
    ?? trades[0];
  const displayedTrades = activeScope === "all"
    ? trades
    : activeTrade ? [activeTrade] : [];
  const inspectedTrade = hoveredTradeNumber == null
    ? activeTrade
    : trades.find((trade) => trade.summary.tradeNumber === hoveredTradeNumber) ?? activeTrade;

  let favorableMaximum = 0;
  let adverseMinimum = 0;
  for (const trade of displayedTrades) {
    favorableMaximum = Math.max(favorableMaximum, trade.excursion.favorablePct);
    adverseMinimum = Math.min(adverseMinimum, trade.excursion.adversePct);
  }
  const domainMaximum = Math.max(1, Math.ceil(favorableMaximum * 1.08));
  const domainMinimum = -Math.max(1, Math.ceil(Math.abs(adverseMinimum) * 1.08));

  const valueToPercent = (value: number) => (
    ((domainMaximum - value) / (domainMaximum - domainMinimum)) * 100
  );
  const zeroPercent = valueToPercent(0);
  const geometryByTradeNumber = new Map(displayedTrades.map((trade) => {
    const offsets = candleOffsets(trade.heldCandles.length);
    const lastOffset = offsets.at(-1) ?? 0;
    return [
      trade.summary.tradeNumber,
      {
        adverseTop: valueToPercent(trade.excursion.adversePct),
        adverseOffsetX: candleOffsetForTime(
          trade.heldCandles,
          offsets,
          trade.excursion.adverseAt,
        ),
        candleGeometries: trade.heldCandles.map((candle, index) => {
          const openTop = valueToPercent(candle.openPct);
          const closeTop = valueToPercent(candle.closePct);
          return {
            bodyHeight: Math.abs(closeTop - openTop),
            bodyTop: Math.min(openTop, closeTop),
            isFavorableClose: candle.closePct >= candle.openPct,
            maximumTop: valueToPercent(candle.maximumPct),
            minimumTop: valueToPercent(candle.minimumPct),
            offsetX: offsets[index] ?? 0,
            phase: candle.phase,
            startedAt: candle.startedAt,
          } satisfies CandleGeometry;
        }),
        entryOffsetX: offsets[0] ?? 0,
        exitOffsetX: lastOffset,
        exitTop: valueToPercent(trade.excursion.realizedPct),
        favorableOffsetX: candleOffsetForTime(
          trade.heldCandles,
          offsets,
          trade.excursion.favorableAt,
        ),
        favorableTop: valueToPercent(trade.excursion.favorablePct),
        rightLabelOffsetX: lastOffset + 60,
      } satisfies StemGeometry,
    ];
  }));
  const minimumChartWidth = activeScope === "all"
    ? Math.max(820, displayedTrades.length * 70 + 400)
    : undefined;

  useEffect(() => {
    const handleFocusRequest = (event: Event) => {
      const detail = (event as CustomEvent<ChartFocusDetail>).detail;
      if (detail?.tradeNumber == null || !Number.isFinite(detail.tradeNumber)) return;
      setSelectedTradeNumber(detail.tradeNumber);
    };

    window.addEventListener(CHART_FOCUS_EVENT, handleFocusRequest);
    return () => window.removeEventListener(CHART_FOCUS_EVENT, handleFocusRequest);
  }, []);

  if (trades.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-transparent">
        <div className={`grid ${chartHeightClass} place-items-center px-6 text-center text-sm text-[var(--muted)]`}>
          MAE is unavailable for these trades.
        </div>
        <div className="flex items-center justify-end border-t border-[var(--hairline)] px-4 py-3">
          {footerAction}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-transparent">
      <div className={`relative ${activeScope === "all" ? "overflow-x-auto" : "overflow-hidden"} ${chartHeightClass}`}>
        <div
          className="relative h-full"
          style={{ minWidth: minimumChartWidth }}
          role="group"
          aria-label={`${activeScope === "all" ? "All trade" : "Focused trade"} breathing view. MFE is above entry, MAE is below entry, and exit is a diamond. Hover or focus a trade to reveal prices. Values are estimated from one-minute candles.`}
        >
          <div className="absolute left-5 top-3 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[var(--green-chart)]">
            MFE · best move
          </div>
          <div className="absolute left-1/2 top-3 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
            Hover for prices · 1m sequence
          </div>
          {allowAllTrades ? (
            <div className="absolute right-4 top-2 z-40">
              <ScopeToggle scope={activeScope} onChange={setScope} />
            </div>
          ) : (
            <div className="absolute right-5 top-3 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
              1m estimate
            </div>
          )}

          <div className="absolute bottom-14 left-5 right-5 top-11">
            <div className="pointer-events-none absolute left-0 right-0 top-0 border-t border-[var(--hairline)]" />
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 border-t border-[var(--hairline)]" />
            <div
              className="pointer-events-none absolute left-0 right-0 z-10 border-t border-dashed border-[var(--muted)]/45"
              style={{ top: `${zeroPercent}%` }}
            >
              <span className="absolute left-1 top-1 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Entry
              </span>
            </div>

            <div
              className={activeScope === "all" ? "grid h-full pl-36 pr-64" : "mx-auto h-full w-[min(42%,220px)] min-w-[120px]"}
              style={activeScope === "all" ? { gridTemplateColumns: `repeat(${displayedTrades.length}, minmax(52px, 1fr))` } : undefined}
            >
              {displayedTrades.map((trade) => {
                const geometry = geometryByTradeNumber.get(trade.summary.tradeNumber);
                if (!geometry) return null;
                const isSelected = trade.summary.tradeNumber === activeTrade?.summary.tradeNumber;
                const inspectorOpen = hoveredTradeNumber === trade.summary.tradeNumber;
                const dimmed = activeScope === "all" && hoveredTradeNumber != null && !inspectorOpen;

                return (
                  <button
                    key={trade.summary.tradeNumber}
                    type="button"
                    aria-label={`Trade ${trade.summary.tradeNumber}; ${trade.heldCandles.length} one-minute ${trade.heldCandles.length === 1 ? "candle" : "candles"}; entry ${formatPrice(trade.excursion.entryPrice)}; MAE ${formatPrice(trade.excursion.adversePrice)}, ${formatSignedPercent(trade.excursion.adversePct)}; MFE ${formatPrice(trade.excursion.favorablePrice)}, ${formatSignedPercent(trade.excursion.favorablePct)}; exit ${formatPrice(trade.excursion.exitPrice)}, ${formatSignedPercent(trade.excursion.realizedPct)}.`}
                    aria-pressed={isSelected}
                    className={`group relative h-full cursor-pointer border-x border-transparent bg-transparent outline-none transition-opacity duration-150 focus-visible:border-[var(--accent)] ${dimmed ? "opacity-20" : "z-20 opacity-100"}`}
                    onBlur={() => setHoveredTradeNumber(null)}
                    onClick={() => {
                      setSelectedTradeNumber(trade.summary.tradeNumber);
                      setHoveredTradeNumber(trade.summary.tradeNumber);
                    }}
                    onFocus={() => setHoveredTradeNumber(trade.summary.tradeNumber)}
                    onMouseEnter={() => setHoveredTradeNumber(trade.summary.tradeNumber)}
                    onMouseLeave={() => setHoveredTradeNumber(null)}
                  >
                    <TradeStemMarks
                      excursion={trade.excursion}
                      geometry={geometry}
                      label={activeScope === "all" ? `T${trade.summary.tradeNumber}` : `Trade ${trade.summary.tradeNumber}`}
                      zeroPercent={zeroPercent}
                    />
                    {inspectorOpen ? (
                      <TradeStemAnnotations
                        geometry={geometry}
                        trade={trade}
                        zeroPercent={zeroPercent}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-2 left-5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.13em] text-[var(--red-chart)]">
            MAE · heat absorbed
          </div>
        </div>
      </div>

      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] px-4 py-2.5">
        {inspectedTrade ? (
          <p className="font-mono text-[10.5px] tabular-nums text-[var(--muted)]" aria-live="polite">
            <span className="font-semibold text-[var(--foreground)]">T{inspectedTrade.summary.tradeNumber}</span>
            <span aria-hidden="true"> · </span>
            <span className="text-[var(--red-chart)]">MAE {formatSignedPercent(inspectedTrade.excursion.adversePct)}</span>
            <span aria-hidden="true"> · </span>
            <span className="text-[var(--green-chart)]">MFE {formatSignedPercent(inspectedTrade.excursion.favorablePct)}</span>
            <span aria-hidden="true"> · </span>
            <span>Exit {formatSignedPercent(inspectedTrade.excursion.realizedPct)}</span>
          </p>
        ) : null}
        {footerAction}
      </div>
    </div>
  );
}
