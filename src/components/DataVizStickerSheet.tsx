import Link from "next/link";
import type { ReactNode } from "react";
import DataVizLensBuilder from "@/components/DataVizLensBuilder";
import {
  activityPoints,
  calendarSessions,
  cohortMetrics,
  contributionTrades,
  edgeRows,
  excursionPoints,
  periodComparisons,
  rxtContextCandles,
  rxtContextTrades,
  sessionHeatCells,
  sessionPoints,
  tradeOutcomes,
  tradeTapePoints,
  type CohortMetric,
} from "@/lib/preview/dataVizPrototypeData";

const monoText = {
  fontFamily: "var(--font-mono)",
  fontVariantNumeric: "tabular-nums",
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number) {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function money(value: number, compact = false) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  const body = compact && absolute >= 1000 ? `${(absolute / 1000).toFixed(1)}k` : absolute.toLocaleString("en-US");
  return `${sign}$${body}`;
}

function exactMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function cents(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value * 100).toFixed(Math.abs(value * 100) < 10 ? 1 : 0)}¢`;
}

function toneColor(value: number) {
  if (value > 0) return "var(--green)";
  if (value < 0) return "var(--red)";
  return "var(--muted)";
}

function pointsPath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
}

function diamondPath(x: number, y: number, size: number) {
  return `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`;
}

function Sticker({
  index,
  family,
  title,
  description,
  status = "READY NOW",
  wide = false,
  children,
  useWhen,
  mobile,
}: {
  index: string;
  family: string;
  title: string;
  description: string;
  status?: "READY NOW" | "DERIVABLE" | "FUTURE DATA";
  wide?: boolean;
  children: ReactNode;
  useWhen: string;
  mobile: string;
}) {
  const statusClass = status === "FUTURE DATA" ? "text-[var(--muted)]" : status === "DERIVABLE" ? "text-[var(--blue)]" : "text-[var(--green)]";

  return (
    <article className={`min-w-0 rounded-[7px] border border-[var(--border)] bg-[var(--surface)] ${wide ? "xl:col-span-2" : ""}`}>
      <header className="border-b border-[var(--hairline)] px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em]">
          <span className="text-[var(--muted)]">{index} · {family}</span>
          <span className={statusClass}>{status}</span>
        </div>
        <h2 className="mt-4 max-w-3xl text-[20px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--foreground)] sm:text-[23px]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-6 text-[var(--body)]">{description}</p>
      </header>

      <div className="px-4 py-5 sm:px-6 sm:py-6">{children}</div>

      <footer className="grid gap-4 border-t border-[var(--hairline)] px-5 py-4 text-[12px] leading-5 text-[var(--muted)] sm:grid-cols-2 sm:px-6">
        <p><span className="font-semibold text-[var(--body)]">Use when:</span> {useWhen}</p>
        <p><span className="font-semibold text-[var(--body)]">Mobile:</span> {mobile}</p>
      </footer>
    </article>
  );
}

function PerformancePath() {
  const width = 520;
  const height = 330;
  const left = 42;
  const plotWidth = 440;
  const plotRight = left + plotWidth;
  const barZero = 94;
  const barMax = Math.max(...sessionPoints.map((point) => Math.abs(point.pnl)));
  const barStep = plotWidth / sessionPoints.length;
  const barWidth = 10;
  const cumulative = sessionPoints.reduce<number[]>(
    (totals, point) => [...totals, (totals.at(-1) ?? 0) + point.pnl],
    [],
  );
  const cumulativeMin = Math.min(0, ...cumulative);
  const cumulativeMax = Math.max(0, ...cumulative);
  const lineTop = 196;
  const lineBottom = 292;
  const linePoints = cumulative.map((value, index) => ({
    x: left + barStep * index + barStep / 2,
    y: scale(value, cumulativeMin, cumulativeMax, lineBottom, lineTop),
  }));
  const total = cumulative.at(-1) ?? 0;
  const best = sessionPoints.reduce((current, point) => point.pnl > current.pnl ? point : current);
  const worst = sessionPoints.reduce((current, point) => point.pnl < current.pnl ? point : current);

  return (
    <figure>
      <div className="mb-5 flex flex-wrap gap-x-8 gap-y-3 border-b border-[var(--hairline)] pb-5">
        <Metric label="Period" value={money(total)} tone={toneColor(total)} />
        <Metric label="Best session" value={money(best.pnl)} tone="var(--green)" />
        <Metric label="Worst session" value={money(worst.pnl)} tone="var(--red)" />
        <Metric label="Sessions" value={String(sessionPoints.length)} />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,620px)_minmax(220px,1fr)] lg:items-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full max-w-[620px]" role="img" aria-label="Dense daily profit and loss bars aligned above a cumulative profit and loss line for July">
          <text x="0" y="16" fill="var(--muted)" fontSize="11" fontWeight="600" style={monoText}>DAILY P&amp;L · DENSE</text>
          <line x1={left} x2={plotRight} y1={barZero} y2={barZero} stroke="var(--border)" />
          {sessionPoints.map((point, index) => {
            const magnitude = (Math.abs(point.pnl) / barMax) * 58;
            const x = left + barStep * index + (barStep - barWidth) / 2;
            const y = point.pnl >= 0 ? barZero - magnitude : barZero;
            const selected = point === best || point === worst;
            return (
              <g key={point.date}>
                <rect x={x} y={y} width={barWidth} height={Math.max(2, magnitude)} rx="1.5" fill={toneColor(point.pnl)} opacity={selected ? 1 : 0.68} />
                {selected ? (
                  <text
                    x={x + barWidth / 2}
                    y={point.pnl >= 0 ? y - 8 : y + magnitude + 14}
                    textAnchor="middle"
                    fill={toneColor(point.pnl)}
                    fontSize="10"
                    fontWeight="600"
                    style={monoText}
                  >
                    {money(point.pnl)}
                  </text>
                ) : null}
              </g>
            );
          })}
          <text x="0" y={lineTop - 20} fill="var(--muted)" fontSize="11" fontWeight="600" style={monoText}>CUMULATIVE</text>
          {[0, total].map((tick) => {
            const y = scale(tick, cumulativeMin, cumulativeMax, lineBottom, lineTop);
            return (
              <g key={tick}>
                <line x1={left} x2={plotRight} y1={y} y2={y} stroke="var(--hairline)" />
                <text x={left - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10" style={monoText}>{money(tick, true)}</text>
              </g>
            );
          })}
          <path d={pointsPath(linePoints)} fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {linePoints.map((point, index) => (
            <g key={sessionPoints[index].date}>
              <circle cx={point.x} cy={point.y} r={index === linePoints.length - 1 ? 3.25 : 1.75} fill={index === linePoints.length - 1 ? "var(--green)" : "var(--surface)"} stroke="var(--green)" strokeWidth="1.25" />
              <text x={point.x} y={height - 8} textAnchor="middle" fill="var(--muted)" fontSize="9" style={monoText}>{sessionPoints[index].label}</text>
            </g>
          ))}
          <text x={plotRight} y={linePoints.at(-1)!.y - 10} textAnchor="end" fill="var(--green)" fontSize="10.5" fontWeight="600" style={monoText}>{money(total)}</text>
        </svg>
        <OutcomePulse />
      </div>
      <figcaption className="sr-only">Daily bars reveal volatile sessions while the aligned cumulative line preserves the period path.</figcaption>
    </figure>
  );
}

function OutcomePulse() {
  const width = 260;
  const height = 180;
  const left = 14;
  const right = 14;
  const baseline = 92;
  const maxAbs = Math.max(...sessionPoints.map((point) => Math.abs(point.pnl)));
  const step = (width - left - right) / (sessionPoints.length - 1);
  const greenSessions = sessionPoints.filter((point) => point.pnl > 0).length;

  return (
    <div className="border-l-0 border-[var(--hairline)] lg:border-l lg:pl-7">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Alternate · outcome pulse</div>
      <p className="mt-2 text-[12px] leading-5 text-[var(--body)]">Position shows sign. Circle size and density show impact.</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 block h-auto w-full max-w-[300px]" role="img" aria-label="Alternate daily profit and loss pulse using circle position, size, and color density">
        <line x1={left} x2={width - right} y1={baseline} y2={baseline} stroke="var(--border)" />
        {sessionPoints.map((point, index) => {
          const ratio = Math.abs(point.pnl) / maxAbs;
          const cy = point.pnl >= 0 ? baseline - 38 : baseline + 38;
          const cx = left + step * index;
          return (
            <g key={point.date}>
              <line x1={cx} x2={cx} y1={baseline} y2={cy} stroke={toneColor(point.pnl)} strokeOpacity={0.18 + ratio * 0.36} />
              <circle cx={cx} cy={cy} r={3 + ratio * 7} fill={toneColor(point.pnl)} opacity={0.32 + ratio * 0.68} />
            </g>
          );
        })}
        <text x={left} y="12" fill="var(--green)" fontSize="9" fontWeight="600" style={monoText}>GAIN</text>
        <text x={left} y={height - 8} fill="var(--red)" fontSize="9" fontWeight="600" style={monoText}>LOSS</text>
      </svg>
      <div className="flex gap-6 border-t border-[var(--hairline)] pt-3">
        <Metric label="Green" value={`${greenSessions}/${sessionPoints.length}`} tone="var(--green)" />
        <Metric label="Red" value={`${sessionPoints.length - greenSessions}/${sessionPoints.length}`} tone="var(--red)" />
      </div>
    </div>
  );
}

function Metric({ label, value, tone = "var(--foreground)" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 whitespace-nowrap font-mono text-[15px] font-semibold tabular-nums" style={{ color: tone }}>{value}</div>
    </div>
  );
}

const outcomeSwarm = tradeOutcomes.reduce<{ value: number; level: number }[]>((points, value) => {
  const nearby = points.filter((point) => Math.abs(point.value - value) < 72).length;
  return [...points, { value, level: nearby }];
}, []);

function OutcomeDistribution() {
  const width = 560;
  const height = 260;
  const left = 44;
  const right = 18;
  const top = 30;
  const bottom = 42;
  const domainMin = -600;
  const domainMax = 1000;
  const centerY = 132;
  const median = tradeOutcomes[Math.floor(tradeOutcomes.length / 2)];
  const q1 = tradeOutcomes[Math.floor((tradeOutcomes.length - 1) * 0.25)];
  const q3 = tradeOutcomes[Math.floor((tradeOutcomes.length - 1) * 0.75)];
  const zeroX = scale(0, domainMin, domainMax, left, width - right);
  const medianX = scale(median, domainMin, domainMax, left, width - right);
  const levelOffsets = [0, -1, 1, -2, 2, -3, 3, -4, 4];

  return (
    <figure>
      <div className="mb-5 flex flex-wrap gap-x-7 gap-y-3">
        <Metric label="Median trade" value={money(median)} tone={toneColor(median)} />
        <Metric label="Middle 50%" value={`${money(q1)} – ${money(q3)}`} />
        <Metric label="Sample" value={`${tradeOutcomes.length} trades`} />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Individual trade outcome swarm with middle fifty percent and median markers">
        <rect
          x={scale(q1, domainMin, domainMax, left, width - right)}
          y={centerY - 32}
          width={scale(q3, domainMin, domainMax, left, width - right) - scale(q1, domainMin, domainMax, left, width - right)}
          height="64"
          rx="4"
          fill="var(--surface-2)"
        />
        <line x1={left} x2={width - right} y1={centerY} y2={centerY} stroke="var(--border)" />
        <line x1={zeroX} x2={zeroX} y1={top} y2={height - bottom + 4} stroke="var(--foreground)" strokeOpacity="0.66" strokeDasharray="3 4" />
        <text x={zeroX} y={top - 8} textAnchor="middle" fill="var(--foreground)" fontSize="9.5" fontWeight="600" style={monoText}>ZERO</text>
        <line x1={medianX} x2={medianX} y1={top + 10} y2={height - bottom} stroke="var(--blue)" strokeWidth="1.5" />
        <text x={medianX + 6} y={top + 22} fill="var(--blue)" fontSize="9.5" fontWeight="600" style={monoText}>MEDIAN</text>
        {outcomeSwarm.map((point, index) => {
          const x = scale(point.value, domainMin, domainMax, left, width - right);
          const y = centerY + (levelOffsets[point.level % levelOffsets.length] ?? 0) * 13;
          const magnitude = Math.abs(point.value) / domainMax;
          const outlier = point.value === tradeOutcomes[0] || point.value === tradeOutcomes.at(-1);
          return (
            <g key={`${point.value}-${index}`}>
              <circle cx={x} cy={y} r={3.2 + magnitude * 3.2} fill={toneColor(point.value)} opacity={0.48 + magnitude * 0.52} stroke="var(--surface)" strokeWidth="1" />
              {outlier ? (
                <text x={x} y={y - 11} textAnchor={point.value < 0 ? "start" : "end"} fill={toneColor(point.value)} fontSize="9.5" fontWeight="600" style={monoText}>{money(point.value)}</text>
              ) : null}
            </g>
          );
        })}
        {[-600, -200, 0, 400, 800, 1000].map((tick) => (
          <text key={tick} x={scale(tick, domainMin, domainMax, left, width - right)} y={height - 7} textAnchor={tick === domainMin ? "start" : tick === domainMax ? "end" : "middle"} fill="var(--muted)" fontSize="10" style={monoText}>{money(tick, true)}</text>
        ))}
      </svg>
    </figure>
  );
}

function WinRateRing({ value, compact = false }: { value: number; compact?: boolean }) {
  const size = compact ? 36 : 42;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`${value}% win rate`}>
      <svg viewBox="0 0 42 42" className="h-full w-full" aria-hidden="true">
        <circle cx="21" cy="21" r="16" fill="none" stroke="var(--surface-2)" strokeWidth="4" />
        <circle
          cx="21"
          cy="21"
          r="16"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth="4"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${value} ${100 - value}`}
          transform="rotate(-90 21 21)"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-semibold tabular-nums text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function EdgeLedger() {
  const maxTrades = Math.max(...edgeRows.map((row) => row.trades));
  const maxPnl = Math.max(...edgeRows.map((row) => Math.abs(row.pnl)));

  return (
    <>
      <div className="md:hidden">
        {edgeRows.map((row) => (
          <div key={row.label} className="border-b border-[var(--hairline)] py-4 first:pt-0 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-semibold text-[var(--foreground)]">{row.label}</span>
              <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: toneColor(row.pnl) }}>{money(row.pnl)}</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <WinRateRing value={row.winRate} compact />
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] tabular-nums text-[var(--muted)]">
                <span>{row.trades} trades</span>
                <span style={{ color: toneColor(row.avgTrade) }}>{money(row.avgTrade)} avg</span>
              </div>
            </div>
            <div className="mt-3 grid h-1.5 grid-cols-2 bg-[var(--surface-2)]">
              <div className="flex justify-end">{row.pnl < 0 ? <div className="h-full bg-[var(--red)]" style={{ width: `${(Math.abs(row.pnl) / maxPnl) * 100}%` }} /> : null}</div>
              <div>{row.pnl > 0 ? <div className="h-full bg-[var(--green)]" style={{ width: `${(row.pnl / maxPnl) * 100}%` }} /> : null}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto pb-1 md:block">
        <div className="min-w-[720px]">
        <div className="grid grid-cols-[140px_1fr_56px_90px_1.25fr_76px] items-end gap-3 border-b border-[var(--hairline)] pb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          <span>Window</span><span>Trades</span><span className="text-center">Win</span><span className="text-right">Avg</span><span>P&amp;L</span><span className="text-right">Net</span>
        </div>
        {edgeRows.map((row) => (
          <div key={row.label} className="grid grid-cols-[140px_1fr_56px_90px_1.25fr_76px] items-center gap-3 border-b border-[var(--hairline)] py-3.5 last:border-0">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">{row.label}</span>
            <div className="grid grid-cols-[1fr_25px] items-center gap-2">
              <div className="h-1.5 bg-[var(--surface-2)]"><div className="h-full bg-[var(--faint)]" style={{ width: `${(row.trades / maxTrades) * 100}%` }} /></div>
              <span className="text-right font-mono text-[11px] tabular-nums text-[var(--body)]">{row.trades}</span>
            </div>
            <div className="flex justify-center"><WinRateRing value={row.winRate} compact /></div>
            <span className="text-right font-mono text-[12px] font-semibold tabular-nums" style={{ color: toneColor(row.avgTrade) }}>{money(row.avgTrade)}</span>
            <div className="grid h-2 grid-cols-2 bg-[var(--surface-2)]">
              <div className="flex justify-end">{row.pnl < 0 ? <div className="h-full bg-[var(--red)]" style={{ width: `${(Math.abs(row.pnl) / maxPnl) * 100}%` }} /> : null}</div>
              <div>{row.pnl > 0 ? <div className="h-full bg-[var(--green)]" style={{ width: `${(row.pnl / maxPnl) * 100}%` }} /> : null}</div>
            </div>
            <span className="text-right font-mono text-[12px] font-semibold tabular-nums" style={{ color: toneColor(row.pnl) }}>{money(row.pnl)}</span>
          </div>
        ))}
        </div>
      </div>
    </>
  );
}

