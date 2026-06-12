import Link from "next/link";
import { db, schema } from "@/lib/db";
import { netPnl } from "@/lib/pnl";
import { etDateString } from "@/lib/time";
import { fmtMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type DayAgg = { pnl: number; trades: number };

const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const monthShortFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "long",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftMonth(ym: string, delta: number): string {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Calendar cells for a month: leading blanks + day numbers, padded to weeks. */
function monthMatrix(year: number, month: number): (number | null)[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

async function dailyAgg(): Promise<{ byDate: Map<string, DayAgg>; periods: Set<string> }> {
  const trades = await db
    .select({
      side: schema.trades.side,
      quantity: schema.trades.quantity,
      avgEntryPrice: schema.trades.avgEntryPrice,
      avgExitPrice: schema.trades.avgExitPrice,
      fees: schema.trades.fees,
      entryAt: schema.trades.entryAt,
    })
    .from(schema.trades);

  const byDate = new Map<string, DayAgg>();
  const periods = new Set<string>();
  for (const t of trades) {
    if (t.entryAt == null) continue;
    const date = etDateString(t.entryAt);
    periods.add(date.slice(0, 7));
    const pnl = netPnl(t) ?? 0;
    const cur = byDate.get(date) ?? { pnl: 0, trades: 0 };
    cur.pnl += pnl;
    cur.trades += 1;
    byDate.set(date, cur);
  }
  return { byDate, periods };
}

function tintFor(agg: DayAgg | undefined, alpha: number) {
  if (!agg) return { bg: "var(--surface)", border: "var(--border)" };
  const pos = agg.pnl >= 0;
  const rgb = pos ? "38,166,65" : "232,64,64";
  return { bg: `rgba(${rgb},${alpha})`, border: `rgba(${rgb},0.5)` };
}

function emptyState() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        No trades yet.{" "}
        <Link href="/import" className="text-[#58a6ff] hover:underline">
          Import a ThinkorSwim statement
        </Link>{" "}
        to populate the calendar.
      </p>
    </div>
  );
}

function ViewToggle({ active, monthHref, yearHref }: { active: "month" | "year"; monthHref: string; yearHref: string }) {
  const base = "rounded px-2.5 py-1 text-sm border";
  const on = "bg-[var(--surface)] border-[#58a6ff] text-[var(--foreground)]";
  const off = "border-[var(--border)] text-[var(--muted)] hover:border-[#58a6ff]";
  return (
    <div className="flex gap-1.5">
      <Link href={monthHref} className={`${base} ${active === "month" ? on : off}`}>Month</Link>
      <Link href={yearHref} className={`${base} ${active === "year" ? on : off}`}>Year</Link>
    </div>
  );
}

function MonthView({
  ym,
  byDate,
}: {
  ym: string;
  byDate: Map<string, DayAgg>;
}) {
  const [year, month] = ym.split("-").map(Number);
  const cells = monthMatrix(year, month);

  let monthPnl = 0;
  let monthTrades = 0;
  for (const day of cells) {
    if (day == null) continue;
    const agg = byDate.get(`${ym}-${String(day).padStart(2, "0")}`);
    if (agg) { monthPnl += agg.pnl; monthTrades += agg.trades; }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {monthFmt.format(new Date(Date.UTC(year, month - 1, 1)))}
          </h1>
          {monthTrades > 0 && (
            <span className="text-sm tabular-nums" style={{ color: monthPnl >= 0 ? "var(--green)" : "var(--red)" }}>
              {fmtMoney(monthPnl)} · {monthTrades} trades
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="month" monthHref={`/calendar?m=${ym}`} yearHref={`/calendar?view=year&y=${year}`} />
          <div className="flex gap-2 text-sm">
            <Link href={`/calendar?m=${shiftMonth(ym, -1)}`} className="rounded border border-[var(--border)] px-2 py-1 hover:border-[#58a6ff]">← Prev</Link>
            <Link href={`/calendar?m=${shiftMonth(ym, 1)}`} className="rounded border border-[var(--border)] px-2 py-1 hover:border-[#58a6ff]">Next →</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 max-w-4xl">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[11px] uppercase tracking-wide text-[var(--muted)] pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />;
          const date = `${ym}-${String(day).padStart(2, "0")}`;
          const agg = byDate.get(date);
          const { bg, border } = tintFor(agg, 0.14);
          const pos = agg ? agg.pnl >= 0 : false;
          const cell = (
            <div className="aspect-square rounded-md border p-1.5 flex flex-col" style={{ background: bg, borderColor: border }}>
              <span className="text-[11px] text-[var(--muted)]">{day}</span>
              {agg && (
                <span className="mt-auto">
                  <span className="block text-xs font-semibold tabular-nums" style={{ color: pos ? "var(--green)" : "var(--red)" }}>{fmtMoney(agg.pnl)}</span>
                  <span className="block text-[10px] text-[var(--muted)]">{agg.trades} {agg.trades === 1 ? "trade" : "trades"}</span>
                </span>
              )}
            </div>
          );
          return agg ? <Link key={i} href={`/trades?date=${date}`} className="block">{cell}</Link> : <div key={i}>{cell}</div>;
        })}
      </div>
    </div>
  );
}

