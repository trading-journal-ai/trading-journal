"use client";

import Link from "next/link";
import { Fragment, useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import MomentumArchiveNews from "@/components/MomentumArchiveNews";
import MomentumArchiveSymbol from "@/components/MomentumArchiveSymbol";
import MomentumArchiveChartPanel from "@/components/MomentumArchiveChartPanel";
import InlineLedgerDisclosure, { useInlineLedgerDisclosure } from "@/components/ui/InlineLedgerDisclosure";
import type {
  ArchiveMoverSort,
  ArchiveMoverSummary,
  ArchiveSortDirection,
  ArchiveUniverse,
} from "@/lib/marketArchive";

const clock = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/New_York",
});

const archiveDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

/** RVOL at or above this reads as a genuine participation outlier, not noise. */
const RVOL_STANDOUT = 10;

const FAINT = "text-[var(--faint)]";
const MUTED = "text-[var(--muted)]";

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
  return archiveDate.format(new Date(`${date}T00:00:00Z`));
}

function reasonLabel(reason: ArchiveMoverSummary["coreExclusionReasons"][number]) {
  const labels = {
    instrument_not_common_stock: "Not common shares or ADR",
    invalid_session_date: "Invalid session date",
    known_split_execution_date: "Split date",
    missing_previous_close: "Missing or invalid prior close",
    previous_close_too_old: "Stale prior close",
    move_below_fifty_percent: "Move < 50%",
  } as const;
  return labels[reason];
}

/** Signed magnitude tone. Zero stays quiet so it never reads as a win. */
function gainTone(value: number | null, subdued = false) {
  if (value === null) return FAINT;
  if (subdued) return MUTED;
  if (value > 0) return "font-semibold text-[var(--green)]";
  if (value < 0) return "font-semibold text-[var(--red)]";
  return MUTED;
}

/** Where the gain was made, short enough to sit inline beside the number. */
function peakTag(peak: NonNullable<ArchiveMoverSummary["peakSession"]>) {
  if (peak === "premarket") return "PM";
  if (peak === "regular") return "RTH";
  return "AH";
}

/**
 * Path legs stay quiet — Gain carries the emphasis. A negative leg is worth seeing,
 * though: it means the move faded rather than continued.
 */
function legTone(value: number | null, subdued = false) {
  if (value === null) return FAINT;
  if (subdued) return MUTED;
  return value < 0 ? "text-[var(--red)]" : MUTED;
}

function rvolTone(value: number | null, subdued = false) {
  if (value === null) return FAINT;
  if (subdued) return MUTED;
  return value >= RVOL_STANDOUT ? "font-semibold text-[var(--foreground)]" : "";
}

/**
 * Minimum widths for the pinned identity columns. Auto table layout may still
 * settle on something else, so the Symbol column's sticky offset is measured
 * from the rendered first column rather than assumed from these.
 */
const DATE_WIDTH = 118;
const SYMBOL_WIDTH = 88;

