"use client";

// v3 "join lab" — chart vocabulary exploration powered by a REAL trade×candle
// join (see scripts/generate-candle-join-data.mjs). Every claim in a title is
// computed from the dataset at render time, so copy can never drift from data.
import { useMemo, useState, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { joinedTrades, moveDays, profileDay, type JoinedTrade } from "@/lib/preview/candleJoinData";

/* ---------- shared helpers (self-contained, prototype-scoped) ---------- */

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
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${seconds % 60}s`;
}

function timeLabel(minuteET: number) {
  return `${String(Math.floor(minuteET / 60)).padStart(2, "0")}:${String(minuteET % 60).padStart(2, "0")}`;
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
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
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

function TradeTip({ t }: { t: JoinedTrade }) {
  return (
    <div className="grid gap-0.5">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span className="font-semibold text-[var(--foreground)]">
          {t.symbol} · {t.date}
        </span>
        <span className="font-mono font-semibold" style={{ color: pnlColor(t.pnl) }}>
          {money(t.pnl)}
        </span>
      </div>
      <TipRow label="Entry" value={`${timeLabel(t.minuteET)} ET · $${t.entry.toFixed(2)}`} />
      <TipRow label="Held" value={holdLabel(t.holdSec)} />
      <TipRow label="Shares" value={t.qty.toLocaleString()} />
      <TipRow label="Heat (MAE)" value={`−${t.maePct.toFixed(1)}%`} tone={RED} />
      <TipRow label="Best (MFE)" value={`+${t.mfePct.toFixed(1)}%`} tone={GREEN} />
      {t.capture != null ? <TipRow label="Captured" value={`${Math.round(t.capture * 100)}% of MFE`} /> : null}
      {t.relVol != null ? <TipRow label="Rel. volume" value={`${t.relVol.toFixed(1)}×`} /> : null}
      {t.minSinceHigh != null ? <TipRow label="Since day high" value={`${t.minSinceHigh}m`} /> : null}
    </div>
  );
}

/* ---------- specimen chrome ---------- */

function Specimen({
  index,
  family,
  title,
  children,
  footnote,
  aside,
}: {
  index: string;
  family: string;
  title: string;
  children: ReactNode;
  footnote: string;
  aside?: ReactNode;
}) {
  return (
    <section className="relative min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {index} · {family}
          </div>
          <h2 className="mt-1.5 text-[16px] font-semibold leading-6 text-[var(--foreground)]">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
      <p className="mt-3 border-t border-[var(--hairline)] pt-3 text-[12px] leading-5 text-[var(--muted)]">{footnote}</p>
    </section>
  );
}

function LegendChip({ color, label, hollow = false }: { color: string; label: string; hollow?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={hollow ? { border: `2px solid ${color}` } : { background: color }}
      />
      {label}
    </span>
  );
}

/* ---------- specimen 01: excursion scatter (MAE × MFE) ---------- */

function ExcursionScatter() {
  const [tip, setTip] = useState<TipState>(null);
  const [hotId, setHotId] = useState<number | null>(null);

  const wins = joinedTrades.filter((t) => t.pnl > 0);
  const losses = joinedTrades.filter((t) => t.pnl < 0);
  const medMaeW = median(wins.map((t) => t.maePct))!;
  const medMaeL = median(losses.map((t) => t.maePct))!;
  const medMfeW = median(wins.map((t) => t.mfePct))!;
  const medMfeL = median(losses.map((t) => t.mfePct))!;

  const xMax = quantile(joinedTrades.map((t) => t.maePct), 0.95);
  const yMax = quantile(joinedTrades.map((t) => t.mfePct), 0.95);
  const clipped = joinedTrades.filter((t) => t.maePct > xMax || t.mfePct > yMax).length;

  const W = 960;
  const H = 430;
  const PAD = { l: 52, r: 16, t: 24, b: 40 };
  const xOf = (v: number) => scale(clamp(v, 0, xMax), 0, xMax, PAD.l, W - PAD.r);
  const yOf = (v: number) => scale(clamp(v, 0, yMax), 0, yMax, H - PAD.b, PAD.t);

  const placed = joinedTrades.map((t) => ({ t, x: xOf(t.maePct), y: yOf(t.mfePct) }));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: (typeof placed)[number] | null = null;
    let bestD = 22;
    for (const p of placed) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setHotId(best ? best.t.id : null);
    setTip(best ? { x: e.clientX - rect.left, y: e.clientY - rect.top, body: <TradeTip t={best.t} /> } : null);
  }

  return (
    <Specimen
      index="J1"
      family="Excursion scatter · computed from candles"
      title={`Heat doesn't pick winners — median ${medMaeW.toFixed(1)}% vs ${medMaeL.toFixed(1)}%. The favorable side does: ${medMfeW.toFixed(1)}% vs ${medMfeL.toFixed(1)}%.`}
      aside={
        <div className="flex items-center gap-3">
          <LegendChip color={GREEN} label={`win (n=${wins.length})`} />
          <LegendChip color={RED} label={`loss (n=${losses.length})`} />
        </div>
      }
      footnote={`Every dot is a real joined trade: worst price against you (x) vs best price for you (y) while you held. Axes clamp at the 95th percentile (${clipped} outliers pinned to the edge). The vertical spread — not the horizontal — separates the colors: winners and losers absorb similar heat, but losers never develop upside.`}
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Scatter of max adverse excursion versus max favorable excursion per trade"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setTip(null);
            setHotId(null);
          }}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={xOf(xMax * f)} x2={xOf(xMax * f)} y1={PAD.t} y2={H - PAD.b} stroke="var(--hairline)" />
              <text x={xOf(xMax * f)} y={H - 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                −{(xMax * f).toFixed(0)}%
              </text>
              <line x1={PAD.l} x2={W - PAD.r} y1={yOf(yMax * f)} y2={yOf(yMax * f)} stroke="var(--hairline)" />
              <text x={8} y={yOf(yMax * f) + 3} className="fill-[var(--muted)]" fontSize={10}>
                +{(yMax * f).toFixed(0)}%
              </text>
            </g>
          ))}
          <text x={PAD.l} y={H - 14} className="fill-[var(--muted)]" fontSize={10}>
            heat while held →
          </text>
          <text x={8} y={PAD.t - 8} className="fill-[var(--muted)]" fontSize={10}>
            best available move ↑
          </text>

          {/* median markers, drawn under dots */}
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(medMfeW)} y2={yOf(medMfeW)} stroke={GREEN} strokeWidth={1.5} opacity={0.5} />
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(medMfeL)} y2={yOf(medMfeL)} stroke={RED} strokeWidth={1.5} opacity={0.5} />
          <text x={W - PAD.r - 4} y={yOf(medMfeW) - 4} textAnchor="end" className="fill-[var(--body)]" fontSize={10}>
            median win MFE +{medMfeW.toFixed(1)}%
          </text>
          <text x={W - PAD.r - 4} y={yOf(medMfeL) - 4} textAnchor="end" className="fill-[var(--body)]" fontSize={10}>
            median loss MFE +{medMfeL.toFixed(1)}%
          </text>

          {placed.map((p) => {
            const active = hotId === p.t.id;
            return (
              <circle
                key={p.t.id}
                cx={p.x}
                cy={p.y}
                r={active ? 6 : 3.2}
                fill={pnlColor(p.t.pnl)}
                opacity={hotId != null && !active ? 0.25 : 0.55}
                stroke={active ? "var(--foreground)" : "none"}
                strokeWidth={active ? 1.5 : 0}
              />
            );
          })}
        </svg>
        <Tip tip={tip} />
      </div>
    </Specimen>
  );
}

