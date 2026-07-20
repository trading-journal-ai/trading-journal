"use client";

import { useState } from "react";
import {
  scannerResponseCandidates,
  type ScannerResponseCandidate,
} from "@/lib/preview/dataVizV5Data";

const BLUE = "var(--blue)";
const RED = "var(--red)";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMin === domainMax) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function money(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function signedPercent(value: number, digits = 1) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

function pnlTone(value: number | null) {
  if (value === null || value === 0) return "var(--muted)";
  return value > 0 ? "var(--green)" : RED;
}

function decisionLabel(candidate: ScannerResponseCandidate) {
  if (candidate.decision === "chased") return "Chased ignition";
  if (candidate.decision === "no-trade") return "No trade taken";
  if (candidate.setupState === "failed") return "Patient entry · setup failed";
  return "Patient entry";
}

export function ScannerSetupField() {
  const [selectedCandidateId, setSelectedCandidateId] = useState(scannerResponseCandidates[0].id);
  const candidate = scannerResponseCandidates.find((item) => item.id === selectedCandidateId) ?? scannerResponseCandidates[0];
  const width = 1040;
  const height = 485;
  const left = 58;
  const plotRight = 745;
  const top = 62;
  const plotBottom = 300;
  const volumeTop = 334;
  const volumeBottom = 415;
  const timeY = 451;
  const minMinute = candidate.candles[0].minute;
  const maxMinute = candidate.candles.at(-1)?.minute ?? 10;
  const basePrice = candidate.candles[0].close;
  const rawMinPrice = Math.min(...candidate.candles.map((candle) => candle.low));
  const rawMaxPrice = Math.max(...candidate.candles.map((candle) => candle.high));
  const pricePadding = (rawMaxPrice - rawMinPrice) * 0.09;
  const minPrice = rawMinPrice - pricePadding;
  const maxPrice = rawMaxPrice + pricePadding;
  const priceTicks = Array.from({ length: 5 }, (_, index) => minPrice + ((maxPrice - minPrice) * index) / 4);
  const maxVolume = Math.max(...candidate.candles.map((candle) => candle.volume));
  const x = (minute: number) => scale(minute, minMinute, maxMinute, left, plotRight);
  const y = (price: number) => scale(price, minPrice, maxPrice, plotBottom, top);
  const candleStep = x(minMinute + 1) - x(minMinute);
  const candleWidth = Math.min(22, candleStep * 0.55);
  const phaseStart = candidate.pullbackStartMinute ?? 1;
  const phaseEnd = candidate.pullbackEndMinute ?? Math.min(4, maxMinute);
  const decisionTone = candidate.decision === "chased" ? RED : candidate.decision === "patient" ? BLUE : "var(--body)";
  const setupText = candidate.setupState === "formed" ? "Setup formed" : candidate.setupState === "failed" ? "Setup formed · continuation failed" : "No setup formed";
  const phaseBands = [
    { label: "FLAT", start: minMinute - 0.5, end: -0.5, fill: "color-mix(in srgb, var(--muted) 5%, transparent)" },
    { label: "IGNITION", start: -0.5, end: phaseStart - 0.5, fill: "color-mix(in srgb, var(--blue) 7%, transparent)" },
    {
      label: candidate.setupState === "never-formed" && candidate.decision === "no-trade" ? "SELLOFF" : "PULLBACK",
      start: phaseStart - 0.5,
      end: phaseEnd + 0.5,
      fill: "color-mix(in srgb, var(--muted) 9%, transparent)",
    },
  ];

  return (
    <div>
      <div className="mb-5 grid gap-4 border-y border-[var(--hairline)] py-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Captured scanner opportunities · {scannerResponseCandidates.length}</p>
          <p className="mt-2 max-w-2xl text-[12px] leading-5 text-[var(--body)]">Choose every meaningful alert from the day—including false positives—to inspect what formed before the decision.</p>
        </div>
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Opportunity</span>
          <select
            value={selectedCandidateId}
            onChange={(event) => setSelectedCandidateId(event.target.value)}
            className="h-10 w-full rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-[12px] tabular-nums text-[var(--foreground)] outline-none focus:border-[var(--blue)]"
          >
            {scannerResponseCandidates.map((item) => (
              <option key={item.id} value={item.id}>{item.alertTime} · {item.symbol} · {decisionLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
        <span><strong className="text-[var(--body)]">Candles</strong> · one minute</span>
        <span><strong className="text-[var(--body)]">Bars</strong> · volume</span>
        <span><strong className="text-[var(--blue)]">Blue rule</strong> · scanner alert</span>
        <span><strong className="text-[var(--foreground)]">White rule</strong> · setup trigger</span>
        <span><strong className="text-[var(--blue)]">Triangle</strong> · your entry</span>
      </div>

      <div className="overflow-x-auto border-y border-[var(--hairline)] bg-[var(--surface)]" aria-label="Scrollable scanner setup window">
        <div className="min-w-[940px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-labelledby="scanner-setup-title scanner-setup-desc">
            <title id="scanner-setup-title">{`${candidate.symbol} scanner alert and one-minute setup sequence`}</title>
            <desc id="scanner-setup-desc">One-minute candles and volume show the flat period, scanner ignition, pullback or selloff, setup trigger when present, and the trader entry.</desc>

            {phaseBands.map((phase) => {
              const phaseX = x(clamp(phase.start, minMinute, maxMinute));
              const phaseRight = x(clamp(phase.end, minMinute, maxMinute));
              return (
                <g key={phase.label}>
                  <rect x={phaseX} y={top - 28} width={Math.max(0, phaseRight - phaseX)} height={volumeBottom - top + 28} fill={phase.fill} />
                  <text x={(phaseX + phaseRight) / 2} y={top - 10} textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">{phase.label}</text>
                </g>
              );
            })}

            {priceTicks.map((price) => (
              <g key={price}>
                <line x1={left} x2={plotRight} y1={y(price)} y2={y(price)} stroke="var(--hairline)" strokeDasharray="3 4" />
                <text x={left - 10} y={y(price) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">{signedPercent(((price - basePrice) / basePrice) * 100)}</text>
                <text x={plotRight + 10} y={y(price) + 4} fill="var(--muted)" fontSize="10" fontFamily="var(--font-mono)">${price.toFixed(2)}</text>
              </g>
            ))}

            {candidate.candles.map((candle) => {
              const candleX = x(candle.minute);
              const openY = y(candle.open);
              const closeY = y(candle.close);
              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));
              const down = candle.close < candle.open;
              const isTrigger = candle.minute === candidate.triggerMinute;
              return (
                <g key={candle.minute}>
                  <line x1={candleX} x2={candleX} y1={y(candle.high)} y2={y(candle.low)} stroke={isTrigger ? BLUE : "var(--body)"} strokeWidth="1.2" />
                  <rect x={candleX - candleWidth / 2} y={bodyY} width={candleWidth} height={bodyHeight} fill={down ? "var(--muted)" : "var(--surface)"} stroke={isTrigger ? BLUE : "var(--body)"} strokeWidth={isTrigger ? 2 : 1.2} />
                </g>
              );
            })}

            <line x1={x(0)} x2={x(0)} y1={top - 28} y2={volumeBottom} stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 4" />
            <circle cx={x(0)} cy={top - 28} r="5" fill={BLUE} />
            <text x={x(0) + 9} y={top - 24} fill={BLUE} fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">ALERT · {candidate.alertTime}</text>

            {candidate.triggerMinute != null && candidate.triggerPrice != null ? (
              <g>
                <line x1={x(candidate.triggerMinute)} x2={x(candidate.triggerMinute)} y1={top} y2={volumeBottom} stroke="var(--foreground)" strokeWidth="1" strokeDasharray="2 4" opacity="0.75" />
                <text x={x(candidate.triggerMinute) + 8} y={top + 15} fill="var(--foreground)" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">1M HIGH BREAK · ${candidate.triggerPrice.toFixed(2)}</text>
              </g>
            ) : null}

            {candidate.entryMinute != null && candidate.entryPrice != null ? (
              <g>
                <path d={`M ${x(candidate.entryMinute)} ${y(candidate.entryPrice) - 13} L ${x(candidate.entryMinute) - 7} ${y(candidate.entryPrice) - 25} L ${x(candidate.entryMinute) + 7} ${y(candidate.entryPrice) - 25} Z`} fill={BLUE} />
                <text x={x(candidate.entryMinute)} y={y(candidate.entryPrice) - 32} textAnchor="middle" fill={BLUE} stroke="var(--surface)" strokeWidth="4" paintOrder="stroke" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">ENTRY · ${candidate.entryPrice.toFixed(2)}</text>
              </g>
            ) : null}

            {candidate.candles.map((candle) => {
              const barHeight = scale(candle.volume, 0, maxVolume, 0, volumeBottom - volumeTop);
              const emphasized = candle.minute === candidate.triggerMinute || candle.minute === 0;
              return <rect key={`volume-${candle.minute}`} x={x(candle.minute) - candleWidth / 2} y={volumeBottom - barHeight} width={candleWidth} height={barHeight} fill={emphasized ? BLUE : "var(--muted)"} opacity={emphasized ? 0.62 : 0.28} />;
            })}
            <text x={left} y={volumeTop - 10} fill="var(--muted)" fontSize="9" fontWeight="700" fontFamily="var(--font-mono)">VOLUME</text>

            {[minMinute, 0, 5, 10].filter((minute) => minute <= maxMinute).map((minute) => (
              <text key={minute} x={x(minute)} y={timeY} textAnchor={minute === minMinute ? "start" : minute === maxMinute ? "end" : "middle"} fill={minute === 0 ? BLUE : "var(--muted)"} fontSize="10" fontWeight={minute === 0 ? "700" : "400"} fontFamily="var(--font-mono)">{minute === 0 ? "ALERT" : minute > 0 ? `+${minute}m` : `${minute}m`}</text>
            ))}

            <foreignObject x={780} y={38} width={235} height={400}>
              <div className="h-full border-l border-[var(--border)] pl-5 text-[var(--body)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--blue)]">{candidate.symbol} · {candidate.alertTime}</p>
                    <p className="mt-1 text-[13px] font-semibold text-[var(--foreground)]">{setupText}</p>
                  </div>
                  <span className="text-right font-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: decisionTone }}>{decisionLabel(candidate)}</span>
                </div>
                <p className="mt-5 text-[12px] leading-5 text-[var(--body)]">{candidate.read}</p>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-[var(--hairline)] py-4">
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">At alert</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{signedPercent(candidate.moveAtAlertPct)}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">15m max</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{signedPercent(candidate.maxMovePct)}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Pullback</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{candidate.pullbackCandles > 0 ? `${candidate.pullbackCandles} × 1m` : "None before entry"}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">PB volume</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{candidate.pullbackVolumeChangePct == null ? "—" : signedPercent(candidate.pullbackVolumeChangePct, 0)}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Trigger vol.</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums text-[var(--foreground)]">{candidate.triggerVolumeMultiple == null ? "No trigger" : `${candidate.triggerVolumeMultiple.toFixed(1)}×`}</dd></div>
                  <div><dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">Outcome</dt><dd className="mt-1 font-mono text-[13px] font-semibold tabular-nums" style={{ color: pnlTone(candidate.pnl) }}>{candidate.pnl == null ? "Passed" : money(candidate.pnl)}</dd></div>
                </dl>
                <p className="mt-4 text-[10.5px] leading-4 text-[var(--muted)]">{candidate.catalyst} · RVOL {candidate.relativeVolume.toFixed(1)}×</p>
              </div>
            </foreignObject>
          </svg>
        </div>
      </div>

      <details className="mt-5 border-t border-[var(--hairline)] pt-3 text-[11px] leading-5 text-[var(--muted)]">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--body)]">Read selected opportunity as data</summary>
        <p className="mt-2">{candidate.symbol} · alert {candidate.alertTime} at ${candidate.alertPrice.toFixed(2)} · {signedPercent(candidate.moveAtAlertPct)} at alert · RVOL {candidate.relativeVolume.toFixed(1)}× · {candidate.pullbackCandles} pullback candles · trigger {candidate.triggerPrice == null ? "not formed" : `$${candidate.triggerPrice.toFixed(2)}`} · entry {candidate.entryPrice == null ? "no trade" : `$${candidate.entryPrice.toFixed(2)}`} · outcome {candidate.pnl == null ? "passed" : money(candidate.pnl)}</p>
      </details>
    </div>
  );
}
