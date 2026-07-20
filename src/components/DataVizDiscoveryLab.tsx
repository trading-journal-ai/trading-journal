"use client";

// v6 "discovery lab" — relationship lenses that cross datasets in ways the
// standard reports never do. Every claim is computed from the real trade×candle
// join (candleJoinData). House rules: claim-as-headline, worded keys, outcome
// colors only for outcomes, hindsight labeled, tooltips never gate.
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

function winRate(list: { pnl: number }[]): number | null {
  return list.length ? Math.round((list.filter((t) => t.pnl > 0).length / list.length) * 100) : null;
}

/* ---------- sequencing derivations (shared by several lenses) ---------- */

type SeqTrade = JoinedTrade & {
  exitMin: number;
  exitPrice: number; // estimated from entry + realized per-share
  seqInDay: number; // 1-based order within the date, across symbols
  nthInSymbolDay: number; // 1-based order within symbol+date
  gapMin: number | null; // minutes since previous trade's exit, same date
  prev: number | null; // id of previous trade that date
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
    const nthBySymbol = new Map<string, number>();
    let prev: SeqTrade | null = null;
    list.forEach((t, i) => {
      const nth = (nthBySymbol.get(t.symbol) ?? 0) + 1;
      nthBySymbol.set(t.symbol, nth);
      const perShare = t.pnl / t.qty;
      const s: SeqTrade = {
        ...t,
        exitMin: t.minuteET + t.holdSec / 60,
        exitPrice: t.side === "short" ? t.entry - perShare : t.entry + perShare,
        seqInDay: i + 1,
        nthInSymbolDay: nth,
        gapMin: prev ? Math.max(0, t.minuteET - prev.exitMin) : null,
        prev: prev ? prev.id : null,
      };
      out.push(s);
      prev = s;
    });
  }
  return out;
})();

const seqById = new Map(seqTrades.map((t) => [t.id, t]));

/* ---------- tooltip ---------- */

type TipState = { x: number; y: number; body: ReactNode } | null;

