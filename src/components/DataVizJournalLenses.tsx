"use client";

// v7 "journal lenses" — the discovery-lab winners rebuilt at journal scope.
// One visual system across day / week / month: the session path. One honesty
// gradient for the behavioral reads: facts at day scope, statistics at
// week/month scope. Desktop-only preview.
import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { joinedTrades, type JoinedTrade } from "@/lib/preview/candleJoinData";

/* ---------- helpers ---------- */

const GREEN = "var(--green)";
const RED = "var(--red)";
const ACCENT = "var(--accent)";

function money(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(Math.round(value)).toLocaleString("en-US")}`;
}

function pnlColor(value: number) {
  return value > 0 ? GREEN : value < 0 ? RED : "var(--muted)";
}

function timeLabel(minuteET: number) {
  const m = Math.round(minuteET);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function gapLabel(minutes: number) {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
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

function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * q)))];
}

function expectancy(list: { pnl: number }[]): number | null {
  return list.length ? list.reduce((a, t) => a + t.pnl, 0) / list.length : null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function prettyDate(iso: string) {
  const [, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1].slice(0, 3)} ${Number(d)}`;
}

function mondayOf(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------- sequencing (shared derivation) ---------- */

type SeqTrade = JoinedTrade & {
  exitMin: number;
  seqInDay: number;
  gapMin: number | null;
  prevId: number | null;
};

const seqTrades: SeqTrade[] = (() => {
  const byDate = new Map<string, JoinedTrade[]>();
  for (const t of joinedTrades) {
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }
  const out: SeqTrade[] = [];
  for (const list of byDate.values()) {
    list.sort((a, b) => a.minuteET - b.minuteET);
    let prev: SeqTrade | null = null;
    list.forEach((t, i) => {
      const s: SeqTrade = {
        ...t,
        exitMin: t.minuteET + t.holdSec / 60,
        seqInDay: i + 1,
        gapMin: prev ? Math.max(0, t.minuteET - prev.exitMin) : null,
        prevId: prev ? prev.id : null,
      };
      out.push(s);
      prev = s;
    });
  }
  return out;
})();

const seqById = new Map(seqTrades.map((t) => [t.id, t]));
const allDates = [...new Set(seqTrades.map((t) => t.date))].sort();
const BIG_LOSS_CUT = Math.abs(quantile(joinedTrades.filter((t) => t.pnl < 0).map((t) => t.pnl), 0.25));

function isFavorable(t: JoinedTrade): boolean | null {
  if (t.relVol == null || t.minSinceHigh == null || t.pmHighDistPct == null) return null;
  let score = 0;
  if (t.relVol >= 2 && t.relVol < 6) score += 1;
  if (t.minSinceHigh <= 2) score += 1;
  if (t.pmHighDistPct > 0) score += 1;
  return score >= 2;
}

function conditionWords(t: JoinedTrade): string {
  const parts: string[] = [];
  if (t.relVol != null) parts.push(`${t.relVol.toFixed(1)}× vol`);
  if (t.minSinceHigh != null) parts.push(t.minSinceHigh <= 2 ? "fresh high" : `${Math.round(t.minSinceHigh)}m off high`);
  if (t.pmHighDistPct != null) parts.push(t.pmHighDistPct > 0 ? "above PM high" : "below PM high");
  return parts.join(" · ");
}

/* ---------- day path model ---------- */

type DayModel = {
  date: string;
  trades: SeqTrade[];
  points: { m: number; v: number; trade: SeqTrade }[];
  final: number;
  peak: { m: number; v: number };
  trough: { m: number; v: number };
  t80: number | null;
  giveBack: number;
};

function buildDay(date: string): DayModel | null {
  const trades = seqTrades.filter((t) => t.date === date);
  if (!trades.length) return null;
  // realized P&L accumulates in EXIT order — a long hold can close after a
  // later quick trade, and the path must never move backward in time
  let cum = 0;
  const points = [...trades]
    .sort((a, b) => a.exitMin - b.exitMin)
    .map((t) => {
      cum += t.pnl;
      return { m: t.exitMin, v: cum, trade: t };
    });
  const final = cum;
  let peak = { m: points[0].m, v: 0 };
  let trough = { m: points[0].m, v: 0 };
  for (const p of points) {
    if (p.v > peak.v) peak = { m: p.m, v: p.v };
    if (p.v < trough.v) trough = { m: p.m, v: p.v };
  }
  let t80: number | null = null;
  if (Math.abs(final) >= 100) {
    for (const p of points) {
      if (Math.sign(p.v) === Math.sign(final) && Math.abs(p.v) >= 0.8 * Math.abs(final)) {
        t80 = p.m;
        break;
      }
    }
  }
  return { date, trades, points, final, peak, trough, t80, giveBack: peak.v > 0 ? peak.v - final : 0 };
}

/* ---------- tooltip ---------- */

type TipState = { x: number; y: number; body: ReactNode } | null;

function Tip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[270px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-5 shadow-lg"
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

/* ---------- the reads strip (facts at day scope, stats at week/month) ---------- */

type Read = { label: string; body: ReactNode };

function ReadsStrip({ heading, reads }: { heading: string; reads: Read[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{heading}</div>
      <div className="mt-3 grid gap-0">
        {reads.map((r, i) => (
          <div key={i} className={`grid grid-cols-[150px_minmax(0,1fr)] gap-4 py-3 ${i ? "border-t border-[var(--hairline)]" : ""}`}>
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{r.label}</div>
            <div className="text-[13px] leading-6 text-[var(--body)]">{r.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mono({ children, tone }: { children: ReactNode; tone?: string }) {
  return (
    <span className="font-mono font-semibold tabular-nums" style={{ color: tone ?? "var(--foreground)" }}>
      {children}
    </span>
  );
}

/* ---------- DAY ---------- */

function DayHero({ model }: { model: DayModel }) {
  const [tip, setTip] = useState<TipState>(null);

  const W = 960;
  const H = 300;
  const PAD = { l: 56, r: 96, t: 26, b: 34 };
  const m0 = model.trades[0].minuteET - 8;
  const m1 = model.points[model.points.length - 1].m + 8;
  const yAbs = Math.max(60, Math.abs(model.peak.v), Math.abs(model.trough.v)) * 1.12;
  const xOf = (m: number) => scale(m, m0, m1, PAD.l, W - PAD.r);
  const yOf = (v: number) => scale(v, -yAbs, yAbs, H - PAD.b, PAD.t);

  const pathPoints = [{ m: model.trades[0].minuteET, v: 0 }, ...model.points];

  return (
    <div className="relative mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="The day's cumulative P&L path with peak, give-back, and build annotations"
        onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          let best: (typeof model.points)[number] | null = null;
          let bestD = 24;
          for (const p of model.points) {
            const d = Math.hypot(xOf(p.m) - px, yOf(p.v) - py);
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
                          {best.trade.symbol} · exit {timeLabel(best.trade.exitMin)}
                        </span>
                        <span className="font-mono font-semibold" style={{ color: pnlColor(best.trade.pnl) }}>
                          {money(best.trade.pnl)}
                        </span>
                      </div>
                      <TipRow label="Day so far" value={money(best.v)} tone={pnlColor(best.v)} />
                      <TipRow label="Shares" value={best.trade.qty.toLocaleString()} />
                    </div>
                  ),
                }
              : null,
          );
        }}
        onPointerLeave={() => setTip(null)}
      >
        {[m0, (m0 + m1) / 2, m1].map((m) => (
          <text key={m} x={xOf(m)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
            {timeLabel(m)}
          </text>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke="var(--border)" />
        <text x={8} y={yOf(0) + 3} className="fill-[var(--muted)]" fontSize={10}>
          $0
        </text>

        {/* give-back shading: from the peak forward, the ground you did not keep */}
        {model.giveBack > 40 ? (
          <g>
            <rect
              x={xOf(model.peak.m)}
              y={yOf(model.peak.v)}
              width={xOf(m1) - xOf(model.peak.m)}
              height={Math.max(0, yOf(model.final) - yOf(model.peak.v))}
              fill="var(--red)"
              opacity={0.07}
            />
            <line
              x1={xOf(model.peak.m)}
              x2={W - PAD.r}
              y1={yOf(model.peak.v)}
              y2={yOf(model.peak.v)}
              stroke="var(--muted)"
              strokeWidth={1}
              opacity={0.6}
            />
          </g>
        ) : null}

        {/* the path */}
        <polyline
          points={pathPoints.map((p) => `${xOf(p.m)},${yOf(p.v)}`).join(" ")}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {model.points.map((p) => (
          <circle key={p.trade.id} cx={xOf(p.m)} cy={yOf(p.v)} r={3.5} fill={pnlColor(p.trade.pnl)} stroke="var(--surface)" strokeWidth={1.5} />
        ))}

        {/* annotations */}
        {model.peak.v > 0 ? (
          <text x={xOf(model.peak.m)} y={yOf(model.peak.v) - 10} textAnchor="middle" className="fill-[var(--body)]" fontSize={11} fontWeight={600}>
            peak {money(model.peak.v)} · {timeLabel(model.peak.m)}
          </text>
        ) : null}
        {model.trough.v < 0 ? (
          <text x={xOf(model.trough.m)} y={yOf(model.trough.v) + 18} textAnchor="middle" className="fill-[var(--body)]" fontSize={11} fontWeight={600}>
            low {money(model.trough.v)} · {timeLabel(model.trough.m)}
          </text>
        ) : null}
        {model.t80 != null ? (
          <g>
            <line x1={xOf(model.t80)} x2={xOf(model.t80)} y1={PAD.t} y2={H - PAD.b} stroke={ACCENT} strokeWidth={1} opacity={0.45} />
            <text x={xOf(model.t80) + 4} y={PAD.t + 10} className="fill-[var(--accent)]" fontSize={10.5} fontWeight={600}>
              80% built · {timeLabel(model.t80)}
            </text>
          </g>
        ) : null}
        <text
          x={xOf(m1) + 8}
          y={yOf(model.final) + 4}
          className="font-semibold"
          fontSize={15}
          fontWeight={700}
          fill={pnlColor(model.final)}
        >
          {money(model.final)}
        </text>
        {model.giveBack > 40 ? (
          <text x={W - PAD.r - 4} y={yOf(model.peak.v) - 6} textAnchor="end" className="fill-[var(--muted)]" fontSize={10.5}>
            gave back {money(-model.giveBack)}
          </text>
        ) : null}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function dayReads(model: DayModel): Read[] {
  const reads: Read[] = [];
  const { trades } = model;

  // fastest re-fire
  const withGap = trades.filter((t) => t.gapMin != null);
  if (withGap.length) {
    const fastest = withGap.reduce((m, t) => (t.gapMin! < m.gapMin! ? t : m), withGap[0]);
    const prev = seqById.get(fastest.prevId!)!;
    reads.push({
      label: "Fastest re-fire",
      body: (
        <>
          <Mono>{gapLabel(fastest.gapMin!)}</Mono> after {prev.pnl >= 0 ? "a win" : "a loss"} — back into {fastest.symbol} at{" "}
          {timeLabel(fastest.minuteET)} → <Mono tone={pnlColor(fastest.pnl)}>{money(fastest.pnl)}</Mono>.
        </>
      ),
    });
  }

  // biggest bet + its conditions
  const biggest = trades.reduce((m, t) => (t.qty * t.entry > m.qty * m.entry ? t : m), trades[0]);
  const fav = isFavorable(biggest);
  reads.push({
    label: "Biggest bet",
    body: (
      <>
        <Mono>${Math.round((biggest.qty * biggest.entry) / 100) / 10}k</Mono> {biggest.symbol} at {timeLabel(biggest.minuteET)} —{" "}
        {fav == null ? "conditions unknown" : fav ? "favorable" : "unfavorable"} ({conditionWords(biggest)}) →{" "}
        <Mono tone={pnlColor(biggest.pnl)}>{money(biggest.pnl)}</Mono>.
      </>
    ),
  });

  // after the day's worst loss
  const losses = trades.filter((t) => t.pnl < 0);
  if (losses.length) {
    const worst = losses.reduce((m, t) => (t.pnl < m.pnl ? t : m), losses[0]);
    const next = trades.find((t) => t.prevId === worst.id);
    reads.push({
      label: "After the worst loss",
      body: next ? (
        <>
          {worst.symbol} <Mono tone={RED}>{money(worst.pnl)}</Mono> at {timeLabel(worst.exitMin)} — next trade{" "}
          <Mono>{gapLabel(next.gapMin!)}</Mono> later at{" "}
          <Mono>{((next.qty * next.entry) / (worst.qty * worst.entry)).toFixed(2)}×</Mono> size →{" "}
          <Mono tone={pnlColor(next.pnl)}>{money(next.pnl)}</Mono>.
        </>
      ) : (
        <>
          {worst.symbol} <Mono tone={RED}>{money(worst.pnl)}</Mono> at {timeLabel(worst.exitMin)} — and you stopped. No trade followed it.
        </>
      ),
    });
  }

  return reads;
}

/* ---------- WEEK ---------- */

function WeekHero({ days }: { days: (DayModel | null)[] }) {
  const W = 960;
  const H = 250;
  const PANEL_W = W / 5;
  const PAD = { t: 30, b: 44 };
  const present = days.filter((d): d is DayModel => d != null);
  const yAbs = Math.max(80, ...present.flatMap((d) => [Math.abs(d.peak.v), Math.abs(d.trough.v)])) * 1.1;
  const yOf = (v: number) => scale(v, -yAbs, yAbs, H - PAD.b, PAD.t);
  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Five session paths for the week, sharing one dollar scale">
        <line x1={0} x2={W} y1={yOf(0)} y2={yOf(0)} stroke="var(--border)" />
        {days.map((d, i) => {
          const x0 = i * PANEL_W + 18;
          const x1 = (i + 1) * PANEL_W - 18;
          return (
            <g key={i}>
              {i ? <line x1={i * PANEL_W} x2={i * PANEL_W} y1={12} y2={H - 26} stroke="var(--hairline)" /> : null}
              <text x={(x0 + x1) / 2} y={H - 10} textAnchor="middle" className="fill-[var(--muted)]" fontSize={11}>
                {WEEKDAYS[i]}
                {d ? ` · ${d.trades.length}t` : ""}
              </text>
              {d ? (
                (() => {
                  const m0 = d.trades[0].minuteET;
                  const m1 = Math.max(d.points[d.points.length - 1].m, m0 + 20);
                  const xOfD = (m: number) => scale(m, m0, m1, x0, x1);
                  const pts = [{ m: m0, v: 0 }, ...d.points];
                  return (
                    <g>
                      {d.peak.v > 0 ? <circle cx={xOfD(d.peak.m)} cy={yOf(d.peak.v)} r={2.5} fill="var(--muted)" opacity={0.8} /> : null}
                      <polyline
                        points={pts.map((p) => `${xOfD(p.m)},${yOf(p.v)}`).join(" ")}
                        fill="none"
                        stroke="var(--foreground)"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                        opacity={0.85}
                      />
                      <circle cx={xOfD(d.points[d.points.length - 1].m)} cy={yOf(d.final)} r={3.5} fill={pnlColor(d.final)} />
                      <text
                        x={(x0 + x1) / 2}
                        y={20}
                        textAnchor="middle"
                        fontSize={12.5}
                        fontWeight={700}
                        fill={pnlColor(d.final)}
                      >
                        {money(d.final)}
                      </text>
                    </g>
                  );
                })()
              ) : (
                <text x={(x0 + x1) / 2} y={yOf(0) - 8} textAnchor="middle" className="fill-[var(--muted)]" fontSize={11}>
                  no trades
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------- MONTH ---------- */

function MonthHero({ days }: { days: DayModel[] }) {
  const [hotDate, setHotDate] = useState<string | null>(null);
  const [tip, setTip] = useState<TipState>(null);

  const W = 960;
  const H = 300;
  const PAD = { l: 56, r: 86, t: 22, b: 34 };
  const m0 = quantile(days.map((d) => d.trades[0].minuteET), 0.05);
  const m1 = quantile(days.map((d) => d.points[d.points.length - 1].m), 0.95);
  const yAbs = quantile(days.map((d) => Math.abs(d.final)), 0.95) * 1.15;
  const xOf = (m: number) => scale(clamp(m, m0, m1), m0, m1, PAD.l, W - PAD.r);
  const yOf = (v: number) => scale(clamp(v, -yAbs, yAbs), -yAbs, yAbs, H - PAD.b, PAD.t);

  const grid: number[] = [];
  for (let m = m0; m <= m1; m += 5) grid.push(m);
  const valueAt = (d: DayModel, m: number) => {
    if (m < d.points[0].m) return 0;
    let v = 0;
    for (const p of d.points) {
      if (p.m <= m) v = p.v;
      else break;
    }
    return v;
  };
  const medianCurve = grid.map((m) => ({ m, v: median(days.map((d) => valueAt(d, m))) ?? 0 }));

  return (
    <div className="relative mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="All of the month's session paths overlaid with the median path bold"
        onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const py = ((e.clientY - rect.top) / rect.height) * H;
          let best: DayModel | null = null;
          let bestD = 13;
          for (const d of days) {
            for (const p of d.points) {
              const dist = Math.hypot(xOf(p.m) - px, yOf(p.v) - py);
              if (dist < bestD) {
                bestD = dist;
                best = d;
              }
            }
          }
          setHotDate(best ? best.date : null);
          setTip(
            best
              ? {
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  body: (
                    <div className="grid gap-0.5">
                      <div className="mb-1 font-semibold text-[var(--foreground)]">{prettyDate(best.date)}</div>
                      <TipRow label="Final" value={money(best.final)} tone={pnlColor(best.final)} />
                      <TipRow label="Trades" value={String(best.trades.length)} />
                      {best.giveBack > 40 ? <TipRow label="Gave back" value={money(-best.giveBack)} tone={RED} /> : null}
                    </div>
                  ),
                }
              : null,
          );
        }}
        onPointerLeave={() => {
          setTip(null);
          setHotDate(null);
        }}
      >
        {[m0, (m0 + m1) / 2, m1].map((m) => (
          <text key={m} x={xOf(m)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
            {timeLabel(m)}
          </text>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke="var(--border)" />
        <text x={8} y={yOf(yAbs) + 8} className="fill-[var(--muted)]" fontSize={10}>
          {money(yAbs)}
        </text>
        <text x={8} y={yOf(0) + 3} className="fill-[var(--muted)]" fontSize={10}>
          $0
        </text>
        <text x={8} y={yOf(-yAbs)} className="fill-[var(--muted)]" fontSize={10}>
          {money(-yAbs)}
        </text>

        {days.map((d) => {
          const active = hotDate === d.date;
          const dimmed = hotDate != null && !active;
          return (
            <g key={d.date}>
              <polyline
                points={[{ m: d.trades[0].minuteET, v: 0 }, ...d.points].map((p) => `${xOf(p.m)},${yOf(p.v)}`).join(" ")}
                fill="none"
                stroke={active ? pnlColor(d.final) : "var(--muted)"}
                strokeWidth={active ? 2 : 1}
                opacity={active ? 0.95 : dimmed ? 0.08 : 0.25}
                strokeLinejoin="round"
              />
              <circle
                cx={xOf(d.points[d.points.length - 1].m)}
                cy={yOf(d.final)}
                r={active ? 4.5 : 2.5}
                fill={pnlColor(d.final)}
                opacity={dimmed ? 0.15 : 0.8}
              />
            </g>
          );
        })}
        <polyline
          points={medianCurve.map((p) => `${xOf(p.m)},${yOf(p.v)}`).join(" ")}
          fill="none"
          stroke={ACCENT}
          strokeWidth={2.5}
          strokeLinejoin="round"
          opacity={hotDate ? 0.35 : 1}
        />
        <text x={W - PAD.r + 6} y={yOf(medianCurve[medianCurve.length - 1].v) + 3} className="fill-[var(--accent)]" fontSize={10.5} fontWeight={600}>
          median day
        </text>
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

/* ---------- aggregate reads for week/month ---------- */

function aggregateReads(trades: SeqTrade[], scopeNoun: string): Read[] {
  const reads: Read[] = [];
  const MIN_N = 8;

  const withGap = trades.filter((t) => t.gapMin != null);
  const fast = withGap.filter((t) => t.gapMin! < 1);
  const slow = withGap.filter((t) => t.gapMin! >= 15);
  if (fast.length >= MIN_N && slow.length >= MIN_N) {
    reads.push({
      label: "Pace",
      body: (
        <>
          Entries under a minute after the last exit made <Mono tone={pnlColor(expectancy(fast)!)}>{money(expectancy(fast)!)}/t</Mono>{" "}
          (n={fast.length}); after a 15-minute breath, <Mono tone={pnlColor(expectancy(slow)!)}>{money(expectancy(slow)!)}/t</Mono>{" "}
          (n={slow.length}).
        </>
      ),
    });
  } else if (fast.length) {
    reads.push({
      label: "Pace",
      body: (
        <>
          {fast.length} entr{fast.length === 1 ? "y" : "ies"} under a minute after an exit this {scopeNoun} — too few for a rate; they
          netted <Mono tone={pnlColor(fast.reduce((a, t) => a + t.pnl, 0))}>{money(fast.reduce((a, t) => a + t.pnl, 0))}</Mono>.
        </>
      ),
    });
  }

  const afterBig = trades.filter((t) => {
    if (t.prevId == null) return false;
    const prev = seqById.get(t.prevId)!;
    return prev.pnl <= -BIG_LOSS_CUT;
  });
  if (afterBig.length >= MIN_N) {
    const ratios = afterBig.map((t) => {
      const prev = seqById.get(t.prevId!)!;
      return (t.qty * t.entry) / (prev.qty * prev.entry);
    });
    reads.push({
      label: "After big losses",
      body: (
        <>
          {afterBig.length} times a trade followed a ${Math.round(BIG_LOSS_CUT)}+ loss: median re-entry{" "}
          <Mono>{gapLabel(median(afterBig.map((t) => t.gapMin!))!)}</Mono> later at <Mono>{median(ratios)!.toFixed(2)}×</Mono> size, making{" "}
          <Mono tone={pnlColor(expectancy(afterBig)!)}>{money(expectancy(afterBig)!)}/t</Mono>.
        </>
      ),
    });
  }

  const scored = trades.map((t) => ({ t, fav: isFavorable(t), dollars: t.qty * t.entry })).filter((s) => s.fav != null);
  if (scored.length >= 20) {
    const cut = quantile(scored.map((s) => s.dollars), 0.75);
    const big = scored.filter((s) => s.dollars >= cut);
    const bigFav = big.filter((s) => s.fav);
    const share = Math.round((bigFav.length / big.length) * 100);
    reads.push({
      label: "Conviction",
      body: (
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>
            <Mono>{share}%</Mono> of your top-quartile bets this {scopeNoun} landed in favorable conditions
            {bigFav.length >= MIN_N ? (
              <>
                {" "}
                — there they made <Mono tone={pnlColor(expectancy(bigFav.map((s) => s.t))!)}>{money(expectancy(bigFav.map((s) => s.t))!)}/t</Mono>
              </>
            ) : null}
            .
          </span>
          <span className="relative inline-block h-2 w-28 overflow-hidden rounded bg-[var(--surface-2)] align-middle">
            <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${share}%`, background: ACCENT }} />
          </span>
        </span>
      ),
    });
  }

  return reads;
}

/* ---------- page ---------- */

type Scope = "day" | "week" | "month";

export default function DataVizJournalLenses() {
  const defaultDate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of seqTrades) counts.set(t.date, (counts.get(t.date) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }, []);

  const [scope, setScope] = useState<Scope>("day");
  const [date, setDate] = useState(defaultDate);

  const day = useMemo(() => buildDay(date), [date]);

  const weekDays = useMemo(() => {
    const monday = mondayOf(date);
    return [0, 1, 2, 3, 4].map((i) => buildDay(addDays(monday, i)));
  }, [date]);

  const monthDays = useMemo(() => {
    const prefix = date.slice(0, 7);
    return allDates.filter((d) => d.startsWith(prefix)).map((d) => buildDay(d)!)
      .filter(Boolean);
  }, [date]);

  const weekTrades = weekDays.flatMap((d) => d?.trades ?? []);
  const monthTrades = monthDays.flatMap((d) => d.trades);

  const monthLabel = `${MONTHS[Number(date.slice(5, 7)) - 1]} 2026`;
  const weekLabel = `week of ${prettyDate(mondayOf(date))}`;

  const dayTitle = day
    ? day.giveBack > Math.abs(day.final) * 0.4 && day.peak.v > 100
      ? `${prettyDate(date)}: peaked at ${money(day.peak.v)}, kept ${money(day.final)}.`
      : day.t80 != null
        ? `${prettyDate(date)}: ${money(day.final)}, and 80% of it was banked by ${timeLabel(day.t80)}.`
        : `${prettyDate(date)}: ${money(day.final)} across ${day.trades.length} trades.`
    : "No trades on this date.";

  const weekFinal = weekDays.reduce((a, d) => a + (d?.final ?? 0), 0);
  const weekBest = weekDays.filter(Boolean).length
    ? weekDays.reduce((m, d) => ((d?.final ?? -Infinity) > (m?.final ?? -Infinity) ? d : m), null as DayModel | null)
    : null;
  const weekTitle = weekBest
    ? `The ${weekLabel} netted ${money(weekFinal)} — ${prettyDate(weekBest.date)} carried ${money(weekBest.final)} of it.`
    : `No trades in the ${weekLabel}.`;

  const monthFinal = monthDays.reduce((a, d) => a + d.final, 0);
  const monthT80 = median(
    monthDays
      .filter((d) => Math.abs(d.final) >= 100 && d.t80 != null)
      .map((d) => d.t80!),
  );
  const monthTitle =
    monthT80 != null
      ? `${monthLabel}: ${money(monthFinal)} across ${monthDays.length} sessions — half of the decisive ones were 80% built by ${timeLabel(monthT80)}.`
      : `${monthLabel}: ${money(monthFinal)} across ${monthDays.length} sessions.`;

  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v7</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">Journal Lenses</h1>
          <p className="mt-1 max-w-[680px] text-[13px] leading-6 text-[var(--body)]">
            The discovery winners at journal scale. One visual system across day, week, and month — the session path — and behavioral
            reads that stay honest about sample size: <em>facts</em> at day scope, <em>statistics</em> at week and month.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz" className="text-[var(--accent)] hover:underline">← Data viz index</Link>
          <Link href="/preview/data-viz/v6" className="text-[var(--accent)] hover:underline">
            ← v6 price-action quality
          </Link>
          <Link href="/preview/journal" className="text-[var(--accent)] hover:underline">
            ← journal prototype
          </Link>
        </div>
      </header>

      {/* scope + date — mirrors the journal module's day/week/month switcher */}
      <div className="sticky top-0 z-20 -mx-4 border-y border-[var(--hairline)] bg-[var(--background)]/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-1.5">
          {(["day", "week", "month"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className={`min-h-8 rounded-full px-3.5 text-[12px] font-semibold capitalize transition-colors ${
                scope === s ? "bg-[var(--foreground)] text-[var(--background)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-[var(--border)]" />
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Select date"
            className="min-h-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-semibold text-[var(--foreground)]"
          >
            {allDates.map((d) => (
              <option key={d} value={d}>
                {prettyDate(d)} · {seqTrades.filter((t) => t.date === d).length} trades
              </option>
            ))}
          </select>
          <span className="ml-auto hidden text-[11px] text-[var(--muted)] sm:block">Week and month follow the selected date</span>
        </div>
      </div>

      {scope === "day" && day ? (
        <>
          <section className="relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              The shape of the day
            </div>
            <h2 className="mt-2 text-[17px] font-semibold leading-6 text-[var(--foreground)]">{dayTitle}</h2>
            <DayHero model={day} />
            <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">
              Cumulative P&L, stepped at each exit. Dots are trades, colored by their own result. The shaded band is ground taken and
              given back after the peak — the &quot;walk-away&quot; conversation, drawn.
            </p>
          </section>
          <ReadsStrip heading="Three moments worth a sentence" reads={dayReads(day)} />
        </>
      ) : null}
      {scope === "day" && !day ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">
          No trades on {prettyDate(date)}.
        </p>
      ) : null}

      {scope === "week" ? (
        <>
          <section className="relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Five shapes, one scale
            </div>
            <h2 className="mt-2 text-[17px] font-semibold leading-6 text-[var(--foreground)]">{weekTitle}</h2>
            <WeekHero days={weekDays} />
            <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">
              Every panel shares the same dollar scale, so a flat Tuesday stays flat next to a big Thursday. The small gray dot marks
              each day&apos;s peak — distance between the dot and the end is the give-back.
            </p>
          </section>
          <ReadsStrip heading={`The week's behavior, in aggregate`} reads={aggregateReads(weekTrades, "week")} />
        </>
      ) : null}

      {scope === "month" ? (
        <>
          <section className="relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Every session, one storm system
            </div>
            <h2 className="mt-2 text-[17px] font-semibold leading-6 text-[var(--foreground)]">{monthTitle}</h2>
            <MonthHero days={monthDays} />
            <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">
              All of the month&apos;s session paths overlaid; the accent line is the median day. Hover any path to isolate one session.
              The same chart at day scope is one line with its annotations — the visual system holds across all three altitudes.
            </p>
          </section>
          <ReadsStrip heading={`The month's behavior, in aggregate`} reads={aggregateReads(monthTrades, "month")} />
        </>
      ) : null}

      <footer className="pb-6 text-center text-[11px] leading-5 text-[var(--muted)]">
        Demo data · desktop-only preview · day reads are facts about moments; week/month reads are statistics with sample sizes — the
        honesty gradient the journal module should keep
      </footer>
    </main>
  );
}
