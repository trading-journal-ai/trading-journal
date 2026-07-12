"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { importCsvAction, type ImportState } from "@/app/import/actions";
import type { BrokerCsvInspection } from "@/lib/import/inspect";

type SelectedFile = {
  name: string;
  size: number;
};

export default function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null,
  );
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const visibleState = dismissedResult ? null : state;
  const parsedRange = visibleState?.ok && visibleState.summary.parsedFrom && visibleState.summary.parsedTo
    ? visibleState.summary.parsedFrom === visibleState.summary.parsedTo
      ? visibleState.summary.parsedFrom
      : `${visibleState.summary.parsedFrom} to ${visibleState.summary.parsedTo}`
    : null;
  const insertedRange = visibleState?.ok && visibleState.summary.insertedFrom && visibleState.summary.insertedTo
    ? visibleState.summary.insertedFrom === visibleState.summary.insertedTo
      ? visibleState.summary.insertedFrom
      : `${visibleState.summary.insertedFrom} to ${visibleState.summary.insertedTo}`
    : null;
  const recapDate = visibleState?.ok
    ? visibleState.summary.insertedTo
      ?? visibleState.summary.insertedFrom
      ?? visibleState.summary.parsedTo
      ?? visibleState.summary.parsedFrom
    : null;
  const recapHref = recapDate
    ? `/journal?preset=today&date=${recapDate}`
    : "/journal";
  const sourceLabel =
    visibleState?.ok && visibleState.summary.source === "das_csv" ? "DAS" : "ThinkorSwim";
  const confidenceLabel = visibleState?.ok ? confidenceCopy(visibleState.summary.sourceConfidence) : null;

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state]);

  function closeModal() {
    if (pending) return;
    setIsOpen(false);
    setDismissedResult(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setDismissedResult(true);
        }}
        disabled={pending}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Importing..." : "Import"}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-dialog-title"
            className="w-full max-w-[620px] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-6 border-b border-[var(--hairline)] px-6 py-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Broker Import
                </p>
                <h2 id="import-dialog-title" className="mt-2 text-xl font-semibold tracking-tight">
                  Bring trades into the journal
                </h2>
                <p className="mt-2 max-w-[520px] text-sm leading-6 text-[var(--body)]">
                  Upload a CSV file. The app inspects the broker format, rebuilds trades
                  from fills, skips duplicates, and refreshes your review pages.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                aria-label="Close import dialog"
                className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-[var(--border)] text-lg leading-none text-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ×
              </button>
            </div>

            <form ref={formRef} action={formAction} className="px-6 py-5">
              <input
                ref={inputRef}
                type="file"
                name="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={() => {
                  const file = inputRef.current?.files?.[0];
                  if (!file) return;
                  setSelectedFile({ name: file.name, size: file.size });
                  setDismissedResult(false);
                  formRef.current?.requestSubmit();
                }}
              />

              {pending ? (
                <ImportProgress file={selectedFile} />
              ) : visibleState?.ok ? (
                <ImportSuccessSummary
                  state={visibleState}
                  sourceLabel={sourceLabel}
                  confidenceLabel={confidenceLabel}
                  parsedRange={parsedRange}
                  insertedRange={insertedRange}
                  recapHref={recapHref}
                  onReviewClick={closeModal}
                />
              ) : visibleState?.ok === false ? (
                <ImportErrorSummary state={visibleState} onChooseFile={() => inputRef.current?.click()} />
              ) : (
                <ImportReadyState onChooseFile={() => inputRef.current?.click()} />
              )}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ImportReadyState({ onChooseFile }: { onChooseFile: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onChooseFile}
        className="group flex min-h-[220px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)]/40 px-6 text-center transition hover:border-[var(--accent)]/70 hover:bg-[var(--panel)]/70"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-xl text-[var(--accent)] transition group-hover:scale-105">
          ↑
        </span>
        <span className="mt-4 text-sm font-semibold text-[var(--foreground)]">
          Choose a broker CSV
        </span>
        <span className="mt-2 max-w-[360px] text-sm leading-6 text-[var(--muted)]">
          ThinkorSwim/Schwab exports are reconstructed from fill history. DAS and
          TraderVue-style summaries are normalized into the same trade contract.
        </span>
      </button>
    </div>
  );
}

