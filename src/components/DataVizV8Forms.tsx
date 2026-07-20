// v8 "open exploration" — six chart forms chosen for visual pull, outside the
// narrowing track. Every specimen runs on the same real join (1,207 closed
// trades × 1-minute candles, Jan–Feb 2026 demo). Each carries its trader
// question, its data contract, and a field note on whether the form earns its
// reading cost. Nothing here is a graduation candidate by default — the point
// of the run is to see what beauty buys and what it costs. Desktop-only.
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

function scale(v: number, d0: number, d1: number, r0: number, r1: number) {
  if (d1 === d0) return (r0 + r1) / 2;
  return r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function quantile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * q)))];
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

function polar(cx: number, cy: number, r: number, a: number): [number, number] {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const n1 = (v: number) => Math.round(v * 10) / 10;

function annular(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  return `M ${n1(x0)} ${n1(y0)} A ${n1(r1)} ${n1(r1)} 0 ${large} 1 ${n1(x1)} ${n1(y1)} L ${n1(x2)} ${n1(y2)} A ${n1(r0)} ${n1(r0)} 0 ${large} 0 ${n1(x3)} ${n1(y3)} Z`;
}

type Pt = { x: number; y: number };

// Catmull-Rom → cubic bezier; `move` toggles the leading M so chains can continue.
function smoothSegments(pts: Pt[], move: boolean) {
  if (pts.length < 2) return "";
  let d = move ? `M ${n1(pts[0].x)} ${n1(pts[0].y)}` : `L ${n1(pts[0].x)} ${n1(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${n1(c1x)} ${n1(c1y)}, ${n1(c2x)} ${n1(c2y)}, ${n1(p2.x)} ${n1(p2.y)}`;
  }
  return d;
}

/* ---------- shared derivation (the real join) ---------- */

const byDate = new Map<string, JoinedTrade[]>();
for (const t of joinedTrades) {
  const list = byDate.get(t.date) ?? [];
  list.push(t);
  byDate.set(t.date, list);
}
for (const list of byDate.values()) list.sort((a, b) => a.minuteET - b.minuteET);

const allDates = [...byDate.keys()].sort();

let running = 0;
const daily = allDates.map((date) => {
  const list = byDate.get(date)!;
  const pnl = list.reduce((a, t) => a + t.pnl, 0);
  running += pnl;
  return { date, pnl, n: list.length, cum: running };
});
const finalEquity = daily[daily.length - 1].cum;

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const weekdayPnls: number[][] = [[], [], [], [], []];
for (const t of joinedTrades) {
  const dow = new Date(`${t.date}T12:00:00Z`).getUTCDay();
  if (dow >= 1 && dow <= 5) weekdayPnls[dow - 1].push(t.pnl);
}

const weekSums = new Map<string, number>();
for (const d of daily) weekSums.set(mondayOf(d.date), (weekSums.get(mondayOf(d.date)) ?? 0) + d.pnl);
const worstWeek = [...weekSums.entries()].reduce((a, b) => (b[1] < a[1] ? b : a));

/* ================================================================
   01 · THE COIL — the equity curve wound into a spiral, one turn per week
   ================================================================ */

