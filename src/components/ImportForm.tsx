"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { importCsvAction, type ImportState } from "@/app/import/actions";
import {
  authorizeSchwabAction,
  getSchwabConnectionAction,
  importSchwabExecutionsAction,
  previewSchwabImportAction,
} from "@/app/import/schwab-actions";
import Eyebrow from "@/components/ui/Eyebrow";
import PeriodTabs, { type PeriodTabItem } from "@/components/ui/PeriodTabs";
import type { BrokerCsvInspection } from "@/lib/import/inspect";
import type {
  SchwabConnectionState,
  SchwabImportActionResult,
  SchwabImportPreview,
  SchwabPreviewActionResult,
} from "@/lib/schwab/types";
import { schwabPreviewPresentation } from "@/lib/schwab/previewPresentation";

type SelectedFile = {
  name: string;
  size: number;
};

type ImportMethod = "schwab" | "file";
type SchwabConnectionUiState = { status: "idle" } | SchwabConnectionState;

const IMPORT_METHODS: PeriodTabItem[] = [
  { value: "schwab", label: "Sync from Schwab" },
  { value: "file", label: "Upload a file" },
];

const SCHWAB_DATE_PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
];

export default function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importCsvAction,
    null,
  );
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedResult, setDismissedResult] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [method, setMethod] = useState<ImportMethod>("schwab");
  const [schwabConnection, setSchwabConnection] =
    useState<SchwabConnectionUiState>({ status: "idle" });
  const [checkingSchwab, startCheckingSchwab] = useTransition();
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
    ? `/journal?date=${recapDate}`
    : "/journal";
  const sourceLabel =
    visibleState?.ok && visibleState.summary.source === "das_csv" ? "DAS" : "ThinkorSwim";
  const confidenceLabel = visibleState?.ok ? confidenceCopy(visibleState.summary.sourceConfidence) : null;

  useEffect(() => {
    if (!state?.ok) return;
    if (recapDate) {
      router.push(recapHref);
      return;
    }
    router.refresh();
  }, [recapDate, recapHref, router, state]);

  function closeModal() {
    if (pending) return;
    setIsOpen(false);
    setDismissedResult(true);
  }

  function chooseFile() {
    const input = inputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  }

  function refreshSchwabConnection() {
    startCheckingSchwab(async () => {
      try {
        setSchwabConnection(await getSchwabConnectionAction());
      } catch {
        setSchwabConnection({
          status: "unavailable",
          error: "The Journal could not check the Schwab connection. Retry or use file import.",
        });
      }
    });
  }

  function changeMethod(value: string) {
    if (value !== "schwab" && value !== "file") return;
    setMethod(value);
    setDismissedResult(true);
    setSelectedFile(null);
    if (value === "schwab") refreshSchwabConnection();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMethod("schwab");
          setIsOpen(true);
          setDismissedResult(true);
          refreshSchwabConnection();
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
            aria-describedby="import-dialog-description"
            className="max-h-[calc(100vh-3rem)] w-full max-w-[680px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-6 border-b border-[var(--hairline)] px-6 py-5">
              <div>
                <Eyebrow>Broker import</Eyebrow>
                <h2 id="import-dialog-title" className="mt-2 text-xl font-semibold tracking-tight">
                  Bring trades into the journal
                </h2>
                <p
                  id="import-dialog-description"
                  className="mt-2 max-w-[540px] text-sm leading-6 text-[var(--body)]"
                >
                  Sync a recent date range from Schwab or upload a broker file. Both paths
                  rebuild trades from fills, skip duplicates, and preserve the journal
                  notes you have already added.
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
                <ImportErrorSummary state={visibleState} onChooseFile={chooseFile} />
              ) : (
                <div>
                  <div className="border-b border-[var(--hairline)]">
                    <PeriodTabs
                      ariaLabel="Import method"
                      items={IMPORT_METHODS}
                      value={method}
                      onChange={changeMethod}
                      className="-mb-px"
                    />
                  </div>

                  {method === "schwab" ? (
                    <SchwabImportReadyState
                      connection={schwabConnection}
                      checking={checkingSchwab}
                      onConnectionChange={setSchwabConnection}
                      onRetry={refreshSchwabConnection}
                      onUseFile={() => changeMethod("file")}
                    />
                  ) : (
                    <FileImportReadyState onChooseFile={chooseFile} />
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SchwabImportReadyState({
  connection,
  checking,
  onConnectionChange,
  onRetry,
  onUseFile,
}: {
  connection: SchwabConnectionUiState;
  checking: boolean;
  onConnectionChange: (connection: SchwabConnectionState) => void;
  onRetry: () => void;
  onUseFile: () => void;
}) {
  const [dateRange, setDateRange] = useState(initialSchwabDateRange);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [previewResult, setPreviewResult] =
    useState<SchwabPreviewActionResult | null>(null);
  const [importResult, setImportResult] =
    useState<SchwabImportActionResult | null>(null);
  const [previewing, startPreview] = useTransition();
  const [importing, startImport] = useTransition();
  const [authorizing, startAuthorization] = useTransition();
  const limits = schwabDateLimits();
  const dateError = schwabDateRangeError(dateRange.from, dateRange.to, limits);
  const connected = connection.status === "connected";
  const selectedAccountValue = connected
    ? connection.accounts.some((account) => account.value === selectedAccount)
      ? selectedAccount
      : connection.accounts[0]?.value ?? ""
    : "";

  function applyLookback(days: number) {
    setDateRange(schwabLookbackRange(days));
    setPreviewResult(null);
    setImportResult(null);
  }

  function updateDate(field: "from" | "to", value: string) {
    setDateRange((current) => ({ ...current, [field]: value }));
    setPreviewResult(null);
    setImportResult(null);
  }

  function requestPreview() {
    if (!connected || !selectedAccountValue || dateError) return;
    startPreview(async () => {
      try {
        setImportResult(null);
        setPreviewResult(await previewSchwabImportAction({
          accountSelection: selectedAccountValue,
          from: dateRange.from,
          to: dateRange.to,
        }));
      } catch {
        setPreviewResult({
          ok: false,
          kind: "unavailable",
          error: "The Journal could not build the Schwab preview. No data was changed.",
        });
      }
    });
  }

  function confirmImport() {
    if (
      !connected
      || !selectedAccountValue
      || dateError
      || !previewResult?.ok
      || previewResult.preview.newExecutions === 0
    ) {
      return;
    }
    startImport(async () => {
      try {
        setImportResult(await importSchwabExecutionsAction({
          accountSelection: selectedAccountValue,
          from: dateRange.from,
          to: dateRange.to,
        }));
      } catch {
        setImportResult({
          ok: false,
          kind: "unavailable",
          error: "The Journal could not complete the Schwab import. No partial data was saved.",
        });
      }
    });
  }

  function authorizeSchwab() {
    startAuthorization(async () => {
      setPreviewResult(null);
      setImportResult(null);
      try {
        onConnectionChange(await authorizeSchwabAction());
      } catch {
        onConnectionChange({
          status: "unavailable",
          error: "Schwab authorization did not finish. Try again and complete the Schwab window that opens in your browser.",
        });
      }
    });
  }

  return (
    <div className="space-y-6 pt-6">
      <SchwabConnectionSummary
        connection={connection}
        checking={checking}
        authorizing={authorizing}
        onAuthorize={authorizeSchwab}
        onRetry={onRetry}
      />

      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-[13px] font-semibold text-[var(--body)]">Schwab account</span>
          <select
            key={
              connected
                ? connection.accounts.map((account) => account.value).join(":")
                : connection.status
            }
            disabled={!connected || checking || authorizing}
            value={selectedAccountValue}
            onChange={(event) => {
              setSelectedAccount(event.target.value);
              setPreviewResult(null);
              setImportResult(null);
            }}
            aria-describedby="schwab-account-help"
            className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--faint)]"
          >
            {connected ? (
              connection.accounts.map((account) => (
                <option key={account.value} value={account.value}>
                  {account.label}
                </option>
              ))
            ) : (
              <option value="">
                {checking ? "Checking authorized accounts…" : "Connect Schwab to load accounts"}
              </option>
            )}
          </select>
          <span id="schwab-account-help" className="block text-xs leading-5 text-[var(--muted)]">
            Account numbers are masked. The selection is verified again on the server
            before any broker history is requested.
          </span>
        </label>

        <fieldset className="space-y-3">
          <legend className="text-[13px] font-semibold text-[var(--body)]">Trade dates</legend>
          <div className="flex flex-wrap gap-2">
            {SCHWAB_DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                type="button"
                onClick={() => applyLookback(preset.days)}
                className="h-9 cursor-pointer rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">From</span>
              <input
                type="date"
                value={dateRange.from}
                min={limits.min}
                max={limits.max}
                onChange={(event) => updateDate("from", event.target.value)}
                className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-semibold text-[var(--muted)]">To</span>
              <input
                type="date"
                value={dateRange.to}
                min={limits.min}
                max={limits.max}
                onChange={(event) => updateDate("to", event.target.value)}
                className="h-11 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>

          {dateError ? (
            <p role="alert" className="text-xs leading-5 text-[var(--red)]">
              {dateError}
            </p>
          ) : (
            <p className="text-xs leading-5 text-[var(--muted)]">
              The first sync version is limited to the most recent 60 days. Use a
              statement file for older history.
            </p>
          )}
        </fieldset>
      </div>

      {connected && previewResult ? (
        <SchwabPreviewResult
          result={previewResult}
          authorizing={authorizing}
          onAuthorize={authorizeSchwab}
        />
      ) : null}

      {connected && importResult ? (
        <SchwabImportResult
          result={importResult}
          authorizing={authorizing}
          onAuthorize={authorizeSchwab}
        />
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-[var(--hairline)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onUseFile}
          className="cursor-pointer text-left text-sm font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Upload a file instead
        </button>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={requestPreview}
              disabled={
                !connected
                || checking
                || authorizing
                || previewing
                || importing
                || Boolean(dateError)
                || !selectedAccountValue
              }
              className="h-10 cursor-pointer rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--body)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {previewing
                ? "Building preview…"
                : connected
                  ? previewResult?.ok
                    ? "Refresh preview"
                    : "Preview trades"
                  : "Connect Schwab to preview"}
            </button>
            {previewResult?.ok
            && previewResult.preview.newExecutions > 0
            && importResult == null ? (
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing}
                className="h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {importing
                  ? "Importing…"
                  : `Import ${previewResult.preview.newExecutions.toLocaleString("en-US")} new ${previewResult.preview.newExecutions === 1 ? "execution" : "executions"}`}
              </button>
            ) : null}
          </div>
          {previewResult?.ok
          && previewResult.preview.newExecutions > 0
          && importResult == null ? (
            <p className="text-right text-[11px] leading-5 text-[var(--muted)]">
              Append only. Existing journal data will not be deleted.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SchwabPreviewResult({
  result,
  authorizing,
  onAuthorize,
}: {
  result: SchwabPreviewActionResult;
  authorizing: boolean;
  onAuthorize: () => void;
}) {
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3"
      >
        <div className="font-semibold text-[var(--red)]">Preview unavailable</div>
        <p className="mt-1 text-sm leading-6 text-[var(--body)]">{result.error}</p>
        {result.kind === "reauth_required" ? (
          <button
            type="button"
            onClick={onAuthorize}
            disabled={authorizing}
            className="mt-3 h-9 cursor-pointer rounded-md bg-[var(--action)] px-3 text-xs font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {authorizing ? "Waiting for Schwab…" : "Authorize Schwab"}
          </button>
        ) : null}
      </div>
    );
  }

  const presentation = schwabPreviewPresentation(result.preview);
  if (presentation === "no_trades") {
    return (
      <SchwabNoChangesSummary
        preview={result.preview}
        kind="no_trades"
      />
    );
  }

  if (presentation === "already_imported") {
    return (
      <SchwabNoChangesSummary
        preview={result.preview}
        kind="already_imported"
      />
    );
  }

  if (presentation === "needs_review") {
    return (
      <SchwabNoChangesSummary
        preview={result.preview}
        kind="needs_review"
      />
    );
  }

  return <SchwabPreviewSummary preview={result.preview} />;
}

function SchwabNoChangesSummary({
  preview,
  kind,
}: {
  preview: SchwabImportPreview;
  kind: "already_imported" | "needs_review" | "no_trades";
}) {
  const alreadyImported = kind === "already_imported";
  const needsReview = kind === "needs_review";
  const dateLabel = preview.from === preview.to
    ? formatImportDate(preview.from)
    : `${formatImportDate(preview.from)} – ${formatImportDate(preview.to)}`;
  const journalHref = `/journal?date=${preview.to}`;

  return (
    <div
      className={`rounded-md border px-4 py-4 ${
        needsReview
          ? "border-[var(--accent)]/40 bg-[var(--accent)]/5"
          : "border-[var(--green)]/40 bg-[var(--green)]/10"
      }`}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${
            needsReview ? "text-[var(--accent)]" : "text-[var(--green)]"
          }`}>
            {needsReview
              ? "Nothing new to import"
              : alreadyImported
                ? "Already imported"
                : "No trades found"}
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {needsReview
              ? "Your Journal is unchanged"
              : alreadyImported
                ? `Nothing new for ${dateLabel}`
                : dateLabel}
          </h3>
        </div>
        <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
          needsReview
            ? "border-[var(--accent)]/45 text-[var(--accent)]"
            : "border-[var(--green)]/45 text-[var(--green)]"
        }`}>
          {needsReview
            ? "Skipped safely"
            : alreadyImported
              ? "Up to date"
              : "Nothing to import"}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--body)]">
        {needsReview
          ? `Everything that could be matched safely is already in ${preview.journalAccountLabel}. Schwab returned ${preview.reviewExecutions.toLocaleString("en-US")} unmatched ${preview.reviewExecutions === 1 ? "fill" : "fills"} for ${preview.reviewSymbols.join(", ")} that may belong to an existing trade, so ${preview.reviewExecutions === 1 ? "it was" : "they were"} skipped.`
          : alreadyImported
          ? `All ${preview.duplicateExecutions.toLocaleString("en-US")} Schwab executions in this range are already in ${preview.journalAccountLabel}. Nothing was added or changed, including your journal notes.`
          : "Schwab did not return any equity executions for this date range. Nothing was added or changed."}
      </p>

      {needsReview ? (
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          Review {preview.reviewSymbols.join(", ")} in the Journal. If the trade
          looks incomplete, upload a statement containing its full opening and
          closing fills. This sync will not overwrite the existing trade or notes.
        </p>
      ) : null}

      <div className={`mt-4 flex justify-end border-t pt-3 ${
        needsReview ? "border-[var(--accent)]/20" : "border-[var(--green)]/25"
      }`}>
        <Link
          href={journalHref}
          className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Open journal
        </Link>
      </div>
    </div>
  );
}