/** Pins Symbol flush against the first column, whatever width it settles on. */
function useFirstColumnWidth() {
  const tableRef = useRef<HTMLTableElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  const measure = useCallback(() => {
    const first = tableRef.current?.querySelector('thead th[scope="col"]');
    if (first) setWidth(first.getBoundingClientRect().width);
  }, []);

  useLayoutEffect(() => {
    measure();
    const table = tableRef.current;
    if (!table || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    return () => observer.disconnect();
  }, [measure]);

  return { tableRef, width };
}

type ArchiveColumn = {
  align: "left" | "right";
  group: string;
  key: string;
  label: string;
  pinned?: boolean;
  sort?: ArchiveMoverSort;
  sticky?: number;
  width?: number;
};

function buildColumns(view: "archive" | "day", universe: ArchiveUniverse): ArchiveColumn[] {
  const identity: ArchiveColumn[] = view === "archive"
    ? [
      { align: "left", group: "Identity", key: "date", label: "Date", sort: "date", sticky: 0, width: DATE_WIDTH },
      {
        align: "left",
        group: "Identity",
        key: "symbol",
        label: "Symbol",
        pinned: true,
        sort: "symbol",
        sticky: DATE_WIDTH,
        width: SYMBOL_WIDTH,
      },
    ]
    : [{ align: "left", group: "Identity", key: "symbol", label: "Symbol", sort: "symbol", sticky: 0, width: SYMBOL_WIDTH }];

  identity.push({ align: "left", group: "Identity", key: "news", label: "News" });
  if (universe === "raw") {
    identity.push({ align: "left", group: "Identity", key: "evidence", label: "Evidence" });
  }

  const pricePath: ArchiveColumn[] = [
    { align: "right", group: "Price path", key: "previousClose", label: "Prior close", sort: "price" },
    { align: "right", group: "Price path", key: "high", label: view === "day" ? "High of day" : "High", sort: "high" },
    { align: "right", group: "Price path", key: "gain", label: "Gain", sort: "gain" },
  ];

  // Day view decomposes the peak across sessions; each is measured against the prior close,
  // so exactly one of the three equals Peak %.
  // Legs of the day's path. Each is measured from where the previous one ended, so
  // none of them restates Gain.
  const sessions: ArchiveColumn[] = view === "day"
    ? [
      { align: "right", group: "Day shape", key: "pmLeg", label: "PM" },
      { align: "right", group: "Day shape", key: "contLeg", label: "Cont." },
      { align: "right", group: "Day shape", key: "ahLeg", label: "AH" },
    ]
    : [{ align: "right", group: "Liquidity", key: "highAt", label: "High at" }];

  const liquidity: ArchiveColumn[] = [
    { align: "right", group: view === "day" ? "Liquidity" : "Liquidity", key: "rvol", label: "RVOL", sort: "rvol" },
    { align: "right", group: "Liquidity", key: "dollarVolume", label: "$ volume", sort: "dollarVolume" },
  ];
  if (view === "archive") {
    liquidity.push({ align: "right", group: "Liquidity", key: "volume", label: "Volume", sort: "volume" });
  }

  return [...identity, ...pricePath, ...sessions, ...liquidity];
}

function stickyStyle(offset: number | undefined): CSSProperties | undefined {
  return offset === undefined ? undefined : { backgroundColor: "inherit", left: offset };
}

export default function MomentumArchiveTable({
  contextLabel,
  contextMovers = [],
  direction,
  emptyHint,
  movers,
  sort,
  sortHrefs,
  universe,
  view,
}: {
  contextLabel?: string;
  contextMovers?: ArchiveMoverSummary[];
  direction: ArchiveSortDirection;
  emptyHint?: string;
  movers: ArchiveMoverSummary[];
  sort: ArchiveMoverSort;
  sortHrefs: Partial<Record<ArchiveMoverSort, string>>;
  universe: ArchiveUniverse;
  view: "archive" | "day";
}) {
  const disclosure = useInlineLedgerDisclosure<string>();
  const { tableRef, width: firstColumnWidth } = useFirstColumnWidth();
  const columns = buildColumns(view, universe);
  const symbolLeft = firstColumnWidth ?? DATE_WIDTH;
  const offsetFor = (column: ArchiveColumn) => column.pinned ? symbolLeft : column.sticky;

  const rows = [
    ...movers.map((mover) => ({ mover, subdued: false })),
    ...contextMovers.map((mover) => ({ mover, subdued: true })),
  ];
  const firstContextKey = contextMovers[0] ? `${contextMovers[0].date}:${contextMovers[0].symbol}` : null;

  if (movers.length === 0 && contextMovers.length === 0) {
    return (
      <div className="border-y border-dashed border-[var(--border)] px-6 py-14 text-center">
        <p className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-[var(--foreground)]">
          No movers match this view
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-[var(--muted)]">
          {emptyHint ?? (view === "day"
            ? "Try another date or session, or clear the symbol search."
            : "Widen the date range, lower the minimum peak, clear the RVOL floor, or switch to Raw evidence.")}
        </p>
      </div>
    );
  }

  return (
    <div className="border-y border-[var(--hairline)]">
      <div className="max-h-[76vh] overflow-auto">
        <table ref={tableRef} className={`w-full border-collapse text-left text-[13px] ${universe === "raw" ? "min-w-[1220px]" : "min-w-[1060px]"}`}>
          <thead className="font-sans text-xs tracking-normal text-[var(--muted)]">
            <tr>
              {columns.map((column, index) => {
                const active = column.sort !== undefined && sort === column.sort;
                const offset = offsetFor(column);
                const href = column.sort === undefined ? undefined : sortHrefs[column.sort];
                const label = (
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {active ? (
                      <span aria-hidden="true" className="text-[6px] leading-none text-[var(--faint)]">
                        {direction === "asc" ? "▲" : "▼"}
                      </span>
                    ) : null}
                  </span>
                );
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
                    style={{
                      ...stickyStyle(offset),
                      ...(offset === undefined ? {} : { backgroundColor: "var(--background)" }),
                      ...(column.width === undefined ? {} : { minWidth: column.width }),
                    }}
                    className={`sticky top-0 whitespace-nowrap border-b border-[var(--hairline)] bg-[var(--background)] px-3 py-3 font-semibold ${index > 0 && columns[index - 1].group !== column.group ? "border-l" : ""} ${
                      column.align === "right" ? "text-right" : "text-left"
                    } ${active ? "text-[var(--foreground)]" : ""} ${
                      offset === undefined ? "z-20" : "z-40"
                    }`}
                  >
                    {href ? (
                      <Link href={href} className="inline-flex items-center gap-1 hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
                        {label}
                      </Link>
                    ) : label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="[&>tr:last-child]:border-b-0 [&>tr:last-child>td]:border-b-0">
            {rows.map(({ mover, subdued }) => {
              const rowId = `${mover.date}:${mover.symbol}`;
              const expanded = disclosure.expandedId === rowId;
              const closing = disclosure.closingId === rowId;
              const open = expanded && !closing;
              const panelId = `archive-chart-${mover.date}-${mover.symbol.replaceAll(".", "-")}`;
              return (
                <Fragment key={rowId}>
                  {rowId === firstContextKey ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="border-y border-[var(--hairline)] bg-[var(--surface)] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--faint)]"
                      >
                        {contextLabel ?? "Below the archive threshold"}
                      </td>
                    </tr>
                  ) : null}
                  <tr
                    style={{ backgroundColor: open ? "var(--surface-2)" : "var(--background)" }}
                    className="cursor-pointer border-b border-[var(--hairline)] text-[var(--body)] transition-colors hover:bg-[var(--surface-2)]"
                    onClick={() => disclosure.toggle(rowId)}
                  >
                    {view === "archive" ? (
                      <td style={{ ...stickyStyle(0), minWidth: DATE_WIDTH }} className={`sticky z-10 whitespace-nowrap px-3 py-3 font-mono tabular-nums ${MUTED}`}>
                        {dateLabel(mover.date)}
                      </td>
                    ) : null}
                    <td
                      style={{ ...stickyStyle(view === "archive" ? symbolLeft : 0), minWidth: SYMBOL_WIDTH }}
                      className="sticky z-10 px-3 py-3"
                    >
                      <MomentumArchiveSymbol symbol={mover.symbol} name={mover.instrumentName}
                        panelId={panelId} open={open} subdued={subdued} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <MomentumArchiveNews key={rowId} symbol={mover.symbol} date={mover.date} />
                    </td>
                    {universe === "raw" ? (
                      <td className="px-3 py-3">
                        {mover.qualifiesCore ? (
                          <span className={MUTED}>Core</span>
                        ) : (
                          <div className="flex max-w-48 flex-wrap gap-1">
                            {mover.coreExclusionReasons.map((reason) => (
                              <span key={reason} className={`rounded-sm bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] ${MUTED}`}>
                                {reasonLabel(reason)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    ) : null}
                    <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${mover.previousRegularClose === null ? FAINT : ""}`}>
                      {formatPrice(mover.previousRegularClose)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${mover.evidence.high === null ? FAINT : ""}`}>
                      {formatPrice(mover.evidence.high)}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${gainTone(mover.evidence.gainPercent, subdued)}`}>
                      {formatPercent(mover.evidence.gainPercent)}
                      {mover.peakSession ? (
                        <span className={`ml-1.5 text-[10px] font-normal ${FAINT}`}>{peakTag(mover.peakSession)}</span>
                      ) : null}
                    </td>
                    {view === "day" ? (
                      <>
                        <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${legTone(mover.premarketGainPercent, subdued)}`}>
                          {formatPercent(mover.premarketGainPercent)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${legTone(mover.continuationPercent, subdued)}`}>
                          {formatPercent(mover.continuationPercent)}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${legTone(mover.afterHoursGainFromRegularClosePercent, subdued)}`}>
                          {formatPercent(mover.afterHoursGainFromRegularClosePercent)}
                        </td>
                      </>
                    ) : (
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${mover.evidence.highAt === null ? FAINT : MUTED}`}>
                        {highTime(mover.evidence.highAt)}
                      </td>
                    )}
                    <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${rvolTone(mover.evidence.rvol, subdued)}`}>
                      {mover.evidence.rvol === null ? "—" : `${mover.evidence.rvol.toFixed(1)}×`}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">${compact(mover.evidence.dollarVolume)}</td>
                    {view === "archive" ? (
                      <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{compact(mover.evidence.volume)}</td>
                    ) : null}
                  </tr>
                  {expanded ? (
                    <tr id={panelId}>
                      <td colSpan={columns.length} className="border-b border-[var(--hairline)] bg-[var(--background)] p-0">
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
      </div>
      <div className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[var(--hairline)] px-3 py-2.5 text-[11px] ${MUTED}`}>
        <span>Click any row to load its private one-minute chart.</span>
        {view === "day" ? <span>Use arrow keys ← and → to step through weekdays.</span> : null}
      </div>
    </div>
  );
}