function Coil() {
  const W = 620;
  const H = 620;
  const cx = W / 2;
  const cy = H / 2;
  const cums = daily.map((d) => d.cum);
  const cMin = Math.min(0, ...cums);
  const cMax = Math.max(...cums);
  const rOf = (c: number) => scale(c, cMin, cMax, 64, 262);
  const aOf = (i: number) => -Math.PI / 2 + (i / 5) * 2 * Math.PI;

  const rings = [0.25, 0.5, 0.75, 1].map((q) => ({
    r: rOf(cMin + (cMax - cMin) * q),
    label: money(cMin + (cMax - cMin) * q),
  }));

  const segments: { d: string; color: string; key: string; tip: string }[] = [];
  for (let i = 0; i < daily.length - 1; i++) {
    const a0 = aOf(i);
    const a1 = aOf(i + 1);
    const r0 = rOf(daily[i].cum);
    const r1 = rOf(daily[i + 1].cum);
    const [x0, y0] = polar(cx, cy, r0, a0);
    const [x1, y1] = polar(cx, cy, r1, a1);
    const am = (a0 + a1) / 2;
    const rm = ((r0 + r1) / 2) * 1.16; // tangent-approx control keeps the arc round
    const [qx, qy] = polar(cx, cy, rm, am);
    segments.push({
      d: `M ${n1(x0)} ${n1(y0)} Q ${n1(qx)} ${n1(qy)} ${n1(x1)} ${n1(y1)}`,
      color: pnlColor(daily[i + 1].pnl),
      key: daily[i + 1].date,
      tip: `${prettyDate(daily[i + 1].date)} · ${money(daily[i + 1].pnl)} · cum ${money(daily[i + 1].cum)}`,
    });
  }

  const weekTicks = daily
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % 5 === 0 && i > 0)
    .map(({ d, i }, k) => {
      const a = aOf(i);
      const [x0, y0] = polar(cx, cy, 268, a);
      const [x1, y1] = polar(cx, cy, 278, a);
      const [lx, ly] = polar(cx, cy, 290, a);
      return { x0, y0, x1, y1, lx, ly, label: `wk ${k + 2}`, key: d.date };
    });

  const greenDays = daily.filter((d) => d.pnl > 0).length;
  const title =
    worstWeek[1] < 0
      ? `${money(finalEquity)} wound into ${daily.length} sessions — the only turn that bites inward is the week of ${prettyDate(worstWeek[0])} (${money(worstWeek[1])}).`
      : `${money(finalEquity)} wound into ${daily.length} sessions — every turn grows; the slowest week still made ${money(worstWeek[1])}.`;

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label={title}>
        {rings.map((r, i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r.r} fill="none" stroke="var(--hairline)" strokeDasharray="2 5" />
            <text x={cx} y={cy - r.r - 4} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
              {r.label}
            </text>
          </g>
        ))}
        {segments.map((s) => (
          <path key={s.key} d={s.d} fill="none" stroke={s.color} strokeWidth="7" strokeLinecap="round" opacity="0.88">
            <title>{s.tip}</title>
          </path>
        ))}
        {weekTicks.map((t) => (
          <g key={t.key}>
            <line x1={n1(t.x0)} y1={n1(t.y0)} x2={n1(t.x1)} y2={n1(t.y1)} stroke="var(--muted)" strokeWidth="1" opacity="0.7" />
            <text x={n1(t.lx)} y={n1(t.ly)} textAnchor="middle" className="fill-[var(--muted)]" fontSize="9" fontFamily="var(--font-mono, monospace)">
              {t.label}
            </text>
          </g>
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-[var(--foreground)]" fontSize="30" fontWeight="650">
          {money(finalEquity)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize="11" fontFamily="var(--font-mono, monospace)">
          {daily.length} sessions · {greenDays} green
        </text>
      </svg>
      <SpecimenBody
        title={title}
        read="Growth rhythm you can feel: each turn is a week, thickness never changes, only direction and color do. A drawdown would read as a visible inward bite; here the coil never really stalls."
        note="Radial time trades precision for rhythm — you cannot compare two Tuesdays across turns, and the guide rings are doing real work to keep the scale honest. As a tool it's weak; as the cover of a weekly recap it is the strongest poster in this set. Keep for hero surfaces, not for review."
        data={`Daily net summed from the join (${daily.length} sessions, Jan–Feb 2026) · one turn = 5 sessions · radius = cumulative net · color = that day's sign.`}
      />
    </figure>
  );
}

/* ================================================================
   02 · THE PLANETARIUM — every entry on a 24h radial clock
   ================================================================ */

function Planetarium() {
  const W = 620;
  const H = 620;
  const cx = W / 2;
  const cy = H / 2;
  const R = 252;
  const frac = (m: number) => (((m - 570) % 1440) + 1440) % 1440 / 1440; // 09:30 at top
  const aOf = (m: number) => -Math.PI / 2 + frac(m) * 2 * Math.PI;

  const positions = joinedTrades.map((t) => t.qty * t.entry);
  const pMin = Math.sqrt(Math.min(...positions));
  const pMax = Math.sqrt(Math.max(...positions));

  const dots = joinedTrades.map((t) => {
    const r = scale(Math.sqrt(t.qty * t.entry), pMin, pMax, 88, R - 8);
    const [x, y] = polar(cx, cy, r, aOf(t.minuteET));
    return { x, y, t };
  });

  const spokes: { m: number; label: string }[] = [
    { m: 240, label: "04:00" },
    { m: 420, label: "07:00" },
    { m: 570, label: "09:30" },
    { m: 720, label: "12:00" },
    { m: 960, label: "16:00" },
    { m: 1200, label: "20:00" },
  ];

  // the overnight dead zone, 20:00 → 04:00
  const deadA0 = aOf(1200);
  const deadA1 = aOf(240) + 2 * Math.PI;
  const [dx0, dy0] = polar(cx, cy, R, deadA0);
  const [dx1, dy1] = polar(cx, cy, R, deadA1);
  const dead = `M ${cx} ${cy} L ${n1(dx0)} ${n1(dy0)} A ${R} ${R} 0 ${deadA1 - deadA0 > Math.PI ? 1 : 0} 1 ${n1(dx1)} ${n1(dy1)} Z`;

  const first90 = joinedTrades.filter((t) => t.minuteET >= 570 && t.minuteET < 660).length;
  const premarket = joinedTrades.filter((t) => t.minuteET < 570).length;
  const pct90 = Math.round((first90 / joinedTrades.length) * 100);
  const pctPre = Math.round((premarket / joinedTrades.length) * 100);
  const title = `The whole practice lives inside one lit arc — ${pct90}% of entries fire between 09:30 and 11:00, ${pctPre}% before the open, and nothing lands in the dark.`;

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label={title}>
        <path d={dead} fill="var(--foreground)" opacity="0.035" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--hairline)" />
        <circle cx={cx} cy={cy} r={88} fill="none" stroke="var(--hairline)" strokeDasharray="2 5" />
        {spokes.map((s) => {
          const a = aOf(s.m);
          const [x0, y0] = polar(cx, cy, 80, a);
          const [x1, y1] = polar(cx, cy, R, a);
          const [lx, ly] = polar(cx, cy, R + 20, a);
          return (
            <g key={s.m}>
              <line x1={n1(x0)} y1={n1(y0)} x2={n1(x1)} y2={n1(y1)} stroke="var(--hairline)" />
              <text x={n1(lx)} y={n1(ly + 3)} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
                {s.label}
              </text>
            </g>
          );
        })}
        {dots.map(({ x, y, t }) => (
          <circle key={t.id} cx={n1(x)} cy={n1(y)} r="2.1" fill={pnlColor(t.pnl)} opacity="0.5">
            <title>{`${t.symbol} ${prettyDate(t.date)} ${timeLabel(t.minuteET)} · ${money(t.pnl)} · $${Math.round(t.qty * t.entry).toLocaleString("en-US")} position`}</title>
          </circle>
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-[var(--foreground)]" fontSize="24" fontWeight="650">
          {joinedTrades.length.toLocaleString("en-US")} entries
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-[var(--muted)]" fontSize="11" fontFamily="var(--font-mono, monospace)">
          radius = position size
        </text>
      </svg>
      <SpecimenBody
        title={title}
        read="The habit fingerprint in one glance: when you fire, how big you are when you fire, and whether outsize bets cluster at specific hours. The empty overnight wedge is not missing data — it is the shape of a day-trader's life."
        note="Pleasantly legible for a polar plot, because time-of-day is genuinely circular and everyone can read a clock face. Position-size radius gets muddy in the dense open cluster, but the cluster itself is the finding. Stronger than the catalog's weekday×hour heat matrix for habit reading; a real candidate for a 'habits' card."
        data={`All ${joinedTrades.length} joined trades · angle = entry minute on a true 24h dial (09:30 at top) · radius = √(qty × entry) · color = outcome.`}
      />
    </figure>
  );
}

/* ================================================================
   03 · THE RIDGELINE — outcome density per weekday
   ================================================================ */

function Ridgeline() {
  const W = 1000;
  const padL = 92;
  const padR = 40;
  const all = weekdayPnls.flat();
  const lo = quantile(all, 0.02);
  const hi = quantile(all, 0.98);
  const sd = Math.sqrt(all.reduce((a, v) => a + (v - all.reduce((x, y) => x + y, 0) / all.length) ** 2, 0) / all.length);
  const h = Math.max(10, 1.06 * sd * Math.pow(all.length, -0.2));
  const xs = Array.from({ length: 90 }, (_, i) => lo + ((hi - lo) * i) / 89);
  const xOf = (v: number) => scale(v, lo, hi, padL, W - padR);

  const kde = (values: number[]) =>
    xs.map((x) => values.reduce((a, v) => a + Math.exp(-0.5 * ((x - v) / h) ** 2), 0) / (values.length * h));

  const ridgeH = 62;
  const step = 78;
  const base0 = 108;
  const ridges = weekdayPnls.map((values, i) => {
    const d = kde(values);
    const max = Math.max(...d);
    const base = base0 + i * step;
    const pts = xs.map((x, j) => ({ x: xOf(x), y: base - (d[j] / max) * ridgeH }));
    const med = quantile(values, 0.5);
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    return { pts, base, med, mean, n: values.length, i };
  });

  const means = ridges.map((r, i) => ({ i, mean: r.mean }));
  const best = means.reduce((a, b) => (b.mean > a.mean ? b : a));
  const worst = means.reduce((a, b) => (b.mean < a.mean ? b : a));
  const title = `${weekdayNames[best.i]}s carry the week at ${money(best.mean)} a trade — ${weekdayNames[worst.i]}s ${worst.mean < 0 ? "give back" : "lag"} at ${money(worst.mean)}.`;

  const H = base0 + 4 * step + 40;
  const zeroX = xOf(0);

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <line x1={n1(zeroX)} y1={base0 - ridgeH - 18} x2={n1(zeroX)} y2={H - 24} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
        <text x={n1(zeroX)} y={H - 10} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
          $0
        </text>
        {[lo, hi].map((v) => (
          <text key={v} x={n1(xOf(v))} y={H - 10} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
            {money(v)}
          </text>
        ))}
        {ridges.map((r) => (
          <g key={r.i}>
            <path d={`${smoothSegments(r.pts, true)} L ${n1(r.pts[r.pts.length - 1].x)} ${r.base} L ${n1(r.pts[0].x)} ${r.base} Z`} fill="var(--foreground)" opacity="0.055" />
            <path d={smoothSegments(r.pts, true)} fill="none" stroke="var(--foreground)" strokeWidth="1.3" opacity="0.55" />
            <line x1={n1(xOf(r.med))} y1={r.base} x2={n1(xOf(r.med))} y2={r.base - ridgeH * 0.32} stroke={pnlColor(r.med)} strokeWidth="2" />
            <text x={padL - 12} y={r.base - 6} textAnchor="end" className="fill-[var(--foreground)]" fontSize="12" fontWeight="600">
              {weekdayNames[r.i]}
            </text>
            <text x={padL - 12} y={r.base + 9} textAnchor="end" className="fill-[var(--muted)]" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
              n={r.n}
            </text>
          </g>
        ))}
      </svg>
      <SpecimenBody
        title={title}
        read="Five outcome shapes, same axis: the short ticks mark each day's median. You read both where the mass sits and how fat the tails are — a fat left tail on one weekday is a leak with a name on it."
        note="The best beauty-to-honesty ratio in the set. Overlap does the comparison work a grid of histograms never could, and nothing is hidden — n sits on every ridge. This is a direct upgrade candidate over the v1 swarm for cohort shape reading. Watch the normalization: ridges share the x scale but not a y scale, so it compares shape, not volume."
        data={`Per-trade net P&L by weekday from the join · clipped to the 2nd–98th percentile · Gaussian KDE, shared bandwidth · tick = median, colored by its sign.`}
      />
    </figure>
  );
}

/* ================================================================
   04 · THE TERRAIN — entry density as topographic contours
   ================================================================ */

function Terrain() {
  const W = 1000;
  const H = 560;
  const padL = 64;
  const padR = 24;
  const padT = 20;
  const padB = 48;

  const pts = joinedTrades.filter((t) => t.dayGainAtEntryPct != null && t.relVol != null && t.relVol > 0);
  const X0 = -20;
  const X1 = 160;
  const Y0 = -0.7; // log10 relVol: 0.2×
  const Y1 = 1.3; // 20×
  const xOf = (g: number) => scale(g, X0, X1, padL, W - padR);
  const yOf = (l: number) => scale(l, Y0, Y1, H - padB, padT);

  const COLS = 64;
  const ROWS = 48;
  const grid: number[][] = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  for (const t of pts) {
    const gx = clamp((t.dayGainAtEntryPct! - X0) / (X1 - X0), 0, 0.999);
    const gy = clamp((Math.log10(t.relVol!) - Y0) / (Y1 - Y0), 0, 0.999);
    grid[Math.floor(gy * ROWS)][Math.floor(gx * COLS)] += 1;
  }
  for (let pass = 0; pass < 2; pass++) {
    const src = grid.map((r) => [...r]);
    for (let j = 0; j < ROWS; j++)
      for (let i = 0; i < COLS; i++) {
        let sum = 0;
        let cnt = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            const jj = j + dj;
            const ii = i + di;
            if (jj >= 0 && jj < ROWS && ii >= 0 && ii < COLS) {
              sum += src[jj][ii];
              cnt++;
            }
          }
        grid[j][i] = sum / cnt;
      }
  }
  const maxV = Math.max(...grid.flat());

  // marching squares
  const contours = [0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74, 0.85].map((f) => {
    const level = maxV * f;
    let d = "";
    const lerp = (a: number, b: number) => (level - a) / (b - a);
    for (let j = 0; j < ROWS - 1; j++)
      for (let i = 0; i < COLS - 1; i++) {
        const v00 = grid[j][i];
        const v10 = grid[j][i + 1];
        const v11 = grid[j + 1][i + 1];
        const v01 = grid[j + 1][i];
        let idx = 0;
        if (v00 > level) idx |= 1;
        if (v10 > level) idx |= 2;
        if (v11 > level) idx |= 4;
        if (v01 > level) idx |= 8;
        if (idx === 0 || idx === 15) continue;
        const xA = xOf(X0 + ((X1 - X0) * i) / COLS);
        const xB = xOf(X0 + ((X1 - X0) * (i + 1)) / COLS);
        const yA = yOf(Y0 + ((Y1 - Y0) * j) / ROWS);
        const yB = yOf(Y0 + ((Y1 - Y0) * (j + 1)) / ROWS);
        const T: [number, number] = [xA + (xB - xA) * clamp(lerp(v00, v10), 0, 1), yA];
        const R: [number, number] = [xB, yA + (yB - yA) * clamp(lerp(v10, v11), 0, 1)];
        const B: [number, number] = [xA + (xB - xA) * clamp(lerp(v01, v11), 0, 1), yB];
        const L: [number, number] = [xA, yA + (yB - yA) * clamp(lerp(v00, v01), 0, 1)];
        const seg = (p: [number, number], q: [number, number]) => {
          d += `M ${n1(p[0])} ${n1(p[1])} L ${n1(q[0])} ${n1(q[1])} `;
        };
        switch (idx) {
          case 1: case 14: seg(L, T); break;
          case 2: case 13: seg(T, R); break;
          case 3: case 12: seg(L, R); break;
          case 4: case 11: seg(R, B); break;
          case 6: case 9: seg(T, B); break;
          case 7: case 8: seg(L, B); break;
          case 5: {
            const c = (v00 + v10 + v11 + v01) / 4;
            if (c > level) { seg(T, R); seg(L, B); } else { seg(L, T); seg(R, B); }
            break;
          }
          case 10: {
            const c = (v00 + v10 + v11 + v01) / 4;
            if (c > level) { seg(L, T); seg(R, B); } else { seg(T, R); seg(L, B); }
            break;
          }
        }
      }
    return { d, f };
  });

  // peak cell → home base label
  let peakI = 0;
  let peakJ = 0;
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < COLS; i++) if (grid[j][i] > grid[peakJ][peakI]) { peakI = i; peakJ = j; }
  const peakGain = X0 + ((X1 - X0) * (peakI + 0.5)) / COLS;
  const peakVol = Math.pow(10, Y0 + ((Y1 - Y0) * (peakJ + 0.5)) / ROWS);
  const [px, py] = [xOf(peakGain), yOf(Math.log10(peakVol))];

  const wins = [...pts].sort((a, b) => b.pnl - a.pnl).slice(0, 22);
  const losses = [...pts].sort((a, b) => a.pnl - b.pnl).slice(0, 22);
  const dot = (t: JoinedTrade, color: string) => (
    <circle key={t.id} cx={n1(xOf(clamp(t.dayGainAtEntryPct!, X0, X1)))} cy={n1(yOf(clamp(Math.log10(t.relVol!), Y0, Y1)))} r="2.6" fill={color} opacity="0.65">
      <title>{`${t.symbol} ${prettyDate(t.date)} · ${money(t.pnl)} · +${Math.round(t.dayGainAtEntryPct!)}% extended · ${t.relVol!.toFixed(1)}× vol`}</title>
    </circle>
  );

  const xTicks = [0, 25, 50, 75, 100, 150];
  const yTicks = [0.5, 1, 2, 4, 8, 16];
  const title = `Home base is +${Math.round(peakGain)}% extended on ${peakVol.toFixed(1)}× volume — and the biggest prints land on the high ground, not in the crowd.`;

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {contours.map((c) => (
          <path key={c.f} d={c.d} fill="none" stroke="var(--foreground)" strokeWidth="1" opacity={n1(0.1 + c.f * 0.5)} strokeLinecap="round" />
        ))}
        {wins.map((t) => dot(t, GREEN))}
        {losses.map((t) => dot(t, RED))}
        <circle cx={n1(px)} cy={n1(py)} r="4" fill="none" stroke={ACCENT} strokeWidth="1.5" />
        <text x={n1(px + 10)} y={n1(py - 8)} className="fill-[var(--foreground)]" fontSize="11" fontWeight="600">
          home base
        </text>
        <text x={n1(px + 10)} y={n1(py + 6)} className="fill-[var(--muted)]" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
          +{Math.round(peakGain)}% · {peakVol.toFixed(1)}×
        </text>
        {xTicks.map((v) => (
          <g key={v}>
            <line x1={n1(xOf(v))} y1={H - padB} x2={n1(xOf(v))} y2={H - padB + 5} stroke="var(--muted)" strokeWidth="1" />
            <text x={n1(xOf(v))} y={H - padB + 18} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
              +{v}%
            </text>
          </g>
        ))}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={padL - 5} y1={n1(yOf(Math.log10(v)))} x2={padL} y2={n1(yOf(Math.log10(v)))} stroke="var(--muted)" strokeWidth="1" />
            <text x={padL - 9} y={n1(yOf(Math.log10(v)) + 3)} textAnchor="end" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
              {v}×
            </text>
          </g>
        ))}
        <text x={(padL + W - padR) / 2} y={H - 6} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10.5">
          how much the stock had already moved when you entered
        </text>
        <text x={16} y={padT + 8} className="fill-[var(--muted)]" fontSize="10.5" transform={`rotate(-90 16 ${padT + 8})`} />
      </svg>
      <SpecimenBody
        title={title}
        read="Where you actually hunt: elevation is entry density over (how extended × how hot). The green and red dots are the 22 biggest wins and losses — if they lived on different mountains, that would be the whole story. They mostly don't: outcome follows density, so the edge is inside the territory, not in finding new territory."
        note="The most beautiful object in the set and the slowest to read — nobody parses contour lines at journal speed. What saves it is the single labeled peak and the dot overlay: read those, ignore the rings. Analytics-tier wall art; the finding (hunting ground + outcome overlay) deserves a cheaper form for daily use."
        data={`${pts.length} joined trades with extension + rel-vol · smoothed 2D density, 8 iso-levels (marching squares) · dots = 22 largest wins / losses.`}
      />
    </figure>
  );
}

