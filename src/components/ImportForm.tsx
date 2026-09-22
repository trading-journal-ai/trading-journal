"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { importCsvAction } from "@/app/import/actions";
import { authorizeSchwabAction, importSchwabExecutionsAction } from "@/app/import/schwab-actions";
import { getImportModalContextAction, openImportedJournalAction } from "@/app/import/modal-actions";
import Button from "@/components/ui/Button";
import ImportDatePicker from "@/components/ImportDatePicker";
import { SCHWAB_MAX_LOOKBACK_DAYS } from "@/lib/schwab/dates";
import { importModalPresentation, type ModalImportSummary } from "@/lib/import/modalPresentation";

type ModalContext = Awaited<ReturnType<typeof getImportModalContextAction>>;
type Stage =
  | { kind: "ready" }
  | { kind: "busy"; label: string }
  | { kind: "result"; summary: ModalImportSummary; destinationId: number }
  | { kind: "error"; message: string };

const PRESETS = [
  { label: "Today", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
] as const;
const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

export default function ImportForm() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={trigger} type="button" onClick={() => setOpen(true)} className={`h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] ${focusClass}`}>Import</button>
      {open ? <ImportDialog onClose={() => { setOpen(false); trigger.current?.focus(); }} /> : null}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [context, setContext] = useState<ModalContext | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [preset, setPreset] = useState<number | "custom">(1);
  const [range, setRange] = useState(() => lookbackRange(1));
  const [stage, setStage] = useState<Stage>({ kind: "ready" });
  const busy = stage.kind === "busy";
  const limits = { min: lookbackRange(SCHWAB_MAX_LOOKBACK_DAYS).from, max: lookbackRange(1).to };
  const dateError = rangeError(range.from, range.to, limits);
  const connection = context?.connection;
  const brokerAccounts = connection?.status === "connected" ? connection.accounts : [];
  const sourceValue = brokerAccounts.length === 1 ? brokerAccounts[0].value : "";
  const destination = context?.destination.supported ? context.destination.account : null;
  const presentation = stage.kind === "result" ? importModalPresentation(stage.summary) : null;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    let active = true;
    getImportModalContextAction().then((next) => {
      if (!active) return;
      setContext(next);
    }).catch(() => {
      if (active) setContextError("Could not load import accounts. Try again.");
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    title.current?.focus();
  }, [stage.kind]);

  function closeDialog() {
    dialog.current?.close();
    onClose();
  }

  async function refreshConnection(authorize = false) {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    setContextError(null);
    try {
      if (authorize) await authorizeSchwabAction();
      const next = await getImportModalContextAction();
      setContext(next);
    } catch {
      setContextError("Could not check the connection. Try again.");
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  }

  async function sync() {
    if (inFlight.current || checking || !destination || !sourceValue || dateError) return;
    inFlight.current = true;
    const targetId = destination.id;
    setStage({ kind: "busy", label: "Syncing…" });
    try {
      const result = await importSchwabExecutionsAction({
        accountSelection: sourceValue,
        journalAccountId: targetId,
        from: range.from,
        to: range.to,
      });
      if (!result.ok && result.kind === "reauth_required") {
        setContext((current) => current ? {
          ...current,
          connection: { status: "reauth_required", recovery: result.error },
        } : current);
        setStage({ kind: "ready" });
      } else {
        setStage(result.ok
          ? { kind: "result", summary: result.summary, destinationId: targetId }
          : { kind: "error", message: result.error });
        if (result.ok) router.refresh();
      }
    } catch {
      setStage({ kind: "error", message: "The connection was interrupted. Check the journal before retrying; the import may have finished." });
    } finally { inFlight.current = false; }
  }

  function chooseFile() {
    if (!fileInput.current || !destination || inFlight.current) return;
    fileInput.current.value = "";
    fileInput.current.click();
  }

  async function importFile(file: File) {
    if (!destination || inFlight.current) return;
    inFlight.current = true;
    const targetId = destination.id;
    setStage({ kind: "busy", label: "Importing file…" });
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("journalAccountId", String(targetId));
      const result = await importCsvAction(null, data);
      setStage(result?.ok
        ? { kind: "result", summary: result.summary, destinationId: targetId }
        : { kind: "error", message: result?.error ?? "The file could not be imported." });
      if (result?.ok) router.refresh();
    } catch {
      setStage({ kind: "error", message: "The connection was interrupted. Check the journal before retrying; the file may have been imported." });
    } finally { inFlight.current = false; }
  }

  async function openJournal() {
    if (stage.kind !== "result" || inFlight.current) return;
    inFlight.current = true;
    try {
      await openImportedJournalAction(stage.destinationId);
      const date = importModalPresentation(stage.summary).journalDate;
      router.push(date ? `/journal?date=${encodeURIComponent(date)}` : "/journal");
      router.refresh();
      closeDialog();
    } catch {
      setContextError("Could not open the journal. Try Open journal again.");
    } finally { inFlight.current = false; }
  }

  const connectionDetail = !connection || connection.status === "connected" ? null
    : connection.status === "unavailable" ? connection.error
      : context?.gateway && connection.status === "reauth_required"
        ? "Schwab authorization expired. Use Authorize Schwab in Trading Monitor, then check the connection here."
        : connection.recovery;
  const canAuthorize = !context?.gateway && (connection?.status === "reauth_required"
    || (connection?.status === "missing_credentials" && connection.missing.every((key) => key === "SCHWAB_REFRESH_TOKEN")));

  return (
    <dialog
      ref={dialog}
      aria-labelledby="import-dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!inFlight.current) closeDialog(); }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-3rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-lg bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-xl backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between gap-4 px-6 pt-5">
        <h2 ref={title} id="import-dialog-title" tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
          {busy ? stage.label : presentation?.title ?? (stage.kind === "error" ? "Import needs attention" : "Import trades")}
        </h2>
        <button type="button" aria-label="Close import dialog" disabled={busy}
          onClick={closeDialog} className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="px-6 pb-6 pt-4">
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" aria-label="Broker CSV"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} />
        {stage.kind === "ready" && context && !context.destination.supported ? (
          <div className="space-y-2 pb-2 text-sm leading-6">
            <p className="font-semibold">{context.destination.account.name}</p>
            <p className="text-[var(--body)]">Import isn’t available for this account yet. Select your live Schwab account in the app header to import trades.</p>
          </div>
        ) : stage.kind === "ready" ? (
          <div className="space-y-6">
            <p role="status" className="flex items-center gap-3">
              {checking ? <span className="text-sm text-[var(--muted)]">Checking account…</span> : (
                <>
                  <span className="text-base font-semibold text-[var(--foreground)]">Schwab</span>
                  {connection?.status === "connected" ? (
                    <span className="rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-2 py-1 text-xs font-semibold text-[var(--green)]">Connected</span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">{connection?.status === "reauth_required" ? "Reconnect needed" : "Not connected"}</span>
                  )}
                </>
              )}
            </p>
            {brokerAccounts.length > 1 ? <p className="text-sm leading-6 text-[var(--body)]">Multiple Schwab accounts are connected. Broker account mapping is needed before Sync is available. You can still upload a file.</p> : null}
            {connectionDetail ? (
              <div className="space-y-2 text-sm" role="status">
                <p className="leading-6 text-[var(--body)]">{connectionDetail}</p>
                <button type="button" disabled={checking} onClick={() => void refreshConnection(canAuthorize)} className={`h-10 cursor-pointer font-semibold underline underline-offset-4 ${focusClass}`}>
                  {canAuthorize ? "Connect Schwab" : "Check connection"}
                </button>
              </div>
            ) : null}
            <fieldset aria-label="Trade dates">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Date range">
                {PRESETS.map((item) => <button key={item.days} type="button" aria-pressed={preset === item.days}
                  onClick={() => { setPreset(item.days); setRange(lookbackRange(item.days)); }}
                  className={`h-10 cursor-pointer rounded-md px-3 text-sm ${focusClass} ${preset === item.days ? "bg-[var(--action)] font-semibold text-[var(--action-foreground)]" : "text-[var(--body)] hover:bg-[var(--surface-2)]"}`}>{item.label}</button>)}
                <button type="button" aria-pressed={preset === "custom"} onClick={() => setPreset("custom")}
                  className={`h-10 cursor-pointer rounded-md px-3 text-sm ${focusClass} ${preset === "custom" ? "bg-[var(--action)] font-semibold text-[var(--action-foreground)]" : "text-[var(--body)] hover:bg-[var(--surface-2)]"}`}>Custom</button>
              </div>
              <div inert={preset !== "custom"} className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${preset === "custom" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="-mx-1 min-h-0 overflow-hidden px-1">
                  <div className="grid grid-cols-1 gap-3 pt-3 pb-1 min-[400px]:grid-cols-2">
                    {(["from", "to"] as const).map((field) => <ImportDatePicker key={field}
                      label={field === "from" ? "From" : "To"} value={range[field]} min={limits.min} max={limits.max}
                      invalid={Boolean(dateError)} describedBy={dateError ? "import-date-error" : undefined}
                      onChange={(value) => setRange((current) => ({ ...current, [field]: value }))} />)}
                  </div>
                  {dateError ? <p id="import-date-error" role="alert" className="pt-2 text-xs text-[var(--red)]">{dateError}</p> : null}
                </div>
              </div>
            </fieldset>
            {contextError ? <div role="alert" className="text-sm text-[var(--red)]">{contextError} <button type="button" onClick={() => void refreshConnection()} className={`underline ${focusClass}`}>Retry</button></div> : null}
            <div className="flex items-center justify-end gap-5 border-t border-[var(--hairline)] pt-4">
              <button type="button" disabled={!destination || checking} onClick={chooseFile} className={`h-10 cursor-pointer text-sm font-semibold text-[var(--body)] disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}>Upload file</button>
              <Button variant="action" onClick={() => void sync()} disabled={checking || !destination || !sourceValue || Boolean(dateError)} aria-busy={checking}
                aria-label={checking ? "Checking account" : undefined}
                className={`inline-grid place-items-center ${checking ? "disabled:opacity-100 cursor-wait" : ""}`}>
                <span className={`col-start-1 row-start-1 ${checking ? "invisible" : ""}`}>Sync</span>
                {checking ? <span className="col-start-1 row-start-1 flex"><ImportSpinner /></span> : null}
              </Button>
            </div>
          </div>
        ) : busy ? (
          <div className="space-y-5 py-3" role="status" aria-live="polite">
            <p className="text-sm text-[var(--muted)]">{destination?.name ?? "Schwab"}</p>
            <ImportProgress />
            <p className="text-sm text-[var(--body)]">Adding activity to your journal. Keep this window open.</p>
            <div className="flex justify-end border-t border-[var(--hairline)] pt-4">
              <Button variant="action" disabled aria-busy="true" className="inline-flex cursor-wait items-center justify-center gap-2 disabled:opacity-100">
                <ImportSpinner />{stage.label}
              </Button>
            </div>
          </div>
        ) : stage.kind === "result" && presentation ? (
          <div className="space-y-5" aria-live="polite">
            <p className="text-sm text-[var(--muted)]">{destination?.name ?? "Schwab"}{presentation.from && presentation.to ? ` · ${dateLabel(presentation.from, presentation.to)}` : ""}</p>
            <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-[var(--body)]">
              <span><strong className="font-semibold tabular-nums text-[var(--foreground)]">{stage.summary.inserted.toLocaleString("en-US")}</strong> executions added</span>
              <span aria-hidden="true">·</span>
              <span><strong className="font-semibold tabular-nums text-[var(--foreground)]">{stage.summary.duplicates.toLocaleString("en-US")}</strong> duplicates skipped</span>
            </p>
            {stage.summary.feesUpdated > 0 ? <p className="text-sm text-[var(--body)]">Fee details updated for {stage.summary.feesUpdated.toLocaleString("en-US")} executions.</p> : null}
            {presentation.notices.length ? <ul className="list-disc space-y-2 pl-4 text-sm leading-6 text-[var(--body)]">{presentation.notices.map((notice, index) => <li key={index}>{notice}</li>)}</ul> : null}
            {contextError ? <p role="alert" className="text-sm text-[var(--red)]">{contextError}</p> : null}
            <div className="flex justify-end border-t border-[var(--hairline)] pt-4"><Button variant="action" onClick={() => void openJournal()}>Open journal</Button></div>
          </div>
        ) : stage.kind === "error" ? (
          <div className="space-y-5">
            <p role="alert" className="text-sm leading-6 text-[var(--body)]">{stage.message}</p>
            <div className="flex justify-end border-t border-[var(--hairline)] pt-4"><Button variant="action" onClick={() => { setStage({ kind: "ready" }); void refreshConnection(); }}>Back to import</Button></div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}

function ImportProgress() {
  return <div className="import-progress-track" aria-hidden="true"><div className="import-progress-bar" /></div>;
}

function ImportSpinner() {
  return <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />;
}

function marketDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function lookbackRange(days: number) {
  const to = marketDate(new Date());
  const from = new Date(`${to}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: from.toISOString().slice(0, 10), to };
}

function dateLabel(from: string, to: string) {
  const format = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
  return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}

function rangeError(from: string, to: string, limits: { min: string; max: string }) {
  if (!from || !to) return "Choose both dates.";
  if (from > to) return "From must be on or before To.";
  if (from < limits.min) return `Choose dates within the last ${SCHWAB_MAX_LOOKBACK_DAYS} days, or upload a file.`;
  if (to > limits.max) return "Dates cannot be in the future.";
  return null;
}
