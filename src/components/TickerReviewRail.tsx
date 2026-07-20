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
}: {
  rows: TickerReviewRailRow[];
  accuracy: number | null;
  profitFactor: number | null;
  pnl: number;
  className?: string;
}) {
  return (
    <aside className={className}>
      <section className="flex h-[380px] flex-col px-1 py-1">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 pt-1">
          {rows.length > 0 ? (
            rows.map((row) => (
              <Link
                key={row.symbol}
                href={row.href}
                aria-label={`${row.noted ? "Edit" : "Add"} ${row.symbol} note, ${formatMoney(row.pnl)}`}
                aria-current={row.active ? "page" : undefined}
                className={`group relative block rounded-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)] before:absolute before:inset-x-0 before:inset-y-0 before:rounded-sm before:bg-[var(--surface)] before:opacity-0 before:transition-opacity hover:before:opacity-100 focus:before:opacity-100 ${
                  row.active ? "text-[var(--foreground)]" : ""
                }`}
              >
                <span className="relative z-10 grid grid-cols-[42px_1fr_auto] items-baseline gap-2 px-3 py-1.5 font-mono text-[13px]">
                  <span className={row.active ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"}>
                    {row.symbol}
                  </span>
                  <span className={`text-right tabular-nums ${pnlClass(row.pnl)}`}>{formatMoney(row.pnl)}</span>
                  <span className="font-sans text-[11px] font-semibold text-[var(--accent)] opacity-80 transition-opacity group-hover:opacity-100">
                    {row.noted ? "Edit note" : "Add note"}
                  </span>
                </span>
              </Link>
            ))
          ) : (
            <div className="py-1 font-mono text-[13px] text-[var(--muted)]">No tickers</div>
          )}
        </div>
        <div className="mt-4 border-t border-[var(--hairline)] pt-3">
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 font-mono text-[13px] leading-5">
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