function Tip({ tip }: { tip: TipState }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 max-w-[280px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[12px] leading-5 shadow-lg"
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

/* ---------- lens chrome ---------- */

function Lens({
  index,
  family,
  title,
  keyLine,
  children,
  caveat,
}: {
  index: string;
  family: string;
  title: string;
  keyLine: ReactNode;
  children: ReactNode;
  caveat: string;
}) {
  return (
    <section className="relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {index} · {family}
      </div>
      <h2 className="mt-2 max-w-[860px] text-[17px] font-semibold leading-6 text-[var(--foreground)]">{title}</h2>
      <div className="mt-2 text-[11.5px] leading-5 text-[var(--muted)]">{keyLine}</div>
      {children}
      <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">{caveat}</p>
    </section>
  );
}

function Key({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-[var(--body)]">{children}</strong>;
}

/* ---------- L1: the shape of your day ---------- */

function DayShape() {
  const [tip, setTip] = useState<TipState>(null);
  const [hotDate, setHotDate] = useState<string | null>(null);

  const model = useMemo(() => {
    const byDate = new Map<string, SeqTrade[]>();
    for (const t of seqTrades) {
      const list = byDate.get(t.date) ?? [];
      list.push(t);
      byDate.set(t.date, list);
    }
    const days = [...byDate.entries()].map(([date, list]) => {
      let cum = 0;
      const points = [{ m: list[0].minuteET, v: 0 }];
      for (const t of list) {
        cum += t.pnl;
        points.push({ m: t.exitMin, v: cum });
      }
      return { date, points, final: cum, trades: list.length };
    });

    const t0 = quantile(days.map((d) => d.points[0].m), 0.02);
    const t1 = quantile(days.map((d) => d.points[d.points.length - 1].m), 0.98);
    const grid: number[] = [];
    for (let m = t0; m <= t1; m += 5) grid.push(m);

    const valueAt = (d: (typeof days)[number], m: number) => {
      if (m < d.points[0].m) return 0;
      let v = 0;
      for (const p of d.points) {
        if (p.m <= m) v = p.v;
        else break;
      }
      return v;
    };
    const medianCurve = grid.map((m) => ({ m, v: median(days.map((d) => valueAt(d, m))) ?? 0 }));
    const finalMedian = medianCurve[medianCurve.length - 1].v;
    // per-day: when did THIS day first reach 80% of its own final result?
    const perDayT80 = days
      .filter((d) => Math.abs(d.final) >= 100)
      .map((d) => {
        for (const p of d.points) {
          if (Math.sign(p.v) === Math.sign(d.final) && Math.abs(p.v) >= 0.8 * Math.abs(d.final)) return p.m;
        }
        return d.points[d.points.length - 1].m;
      });
    const t80 = median(perDayT80);
    const yAbs = quantile(days.map((d) => Math.abs(d.final)), 0.95);
    return { days, grid, t0, t1, medianCurve, finalMedian, t80, yAbs };
  }, []);

  const W = 960;
  const H = 340;
  const PAD = { l: 56, r: 70, t: 20, b: 34 };
  const xOf = (m: number) => scale(clamp(m, model.t0, model.t1), model.t0, model.t1, PAD.l, W - PAD.r);
  const yOf = (v: number) => scale(clamp(v, -model.yAbs, model.yAbs), -model.yAbs, model.yAbs, H - PAD.b, PAD.t);

  const title =
    model.t80 != null
      ? `Half of your decisive sessions are 80% built by ${timeLabel(model.t80)} — the rest of the day mostly redraws the same number.`
      : "No single build-time dominates — the median session forms gradually.";

  return (
    <Lens
      index="D1"
      family="Session storm tracks · every day overlaid"
      title={title}
      keyLine={
        <>
          <Key>Faint lines</Key> · each of {model.days.length} sessions&apos; cumulative P&L through the day (dollars, clamped at the 95th
          percentile) — <Key>green / red end dot</Key> · how the day finished — <Key>bold line</Key> · the median cumulative P&L across
          all days at each clock minute. Hover a line to isolate one day.
        </>
      }
      caveat="Cumulative P&L is stepped at each trade's exit. The median curve is a cross-day composite — no single day traded it. The 80%-built time is computed per day (days with a final result of $100+ either way), then the median of those times is reported."
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Overlaid cumulative intraday P&L paths for every session with the median path bold"
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const py = ((e.clientY - rect.top) / rect.height) * H;
            let best: (typeof model.days)[number] | null = null;
            let bestD = 14;
            for (const d of model.days) {
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
                        <div className="mb-1 font-semibold text-[var(--foreground)]">{best.date}</div>
                        <TipRow label="Final" value={money(best.final)} tone={pnlColor(best.final)} />
                        <TipRow label="Trades" value={String(best.trades)} />
                        <TipRow label="First entry" value={`${timeLabel(best.points[0].m)} ET`} />
                        <TipRow label="Last exit" value={`${timeLabel(best.points[best.points.length - 1].m)} ET`} />
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
          {[model.t0, (model.t0 + model.t1) / 2, model.t1].map((m) => (
            <text key={m} x={xOf(m)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
              {timeLabel(m)}
            </text>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(0)} y2={yOf(0)} stroke="var(--border)" />
          <text x={8} y={yOf(model.yAbs) + 8} className="fill-[var(--muted)]" fontSize={10}>
            {money(model.yAbs)}
          </text>
          <text x={8} y={yOf(0) + 3} className="fill-[var(--muted)]" fontSize={10}>
            $0
          </text>
          <text x={8} y={yOf(-model.yAbs)} className="fill-[var(--muted)]" fontSize={10}>
            {money(-model.yAbs)}
          </text>

          {model.days.map((d) => {
            const active = hotDate === d.date;
            const dimmed = hotDate != null && !active;
            return (
              <g key={d.date}>
                <polyline
                  points={d.points.map((p) => `${xOf(p.m)},${yOf(p.v)}`).join(" ")}
                  fill="none"
                  stroke={active ? pnlColor(d.final) : "var(--muted)"}
                  strokeWidth={active ? 2 : 1}
                  opacity={active ? 0.95 : dimmed ? 0.08 : 0.22}
                  strokeLinejoin="round"
                />
                <circle
                  cx={xOf(d.points[d.points.length - 1].m)}
                  cy={yOf(d.final)}
                  r={active ? 4.5 : 2.5}
                  fill={pnlColor(d.final)}
                  opacity={dimmed ? 0.15 : 0.75}
                />
              </g>
            );
          })}

          <polyline
            points={model.medianCurve.map((p) => `${xOf(p.m)},${yOf(p.v)}`).join(" ")}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2.5}
            strokeLinejoin="round"
            opacity={hotDate ? 0.35 : 1}
          />
          <text
            x={W - PAD.r + 6}
            y={yOf(model.finalMedian) + 3}
            className="fill-[var(--accent)]"
            fontSize={10.5}
            fontWeight={600}
          >
            median {money(model.finalMedian)}
          </text>
          {model.t80 != null ? (
            <g>
              <line x1={xOf(model.t80)} x2={xOf(model.t80)} y1={PAD.t} y2={H - PAD.b} stroke={ACCENT} strokeWidth={1} opacity={0.4} />
              <text x={xOf(model.t80) + 4} y={PAD.t + 10} className="fill-[var(--accent)]" fontSize={10.5} fontWeight={600}>
                80% built · {timeLabel(model.t80)}
              </text>
            </g>
          ) : null}
        </svg>
        <Tip tip={tip} />
      </div>
    </Lens>
  );
}

/* ---------- L2: the echo (what a loss does to the next trade) ---------- */

function LossEcho() {
  const model = useMemo(() => {
    const pairs = seqTrades
      .filter((t) => t.prev != null)
      .map((t) => ({ next: t, prev: seqById.get(t.prev!)! }));
    const lossCut = Math.abs(quantile(joinedTrades.filter((t) => t.pnl < 0).map((t) => t.pnl), 0.25)); // big loss = worst quartile
    const cohorts = [
      { key: "win", label: "after a win", test: (p: (typeof pairs)[number]) => p.prev.pnl > 0 },
      { key: "loss", label: "after a normal loss", test: (p: (typeof pairs)[number]) => p.prev.pnl < 0 && Math.abs(p.prev.pnl) < lossCut },
      { key: "bigloss", label: `after a big loss (>$${Math.round(lossCut)})`, test: (p: (typeof pairs)[number]) => p.prev.pnl <= -lossCut },
    ].map((c) => {
      const g = pairs.filter(c.test);
      return {
        ...c,
        n: g.length,
        gap: median(g.map((p) => p.next.gapMin!)),
        sizeRatio: median(g.map((p) => (p.next.qty * p.next.entry) / (p.prev.qty * p.prev.entry))),
        wr: winRate(g.map((p) => p.next)),
        exp: expectancy(g.map((p) => p.next)),
      };
    });
    const baseline = {
      wr: winRate(pairs.map((p) => p.next)),
      exp: expectancy(pairs.map((p) => p.next)),
      gap: median(pairs.map((p) => p.next.gapMin!)),
    };
    return { cohorts, baseline, lossCut, nPairs: pairs.length };
  }, []);

  const big = model.cohorts[2];
  const win = model.cohorts[0];
  const title =
    big.exp != null && win.exp != null
      ? `A big loss echoes: your next trade comes ${gapLabel(big.gap ?? 0)} later at ${(big.sizeRatio ?? 1).toFixed(2)}× size and makes ${money(big.exp)} — after a win it makes ${money(win.exp!)}.`
      : "Not enough consecutive-trade pairs to measure the echo.";

  const maxExp = Math.max(20, ...model.cohorts.map((c) => Math.abs(c.exp ?? 0)));

  return (
    <Lens
      index="D2"
      family="The echo · what the previous trade does to the next one"
      title={title}
      keyLine={
        <>
          Each row conditions the <Key>next trade</Key> on what the <Key>previous trade</Key> did, same session ({model.nPairs}{" "}
          consecutive pairs). <Key>Gap</Key> · median minutes from previous exit to next entry — <Key>size</Key> · median next-vs-previous
          position dollars — bar · next-trade expectancy vs the {money(model.baseline.exp ?? 0)} all-pairs baseline (hairline).
        </>
      }
      caveat="Descriptive, not causal — a big loss often happens in a degrading tape, and the next trade inherits the tape too. But gap and size are decisions: if size rises after big losses while expectancy falls, that pattern has a name."
    >
      <div className="mt-4 grid gap-2.5">
        {model.cohorts.map((c) => (
          <div key={c.key} className="grid gap-1 sm:grid-cols-[210px_92px_86px_minmax(0,1fr)_150px] sm:items-center sm:gap-3">
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{c.label}</div>
            <div className="font-mono text-[12px] tabular-nums text-[var(--body)]">
              <span className="text-[var(--muted)]">gap </span>
              {c.gap != null ? gapLabel(c.gap) : "—"}
            </div>
            <div className="font-mono text-[12px] tabular-nums text-[var(--body)]">
              <span className="text-[var(--muted)]">size </span>
              {c.sizeRatio != null ? `${c.sizeRatio.toFixed(2)}×` : "—"}
            </div>
            <div className="relative hidden h-7 sm:block">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
              {model.baseline.exp != null ? (
                <div
                  className="absolute inset-y-0 w-px bg-[var(--foreground)] opacity-40"
                  style={{ left: `${50 + (clamp(model.baseline.exp, -maxExp, maxExp) / maxExp) * 48}%` }}
                />
              ) : null}
              {c.exp != null ? (
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    background: pnlColor(c.exp),
                    opacity: 0.85,
                    left: c.exp >= 0 ? "50%" : `${50 - (Math.abs(c.exp) / maxExp) * 48}%`,
                    width: `${Math.max(0.5, (Math.abs(c.exp) / maxExp) * 48)}%`,
                  }}
                />
              ) : null}
            </div>
            <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)]">
              {c.exp == null ? (
                "—"
              ) : (
                <>
                  <span className="font-semibold" style={{ color: pnlColor(c.exp) }}>
                    {money(c.exp)}
                  </span>
                  <span className="text-[var(--muted)]">
                    {" "}
                    /t · {c.wr}% · n={c.n}
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Lens>
  );
}

/* ---------- L3: the conviction test (size vs conditions) ---------- */

function ConvictionTest() {
  const model = useMemo(() => {
    const scored = joinedTrades
      .filter((t) => t.relVol != null && t.minSinceHigh != null && t.pmHighDistPct != null)
      .map((t) => {
        let score = 0;
        if (t.relVol! >= 2 && t.relVol! < 6) score += 1; // elevated but not climactic
        if (t.minSinceHigh! <= 2) score += 1; // fresh high
        if (t.pmHighDistPct! > 0) score += 1; // through the premarket high
        return { t, score, dollars: t.qty * t.entry };
      });
    const sizeCut = quantile(scored.map((s) => s.dollars), 0.75);
    const cells = [
      { key: "bigfav", label: "Big size · favorable", test: (s: (typeof scored)[number]) => s.dollars >= sizeCut && s.score >= 2 },
      { key: "bigunf", label: "Big size · unfavorable", test: (s: (typeof scored)[number]) => s.dollars >= sizeCut && s.score < 2 },
      { key: "smallfav", label: "Normal size · favorable", test: (s: (typeof scored)[number]) => s.dollars < sizeCut && s.score >= 2 },
      { key: "smallunf", label: "Normal size · unfavorable", test: (s: (typeof scored)[number]) => s.dollars < sizeCut && s.score < 2 },
    ].map((c) => {
      const g = scored.filter(c.test).map((s) => s.t);
      return { ...c, n: g.length, exp: expectancy(g), wr: winRate(g) };
    });
    const bigTotal = cells[0].n + cells[1].n;
    const calibration = bigTotal ? Math.round((cells[0].n / bigTotal) * 100) : null;
    return { cells, calibration, sizeCut, n: scored.length };
  }, []);

  const bigFav = model.cells[0];
  const bigUnf = model.cells[1];
  const maxAbs = Math.max(...model.cells.map((c) => Math.abs(c.exp ?? 0)), 1);
  const title =
    model.calibration != null && bigFav.exp != null && bigUnf.exp != null
      ? `Only ${model.calibration}% of your biggest bets land in favorable conditions — there they make ${money(bigFav.exp)}/t; elsewhere ${money(bigUnf.exp)}/t.`
      : "Not enough condition data to test conviction calibration.";

  return (
    <Lens
      index="D3"
      family="The conviction test · does your size know what your scanner knows?"
      title={title}
      keyLine={
        <>
          <Key>Favorable</Key> · at least 2 of 3 entry-time conditions: rel. volume 2–6×, within 2m of a fresh high, above the premarket
          high (no hindsight fields). <Key>Big size</Key> · top-quartile position dollars (&ge; ${Math.round(model.sizeCut).toLocaleString()}).
          Cell tint · expectancy. {model.n} trades carry all three condition fields.
        </>
      }
      caveat="Sizing with conviction is fine — if conviction tracks conditions. A calibrated book concentrates its big bets in the favorable column. The score is one reasonable definition of favorable, not the only one; the production version should use the trader's own playbook conditions."
    >
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {model.cells.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-[var(--hairline)] px-4 py-3.5"
            style={{
              backgroundColor:
                c.exp == null || c.n < 50
                  ? undefined
                  : c.exp >= 0
                    ? `color-mix(in srgb, var(--green) ${Math.round(8 + (Math.abs(c.exp) / maxAbs) * 26)}%, transparent)`
                    : `color-mix(in srgb, var(--red) ${Math.round(8 + (Math.abs(c.exp) / maxAbs) * 26)}%, transparent)`,
            }}
          >
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{c.label}</div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                className="font-mono text-[16px] font-semibold tabular-nums"
                style={{ color: c.n < 50 ? "var(--muted)" : pnlColor(c.exp ?? 0) }}
              >
                {c.exp == null ? "—" : `${money(c.exp)}/t`}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {c.wr}% win · n={c.n}
                {c.n < 50 ? " · small sample" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Lens>
  );
}

/* ---------- L4: paying up to get back in ---------- */

function ReentryPremium() {
  const [tip, setTip] = useState<TipState>(null);

  const model = useMemo(() => {
    const reentries = seqTrades
      .filter((t) => t.prev != null)
      .map((t) => ({ next: t, prev: seqById.get(t.prev!)! }))
      .filter((p) => p.next.symbol === p.prev.symbol && p.next.minuteET - p.prev.exitMin <= 15)
      .map((p) => ({
        ...p,
        premiumPct: ((p.next.entry - p.prev.exitPrice) / p.prev.exitPrice) * 100 * (p.next.side === "short" ? -1 : 1),
      }));
    const firstTouches = seqTrades.filter((t) => t.nthInSymbolDay === 1);
    const paidUp = reentries.filter((r) => r.premiumPct > 0);
    return {
      reentries,
      medPremium: median(reentries.map((r) => r.premiumPct)),
      paidUpShare: reentries.length ? Math.round((paidUp.length / reentries.length) * 100) : null,
      reExp: expectancy(reentries.map((r) => r.next)),
      reWr: winRate(reentries.map((r) => r.next)),
      ftExp: expectancy(firstTouches),
      ftWr: winRate(firstTouches),
      nFirst: firstTouches.length,
    };
  }, []);

  const W = 960;
  const H = 190;
  const PAD = { l: 56, r: 20, t: 30, b: 34 };
  const xAbs = Math.max(2, quantile(model.reentries.map((r) => Math.abs(r.premiumPct)), 0.95));
  const xOf = (v: number) => scale(clamp(v, -xAbs, xAbs), -xAbs, xAbs, PAD.l, W - PAD.r);
  const midY = PAD.t + (H - PAD.t - PAD.b) / 2;
  const jitter = (id: number) => (((id * 2654435761) % 1000) / 1000 - 0.5) * 2 * 34;

  const title =
    model.medPremium != null && model.reExp != null && model.ftExp != null
      ? `Getting back in within 15 minutes cost a median ${model.medPremium >= 0 ? "+" : ""}${model.medPremium.toFixed(1)}% over your exit — and those re-entries made ${money(model.reExp)}/t vs ${money(model.ftExp)}/t on first touches.`
      : "Too few quick re-entries to measure a premium.";

  return (
    <Lens
      index="D4"
      family="The re-entry premium · chasing your own exit"
      title={title}
      keyLine={
        <>
          Each dot is a <Key>same-symbol re-entry within 15 minutes of your exit</Key> ({model.reentries.length} of them), placed by the
          price you paid vs the price you left at. <Key>Right of zero</Key> · you paid up to get back in — <Key>left</Key> · you re-entered
          cheaper. Dot color · that re-entry&apos;s outcome. {model.paidUpShare}% paid up.
        </>
      }
      caveat="Exit price is estimated from realized P&L per share (fees are ~0 in the demo data). A paid-up re-entry that wins is momentum discipline; a paid-up re-entry that loses is the toll of hesitation. The split by outcome is the read."
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Re-entry premium versus prior exit, colored by outcome"
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const py = ((e.clientY - rect.top) / rect.height) * H;
            let best: (typeof model.reentries)[number] | null = null;
            let bestD = 18;
            for (const r of model.reentries) {
              const d = Math.hypot(xOf(r.premiumPct) - px, midY + jitter(r.next.id) - py);
              if (d < bestD) {
                bestD = d;
                best = r;
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
                            {best.next.symbol} · {best.next.date}
                          </span>
                          <span className="font-mono font-semibold" style={{ color: pnlColor(best.next.pnl) }}>
                            {money(best.next.pnl)}
                          </span>
                        </div>
                        <TipRow label="Left at" value={`$${best.prev.exitPrice.toFixed(2)} (${timeLabel(best.prev.exitMin)})`} />
                        <TipRow label="Back in at" value={`$${best.next.entry.toFixed(2)} (${timeLabel(best.next.minuteET)})`} />
                        <TipRow
                          label="Premium"
                          value={`${best.premiumPct >= 0 ? "+" : ""}${best.premiumPct.toFixed(1)}%`}
                          tone={best.premiumPct > 0 ? RED : GREEN}
                        />
                        <TipRow label="Prior trade" value={money(best.prev.pnl)} tone={pnlColor(best.prev.pnl)} />
                      </div>
                    ),
                  }
                : null,
            );
          }}
          onPointerLeave={() => setTip(null)}
        >
          {[-xAbs, -xAbs / 2, 0, xAbs / 2, xAbs].map((v) => (
            <g key={v}>
              <line x1={xOf(v)} x2={xOf(v)} y1={PAD.t} y2={H - PAD.b} stroke={v === 0 ? "var(--border)" : "var(--hairline)"} />
              <text x={xOf(v)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
                {v > 0 ? "+" : ""}
                {v.toFixed(v === 0 ? 0 : 1)}%
              </text>
            </g>
          ))}
          <text x={PAD.l} y={PAD.t - 10} className="fill-[var(--muted)]" fontSize={10.5}>
            ← re-entered cheaper
          </text>
          <text x={W - PAD.r} y={PAD.t - 10} textAnchor="end" className="fill-[var(--muted)]" fontSize={10.5}>
            paid up to get back in →
          </text>
          {model.reentries.map((r) => (
            <circle
              key={r.next.id}
              cx={xOf(r.premiumPct)}
              cy={midY + jitter(r.next.id)}
              r={4}
              fill={pnlColor(r.next.pnl)}
              opacity={0.7}
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
          ))}
          {model.medPremium != null ? (
            <g>
              <line x1={xOf(model.medPremium)} x2={xOf(model.medPremium)} y1={PAD.t} y2={H - PAD.b} stroke="var(--foreground)" strokeWidth={2} />
              <text x={xOf(model.medPremium) + 5} y={PAD.t + 10} className="fill-[var(--foreground)]" fontSize={10.5} fontWeight={600}>
                median {model.medPremium >= 0 ? "+" : ""}
                {model.medPremium.toFixed(1)}%
              </text>
            </g>
          ) : null}
        </svg>
        <Tip tip={tip} />
      </div>
    </Lens>
  );
}

/* ---------- L5: the nth bite ---------- */

function NthBite() {
  const model = useMemo(() => {
    const bins = [
      { label: "1st trade in a name", test: (t: SeqTrade) => t.nthInSymbolDay === 1 },
      { label: "2nd", test: (t: SeqTrade) => t.nthInSymbolDay === 2 },
      { label: "3rd", test: (t: SeqTrade) => t.nthInSymbolDay === 3 },
      { label: "4th–6th", test: (t: SeqTrade) => t.nthInSymbolDay >= 4 && t.nthInSymbolDay <= 6 },
      { label: "7th+", test: (t: SeqTrade) => t.nthInSymbolDay >= 7 },
    ].map((b) => {
      const g = seqTrades.filter(b.test);
      return { ...b, n: g.length, exp: expectancy(g), wr: winRate(g) };
    });
    return { bins };
  }, []);

  const first = model.bins[0];
  const late = model.bins[4];
  const title =
    first.exp != null && late.exp != null
      ? `The first bite of a ticker pays ${money(first.exp)}/t; by the 7th bite it pays ${money(late.exp)}/t.`
      : "Not enough repeat visits to compare.";
  const maxAbs = Math.max(20, ...model.bins.map((b) => Math.abs(b.exp ?? 0)));

  return (
    <Lens
      index="D5"
      family="The nth bite · does a ticker reward repeat visits?"
      title={title}
      keyLine={
        <>
          Trades grouped by <Key>how many times you had already traded that symbol that day</Key>. Bar · expectancy, diverging from zero.
        </>
      }
      caveat="Overlaps with the ignition clock — later bites tend to be later in the move. But the bite count is a decision you see in real time, which makes it the more coachable number."
    >
      <div className="mt-4 grid gap-2.5">
        {model.bins.map((b) => (
          <div key={b.label} className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)_150px] sm:items-center sm:gap-3">
            <div className="flex items-baseline justify-between gap-3 sm:contents">
              <div className="text-[12px] font-semibold text-[var(--foreground)] sm:order-1">{b.label}</div>
              <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)] sm:order-3">
                {b.exp == null ? (
                  "—"
                ) : (
                  <>
                    <span className="font-semibold" style={{ color: pnlColor(b.exp) }}>
                      {money(b.exp)}
                    </span>
                    <span className="text-[var(--muted)]">
                      {" "}
                      /t · {b.wr}% · n={b.n}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="relative h-7 sm:order-2">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
              {b.exp != null ? (
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    background: pnlColor(b.exp),
                    opacity: 0.85,
                    left: b.exp >= 0 ? "50%" : `${50 - (Math.abs(b.exp) / maxAbs) * 48}%`,
                    width: `${Math.max(0.5, (Math.abs(b.exp) / maxAbs) * 48)}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Lens>
  );
}

/* ---------- L6: machine-gun pace ---------- */

function PaceLens() {
  const model = useMemo(() => {
    const withGap = seqTrades.filter((t) => t.gapMin != null);
    const bins = [
      { label: "< 1m after exit", test: (t: SeqTrade) => t.gapMin! < 1 },
      { label: "1–5m", test: (t: SeqTrade) => t.gapMin! >= 1 && t.gapMin! < 5 },
      { label: "5–15m", test: (t: SeqTrade) => t.gapMin! >= 5 && t.gapMin! < 15 },
      { label: "15m+", test: (t: SeqTrade) => t.gapMin! >= 15 },
    ].map((b) => {
      const g = withGap.filter(b.test);
      return { ...b, n: g.length, exp: expectancy(g), wr: winRate(g) };
    });
    return { bins, n: withGap.length };
  }, []);

  const fast = model.bins[0];
  const slow = model.bins[3];
  const title =
    fast.exp != null && slow.exp != null
      ? `Entries under a minute after the last exit make ${money(fast.exp)}/t; after a 15-minute breath they make ${money(slow.exp)}/t.`
      : "Not enough paired entries to read pace.";
  const maxAbs = Math.max(20, ...model.bins.map((b) => Math.abs(b.exp ?? 0)));

  return (
    <Lens
      index="D6"
      family="Pace · the cost or payoff of firing again immediately"
      title={title}
      keyLine={
        <>
          Trades grouped by <Key>minutes between your previous exit and this entry</Key>, same session, any symbol ({model.n} trades).
        </>
      }
      caveat="Fast follow-ups aren't automatically tilt — momentum tape rewards immediacy. The pair to watch is this lens against the echo above: speed after wins is style; speed only after losses is a pattern."
    >
      <div className="mt-4 grid gap-2.5">
        {model.bins.map((b) => (
          <div key={b.label} className="grid gap-1 sm:grid-cols-[150px_minmax(0,1fr)_150px] sm:items-center sm:gap-3">
            <div className="flex items-baseline justify-between gap-3 sm:contents">
              <div className="text-[12px] font-semibold text-[var(--foreground)] sm:order-1">{b.label}</div>
              <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)] sm:order-3">
                {b.exp == null ? (
                  "—"
                ) : (
                  <>
                    <span className="font-semibold" style={{ color: pnlColor(b.exp) }}>
                      {money(b.exp)}
                    </span>
                    <span className="text-[var(--muted)]">
                      {" "}
                      /t · {b.wr}% · n={b.n}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="relative h-7 sm:order-2">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
              {b.exp != null ? (
                <div
                  className="absolute top-1 bottom-1 rounded"
                  style={{
                    background: pnlColor(b.exp),
                    opacity: 0.85,
                    left: b.exp >= 0 ? "50%" : `${50 - (Math.abs(b.exp) / maxAbs) * 48}%`,
                    width: `${Math.max(0.5, (Math.abs(b.exp) / maxAbs) * 48)}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Lens>
  );
}

/* ---------- page ---------- */

export default function DataVizDiscoveryLab() {
  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v6</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">The Discovery Lab</h1>
          <p className="mt-1 max-w-[680px] text-[13px] leading-6 text-[var(--body)]">
            Relationships the standard reports never draw: what a loss does to your <em>next</em> trade, whether your size knows what your
            scanner knows, what you pay to chase your own exit. Six lenses, every headline computed from the same{" "}
            {joinedTrades.length.toLocaleString()}-trade candle join.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz/v4" className="text-[var(--accent)] hover:underline">
            ← v4 factor lens
          </Link>
          <Link href="/preview/data-viz/v5" className="text-[var(--accent)] hover:underline">
            ← v5 opportunity set
          </Link>
        </div>
      </header>

      <DayShape />
      <LossEcho />
      <ConvictionTest />
      <ReentryPremium />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <NthBite />
        <PaceLens />
      </div>

      <footer className="pb-6 text-center text-[11px] leading-5 text-[var(--muted)]">
        Demo data · every claim recomputes from the joined dataset at render · sequencing (echo, re-entry, pace, nth bite) is derived
        from entry/exit timestamps — no new capture required
      </footer>
    </main>
  );
}