function ContributionPlot() {
  const width = 560;
  const height = 310;
  const labelWidth = 90;
  const valueWidth = 60;
  const center = labelWidth + (width - labelWidth - valueWidth) * 0.36;
  const positiveWidth = width - valueWidth - center;
  const negativeWidth = center - labelWidth;
  const maxPositive = Math.max(...contributionTrades.map((trade) => Math.max(0, trade.pnl)));
  const maxNegative = Math.max(...contributionTrades.map((trade) => Math.max(0, -trade.pnl)));
  const maxAbs = Math.max(maxPositive, maxNegative);
  const rowHeight = 34;
  const top = 22;
  const grossGains = contributionTrades.reduce((total, trade) => total + Math.max(0, trade.pnl), 0);
  const topThreeGains = contributionTrades.slice(0, 3).reduce((total, trade) => total + Math.max(0, trade.pnl), 0);

  return (
    <figure>
      <div className="mb-5 flex flex-wrap gap-x-7 gap-y-3">
        <Metric label="Top 3 share" value={`${Math.round((topThreeGains / grossGains) * 100)}%`} />
        <Metric label="Gross gains" value={money(grossGains)} tone="var(--green)" />
        <Metric label="Largest loss" value={money(Math.min(...contributionTrades.map((trade) => trade.pnl)))} tone="var(--red)" />
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Ranked signed contribution bars showing the trades that contributed most to the period">
        <line x1={center} x2={center} y1={8} y2={height - 20} stroke="var(--border)" />
        {contributionTrades.map((trade, index) => {
          const y = top + index * rowHeight;
          const barWidth = trade.pnl >= 0
            ? scale(trade.pnl, 0, maxPositive, 0, positiveWidth)
            : scale(Math.abs(trade.pnl), 0, maxNegative, 0, negativeWidth);
          const x = trade.pnl >= 0 ? center : center - barWidth;
          return (
            <g key={trade.label}>
              <text x="0" y={y + 10} fill="var(--body)" fontSize="11.5" fontWeight="600">{trade.symbol}</text>
              <text x="43" y={y + 10} fill="var(--muted)" fontSize="10" style={monoText}>{trade.label}</text>
              <rect x={x} y={y} width={barWidth} height="14" rx="2" fill={toneColor(trade.pnl)} opacity={0.42 + (Math.abs(trade.pnl) / maxAbs) * 0.58} />
              <text x={width} y={y + 11} textAnchor="end" fill={toneColor(trade.pnl)} fontSize="11" fontWeight="600" style={monoText}>{money(trade.pnl)}</text>
            </g>
          );
        })}
        <text x={center - 8} y={height - 4} textAnchor="end" fill="var(--muted)" fontSize="9.5" style={monoText}>LOSS</text>
        <text x={center + 8} y={height - 4} fill="var(--muted)" fontSize="9.5" style={monoText}>GAIN</text>
      </svg>
    </figure>
  );
}