function MiniMonth({
  year,
  month,
  byDate,
  maxAbs,
}: {
  year: number;
  month: number;
  byDate: Map<string, DayAgg>;
  maxAbs: number;
}) {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const cells = monthMatrix(year, month);
  let pnl = 0;
  let trades = 0;
  for (const d of cells) {
    if (d == null) continue;
    const a = byDate.get(`${ym}-${String(d).padStart(2, "0")}`);
    if (a) { pnl += a.pnl; trades += a.trades; }
  }

  return (
    <Link
      href={`/calendar?m=${ym}`}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 hover:border-[#58a6ff]"
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium">{monthShortFmt.format(new Date(Date.UTC(year, month - 1, 1)))}</span>
        {trades > 0 && (
          <span className="text-xs tabular-nums" style={{ color: pnl >= 0 ? "var(--green)" : "var(--red)" }}>{fmtMoney(pnl)}</span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} className="aspect-square" />;
          const agg = byDate.get(`${ym}-${String(day).padStart(2, "0")}`);
          const alpha = agg ? 0.2 + 0.55 * Math.min(1, Math.abs(agg.pnl) / maxAbs) : 0;
          const { bg } = tintFor(agg, alpha);
          return (
            <div
              key={i}
              className="aspect-square rounded-[2px] flex items-center justify-center text-[8px] text-[var(--muted)]"
              style={{ background: agg ? bg : "transparent" }}
              title={agg ? `${ym}-${String(day).padStart(2, "0")}: ${fmtMoney(agg.pnl)}` : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>
    </Link>
  );
}

function YearView({
  year,
  byDate,
  latest,
}: {
  year: number;
  byDate: Map<string, DayAgg>;
  latest: string;
}) {
  let yearPnl = 0;
  let yearTrades = 0;
  let maxAbs = 1;
  for (const [date, agg] of byDate) {
    if (!date.startsWith(`${year}-`)) continue;
    yearPnl += agg.pnl;
    yearTrades += agg.trades;
    maxAbs = Math.max(maxAbs, Math.abs(agg.pnl));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{year}</h1>
          {yearTrades > 0 && (
            <span className="text-sm tabular-nums" style={{ color: yearPnl >= 0 ? "var(--green)" : "var(--red)" }}>
              {fmtMoney(yearPnl)} · {yearTrades} trades
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle active="year" monthHref={`/calendar?m=${latest}`} yearHref={`/calendar?view=year&y=${year}`} />
          <div className="flex gap-2 text-sm">
            <Link href={`/calendar?view=year&y=${year - 1}`} className="rounded border border-[var(--border)] px-2 py-1 hover:border-[#58a6ff]">← {year - 1}</Link>
            <Link href={`/calendar?view=year&y=${year + 1}`} className="rounded border border-[var(--border)] px-2 py-1 hover:border-[#58a6ff]">{year + 1} →</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth key={i} year={year} month={i + 1} byDate={byDate} maxAbs={maxAbs} />
        ))}
      </div>
    </div>
  );
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; y?: string; view?: string }>;
}) {
  const { m, y, view } = await searchParams;
  const { byDate, periods } = await dailyAgg();

  const latest = [...periods].sort().at(-1);
  if (!latest) return emptyState();

  if (view === "year") {
    const year = /^\d{4}$/.test(y ?? "") ? Number(y) : Number(latest.slice(0, 4));
    return <YearView year={year} byDate={byDate} latest={latest} />;
  }

  const ym = /^\d{4}-\d{2}$/.test(m ?? "") ? (m as string) : latest;
  return <MonthView ym={ym} byDate={byDate} />;
}
