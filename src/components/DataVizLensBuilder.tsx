"use client";

import { useState } from "react";
import type { TradeTapePoint } from "@/lib/preview/dataVizPrototypeData";

type XMetric = "hold" | "size" | "time";
type SizeMetric = "fixed" | "hold" | "size";
type ViewType = "scatter" | "tape";

const width = 920;
const height = 430;
const left = 66;
const right = 30;
const top = 34;
const bottom = 58;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  const scaled = rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
  return Number(scaled.toFixed(3));
}

function money(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function durationLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

function tone(value: number) {
  return value >= 0 ? "var(--green)" : "var(--red)";
}

export default function DataVizLensBuilder({ trades }: { trades: TradeTapePoint[] }) {
  const [xMetric, setXMetric] = useState<XMetric>("hold");
  const [sizeMetric, setSizeMetric] = useState<SizeMetric>("size");
  const [viewType, setViewType] = useState<ViewType>("scatter");
  const [selectedId, setSelectedId] = useState(trades[0]?.id ?? 0);
  const selectedTrade = trades.find((trade) => trade.id === selectedId) ?? trades[0];
  const effectiveXMetric: XMetric = viewType === "tape" ? "time" : xMetric;
  const y = (pnl: number) => scale(pnl, -150, 550, height - bottom, top);
  const x = (trade: TradeTapePoint) => {
    if (effectiveXMetric === "hold") return scale(Math.log10(trade.durationSeconds), Math.log10(5), Math.log10(900), left, width - right);
    if (effectiveXMetric === "size") return scale(trade.quantity, 0, 1500, left, width - right);
    return scale(trade.minute, 0, 130, left, width - right);
  };
  const radius = (trade: TradeTapePoint) => {
    if (sizeMetric === "fixed") return 6;
    if (sizeMetric === "hold") return clamp(scale(Math.log10(trade.durationSeconds), Math.log10(5), Math.log10(900), 4.5, 11), 4.5, 11);
    return clamp(scale(trade.quantity, 0, 1500, 4.5, 11), 4.5, 11);
  };
  const xTicks = effectiveXMetric === "hold"
    ? [
        { value: 10, label: "10s" },
        { value: 30, label: "30s" },
        { value: 60, label: "1m" },
        { value: 180, label: "3m" },
        { value: 600, label: "10m" },
      ]
    : effectiveXMetric === "size"
      ? [
          { value: 0, label: "0" },
          { value: 500, label: "500" },
          { value: 1000, label: "1,000" },
          { value: 1500, label: "1,500" },
        ]
      : [
          { value: 0, label: "11:29" },
          { value: 30, label: "11:59" },
          { value: 60, label: "12:29" },
          { value: 90, label: "12:59" },
          { value: 120, label: "13:29" },
        ];
  const tickX = (value: number) => {
    if (effectiveXMetric === "hold") return scale(Math.log10(value), Math.log10(5), Math.log10(900), left, width - right);
    if (effectiveXMetric === "size") return scale(value, 0, 1500, left, width - right);
    return scale(value, 0, 130, left, width - right);
  };
  const xLabel = effectiveXMetric === "hold" ? "HOLD TIME · LOG SCALE" : effectiveXMetric === "size" ? "SHARE SIZE" : "ENTRY TIME";

  const handleViewChange = (nextView: ViewType) => {
    setViewType(nextView);
  };

  return (
    <figure>
      <div className="mb-5 grid gap-3 border-b border-[var(--hairline)] pb-5 sm:grid-cols-3">
        <label className="grid gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          View
          <select value={viewType} onChange={(event) => handleViewChange(event.target.value as ViewType)} className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--background)] px-2.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--foreground)]">
            <option value="scatter">Scatter</option>
            <option value="tape">Trade tape</option>
          </select>
        </label>
        <label className="grid gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Horizontal data
          <select value={effectiveXMetric} disabled={viewType === "tape"} onChange={(event) => setXMetric(event.target.value as XMetric)} className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--background)] px-2.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50">
            <option value="hold">Hold time</option>
            <option value="size">Share size</option>
            <option value="time">Entry time</option>
          </select>
        </label>
        <label className="grid gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Dot size
          <select value={sizeMetric} onChange={(event) => setSizeMetric(event.target.value as SizeMetric)} className="h-9 rounded-[4px] border border-[var(--border)] bg-[var(--background)] px-2.5 font-sans text-[12px] font-semibold normal-case tracking-normal text-[var(--foreground)]">
            <option value="size">Share size</option>
            <option value="hold">Hold time</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label={`${viewType === "tape" ? "Trade tape" : "Scatterplot"} showing realized outcome by ${xLabel.toLowerCase()}`}>
        {[-100, 0, 250, 500].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "var(--border)" : "var(--hairline)"} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{money(tick)}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={tick.value}>
            <line x1={tickX(tick.value)} x2={tickX(tick.value)} y1={top} y2={height - bottom} stroke="var(--hairline)" />
            <text x={tickX(tick.value)} y={height - 24} textAnchor="middle" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{tick.label}</text>
          </g>
        ))}
        {trades.map((trade) => {
          const selected = trade.id === selectedTrade?.id;
          const cx = x(trade);
          const cy = y(trade.pnl);
          return (
            <g
              key={trade.id}
              role="button"
              tabIndex={0}
              aria-label={`${trade.entryTime}, ${trade.quantity} shares, ${durationLabel(trade.durationSeconds)}, ${money(trade.pnl)}`}
              onClick={() => setSelectedId(trade.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelectedId(trade.id);
              }}
              className="cursor-pointer outline-none"
            >
              {viewType === "tape" ? <line x1={cx} x2={cx} y1={y(0)} y2={cy} stroke={tone(trade.pnl)} strokeOpacity="0.24" /> : null}
              <circle cx={cx} cy={cy} r={radius(trade)} fill={tone(trade.pnl)} opacity={selected ? 1 : 0.7} stroke={selected ? "var(--blue)" : "var(--surface)"} strokeWidth={selected ? 3 : 1.5} />
            </g>
          );
        })}
        <text x={(left + width - right) / 2} y={height - 3} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="600" fontFamily="var(--font-mono)">{xLabel}</text>
        <text x="0" y="12" fill="var(--muted)" fontSize="10" fontWeight="600" fontFamily="var(--font-mono)">REALIZED P&amp;L</text>
      </svg>

      {selectedTrade ? (
        <div className="mt-3 grid grid-cols-2 gap-4 border-l-2 border-[var(--blue)] pl-3 sm:grid-cols-4">
          <div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Entry</div><div className="mt-1 font-mono text-[12px] font-semibold">{selectedTrade.entryTime}</div></div>
          <div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Hold</div><div className="mt-1 font-mono text-[12px] font-semibold">{durationLabel(selectedTrade.durationSeconds)}</div></div>
          <div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Shares</div><div className="mt-1 font-mono text-[12px] font-semibold">{selectedTrade.quantity.toLocaleString()}</div></div>
          <div><div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Outcome</div><div className="mt-1 font-mono text-[12px] font-semibold" style={{ color: tone(selectedTrade.pnl) }}>{money(selectedTrade.pnl)}</div></div>
        </div>
      ) : null}
    </figure>
  );
}
