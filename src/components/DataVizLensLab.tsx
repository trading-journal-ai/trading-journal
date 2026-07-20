"use client";

// v2 "lens lab" — one synthetic trade table viewed through interactive,
// cross-filtered lenses. Hand-rolled SVG only; theme comes from CSS variables.
import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  lensTrades,
  lensWeekRanges,
  marketVolumeCurve,
  minuteLabel,
  type LensTrade,
} from "@/lib/preview/dataVizV2Data";
import { rxtContextCandles, rxtContextTrades } from "@/lib/preview/dataVizPrototypeData";

/* ---------- shared helpers ---------- */

const GREEN = "var(--green)";
const RED = "var(--red)";
const ACCENT = "var(--accent)";

function money(value: number, compact = false) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  if (compact && abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

function pnlColor(value: number) {
  return value > 0 ? GREEN : value < 0 ? RED : "var(--muted)";
}

function holdLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function scale(value: number, d0: number, d1: number, r0: number, r1: number) {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Scope = { kind: "month" } | { kind: "week" } | { kind: "day"; day: number };
type Outcome = "all" | "wins" | "losses";

function scopeDays(scope: Scope): number[] | null {
  if (scope.kind === "month") return null;
  if (scope.kind === "week") return [...lensWeekRanges[2].days];
  return [scope.day];
}

function scopeLabel(scope: Scope) {
  if (scope.kind === "month") return "July 2026";
  if (scope.kind === "week") return "Week · Jul 13–17";
  return `Day · Jul ${scope.day}`;
}

/* ---------- tooltip primitives ---------- */

type TipState = { x: number; y: number; body: ReactNode } | null;

function LensTooltip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-5 shadow-lg"
      style={{ left: clamp(tip.x, 8, 9999), top: tip.y, transform: tip.x > 480 ? "translate(-100%, 8px)" : "translate(12px, 8px)" }}
    >
      {tip.body}
    </div>
  );
}

function TipRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono font-semibold tabular-nums" style={{ color: tone ?? "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

function TradeTipBody({ trade }: { trade: LensTrade }) {
  return (
    <div className="grid gap-0.5">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span className="font-semibold text-[var(--foreground)]">
          {trade.symbol} · Jul {trade.day}
        </span>
        <span className="font-mono font-semibold" style={{ color: pnlColor(trade.pnl) }}>
          {money(trade.pnl)}
        </span>
      </div>
      <TipRow label="Entry" value={`${trade.time} ET`} />
      <TipRow label="Held" value={holdLabel(trade.holdSeconds)} />
      <TipRow label="Shares" value={trade.shares.toLocaleString()} />
      <TipRow label="Rel. volume" value={`${trade.relVol.toFixed(1)}×`} />
      <TipRow label="Setup" value={trade.setup ?? "Untagged"} />
    </div>
  );
}

/* ---------- lens card chrome ---------- */

