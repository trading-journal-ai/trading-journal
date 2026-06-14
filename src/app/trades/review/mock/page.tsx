import Link from "next/link";
import { and, asc, desc, gte, inArray, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { netPnl } from "@/lib/pnl";
import { etDateString, etDayRange } from "@/lib/time";

export const dynamic = "force-dynamic";

type TickerRow = {
  symbol: string;
  pnl: number;
  trades: number;
};

type ReviewDay = {
  date: string;
  label: string;
  displayDate: string;
  trades: number;
  fills: number;
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
  journalHref: string;
};

type PnlPoint = {
  time: string;
  value: number;
};

type ReviewData = {
  day: ReviewDay;
  tickerRows: TickerRow[];
  pnlPoints: PnlPoint[];
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const dayFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  weekday: "long",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
  hour12: false,
});

function utcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
    minimumFractionDigits: Math.abs(value) >= 100 ? 0 : 2,
  })}`;
}

function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-[var(--muted)]";
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function profitFactor(winners: number[], losers: number[]): number | null {
  const grossWins = winners.reduce((sum, value) => sum + value, 0);
  const grossLosses = Math.abs(losers.reduce((sum, value) => sum + value, 0));
  return grossLosses === 0 ? null : grossWins / grossLosses;
}

function formatProfitFactor(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(2);
}

function formatTime(epochSeconds: number): string {
  return timeFmt.format(new Date(epochSeconds * 1000)).replace(/^24:/, "00:");
}

function fallbackData(): ReviewData {
  const date = "2026-06-11";
  const rows = [
    { symbol: "PPCB", pnl: 5063, trades: 5 },
    { symbol: "GELS", pnl: 2814, trades: 4 },
    { symbol: "EDHL", pnl: 2701, trades: 3 },
    { symbol: "SMSI", pnl: 806, trades: 2 },
    { symbol: "CPOP", pnl: 476, trades: 2 },
    { symbol: "CHAI", pnl: -38, trades: 1 },
    { symbol: "HKIT", pnl: -153, trades: 2 },
    { symbol: "NTCL", pnl: -837, trades: 3 },
    { symbol: "ADIL", pnl: -1016, trades: 4 },
    { symbol: "BYAH", pnl: -1133, trades: 2 },
    { symbol: "RUBI", pnl: -1282, trades: 3 },
  ];

  return {
    day: {
      date,
      label: "Thursday",
      displayDate: "June 11, 2026",
      trades: 31,
      fills: 78,
      accuracy: 42,
      profitFactor: 1.47,
      pnl: 7400.22,
      journalHref: `/journal?preset=today&from=${date}`,
    },
    tickerRows: rows,
    pnlPoints: [
      { time: "9:00", value: 0 },
      { time: "10:00", value: 3000 },
      { time: "11:00", value: 8500 },
      { time: "12:00", value: 10300 },
      { time: "13:00", value: 7400 },
      { time: "15:00", value: 8000 },
      { time: "18:30", value: 7400 },
    ],
  };
}

async function loadLatestReviewData(): Promise<ReviewData> {
  const latest = (
    await db
      .select({ entryAt: schema.trades.entryAt })
      .from(schema.trades)
      .orderBy(desc(schema.trades.entryAt))
      .limit(1)
  )[0];

  if (latest?.entryAt == null) return fallbackData();

  const date = etDateString(latest.entryAt);
  const { start, end } = etDayRange(date);
  const trades = (
    await db
      .select()
      .from(schema.trades)
      .where(and(gte(schema.trades.entryAt, start), lte(schema.trades.entryAt, end)))
      .orderBy(asc(schema.trades.entryAt))
  ).filter((trade) => trade.entryAt != null && etDateString(trade.entryAt) === date);

  if (trades.length === 0) return fallbackData();

  const tradeIds = trades.map((trade) => trade.id);
  const executions =
    tradeIds.length > 0
      ? await db
          .select()
          .from(schema.executions)
          .where(inArray(schema.executions.tradeId, tradeIds))
          .orderBy(asc(schema.executions.executedAt))
      : [];
  const pnls = trades.map((trade) => netPnl(trade) ?? 0);
  const winners = pnls.filter((pnl) => pnl > 0);
  const losers = pnls.filter((pnl) => pnl < 0);
  const counted = winners.length + losers.length;
  const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const tickers = new Map<string, TickerRow>();

  trades.forEach((trade) => {
    const current = tickers.get(trade.symbol) ?? { symbol: trade.symbol, pnl: 0, trades: 0 };
    current.pnl += netPnl(trade) ?? 0;
    current.trades += 1;
    tickers.set(trade.symbol, current);
  });

  let cumulative = 0;
  const pnlPoints: PnlPoint[] = [{ time: formatTime(trades[0].entryAt ?? start), value: 0 }];
  trades
    .filter((trade) => trade.exitAt != null)
    .sort((a, b) => (a.exitAt ?? 0) - (b.exitAt ?? 0))
    .forEach((trade) => {
      cumulative += netPnl(trade) ?? 0;
      pnlPoints.push({ time: formatTime(trade.exitAt ?? trade.entryAt ?? start), value: cumulative });
    });

  if (pnlPoints.length === 1) {
    pnlPoints.push({ time: formatTime(trades.at(-1)?.entryAt ?? start), value: totalPnl });
  }

  return {
    day: {
      date,
      label: dayFmt.format(utcDate(date)),
      displayDate: dateFmt.format(utcDate(date)),
      trades: trades.length,
      fills: executions.length,
      accuracy: counted === 0 ? null : Math.round((winners.length / counted) * 100),
      profitFactor: profitFactor(winners, losers),
      pnl: totalPnl,
      journalHref: `/journal?preset=today&from=${date}`,
    },
    tickerRows: [...tickers.values()].sort((a, b) => b.pnl - a.pnl),
    pnlPoints,
  };
}

function MetricLine({ day }: { day: ReviewDay }) {
  const stats = [
    { label: null, value: `${day.trades.toLocaleString()} trades` },
    { label: null, value: `${day.fills.toLocaleString()} fills` },
    { label: null, value: day.accuracy == null ? "- win" : `${day.accuracy}% win` },
    { label: "PF", value: formatProfitFactor(day.profitFactor) },
    { label: "P&L", value: formatMoney(day.pnl), className: pnlClass(day.pnl) },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[13px] font-medium text-[var(--muted)]">
      {stats.map((stat, index) => (
        <span key={`${stat.label ?? "metric"}-${stat.value}`} className="flex items-center gap-x-3">
          {index > 0 ? <span className="text-[var(--faint)]">·</span> : null}
          <span className={`tabular-nums ${stat.className ?? ""}`}>
            {stat.label ? `${stat.label} ${stat.value}` : stat.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function RunningPnlChart({ day, pnlPoints }: { day: ReviewDay; pnlPoints: PnlPoint[] }) {
  const width = 940;
  const height = 440;
  const pad = { top: 24, right: 26, bottom: 58, left: 70 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const values = pnlPoints.map((point) => point.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const range = Math.max(1, maxValue - minValue);
  const min = minValue - range * 0.18;
  const max = maxValue + range * 0.18;
  const y = (value: number) => pad.top + ((max - value) / (max - min)) * plotH;
  const x = (index: number) => pad.left + (index / Math.max(1, pnlPoints.length - 1)) * plotW;
  const line = pnlPoints.map((point, index) => `${x(index)},${y(point.value)}`).join(" ");
  const area = `${pad.left},${y(0)} ${line} ${x(pnlPoints.length - 1)},${y(0)}`;
  const ticks = [minValue, minValue + range / 2, maxValue];
  const labelIndexes = Array.from(
    new Set([
      0,
      Math.floor((pnlPoints.length - 1) * 0.33),
      Math.floor((pnlPoints.length - 1) * 0.66),
      pnlPoints.length - 1,
    ]),
  );
  const chartColor = day.pnl > 0 ? "var(--green)" : day.pnl < 0 ? "var(--red)" : "var(--muted)";

  return (
    <section className="flex h-[380px] flex-col rounded-md bg-[#14171a] px-4 py-4">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Running P&L
        </h2>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pnlClass(day.pnl)}`}>
          {formatMoney(day.pnl)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="min-h-0 flex-1" role="img" aria-label="Running P&L by time of day">
        <defs>
          <linearGradient id="mockPnlFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity="0.36" />
            <stop offset="100%" stopColor={chartColor} stopOpacity="0.08" />
          </linearGradient>
        </defs>
        {ticks.map((tick, index) => (
          <g key={`${tick}-${index}`}>
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="var(--hairline)" />
            <text
              x={pad.left - 10}
              y={y(tick) + 5}
              fill="var(--muted)"
              fontFamily="var(--font-mono)"
              fontSize="13"
              fontWeight="500"
              textAnchor="end"
            >
              {formatMoney(tick).replace("+", "")}
            </text>
          </g>
        ))}
        <line
          x1={pad.left}
          x2={width - pad.right}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--muted)"
          strokeDasharray="5 7"
          strokeOpacity="0.7"
        />
        <polygon points={area} fill="url(#mockPnlFill)" />
        <polyline points={line} fill="none" stroke={chartColor} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        {labelIndexes.map((index) => (
          <text
            key={`${index}-${pnlPoints[index].time}`}
            x={x(index)}
            y={height - 16}
            fill="var(--muted)"
            fontFamily="var(--font-mono)"
            fontSize="13"
            fontWeight="500"
            textAnchor="middle"
          >
            {pnlPoints[index].time}
          </text>
        ))}
      </svg>
    </section>
  );
}

