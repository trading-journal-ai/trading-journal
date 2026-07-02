"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { importCsvAction, type ImportState } from "@/app/import/actions";
import type { BrokerCsvInspection } from "@/lib/import/inspect";

export default function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const parsedRange = state?.ok && state.summary.parsedFrom && state.summary.parsedTo
    ? state.summary.parsedFrom === state.summary.parsedTo
      ? state.summary.parsedFrom
      : `${state.summary.parsedFrom} to ${state.summary.parsedTo}`
    : null;
  const insertedRange = state?.ok && state.summary.insertedFrom && state.summary.insertedTo
    ? state.summary.insertedFrom === state.summary.insertedTo
      ? state.summary.insertedFrom
      : `${state.summary.insertedFrom} to ${state.summary.insertedTo}`
    : null;
  const recapHref = state?.ok && state.summary.insertedFrom
    ? `/journal?preset=today&date=${state.summary.insertedTo ?? state.summary.insertedFrom}`
    : "/journal";
  const sourceLabel =
    state?.ok && state.summary.source === "das_csv" ? "DAS" : "ThinkorSwim";

  return (
    <div className="space-y-2">
      <form ref={formRef} action={formAction}>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={() => {
            if (inputRef.current?.files?.length) formRef.current?.requestSubmit();
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          className="cursor-pointer rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </form>

      {state?.ok === false && (
        <div className="space-y-2">
          <div className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-3 py-1.5 text-sm text-[var(--red)]">
            {state.error}
          </div>
          {state.inspection ? <ImportDiagnostics inspection={state.inspection} /> : null}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-3 py-1.5 text-sm">
          <span className="font-semibold text-[var(--green)]">
            {state.summary.inserted > 0 ? "Imported" : "No new executions"}
          </span>{" "}
          <span className="text-[var(--foreground)]">
            {sourceLabel} · {state.summary.inserted} executions · {state.summary.trades} trades
            {state.summary.duplicates > 0 && ` · ${state.summary.duplicates} dupes skipped`}
            {parsedRange && ` · parsed ${parsedRange}`}
            {insertedRange && ` · added ${insertedRange}`}
          </span>{" "}
          <span className="inline-flex gap-2">
            <Link href={recapHref} className="text-[#58a6ff] hover:underline">review day →</Link>
            <Link href="/trades" className="text-[#58a6ff] hover:underline">trades</Link>
          </span>
        </div>
      )}
    </div>
  );
}

function ImportDiagnostics({ inspection }: { inspection: BrokerCsvInspection }) {
  const formatLabel =
    inspection.format === "tos_account_statement"
      ? "ThinkorSwim statement"
      : inspection.format === "das_trade_summary"
        ? "DAS trade summary"
        : inspection.format === "app_export"
          ? "Trading Journal export"
          : "Unknown CSV";
  const rows = [
    inspection.tos.cashBalance.present
      ? `Cash balance: ${inspection.tos.cashBalance.tradeRows} trade rows (${inspection.tos.cashBalance.botRows} buys, ${inspection.tos.cashBalance.soldRows} sells)`
      : null,
    inspection.tos.cashBalance.tradeHistoryExactMatches != null
      ? `Cash ↔ trade history: ${inspection.tos.cashBalance.tradeHistoryExactMatches} exact fill matches`
      : null,
    inspection.tos.tradeHistory.present
      ? `Trade history: ${inspection.tos.tradeHistory.usableFills} usable fills from ${inspection.tos.tradeHistory.rows} rows`
      : null,
    inspection.tos.orderHistory.present
      ? `Order history: ${inspection.tos.orderHistory.usableFilledRows} usable filled rows from ${inspection.tos.orderHistory.rows} rows`
      : null,
    inspection.tos.pnl.present
      ? `P&L: ${inspection.tos.pnl.symbols} symbols${inspection.tos.pnl.netYtdPnl == null ? "" : `, YTD ${formatMoney(inspection.tos.pnl.netYtdPnl)}`}`
      : null,
    inspection.tos.equities.present
      ? `Open positions: ${inspection.tos.equities.positions}`
      : null,
    inspection.dasTradeSummary.detected
      ? `DAS rows: ${inspection.dasTradeSummary.tradeRows}`
      : null,
    inspection.appExport.detected
      ? `App-export trades: ${inspection.appExport.tradeRows}`
      : null,
  ].filter((row): row is string => row != null);

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]">
      <div className="font-semibold text-[var(--foreground)]">CSV inspection: {formatLabel}</div>
      {rows.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ul>
      ) : null}
      <div className="mt-1">{inspection.recommendation}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
