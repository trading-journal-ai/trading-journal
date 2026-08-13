"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  authorizeSchwabAction,
  getSchwabConnectionAction,
  importSchwabExecutionsAction,
} from "@/app/import/schwab-actions";
import { schwabTodayImportPresentation } from "@/lib/schwab/todayImportPresentation";
import type {
  SchwabAccountOption,
  SchwabConnectionState,
} from "@/lib/schwab/types";

type TodayImportUiState =
  | { phase: "idle" }
  | { phase: "checking" }
  | { phase: "authorizing" }
  | { phase: "choosing_account"; accounts: SchwabAccountOption[]; selected: string }
  | { phase: "importing" }
  | {
      phase: "message";
      kind:
        | "imported"
        | "no_trades"
        | "already_imported"
        | "needs_review"
        | "reauth_required"
        | "setup_required"
        | "validation"
        | "unavailable";
      title: string;
      detail: string;
      canAuthorize?: boolean;
    };

function connectionMessage(connection: Exclude<SchwabConnectionState, { status: "connected" }>): TodayImportUiState {
  if (connection.status === "reauth_required") {
    return {
      phase: "message",
      kind: "reauth_required",
      title: "Schwab authorization expired",
      detail: connection.recovery,
      canAuthorize: true,
    };
  }

  if (connection.status === "missing_credentials") {
    return {
      phase: "message",
      kind: "setup_required",
      title: "Schwab isn’t set up for this Journal",
      detail: connection.recovery,
      canAuthorize: !connection.missing.some(
        (key) => key !== "SCHWAB_REFRESH_TOKEN",
      ),
    };
  }

  return {
    phase: "message",
    kind: "unavailable",
    title: "Schwab couldn’t be reached",
    detail: connection.error,
  };
}

export default function JournalTodayImport({
  date,
  readOnly = false,
}: {
  date: string;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<TodayImportUiState>({ phase: "idle" });

  async function continueFromConnection(connection: SchwabConnectionState) {
    if (connection.status !== "connected") {
      setState(connectionMessage(connection));
      return;
    }
    if (connection.accounts.length === 0) {
      setState({
        phase: "message",
        kind: "unavailable",
        title: "No Schwab accounts were found",
        detail: "Authorize the account you traded in, then check the connection again.",
      });
      return;
    }
    if (connection.accounts.length > 1) {
      setState({
        phase: "choosing_account",
        accounts: connection.accounts,
        selected: connection.accounts[0].value,
      });
      return;
    }
    await importAccount(connection.accounts[0].value);
  }

  async function importAccount(accountSelection: string) {
    setState({ phase: "importing" });
    try {
      const result = await importSchwabExecutionsAction({
        accountSelection,
        from: date,
        to: date,
      });
      const presentation = schwabTodayImportPresentation(result);
      setState({
        phase: "message",
        kind: presentation.kind,
        title: presentation.title,
        detail: presentation.detail,
        canAuthorize: presentation.kind === "reauth_required",
      });
      if (presentation.refreshJournal) router.refresh();
    } catch {
      setState({
        phase: "message",
        kind: "unavailable",
        title: "Schwab couldn’t complete the import",
        detail: "No data was changed. Check your connection and try again, or use the full importer.",
      });
    }
  }

  async function startImport() {
    setState({ phase: "checking" });
    try {
      const connection = await getSchwabConnectionAction();
      await continueFromConnection(connection);
    } catch {
      setState({
        phase: "message",
        kind: "unavailable",
        title: "Schwab couldn’t be reached",
        detail: "Check your connection and try again, or use the full importer.",
      });
    }
  }

  async function authorizeSchwab() {
    setState({ phase: "authorizing" });
    try {
      await continueFromConnection(await authorizeSchwabAction());
    } catch {
      setState({
        phase: "message",
        kind: "unavailable",
        title: "Schwab authorization didn’t finish",
        detail: "Try again and complete the Schwab window that opens in your browser.",
      });
    }
  }

  if (readOnly) {
    return (
      <div className="py-8">
        <p className="text-[15px] font-semibold text-[var(--foreground)]">No trades yet today</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          This hosted demo is read-only. Run the Journal locally to import your trades.
        </p>
      </div>
    );
  }

  if (state.phase === "idle") {
    return (
      <div className="flex min-h-24 flex-wrap items-center gap-x-5 gap-y-3 py-8">
        <p className="text-[15px] leading-6 text-[var(--muted)]">No trades yet today.</p>
        <button
          type="button"
          onClick={startImport}
          className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          Import today&apos;s trades
        </button>
      </div>
    );
  }

  if (
    state.phase === "checking"
    || state.phase === "authorizing"
    || state.phase === "importing"
  ) {
    return (
      <div
        className="flex min-h-24 flex-wrap items-center gap-4 py-8"
        role="status"
        aria-live="polite"
      >
        <div className="import-progress-track w-[220px]" aria-hidden="true">
          <div className="import-progress-bar" />
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          {state.phase === "checking"
            ? "Checking Schwab authorization…"
            : state.phase === "authorizing"
              ? "Finish authorization in the Schwab window…"
              : "Importing today’s trades from Schwab…"}
        </p>
      </div>
    );
  }

  if (state.phase === "choosing_account") {
    return (
      <div className="grid gap-4 py-8 sm:grid-cols-[minmax(0,280px)_auto] sm:items-end">
        <label className="space-y-2">
          <span className="block text-[13px] font-semibold text-[var(--foreground)]">
            Choose the Schwab account you traded in
          </span>
          <select
            value={state.selected}
            onChange={(event) => setState({
              ...state,
              selected: event.target.value,
            })}
            className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
          >
            {state.accounts.map((account) => (
              <option key={account.value} value={account.value}>
                {account.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => importAccount(state.selected)}
          className="h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90"
        >
          Import today&apos;s trades
        </button>
      </div>
    );
  }

  const isError = state.kind === "reauth_required"
    || state.kind === "setup_required"
    || state.kind === "validation"
    || state.kind === "unavailable";
  return (
    <div
      className="py-8"
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      <h3 className="text-[15px] font-semibold text-[var(--foreground)]">{state.title}</h3>
      <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--muted)]">{state.detail}</p>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm font-semibold">
        {state.canAuthorize ? (
          <button
            type="button"
            onClick={authorizeSchwab}
            className="h-10 cursor-pointer rounded-md bg-[var(--action)] px-4 text-sm font-semibold text-[var(--action-foreground)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            Authorize Schwab
          </button>
        ) : isError ? (
          <button
            type="button"
            onClick={startImport}
            className="cursor-pointer text-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Check again
          </button>
        ) : null}
        <Link href="/import" className="text-[var(--muted)] hover:text-[var(--foreground)]">
          Open full importer
        </Link>
      </div>
    </div>
  );
}
