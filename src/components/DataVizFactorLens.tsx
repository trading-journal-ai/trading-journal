"use client";

// v4 "factor lens" — one factor at a time, distilled, now with a scope
// selector (all / month / week / day / stock) and a switchable chart form
// (strip / mirror / interval) for the same single-encoding comparison.
// The verdict is a computed sentence, not a chart the reader has to decode.
import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { joinedTrades, type JoinedTrade } from "@/lib/preview/candleJoinData";

/* ---------- shared helpers ---------- */

const GREEN = "var(--green)";
const RED = "var(--red)";

function money(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function pnlColor(value: number) {
  return value > 0 ? GREEN : value < 0 ? RED : "var(--muted)";
}

function holdLabel(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${Math.round(seconds % 60)}s`;
}

function timeLabel(minuteET: number) {
  return `${String(Math.floor(minuteET / 60)).padStart(2, "0")}:${String(Math.round(minuteET) % 60).padStart(2, "0")}`;
}

function scale(v: number, d0: number, d1: number, r0: number, r1: number) {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function quantileSorted(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * q)))];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function prettyDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)}`;
}

function mondayOf(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

/* ---------- factor definitions ---------- */

type Factor = {
  key: string;
  chip: string;
  noun: string;
  value: (t: JoinedTrade) => number | null;
  format: (v: number) => string;
  log?: boolean;
  caveat: string;
};

const FACTORS: Factor[] = [
  {
    key: "hold",
    chip: "Hold time",
    noun: "hold",
    value: (t) => t.holdSec,
    format: holdLabel,
    log: true,
    caveat: "Hold time is a decision you fully control — the clearest lever on this page.",
  },
  {
    key: "shares",
    chip: "Share size",
    noun: "share size",
    value: (t) => t.qty,
    format: (v) => `${Math.round(v).toLocaleString()} sh`,
    log: true,
    caveat: "Share count ignores price — check the position-dollars factor before concluding anything about sizing.",
  },
  {
    key: "dollars",
    chip: "Position $",
    noun: "position size",
    value: (t) => t.qty * t.entry,
    format: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`),
    log: true,
    caveat: "Dollars at entry (shares × price) — the truer sizing measure across $2 and $20 stocks.",
  },
  {
    key: "relvol",
    chip: "Rel. volume",
    noun: "relative volume at entry",
    value: (t) => t.relVol,
    format: (v) => `${v >= 10 ? Math.round(v) : v.toFixed(1)}×`,
    log: true,
    caveat: "Entry-minute volume vs the median of the prior 30 bars — entry-time information, no hindsight.",
  },
  {
    key: "entrytime",
    chip: "Entry time",
    noun: "entry time",
    value: (t) => t.minuteET,
    format: timeLabel,
    caveat: "Clock time of entry, ET. Premarket entries are real entries — the session runs 04:00–20:00.",
  },
  {
    key: "mae",
    chip: "Heat (MAE)",
    noun: "heat taken",
    value: (t) => t.maePct,
    format: (v) => `${v.toFixed(1)}%`,
    caveat: "How far the trade went against you while held. Partly an outcome — read as diagnosis, not a lever.",
  },
  {
    key: "extension",
    chip: "Extension",
    noun: "extension at entry",
    value: (t) => t.dayGainAtEntryPct,
    format: (v) => `${v >= 0 ? "+" : ""}${Math.round(v)}%`,
    caveat: "Entry price vs the session's first print — hindsight day anatomy, grades selection rather than timing.",
  },
  {
    key: "ignition",
    chip: "Min. from ignition",
    noun: "time from ignition",
    value: (t) => t.minFromIgnition,
    format: (v) => (v < 0 ? `${Math.round(-v)}m before` : `${Math.round(v)}m`),
    caveat: "Minutes from the day's first '+10% in 5 minutes' onset — hindsight anatomy for grading timing.",
  },
  {
    key: "volclock",
    chip: "Volume clock",
    noun: "share of the day's volume already printed",
    value: (t) => t.volElapsedPct,
    format: (v) => `${Math.round(v)}%`,
    caveat: "Position of the entry inside the day's total volume story — the denominator is the full day (hindsight).",
  },
];

/* ---------- scopes ---------- */

type ScopeKind = "all" | "month" | "week" | "day" | "symbol";

const SCOPE_OPTIONS: { kind: ScopeKind; label: string }[] = [
  { kind: "all", label: "Everything" },
  { kind: "month", label: "Month" },
  { kind: "week", label: "Week" },
  { kind: "day", label: "Day" },
  { kind: "symbol", label: "Stock" },
];

function buildScopeValues() {
  const months = new Map<string, number>();
  const weeks = new Map<string, number>();
  const days = new Map<string, number>();
  const symbols = new Map<string, number>();
  for (const t of joinedTrades) {
    months.set(t.date.slice(0, 7), (months.get(t.date.slice(0, 7)) ?? 0) + 1);
    const wk = mondayOf(t.date);
    weeks.set(wk, (weeks.get(wk) ?? 0) + 1);
    days.set(t.date, (days.get(t.date) ?? 0) + 1);
    symbols.set(t.symbol, (symbols.get(t.symbol) ?? 0) + 1);
  }
  return {
    month: [...months.entries()].sort().map(([k, n]) => ({ key: k, label: `${MONTHS[Number(k.slice(5)) - 1]} 2026 (${n})` })),
    week: [...weeks.entries()].sort().map(([k, n]) => ({ key: k, label: `Wk of ${prettyDate(k)} (${n})` })),
    day: [...days.entries()].sort().map(([k, n]) => ({ key: k, label: `${prettyDate(k)} (${n})` })),
    symbol: [...symbols.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => ({ key: k, label: `${k} (${n})` })),
  };
}

const SCOPE_VALUES = buildScopeValues();

function scopeFilter(kind: ScopeKind, value: string) {
  if (kind === "all") return joinedTrades;
  if (kind === "month") return joinedTrades.filter((t) => t.date.slice(0, 7) === value);
  if (kind === "week") return joinedTrades.filter((t) => mondayOf(t.date) === value);
  if (kind === "day") return joinedTrades.filter((t) => t.date === value);
  return joinedTrades.filter((t) => t.symbol === value);
}

function scopeLabel(kind: ScopeKind, value: string) {
  if (kind === "all") return "all trades";
  if (kind === "month") return `${MONTHS[Number(value.slice(5)) - 1]} 2026`;
  if (kind === "week") return `the week of ${prettyDate(value)}`;
  if (kind === "day") return prettyDate(value);
  return value;
}

/* ---------- tooltip ---------- */

type TipState = { x: number; y: number; body: ReactNode } | null;

function Tip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-5 shadow-lg"
      style={{ left: tip.x, top: tip.y, transform: tip.x > 460 ? "translate(-100%, 10px)" : "translate(12px, 10px)" }}
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

/* ---------- stats ---------- */

type FactorStats = {
  usable: { t: JoinedTrade; v: number }[];
  excluded: number;
  medWin: number | null;
  medLoss: number | null;
  quartiles: { label: string; n: number; winRate: number; exp: number }[];
  bestQ: number;
  worstQ: number;
};

function computeStats(factor: Factor, trades: JoinedTrade[]): FactorStats {
  const usable: { t: JoinedTrade; v: number }[] = [];
  let excluded = 0;
  for (const t of trades) {
    const v = factor.value(t);
    if (v == null || !Number.isFinite(v)) excluded += 1;
    else usable.push({ t, v });
  }
  const medWin = median(usable.filter((u) => u.t.pnl > 0).map((u) => u.v));
  const medLoss = median(usable.filter((u) => u.t.pnl < 0).map((u) => u.v));

  const sorted = [...usable].sort((a, b) => a.v - b.v);
  const quartiles =
    sorted.length >= 20
      ? [0, 1, 2, 3].map((qi) => {
          const start = Math.floor((qi / 4) * sorted.length);
          const end = qi === 3 ? sorted.length : Math.floor(((qi + 1) / 4) * sorted.length);
          const slice = sorted.slice(start, end);
          const wins = slice.filter((u) => u.t.pnl > 0).length;
          return {
            label: `${factor.format(slice[0].v)} – ${factor.format(slice[slice.length - 1].v)}`,
            n: slice.length,
            winRate: Math.round((wins / slice.length) * 100),
            exp: slice.reduce((a, u) => a + u.t.pnl, 0) / slice.length,
          };
        })
      : [];
  let bestQ = 0;
  let worstQ = 0;
  quartiles.forEach((q, i) => {
    if (q.exp > quartiles[bestQ].exp) bestQ = i;
    if (q.exp < quartiles[worstQ].exp) worstQ = i;
  });
  return { usable, excluded, medWin, medLoss, quartiles, bestQ, worstQ };
}

const ORDINAL = ["lowest", "second", "third", "highest"];

/* ---------- shared axis ---------- */

type Axis = { lo: number; hi: number; toX: (v: number) => number; ticks: number[] };

function buildAxis(factor: Factor, stats: FactorStats, padL: number, padR: number, width: number): Axis | null {
  if (!stats.usable.length) return null;
  const values = stats.usable.map((u) => u.v).sort((a, b) => a - b);
  let lo = quantileSorted(values, 0.02);
  let hi = quantileSorted(values, 0.98);
  if (factor.log) lo = Math.max(lo, values.find((v) => v > 0) ?? 1);
  if (hi <= lo) hi = lo + 1;
  const toX = (v: number) => {
    const c = clamp(v, lo, hi);
    return factor.log
      ? scale(Math.log10(c), Math.log10(lo), Math.log10(hi), padL, width - padR)
      : scale(c, lo, hi, padL, width - padR);
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    factor.log ? Math.pow(10, scale(f, 0, 1, Math.log10(lo), Math.log10(hi))) : scale(f, 0, 1, lo, hi),
  );
  return { lo, hi, toX, ticks };
}

/* ---------- verdict ---------- */

function VerdictBlock({ factor, stats, scopeText }: { factor: Factor; stats: FactorStats; scopeText: string }) {
  const { usable, medWin, medLoss, quartiles, bestQ, worstQ } = stats;
  const wins = usable.filter((u) => u.t.pnl > 0).length;
  const losses = usable.filter((u) => u.t.pnl < 0).length;
  const spread = quartiles.length ? quartiles[bestQ].exp - quartiles[worstQ].exp : 0;
  const flat = spread < 12;
  const small = usable.length < 40;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        What the data says · {scopeText} · {usable.length} trades ({wins}W / {losses}L)
      </div>
      {usable.length === 0 ? (
        <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">No trades in this slice carry {factor.chip.toLowerCase()} data.</p>
      ) : (
        <>
          <p className="mt-2 text-[19px] font-semibold leading-7 text-[var(--foreground)]">
            Your median winner&apos;s {factor.noun} was{" "}
            <span style={{ color: GREEN }}>{medWin != null ? factor.format(medWin) : "—"}</span>; your median loser&apos;s was{" "}
            <span style={{ color: RED }}>{medLoss != null ? factor.format(medLoss) : "—"}</span>.
          </p>
          {quartiles.length ? (
            <p className="mt-2 text-[15px] leading-6 text-[var(--body)]">
              {flat ? (
                <>
                  Expectancy barely moves across the quartiles ({money(quartiles[worstQ].exp)} to {money(quartiles[bestQ].exp)}/trade) —{" "}
                  <strong>this factor doesn&apos;t separate your results much here.</strong>
                </>
              ) : (
                <>
                  The {ORDINAL[bestQ]} quartile ({quartiles[bestQ].label}) paid best at{" "}
                  <strong style={{ color: pnlColor(quartiles[bestQ].exp) }}>{money(quartiles[bestQ].exp)}/trade</strong>; the{" "}
                  {ORDINAL[worstQ]} quartile ({quartiles[worstQ].label}) paid worst at{" "}
                  <strong style={{ color: pnlColor(quartiles[worstQ].exp) }}>{money(quartiles[worstQ].exp)}/trade</strong>.
                </>
              )}
              {small ? <em className="text-[var(--muted)]"> Small slice — read direction, not magnitude.</em> : null}
            </p>
          ) : (
            <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">
              Under 20 trades in this slice — a quartile read would be noise, so it&apos;s withheld. The comparison view below still shows
              every trade.
            </p>
          )}
        </>
      )}
      <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">{factor.caveat}</p>
    </div>
  );
}

/* ---------- comparison views (three forms, same data, same axis) ---------- */

const VIEW_W = 960;
const PAD_L = 76;
const PAD_R = 20;

function AxisTicks({ axis, factor, h }: { axis: Axis; factor: Factor; h: number }) {
  return (
    <>
      {axis.ticks.map((v, i) => (
        <g key={i}>
          <line x1={axis.toX(v)} x2={axis.toX(v)} y1={24} y2={h - 32} stroke="var(--hairline)" />
          <text x={axis.toX(v)} y={h - 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
            {factor.format(v)}
          </text>
        </g>
      ))}
    </>
  );
}

function StripView({ factor, stats, axis }: { factor: Factor; stats: FactorStats; axis: Axis }) {
  const [tip, setTip] = useState<TipState>(null);
  const H = 240;
  const rowY = { win: 70, loss: 165 };
  const JITTER = 30;
  const jitter = (id: number) => (((id * 2654435761) % 1000) / 1000 - 0.5) * 2 * JITTER;
  const { medWin, medLoss } = stats;

  const placed = stats.usable
    .filter((u) => u.t.pnl !== 0)
    .map((u) => ({ u, x: axis.toX(u.v), y: (u.t.pnl > 0 ? rowY.win : rowY.loss) + jitter(u.t.id) }));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: (typeof placed)[number] | null = null;
    let bestD = 18;
    for (const p of placed) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setTip(
      best
        ? {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            body: (
              <div className="grid gap-0.5">
                <div className="mb-1 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[var(--foreground)]">
                    {best.u.t.symbol} · {best.u.t.date}
                  </span>
                  <span className="font-mono font-semibold" style={{ color: pnlColor(best.u.t.pnl) }}>
                    {money(best.u.t.pnl)}
                  </span>
                </div>
                <TipRow label={factor.chip} value={factor.format(best.u.v)} />
                <TipRow label="Entry" value={`${timeLabel(best.u.t.minuteET)} ET`} />
                <TipRow label="Held" value={holdLabel(best.u.t.holdSec)} />
              </div>
            ),
          }
        : null,
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Winners and losers compared on ${factor.chip}, dot strip`}
        onPointerMove={onMove}
        onPointerLeave={() => setTip(null)}
      >
        <AxisTicks axis={axis} factor={factor} h={H} />
        <text x={8} y={rowY.win + 4} className="fill-[var(--body)]" fontSize={11.5} fontWeight={600}>
          winners
        </text>
        <text x={8} y={rowY.loss + 4} className="fill-[var(--body)]" fontSize={11.5} fontWeight={600}>
          losers
        </text>
        {placed.map((p) => (
          <circle key={p.u.t.id} cx={p.x} cy={p.y} r={3} fill={p.u.t.pnl > 0 ? GREEN : RED} opacity={0.4} />
        ))}
        {medWin != null ? (
          <g>
            <line x1={axis.toX(medWin)} x2={axis.toX(medWin)} y1={rowY.win - JITTER - 6} y2={rowY.win + JITTER + 6} stroke="var(--foreground)" strokeWidth={2} />
            <text x={axis.toX(medWin) + 5} y={rowY.win - JITTER - 10} className="fill-[var(--foreground)]" fontSize={11} fontWeight={600}>
              median {factor.format(medWin)}
            </text>
          </g>
        ) : null}
        {medLoss != null ? (
          <g>
            <line x1={axis.toX(medLoss)} x2={axis.toX(medLoss)} y1={rowY.loss - JITTER - 6} y2={rowY.loss + JITTER + 6} stroke="var(--foreground)" strokeWidth={2} />
            <text x={axis.toX(medLoss) + 5} y={rowY.loss + JITTER + 18} className="fill-[var(--foreground)]" fontSize={11} fontWeight={600}>
              median {factor.format(medLoss)}
            </text>
          </g>
        ) : null}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function MirrorView({ factor, stats, axis }: { factor: Factor; stats: FactorStats; axis: Axis }) {
  const [tip, setTip] = useState<TipState>(null);
  const H = 250;
  const mid = 128;
  const BAND = 86;
  const BIN_COUNT = 26;

  const binOf = (v: number) => {
    const c = clamp(v, axis.lo, axis.hi);
    const f = factor.log
      ? scale(Math.log10(c), Math.log10(axis.lo), Math.log10(axis.hi), 0, 1)
      : scale(c, axis.lo, axis.hi, 0, 1);
    return Math.min(BIN_COUNT - 1, Math.floor(f * BIN_COUNT));
  };
  const bins = Array.from({ length: BIN_COUNT }, () => ({ w: 0, l: 0, pnl: 0 }));
  for (const u of stats.usable) {
    const b = bins[binOf(u.v)];
    if (u.t.pnl > 0) b.w += 1;
    else if (u.t.pnl < 0) b.l += 1;
    b.pnl += u.t.pnl;
  }
  const maxCount = Math.max(1, ...bins.map((b) => Math.max(b.w, b.l)));
  const bw = (VIEW_W - PAD_L - PAD_R) / BIN_COUNT;
  const edgeValue = (i: number) =>
    factor.log
      ? Math.pow(10, scale(i / BIN_COUNT, 0, 1, Math.log10(axis.lo), Math.log10(axis.hi)))
      : scale(i / BIN_COUNT, 0, 1, axis.lo, axis.hi);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VIEW_W} ${H}`} className="w-full" role="img" aria-label={`Winners and losers compared on ${factor.chip}, mirrored histogram`}>
        <AxisTicks axis={axis} factor={factor} h={H} />
        <line x1={PAD_L} x2={VIEW_W - PAD_R} y1={mid} y2={mid} stroke="var(--border)" />
        <text x={8} y={mid - BAND + 4} className="fill-[var(--body)]" fontSize={11.5} fontWeight={600}>
          winners ↑
        </text>
        <text x={8} y={mid + BAND} className="fill-[var(--body)]" fontSize={11.5} fontWeight={600}>
          losers ↓
        </text>
        {bins.map((b, i) => {
          const x = PAD_L + i * bw;
          const hw = scale(b.w, 0, maxCount, 0, BAND - 6);
          const hl = scale(b.l, 0, maxCount, 0, BAND - 6);
          return (
            <g key={i}>
              {b.w ? <rect x={x + 1} y={mid - 1 - hw} width={bw - 2} height={hw} rx={2.5} fill={GREEN} opacity={0.8} /> : null}
              {b.l ? <rect x={x + 1} y={mid + 1} width={bw - 2} height={hl} rx={2.5} fill={RED} opacity={0.8} /> : null}
              <rect
                x={x}
                y={24}
                width={bw}
                height={H - 56}
                fill="transparent"
                onPointerMove={(e) => {
                  const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                  setTip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    body: (
                      <div className="grid gap-0.5">
                        <div className="mb-1 font-semibold text-[var(--foreground)]">
                          {factor.format(edgeValue(i))} – {factor.format(edgeValue(i + 1))}
                        </div>
                        <TipRow label="Winners" value={String(b.w)} tone={GREEN} />
                        <TipRow label="Losers" value={String(b.l)} tone={RED} />
                        <TipRow label="Net P&L" value={money(b.pnl)} tone={pnlColor(b.pnl)} />
                      </div>
                    ),
                  });
                }}
                onPointerLeave={() => setTip(null)}
              />
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function IntervalView({ factor, stats, axis }: { factor: Factor; stats: FactorStats; axis: Axis }) {
  const H = 220;
  const rows = [
    { label: "winners", color: GREEN, values: stats.usable.filter((u) => u.t.pnl > 0).map((u) => u.v).sort((a, b) => a - b), y: 74 },
    { label: "losers", color: RED, values: stats.usable.filter((u) => u.t.pnl < 0).map((u) => u.v).sort((a, b) => a - b), y: 152 },
  ];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VIEW_W} ${H}`} className="w-full" role="img" aria-label={`Winners and losers compared on ${factor.chip}, interval summary`}>
        <AxisTicks axis={axis} factor={factor} h={H} />
        {rows.map((row) => {
          if (!row.values.length)
            return (
              <text key={row.label} x={8} y={row.y + 4} className="fill-[var(--muted)]" fontSize={11.5}>
                {row.label}: none
              </text>
            );
          const p10 = quantileSorted(row.values, 0.1);
          const p25 = quantileSorted(row.values, 0.25);
          const p50 = quantileSorted(row.values, 0.5);
          const p75 = quantileSorted(row.values, 0.75);
          const p90 = quantileSorted(row.values, 0.9);
          return (
            <g key={row.label}>
              <text x={8} y={row.y + 4} className="fill-[var(--body)]" fontSize={11.5} fontWeight={600}>
                {row.label}
              </text>
              {/* p10–p90 whisker */}
              <line x1={axis.toX(p10)} x2={axis.toX(p90)} y1={row.y} y2={row.y} stroke={row.color} strokeWidth={2} opacity={0.55} />
              {/* p25–p75 band */}
              <rect x={axis.toX(p25)} y={row.y - 9} width={Math.max(3, axis.toX(p75) - axis.toX(p25))} height={18} rx={5} fill={row.color} opacity={0.4} />
              {/* median tick */}
              <line x1={axis.toX(p50)} x2={axis.toX(p50)} y1={row.y - 15} y2={row.y + 15} stroke="var(--foreground)" strokeWidth={2.5} />
              <text x={axis.toX(p50) + 6} y={row.y - 19} className="fill-[var(--foreground)]" fontSize={11} fontWeight={600}>
                {factor.format(p50)}
              </text>
              <text x={axis.toX(p25)} y={row.y + 30} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                {factor.format(p25)}
              </text>
              <text x={axis.toX(p75)} y={row.y + 30} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                {factor.format(p75)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

type ViewKind = "strip" | "mirror" | "interval";

const VIEW_OPTIONS: { kind: ViewKind; label: string; note: string }[] = [
  { kind: "strip", label: "Dots", note: "every trade visible; medians rule" },
  { kind: "mirror", label: "Mirror", note: "where the counts pile up, winners up / losers down" },
  { kind: "interval", label: "Interval", note: "middle 50% band, 10–90% whisker, labeled medians" },
];

function ComparisonCard({ factor, stats, view, setView }: { factor: Factor; stats: FactorStats; view: ViewKind; setView: (v: ViewKind) => void }) {
  const axis = buildAxis(factor, stats, PAD_L, PAD_R, VIEW_W);
  const active = VIEW_OPTIONS.find((o) => o.kind === view)!;
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Winners vs losers, on this one axis only
        </div>
        <div className="flex items-center gap-1">
          {VIEW_OPTIONS.map((o) => (
            <button
              key={o.kind}
              type="button"
              onClick={() => setView(o.kind)}
              aria-pressed={view === o.kind}
              className={`min-h-7 rounded-full px-3 text-[11.5px] font-semibold transition-colors ${
                view === o.kind ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        {axis == null ? (
          <p className="py-10 text-center text-[13px] text-[var(--muted)]">No trades in this slice.</p>
        ) : view === "strip" ? (
          <StripView factor={factor} stats={stats} axis={axis} />
        ) : view === "mirror" ? (
          <MirrorView factor={factor} stats={stats} axis={axis} />
        ) : (
          <IntervalView factor={factor} stats={stats} axis={axis} />
        )}
      </div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">
        Same data, three readings — this one: {active.note}. Position along the axis is the only encoding{factor.log ? " (log scale)" : ""};
        axis clamps at the 2nd–98th percentile.
      </p>
    </div>
  );
}

/* ---------- quartile ledger ---------- */

function QuartileLedger({ factor, stats }: { factor: Factor; stats: FactorStats }) {
  if (!stats.quartiles.length) return null;
  const maxAbs = Math.max(20, ...stats.quartiles.map((q) => Math.abs(q.exp)));
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        Did more of it pay? Equal-count quartiles, lowest → highest
      </div>
      <div className="mt-4 grid gap-2.5">
        {stats.quartiles.map((q, i) => (
          <div key={i} className="grid gap-1 sm:grid-cols-[minmax(120px,220px)_minmax(0,1fr)_180px] sm:items-center sm:gap-3">
            <div className="flex items-baseline justify-between gap-3 sm:contents">
              <div className="truncate text-[12px] font-semibold text-[var(--foreground)] sm:order-1" title={q.label}>
                {q.label}
              </div>
              <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)] sm:order-3">
                <span className="font-semibold" style={{ color: pnlColor(q.exp) }}>
                  {money(q.exp)}
                </span>
                <span className="text-[var(--muted)]">
                  {" "}
                  /t · {q.winRate}% · n={q.n}
                </span>
              </div>
            </div>
            <div className="relative h-7 sm:order-2">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
              <div
                className="absolute top-1 bottom-1 rounded"
                style={{
                  background: pnlColor(q.exp),
                  opacity: 0.85,
                  left: q.exp >= 0 ? "50%" : `${50 - (Math.abs(q.exp) / maxAbs) * 48}%`,
                  width: `${Math.max(0.5, (Math.abs(q.exp) / maxAbs) * 48)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[var(--muted)]">
        Quartiles hold sample size constant (n≈{Math.round(stats.usable.length / 4)} each), so a hot row is never a small-sample
        illusion.{stats.excluded ? ` ${stats.excluded} trades excluded — no ${factor.chip.toLowerCase()} data.` : ""}
      </p>
    </div>
  );
}

/* ---------- page ---------- */

export default function DataVizFactorLens() {
  const [factorKey, setFactorKey] = useState<string>("hold");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("all");
  const [scopeValue, setScopeValue] = useState<Record<string, string>>({
    month: SCOPE_VALUES.month[0]?.key ?? "",
    week: SCOPE_VALUES.week[0]?.key ?? "",
    day: SCOPE_VALUES.day[0]?.key ?? "",
    symbol: SCOPE_VALUES.symbol[0]?.key ?? "",
  });
  const [view, setView] = useState<ViewKind>("strip");

  const factor = FACTORS.find((f) => f.key === factorKey)!;
  const activeValue = scopeKind === "all" ? "" : scopeValue[scopeKind];
  const slice = useMemo(() => scopeFilter(scopeKind, activeValue), [scopeKind, activeValue]);
  const stats = useMemo(() => computeStats(factor, slice), [factor, slice]);

  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v4</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">The Factor Lens</h1>
          <p className="mt-1 max-w-[660px] text-[13px] leading-6 text-[var(--body)]">
            One factor at a time, any slice of the data. Pick a scope, a dimension, and a reading; get a sentence, the winners-vs-losers
            gap, and whether more of it paid — from the same {joinedTrades.length.toLocaleString()}-trade candle join as v3.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz" className="text-[var(--accent)] hover:underline">← Data viz index</Link>
          <Link href="/preview/data-viz/v3" className="text-[var(--accent)] hover:underline">
            ← v3 join lab
          </Link>
          <Link href="/preview/data-viz/v2" className="text-[var(--accent)] hover:underline">
            ← v2 lens lab
          </Link>
        </div>
      </header>

      {/* controls: scope row, then factor row */}
      <div className="sticky top-0 z-20 -mx-4 grid gap-1.5 border-y border-[var(--hairline)] bg-[var(--background)]/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-1.5">
          {SCOPE_OPTIONS.map((s) => (
            <button
              key={s.kind}
              type="button"
              onClick={() => setScopeKind(s.kind)}
              aria-pressed={scopeKind === s.kind}
              className={`min-h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors ${
                scopeKind === s.kind ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </button>
          ))}
          {scopeKind !== "all" ? (
            <select
              value={scopeValue[scopeKind]}
              onChange={(e) => setScopeValue((prev) => ({ ...prev, [scopeKind]: e.target.value }))}
              aria-label={`Select ${scopeKind}`}
              className="min-h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-semibold text-[var(--foreground)]"
            >
              {SCOPE_VALUES[scopeKind].map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center gap-1.5">
          {FACTORS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFactorKey(f.key)}
              aria-pressed={factorKey === f.key}
              className={`min-h-7 rounded-full px-3 text-[11.5px] font-semibold transition-colors ${
                factorKey === f.key ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {f.chip}
            </button>
          ))}
        </div>
      </div>

      <VerdictBlock factor={factor} stats={stats} scopeText={scopeLabel(scopeKind, activeValue)} />
      <ComparisonCard factor={factor} stats={stats} view={view} setView={setView} />
      <QuartileLedger factor={factor} stats={stats} />

      <p className="text-center text-[11px] leading-5 text-[var(--muted)]">
        Single-factor reads are honest but not causal — factors correlate (size travels with conviction, hold with thesis). When two
        factors both look strong, the follow-up is a cohort A/B compare, not a bigger blob.
      </p>
    </main>
  );
}