function LensCard({
  eyebrow,
  title,
  children,
  aside,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{eyebrow}</div>
          <h2 className="mt-1 text-[15px] font-semibold leading-6 text-[var(--foreground)]">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function LegendChip({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      {swatch}
      {label}
    </span>
  );
}

function Dot({ color, hollow = false }: { color: string; hollow?: boolean }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={hollow ? { border: `2px solid ${color}` } : { background: color }}
    />
  );
}

/* ---------- stat header ---------- */

function StatHeader({ trades, scope }: { trades: LensTrade[]; scope: Scope }) {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const net = trades.reduce((a, t) => a + t.pnl, 0);
  const grossWin = wins.reduce((a, t) => a + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const pf = grossLoss ? grossWin / grossLoss : null;
  const medHold = (list: LensTrade[]) => {
    if (!list.length) return null;
    const sorted = [...list].sort((a, b) => a.holdSeconds - b.holdSeconds);
    return sorted[Math.floor(sorted.length / 2)].holdSeconds;
  };
  const mhW = medHold(wins);
  const mhL = medHold(losses);

  const tiles = [
    { label: "Trades", value: String(trades.length), detail: `${wins.length}W / ${losses.length}L` },
    { label: "Win rate", value: trades.length ? `${Math.round((wins.length / trades.length) * 100)}%` : "—", detail: "of closed trades" },
    { label: "Profit factor", value: pf == null ? "—" : pf.toFixed(2), detail: `${money(grossWin, true)} vs ${money(-grossLoss, true)}` },
    {
      label: "Avg win / loss",
      value: wins.length && losses.length ? `${money(grossWin / wins.length)} / ${money(-grossLoss / losses.length)}` : "—",
      detail: "payoff shape",
    },
    {
      label: "Hold W / L",
      value: mhW != null && mhL != null ? `${holdLabel(mhW)} / ${holdLabel(mhL)}` : "—",
      detail: mhW != null && mhL != null && mhW < mhL ? "winners cut faster" : "hold symmetry",
    },
  ];

  return (
    <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] sm:p-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{scopeLabel(scope)} · net P&L</div>
        <div className="mt-1 text-[44px] font-semibold leading-none" style={{ color: pnlColor(net) }}>
          {money(net)}
        </div>
        <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
          Synthetic preview data. Every lens below derives from the same {trades.length}-trade slice, so the views always agree.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] px-3 py-3">
            <div className="text-[11px] text-[var(--muted)]">{tile.label}</div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--foreground)]">{tile.value}</div>
            <div className="mt-0.5 text-[10.5px] text-[var(--muted)]">{tile.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- lens 1: session rhythm (time-of-day, three aligned tracks) ---------- */

const RHYTHM_BINS = marketVolumeCurve.length; // 22 × 15-minute bins, 07:00–12:30

function SessionRhythm({ trades }: { trades: LensTrade[] }) {
  const [tip, setTip] = useState<TipState>(null);
  const [binIdx, setBinIdx] = useState<number | null>(null);

  const bins = useMemo(() => {
    return marketVolumeCurve.map((curve, i) => {
      const inBin = trades.filter((t) => Math.floor(t.minute / 15) === i);
      const net = inBin.reduce((a, t) => a + t.pnl, 0);
      const wins = inBin.filter((t) => t.pnl > 0).length;
      return {
        label: curve.label,
        millions: curve.millions,
        trades: inBin.length,
        net,
        exp: inBin.length ? net / inBin.length : null,
        winRate: inBin.length ? Math.round((wins / inBin.length) * 100) : null,
        avgRelVol: inBin.length ? inBin.reduce((a, t) => a + t.relVol, 0) / inBin.length : null,
      };
    });
  }, [trades]);

  const W = 960;
  const PAD = 46;
  const plotW = W - PAD - 12;
  const bw = plotW / RHYTHM_BINS;
  const maxExp = Math.max(60, ...bins.map((b) => Math.abs(b.exp ?? 0)));
  const maxCount = Math.max(3, ...bins.map((b) => b.trades));
  const maxVol = Math.max(...bins.map((b) => b.millions));

  // Track bands inside one SVG so a single crosshair spans all three.
  const expBand = { top: 18, h: 96, mid: 18 + 48 };
  const cntBand = { top: 138, h: 64 };
  const volBand = { top: 226, h: 54 };
  const H = 312;

  const xOf = (i: number) => PAD + i * bw + bw / 2;

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = clamp(Math.floor((px - PAD) / bw), 0, RHYTHM_BINS - 1);
    setBinIdx(i);
    const b = bins[i];
    setTip({
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
      body: (
        <div className="grid gap-0.5">
          <div className="mb-1 font-semibold text-[var(--foreground)]">
            {b.label}–{minuteLabel(Math.min(330, (bins.indexOf(b) + 1) * 15))} ET
          </div>
          <TipRow label="Trades" value={String(b.trades)} />
          <TipRow label="Net P&L" value={b.trades ? money(b.net) : "—"} tone={b.trades ? pnlColor(b.net) : undefined} />
          <TipRow label="Expectancy" value={b.exp == null ? "—" : `${money(b.exp)} / trade`} tone={b.exp == null ? undefined : pnlColor(b.exp)} />
          <TipRow label="Win rate" value={b.winRate == null ? "—" : `${b.winRate}%`} />
          <TipRow label="Avg rel. volume" value={b.avgRelVol == null ? "—" : `${b.avgRelVol.toFixed(1)}×`} />
          <TipRow label="Market volume" value={`${b.millions.toFixed(1)}M shares`} />
        </div>
      ),
    });
  }

  return (
    <LensCard
      eyebrow="Lens 01 · time of day"
      title="The morning carries the edge; the tape's volume tide shows why."
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <LegendChip swatch={<Dot color={GREEN} />} label="expectancy +" />
          <LegendChip swatch={<Dot color={RED} />} label="expectancy −" />
          <LegendChip swatch={<span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: ACCENT }} />} label="trade count" />
          <LegendChip swatch={<span className="inline-block h-1 w-4 rounded" style={{ background: "var(--muted)" }} />} label="market volume" />
        </div>
      }
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Expectancy, trade count, and market volume by 15-minute bin"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setTip(null);
            setBinIdx(null);
          }}
        >
          {/* crosshair */}
          {binIdx != null ? (
            <rect x={PAD + binIdx * bw} y={10} width={bw} height={H - 34} fill="var(--hairline)" rx={3} />
          ) : null}

          {/* track labels */}
          <text x={0} y={expBand.top + 6} className="fill-[var(--muted)]" fontSize={10}>
            $ / trade
          </text>
          <text x={0} y={cntBand.top + 8} className="fill-[var(--muted)]" fontSize={10}>
            trades
          </text>
          <text x={0} y={volBand.top + 8} className="fill-[var(--muted)]" fontSize={10}>
            volume
          </text>

          {/* expectancy track: zero baseline + dots above/below */}
          <line x1={PAD} x2={W - 8} y1={expBand.mid} y2={expBand.mid} stroke="var(--hairline)" />
          {bins.map((b, i) =>
            b.exp == null ? null : (
              <circle
                key={`e${i}`}
                cx={xOf(i)}
                cy={expBand.mid - scale(b.exp, -maxExp, maxExp, -expBand.h / 2, expBand.h / 2)}
                r={5}
                fill={pnlColor(b.exp)}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ),
          )}

          {/* count track: thin columns */}
          <line x1={PAD} x2={W - 8} y1={cntBand.top + cntBand.h} y2={cntBand.top + cntBand.h} stroke="var(--hairline)" />
          {bins.map((b, i) => {
            if (!b.trades) return null;
            const h = scale(b.trades, 0, maxCount, 0, cntBand.h - 6);
            return (
              <rect
                key={`c${i}`}
                x={xOf(i) - Math.min(9, bw / 2 - 2)}
                y={cntBand.top + cntBand.h - h}
                width={Math.min(18, bw - 4)}
                height={h}
                rx={3}
                fill={ACCENT}
                opacity={0.85}
              />
            );
          })}

          {/* volume track: area wash + 2px line */}
          {(() => {
            const pts = bins.map((b, i) => `${xOf(i)},${volBand.top + volBand.h - scale(b.millions, 0, maxVol, 0, volBand.h - 4)}`);
            const base = volBand.top + volBand.h;
            return (
              <g>
                <polygon
                  points={`${PAD},${base} ${pts.join(" ")} ${xOf(RHYTHM_BINS - 1)},${base}`}
                  fill="var(--muted)"
                  opacity={0.12}
                />
                <polyline points={pts.join(" ")} fill="none" stroke="var(--muted)" strokeWidth={2} strokeLinejoin="round" />
              </g>
            );
          })()}
          <line x1={PAD} x2={W - 8} y1={volBand.top + volBand.h} y2={volBand.top + volBand.h} stroke="var(--hairline)" />

          {/* x axis */}
          {[0, 4, 8, 10, 12, 16, 20].map((i) => (
            <text key={i} x={xOf(i)} y={H - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
              {bins[i].label}
            </text>
          ))}
          <text x={xOf(10)} y={12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
            09:30 open ↓
          </text>
        </svg>
        <LensTooltip tip={tip} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        Three aligned tracks, one clock: dollars per trade, attempt count, and the market&apos;s volume tide. Hover any column for the full
        readout of that 15-minute window.
      </p>
    </LensCard>
  );
}

