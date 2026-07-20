"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LightweightTradeChart from "@/components/LightweightTradeChart";
import TickerReviewWorkspace from "@/components/TickerReviewWorkspace";
import type { InlineTradeReviewData } from "@/lib/inlineTradeReview";

const LOAD_ERROR_MESSAGE = "Could not load this trade review.";

function isInlineTradeReviewData(value: unknown): value is InlineTradeReviewData {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return Array.isArray(payload.availableTags)
    && Array.isArray(payload.candles)
    && typeof payload.initialTradeId === "number"
    && Array.isArray(payload.markers)
    && typeof payload.readOnly === "boolean"
    && typeof payload.tickerNote === "string"
    && Array.isArray(payload.tickerTags)
    && Array.isArray(payload.trades);
}

function errorMessageFromPayload(value: unknown): string {
  if (!value || typeof value !== "object") return LOAD_ERROR_MESSAGE;
  const error = (value as Record<string, unknown>).error;
  return typeof error === "string" && error.trim() ? error : LOAD_ERROR_MESSAGE;
}

export default function InlineTradeReviewPanel({
  date,
  onClose,
  returnTo,
  symbol,
  tradeId,
}: {
  date: string;
  onClose: () => void;
  returnTo: string;
  symbol: string;
  tradeId: number;
}) {
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<InlineTradeReviewData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/trades/inline-review?date=${encodeURIComponent(date)}&symbol=${encodeURIComponent(symbol)}&trade=${tradeId}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const responseText = await response.text();
        let payload: unknown = null;
        if (responseText) {
          try {
            payload = JSON.parse(responseText);
          } catch {
            throw new Error(LOAD_ERROR_MESSAGE);
          }
        }

        if (!response.ok) throw new Error(errorMessageFromPayload(payload));
        if (!isInlineTradeReviewData(payload)) throw new Error(LOAD_ERROR_MESSAGE);
        setData(payload);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : LOAD_ERROR_MESSAGE);
      });

    return () => controller.abort();
  }, [attempt, date, symbol, tradeId]);

  const fullReviewHref = `/trades/review?date=${date}&symbol=${symbol}&trade=${tradeId}&returnTo=${encodeURIComponent(returnTo)}`;

  if (error) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
        <p className="text-sm text-[var(--red)]">{error}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setData(null);
              setError("");
              setAttempt((current) => current + 1);
            }}
            className="h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-2)]"
          >
            Try again
          </button>
          <Link href={fullReviewHref} className="text-sm font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
            Open full review
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid min-h-[360px] place-items-center px-6 py-8 text-sm text-[var(--muted)]">
        Loading {symbol} review…
      </div>
    );
  }

  const selectedTrade = data.trades.find((trade) => trade.id === data.initialTradeId);

  return (
    <section aria-label={`${symbol} inline trade review`} className="px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-2 flex items-center justify-between gap-4">
        <Link href={fullReviewHref} className="text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
          Open full ticker review →
        </Link>
        <button type="button" onClick={onClose} className="h-9 rounded-md px-3 text-sm font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
          Close
        </button>
      </div>

      <div className="min-w-0">
        {data.candles.length > 0 ? (
          <LightweightTradeChart
            candles={data.candles}
            chartHeightClass="h-[400px]"
            focusMinutesAfter={43}
            focusMinutesBefore={12}
            initialFocusTime={data.initialFocusTime}
            markers={data.markers}
            tradeSummaries={selectedTrade?.executionAnalysis ? [{
              tradeNumber: selectedTrade.number,
              executionAnalysis: selectedTrade.executionAnalysis,
              holdDuration: selectedTrade.holdDuration,
              shares: selectedTrade.shares,
            }] : undefined}
          />
        ) : (
          <div className="grid h-[400px] place-items-center border-y border-[var(--hairline)] px-6 text-center text-sm text-[var(--muted)]">
            {data.candleError ?? "No candle data is available for this trade yet."}
          </div>
        )}
      </div>

      <div className="mt-4 min-w-0">
        <TickerReviewWorkspace
          compact
          date={date}
          symbol={symbol}
          returnTo={returnTo}
          tickerNote={data.tickerNote}
          tickerTags={data.tickerTags}
          trades={data.trades}
          availableTags={data.availableTags}
          readOnly={data.readOnly}
          initialTradeId={data.initialTradeId}
        />
      </div>
    </section>
  );
}