/* ---------- specimen 02: capture-ratio swarm ---------- */

function CaptureSwarm() {
  const [tip, setTip] = useState<TipState>(null);

  const winners = joinedTrades.filter((t) => t.pnl > 0 && t.capture != null);
  const med = median(winners.map((t) => t.capture!))!;
  const fullCapture = winners.filter((t) => t.capture! >= 0.75).length;

  const W = 960;
  const H = 190;
  const PAD = { l: 52, r: 16, t: 26, b: 34 };
  const xOf = (c: number) => scale(clamp(c, 0, 1), 0, 1, PAD.l, W - PAD.r);
  // deterministic vertical jitter so SSR and client agree
  const jitter = (id: number) => ((id * 2654435761) % 1000) / 1000;
  const midY = PAD.t + (H - PAD.t - PAD.b) / 2;
  const spread = (H - PAD.t - PAD.b) / 2 - 6;

  const placed = winners.map((t) => ({
    t,
    x: xOf(t.capture!),
    y: midY + (jitter(t.id) - 0.5) * 2 * spread,
  }));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: (typeof placed)[number] | null = null;
    let bestD = 20;
    for (const p of placed) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setTip(best ? { x: e.clientX - rect.left, y: e.clientY - rect.top, body: <TradeTip t={best.t} /> } : null);
  }

  return (
    <Specimen
      index="J2"
      family="Capture swarm · winners only"
      title={`The median winner banked ${Math.round(med * 100)}% of its best available move.`}
      footnote={`Each dot is a winning trade placed by how much of its maximum favorable excursion was realized at exit. Only ${fullCapture} of ${winners.length} winners captured 75%+. Low capture isn't automatically a leak — momentum names keep running past any sane exit — but the shape says how much of the win rate depends on early exits.`}
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Swarm of capture ratio for winning trades"
          onPointerMove={onMove}
          onPointerLeave={() => setTip(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={xOf(f)} x2={xOf(f)} y1={PAD.t} y2={H - PAD.b} stroke="var(--hairline)" />
              <text x={xOf(f)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                {Math.round(f * 100)}%
              </text>
            </g>
          ))}
          {placed.map((p) => (
            <circle key={p.t.id} cx={p.x} cy={p.y} r={3} fill={GREEN} opacity={0.4} />
          ))}
          <line x1={xOf(med)} x2={xOf(med)} y1={PAD.t - 4} y2={H - PAD.b + 4} stroke="var(--foreground)" strokeWidth={1.5} />
          <text x={xOf(med) + 6} y={PAD.t + 4} className="fill-[var(--foreground)]" fontSize={11} fontWeight={600}>
            median {Math.round(med * 100)}%
          </text>
        </svg>
        <Tip tip={tip} />
      </div>
    </Specimen>
  );
}

