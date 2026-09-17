"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { setNoTradeDayAction } from "@/app/journal/actions";
import { formatCalendarAccuracy, formatCalendarProfitFactor } from "@/lib/calendarMetrics";
import { fmtMoney } from "@/lib/format";
import { journalDayState } from "@/lib/journalDayStatus";
import { calendarWeeks, isCalendarDayDetail, sumCalendarSessions, type CalendarDayDetail, type CalendarMonthData, type CalendarSession, type CalendarTotals } from "@/lib/monthCalendar";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import InlineLedgerDisclosure, { useInlineLedgerDisclosure } from "@/components/ui/InlineLedgerDisclosure";

const monthFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" });
const money = (value: number) => `${value > 0 ? "+" : ""}${fmtMoney(value)}`;
const tone = (value: number) => value > 0 ? "text-[var(--green)]" : value < 0 ? "text-[var(--red)]" : "text-[var(--muted)]";
const controlClass = "rounded-md px-3 py-2 text-[13px] font-medium text-[var(--body)] transition-colors hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]";

type Props = { data: CalendarMonthData; returnTo: string; onNavigateDay?: (date: string) => void };

/** The month surface shared by Calendar and Journal: summary, cells and day ledger. */
export default function MonthCalendar(props: Props) {
  // A changed account/month/filter or refreshed summary invalidates open detail.
  return <CalendarBody key={JSON.stringify(props.data)} {...props} />;
}

function CalendarSummary({ totals, sessions, label }: { totals: CalendarTotals; sessions: number; label: string }) {
  const metrics = [
    ["Sessions", sessions.toLocaleString("en-US")], ["Trades", totals.trades.toLocaleString("en-US")],
    ["Accuracy", formatCalendarAccuracy(totals.wins, totals.losses)],
    ["Profit factor", formatCalendarProfitFactor(totals.grossProfit, totals.grossLoss)],
  ];
  return <dl aria-label={`${label} summary`} className="mb-8 flex flex-wrap items-start gap-x-8 gap-y-5 sm:gap-x-10">
    {metrics.map(([name, value]) => <div key={name} className="text-center">
      <dt className="text-[12.5px] font-medium leading-5 text-[var(--muted)]">{name}</dt>
      <dd className="mt-1 text-[22px] font-semibold leading-[1.2] tabular-nums">{value}</dd>
    </div>)}
    <div className="ml-auto text-right">
      <dt className="text-[12.5px] font-medium leading-5 text-[var(--muted)]">P&amp;L</dt>
      <dd className={`mt-1 text-[22px] font-semibold leading-[1.2] tabular-nums ${tone(totals.pnl)}`}>{money(totals.pnl)}</dd>
    </div>
  </dl>;
}