function formatMetric(metric: CohortMetric, value: number) {
  if (metric.format === "percent") return `${value.toFixed(0)}%`;
  if (metric.format === "money") return money(value);
  if (metric.format === "ratio") return value.toFixed(2);
  return value.toFixed(1);
}

function CohortDumbbells() {
  const width = 560;
  const height = 300;
  const left = 118;
  const right = 88;
  const top = 34;
  const rowHeight = 50;

  return (
    <figure>
      <div className="mb-4 flex items-center gap-5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        <span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-[var(--faint)]" /> 90-day baseline</span>
        <span className="inline-flex items-center gap-2 text-[var(--blue)]"><i className="h-2 w-2 rounded-full bg-[var(--blue)]" /> July</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Dumbbell plots comparing July performance metrics with the prior 90 day baseline">
        {cohortMetrics.map((metric, index) => {
          const y = top + index * rowHeight;
          const xBaseline = scale(metric.baseline, metric.min, metric.max, left, width - right);
          const xCurrent = scale(metric.current, metric.min, metric.max, left, width - right);
          const improved = metric.direction === "higher" ? metric.current > metric.baseline : metric.current < metric.baseline;
          return (
            <g key={metric.label}>
              <text x="0" y={y + 4} fill="var(--body)" fontSize="11.5" fontWeight="600">{metric.label}</text>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--hairline)" />
              <line x1={xBaseline} x2={xCurrent} y1={y} y2={y} stroke="var(--muted)" strokeWidth="2" />
              <circle cx={xBaseline} cy={y} r="4.5" fill="var(--faint)" />
              <circle cx={xCurrent} cy={y} r="5.5" fill="var(--blue)" />
              <text x={width} y={y + 4} textAnchor="end" fill={improved ? "var(--foreground)" : "var(--muted)"} fontSize="11" fontWeight="600" style={monoText}>
                {formatMetric(metric, metric.baseline)} → {formatMetric(metric, metric.current)}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function ActivityScatter() {
  const width = 560;
  const height = 310;
  const left = 48;
  const right = 24;
  const top = 28;
  const bottom = 42;
  const plotBottom = height - bottom;
  const x = (value: number) => scale(value, 2, 10, left, width - right);
  const y = (value: number) => scale(value, -100, 200, plotBottom, top);

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Scatterplot relating trades per day to average profit and loss per trade">
        {[-100, 0, 100, 200].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "var(--border)" : "var(--hairline)"} />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" style={monoText}>{money(tick)}</text>
          </g>
        ))}
        {[3, 4, 5, 6, 7, 8, 9].map((tick) => (
          <text key={tick} x={x(tick)} y={height - 10} textAnchor="middle" fill="var(--muted)" fontSize="10" style={monoText}>{tick}</text>
        ))}
        <line x1={x(6)} x2={x(6)} y1={top} y2={plotBottom} stroke="var(--blue)" strokeDasharray="3 4" strokeOpacity="0.72" />
        <text x={x(6) + 7} y={top + 10} fill="var(--blue)" fontSize="9.5" fontWeight="600" style={monoText}>6-TRADE THRESHOLD</text>
        {activityPoints.map((point) => (
          <g key={point.label}>
            <circle cx={x(point.trades)} cy={y(point.avgTrade)} r={clamp(4 + Math.abs(point.pnl) / 260, 4.5, 8.5)} fill={toneColor(point.pnl)} opacity="0.78" stroke="var(--surface)" strokeWidth="1.5" />
            {point.avgTrade === 173 || point.avgTrade === -74 ? (
              <text x={x(point.trades) + 9} y={y(point.avgTrade) + 4} fill="var(--body)" fontSize="10" style={monoText}>{point.label}</text>
            ) : null}
          </g>
        ))}
        <text x={(left + width - right) / 2} y={height} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>TRADES PER SESSION</text>
        <text x="0" y="12" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>AVG / TRADE</text>
      </svg>
    </figure>
  );
}

function CalendarHeatmap() {
  const lookup = new Map(calendarSessions.map((session) => [session.day, session.pnl]));
  const weekdays = ["MON", "TUE", "WED", "THU", "FRI"];
  const days = Array.from({ length: 23 }, (_, index) => index + 1);
  const firstWeekOffset = 2;
  const maxAbs = Math.max(...calendarSessions.map((session) => Math.abs(session.pnl)));
  const totalPnl = calendarSessions.reduce((total, session) => total + session.pnl, 0);
  const greenSessions = calendarSessions.filter((session) => session.pnl > 0).length;
  const longestGreenRun = calendarSessions.reduce(
    (state, session) => session.pnl > 0
      ? { current: state.current + 1, longest: Math.max(state.longest, state.current + 1) }
      : { current: 0, longest: state.longest },
    { current: 0, longest: 0 },
  ).longest;

  return (
    <figure>
      <div className="mb-5 flex flex-wrap gap-x-7 gap-y-3 border-b border-[var(--hairline)] pb-5">
        <Metric label="Month" value={money(totalPnl)} tone={toneColor(totalPnl)} />
        <Metric label="Green sessions" value={`${greenSessions}/${calendarSessions.length}`} tone="var(--green)" />
        <Metric label="Longest green run" value={`${longestGreenRun} days`} />
        <Metric label="Avg session" value={money(Math.round(totalPnl / calendarSessions.length))} tone={toneColor(totalPnl)} />
      </div>
      <div className="grid grid-cols-5 gap-2 border-b border-[var(--hairline)] pb-2 font-mono text-[9.5px] font-semibold tracking-[0.13em] text-[var(--muted)]">
        {weekdays.map((weekday) => <span key={weekday} className="text-center">{weekday}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2">
        {Array.from({ length: firstWeekOffset }, (_, index) => <span key={`empty-${index}`} />)}
        {days.map((day) => {
          const pnl = lookup.get(day);
          const intensity = pnl == null ? 0 : 0.08 + (Math.abs(pnl) / maxAbs) * 0.2;
          const background = pnl == null
            ? "var(--background)"
            : pnl >= 0
              ? `color-mix(in srgb, var(--green) ${Math.round(intensity * 100)}%, var(--background))`
              : `color-mix(in srgb, var(--red) ${Math.round(intensity * 100)}%, var(--background))`;
          return (
            <div key={day} className="min-h-14 border border-[var(--hairline)] px-2 py-2 sm:min-h-16" style={{ background }} aria-label={pnl == null ? `July ${day}, no session` : `July ${day}, ${money(pnl)}`}>
              <div className="font-mono text-[10px] text-[var(--muted)]">{String(day).padStart(2, "0")}</div>
              {pnl != null ? <div className="mt-2 truncate font-mono text-[10px] font-semibold tabular-nums sm:text-[11px]" style={{ color: toneColor(pnl) }}>{money(pnl, true)}</div> : null}
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function TradeTapePlot() {
  const width = 980;
  const height = 350;
  const left = 62;
  const right = 26;
  const top = 34;
  const bottom = 48;
  const plotBottom = height - bottom;
  const totalPnl = tradeTapePoints.reduce((total, trade) => total + trade.pnl, 0);
  const firstThreePnl = tradeTapePoints.slice(0, 3).reduce((total, trade) => total + trade.pnl, 0);
  const wins = tradeTapePoints.filter((trade) => trade.pnl > 0).length;
  const longestHold = Math.max(...tradeTapePoints.map((trade) => trade.durationSeconds));
  const x = (minute: number) => scale(minute, 0, 130, left, width - right);
  const y = (pnl: number) => scale(pnl, -130, 560, plotBottom, top);
  const zeroY = y(0);
  const radius = (quantity: number) => scale(quantity, 500, 1400, 4.5, 9);
  const timeTicks = [
    { minute: 0, label: "11:30" },
    { minute: 30, label: "12:00" },
    { minute: 60, label: "12:30" },
    { minute: 90, label: "13:00" },
    { minute: 120, label: "13:30" },
  ];

  return (
    <figure>
      <div className="mb-5 flex flex-wrap gap-x-7 gap-y-3 border-b border-[var(--hairline)] pb-5">
        <Metric label="Ticker / day" value="VERO · JAN 16" />
        <Metric label="Net P&L" value={money(Math.round(totalPnl))} tone="var(--green)" />
        <Metric label="Win rate" value={`${wins}/${tradeTapePoints.length}`} />
        <Metric label="First 3 share" value={`${Math.round((firstThreePnl / totalPnl) * 100)}%`} />
        <Metric label="Longest hold" value={`${Math.round(longestHold / 60)} min`} />
      </div>

      <div className="hidden sm:block">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="VERO trade tape showing entry time, realized profit and loss, and share quantity for 17 synthetic demo trades on January 16">
          <rect x={x(7.5)} y={top} width={x(30) - x(7.5)} height={plotBottom - top} fill="var(--green)" opacity="0.045" />
          <rect x={x(60)} y={top} width={x(96) - x(60)} height={plotBottom - top} fill="var(--surface-2)" />
          <text x={x(8.5)} y={top + 13} fill="var(--green)" fontSize="9.5" fontWeight="600" style={monoText}>FIRST 3 · 56% OF NET</text>
          <text x={(x(60) + x(96)) / 2} y={top + 13} textAnchor="middle" fill="var(--muted)" fontSize="9.5" fontWeight="600" style={monoText}>39-MINUTE PAUSE</text>

          {[-100, 0, 200, 400].map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 0 ? "var(--border)" : "var(--hairline)"} />
              <text x={left - 9} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" style={monoText}>{money(tick)}</text>
            </g>
          ))}

          {timeTicks.map((tick) => (
            <g key={tick.minute}>
              <line x1={x(tick.minute)} x2={x(tick.minute)} y1={top} y2={plotBottom} stroke="var(--hairline)" />
              <text x={x(tick.minute)} y={height - 12} textAnchor={tick.minute === 0 ? "start" : "middle"} fill="var(--muted)" fontSize="10" style={monoText}>{tick.label}</text>
            </g>
          ))}

          {tradeTapePoints.map((trade, index) => {
            const selected = index < 3 || trade.pnl === -101.5;
            const cx = x(trade.minute);
            const cy = y(trade.pnl);
            const opacity = 0.5 + (Math.abs(trade.pnl) / 520) * 0.5;
            return (
              <g key={trade.id}>
                <title>{`${trade.entryTime} ET · ${trade.quantity.toLocaleString()} shares · ${money(Math.round(trade.pnl))} · ${Math.round(trade.durationSeconds / 60)}m hold`}</title>
                <line x1={cx} x2={cx} y1={zeroY} y2={cy} stroke={toneColor(trade.pnl)} strokeOpacity={0.16 + opacity * 0.25} />
                <circle cx={cx} cy={cy} r={radius(trade.quantity)} fill={toneColor(trade.pnl)} opacity={opacity} stroke="var(--surface)" strokeWidth="1.5" />
                {selected ? (
                  <text x={cx} y={cy - radius(trade.quantity) - 8} textAnchor="middle" fill={toneColor(trade.pnl)} fontSize="9.5" fontWeight="600" style={monoText}>{money(Math.round(trade.pnl))}</text>
                ) : null}
              </g>
            );
          })}

          <text x="0" y="12" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>REALIZED P&amp;L</text>
          <text x={width - right} y="12" textAnchor="end" fill="var(--muted)" fontSize="9.5" fontWeight="600" style={monoText}>ENTRY TIME · ET</text>
          <g transform={`translate(${width - 230} ${top + 36})`}>
            <circle cx="8" cy="8" r="4.5" fill="var(--faint)" />
            <circle cx="52" cy="8" r="9" fill="var(--faint)" />
            <text x="70" y="12" fill="var(--muted)" fontSize="9.5" style={monoText}>500 → 1,400 SHARES</text>
          </g>
        </svg>
      </div>

      <div className="sm:hidden">
        <svg viewBox="0 0 340 500" className="block h-auto w-full" role="img" aria-label="Mobile VERO trade tape with time running vertically and realized profit and loss horizontally">
          <line x1="92" x2="92" y1="28" y2="456" stroke="var(--border)" />
          <line x1="129" x2="129" y1="28" y2="456" stroke="var(--border)" strokeDasharray="3 4" />
          {timeTicks.map((tick) => {
            const tickY = scale(tick.minute, 0, 130, 28, 456);
            return (
              <g key={tick.minute}>
                <text x="0" y={tickY + 4} fill="var(--muted)" fontSize="10" style={monoText}>{tick.label}</text>
                <line x1="48" x2="326" y1={tickY} y2={tickY} stroke="var(--hairline)" />
              </g>
            );
          })}
          <text x="129" y="15" textAnchor="middle" fill="var(--muted)" fontSize="9" fontWeight="600" style={monoText}>$0</text>
          {tradeTapePoints.map((trade) => {
            const cx = scale(trade.pnl, -130, 560, 78, 324);
            const cy = scale(trade.minute, 0, 130, 28, 456);
            const selected = trade.pnl === 520 || trade.pnl === -101.5;
            return (
              <g key={trade.id}>
                <line x1="129" x2={cx} y1={cy} y2={cy} stroke={toneColor(trade.pnl)} strokeOpacity="0.26" />
                <circle cx={cx} cy={cy} r={radius(trade.quantity)} fill={toneColor(trade.pnl)} opacity={0.55 + (Math.abs(trade.pnl) / 520) * 0.45} stroke="var(--surface)" strokeWidth="1.5" />
                {selected ? <text x={cx - 8} y={cy - 10} textAnchor="end" fill={toneColor(trade.pnl)} fontSize="9.5" fontWeight="600" style={monoText}>{money(Math.round(trade.pnl))}</text> : null}
              </g>
            );
          })}
          <text x="78" y="488" textAnchor="middle" fill="var(--red)" fontSize="9.5" fontWeight="600" style={monoText}>LOSS</text>
          <text x="324" y="488" textAnchor="end" fill="var(--green)" fontSize="9.5" fontWeight="600" style={monoText}>GAIN</text>
        </svg>
      </div>

      <figcaption className="mt-3 border-l-2 border-[var(--blue)] pl-3 text-[11.5px] leading-5 text-[var(--muted)]">
        Bundled synthetic demo data. Each dot is one closed trade; position size changes the dot radius. Exact trade details remain available in the trade list.
      </figcaption>
    </figure>
  );
}

function ExecutionBraidPlot() {
  const width = 980;
  const height = 490;
  const left = 58;
  const right = 24;
  const priceTop = 38;
  const priceBottom = 326;
  const volumeTop = 366;
  const volumeBottom = 446;
  const x = (minute: number) => scale(minute, 0, 390, left, width - right);
  const y = (price: number) => scale(price, 3.6, 6.15, priceBottom, priceTop);
  const maxVolume = Math.max(...rxtContextCandles.map((candle) => candle.volume));
  const netPnl = rxtContextTrades.reduce((total, trade) => total + trade.pnl, 0);
  const materialTrades = rxtContextTrades.filter((trade) => Math.abs(trade.pnl) >= 5);
  const bestTrade = rxtContextTrades.reduce((best, trade) => trade.pnl > best.pnl ? trade : best);
  const bestMae = bestTrade.maePrice - bestTrade.entryPrice;
  const bestMfe = bestTrade.mfePrice - bestTrade.entryPrice;
  const bestCapture = Math.round(((bestTrade.exitPrice - bestTrade.entryPrice) / bestMfe) * 100);
  const volumeBarWidth = x(8) - x(0);
  const timeTicks = [
    { minute: 0, label: "09:00" },
    { minute: 60, label: "10:00" },
    { minute: 120, label: "11:00" },
    { minute: 180, label: "12:00" },
    { minute: 240, label: "13:00" },
    { minute: 300, label: "14:00" },
    { minute: 360, label: "15:00" },
  ];
  const mobileClosePath = pointsPath(rxtContextCandles.map((candle) => ({
    x: scale(candle.minute + 5, 0, 390, 45, 328),
    y: scale(candle.close, 3.6, 6.15, 322, 44),
  })));
  const desktopClosePath = pointsPath(rxtContextCandles.map((candle) => ({
    x: x(candle.minute + 5),
    y: y(candle.close),
  })));

  return (
    <figure>
      <div className="flex flex-wrap gap-x-7 gap-y-3 border-b border-[var(--hairline)] pb-5">
        <Metric label="Ticker / day" value="RXT · MAY 08" />
        <Metric label="Net P&L" value={money(Math.round(netPnl))} tone="var(--green)" />
        <Metric label="Trades shown" value={`${materialTrades.length} / ${rxtContextTrades.length}`} />
      </div>

      <div className="mb-5 border-b border-[var(--hairline)] py-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--blue)]">Selected trade · range after entry</p>
          <p className="text-[11px] text-[var(--muted)]">Best and worst are range extremes, not a time sequence.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
          <Metric label="Entry" value={`$${bestTrade.entryPrice.toFixed(3)}`} />
          <Metric label="Worst during trade" value={`$${bestTrade.maePrice.toFixed(3)} · ${cents(bestMae)}`} />
          <Metric label="Best during trade" value={`$${bestTrade.mfePrice.toFixed(3)} · ${cents(bestMfe)}`} />
          <Metric label="Exit / outcome" value={`$${bestTrade.exitPrice.toFixed(3)} · ${money(Math.round(bestTrade.pnl))}`} tone="var(--green)" />
        </div>
        <p className="mt-3 text-[11px] text-[var(--muted)]">The exit kept {bestCapture}% of the favorable move available after entry.</p>
      </div>

      <div className="hidden sm:block">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="RXT entry and exit outcome chart showing six material trades over a ten-minute price line and volume on May 8">
          <rect x={x(bestTrade.entryMinute - 5)} y={priceTop} width={x(bestTrade.exitMinute + 5) - x(bestTrade.entryMinute - 5)} height={volumeBottom - priceTop} fill="var(--blue)" opacity="0.055" />

          {[4, 5, 6].map((tick) => (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" />
              <text x={left - 9} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" style={monoText}>${tick.toFixed(2)}</text>
            </g>
          ))}

          {timeTicks.map((tick) => (
            <g key={tick.minute}>
              <line x1={x(tick.minute)} x2={x(tick.minute)} y1={priceTop} y2={volumeBottom} stroke="var(--hairline)" />
              <text x={x(tick.minute)} y={height - 8} textAnchor={tick.minute === 0 ? "start" : "middle"} fill="var(--muted)" fontSize="10" style={monoText}>{tick.label}</text>
            </g>
          ))}

          <path d={desktopClosePath} fill="none" stroke="var(--body)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

          {materialTrades.map((trade) => {
            const selected = trade.id === bestTrade.id;
            const entryX = x(trade.entryMinute);
            const exitX = x(trade.exitMinute);
            const entryY = y(trade.entryPrice);
            const exitY = y(trade.exitPrice);
            const maeY = y(trade.maePrice);
            const mfeY = y(trade.mfePrice);
            const strokeWidth = scale(trade.quantity, 10, 1400, 1, 4);
            const exitColor = toneColor(trade.pnl);
            return (
              <g key={trade.id}>
                <title>{`Entry $${trade.entryPrice.toFixed(3)} · Exit $${trade.exitPrice.toFixed(3)} · MAE ${cents(trade.maePrice - trade.entryPrice)} · MFE ${cents(trade.mfePrice - trade.entryPrice)} · ${trade.quantity.toLocaleString()} shares · ${exactMoney(trade.pnl)} · ${trade.candleCount} one-minute candles sampled`}</title>
                <line x1={entryX} x2={entryX} y1={mfeY} y2={maeY} stroke={selected ? "var(--blue)" : "var(--faint)"} strokeWidth={selected ? 3.5 : 1.25} />
                <line x1={entryX - 4} x2={entryX + 4} y1={mfeY} y2={mfeY} stroke={selected ? "var(--blue)" : "var(--faint)"} strokeWidth={selected ? 2 : 1} />
                <line x1={entryX - 4} x2={entryX + 4} y1={maeY} y2={maeY} stroke={selected ? "var(--blue)" : "var(--faint)"} strokeWidth={selected ? 2 : 1} />
                <line x1={entryX} y1={entryY} x2={exitX} y2={exitY} stroke={exitColor} strokeWidth={selected ? 4.5 : strokeWidth} strokeOpacity={selected ? 1 : 0.65} />
                <circle cx={entryX} cy={entryY} r={selected ? 6 : 4} fill="var(--surface)" stroke="var(--blue)" strokeWidth={selected ? 2.5 : 1.5} />
                <path d={diamondPath(exitX, exitY, selected ? 6 : 4)} fill={exitColor} stroke="var(--surface)" strokeWidth="1" />
                <text
                  x={exitX + (trade.entryMinute > 350 ? -9 : 9)}
                  y={exitY + (trade.pnl < 0 ? 17 : -9)}
                  textAnchor={trade.entryMinute > 350 ? "end" : "start"}
                  fill={exitColor}
                  fontSize={selected ? "11" : "10"}
                  fontWeight="700"
                  style={monoText}
                >
                  {money(Math.round(trade.pnl))}
                </text>
              </g>
            );
          })}

          <text x={x(bestTrade.entryMinute) - 10} y={y(bestTrade.mfePrice) - 9} textAnchor="end" fill="var(--blue)" fontSize="10" fontWeight="600" style={monoText}>BEST {cents(bestMfe)}</text>
          <text x={x(bestTrade.entryMinute) - 10} y={y(bestTrade.maePrice) + 15} textAnchor="end" fill="var(--blue)" fontSize="10" fontWeight="600" style={monoText}>WORST {cents(bestMae)}</text>

          {rxtContextCandles.map((candle) => {
            const barHeight = scale(candle.volume, 0, maxVolume, 2, volumeBottom - volumeTop);
            return (
              <rect
                key={`volume-${candle.minute}`}
                x={x(candle.minute + 5) - volumeBarWidth / 2}
                y={volumeBottom - barHeight}
                width={volumeBarWidth}
                height={barHeight}
                rx="1"
                fill="var(--faint)"
                opacity={0.26 + (candle.volume / maxVolume) * 0.64}
              />
            );
          })}

          <text x="0" y="12" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>PRICE CONTEXT · 10-MIN CLOSE</text>
          <text x="0" y={volumeTop + 10} fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>VOLUME</text>
          <g transform={`translate(${width - 375} 8)`}>
            <line x1="0" x2="0" y1="0" y2="10" stroke="var(--faint)" strokeWidth="1.5" />
            <text x="10" y="9" fill="var(--muted)" fontSize="9.5" style={monoText}>BEST / WORST RANGE</text>
            <circle cx="151" cy="5" r="4" fill="var(--surface)" stroke="var(--blue)" strokeWidth="1.5" />
            <text x="161" y="9" fill="var(--muted)" fontSize="9.5" style={monoText}>ENTRY</text>
            <path d={diamondPath(223, 5, 4)} fill="var(--green)" />
            <text x="235" y="9" fill="var(--muted)" fontSize="9.5" style={monoText}>EXIT + RESULT</text>
          </g>
        </svg>
      </div>

      <div className="sm:hidden">
        <svg viewBox="0 0 340 450" className="block h-auto w-full" role="img" aria-label="Mobile RXT chart showing six material trades with entry, exit, outcome, best and worst prices, and volume">
          <path d={mobileClosePath} fill="none" stroke="var(--body)" strokeWidth="1.5" strokeLinejoin="round" />
          {[4, 5, 6].map((tick) => (
            <g key={tick}>
              <line x1="45" x2="328" y1={scale(tick, 3.6, 6.15, 322, 44)} y2={scale(tick, 3.6, 6.15, 322, 44)} stroke="var(--hairline)" />
              <text x="38" y={scale(tick, 3.6, 6.15, 322, 44) + 4} textAnchor="end" fill="var(--muted)" fontSize="9.5" style={monoText}>${tick}</text>
            </g>
          ))}
          {materialTrades.map((trade) => {
            const selected = trade.id === bestTrade.id;
            const entryX = scale(trade.entryMinute, 0, 390, 45, 328);
            const exitX = scale(trade.exitMinute, 0, 390, 45, 328);
            const entryY = scale(trade.entryPrice, 3.6, 6.15, 322, 44);
            const exitY = scale(trade.exitPrice, 3.6, 6.15, 322, 44);
            const maeY = scale(trade.maePrice, 3.6, 6.15, 322, 44);
            const mfeY = scale(trade.mfePrice, 3.6, 6.15, 322, 44);
            return (
              <g key={trade.id}>
                <line x1={entryX} x2={entryX} y1={mfeY} y2={maeY} stroke={selected ? "var(--blue)" : "var(--faint)"} strokeWidth={selected ? 3 : 1} />
                <line x1={entryX - 3} x2={entryX + 3} y1={mfeY} y2={mfeY} stroke={selected ? "var(--blue)" : "var(--faint)"} />
                <line x1={entryX - 3} x2={entryX + 3} y1={maeY} y2={maeY} stroke={selected ? "var(--blue)" : "var(--faint)"} />
                <line x1={entryX} y1={entryY} x2={exitX} y2={exitY} stroke={toneColor(trade.pnl)} strokeWidth={selected ? 3.5 : 1.25} strokeOpacity={selected ? 1 : 0.62} />
                <circle cx={entryX} cy={entryY} r={selected ? 5 : 3} fill="var(--surface)" stroke="var(--blue)" strokeWidth={selected ? 2 : 1.25} />
                <path d={diamondPath(exitX, exitY, selected ? 5 : 3)} fill={toneColor(trade.pnl)} />
                <text
                  x={exitX + (trade.entryMinute > 350 ? -7 : 7)}
                  y={exitY + (trade.pnl < 0 ? 14 : -7)}
                  textAnchor={trade.entryMinute > 350 ? "end" : "start"}
                  fill={toneColor(trade.pnl)}
                  fontSize={selected ? "9" : "8"}
                  fontWeight="700"
                  style={monoText}
                >
                  {money(Math.round(trade.pnl))}
                </text>
              </g>
            );
          })}
          <text x={scale(bestTrade.entryMinute, 0, 390, 45, 328) - 7} y={scale(bestTrade.mfePrice, 3.6, 6.15, 322, 44) - 8} textAnchor="end" fill="var(--blue)" fontSize="8.5" fontWeight="600" style={monoText}>BEST {cents(bestMfe)}</text>
          <text x={scale(bestTrade.entryMinute, 0, 390, 45, 328) - 7} y={scale(bestTrade.maePrice, 3.6, 6.15, 322, 44) + 13} textAnchor="end" fill="var(--blue)" fontSize="8.5" fontWeight="600" style={monoText}>WORST {cents(bestMae)}</text>
          {[0, 120, 240, 360].map((minute) => (
            <text key={minute} x={scale(minute, 0, 390, 45, 328)} y="350" textAnchor={minute === 0 ? "start" : "middle"} fill="var(--muted)" fontSize="9.5" style={monoText}>{["09:00", "11:00", "13:00", "15:00"][minute / 120]}</text>
          ))}
          {rxtContextCandles.map((candle) => {
            const barHeight = scale(candle.volume, 0, maxVolume, 1, 58);
            return <rect key={candle.minute} x={scale(candle.minute, 0, 390, 45, 328)} y={430 - barHeight} width="5" height={barHeight} rx="1" fill="var(--faint)" opacity={0.3 + (candle.volume / maxVolume) * 0.6} />;
          })}
          <text x="45" y="388" fill="var(--muted)" fontSize="9.5" fontWeight="600" style={monoText}>VOLUME</text>
          <circle cx="167" cy="383" r="3.5" fill="var(--surface)" stroke="var(--blue)" strokeWidth="1.5" />
          <text x="176" y="387" fill="var(--muted)" fontSize="8.5" style={monoText}>ENTRY</text>
          <path d={diamondPath(230, 383, 3.5)} fill="var(--green)" />
          <text x="239" y="387" fill="var(--muted)" fontSize="8.5" style={monoText}>EXIT + RESULT</text>
        </svg>
      </div>

      <figcaption className="mt-3 border-l-2 border-[var(--blue)] pl-3 text-[11.5px] leading-5 text-[var(--muted)]">
        Bundled synthetic demo data. Six trades with outcomes of at least ±$5 are shown; all 17 remain included in the day total. Best and worst prices use one-minute candle ranges, so treat them as bounded estimates rather than tick-perfect measurements.
      </figcaption>
    </figure>
  );
}

function ExcursionScatter() {
  const width = 560;
  const height = 310;
  const left = 48;
  const right = 22;
  const top = 28;
  const bottom = 44;
  const x = (value: number) => scale(value, -1.5, 0, left, width - right);
  const y = (value: number) => scale(value, 0, 3.2, height - bottom, top);

  return (
    <figure>
      <div className="mb-4 border-l-2 border-[var(--blue)] pl-3 text-[12px] leading-5 text-[var(--muted)]">
        Illustrative only. Ship after reliable planned-risk and candle coverage are measured.
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" role="img" aria-label="Illustrative scatterplot of maximum adverse excursion and maximum favorable excursion in R multiples">
        {[0, 1, 2, 3].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke={tick === 1 ? "var(--border)" : "var(--hairline)"} />
            <text x={left - 8} y={y(tick) + 4} textAnchor="end" fill="var(--muted)" fontSize="10" style={monoText}>{tick}R</text>
          </g>
        ))}
        {[-1.5, -1, -0.5, 0].map((tick) => (
          <text key={tick} x={x(tick)} y={height - 10} textAnchor={tick === -1.5 ? "start" : tick === 0 ? "end" : "middle"} fill="var(--muted)" fontSize="10" style={monoText}>{tick}R</text>
        ))}
        <line x1={x(-1)} x2={x(-1)} y1={top} y2={height - bottom} stroke="var(--red)" strokeDasharray="3 4" strokeOpacity="0.64" />
        {excursionPoints.map((point) => (
          <g key={point.label}>
            <circle cx={x(point.mae)} cy={y(point.mfe)} r={clamp(4.5 + Math.abs(point.realized) * 1.6, 5, 8)} fill={toneColor(point.realized)} opacity="0.8" stroke="var(--surface)" strokeWidth="1.5" />
            {point.label === "GME" || point.label === "KULR" || point.label === "MIRA" ? (
              <text x={x(point.mae) + 9} y={y(point.mfe) + 4} fill="var(--body)" fontSize="10" fontWeight="600">{point.label}</text>
            ) : null}
          </g>
        ))}
        <text x={(left + width - right) / 2} y={height} textAnchor="middle" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>MAE · ADVERSE EXCURSION</text>
        <text x="0" y="12" fill="var(--muted)" fontSize="10" fontWeight="600" style={monoText}>MFE</text>
      </svg>
    </figure>
  );
}

function PeriodLadder() {
  const maxAverage = Math.max(...periodComparisons.map((period) => period.pnl / period.trades));

  return (
    <figure>
      <div className="hidden grid-cols-[90px_1fr_74px_74px_90px_90px] gap-4 border-b border-[var(--hairline)] pb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:grid">
        <span>Window</span><span>Average per trade</span><span className="text-right">Trades</span><span className="text-right">Win %</span><span className="text-right">Avg win</span><span className="text-right">Avg loss</span>
      </div>
      <div>
        {periodComparisons.map((period) => {
          const average = period.pnl / period.trades;
          return (
            <div key={period.label} className="grid gap-3 border-b border-[var(--hairline)] py-4 sm:grid-cols-[90px_1fr_74px_74px_90px_90px] sm:items-center sm:gap-4">
              <div><div className="font-mono text-[10px] font-semibold text-[var(--foreground)]">{period.label}</div><div className="mt-1 text-[10px] text-[var(--muted)]">{period.range}</div></div>
              <div>
                <div className="flex items-center justify-between gap-3"><span className="font-mono text-[11px] font-semibold text-[var(--green)]">{money(Math.round(average))} / trade</span><span className="font-mono text-[10px] text-[var(--muted)]">{money(period.pnl)} net</span></div>
                <div className="mt-2 h-[5px] overflow-hidden rounded-full bg-[var(--hairline)]"><div className="h-full rounded-full bg-[var(--green)]" style={{ width: `${scale(average, 0, maxAverage, 8, 100)}%` }} /></div>
              </div>
              <div className="flex justify-between sm:block sm:text-right"><span className="text-[10px] text-[var(--muted)] sm:hidden">Trades</span><span className="font-mono text-[11px] font-semibold">{period.trades}</span></div>
              <div className="flex justify-between sm:block sm:text-right"><span className="text-[10px] text-[var(--muted)] sm:hidden">Win rate</span><span className="font-mono text-[11px] font-semibold">{period.winRate}%</span></div>
              <div className="flex justify-between sm:block sm:text-right"><span className="text-[10px] text-[var(--muted)] sm:hidden">Avg win</span><span className="font-mono text-[11px] font-semibold text-[var(--green)]">{money(period.avgWin)}</span></div>
              <div className="flex justify-between sm:block sm:text-right"><span className="text-[10px] text-[var(--muted)] sm:hidden">Avg loss</span><span className="font-mono text-[11px] font-semibold text-[var(--red)]">{money(period.avgLoss)}</span></div>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-[11.5px] leading-5 text-[var(--muted)]">Net P&amp;L naturally grows with the window; average result, sample size, and win/loss size keep the periods honestly comparable.</figcaption>
    </figure>
  );
}

function SessionHeatmap() {
  const days = ["MON", "TUE", "WED", "THU", "FRI"] as const;
  const slots = ["07–08", "08–09", "09–10", "10+"] as const;
  const maxMagnitude = Math.max(...sessionHeatCells.map((cell) => Math.abs(cell.avgTrade)));

  return (
    <figure>
      <div className="grid grid-cols-[38px_repeat(4,minmax(0,1fr))] gap-1.5 sm:grid-cols-[52px_repeat(4,minmax(0,1fr))] sm:gap-2">
        <span />
        {slots.map((slot) => <div key={slot} className="pb-1 text-center font-mono text-[8.5px] font-semibold text-[var(--muted)] sm:text-[10px]">{slot}</div>)}
        {days.flatMap((day) => [
          <div key={`${day}-label`} className="flex items-center font-mono text-[9px] font-semibold text-[var(--muted)] sm:text-[10px]">{day}</div>,
          ...slots.map((slot) => {
            const cell = sessionHeatCells.find((candidate) => candidate.day === day && candidate.slot === slot)!;
            const opacity = 0.1 + (Math.abs(cell.avgTrade) / maxMagnitude) * 0.52;
            return (
              <div key={`${day}-${slot}`} className="relative min-h-[58px] overflow-hidden rounded-[4px] border border-[var(--hairline)] px-1 py-2 text-center sm:min-h-[72px] sm:px-2 sm:py-3">
                <div className="absolute inset-0" style={{ backgroundColor: toneColor(cell.avgTrade), opacity }} />
                <div className="relative font-mono text-[9px] font-bold text-[var(--foreground)] sm:text-[11px]">{money(cell.avgTrade)}</div>
                <div className="relative mt-1 font-mono text-[7.5px] text-[var(--body)] sm:text-[9px]">n={cell.trades}</div>
              </div>
            );
          }),
        ])}
      </div>
      <div className="mt-3 flex items-center justify-between gap-4 text-[10px] text-[var(--muted)]"><span>Cell = average trade</span><span>Label includes sample size</span></div>
    </figure>
  );
}

const cautiousVocabulary = [
  { name: "Radar", reason: "Still weak for precise comparison across mixed units." },
  { name: "Donut / ring", reason: "Useful as a compact, redundant glyph when the exact percentage stays visible—as tested in the ledger." },
  { name: "Stacked area", reason: "Good for composition over time, but occlusion makes period comparison harder." },
  { name: "Dual axis", reason: "Use only when both series truly share time and the relationship is the question; otherwise prefer aligned plots or a scatter." },
];

export default function DataVizStickerSheet() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto max-w-[1240px] px-4 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="border-b border-[var(--border)] pb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Preview / Data visualization / V1</p>
            <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold">
              <Link href="/preview/data-viz" className="text-[var(--blue)] transition-colors hover:text-[var(--foreground)]">← Data viz index</Link>
              <Link href="/preview/journal" className="text-[var(--muted)] transition-colors hover:text-[var(--foreground)]">Journal preview →</Link>
            </div>
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[38px] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[52px]">A chart vocabulary for reviewing edge.</h1>
              <p className="mt-5 max-w-3xl text-[15px] leading-7 text-[var(--body)]">
                One illustrative trading dataset, thirteen chart families. The point is to compare reading patterns before choosing what graduates into Reports.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4 lg:border-t-0 lg:pt-0">
              <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Families</dt><dd className="mt-1 font-mono text-lg font-semibold">13</dd></div>
              <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Renderer</dt><dd className="mt-1 font-mono text-lg font-semibold">SVG</dd></div>
              <div><dt className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Data</dt><dd className="mt-1 font-mono text-lg font-semibold">Mock</dd></div>
            </dl>
          </div>
        </header>

        <section className="mt-8 grid gap-4 border-b border-[var(--hairline)] pb-8 text-[12.5px] leading-5 text-[var(--muted)] sm:grid-cols-3">
          <p><strong className="text-[var(--body)]">Color:</strong> neutral context, blue for comparison, red/green only for outcome.</p>
          <p><strong className="text-[var(--body)]">Labels:</strong> key values remain visible; hover is optional detail, never the answer.</p>
          <p><strong className="text-[var(--body)]">Composition:</strong> drawn or queryable data gets one container; no nested cards.</p>
        </section>

        <section aria-label="Chart vocabulary specimens" className="mt-10 grid gap-6 xl:grid-cols-2">
          <Sticker
            index="01"
            family="Dense time series + pulse"
            title="Three sessions created most of July’s profit."
            description="Thin, closely spaced bars and the cumulative path share one compact time axis. The pulse beside it tests a more playful alternate encoding without losing sign or impact."
            wide
            useWhen="The review question is what happened, when it happened, and which sessions changed the path."
            mobile="Keep both plots aligned vertically; reduce date labels before shrinking marks."
          >
            <PerformancePath />
          </Sticker>

          <Sticker
            index="02"
            family="Trade swarm + interval"
            title="The typical trade is modest; the right tail carries the month."
            description="Every dot is a trade. The shaded middle 50%, median rule, density, and labeled outliers show the shape without turning a small sample into oversized bins."
            useWhen="You need to distinguish broad edge from a result carried by one or two trades."
            mobile="Retain the zero and median rules; use fewer axis labels, not horizontal scrolling."
          >
            <OutcomeDistribution />
          </Sticker>

          <Sticker
            index="03"
            family="Diagnostic ledger"
            title="Edge fades after 10:00 ET as frequency stays high."
            description="Count, hit rate, average trade, and net P&L remain on the same row. This replaces separate count and performance charts."
            wide
            useWhen="A category needs sample size and outcome read together: time, duration, ticker, setup, or price band."
            mobile="Stack each category into a compact summary row; keep sample size and outcome visible together."
          >
            <EdgeLedger />
          </Sticker>

          <Sticker
            index="04"
            family="Contribution plot"
            title="The top three winners dominate gross gains."
            description="Signed bars rank the trades that actually mattered and make the largest losses inspectable without turning every trade into a tile."
            useWhen="The question is concentration, tail dependency, or which records deserve immediate review."
            mobile="Show the same ranked list with shorter bars and keep symbol, trade ID, and value visible."
          >
            <ContributionPlot />
          </Sticker>

          <Sticker
            index="05"
            family="Cohort dumbbells"
            title="July improved while trade frequency fell."
            description="Each metric keeps its own honest scale while the paired marks emphasize direction and distance from the baseline."
            status="DERIVABLE"
            useWhen="Comparing current versus baseline, long versus short, setup A versus setup B, or two date ranges."
            mobile="Stack metric rows; preserve both endpoint values and the baseline/current key."
          >
            <CohortDumbbells />
          </Sticker>

          <Sticker
            index="06"
            family="Relationship scatter"
            title="High-activity sessions are less predictable—not automatically worse."
            description="Position carries the relationship; color identifies outcome, and point size gives modest emphasis to economic impact."
            status="DERIVABLE"
            useWhen="Testing a relationship such as frequency versus efficiency, size versus outcome, or hold time versus return."
            mobile="Keep tap targets larger than the marks and offer a selected-point summary below the plot."
          >
            <ActivityScatter />
          </Sticker>

          <Sticker
            index="07"
            family="Calendar heatmap"
            title="Profitable sessions cluster midweek, but Tuesday carries the deepest loss."
            description="A familiar calendar substrate answers consistency and streak questions. Summary metrics add month context while cell intensity preserves daily magnitude."
            useWhen="Date position matters: streaks, review coverage, no-trade days, or process adherence over a month."
            mobile="Keep five trading-day columns and abbreviate values; open details after tap."
          >
            <CalendarHeatmap />
          </Sticker>

          <Sticker
            index="08"
            family="Trade tape"
            title="The first three VERO trades generated 56% of the day’s result."
            description="Dots turn the sequence into evidence: horizontal position shows timing, vertical position shows realized outcome, radius shows share quantity, and spacing reveals bursts or pauses."
            wide
            useWhen="Reviewing one ticker or one session where pacing, concentration, and repeated attempts matter."
            mobile="Rotate time vertically; preserve the zero line, outcome side, and selected values."
          >
            <TradeTapePlot />
          </Sticker>

          <Sticker
            index="09"
            family="Excursion braid"
            title="The exit was efficient; the entry first absorbed 13¢ of heat."
            description="Six material trades are shown. The line provides price context, each vertical range marks the best and worst price after entry, and every exit is labeled with its result."
            wide
            useWhen="You need to distinguish a clean entry from a well-managed exit, understand normal heat, or see how much favorable movement was actually captured."
            mobile="Keep the selected-trade readout and direct outcome labels; omit micro trades before shrinking the evidence."
          >
            <ExecutionBraidPlot />
          </Sticker>

          <Sticker
            index="10"
            family="Excursion scatter"
            title="Several winners captured less than half of their available move."
            description="MAE and MFE reveal entry stress and exit efficiency, while realized outcome remains a secondary encoding."
            status="FUTURE DATA"
            useWhen="Planned risk and candle coverage are trustworthy enough to express excursions in R."
            mobile="Show selected-trade details below the chart and provide a ranked-table fallback."
          >
            <ExcursionScatter />
          </Sticker>
        </section>

        <section className="mt-16 border-t border-[var(--border)] pt-8">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-end">
            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--blue)]">Comparative lenses</p>
              <h2 className="mt-3 text-[27px] font-semibold leading-tight tracking-[-0.025em]">One flexible lens, then longer time horizons.</h2>
              <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--muted)]">11–12 retired after review</p>
            </div>
            <p className="max-w-3xl text-[13.5px] leading-6 text-[var(--body)]">Duration, share size, entry timing, and outcome now share one configurable plot. Period and session views remain separate because aggregation answers a different question than individual-trade relationships.</p>
          </div>
        </section>

        <section aria-label="Comparative trading data lenses" className="mt-8 grid gap-6 xl:grid-cols-2">
          <Sticker
            index="13"
            family="Interactive lens builder"
            title="The best winner lasted 3m 41s; hold time alone did not explain outcome."
            description="Start with hold time versus realized P&L, sized by shares. Then remap the horizontal measure or switch to a chronological Trade Tape without leaving the chart."
            wide
            status="DERIVABLE"
            useWhen="Exploring which relationship deserves a permanent report before committing to a fixed chart or dashboard card."
            mobile="Keep the controls stacked, use tap-to-select dots, and show the selected trade’s exact values below."
          >
            <DataVizLensBuilder trades={tradeTapePoints} />
          </Sticker>

          <Sticker
            index="14"
            family="Period ladder"
            title="Results are positive at every window, but average trade quality declines as the sample expands."
            description="Day, week, month, and year stay comparable through average result, while net P&L, trade count, win rate, and average win/loss preserve context."
            wide
            useWhen="Moving between daily review and longer-term evidence without letting a single strong session dominate the conclusion."
            mobile="Stack each period into one readable row and retain trades, average win, and average loss."
          >
            <PeriodLadder />
          </Sticker>

          <Sticker
            index="15"
            family="Session heat map"
            title="Wednesday and Thursday mornings carry the strongest average trade; performance fades after 10:00."
            description="Weekday and time-of-day intersect in one matrix. Color density carries average outcome while every cell still shows its value and sample size."
            wide
            useWhen="Finding recurring windows worth emphasizing, restricting, or comparing against a setup and market regime."
            mobile="Keep four broad time columns, direct values, and sample sizes; drill into narrower windows after selection."
          >
            <SessionHeatmap />
          </Sticker>
        </section>

        <section className="mt-16 border-t border-[var(--border)] pt-8">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <div>
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Use with restraint</p>
              <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.02em]">Visual interest still has to carry evidence.</h2>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {cautiousVocabulary.map((item) => (
                <div key={item.name} className="border-b border-[var(--hairline)] py-4">
                  <div className="text-[13px] font-semibold text-[var(--foreground)]">{item.name}</div>
                  <div className="mt-1 text-[12.5px] leading-5 text-[var(--muted)]">{item.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