/* ================================================================
   05 · THE SUNBURST — the month decomposed radially
   ================================================================ */

function Sunburst() {
  const monthCounts = new Map<string, number>();
  for (const t of joinedTrades) {
    const k = t.date.slice(0, 7);
    monthCounts.set(k, (monthCounts.get(k) ?? 0) + 1);
  }
  const month = [...monthCounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const monthDates = allDates.filter((d) => d.startsWith(month));
  const monthLabel = `${MONTHS[Number(month.slice(5, 7)) - 1]} 2026`;

  const days = monthDates.map((date) => {
    const list = byDate.get(date)!;
    const net = list.reduce((a, t) => a + t.pnl, 0);
    const gross = list.reduce((a, t) => a + Math.abs(t.pnl), 0);
    return { date, list, net, gross };
  });
  const totalGross = days.reduce((a, d) => a + d.gross, 0);
  const net = days.reduce((a, d) => a + d.net, 0);
  const nTrades = days.reduce((a, d) => a + d.list.length, 0);
  const top3 = [...days].sort((a, b) => b.net - a.net).slice(0, 3).reduce((a, d) => a + d.net, 0);
  const top3Share = net > 0 ? Math.round((top3 / net) * 100) : null;

  const W = 620;
  const H = 620;
  const cx = W / 2;
  const cy = H / 2;
  const gap = 0.004;

  let a = -Math.PI / 2;
  const daySegs: React.ReactNode[] = [];
  const tradeSegs: React.ReactNode[] = [];
  for (const d of days) {
    const span = (d.gross / totalGross) * 2 * Math.PI;
    const a0 = a;
    const a1 = a + span;
    daySegs.push(
      <path key={d.date} d={annular(cx, cy, 96, 168, a0 + gap, a1 - gap)} fill={pnlColor(d.net)} opacity="0.28" stroke="var(--background)" strokeWidth="0.5">
        <title>{`${prettyDate(d.date)} · ${money(d.net)} · ${d.list.length} trades`}</title>
      </path>,
    );
    let ta = a0;
    for (const t of d.list) {
      const tSpan = (Math.abs(t.pnl) / d.gross) * span;
      tradeSegs.push(
        <path key={t.id} d={annular(cx, cy, 174, 252, ta + gap / 2, ta + tSpan - gap / 2)} fill={pnlColor(t.pnl)} opacity={t.pnl > 0 ? 0.85 : 0.75} stroke="var(--background)" strokeWidth="0.4">
          <title>{`${t.symbol} ${timeLabel(t.minuteET)} · ${money(t.pnl)}`}</title>
        </path>,
      );
      ta += tSpan;
    }
    a = a1;
  }

  const title = top3Share != null
    ? `${monthLabel}: ${money(net)} across ${nTrades} trades — the best three sessions are ${top3Share}% of it.`
    : `${monthLabel}: ${money(net)} across ${nTrades} trades.`;

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[620px]" role="img" aria-label={title}>
        {daySegs}
        {tradeSegs}
        <text x={cx} y={cy - 22} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10.5" fontFamily="var(--font-mono, monospace)">
          {monthLabel}
        </text>
        <text x={cx} y={cy + 2} textAnchor="middle" className="fill-[var(--foreground)]" fontSize="28" fontWeight="650">
          {money(net)}
        </text>
        <text x={cx} y={cy + 22} textAnchor="middle" className="fill-[var(--muted)]" fontSize="11" fontFamily="var(--font-mono, monospace)">
          {nTrades} trades · {days.length} sessions
        </text>
      </svg>
      <SpecimenBody
        title={title}
        read="Arc length is money at stake, color is sign: inner ring sessions, outer ring individual prints. The month reads clockwise and the eye goes straight to the fat wedges — which is exactly where the month's story lives."
        note="The contribution bars of v1 answer the same question with less delight and more precision. But the radial part-to-whole makes concentration *felt* — one thick green wedge dominating the circle lands harder than a sorted bar list. Strong month-recap cover; pair it with the ledger for exact numbers."
        data={`Busiest month of the join (${monthLabel}) · inner arc = session gross exposure share, colored by session net · outer arc = each trade's share of its session, colored by sign.`}
      />
    </figure>
  );
}