function CalendarBody({ data, returnTo, onNavigateDay }: Props) {
  const weeks = calendarWeeks(data);
  const monthLabel = monthFormatter.format(new Date(`${data.month}-01T12:00:00Z`));
  const includedSessions = weeks.flatMap((week) => week.days.flatMap((day) => day.inRange && day.session ? [day.session] : []));
  const noTradeDates = new Set(data.noTradeDates);
  const { expandedId, closingId, toggle, close } = useInlineLedgerDisclosure<string>();
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const instanceId = useId();
  function closeDay(date: string) {
    close(date);
    buttons.current.get(date)?.focus({ preventScroll: true });
  }
  return <section aria-label={`${monthLabel} trading calendar`} onKeyDown={(event) => {
    if (event.key === "Escape" && expandedId) { event.preventDefault(); closeDay(expandedId); }
  }}>
    <CalendarSummary totals={sumCalendarSessions(includedSessions)} sessions={includedSessions.length} label={monthLabel} />
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[940px]">
        <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_205px] pb-2 text-[12.5px] font-medium text-[var(--muted)]">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", ""].map((day, index) => <span key={index} className="px-3.5">{day}<span className="sr-only">{index === 5 ? "Week total" : ""}</span></span>)}
        </div>
        <div className="overflow-hidden rounded-lg border border-[var(--hairline)]">
          {weeks.map((week, weekIndex) => {
            const openDay = week.days.find((day) => day.date === expandedId && day.session);
            return <Fragment key={week.days[0].date}>
              <div className={`grid grid-cols-[repeat(5,minmax(0,1fr))_205px] ${weekIndex ? "border-t border-[var(--hairline)]" : ""}`}>
                {week.days.map((day) => {
                  const state = journalDayState(day.session?.trades ?? 0, noTradeDates.has(day.date) ? "no_trade" : null);
                  const isToday = day.date === data.today;
                  const emptyLabel = !day.inMonth || !day.inRange || day.date > data.today
                    ? null
                    : state === "no_trade" || !isToday ? "No trades" : "Not imported yet";
                  const open = expandedId === day.date && closingId !== day.date;
                  const panelId = `${instanceId}-${day.date}`;
                  const cellClass = `grid min-h-24 content-start gap-1 border-r border-[var(--hairline)] px-3.5 py-3 text-left ${!day.inMonth || !day.inRange ? "opacity-40" : ""} ${open ? "bg-[var(--review-card-selected)]" : "bg-[var(--background)]"}`;
                  const heading = <span className="flex min-h-7 items-baseline gap-1.5 pb-1 text-[12.5px] font-medium leading-[1.3] tabular-nums"><span className={isToday ? "text-[var(--accent)]" : ""}>{day.day}</span>{isToday ? <span className="text-[11px] text-[var(--accent)]">Today</span> : null}</span>;
                  if (onNavigateDay && day.inMonth) return <Link key={day.date}
                    href={`${new URL(returnTo, "http://journal.local").pathname}?date=${day.date}`}
                    onNavigate={() => onNavigateDay(day.date)}
                    aria-label={`Open ${dayFormatter.format(new Date(`${day.date}T12:00:00Z`))} in journal`}
                    aria-current={isToday ? "date" : undefined}
                    className={`${cellClass} transition-colors hover:bg-[var(--review-card-hover)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]`}>
                    {heading}
                    {day.session ? <>
                      <span className={`block text-[17px] font-medium leading-[1.25] tabular-nums ${tone(day.session.pnl)}`}>{money(day.session.pnl)}</span>
                      <span className="truncate text-[11.5px] leading-5 text-[var(--faint)] tabular-nums">{day.session.trades} {day.session.trades === 1 ? "trade" : "trades"} · {formatCalendarAccuracy(day.session.wins, day.session.losses)}</span>
                    </> : emptyLabel ? <span className="text-[11.5px] leading-5 text-[var(--faint)]">{emptyLabel}</span> : null}
                  </Link>;
                  if (day.session) return <button key={day.date} type="button"
                    ref={(node) => { if (node) buttons.current.set(day.date, node); else buttons.current.delete(day.date); }}
                    aria-label={`${dayFormatter.format(new Date(`${day.date}T12:00:00Z`))}: ${money(day.session.pnl)}, ${day.session.trades} ${day.session.trades === 1 ? "trade" : "trades"}`}
                    aria-expanded={open} aria-controls={expandedId === day.date ? panelId : undefined} aria-current={isToday ? "date" : undefined}
                    onClick={() => toggle(day.date)}
                    className={`${cellClass} cursor-pointer transition-colors hover:bg-[var(--review-card-hover)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]`}>
                    {heading}
                    <span className={`block text-[17px] font-medium leading-[1.25] tabular-nums ${tone(day.session.pnl)}`}>{money(day.session.pnl)}</span>
                    <span className="truncate text-[11.5px] leading-5 text-[var(--faint)] tabular-nums">{day.session.trades} {day.session.trades === 1 ? "trade" : "trades"} · {formatCalendarAccuracy(day.session.wins, day.session.losses)}</span>
                  </button>;
                  const canManage = !data.readOnly && day.inMonth && day.inRange && day.date <= data.today && (!isToday || state === "no_trade");
                  return <div key={day.date} className={cellClass}>
                    {heading}
                    {emptyLabel ? <span className="text-[11.5px] leading-5 text-[var(--faint)]">{emptyLabel}</span> : null}
                    {canManage ? <form action={setNoTradeDayAction}>
                      <input type="hidden" name="date" value={day.date} /><input type="hidden" name="selected" value={state === "no_trade" ? "false" : "true"} />
                      <PendingSubmitButton label={state === "no_trade" ? "Undo" : "Mark no-trade"} pendingLabel="Saving…" className="text-left text-[11.5px] leading-5 text-[var(--muted)] hover:text-[var(--accent)]" />
                    </form> : null}
                  </div>;
                })}
                <div className="grid min-h-24 content-start gap-1 bg-[var(--background)] px-3.5 py-3" aria-label={`Week ${weekIndex + 1} totals`}>
                  {week.totals.trades ? <><span aria-hidden="true" className="min-h-7 pb-1" /><span className={`text-[17px] font-medium leading-[1.25] tabular-nums ${tone(week.totals.pnl)}`}>{money(week.totals.pnl)}</span><span className="text-[11.5px] leading-5 text-[var(--faint)] tabular-nums">{week.totals.trades} trades · {formatCalendarAccuracy(week.totals.wins, week.totals.losses)}</span></> : null}
                </div>
              </div>
              {openDay?.session ? <InlineLedgerDisclosure closing={closingId === openDay.date}>
                <DayPanel key={openDay.date} id={`${instanceId}-${openDay.date}`} session={openDay.session} accountId={data.accountId} returnTo={returnTo} onClose={() => closeDay(openDay.date)} />
              </InlineLedgerDisclosure> : null}
            </Fragment>;
          })}
        </div>
      </div>
    </div>
    <p className="mt-2 text-[12.5px] leading-5 text-[var(--faint)]">{onNavigateDay ? "Select a day to open its journal." : "Select a traded day to see its trades. Select it again or press Escape to close."}</p>
  </section>;
}

