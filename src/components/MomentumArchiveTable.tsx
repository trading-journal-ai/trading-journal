"use client";

import { Fragment } from "react";
import MomentumArchiveChartPanel from "@/components/MomentumArchiveChartPanel";
import InlineLedgerDisclosure, { useInlineLedgerDisclosure } from "@/components/ui/InlineLedgerDisclosure";
import type { ArchiveMoverSummary, ArchiveSessionLens, ArchiveUniverse } from "@/lib/marketArchive";

const clock = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

function formatPrice(value: number | null) {
  if (value === null) return "—";
  return `$${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 4 : 2,
    minimumFractionDigits: value < 1 ? 4 : 2,
  })}`;
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function compact(value: number) {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value);
}

function highTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : clock.format(date);
}

function dateLabel(date: string) {
  const [, month, day] = date.split("-");
  return `${month}/${day}`;
}

function gainLabel(session: ArchiveSessionLens) {
  if (session === "premarket") return "PM gain";
  if (session === "regular") return "RTH gain";
  if (session === "afterHours") return "AH vs close";
  return "Max gain";
}

function sessionLabel(session: ArchiveSessionLens) {
  if (session === "premarket") return "Premarket";
  if (session === "regular") return "Regular";
  if (session === "afterHours") return "After-hours";
  return "All sessions";
}

function reasonLabel(reason: ArchiveMoverSummary["coreExclusionReasons"][number]) {
  const labels = {
    instrument_not_common_stock: "Not common stock",
    invalid_session_date: "Invalid session date",
    known_split_execution_date: "Split date",
    missing_previous_close: "Missing prior close",
    previous_close_below_one_dollar: "Prior close < $1",
    previous_close_too_old: "Stale prior close",
    move_below_fifty_percent: "Move < 50%",
  } as const;
  return labels[reason];
}

export default function MomentumArchiveTable({
  movers,
  session,
  universe,
  view,
}: {
  movers: ArchiveMoverSummary[];
  session: ArchiveSessionLens;
  universe: ArchiveUniverse;
  view: "archive" | "day";
}) {
  const disclosure = useInlineLedgerDisclosure<string>();

  if (movers.length === 0) {
    return (
      <div className="border-y border-dashed border-[var(--border)] px-6 py-16 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No movers match this view.</p>
        <p className="mt-2 text-[13px] text-[var(--muted)]">Try Raw evidence or a different date or session lens.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-y border-[var(--hairline)]">
      <table className="w-full min-w-[920px] border-collapse text-left text-[12px]">
        <thead className="text-[var(--muted)]">
          <tr className="border-b border-[var(--hairline)]">
            {view === "archive" ? <th className="px-4 py-3 font-medium">Date</th> : null}
            <th className="px-4 py-3 font-medium">Symbol</th>
            {universe === "raw" ? <th className="px-3 py-3 font-medium">Evidence</th> : null}
            <th className="px-3 py-3 text-right font-medium">Prior close</th>
            <th className="px-3 py-3 text-right font-medium">{gainLabel(session)}</th>
            <th className="px-3 py-3 text-right font-medium">High</th>
            <th className="px-3 py-3 text-right font-medium">High at</th>
            <th className="px-3 py-3 text-right font-medium">RVOL</th>
            <th className="px-3 py-3 text-right font-medium">$ volume</th>
            <th className="px-4 py-3 text-right font-medium">Volume</th>
          </tr>
        </thead>
        <tbody>
          {movers.map((mover) => {
            const rowId = `${mover.date}:${mover.symbol}`;
            const expanded = disclosure.expandedId === rowId;
            const closing = disclosure.closingId === rowId;
            const panelId = `archive-chart-${mover.date}-${mover.symbol.replaceAll(".", "-")}`;
            const colSpan = 8 + (view === "archive" ? 1 : 0) + (universe === "raw" ? 1 : 0);
            return (
              <Fragment key={rowId}>
                <tr
                  className={`cursor-pointer border-b border-[var(--hairline)] text-[var(--body)] transition-colors hover:bg-[var(--surface-2)] ${expanded && !closing ? "bg-[var(--surface-2)]" : ""}`}
                  onClick={() => disclosure.toggle(rowId)}
                >
                  {view === "archive" ? (
                    <td className="px-4 py-3 font-mono tabular-nums text-[var(--muted)]">{dateLabel(mover.date)}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      aria-controls={panelId}
                      aria-expanded={expanded && !closing}
                      className="inline-flex items-center gap-2 text-left font-semibold text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                    >
                      <span aria-hidden="true" className={`text-[10px] text-[var(--accent)] transition-transform ${expanded && !closing ? "rotate-90" : ""}`}>›</span>
                      {mover.symbol}
                    </button>
                    <div className="mt-0.5 max-w-52 truncate text-[10px] font-normal text-[var(--muted)]">
                      {mover.instrumentName ?? mover.primaryExchange ?? "Name unavailable"}
                    </div>
                  </td>
                  {universe === "raw" ? (
                    <td className="px-3 py-3">
                      {mover.qualifiesCore ? (
                        <span className="text-[var(--muted)]">Core</span>
                      ) : (
                        <div className="flex max-w-48 flex-wrap gap-1">
                          {mover.coreExclusionReasons.map((reason) => (
                            <span key={reason} className="rounded-sm bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                              {reasonLabel(reason)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  ) : null}
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatPrice(mover.previousRegularClose)}</td>
                  <td className={`px-3 py-3 text-right font-mono font-semibold tabular-nums ${
                    (mover.lens.gainPercent ?? 0) >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}>{formatPercent(mover.lens.gainPercent)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{formatPrice(mover.lens.high)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-[var(--muted)]">{highTime(mover.lens.highAt)}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{mover.lens.rvol === null ? "—" : `${mover.lens.rvol.toFixed(1)}×`}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">${compact(mover.lens.dollarVolume)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{compact(mover.lens.volume)}</td>
                </tr>
                {expanded ? (
                  <tr id={panelId}>
                    <td colSpan={colSpan} className="border-b border-[var(--border)] bg-[var(--background)] p-0">
                      <InlineLedgerDisclosure closing={closing}>
                        <MomentumArchiveChartPanel mover={mover} onClose={() => disclosure.close(rowId)} />
                      </InlineLedgerDisclosure>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-[var(--hairline)] px-4 py-2.5 text-[11px] text-[var(--muted)]">
        {sessionLabel(session)} · Click any row to load its private one-minute chart.
      </div>
    </div>
  );
}