/* ================================================================
   06 · THE RIVER — attention flow between tickers over time
   ================================================================ */

function River() {
  const symGross = new Map<string, number>();
  for (const t of joinedTrades) symGross.set(t.symbol, (symGross.get(t.symbol) ?? 0) + Math.abs(t.pnl));
  const top = [...symGross.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([s]) => s);
  const series = [...top, "· other ·"];
  const counts = series.map((sym) =>
    allDates.map((date) =>
      sym === "· other ·"
        ? byDate.get(date)!.filter((t) => !top.includes(t.symbol)).length
        : byDate.get(date)!.filter((t) => t.symbol === sym).length,
    ),
  );

  const W = 1000;
  const H = 480;
  const padL = 16;
  const padR = 96;
  const padT = 26;
  const riverH = 300;
  const xOf = (i: number) => scale(i, 0, allDates.length - 1, padL, W - padR);
  const maxTotal = Math.max(...allDates.map((_, i) => series.reduce((a, _, k) => a + counts[k][i], 0)));
  const hOf = (v: number) => (v / maxTotal) * riverH;

  // silhouette stack: baseline = -total/2
  const boundaries: Pt[][] = [];
  const acc = allDates.map((_, i) => -series.reduce((a, _, k) => a + hOf(counts[k][i]), 0) / 2);
  for (let k = 0; k <= series.length; k++) {
    boundaries.push(
      allDates.map((_, i) => {
        if (k > 0) acc[i] += hOf(counts[k - 1][i]);
        return { x: xOf(i), y: padT + riverH / 2 + acc[i] };
      }),
    );
  }

  const palette = ["#58a6ff", "#a371f7", "#d29922", "#39c5cf", "#f0883e", "#e3b341", "#8b949e", "#6e7681"];
  const layers = series.map((sym, k) => {
    const topEdge = boundaries[k];
    const botEdge = [...boundaries[k + 1]].reverse();
    const d = `${smoothSegments(topEdge, true)} ${smoothSegments(botEdge, false)} Z`;
    return { sym, d, color: palette[k % palette.length], total: counts[k].reduce((a, v) => a + v, 0) };
  });

  // daily net strip under the river (aligned second track, own scale)
  const netMax = Math.max(...daily.map((d) => Math.abs(d.pnl)));
  const stripY = padT + riverH + 44;
  const stripH = 56;
  const bars = daily.map((d, i) => {
    const h = (Math.abs(d.pnl) / netMax) * (stripH / 2);
    return {
      x: xOf(i),
      y: d.pnl >= 0 ? stripY - h : stripY,
      h: Math.max(1, h),
      color: pnlColor(d.pnl),
      d,
    };
  });

  // peak single-day share for the title
  let peakShare = 0;
  let peakSym = "";
  series.forEach((sym, k) =>
    allDates.forEach((_, i) => {
      const total = series.reduce((a, _, kk) => a + counts[kk][i], 0);
      if (total > 0 && counts[k][i] / total > peakShare) {
        peakShare = counts[k][i] / total;
        peakSym = sym;
      }
    }),
  );
  const topSym = layers.reduce((a, b) => (b.total > a.total ? b : a));
  const title = `Attention is a river — ${topSym.sym} holds the widest water (${topSym.total} trades), and no name keeps it for long.`;

  const monthTicks = allDates
    .map((date, i) => ({ date, i }))
    .filter(({ date }) => date.endsWith("-01") || date === allDates[0]);

  return (
    <figure className="grid gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {layers.map((l) => (
          <path key={l.sym} d={l.d} fill={l.color} opacity="0.5" stroke="var(--background)" strokeWidth="0.5">
            <title>{`${l.sym} · ${l.total} trades`}</title>
          </path>
        ))}
        {layers.map((l, k) => {
          const mid = boundaries[k][Math.floor(allDates.length * 0.5)];
          const bot = boundaries[k + 1][Math.floor(allDates.length * 0.5)];
          const y = (mid.y + bot.y) / 2;
          return (
            <text key={l.sym} x={W - padR + 12} y={n1(y + 3)} className="fill-[var(--body)]" fontSize="10.5" fontFamily="var(--font-mono, monospace)">
              {l.sym}
            </text>
          );
        })}
        {monthTicks.map(({ date, i }) => (
          <text key={date} x={n1(xOf(i))} y={stripY + stripH / 2 + 26} textAnchor="middle" className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
            {prettyDate(date)}
          </text>
        ))}
        <line x1={padL} y1={stripY} x2={W - padR} y2={stripY} stroke="var(--hairline)" />
        {bars.map((b) => (
          <line key={b.d.date} x1={n1(b.x)} y1={n1(b.y)} x2={n1(b.x)} y2={n1(b.y + b.h)} stroke={b.color} strokeWidth="4" opacity="0.8">
            <title>{`${prettyDate(b.d.date)} · ${money(b.d.pnl)}`}</title>
          </line>
        ))}
        <text x={W - padR + 12} y={stripY + 3} className="fill-[var(--muted)]" fontSize="9.5" fontFamily="var(--font-mono, monospace)">
          day net
        </text>
        {peakShare > 0.5 ? (
          <text x={padL} y={padT - 10} className="fill-[var(--muted)]" fontSize="10" fontFamily="var(--font-mono, monospace)">
            peak concentration: {peakSym} = {Math.round(peakShare * 100)}% of one day&rsquo;s trades
          </text>
        ) : null}
      </svg>
      <SpecimenBody
        title={title}
        read="Band thickness is share of the day's trades — you watch attention arrive, peak, and drain away name by name. The signed strip underneath ties it back to money: wide water doesn't always mean green water, and the mismatch days are the interesting ones."
        note="Pure mood, least precision in the set — you cannot read values off a streamgraph and the smoothing lies a little at the edges. But it shows something no ledger does: focus drifting across the month as a physical thing. Recap-cover material; the aligned net strip is what keeps it honest. Stacked-area restraint noted in the catalog — this form earns an exception only for attention/activity, never for dollars."
        data={`Daily trade-count share per ticker from the join · top 7 names by gross + other · silhouette stack, catmull-rom smoothed · lower track = signed daily net.`}
      />
    </figure>
  );
}