function SchwabPreviewSummary({ preview }: { preview: SchwabImportPreview }) {
  const stats = [
    { label: "Executions found", value: preview.executionsFound },
    { label: "New", value: preview.newExecutions },
    { label: "Already journaled", value: preview.duplicateExecutions },
    { label: "Estimated trades", value: preview.estimatedNewTrades },
  ];
  const details = [
    `${preview.ordersRead.toLocaleString("en-US")} orders read`,
    `${preview.transactionsRead.toLocaleString("en-US")} trade transactions`,
    `${preview.symbols.toLocaleString("en-US")} symbols`,
    `${preview.existingTradesAffected.toLocaleString("en-US")} open trades affected`,
    preview.excludedAssets > 0
      ? `${preview.excludedAssets.toLocaleString("en-US")} non-equity legs excluded`
      : null,
  ].filter((detail): detail is string => detail != null);

  return (
    <div
      className="space-y-4 rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/5 px-4 py-4"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
            Read-only preview
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {formatImportDate(preview.from)}
            {preview.from === preview.to ? "" : ` – ${formatImportDate(preview.to)}`}
          </h3>
        </div>
        <span className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--muted)]">
          Nothing saved
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {stat.label}
            </div>
            <div className="mt-1 font-mono text-lg tabular-nums text-[var(--foreground)]">
              {stat.value.toLocaleString("en-US")}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        {preview.accountLabel} → {preview.journalAccountLabel} · {details.join(" · ")}
      </p>

      {preview.duplicateDates.length > 0 && preview.newDates.length > 0 ? (
        <p className="rounded-md border border-[var(--hairline)] px-3 py-2 text-xs leading-5 text-[var(--body)]">
          <span className="font-semibold text-[var(--foreground)]">
            Already imported:
          </span>{" "}
          {formatImportDayList(preview.duplicateDates)}. Those trades will be
          skipped and left unchanged; only fills from{" "}
          {formatImportDayList(preview.newDates)} will be added.
        </p>
      ) : null}

      {preview.reviewExecutions > 0 ? (
        <div className="rounded-md border border-[var(--accent)]/35 bg-[var(--background)]/60 px-3 py-2 text-xs leading-5 text-[var(--body)]">
          <div className="font-semibold text-[var(--foreground)]">
            Needs review: {preview.reviewSymbols.join(", ")}
          </div>
          <p className="mt-1">
            {preview.reviewExecutions.toLocaleString("en-US")} unmatched{" "}
            {preview.reviewExecutions === 1 ? "fill will" : "fills will"} be
            skipped. Existing {preview.reviewSymbols.join(", ")} trade data and
            journal notes will not change. If the trade looks incomplete, upload
            a statement with its full opening and closing fills.
          </p>
        </div>
      ) : null}

      {preview.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-[var(--muted)]">
          {preview.warnings.slice(0, 6).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SchwabImportResult({
  result,
  authorizing,
  onAuthorize,
}: {
  result: SchwabImportActionResult;
  authorizing: boolean;
  onAuthorize: () => void;
}) {
  if (!result.ok) {
    return (
      <div
        role="alert"
        className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3"
      >
        <div className="font-semibold text-[var(--red)]">Import stopped safely</div>
        <p className="mt-1 text-sm leading-6 text-[var(--body)]">{result.error}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          The database transaction was rolled back; no partial Schwab import was saved.
        </p>
        {result.kind === "reauth_required" ? (
          <button
            type="button"
            onClick={onAuthorize}
            disabled={authorizing}
            className="mt-3 h-9 cursor-pointer rounded-md bg-[var(--action)] px-3 text-xs font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
          >
            {authorizing ? "Waiting for Schwab…" : "Authorize Schwab"}
          </button>
        ) : null}
        <div className="mt-3 border-t border-[var(--red)]/20 pt-3">
          <Link
            href="/journal"
            className="text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
          >
            Open existing journal →
          </Link>
        </div>
      </div>
    );
  }

  const summary = result.summary;
  const recapDate =
    summary.insertedTo ?? summary.insertedFrom ?? summary.to ?? summary.from;
  const recapHref = recapDate ? `/journal?date=${recapDate}` : "/journal";
  const stats = [
    { label: "Executions added", value: summary.inserted },
    { label: "Duplicates skipped", value: summary.duplicates },
    { label: "Trades created", value: summary.tradesCreated },
    { label: "Trades updated", value: summary.tradesUpdated },
  ];

  return (
    <div
      className="space-y-4 rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-4 py-4"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--green)]">
            {summary.inserted > 0
              ? "Schwab import complete"
              : summary.reviewExecutions > 0
                ? "Import review complete"
                : "Already up to date"}
          </div>
          <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">
            {formatImportDate(summary.from)}
            {summary.from === summary.to ? "" : ` – ${formatImportDate(summary.to)}`}
          </h3>
        </div>
        <span className="rounded-md border border-[var(--green)]/45 px-2 py-1 text-[11px] font-semibold text-[var(--green)]">
          {summary.reviewExecutions > 0 ? "No overwrite" : "Append only"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {stat.label}
            </div>
            <div className="mt-1 font-mono text-lg tabular-nums text-[var(--foreground)]">
              {stat.value.toLocaleString("en-US")}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-5 text-[var(--muted)]">
        {summary.accountLabel} → {summary.journalAccountLabel}. Existing notes,
        tags, attachments, trades, and executions were preserved.
      </p>

      {summary.duplicateDates.length > 0 && summary.insertedDates.length > 0 ? (
        <p className="rounded-md border border-[var(--green)]/25 px-3 py-2 text-xs leading-5 text-[var(--body)]">
          Added fills from {formatImportDayList(summary.insertedDates)}.{" "}
          {formatImportDayList(summary.duplicateDates)}{" "}
          {summary.duplicateDates.length === 1 ? "was" : "were"} already imported
          and left unchanged.
        </p>
      ) : null}

      {summary.reviewExecutions > 0 ? (
        <div className="rounded-md border border-[var(--accent)]/35 bg-[var(--background)]/60 px-3 py-2 text-xs leading-5 text-[var(--body)]">
          <div className="font-semibold text-[var(--foreground)]">
            Skipped for review: {summary.reviewSymbols.join(", ")}
          </div>
          <p className="mt-1">
            {summary.reviewExecutions.toLocaleString("en-US")} unmatched{" "}
            {summary.reviewExecutions === 1 ? "fill was" : "fills were"} not
            imported because {summary.reviewExecutions === 1 ? "it may" : "they may"}{" "}
            belong to existing trade data. Review the trade in the Journal; use
            a complete statement if it needs repair.
          </p>
        </div>
      ) : null}

      <div className="flex justify-end border-t border-[var(--green)]/25 pt-3">
        <Link
          href={recapHref}
          className="rounded-md bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Open journal review
        </Link>
      </div>
    </div>
  );
}

function SchwabConnectionSummary({
  connection,
  checking,
  authorizing,
  onAuthorize,
  onRetry,
}: {
  connection: SchwabConnectionUiState;
  checking: boolean;
  authorizing: boolean;
  onAuthorize: () => void;
  onRetry: () => void;
}) {
  if (authorizing) {
    return (
      <div className="border-l-2 border-[var(--accent)] pl-4" aria-live="polite">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Finish authorization in Schwab
        </h3>
        <p className="mt-2 max-w-[560px] text-sm leading-6 text-[var(--body)]">
          A secure Schwab window is open in your browser. This page will update when you finish.
        </p>
      </div>
    );
  }

  if (checking || connection.status === "idle") {
    return (
      <div className="border-l-2 border-[var(--accent)] pl-4" aria-live="polite">
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Checking Schwab…
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--body)]">
          Verifying the Journal&apos;s local authorization and loading masked accounts.
        </p>
      </div>
    );
  }

  if (connection.status === "connected") {
    return (
      <div className="border-l-2 border-[var(--green)] pl-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="text-base font-semibold text-[var(--foreground)]">
            Schwab connected
          </h3>
          <span className="rounded-md border border-[var(--green)]/45 bg-[var(--green)]/10 px-2 py-1 text-[11px] font-semibold text-[var(--green)]">
            Authorized
          </span>
        </div>
        <p className="mt-2 max-w-[560px] text-sm leading-6 text-[var(--body)]">
          The Journal found {connection.accounts.length} authorized{" "}
          {connection.accounts.length === 1 ? "account" : "accounts"}. Choose a date
          range to compare Schwab fills with the active Journal account before saving.
        </p>
      </div>
    );
  }

  const needsSetup = connection.status === "missing_credentials";
  const heading = needsSetup
    ? "Set up Schwab for this Journal"
    : connection.status === "reauth_required"
      ? "Schwab authorization expired"
      : "Schwab is temporarily unavailable";
  const detail =
    connection.status === "unavailable"
      ? connection.error
      : connection.recovery;
  const canAuthorize = connection.status === "reauth_required"
    || (
      connection.status === "missing_credentials"
      && !connection.missing.some((key) => key !== "SCHWAB_REFRESH_TOKEN")
    );

  return (
    <div className="space-y-3 border-l-2 border-[var(--accent)] pl-4" aria-live="polite">
      <div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">{heading}</h3>
        <p className="mt-2 max-w-[560px] text-sm leading-6 text-[var(--body)]">
          {detail}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {canAuthorize ? (
          <button
            type="button"
            onClick={onAuthorize}
            className="h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Authorize Schwab
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRetry}
          className="h-9 cursor-pointer rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--body)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          Check connection again
        </button>
        {needsSetup && !canAuthorize ? (
          <a
            href="https://github.com/trading-journal-ai/trading-journal/blob/main/docs/setup/SCHWAB_SETUP.md"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Open one-time setup guide
          </a>
        ) : null}
      </div>
    </div>
  );
}