function DayPanel({ id, session, accountId, returnTo, onClose }: { id: string; session: CalendarSession; accountId: number; returnTo: string; onClose: () => void }) {
  const [result, setResult] = useState<CalendarDayDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const label = dayFormatter.format(new Date(`${session.date}T12:00:00Z`));
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/calendar/day?date=${session.date}&account=${accountId}`, { signal: controller.signal, cache: "no-store" });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(response.status === 409 ? "The account changed. Refresh the calendar to continue." : "Could not load this day's trades.");
        if (!isCalendarDayDetail(payload) || payload.date !== session.date || payload.accountId !== accountId) throw new Error("The day response did not match this calendar.");
        if (!controller.signal.aborted) setResult(payload);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load trades.");
      }
    }
    void load();
    return () => controller.abort();
  }, [accountId, session.date, attempt]);
  const rows = result?.rows ?? [];
  const displayed = showAll ? rows : rows.slice(0, 6);
  function tradeReviewHref(trade: CalendarDayDetail["rows"][number]) {
    return `/trades/review?${new URLSearchParams({ date: session.date, symbol: trade.symbol, trade: String(trade.id), returnTo }).toString()}`;
  }
  return <section id={id} aria-label={`${label} trades`} className="border-y border-[var(--accent)] bg-[var(--background)] px-6 py-5">
    <div className="mb-5 space-y-3">
      <h3 className="text-[17px] font-semibold">{label}</h3>
      <dl className="inline-flex w-fit flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-[var(--surface-2)] px-4 py-2 text-[13px] leading-5 text-[var(--muted)] tabular-nums">
        {[["Trades", String(session.trades)], ["Accuracy", formatCalendarAccuracy(session.wins, session.losses)], ["PF", formatCalendarProfitFactor(session.grossProfit, session.grossLoss)], ["P&L", money(session.pnl)]].map(([name, value]) => <div key={name} className="flex items-baseline gap-2 before:mr-1 before:text-[var(--faint)] before:content-['·'] first:before:hidden"><dt>{name}</dt><dd className={`font-medium ${name === "P&L" ? tone(session.pnl) : ""}`}>{value}</dd></div>)}
      </dl>
    </div>
    {error ? <div role="alert" className="py-4 text-sm"><p>{error}</p><button type="button" className={`${controlClass} mt-2`} onClick={() => { setError(null); setAttempt((value) => value + 1); }}>Retry</button></div>
      : !result ? <p role="status" className="py-6 text-sm text-[var(--muted)]">Loading trades…</p>
      : !rows.length ? <p className="py-6 text-sm text-[var(--muted)]">No trades are available for this day. Refresh the calendar if your imports changed.</p>
      : <table className="w-full border-collapse text-left text-[13px]">
        <thead className="border-b border-[var(--hairline)] text-[12px] font-medium text-[var(--muted)]"><tr><th className="py-2 font-medium">Time (ET)</th><th className="py-2 font-medium">Symbol</th><th className="py-2 font-medium">Context</th><th className="py-2 text-right font-medium">P&amp;L</th></tr></thead>
        <tbody>{displayed.map((trade) => <tr key={trade.id} className="border-b border-[var(--hairline)]"><td className="py-3 tabular-nums text-[var(--muted)]">{trade.time}</td><td className="py-3 font-semibold"><Link className="hover:text-[var(--accent)] hover:underline" href={tradeReviewHref(trade)}>{trade.symbol}</Link></td><td className="max-w-80 py-3 text-[var(--muted)]">{trade.tags.length ? trade.tags.join(" · ") : "—"}</td><td className={`py-3 text-right tabular-nums ${tone(trade.pnl)}`}>{money(trade.pnl)}</td></tr>)}</tbody>
      </table>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] text-[var(--faint)]">{result ? `Showing ${displayed.length} of ${rows.length} trades` : ""}</p>
      <div className="flex items-center gap-2">
        {rows.length > 6 ? <button type="button" onClick={() => setShowAll((value) => !value)} className={controlClass}>{showAll ? "Show fewer" : "Show all"}</button> : null}
        <button type="button" onClick={onClose} className={controlClass}>Close</button>
        {rows[0] ? <Link href={tradeReviewHref(rows[0])} className={`${controlClass} border border-[var(--border)]`}>Review trades</Link>
          : <button type="button" disabled className={`${controlClass} border border-[var(--border)] disabled:cursor-not-allowed disabled:opacity-50`}>Review trades</button>}
      </div>
    </div>
  </section>;
}
