"use client";

import { useId, useState } from "react";
import type { JournalSessionRow } from "@/components/JournalDayDataViews";
import { cumulativeWeekSessions } from "@/lib/journalPnlViews";
import { formatPnlPriceTick, pnlPriceTicks } from "@/lib/pnlPriceScale";

const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short" });
const fullDate = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
const dateValue = (date: string) => new Date(`${date}T12:00:00Z`);
const money = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const color = (value: number) => value > 0 ? "var(--green-chart)" : value < 0 ? "var(--red-chart)" : "var(--muted)";

export default function JournalWeekPnlChart({ asOfDate, weekStart, rows }: {
  asOfDate: string;
  weekStart: string;
  rows: JournalSessionRow[];
}) {
  const id = useId();
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const slots = cumulativeWeekSessions(weekStart, rows);
  const ticks = pnlPriceTicks(slots.flatMap((slot) => slot.cumulativePnl == null ? [] : [slot.cumulativePnl]), 320);
  const low = ticks[0];
  const high = ticks[ticks.length - 1];
  const y = (value: number) => 8 + ((high - value) / (high - low)) * 80;
  const zeroY = y(0);
  const points = slots.flatMap((slot, index) => slot.cumulativePnl == null ? [] : [{ x: 10 + index * 20, y: y(slot.cumulativePnl) }]);
  const line = points.length ? `M 0 ${zeroY} ${points.map((point) => `L ${point.x} ${point.y}`).join(" ")}` : "";
  const area = points.length ? `${line} L ${points[points.length - 1].x} ${zeroY} Z` : "";

  return (
    <figure className="rounded-lg border border-[var(--review-card-border)] bg-[var(--review-card-bg)] p-4" aria-labelledby={`${id}-title`}>
      <figcaption id={`${id}-title`} className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] font-semibold text-[var(--foreground)]">Weekly P&amp;L</span>
        <span className="text-xs text-[var(--muted)]">Cumulative · Hover a day to see trades</span>
      </figcaption>
      <div className="relative mr-16 h-80">
        {ticks.map((tick) => (
          <div key={tick} aria-hidden="true" className={`absolute inset-x-0 border-t ${tick === 0 ? "border-[var(--muted)]" : "border-dotted border-[var(--hairline)]"}`} style={{ top: `${y(tick)}%` }}>
            <span className="absolute left-full ml-3 -translate-y-1/2 whitespace-nowrap font-mono text-xs text-[var(--muted)]">
              {formatPnlPriceTick(tick, ticks[1] - ticks[0])}
            </span>
          </div>
        ))}
        <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`${id}-positive-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--green-chart)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--green-chart)" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id={`${id}-negative-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--red-chart)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--red-chart)" stopOpacity="0.28" />
            </linearGradient>
            <clipPath id={`${id}-positive`}><rect width="100" height={zeroY} /></clipPath>
            <clipPath id={`${id}-negative`}><rect y={zeroY} width="100" height={100 - zeroY} /></clipPath>
          </defs>
          {points.length > 0 ? <>
            <path d={area} fill={`url(#${id}-positive-fill)`} clipPath={`url(#${id}-positive)`} />
            <path d={area} fill={`url(#${id}-negative-fill)`} clipPath={`url(#${id}-negative)`} />
            <path d={line} fill="none" stroke="var(--green-chart)" strokeWidth="2" vectorEffect="non-scaling-stroke" clipPath={`url(#${id}-positive)`} />
            <path d={line} fill="none" stroke="var(--red-chart)" strokeWidth="2" vectorEffect="non-scaling-stroke" clipPath={`url(#${id}-negative)`} />
          </> : null}
        </svg>
        <div className="absolute inset-0 grid grid-cols-5">
          {slots.map((slot, index) => {
            const session = slot.session;
            if (!session || slot.cumulativePnl == null) return <div key={slot.date} />;
            const active = activeDate === slot.date;
            const popupAlignment = index === 0 ? "left-0" : index === 1 ? "left-0 max-sm:-left-full" : index === 3 ? "right-0 max-sm:-right-full" : index === 4 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <div key={slot.date} className={`relative ${active ? "z-10" : ""}`}
                onPointerLeave={(event) => { if (event.pointerType === "mouse") setActiveDate(null); }}
                onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setActiveDate(null); }}
                onKeyDown={(event) => { if (event.key === "Escape") setActiveDate(null); }}
              >
                <button type="button"
                  aria-label={`${fullDate.format(dateValue(slot.date))}: ${session.trades} trades, day ${money(session.pnl)}, week ${money(slot.cumulativePnl)}`}
                  aria-expanded={active} aria-controls={active ? `${id}-${slot.date}` : undefined}
                  onPointerEnter={(event) => { if (event.pointerType === "mouse") setActiveDate(slot.date); }} onFocus={() => setActiveDate(slot.date)}
                  onClick={() => setActiveDate(slot.date)}
                  className="absolute left-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                  style={{ top: `${y(slot.cumulativePnl)}%` }}
                >
                  <span className={`rounded-full border-2 bg-[var(--review-card-bg)] ${active ? "size-3.5" : "size-2.5"}`} style={{ borderColor: color(slot.cumulativePnl) }} />
                </button>
                {active ? (
                  <div id={`${id}-${slot.date}`} role="region" aria-label={`${weekday.format(dateValue(slot.date))} trades`}
                    className={`absolute top-4 w-64 max-w-[calc(100vw-5rem)] rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--body)] shadow-lg ${popupAlignment}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-[var(--foreground)]">{fullDate.format(dateValue(slot.date))}</strong>
                      <button type="button" aria-label="Close day trades" onClick={() => setActiveDate(null)} className="rounded px-1 text-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]">Close</button>
                    </div>
                    <dl className="my-3 grid grid-cols-2 gap-3">
                      <div><dt className="text-[var(--muted)]">Day P&amp;L</dt><dd className="mt-1 font-mono font-semibold" style={{ color: color(session.pnl) }}>{money(session.pnl)}</dd></div>
                      <div><dt className="text-[var(--muted)]">Week to date</dt><dd className="mt-1 font-mono font-semibold" style={{ color: color(slot.cumulativePnl) }}>{money(slot.cumulativePnl)}</dd></div>
                    </dl>
                    <div className="mb-1 font-medium text-[var(--muted)]">{session.trades} {session.trades === 1 ? "trade" : "trades"}</div>
                    {session.tickerTrades?.length ? <div tabIndex={0} aria-label="Trades by ticker" className="max-h-44 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-[var(--accent)]">
                      <table className="w-full text-left">
                        <thead className="sr-only"><tr><th>Ticker</th><th>Trades</th></tr></thead>
                        <tbody>{session.tickerTrades.map((ticker) => <tr key={ticker.symbol} className="border-t border-[var(--hairline)]">
                          <td className="py-2 font-semibold">{ticker.symbol}</td>
                          <td className="py-2 pl-2 text-right tabular-nums text-[var(--muted)]">{ticker.trades} {ticker.trades === 1 ? "trade" : "trades"}</td>
                        </tr>)}</tbody>
                      </table>
                    </div> : <p className="text-[var(--muted)]">Ticker breakdown unavailable.</p>}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="mr-16 grid grid-cols-5">
        {slots.map((slot) => <div key={slot.date} className="text-center text-xs text-[var(--muted)]" aria-label={`${fullDate.format(dateValue(slot.date))}${slot.session ? "" : slot.date > asOfDate ? ": upcoming" : ": no imported session"}`}>
          <div className="font-medium">{weekday.format(dateValue(slot.date))}</div>
        </div>)}
      </div>
    </figure>
  );
}
