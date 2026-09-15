"use client";

import Link from "next/link";

export type TickerReviewRailRow = {
  symbol: string;
  pnl: number;
  href: string;
  noted?: boolean;
  active?: boolean;
};

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function pnlClass(value: number | null | undefined) {
  if (value == null) return "text-[var(--muted)]";
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function formatProfitFactor(value: number | null): string {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(2);
}

export default function TickerReviewRail({
  rows,
  accuracy,
  profitFactor,
  pnl,
  className = "",
  heightClassName = "h-[380px]",
}: {
  rows: TickerReviewRailRow[];
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
  className?: string;
  heightClassName?: string;
}) {
  return (
    <aside className={className}>
      <section className={`flex ${heightClassName} flex-col px-1 py-1`}>
        <div className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pt-1">
          {rows.length > 0 ? (
            rows.map((row) => (
              <Link
                key={row.symbol}
                href={row.href}
                aria-label={`${row.noted ? "Edit" : "Add"} ${row.symbol} note, ${formatMoney(row.pnl)}`}
                aria-current={row.active ? "page" : undefined}
                className={`group relative block rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] before:absolute before:-inset-x-2 before:inset-y-0 before:rounded-sm before:bg-[var(--surface)] before:opacity-0 before:transition-opacity hover:before:opacity-100 focus:before:opacity-100 ${
                  row.active ? "text-[var(--foreground)]" : ""
                }`}
              >
                <span className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto_20px] items-center gap-2 py-1.5 font-sans text-[13px]">
                  <span className={row.active ? "font-semibold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]"}>
                    {row.symbol}
                  </span>
                  <span className={`text-right tabular-nums ${pnlClass(row.pnl)}`}>{formatMoney(row.pnl)}</span>
                  <span aria-hidden="true" title={row.noted ? "Edit note" : "Add note"} className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--hairline)] text-[var(--accent)] transition-colors group-hover:border-[var(--accent)] group-hover:bg-[var(--surface-2)]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {row.noted ? <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" /></> : <path d="M12 5v14M5 12h14" />}
                    </svg>
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <div className="py-1 font-sans text-[13px] text-[var(--muted)]">No tickers</div>
          )}
        </div>
        <div className="mt-4 border-t border-[var(--hairline)] pt-3">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 font-sans text-[13px] leading-5">
            <span className="whitespace-nowrap text-[var(--muted)]">Accuracy</span>
            <span className="justify-self-end text-right tabular-nums text-[var(--foreground)]">
              {accuracy == null ? "-" : `${accuracy}%`}
            </span>
            <span className="whitespace-nowrap text-[var(--muted)]">Profit Factor</span>
            <span className="justify-self-end text-right tabular-nums text-[var(--foreground)]">
              {formatProfitFactor(profitFactor)}
            </span>
            <span className="whitespace-nowrap text-[var(--muted)]">P&L</span>
            <span className={`justify-self-end text-right tabular-nums ${pnlClass(pnl)}`}>{formatMoney(pnl)}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