/* ---------- lens 2 + 3: constellation & sequence (cross-highlighted) ---------- */

const HOLD_TICKS = [
  { s: 10, label: "10s" },
  { s: 30, label: "30s" },
  { s: 60, label: "1m" },
  { s: 180, label: "3m" },
  { s: 600, label: "10m" },
];

function Constellation({
  trades,
  hoveredId,
  setHoveredId,
}: {
  trades: LensTrade[];
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
}) {
  const [tip, setTip] = useState<TipState>(null);

  const W = 960;
  const H = 380;
  const PAD = { l: 52, r: 16, t: 20, b: 34 };
  const maxAbs = Math.max(100, ...trades.map((t) => Math.abs(t.pnl)));
  const logX = (s: number) => scale(Math.log10(clamp(s, 5, 1200)), Math.log10(5), Math.log10(1200), PAD.l, W - PAD.r);
  const yOf = (pnl: number) => scale(pnl, -maxAbs, maxAbs, H - PAD.b, PAD.t);
  const rOf = (shares: number) => scale(shares, 100, 1400, 4, 10);
  const midY = yOf(0);

  const placed = trades.map((t) => ({ t, x: logX(t.holdSeconds), y: yOf(t.pnl), r: rOf(t.shares) }));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: (typeof placed)[number] | null = null;
    let bestD = 30; // generous nearest-point radius, no dead-center aiming
    for (const p of placed) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) {
      setHoveredId(best.t.id);
      setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, body: <TradeTipBody trade={best.t} /> });
    } else {
      setHoveredId(null);
      setTip(null);
    }
  }

  return (
    <LensCard
      eyebrow="Lens 02 · hold time × outcome"
      title="Every trade as a star: how long you held, what it paid, how big you were."
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <LegendChip swatch={<Dot color={GREEN} />} label="win" />
          <LegendChip swatch={<Dot color={RED} />} label="loss" />
          <LegendChip
            swatch={
              <span className="inline-flex items-end gap-0.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--muted)]" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--muted)]" />
              </span>
            }
            label="dot size = shares"
          />
        </div>
      }
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Scatter of hold time versus P&L, dot size by share count"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setHoveredId(null);
            setTip(null);
          }}
        >
          {/* grid */}
          {HOLD_TICKS.map((tick) => (
            <g key={tick.s}>
              <line x1={logX(tick.s)} x2={logX(tick.s)} y1={PAD.t} y2={H - PAD.b} stroke="var(--hairline)" />
              <text x={logX(tick.s)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                {tick.label}
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={midY} y2={midY} stroke="var(--border)" />
          <text x={8} y={PAD.t + 10} className="fill-[var(--muted)]" fontSize={10}>
            {money(maxAbs, true)}
          </text>
          <text x={8} y={midY + 3} className="fill-[var(--muted)]" fontSize={10}>
            $0
          </text>
          <text x={8} y={H - PAD.b} className="fill-[var(--muted)]" fontSize={10}>
            {money(-maxAbs, true)}
          </text>

          {/* quadrant whispers */}
          <text x={PAD.l + 8} y={PAD.t + 12} className="fill-[var(--muted)]" fontSize={10} opacity={0.8}>
            quick hits
          </text>
          <text x={W - PAD.r - 8} y={PAD.t + 12} textAnchor="end" className="fill-[var(--muted)]" fontSize={10} opacity={0.8}>
            held winners
          </text>
          <text x={W - PAD.r - 8} y={H - PAD.b - 8} textAnchor="end" className="fill-[var(--muted)]" fontSize={10} opacity={0.8}>
            slow bleed
          </text>
          <text x={PAD.l + 8} y={H - PAD.b - 8} className="fill-[var(--muted)]" fontSize={10} opacity={0.8}>
            fast stops
          </text>

          {placed.map((p) => {
            const active = hoveredId === p.t.id;
            const dimmed = hoveredId != null && !active;
            return (
              <circle
                key={p.t.id}
                cx={p.x}
                cy={p.y}
                r={active ? p.r + 2 : p.r}
                fill={pnlColor(p.t.pnl)}
                opacity={dimmed ? 0.3 : 0.9}
                stroke={active ? ACCENT : "var(--surface)"}
                strokeWidth={2}
              />
            );
          })}
        </svg>
        <LensTooltip tip={tip} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        Hold time runs on a log clock — a 10-second scalp and a 10-minute hold both get room. Hover a star to reveal the trade; the same
        trade lights up in the sequence below.
      </p>
    </LensCard>
  );
}

function SequenceStrip({
  trades,
  hoveredId,
  setHoveredId,
}: {
  trades: LensTrade[];
  hoveredId: number | null;
  setHoveredId: (id: number | null) => void;
}) {
  const [tip, setTip] = useState<TipState>(null);

  const ordered = trades; // already chronological
  const W = 960;
  const H = 168;
  const PAD = { l: 12, r: 12, t: 26, b: 30 };
  const mid = PAD.t + (H - PAD.t - PAD.b) / 2;
  const n = Math.max(1, ordered.length);
  const step = (W - PAD.l - PAD.r) / n;
  const bw = clamp(step - 3, 2.5, 14);
  const maxMag = Math.max(60, ...ordered.map((t) => Math.abs(t.pnl)));
  const hOf = (pnl: number) => scale(Math.sqrt(Math.abs(pnl)), 0, Math.sqrt(maxMag), 2, mid - PAD.t - 2);

  // session boundaries for day separators
  const separators: { x: number; day: number }[] = [];
  ordered.forEach((t, i) => {
    if (i === 0 || t.day !== ordered[i - 1].day) separators.push({ x: PAD.l + i * step, day: t.day });
  });

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = clamp(Math.floor((px - PAD.l) / step), 0, n - 1);
    const t = ordered[i];
    if (!t) return;
    setHoveredId(t.id);
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, body: <TradeTipBody trade={t} /> });
  }

  return (
    <LensCard
      eyebrow="Lens 03 · the tape of you"
      title="Every trade in the order you took it — streaks, resets, and size creep."
    >
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Chronological trade sequence, wins above and losses below the line"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setHoveredId(null);
            setTip(null);
          }}
        >
          <line x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} stroke="var(--border)" />
          {separators.map((s) => (
            <g key={s.day}>
              <line x1={s.x - 1.5} x2={s.x - 1.5} y1={PAD.t - 6} y2={H - PAD.b + 6} stroke="var(--hairline)" />
              <text x={s.x + 2} y={14} className="fill-[var(--muted)]" fontSize={10}>
                {s.day}
              </text>
            </g>
          ))}
          {ordered.map((t, i) => {
            const x = PAD.l + i * step + (step - bw) / 2;
            const h = hOf(t.pnl);
            const active = hoveredId === t.id;
            const dimmed = hoveredId != null && !active;
            return (
              <rect
                key={t.id}
                x={x}
                y={t.pnl >= 0 ? mid - h : mid}
                width={bw}
                height={h}
                rx={1.5}
                fill={pnlColor(t.pnl)}
                opacity={dimmed ? 0.3 : 0.9}
                stroke={active ? ACCENT : "none"}
                strokeWidth={active ? 1.5 : 0}
              />
            );
          })}
          <text x={PAD.l} y={H - 8} className="fill-[var(--muted)]" fontSize={10}>
            wins above · losses below · bar height ∝ √|P&L| · labels are day of month
          </text>
        </svg>
        <LensTooltip tip={tip} />
      </div>
    </LensCard>
  );
}

