"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { ChartCandle } from "@/components/TradeChart";
import type { ArchiveMoverSummary } from "@/lib/marketArchive";

const LightweightTradeChart = dynamic(() => import("@/components/LightweightTradeChart"), {
  ssr: false,
  loading: () => <ChartLoading />,
});

type CandleResponse = {
  candles?: ChartCandle[];
  error?: string;
};

const fullDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function ChartLoading() {
  return (
    <div className="grid h-[440px] place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading one-minute archive…
    </div>
  );
}

function dateLabel(date: string) {
  return fullDate.format(new Date(`${date}T00:00:00Z`));
}

export default function MomentumArchiveChartPanel({
  mover,
  onClose,
}: {
  mover: ArchiveMoverSummary;
  onClose: () => void;
}) {
  const [candles, setCandles] = useState<ChartCandle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({ date: mover.date, symbol: mover.symbol });
    fetch(`/api/analytics/momentum-archive/candles?${parameters}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as CandleResponse;
        if (!response.ok) throw new Error(payload.error || "Could not load this archived chart.");
        setCandles(payload.candles ?? []);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Could not load this archived chart.");
      });
    return () => controller.abort();
  }, [mover.date, mover.symbol]);

  const focusTime = mover.lens.highAt ? Math.floor(new Date(mover.lens.highAt).getTime() / 1000) : undefined;

  return (
    <section className="px-5 py-6 sm:px-7" aria-label={`${mover.symbol} chart for ${mover.date}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{mover.symbol}</h3>
            <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
              {mover.instrumentType ?? "Unknown type"}
            </span>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)]">
              1m · 4:00–20:00 ET
            </span>
          </div>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {mover.instrumentName ?? "Instrument name unavailable"} · {dateLabel(mover.date)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Close chart
        </button>
      </div>

      {error ? (
        <div className="grid min-h-52 place-items-center rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 text-center text-sm text-[var(--muted)]">
          {error}
        </div>
      ) : candles === null ? (
        <ChartLoading />
      ) : (
        <LightweightTradeChart
          candles={candles}
          chartHeightClass="h-[440px]"
          enableFullscreen
          focusMinutesAfter={90}
          focusMinutesBefore={90}
          initialFocusTime={focusTime}
          markers={[]}
        />
      )}
    </section>
  );
}
