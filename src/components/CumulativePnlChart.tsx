"use client";

import { useState } from "react";

export type PnlPoint = { label: string; value: number };
export type PnlSeries = { points: PnlPoint[]; trades: number };

const W = 720;
const H = 280;
const PAD = { top: 14, right: 16, bottom: 26, left: 52 };

function money(v: number): string {
  const s = v < 0 ? "-" : "";
  return `${s}$${Math.abs(v) >= 100 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(0)}`;
}

function Chart({ series, period }: { series: PnlSeries; period: string }) {
  if (series.trades === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-[var(--muted)]">
        No trades this {period}.
      </div>
    );
  }

  const pts = series.points;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const vals = pts.map((p) => p.value);
  let vMin = Math.min(0, ...vals);
  let vMax = Math.max(0, ...vals);
  const span = vMax - vMin || 1;
  vMin -= span * 0.08;
  vMax += span * 0.08;

  const x = (i: number) => PAD.left + (pts.length <= 1 ? plotW / 2 : (i / (pts.length - 1)) * plotW);
  const y = (v: number) => PAD.top + ((vMax - v) / (vMax - vMin)) * plotH;

  const ticks = Array.from({ length: 5 }, (_, i) => vMin + ((vMax - vMin) * i) / 4);
  const labelIdx = Array.from({ length: Math.min(5, pts.length) }, (_, i) =>
    Math.round((pts.length - 1) * (i / Math.max(1, Math.min(4, pts.length - 1)))),
  );
  const last = vals[vals.length - 1] ?? 0;
  const color = last >= 0 ? "var(--green)" : "var(--red)";
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative P&L">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--hairline)" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t) + 3.5} fill="var(--muted)" fontSize={10} fontFamily="monospace" textAnchor="end">
            {money(t)}
          </text>
        </g>
      ))}
      {vMin < 0 && vMax > 0 && (
        <line x1={PAD.left} x2={W - PAD.right} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 3" />
      )}
      {[...new Set(labelIdx)].map((idx) => (
        <text key={idx} x={x(idx)} y={H - 8} fill="var(--muted)" fontSize={10} fontFamily="monospace" textAnchor="middle">
          {pts[idx]?.label}
        </text>
      ))}
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function CumulativePnlChart({
  week,
  month,
  year,
}: {
  week: PnlSeries;
  month: PnlSeries;
  year: PnlSeries;
}) {
  const [tab, setTab] = useState<"week" | "month" | "year">("week");
  const series = tab === "week" ? week : tab === "month" ? month : year;

  return (
    <section className="border-t border-[var(--hairline)] pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Cumulative P&L</h2>
        <div className="inline-flex h-10 items-center rounded-md border border-[var(--border)] p-1">
          {(["week", "month", "year"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex h-8 min-w-16 items-center justify-center rounded px-3 text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-[var(--surface-2)] text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <Chart series={series} period={tab} />
    </section>
  );
}