/* ---------- lens 4: winners vs losers mirror ---------- */

const MIRROR_BUCKETS = [
  { min: 0, max: 50, label: "< $50" },
  { min: 50, max: 100, label: "$50–100" },
  { min: 100, max: 200, label: "$100–200" },
  { min: 200, max: 400, label: "$200–400" },
  { min: 400, max: 800, label: "$400–800" },
  { min: 800, max: Infinity, label: "$800+" },
];

function MirrorHistogram({ trades, scope, monthTrades }: { trades: LensTrade[]; scope: Scope; monthTrades: LensTrade[] }) {
  const [tip, setTip] = useState<TipState>(null);

  function bucketize(list: LensTrade[]) {
    const wins = MIRROR_BUCKETS.map(() => ({ gross: 0, count: 0 }));
    const losses = MIRROR_BUCKETS.map(() => ({ gross: 0, count: 0 }));
    for (const t of list) {
      const mag = Math.abs(t.pnl);
      const bi = MIRROR_BUCKETS.findIndex((b) => mag >= b.min && mag < b.max);
      if (bi < 0) continue;
      const side = t.pnl > 0 ? wins : t.pnl < 0 ? losses : null;
      if (!side) continue;
      side[bi].gross += mag;
      side[bi].count += 1;
    }
    const gw = wins.reduce((a, b) => a + b.gross, 0) || 1;
    const gl = losses.reduce((a, b) => a + b.gross, 0) || 1;
    return {
      wins: wins.map((b) => ({ ...b, share: b.gross / gw })),
      losses: losses.map((b) => ({ ...b, share: b.gross / gl })),
    };
  }

  const cur = useMemo(() => bucketize(trades), [trades]);
  const ghost = useMemo(() => bucketize(monthTrades), [monthTrades]);
  const showGhost = scope.kind !== "month";

  const W = 760;
  const rowH = 34;
  const H = MIRROR_BUCKETS.length * rowH + 46;
  const CENTER = W / 2;
  const GAP = 58; // center label column
  const maxShare = Math.max(0.25, ...cur.wins.map((b) => b.share), ...cur.losses.map((b) => b.share), ...(showGhost ? [...ghost.wins, ...ghost.losses].map((b) => b.share) : []));
  const len = (share: number) => scale(share, 0, maxShare, 0, CENTER - GAP / 2 - 62);

  function barTip(e: PointerEvent<SVGRectElement>, side: "win" | "loss", bi: number) {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const b = side === "win" ? cur.wins[bi] : cur.losses[bi];
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      body: (
        <div className="grid gap-0.5">
          <div className="mb-1 font-semibold text-[var(--foreground)]">
            {side === "win" ? "Wins" : "Losses"} · {MIRROR_BUCKETS[bi].label}
          </div>
          <TipRow label="Trades" value={String(b.count)} />
          <TipRow label="Gross" value={money(side === "win" ? b.gross : -b.gross)} tone={side === "win" ? GREEN : RED} />
          <TipRow label="Share of side" value={`${Math.round(b.share * 100)}%`} />
          {showGhost ? (
            <TipRow
              label="Full-July shape"
              value={`${Math.round((side === "win" ? ghost.wins[bi] : ghost.losses[bi]).share * 100)}%`}
            />
          ) : null}
        </div>
      ),
    });
  }

  const biggestWin = cur.wins.reduce((m, b, i) => (b.share > cur.wins[m].share ? i : m), 0);
  const biggestLoss = cur.losses.reduce((m, b, i) => (b.share > cur.losses[m].share ? i : m), 0);

  return (
    <LensCard
      eyebrow="Lens 04 · win & loss anatomy"
      title="Where the dollars actually live, by trade size — losses left, wins right."
      aside={
        showGhost ? (
          <LegendChip
            swatch={<span className="inline-block h-2.5 w-4 rounded-sm border border-[var(--muted)]" />}
            label="outline = full July shape"
          />
        ) : null
      }
    >
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[760px]" role="img" aria-label="Mirrored histogram of gross wins and losses by magnitude bucket">
          <text x={CENTER - GAP / 2 - 4} y={16} textAnchor="end" className="fill-[var(--muted)]" fontSize={11}>
            ← share of gross losses
          </text>
          <text x={CENTER + GAP / 2 + 4} y={16} className="fill-[var(--muted)]" fontSize={11}>
            share of gross wins →
          </text>
          {MIRROR_BUCKETS.map((bucket, bi) => {
            const y = 28 + bi * rowH;
            const wl = len(cur.wins[bi].share);
            const ll = len(cur.losses[bi].share);
            return (
              <g key={bucket.label}>
                <text x={CENTER} y={y + rowH / 2 + 3} textAnchor="middle" className="fill-[var(--muted)]" fontSize={11}>
                  {bucket.label}
                </text>
                {/* ghost outlines */}
                {showGhost ? (
                  <>
                    <rect
                      x={CENTER + GAP / 2}
                      y={y + 5}
                      width={len(ghost.wins[bi].share)}
                      height={rowH - 12}
                      rx={4}
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth={1}
                      opacity={0.55}
                    />
                    <rect
                      x={CENTER - GAP / 2 - len(ghost.losses[bi].share)}
                      y={y + 5}
                      width={len(ghost.losses[bi].share)}
                      height={rowH - 12}
                      rx={4}
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth={1}
                      opacity={0.55}
                    />
                  </>
                ) : null}
                {/* bars — hit area is the full half-row, not just the paint */}
                <rect
                  x={CENTER + GAP / 2}
                  y={y + 7}
                  width={Math.max(cur.wins[bi].count ? 3 : 0, wl)}
                  height={rowH - 16}
                  rx={4}
                  fill={GREEN}
                  opacity={0.9}
                />
                <rect
                  x={CENTER - GAP / 2 - Math.max(cur.losses[bi].count ? 3 : 0, ll)}
                  y={y + 7}
                  width={Math.max(cur.losses[bi].count ? 3 : 0, ll)}
                  height={rowH - 16}
                  rx={4}
                  fill={RED}
                  opacity={0.9}
                />
                {bi === biggestWin && cur.wins[bi].count ? (
                  <text x={CENTER + GAP / 2 + wl + 6} y={y + rowH / 2 + 3} className="fill-[var(--body)]" fontSize={11} fontWeight={600}>
                    {money(cur.wins[bi].gross, true)}
                  </text>
                ) : null}
                {bi === biggestLoss && cur.losses[bi].count ? (
                  <text x={CENTER - GAP / 2 - ll - 6} y={y + rowH / 2 + 3} textAnchor="end" className="fill-[var(--body)]" fontSize={11} fontWeight={600}>
                    {money(-cur.losses[bi].gross, true)}
                  </text>
                ) : null}
                <rect
                  x={CENTER + GAP / 2}
                  y={y}
                  width={CENTER - GAP / 2}
                  height={rowH}
                  fill="transparent"
                  onPointerMove={(e) => barTip(e, "win", bi)}
                  onPointerLeave={() => setTip(null)}
                />
                <rect
                  x={0}
                  y={y}
                  width={CENTER - GAP / 2}
                  height={rowH}
                  fill="transparent"
                  onPointerMove={(e) => barTip(e, "loss", bi)}
                  onPointerLeave={() => setTip(null)}
                />
              </g>
            );
          })}
        </svg>
        <LensTooltip tip={tip} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        Bars show each bucket&apos;s share of that side&apos;s gross dollars, so a day and the month compare by <em>shape</em>. When scoped to a
        week or day, the faint outline keeps July&apos;s silhouette behind it — the compare-and-contrast is built in.
      </p>
    </LensCard>
  );
}

