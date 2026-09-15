"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import CandleDataNotice from "@/components/CandleDataNotice";
import LightweightTradeChart, { type LightweightTradeChartProps } from "@/components/LightweightTradeChart";
import type { CandleDataStatus } from "@/lib/candles";
import { missingExecutionMinutes } from "@/lib/candleIntegrity";
import { MAX_CHART_CSV_BYTES, parseChartCsv } from "@/lib/candles/chartCsv";
import { readTemporaryChart, subscribeTemporaryChart, temporaryChartKey, writeTemporaryChart } from "@/lib/candles/temporaryChartStorage";
import { etDateString } from "@/lib/time";

const buttonClass = "min-h-10 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-wait disabled:opacity-50";
const serverSnapshot = () => null;

type Props = LightweightTradeChartProps & {
  accountId: number;
  symbol: string;
  date: string;
  status: CandleDataStatus;
  detail?: string;
  hasFallback: boolean;
  readOnly: boolean;
  onRefresh?: () => void | Promise<void>;
};

export default function ReviewChart(props: Props) {
  // A new account/ticker/date must never inherit an in-flight upload or form state.
  return <ScopedReviewChart key={temporaryChartKey(props.accountId, props.symbol, props.date)} {...props} />;
}

function ScopedReviewChart({ accountId, symbol, date, status, detail, hasFallback, readOnly, onRefresh, ...chart }: Props) {
  const router = useRouter();
  const key = temporaryChartKey(accountId, symbol, date);
  const csv = useSyncExternalStore(subscribeTemporaryChart, () => readTemporaryChart(key), serverSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [candidate, setCandidate] = useState<{ csv: string; count: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [reading, setReading] = useState(false);
  const [, startRefresh] = useTransition();
  const selection = useRef(0);
  const inputId = useId();
  const temporary = useMemo(() => {
    if (!csv || readOnly || status === "market") return null;
    try { return parseChartCsv(csv, symbol, date); } catch { return null; }
  }, [csv, date, readOnly, status, symbol]);
  const executionTimes = chart.markers.map((marker) => marker.t).filter((t) => etDateString(t) === date);
  const missing = temporary ? missingExecutionMinutes(temporary, executionTimes) : [];
  const indicatorsEnabled = status === "market" || (temporary !== null && missing.length === 0);

  const refresh = useCallback(() => {
    startRefresh(async () => {
      try {
        if (onRefresh) await onRefresh();
        else router.refresh();
        setRefreshError("");
      } catch {
        setRefreshError("Massive is still unavailable. Your current chart is safe; we’ll check again automatically.");
      }
    });
  }, [onRefresh, router]);

  useEffect(() => {
    if (status === "market" && csv) {
      try { writeTemporaryChart(key, null); } catch { /* Provider data still takes precedence. */ }
    }
  }, [csv, key, status]);

  useEffect(() => {
    if (readOnly || status === "market") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, 5 * 60_000);
    return () => window.clearInterval(timer);
  }, [readOnly, refresh, status]);

  async function chooseFile(file: File | undefined) {
    const current = ++selection.current;
    setCandidate(null);
    setConfirmed(false);
    setError("");
    if (!file) return;
    setReading(true);
    try {
      if (file.size > MAX_CHART_CSV_BYTES) throw new Error("Choose a chart CSV smaller than 5 MB.");
      const contents = await file.text();
      const candles = parseChartCsv(contents, symbol, date);
      if (current === selection.current) setCandidate({ csv: contents, count: candles.length });
    } catch (cause) {
      if (current === selection.current) setError(cause instanceof Error ? cause.message : "Unable to read this CSV. Try exporting it again.");
    } finally {
      if (current === selection.current) setReading(false);
    }
  }

  function applyUpload() {
    if (!candidate || !confirmed) return;
    try {
      writeTemporaryChart(key, candidate.csv);
      setExpanded(false);
      setCandidate(null);
      setError("");
    } catch {
      setError("Browser storage is unavailable or full. Enable storage for this site and try again.");
    }
  }

  return (
    <>
      {status !== "market" ? (
        <div className="mb-4">
          {temporary ? (
            <div role="status" className="space-y-1 text-sm text-[var(--body)]">
              <p className="font-semibold text-[var(--foreground)]">Temporary chart data · {symbol}</p>
              <p>Saved in this tab for {date}. We check Massive every five minutes and replace this upload when complete data is available.</p>
              <p className="text-xs text-[var(--muted)]">
                {missing.length ? `${missing.length} execution minutes are outside this upload. Export a wider range; indicators remain paused.`
                  : "Indicators use the uploaded bars; their values depend on the exported range."}
                {" "}Market-structure coaching still waits for Massive.
              </p>
            </div>
          ) : <CandleDataNotice detail={detail} hasFallback={hasFallback} status={status} />}
          {!readOnly ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" className={buttonClass} aria-expanded={expanded} aria-controls={`${inputId}-form`}
                onClick={() => setExpanded((value) => !value)}>
                {temporary ? "Replace Chart Data" : "Upload Chart Data"}
              </button>
              {temporary ? <button type="button" className="min-h-10 text-sm text-[var(--muted)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                onClick={() => { try { writeTemporaryChart(key, null); } catch { setError("Unable to clear browser storage."); } }}>Remove upload</button> : null}
            </div>
          ) : null}
          {expanded && !readOnly ? (
            <div id={`${inputId}-form`} className="mt-4 max-w-2xl space-y-3 border-t border-[var(--hairline)] pt-4">
              <p id={`${inputId}-help`} className="text-sm leading-6 text-[var(--body)]">
                In TradingView, open {symbol} at the <strong>1-minute</strong> interval, load {date} including the lead-in to your trades, then choose <strong>Download chart data</strong>. Export with Unix or timezone-inclusive timestamps and volume.
              </p>
              <label htmlFor={inputId} className="block text-sm font-semibold">TradingView chart CSV</label>
              <input id={inputId} type="file" accept=".csv,text/csv" aria-describedby={`${inputId}-help`} className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--surface)] file:px-3 file:py-2 file:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                onChange={(event) => void chooseFile(event.target.files?.[0])} />
              {reading ? <p role="status" className="text-sm text-[var(--muted)]">Reading chart data…</p> : null}
              {candidate ? <>
                <p className="text-sm text-[var(--body)]">{candidate.count.toLocaleString()} bars for {date} (Eastern Time).</p>
                <label className="flex min-h-10 items-center gap-2 text-sm text-[var(--body)]">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                  This file is from {symbol}’s 1-minute candlestick chart.
                </label>
                <button type="button" className={buttonClass} disabled={!confirmed || reading} onClick={applyUpload}>Use for {symbol}</button>
              </> : null}
              <p className="text-xs text-[var(--muted)]">Temporary in this browser tab. Trade records and notes stay unchanged.</p>
            </div>
          ) : null}
          {refreshError ? <p role="alert" className="mt-3 text-sm text-[var(--red)]">{refreshError}</p> : null}
          {error ? <p role="alert" className="mt-3 text-sm text-[var(--red)]">{error}</p> : null}
        </div>
      ) : null}
      <LightweightTradeChart {...chart} candles={temporary ?? chart.candles}
        indicatorsEnabled={indicatorsEnabled} volumeEnabled={temporary !== null || !hasFallback}
        excursionsEnabled={status === "market" && chart.excursionsEnabled !== false} />
    </>
  );
}