function FileImportReadyState({ onChooseFile }: { onChooseFile: () => void }) {
  return (
    <div className="pt-6">
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
      <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
        Re-importing overlapping dates is safe. Existing journal notes are not replaced.
      </p>
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
      ? `Trade history${inspection.tos.tradeHistory.filteredBy ? ` (filtered by ${inspection.tos.tradeHistory.filteredBy})` : ""}: ${inspection.tos.tradeHistory.usableFills} usable fills from ${inspection.tos.tradeHistory.rows} rows`
      : null,
    inspection.tos.orderHistory.present
      ? `Order history${inspection.tos.orderHistory.filteredBy ? ` (filtered by ${inspection.tos.orderHistory.filteredBy})` : ""}: ${inspection.tos.orderHistory.usableFilledRows} usable filled rows from ${inspection.tos.orderHistory.rows} rows`
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

function formatImportDayList(values: string[]) {
  const formatted = values.map((value) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return value;
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  });
  return new Intl.ListFormat("en-US", {
    style: "long",
    type: "conjunction",
  }).format(formatted);
}

function confidenceCopy(value: "high" | "medium" | "low" | "statement_only") {
  if (value === "high") return "high confidence";
  if (value === "medium") return "medium confidence";
  if (value === "low") return "low confidence";
  return "statement only";
}

function marketDateInputValue(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const valueByPart = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${valueByPart.year}-${valueByPart.month}-${valueByPart.day}`;
}

function schwabLookbackRange(days: number) {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - Math.max(0, days - 1));
  return {
    from: marketDateInputValue(from),
    to: marketDateInputValue(to),
  };
}

function initialSchwabDateRange() {
  return schwabLookbackRange(7);
}

function schwabDateLimits() {
  return {
    min: schwabLookbackRange(60).from,
    max: marketDateInputValue(new Date()),
  };
}

function schwabDateRangeError(
  fromDate: string,
  toDate: string,
  limits: { min: string; max: string },
) {
  if (!fromDate || !toDate) return "Choose both a start date and an end date.";
  if (fromDate > toDate) return "The start date must be on or before the end date.";
  if (fromDate < limits.min) return "Initial Schwab sync is limited to the most recent 60 days.";
  if (toDate > limits.max) return "The end date cannot be in the future.";
  return null;
}