/* ---------- lens 5: calendar rollup with inspector ---------- */

function CalendarRollup({
  scope,
  setScope,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
}) {
  const byDay = useMemo(() => {
    const map = new Map<number, LensTrade[]>();
    for (const t of lensTrades) {
      const list = map.get(t.day) ?? [];
      list.push(t);
      map.set(t.day, list);
    }
    return map;
  }, []);

  const [inspected, setInspected] = useState<number>(9);
  const maxAbs = Math.max(...[...byDay.values()].map((list) => Math.abs(list.reduce((a, t) => a + t.pnl, 0))));

  const monthNet = lensTrades.reduce((a, t) => a + t.pnl, 0);
  const greenDays = [...byDay.values()].filter((l) => l.reduce((a, t) => a + t.pnl, 0) > 0).length;

  const inspectedTrades = byDay.get(inspected) ?? [];
  const iNet = inspectedTrades.reduce((a, t) => a + t.pnl, 0);
  const iWins = inspectedTrades.filter((t) => t.pnl > 0);
  const iBest = inspectedTrades.reduce((m, t) => (t.pnl > m.pnl ? t : m), inspectedTrades[0]);
  const iWorst = inspectedTrades.reduce((m, t) => (t.pnl < m.pnl ? t : m), inspectedTrades[0]);

  return (
    <LensCard
      eyebrow="Lens 05 · day → week → month"
      title="One month, three altitudes: days as heat, weeks as subtotals, the month as the sum."
      aside={<span className="text-[11px] text-[var(--muted)]">Click a day to scope every lens to it</span>}
    >
      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_78px] gap-1.5 text-center text-[11px] text-[var(--muted)]">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
              <div key={d} className="pb-1">{d}</div>
            ))}
            <div className="pb-1">Week</div>
            {lensWeekRanges.map((week) => {
              const weekTrades = week.days.flatMap((d) => byDay.get(d) ?? []);
              const weekNet = weekTrades.reduce((a, t) => a + t.pnl, 0);
              // pad the first week (starts Wednesday)
              const pad = week === lensWeekRanges[0] ? 2 : 0;
              return (
                <div key={week.label} className="contents">
                  {Array.from({ length: pad }, (_, i) => (
                    <div key={`pad${i}`} />
                  ))}
                  {week.days.map((day) => {
                    const list = byDay.get(day) ?? [];
                    const net = list.reduce((a, t) => a + t.pnl, 0);
                    const alpha = 0.1 + 0.4 * (Math.abs(net) / maxAbs);
                    const isScoped = scope.kind === "day" && scope.day === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onPointerEnter={() => setInspected(day)}
                        onFocus={() => setInspected(day)}
                        onClick={() => setScope(isScoped ? { kind: "month" } : { kind: "day", day })}
                        aria-label={`July ${day}: ${money(net)} across ${list.length} trades`}
                        className={`rounded-lg border px-1 py-2.5 text-center transition-colors ${
                          isScoped ? "border-[var(--accent)]" : inspected === day ? "border-[var(--muted)]" : "border-[var(--hairline)]"
                        }`}
                        style={{
                          backgroundColor:
                            net > 0
                              ? `color-mix(in srgb, var(--green) ${Math.round(alpha * 100)}%, transparent)`
                              : `color-mix(in srgb, var(--red) ${Math.round(alpha * 100)}%, transparent)`,
                        }}
                      >
                        <div className="text-[11px] font-semibold text-[var(--foreground)]">{day}</div>
                        <div className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--body)]">{money(net, true)}</div>
                      </button>
                    );
                  })}
                  <div className="flex flex-col items-end justify-center rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] px-2 py-2.5">
                    <div className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: pnlColor(weekNet) }}>
                      {money(weekNet, true)}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">{weekTrades.length} trades</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-[var(--hairline)] pt-3 text-[12px]">
            <span className="text-[var(--muted)]">
              July · {greenDays} green / {byDay.size - greenDays} red days
            </span>
            <span className="font-mono text-[14px] font-semibold tabular-nums" style={{ color: pnlColor(monthNet) }}>
              {money(monthNet)}
            </span>
          </div>
        </div>

        {/* inspector — a fixed home for hover detail, nothing jumps */}
        <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-2)] p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
            {inspectedTrades[0] ? `${inspectedTrades[0].weekday} · Jul ${inspected}` : `Jul ${inspected}`}
          </div>
          <div className="mt-1 text-[26px] font-semibold" style={{ color: pnlColor(iNet) }}>
            {money(iNet)}
          </div>
          <div className="mt-3 grid gap-1.5 text-[12px]">
            <TipRow label="Trades" value={`${inspectedTrades.length} (${iWins.length}W / ${inspectedTrades.length - iWins.length}L)`} />
            <TipRow
              label="Win rate"
              value={inspectedTrades.length ? `${Math.round((iWins.length / inspectedTrades.length) * 100)}%` : "—"}
            />
            {iBest ? <TipRow label="Best trade" value={`${iBest.symbol} ${money(iBest.pnl)}`} tone={GREEN} /> : null}
            {iWorst && iWorst.pnl < 0 ? <TipRow label="Worst trade" value={`${iWorst.symbol} ${money(iWorst.pnl)}`} tone={RED} /> : null}
            <TipRow
              label="Most traded"
              value={
                inspectedTrades.length
                  ? [...inspectedTrades.reduce((m, t) => m.set(t.symbol, (m.get(t.symbol) ?? 0) + 1), new Map<string, number>())].sort(
                      (a, b) => b[1] - a[1],
                    )[0][0]
                  : "—"
              }
            />
            <TipRow
              label="First / last entry"
              value={inspectedTrades.length ? `${inspectedTrades[0].time} – ${inspectedTrades[inspectedTrades.length - 1].time}` : "—"}
            />
          </div>
        </div>
      </div>
    </LensCard>
  );
}