/* ---------- specimen 03: left on the table (post-exit run-up) ---------- */

function LeftOnTable() {
  const [tip, setTip] = useState<TipState>(null);
  const winners = joinedTrades.filter((t) => t.pnl > 0 && t.postRunPct != null);
  const med = median(winners.map((t) => t.postRunPct!))!;

  const BINS = [
    { min: 0, max: 1, label: "<1%" },
    { min: 1, max: 2, label: "1–2%" },
    { min: 2, max: 4, label: "2–4%" },
    { min: 4, max: 8, label: "4–8%" },
    { min: 8, max: 16, label: "8–16%" },
    { min: 16, max: Infinity, label: "16%+" },
  ];
  const counts = BINS.map((b) => winners.filter((t) => t.postRunPct! >= b.min && t.postRunPct! < b.max).length);
  const maxCount = Math.max(...counts);

  const W = 960;
  const H = 200;
  const PAD = { l: 16, r: 16, t: 20, b: 40 };
  const bw = (W - PAD.l - PAD.r) / BINS.length;

  return (
    <Specimen
      index="J3"
      family="Post-exit run-up histogram · winners only"
      title={`The median winner kept running +${med.toFixed(1)}% in the ten minutes after the exit.`}
      footnote={`For each winning trade: the best favorable move within 10 minutes after exit, from real candles. This is descriptive, not a counterfactual — you can't bank every continuation, and holding longer changes the loss column too. Pair it with the capture swarm before concluding anything about exits.`}
    >
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Histogram of post-exit run-up for winners">
          {BINS.map((b, i) => {
            const h = scale(counts[i], 0, maxCount, 0, H - PAD.t - PAD.b);
            const x = PAD.l + i * bw;
            return (
              <g key={b.label}>
                <rect
                  x={x + 8}
                  y={H - PAD.b - h}
                  width={bw - 16}
                  height={Math.max(2, h)}
                  rx={4}
                  fill={GREEN}
                  opacity={0.75}
                  onPointerMove={(e) => {
                    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                    setTip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      body: (
                        <div className="grid gap-0.5">
                          <div className="mb-1 font-semibold text-[var(--foreground)]">Ran {b.label} after exit</div>
                          <TipRow label="Winners" value={String(counts[i])} />
                          <TipRow label="Share" value={`${Math.round((counts[i] / winners.length) * 100)}%`} />
                        </div>
                      ),
                    });
                  }}
                  onPointerLeave={() => setTip(null)}
                />
                <text x={x + bw / 2} y={H - PAD.b - h - 6} textAnchor="middle" className="fill-[var(--body)]" fontSize={11}>
                  {counts[i]}
                </text>
                <text x={x + bw / 2} y={H - 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10.5}>
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
        <Tip tip={tip} />
      </div>
    </Specimen>
  );
}

/* ---------- shared cohort ledger row ---------- */

type CohortRow = { label: string; trades: JoinedTrade[] };

function CohortLedger({ rows, unit }: { rows: CohortRow[]; unit: string }) {
  const stats = rows.map((r) => {
    const n = r.trades.length;
    const wins = r.trades.filter((t) => t.pnl > 0).length;
    const exp = n ? r.trades.reduce((a, t) => a + t.pnl, 0) / n : null;
    return { label: r.label, n, winRate: n ? Math.round((wins / n) * 100) : null, exp };
  });
  const maxExp = Math.max(30, ...stats.map((s) => Math.abs(s.exp ?? 0)));

  return (
    <div className="mt-4 grid gap-2.5">
      {stats.map((s) => (
        <div key={s.label} className="grid grid-cols-[92px_minmax(0,1fr)_190px] items-center gap-3">
          <div className="text-[12px] font-semibold text-[var(--foreground)]">{s.label}</div>
          <div className="relative h-7">
            <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
            {s.exp != null ? (
              <div
                className="absolute top-1 bottom-1 rounded"
                style={{
                  background: pnlColor(s.exp),
                  opacity: 0.85,
                  left: s.exp >= 0 ? "50%" : `${50 - (Math.abs(s.exp) / maxExp) * 48}%`,
                  width: `${Math.max(0.5, (Math.abs(s.exp) / maxExp) * 48)}%`,
                }}
              />
            ) : null}
          </div>
          <div className="whitespace-nowrap text-right font-mono text-[12px] tabular-nums text-[var(--body)]">
            {s.exp == null ? (
              "—"
            ) : (
              <>
                <span className="font-semibold" style={{ color: pnlColor(s.exp) }}>
                  {money(s.exp)}
                </span>
                <span className="text-[var(--muted)]">
                  {" "}
                  {unit} · {s.winRate}% · n={s.n}
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- specimen 04: freshness of the high ---------- */

function FreshHighLedger() {
  const withHigh = joinedTrades.filter((t) => t.minSinceHigh != null);
  const bins: CohortRow[] = [
    { label: "≤ 2m", trades: withHigh.filter((t) => t.minSinceHigh! <= 2) },
    { label: "2–10m", trades: withHigh.filter((t) => t.minSinceHigh! > 2 && t.minSinceHigh! <= 10) },
    { label: "> 10m", trades: withHigh.filter((t) => t.minSinceHigh! > 10) },
  ];
  const fresh = bins[0].trades;
  const stale = bins[1].trades;
  const freshExp = fresh.reduce((a, t) => a + t.pnl, 0) / fresh.length;
  const staleExp = stale.reduce((a, t) => a + t.pnl, 0) / stale.length;

  return (
    <Specimen
      index="J4"
      family="Cohort ledger · time since the day high"
      title={`Entries within 2 minutes of a fresh high paid ${money(freshExp)}/trade — ${(freshExp / staleExp).toFixed(1)}× the 2–10 minute cohort.`}
      footnote={`"Time since high" is measured at entry against the running day high from real candles — information that was available at entry, not hindsight. The >10m cohort recovering is consistent with later-day dip entries being a different trade than a stalling chase.`}
    >
      <CohortLedger rows={bins} unit="/t" />
    </Specimen>
  );
}

/* ---------- specimen 05: relative volume at entry ---------- */

function RelVolLedger() {
  const withVol = joinedTrades.filter((t) => t.relVol != null);
  const bins: CohortRow[] = [
    { label: "< 1×", trades: withVol.filter((t) => t.relVol! < 1) },
    { label: "1–2×", trades: withVol.filter((t) => t.relVol! >= 1 && t.relVol! < 2) },
    { label: "2–4×", trades: withVol.filter((t) => t.relVol! >= 2 && t.relVol! < 4) },
    { label: "4×+", trades: withVol.filter((t) => t.relVol! >= 4) },
  ];
  const sweet = bins[2].trades;
  const climax = bins[3].trades;
  const sweetExp = sweet.reduce((a, t) => a + t.pnl, 0) / sweet.length;
  const climaxExp = climax.reduce((a, t) => a + t.pnl, 0) / climax.length;

  return (
    <Specimen
      index="J5"
      family="Cohort ledger · relative volume at entry"
      title={`2–4× relative volume was the sweet spot (${money(sweetExp)}/t); 4×+ paid less (${money(climaxExp)}/t).`}
      footnote={`Relative volume = the entry minute's volume vs the median of the prior 30 bars, from real candles. Elevated-but-not-climactic participation paying best, while 4×+ fades, matches the "don't chase the climax bar" read — directional evidence, not yet proof.`}
    >
      <CohortLedger rows={bins} unit="/t" />
    </Specimen>
  );
}

/* ---------- specimen 06: entry context quadrant (VWAP × premarket high) ---------- */

function ContextQuadrant() {
  const usable = joinedTrades.filter((t) => t.vwapDistPct != null && t.pmHighDistPct != null);
  const cells = [
    { key: "aa", vwap: "above", pm: "above", label: "Above VWAP · above PM high" },
    { key: "ab", vwap: "above", pm: "below", label: "Above VWAP · below PM high" },
    { key: "ba", vwap: "below", pm: "above", label: "Below VWAP · above PM high" },
    { key: "bb", vwap: "below", pm: "below", label: "Below VWAP · below PM high" },
  ].map((c) => {
    const list = usable.filter(
      (t) => (c.vwap === "above" ? t.vwapDistPct! > 0 : t.vwapDistPct! <= 0) && (c.pm === "above" ? t.pmHighDistPct! > 0 : t.pmHighDistPct! <= 0),
    );
    const n = list.length;
    const exp = n ? list.reduce((a, t) => a + t.pnl, 0) / n : null;
    const winRate = n ? Math.round((list.filter((t) => t.pnl > 0).length / n) * 100) : null;
    return { ...c, n, exp, winRate };
  });
  const aboveVwapShare = Math.round((usable.filter((t) => t.vwapDistPct! > 0).length / usable.length) * 100);
  const maxAbsExp = Math.max(...cells.map((c) => Math.abs(c.exp ?? 0)));
  const abovePm = usable.filter((t) => t.pmHighDistPct! > 0);
  const belowPm = usable.filter((t) => t.pmHighDistPct! <= 0);
  const abovePmExp = abovePm.reduce((a, t) => a + t.pnl, 0) / abovePm.length;
  const belowPmExp = belowPm.reduce((a, t) => a + t.pnl, 0) / belowPm.length;
  const MIN_N = 50; // below this, a cell's expectancy is noise — no tint, explicit flag

  return (
    <Specimen
      index="J6"
      family="Context quadrant · VWAP side × premarket-high side"
      title={`${aboveVwapShare}% of entries are above VWAP — that's a style fingerprint, not a filter. The premarket high splits the money: ${money(abovePmExp)} vs ${money(belowPmExp)}/t.`}
      footnote={`Both context reads are computed at the entry minute (session VWAP so far; premarket high from the 04:00–09:30 ET bars). When one cell holds ${aboveVwapShare}% of the sample, its "edge" is really the baseline — the interesting comparison is the premarket-high split within it. Cell tint = expectancy, withheld under n=50 — a $76/t cell on 19 trades is noise wearing a crown.`}
    >
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {cells.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-[var(--hairline)] px-4 py-3.5"
            style={{
              backgroundColor:
                c.exp == null || c.n < MIN_N
                  ? undefined
                  : c.exp >= 0
                    ? `color-mix(in srgb, var(--green) ${Math.round(8 + (Math.abs(c.exp) / maxAbsExp) * 26)}%, transparent)`
                    : `color-mix(in srgb, var(--red) ${Math.round(8 + (Math.abs(c.exp) / maxAbsExp) * 26)}%, transparent)`,
            }}
          >
            <div className="text-[12px] font-semibold text-[var(--foreground)]">{c.label}</div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                className="font-mono text-[16px] font-semibold tabular-nums"
                style={{ color: c.n < MIN_N ? "var(--muted)" : pnlColor(c.exp ?? 0) }}
              >
                {c.exp == null ? "—" : `${money(c.exp)}/t`}
              </span>
              <span className="text-[11px] text-[var(--muted)]">
                {c.winRate}% win · n={c.n}
                {c.n < MIN_N ? " · small sample" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Specimen>
  );
}

/* ---------- move anatomy specimens (hindsight day classification) ---------- */

function expOf(list: { pnl: number }[]) {
  return list.length ? list.reduce((a, t) => a + t.pnl, 0) / list.length : null;
}

/* J7: how extended was the stock when you entered? */
function ExtensionLedger() {
  const withExt = joinedTrades.filter((t) => t.dayGainAtEntryPct != null);
  const bins: CohortRow[] = [
    { label: "< 10%", trades: withExt.filter((t) => t.dayGainAtEntryPct! < 10) },
    { label: "10–25%", trades: withExt.filter((t) => t.dayGainAtEntryPct! >= 10 && t.dayGainAtEntryPct! < 25) },
    { label: "25–50%", trades: withExt.filter((t) => t.dayGainAtEntryPct! >= 25 && t.dayGainAtEntryPct! < 50) },
    { label: "50%+", trades: withExt.filter((t) => t.dayGainAtEntryPct! >= 50) },
  ];
  const trough = expOf(bins[2].trades)!;
  const best = expOf(bins[3].trades)!;

  return (
    <Specimen
      index="J7"
      family="Cohort ledger · extension at entry (hindsight base)"
      title={`Half-measures paid worst: entries 25–50% off the base made ${money(trough)}/t; entries on names already up 50%+ made ${money(best)}/t.`}
      footnote={`Extension = entry price vs the session's first print (04:00 ET onward). The U-shape is a momentum fingerprint: fresh names and fully-confirmed movers both pay, while the awkward middle — extended enough to be risky, not proven enough to trend — chops. Base uses the day's own tape, so this is anatomy, not an entry-time signal.`}
    >
      <CohortLedger rows={bins} unit="/t" />
    </Specimen>
  );
}

/* J8: the ignition clock */
function IgnitionClock() {
  const ignitedDays = moveDays.filter((d) => d.ignited).length;
  const withIgn = joinedTrades.filter((t) => t.minFromIgnition != null);
  const firstLeg = withIgn.filter((t) => t.minFromIgnition! >= 0 && t.minFromIgnition! < 5);
  const bins: CohortRow[] = [
    { label: "before", trades: withIgn.filter((t) => t.minFromIgnition! < 0) },
    { label: "0–5m", trades: firstLeg },
    { label: "5–15m", trades: withIgn.filter((t) => t.minFromIgnition! >= 5 && t.minFromIgnition! < 15) },
    { label: "15–60m", trades: withIgn.filter((t) => t.minFromIgnition! >= 15 && t.minFromIgnition! < 60) },
    { label: "60m+", trades: withIgn.filter((t) => t.minFromIgnition! >= 60) },
  ];

  return (
    <Specimen
      index="J8"
      family="Cohort ledger · minutes from ignition"
      title={`The first five minutes were almost never yours: ${firstLeg.length} of ${withIgn.length} entries — but they paid ${money(expOf(firstLeg)!)}/t.`}
      footnote={`Ignition = the day's first "+10% within 5 minutes" onset, found from the candles (${ignitedDays} of ${moveDays.length} traded ticker-days had one — this style almost exclusively picks explosive names). Detecting it uses forward returns, so the clock is hindsight anatomy for grading timing, never an entry signal. Rows under n=50 are directional only.`}
    >
      <CohortLedger rows={bins} unit="/t" />
    </Specimen>
  );
}

/* J9: the volume clock */
function VolumeClock() {
  const withVol = joinedTrades.filter((t) => t.volElapsedPct != null);
  const bins: CohortRow[] = [
    { label: "0–25%", trades: withVol.filter((t) => t.volElapsedPct! < 25) },
    { label: "25–50%", trades: withVol.filter((t) => t.volElapsedPct! >= 25 && t.volElapsedPct! < 50) },
    { label: "50–75%", trades: withVol.filter((t) => t.volElapsedPct! >= 50 && t.volElapsedPct! < 75) },
    { label: "75–100%", trades: withVol.filter((t) => t.volElapsedPct! >= 75) },
  ];
  const early = expOf(bins[0].trades)!;
  const mid = expOf(bins[1].trades)!;

  return (
    <Specimen
      index="J9"
      family="Cohort ledger · share of the day's volume already printed"
      title={`Entering before a quarter of the day's volume had printed paid ${money(early)}/t — ${(early / mid).toFixed(1)}× the 25–50% window.`}
      footnote={`The "volume clock" positions each entry inside the day's total volume story (hindsight — the denominator is the full day). Early-volume entries catching the best expectancy while the 25–50% window sags matches the ignition clock above: the crowd's arrival is the expensive part of the move to trade.`}
    >
      <CohortLedger rows={bins} unit="/t" />
    </Specimen>
  );
}

/* J10: do you get paid on the big movers? */
function MoversScatter() {
  const [tip, setTip] = useState<TipState>(null);
  const [hotKey, setHotKey] = useState<string | null>(null);

  const big = moveDays.filter((d) => d.maxGainPct >= 50);
  const bigPnl = big.reduce((a, d) => a + d.pnl, 0);
  const totalPnl = moveDays.reduce((a, d) => a + d.pnl, 0);
  const share = Math.round((bigPnl / totalPnl) * 100);

  const xMax = quantile(moveDays.map((d) => d.maxGainPct), 0.95);
  const yAbs = quantile(moveDays.map((d) => Math.abs(d.pnl)), 0.97);
  const W = 960;
  const H = 360;
  const PAD = { l: 56, r: 16, t: 22, b: 40 };
  const xOf = (v: number) => scale(clamp(v, 0, xMax), 0, xMax, PAD.l, W - PAD.r);
  const yOf = (v: number) => scale(clamp(v, -yAbs, yAbs), -yAbs, yAbs, H - PAD.b, PAD.t);
  const midY = yOf(0);

  const placed = moveDays.map((d) => ({ d, key: `${d.symbol}|${d.date}`, x: xOf(d.maxGainPct), y: yOf(d.pnl) }));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;
    let best: (typeof placed)[number] | null = null;
    let bestD = 24;
    for (const p of placed) {
      const d = Math.hypot(p.x - px, p.y - py);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    setHotKey(best ? best.key : null);
    setTip(
      best
        ? {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            body: (
              <div className="grid gap-0.5">
                <div className="mb-1 flex items-baseline justify-between gap-4">
                  <span className="font-semibold text-[var(--foreground)]">
                    {best.d.symbol} · {best.d.date}
                  </span>
                  <span className="font-mono font-semibold" style={{ color: pnlColor(best.d.pnl) }}>
                    {money(best.d.pnl)}
                  </span>
                </div>
                <TipRow label="Day move" value={`+${best.d.maxGainPct.toFixed(0)}%`} />
                <TipRow label="Ignited" value={best.d.ignited ? `yes (+${best.d.ignitionMovePct}% in 5m)` : "no"} />
                <TipRow label="Your trades" value={String(best.d.n)} />
              </div>
            ),
          }
        : null,
    );
  }

  return (
    <Specimen
      index="J10"
      family="Movers scatter · one dot per ticker-day"
      title={`${share}% of all P&L came from days that moved 50% or more.`}
      aside={
        <div className="flex items-center gap-3">
          <LegendChip color={GREEN} label="net green day" />
          <LegendChip color={RED} label="net red day" />
        </div>
      }
      footnote={`Each dot is a traded ticker-day: how far the stock ran base-to-high (x) vs what you netted on it (y), dot size = your trade count. ${big.length} of ${moveDays.length} traded days moved 50%+ — selection is clearly not the problem; the red dots sitting on huge movers are the days worth reviewing. Axes clamp at high percentiles.`}
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Scatter of ticker-day maximum move versus trader net P&L"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setTip(null);
            setHotKey(null);
          }}
        >
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={xOf(xMax * f)} x2={xOf(xMax * f)} y1={PAD.t} y2={H - PAD.b} stroke="var(--hairline)" />
              <text x={xOf(xMax * f)} y={H - 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
                +{(xMax * f).toFixed(0)}%
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={midY} y2={midY} stroke="var(--border)" />
          <text x={8} y={PAD.t + 8} className="fill-[var(--muted)]" fontSize={10}>
            {money(yAbs)}
          </text>
          <text x={8} y={midY + 3} className="fill-[var(--muted)]" fontSize={10}>
            $0
          </text>
          <text x={8} y={H - PAD.b} className="fill-[var(--muted)]" fontSize={10}>
            {money(-yAbs)}
          </text>
          <text x={PAD.l} y={H - 14} className="fill-[var(--muted)]" fontSize={10}>
            day&apos;s max move →
          </text>
          {placed.map((p) => {
            const active = hotKey === p.key;
            const r = clamp(2.5 + p.d.n * 0.6, 2.5, 9);
            return (
              <circle
                key={p.key}
                cx={p.x}
                cy={p.y}
                r={active ? r + 2 : r}
                fill={pnlColor(p.d.pnl)}
                opacity={hotKey != null && !active ? 0.25 : 0.6}
                stroke={active ? "var(--foreground)" : "var(--surface)"}
                strokeWidth={active ? 1.5 : 1}
              />
            );
          })}
        </svg>
        <Tip tip={tip} />
      </div>
    </Specimen>
  );
}

/* J11: volume profile of the busiest ticker-day */
function VolumeProfileSpecimen() {
  const [tip, setTip] = useState<TipState>(null);
  const p = profileDay;
  const dayPnl = p.trades.reduce((a, t) => a + t.pnl, 0);
  const abovePoc = p.trades.filter((t) => t.entry > p.pocPrice).length;

  const W = 960;
  const H = 340;
  const PROFILE_W = 210;
  const PAD = { l: 8, r: 56, t: 20, b: 34 };
  const priceLo = Math.min(...p.bins.map((b) => b.price));
  const priceHi = Math.max(...p.bins.map((b) => b.price));
  const yOf = (price: number) => scale(price, priceLo, priceHi, H - PAD.b, PAD.t);
  const maxShare = Math.max(...p.bins.map((b) => b.volShare));
  const binH = (H - PAD.t - PAD.b) / p.bins.length;
  const tMin = Math.min(...p.path.map((q) => q.m));
  const tMax = Math.max(...p.path.map((q) => q.m));
  const xOfTime = (m: number) => scale(m, tMin, tMax, PAD.l + PROFILE_W + 24, W - PAD.r);

  return (
    <Specimen
      index="J11"
      family={`Volume profile · specimen: ${p.symbol} ${p.date} (your busiest ticker-day)`}
      title={`${p.trades.length} trades for ${money(dayPnl)} — ${abovePoc} of them entered above the day's point of control.`}
      aside={
        <div className="flex items-center gap-3">
          <LegendChip color={GREEN} label="winning entry" />
          <LegendChip color={RED} label="losing entry" />
        </div>
      }
      footnote={`Left: where the day's volume actually traded, by price — the point of control (POC) is the widest bar. Right: the close path with your entries placed at their price and time; the horizontal rule carries the POC across. Entries above the POC are trading with the day's acceptance zone below them; entries below it are fighting the crowd's price. One real day, real candles, real fills.`}
    >
      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Volume-at-price profile with the price path and trade entries"
        >
          {/* volume-at-price bars */}
          {p.bins.map((b) => (
            <rect
              key={b.price}
              x={PAD.l}
              y={yOf(b.price) - binH / 2 + 1}
              width={Math.max(1, (b.volShare / maxShare) * PROFILE_W)}
              height={Math.max(1.5, binH - 2)}
              rx={2}
              fill={b.price === p.pocPrice ? "var(--accent)" : "var(--muted)"}
              opacity={b.price === p.pocPrice ? 0.9 : 0.35}
            />
          ))}
          <text x={PAD.l} y={H - 12} className="fill-[var(--muted)]" fontSize={10}>
            volume at price →
          </text>

          {/* POC rule across both panels */}
          <line x1={PAD.l} x2={W - PAD.r} y1={yOf(p.pocPrice)} y2={yOf(p.pocPrice)} stroke="var(--accent)" strokeWidth={1} opacity={0.5} />
          <text x={W - PAD.r + 4} y={yOf(p.pocPrice) + 3} className="fill-[var(--accent)]" fontSize={10}>
            POC ${p.pocPrice.toFixed(2)}
          </text>

          {/* price path */}
          <polyline
            points={p.path.map((q) => `${xOfTime(q.m)},${yOf(clamp(q.c, priceLo, priceHi))}`).join(" ")}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={1.5}
            opacity={0.8}
          />
          {p.ignitionMin != null ? (
            <g>
              <line x1={xOfTime(p.ignitionMin)} x2={xOfTime(p.ignitionMin)} y1={PAD.t} y2={H - PAD.b} stroke="var(--hairline)" />
              <text x={xOfTime(p.ignitionMin) + 3} y={PAD.t + 8} className="fill-[var(--muted)]" fontSize={10}>
                ignition {timeLabel(p.ignitionMin)}
              </text>
            </g>
          ) : null}

          {/* entries */}
          {p.trades.map((t) => (
            <circle
              key={t.id}
              cx={xOfTime(clamp(t.minuteET, tMin, tMax))}
              cy={yOf(clamp(t.entry, priceLo, priceHi))}
              r={clamp(3 + t.qty / 400, 3, 8)}
              fill={pnlColor(t.pnl)}
              opacity={0.85}
              stroke="var(--surface)"
              strokeWidth={1.5}
              onPointerMove={(e) => {
                const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                setTip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  body: (
                    <div className="grid gap-0.5">
                      <div className="mb-1 flex items-baseline justify-between gap-4">
                        <span className="font-semibold text-[var(--foreground)]">{timeLabel(t.minuteET)} ET</span>
                        <span className="font-mono font-semibold" style={{ color: pnlColor(t.pnl) }}>
                          {money(t.pnl)}
                        </span>
                      </div>
                      <TipRow label="Entry" value={`$${t.entry.toFixed(2)}`} />
                      <TipRow label="Shares" value={t.qty.toLocaleString()} />
                      <TipRow label="Vs POC" value={t.entry > p.pocPrice ? "above" : "below"} />
                    </div>
                  ),
                });
              }}
              onPointerLeave={() => setTip(null)}
            />
          ))}

          {/* price axis */}
          {[priceLo, (priceLo + priceHi) / 2, priceHi].map((v) => (
            <text key={v} x={W - PAD.r + 4} y={yOf(v) + 3} className="fill-[var(--muted)]" fontSize={10}>
              ${v.toFixed(2)}
            </text>
          ))}
          {[tMin, Math.round((tMin + tMax) / 2), tMax].map((m) => (
            <text key={m} x={xOfTime(m)} y={H - 12} textAnchor="middle" className="fill-[var(--muted)]" fontSize={10}>
              {timeLabel(m)}
            </text>
          ))}
        </svg>
        <Tip tip={tip} />
      </div>
    </Specimen>
  );
}

/* ---------- table twin ---------- */

function JoinTable() {
  const top = useMemo(() => [...joinedTrades].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl)).slice(0, 150), []);
  return (
    <details className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <summary className="cursor-pointer text-[13px] font-semibold text-[var(--foreground)]">
        Table view · the joined metrics, no hover required (top 150 of {joinedTrades.length} by |P&L|)
      </summary>
      <div className="mt-4 overflow-x-auto border-y border-[var(--hairline)]">
        <table className="w-full min-w-[860px] border-collapse text-left text-[12px]">
          <thead className="text-[var(--muted)]">
            <tr className="border-b border-[var(--hairline)]">
              <th className="px-3 py-2.5 font-medium">Date</th>
              <th className="px-3 py-2.5 font-medium">Symbol</th>
              <th className="px-3 py-2.5 font-medium">Entry</th>
              <th className="px-3 py-2.5 text-right font-medium">Held</th>
              <th className="px-3 py-2.5 text-right font-medium">MAE</th>
              <th className="px-3 py-2.5 text-right font-medium">MFE</th>
              <th className="px-3 py-2.5 text-right font-medium">Capture</th>
              <th className="px-3 py-2.5 text-right font-medium">Rel. vol</th>
              <th className="px-3 py-2.5 text-right font-medium">Since high</th>
              <th className="px-3 py-2.5 text-right font-medium">Post-exit</th>
              <th className="px-3 py-2.5 text-right font-medium">P&L</th>
            </tr>
          </thead>
          <tbody>
            {top.map((t) => (
              <tr key={t.id} className="border-b border-[var(--hairline)] text-[var(--body)]">
                <td className="px-3 py-2 font-mono tabular-nums">{t.date.slice(5)}</td>
                <td className="px-3 py-2 font-semibold text-[var(--foreground)]">{t.symbol}</td>
                <td className="px-3 py-2 font-mono tabular-nums">
                  {timeLabel(t.minuteET)} · ${t.entry.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{holdLabel(t.holdSec)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: RED }}>
                  −{t.maePct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums" style={{ color: GREEN }}>
                  +{t.mfePct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {t.capture == null ? "—" : `${Math.round(t.capture * 100)}%`}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{t.relVol == null ? "—" : `${t.relVol.toFixed(1)}×`}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{t.minSinceHigh == null ? "—" : `${t.minSinceHigh}m`}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {t.postRunPct == null ? "—" : `+${t.postRunPct.toFixed(1)}%`}
                </td>
                <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums" style={{ color: pnlColor(t.pnl) }}>
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

export default function DataVizJoinLab() {
  const days = new Set(joinedTrades.map((t) => t.date)).size;
  const symbols = new Set(joinedTrades.map((t) => t.symbol)).size;

  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v3</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">The Join Lab</h1>
          <p className="mt-1 max-w-[680px] text-[13px] leading-6 text-[var(--body)]">
            The trade×candle join, actually run: {joinedTrades.length.toLocaleString()} closed demo trades across {days} sessions and{" "}
            {symbols} tickers, joined to their 1-minute candles (04:00–20:00 ET). Every headline below is computed from this dataset at
            render time — the copy cannot drift from the data.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz" className="text-[var(--accent)] hover:underline">← Data viz index</Link>
          <Link href="/preview/data-viz/v1" className="text-[var(--accent)] hover:underline">
            ← v1 sticker sheet
          </Link>
          <Link href="/preview/data-viz/v2" className="text-[var(--accent)] hover:underline">
            ← v2 lens lab
          </Link>
          <Link href="/preview/data-viz/v4" className="text-[var(--accent)] hover:underline">
            v4 factor lens →
          </Link>
        </div>
      </header>

      <ExcursionScatter />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <CaptureSwarm />
        <LeftOnTable />
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <FreshHighLedger />
        <RelVolLedger />
      </div>
      <ContextQuadrant />

      {/* part two: move anatomy */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border)] pt-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Part two · move anatomy</div>
          <h2 className="mt-1 text-[18px] font-semibold text-[var(--foreground)]">The move, the volume, and where you were standing.</h2>
        </div>
        <p className="max-w-[440px] text-[12px] leading-5 text-[var(--muted)]">
          These lenses classify each ticker-day&apos;s move from its candles — ignition, extension, volume story — then grade entry timing
          against it. Day anatomy is hindsight by construction; it grades timing, it is not an entry signal.
        </p>
      </div>

      <MoversScatter />
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <IgnitionClock />
        <ExtensionLedger />
      </div>
      <VolumeClock />
      <VolumeProfileSpecimen />
      <JoinTable />

      <footer className="pb-6 text-center text-[11px] leading-5 text-[var(--muted)]">
        Demo data · generated by scripts/generate-candle-join-data.mjs from the bundled demo DB · entry-time information only, no
        hindsight fields · re-run the script to refresh
      </footer>
    </main>
  );
}