function ImportProgress({ file }: { file: SelectedFile | null }) {
  const steps = [
    "Reading the file and finding the date range",
    "Rebuilding entries, exits, and open trades",
    "Saving new executions and refreshing the journal",
  ];
  const estimate = importTimeEstimate(file?.size ?? 0);

  return (
    <div className="space-y-6 py-2">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold">Importing trades...</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {file ? `${file.name} · ${formatFileSize(file.size)}` : "The selected file is being parsed."}
            </div>
          </div>
          <div className="rounded-md border border-[var(--hairline)] px-3 py-2 text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Estimate
            </div>
            <div className="mt-1 font-mono text-sm text-[var(--foreground)]">{estimate}</div>
          </div>
        </div>

        <div className="import-progress-track mt-5">
          <div className="import-progress-bar" />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
          <span>Parsing</span>
          <span>Normalizing</span>
          <span>Saving</span>
        </div>
      </div>

      <div className="rounded-md border border-[var(--hairline)] px-4 py-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Working on
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--body)]">
          {steps.map((step) => (
            <li key={step} className="flex gap-3">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        Larger multi-month statements take longer than a single trading day. The next screen
        will show the exact date coverage found in the file.
      </p>
    </div>
  );
}
function ImportSuccessSummary({
  state,
  sourceLabel,
  confidenceLabel,
  parsedRange,
  insertedRange,
  recapHref,
  onReviewClick,
}: {
  state: Extract<ImportState, { ok: true }>;
  sourceLabel: string;
  confidenceLabel: string | null;
  parsedRange: string | null;
  insertedRange: string | null;
  recapHref: string;
  onReviewClick: () => void;
}) {
  const summary = state.summary;
  const stats = [
    { label: "Trades found", value: summary.normalizedTrades.toLocaleString("en-US") },
    { label: "Executions added", value: summary.inserted.toLocaleString("en-US") },
    { label: "Confidence", value: confidenceLabel ?? "unknown" },
    { label: "Open", value: summary.openTrades.toLocaleString("en-US") },
  ];
  const importTitle = summary.inserted > 0 ? "Import complete" : "No new executions";
  const dateHeadline = importDateHeadline(summary.parsedFrom, summary.parsedTo);
  const coverage = importCoverageCopy(summary.normalizedTrades, summary.parsedFrom, summary.parsedTo);
  const insertedCoverage = importInsertedCopy(summary.inserted, summary.insertedFrom, summary.insertedTo);
  const dataCoverage = dataCoverageCopy(parsedRange, insertedRange);

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-4 py-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--green)]">
          {importTitle}
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          {dateHeadline}
        </div>
        <div className="mt-2 text-sm leading-6 text-[var(--body)]">
          {coverage}
        </div>
        <div className="mt-1 text-xs text-[var(--muted)]">
          {sourceLabel}
          {insertedCoverage ? ` · ${insertedCoverage}` : ""}
          {summary.duplicates > 0 ? ` · ${summary.duplicates} dupes skipped` : ""}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-[var(--hairline)] px-3 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {stat.label}
            </div>
            <div className="mt-1 font-mono text-base tabular-nums text-[var(--foreground)]">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {dataCoverage ? (
        <div className="rounded-md border border-[var(--hairline)] px-3 py-3 text-sm leading-6 text-[var(--body)]">
          <span className="font-medium text-[var(--foreground)]">Data coverage:</span>
          {" "}
          {dataCoverage}
        </div>
      ) : null}

      {summary.normalizedTrades !== summary.trades ? (
        <div className="rounded-md border border-[var(--hairline)] px-3 py-2 text-sm text-[var(--muted)]">
          {summary.normalizedTrades.toLocaleString("en-US")} normalized trade records were
          created before persistence.
        </div>
      ) : null}

      {summary.warnings.length > 0 ? (
        <div className="rounded-md border border-[var(--hairline)] px-3 py-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Import notes
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--muted)]">
            {summary.warnings.slice(0, 5).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-[var(--hairline)] pt-4">
        <Link
          href={recapHref}
          onClick={onReviewClick}
          className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Open journal review
        </Link>
      </div>
    </div>
  );
}

function ImportErrorSummary({
  state,
  onChooseFile,
}: {
  state: Extract<ImportState, { ok: false }>;
  onChooseFile: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3">
        <div className="font-semibold text-[var(--red)]">Import failed</div>
        <div className="mt-1 text-sm leading-6 text-[var(--body)]">{state.error}</div>
      </div>
      {state.inspection ? <ImportDiagnostics inspection={state.inspection} /> : null}
      <div className="flex justify-end border-t border-[var(--hairline)] pt-4">
        <button
          type="button"
          onClick={onChooseFile}
          className="cursor-pointer rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Choose another CSV
        </button>
      </div>
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

function formatFileSize(bytes: number) {
  if (bytes <= 0) return "size unknown";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("en-US")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function importTimeEstimate(bytes: number) {
  if (bytes <= 0) return "a moment";
  if (bytes < 300_000) return "5-10 sec";
  if (bytes < 2_500_000) return "10-30 sec";
  if (bytes < 8_000_000) return "30-60 sec";
  return "1-2 min";
}

function importDateHeadline(from: string | null, to: string | null) {
  if (!from || !to) return "Date range detected";
  if (from === to) return formatImportDate(from);
  return `${formatImportDate(from)} - ${formatImportDate(to)}`;
}

function importCoverageCopy(trades: number, from: string | null, to: string | null) {
  const tradeCopy = `${trades.toLocaleString("en-US")} reconstructed ${trades === 1 ? "trade" : "trades"}`;
  if (!from || !to) return `Found ${tradeCopy}.`;
  if (from === to) return `Found ${tradeCopy} for this trading day.`;
  return `Found ${tradeCopy} across this date range.`;
}

function importInsertedCopy(inserted: number, from: string | null, to: string | null) {
  if (inserted === 0) return "all executions were already imported";
  const executionCopy = `${inserted.toLocaleString("en-US")} new ${inserted === 1 ? "execution" : "executions"}`;
  if (!from || !to) return `${executionCopy} added`;
  if (from === to) return `${executionCopy} added for ${formatImportDate(from)}`;
  return `${executionCopy} added from ${formatImportDate(from)} to ${formatImportDate(to)}`;
}

function dataCoverageCopy(parsedRange: string | null, insertedRange: string | null) {
  if (parsedRange && insertedRange) {
    return `broker file covers ${parsedRange}; newly added data covers ${insertedRange}.`;
  }
  if (parsedRange) return `broker file covers ${parsedRange}.`;
  if (insertedRange) return `newly added data covers ${insertedRange}.`;
  return null;
}

function formatImportDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function confidenceCopy(value: "high" | "medium" | "low" | "statement_only") {
  if (value === "high") return "high confidence";
  if (value === "medium") return "medium confidence";
  if (value === "low") return "low confidence";
  return "statement only";
}