/* ---------- lens 6: relative volume vs outcome ---------- */

const VOL_BINS = [
  { min: 0, max: 1, label: "< 1×" },
  { min: 1, max: 2, label: "1–2×" },
  { min: 2, max: 4, label: "2–4×" },
  { min: 4, max: Infinity, label: "4×+" },
];

function VolumeLens({ trades }: { trades: LensTrade[] }) {
  const rows = VOL_BINS.map((bin) => {
    const inBin = trades.filter((t) => t.relVol >= bin.min && t.relVol < bin.max);
    const wins = inBin.filter((t) => t.pnl > 0).length;
    const net = inBin.reduce((a, t) => a + t.pnl, 0);
    return {
      ...bin,
      count: inBin.length,
      winRate: inBin.length ? Math.round((wins / inBin.length) * 100) : null,
      exp: inBin.length ? net / inBin.length : null,
      net,
    };
  });
  const maxExp = Math.max(40, ...rows.map((r) => Math.abs(r.exp ?? 0)));

  return (
    <LensCard
      eyebrow="Lens 06 · volume at entry"
      title="Does the tape have to be moving for you to get paid?"
    >
      <div className="mt-4 grid gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[64px_minmax(0,1fr)_190px] items-center gap-3">
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{row.label}</div>
            <div className="relative h-7">
              {/* diverging bar from the center */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
              {row.exp != null ? (
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    background: pnlColor(row.exp),
                    opacity: 0.9,
                    left: row.exp >= 0 ? "50%" : `${50 - (Math.abs(row.exp) / maxExp) * 48}%`,
                    width: `${(Math.abs(row.exp) / maxExp) * 48}%`,
                  }}
                />
              ) : (
                <div className="absolute inset-y-2 left-1/2 -translate-x-1/2 text-[11px] text-[var(--muted)]">no trades</div>
              )}
            </div>
            <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)]">
              {row.exp == null ? "—" : (
                <>
                  <span style={{ color: pnlColor(row.exp) }} className="font-semibold">{money(row.exp)}</span>
                  <span className="text-[var(--muted)]"> /t · {row.winRate}% · n={row.count}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        Trades bucketed by relative volume at entry. Expectancy diverges from the center line — right of center pays, left of center
        costs. Small buckets are directional, not proof.
      </p>
    </LensCard>
  );
}