/* ---------- specimen shell ---------- */

function SpecimenBody({ title, read, note, data }: { title: string; read: string; note: string; data: string }) {
  return (
    <figcaption className="grid gap-4">
      <h3 className="max-w-[860px] text-[17px] font-semibold leading-7 text-[var(--foreground)]">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">
        <p className="max-w-[560px] text-[13px] leading-6 text-[var(--body)]">
          <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">The read</span>
          {read}
        </p>
        <p className="max-w-[560px] text-[13px] leading-6 text-[var(--body)]">
          <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Field note</span>
          {note}
        </p>
      </div>
      <p className="font-mono text-[10.5px] leading-5 text-[var(--muted)]">data · {data}</p>
    </figcaption>
  );
}

function Specimen({ no, name, question, children }: { no: string; name: string; question: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-[var(--hairline)] py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold text-[var(--accent)]">{no}</span>
          <h2 className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)]">{name}</h2>
        </div>
        <p className="text-[12px] italic text-[var(--muted)]">“{question}”</p>
      </header>
      {children}
    </section>
  );
}

/* ---------- page ---------- */

export default function DataVizV8Forms() {
  return (
    <main className="mx-auto grid max-w-[1080px] gap-5 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Preview · Data lenses v8</div>
          <h1 className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">Open Exploration</h1>
          <p className="mt-1 max-w-[680px] text-[13px] leading-6 text-[var(--body)]">
            Six chart forms chosen for visual pull, not for narrowing — a deliberate step off the v1–v7 track to see what
            radial time, density, and flow can say about the same data. Every specimen runs on the real 1,207-trade join
            and carries a field note on whether the beauty pays its reading cost.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[12px] font-semibold">
          <Link href="/preview/data-viz" className="text-[var(--accent)] hover:underline">← Data viz index</Link>
          <Link href="/preview/data-viz/v7" className="text-[var(--accent)] hover:underline">← v7 journal lenses</Link>
        </div>
      </header>

      <Specimen no="01" name="The Coil" question="What's the rhythm of growth — and where did it stall?">
        <Coil />
      </Specimen>
      <Specimen no="02" name="The Planetarium" question="When do you actually fire — and how big?">
        <Planetarium />
      </Specimen>
      <Specimen no="03" name="The Ridgeline" question="Does the shape of outcomes shift by weekday?">
        <Ridgeline />
      </Specimen>
      <Specimen no="04" name="The Terrain" question="Where do your entries live — and do wins live elsewhere?">
        <Terrain />
      </Specimen>
      <Specimen no="05" name="The Sunburst" question="Which sessions and prints actually made the month?">
        <Sunburst />
      </Specimen>
      <Specimen no="06" name="The River" question="How does attention flow between names over time?">
        <River />
      </Specimen>

      <footer className="border-t border-[var(--border)] pt-6 text-[12px] leading-6 text-[var(--muted)]">
        <p>
          Every specimen reads the same source: 1,207 closed trades × 1-minute candles from the bundled demo DB
          (Jan–Feb 2026), via <code>src/lib/preview/candleJoinData.ts</code>. Forms in this room are candidates for
          delight, not yet for trust — graduation into Journal or Reports still requires the v1–v7 gates: a named
          question, a data contract, and an honest sample boundary.
        </p>
      </footer>
    </main>
  );
}