function TickerReviewRail({ day, tickerRows }: { day: ReviewDay; tickerRows: TickerRow[] }) {
  const sortedRows = [...tickerRows].sort((a, b) => b.pnl - a.pnl);

  return (
    <aside>
      <section className="flex h-[380px] flex-col px-1 py-1">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 pt-1">
          {sortedRows.map((row) => (
            <Link
              key={row.symbol}
              href={`/trades/review?date=${day.date}&symbol=${row.symbol}&returnTo=${encodeURIComponent("/trades/review/mock")}`}
              className="grid grid-cols-[48px_1fr] items-baseline gap-3 rounded-sm py-1 font-mono text-[13px] transition-colors hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
            >
              <span className="text-[var(--foreground)]">{row.symbol}</span>
              <span className={`text-right tabular-nums ${pnlClass(row.pnl)}`}>{formatMoney(row.pnl)}</span>
            </Link>
          ))}
        </div>
        <div className="mt-4 border-t border-[var(--hairline)] pt-3">
          <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 font-mono text-[13px] leading-5">
            <span className="text-[var(--muted)]">Accuracy</span>
            <span className="tabular-nums text-[var(--foreground)]">{day.accuracy == null ? "-" : `${day.accuracy}%`}</span>
            <span className="text-[var(--muted)]">Profit Factor</span>
            <span className="tabular-nums text-[var(--foreground)]">{formatProfitFactor(day.profitFactor)}</span>
            <span className="text-[var(--muted)]">P&L</span>
            <span className={`tabular-nums ${pnlClass(day.pnl)}`}>{formatMoney(day.pnl)}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}

export default async function TradesReviewMockPage() {
  const { day, tickerRows, pnlPoints } = await loadLatestReviewData();

  return (
    <div className="mx-auto max-w-[1180px] space-y-7 pb-24">
      <Link
        href="/journal?preset=month"
        className="inline-flex h-9 items-center rounded-md border border-[var(--border)] px-3 font-mono text-[12px] font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]"
      >
        Back
      </Link>

      <div className="space-y-4">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Trades Review
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {day.label}
            </h1>
            <span className="font-mono text-base text-[var(--muted)]">{day.displayDate}</span>
          </div>
          <MetricLine day={day} />
        </div>
      </div>

      <div className="grid gap-9 border-t border-[var(--hairline)] pt-7 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start">
        <RunningPnlChart day={day} pnlPoints={pnlPoints} />
        <TickerReviewRail day={day} tickerRows={tickerRows} />
      </div>

      <section className="border-t border-[var(--hairline)] pt-6">
        <div className="mb-6">
          <Link href={day.journalHref} className="font-mono text-[12px] text-[var(--blue)] hover:underline">
            View day note
          </Link>
        </div>
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          AI Review
        </h2>
        <p className="mt-4 max-w-[760px] text-sm leading-6 text-[var(--body)]">
          AI review will summarize what drove the day after notes are added. It should interpret the
          ticker attribution, P&L path, accuracy, and profit factor instead of repeating the same
          stats shown above.
        </p>
      </section>
    </div>
  );
}