/* ---------- lens 7: tape silhouette (candle range × volume, trades overlaid) ---------- */

function TapeSilhouette() {
  const [tip, setTip] = useState<TipState>(null);
  const [hotMinute, setHotMinute] = useState<number | null>(null);

  const W = 960;
  const H = 260;
  const PAD = { l: 46, r: 12, t: 16, b: 28 };
  const candles = rxtContextCandles;
  const minP = Math.min(...candles.map((c) => c.low));
  const maxP = Math.max(...candles.map((c) => c.high));
  const maxV = Math.max(...candles.map((c) => c.volume));
  const xOf = (minute: number) => scale(minute, 0, 380, PAD.l, W - PAD.r);
  const yOf = (price: number) => scale(price, minP, maxP, H - PAD.b, PAD.t);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const minute = clamp(Math.round(scale(px, PAD.l, W - PAD.r, 0, 380) / 10) * 10, 0, 380);
    const candle = candles.find((c) => c.minute === minute);
    if (!candle) return;
    setHotMinute(minute);
    const inWindow = rxtContextTrades.filter((t) => t.entryMinute >= minute && t.entryMinute < minute + 10);
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      body: (
        <div className="grid gap-0.5">
          <div className="mb-1 font-semibold text-[var(--foreground)]">
            RXT · {minuteLabel(minute + 150)}–{minuteLabel(minute + 160)} ET
          </div>
          <TipRow label="Range" value={`$${candle.low.toFixed(2)} – $${candle.high.toFixed(2)}`} />
          <TipRow
            label="Direction"
            value={`${candle.close >= candle.open ? "up" : "down"} ${Math.abs(((candle.close - candle.open) / candle.open) * 100).toFixed(1)}%`}
            tone={candle.close >= candle.open ? GREEN : RED}
          />
          <TipRow label="Volume" value={`${(candle.volume / 1e6).toFixed(2)}M`} />
          {inWindow.length ? (
            <div className="mt-1 border-t border-[var(--hairline)] pt-1">
              {inWindow.map((t) => (
                <TipRow
                  key={t.id}
                  label={`${t.quantity.toLocaleString()} sh @ $${t.entryPrice.toFixed(2)}`}
                  value={money(t.pnl)}
                  tone={pnlColor(t.pnl)}
                />
              ))}
            </div>
          ) : (
            <div className="mt-1 text-[11px] text-[var(--muted)]">no trades in this window</div>
          )}
        </div>
      ),
    });
  }

  return (
    <LensCard
      eyebrow="Lens 07 · tape silhouette · specimen: RXT 2026-05-08"
      title="The day's candles reduced to their essence — range as height, volume as ink, your entries on top."
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <LegendChip swatch={<span className="inline-block h-3 w-2 rounded-sm" style={{ background: GREEN, opacity: 0.6 }} />} label="up move" />
          <LegendChip swatch={<span className="inline-block h-3 w-2 rounded-sm" style={{ background: RED, opacity: 0.6 }} />} label="down move" />
          <LegendChip swatch={<Dot color={ACCENT} />} label="entry (win)" />
          <LegendChip swatch={<Dot color={ACCENT} hollow />} label="entry (loss / flat)" />
        </div>
      }
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Ten-minute candle ranges with volume-scaled opacity and trade entries overlaid"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setTip(null);
            setHotMinute(null);
          }}
        >
          {[minP, (minP + maxP) / 2, maxP].map((p) => (
            <g key={p}>
              <line x1={PAD.l} x2={W - PAD.r} y1={yOf(p)} y2={yOf(p)} stroke="var(--hairline)" />
              <text x={8} y={yOf(p) + 3} className="fill-[var(--muted)]" fontSize={10}>
                ${p.toFixed(2)}
              </text>
            </g>
          ))}
          {candles.map((c) => {
            const up = c.close >= c.open;
            const volNorm = c.volume / maxV;
            const active = hotMinute === c.minute;
            return (
              <rect
                key={c.minute}
                x={xOf(c.minute) - 4.5}
                y={yOf(c.high)}
                width={9}
                height={Math.max(2, yOf(c.low) - yOf(c.high))}
                rx={3}
                fill={up ? GREEN : RED}
                opacity={active ? 0.95 : 0.18 + volNorm * 0.62}
              />
            );
          })}
          {rxtContextTrades.map((t) => (
            <circle
              key={t.id}
              cx={xOf(t.entryMinute)}
              cy={yOf(t.entryPrice)}
              r={clamp(3 + t.quantity / 300, 3, 8)}
              fill={t.pnl > 0 ? ACCENT : "var(--surface)"}
              stroke={ACCENT}
              strokeWidth={2}
            />
          ))}
          {[0, 60, 120, 180, 240, 300, 360].map((m) => (
            <text key={m} x={xOf(m)} y={H - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
              {minuteLabel(m + 150)}
            </text>
          ))}
        </svg>
        <LensTooltip tip={tip} />
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        No wicks, no bodies — each bar is just how far the ten-minute window travelled, and its ink is how much volume moved it. The
        story reads instantly: entries clustered where the ink is darkest. This lens is pinned to the bundled RXT specimen and ignores
        the filters above.
      </p>
    </LensCard>
  );
}

/* ---------- table view (tooltips never gate) ---------- */

function TradeTableView({ trades }: { trades: LensTrade[] }) {
  return (
    <details className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <summary className="cursor-pointer text-[13px] font-semibold text-[var(--foreground)]">
        Table view · every value in the lenses, without hovering ({trades.length} trades)
      </summary>
      <div className="mt-4 overflow-x-auto border-y border-[var(--hairline)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
          <thead className="text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)]">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Time</th>
              <th className="px-3 py-2.5 font-medium">Symbol</th>
              <th className="px-3 py-2.5 font-medium">Side</th>
              <th className="px-3 py-2.5 text-right font-medium">Shares</th>
              <th className="px-3 py-2.5 text-right font-medium">Held</th>
              <th className="px-3 py-2.5 text-right font-medium">Rel. vol</th>
              <th className="px-3 py-2.5 font-medium">Setup</th>
              <th className="px-3 py-2.5 text-right font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-[var(--hairline)] text-[var(--body)]">
                <td className="px-3 py-2.5 font-mono tabular-nums">Jul {t.day}</td>
                <td className="px-3 py-2.5 font-mono tabular-nums">{t.time}</td>
                <td className="px-3 py-2.5 font-semibold text-[var(--foreground)]">{t.symbol}</td>
                <td className="px-3 py-2.5 capitalize">{t.side}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{t.shares.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{holdLabel(t.holdSeconds)}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums">{t.relVol.toFixed(1)}×</td>
                <td className="px-3 py-2.5">{t.setup ?? "Untagged"}</td>
                <td className="px-3 py-2.5 text-right font-mono tabular-nums" style={{ color: pnlColor(t.pnl) }}>
                  {money(t.pnl)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/* ---------- page ---------- */

export default function DataVizLensLab() {
  const [scope, setScope] = useState<Scope>({ kind: "month" });
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const days = scopeDays(scope);
    return lensTrades.filter((t) => {
      if (days && !days.includes(t.day)) return false;
      if (outcome === "wins") return t.pnl > 0;
      if (outcome === "losses") return t.pnl < 0;
      return true;
    });
  }, [scope, outcome]);

  const scopeChips: { label: string; active: boolean; onClick: () => void }[] = [
    { label: "All July", active: scope.kind === "month", onClick: () => setScope({ kind: "month" }) },
    { label: "Week · Jul 13–17", active: scope.kind === "week", onClick: () => setScope({ kind: "week" }) },
    {
      label: scope.kind === "day" ? `Day · Jul ${scope.day}` : "Day · Jul 16",
      active: scope.kind === "day",
      onClick: () => setScope({ kind: "day", day: scope.kind === "day" ? scope.day : 16 }),
    },
  ];

  const outcomeChips: { key: Outcome; label: string }[] = [
    { key: "all", label: "All trades" },
    { key: "wins", label: "Winners" },
    { key: "losses", label: "Losers" },
  ];

  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v2</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">The Lens Lab</h1>
          <p className="mt-1 max-w-[640px] text-[13px] leading-6 text-[var(--body)]">
            One synthetic July of trading, viewed through seven interactive lenses. Hover anything to reveal detail; the scatter and the
            sequence highlight each other.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz" className="text-[var(--accent)] hover:underline">← Data viz index</Link>
          <Link href="/preview/data-viz/v1" className="text-[var(--accent)] hover:underline">← v1 sticker sheet</Link>
        </div>
      </header>

      {/* one filter row, above everything it scopes */}
      <div className="sticky top-0 z-20 -mx-4 border-y border-[var(--hairline)] bg-[var(--background)]/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-1.5">
          {scopeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClick}
              aria-pressed={chip.active}
              className={`min-h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                chip.active ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-[var(--border)]" />
          {outcomeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setOutcome(chip.key)}
              aria-pressed={outcome === chip.key}
              className={`min-h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                outcome === chip.key ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {chip.label}
            </button>
          ))}
          <span className="ml-auto hidden text-[11px] text-[var(--muted)] sm:block">Filters scope every lens · calendar stays full-month</span>
        </div>
      </div>

      <StatHeader trades={filtered} scope={scope} />
      <SessionRhythm trades={filtered} />
      <Constellation trades={filtered} hoveredId={hoveredId} setHoveredId={setHoveredId} />
      <SequenceStrip trades={filtered} hoveredId={hoveredId} setHoveredId={setHoveredId} />
      <MirrorHistogram trades={filtered} scope={scope} monthTrades={lensTrades} />
      <CalendarRollup scope={scope} setScope={setScope} />
      <VolumeLens trades={filtered} />
      <TapeSilhouette />
      <TradeTableView trades={filtered} />

      <footer className="pb-6 text-center text-[11px] text-[var(--muted)]">
        Prototype · synthetic data · derived from a single seeded trade table so every lens agrees
      </footer>
    </main>
  );
}
