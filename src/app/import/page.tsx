"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importTosAction, type ImportState } from "./actions";

export default function ImportPage() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importTosAction,
    null,
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Upload a <strong>ThinkorSwim Account Statement</strong> CSV. Fills are
          parsed from the <em>Account Trade History</em> section, deduped, and
          grouped into trades. Re-importing the same statement is safe.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-[var(--foreground)] file:border file:border-[var(--border)] hover:file:border-[#58a6ff] cursor-pointer"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#58a6ff] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </form>

      {state?.ok === false && (
        <div className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-3 text-sm text-[var(--red)]">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-4 py-3 text-sm space-y-2">
          <div className="font-semibold text-[var(--green)]">Import complete</div>
          <ul className="text-[var(--foreground)] space-y-0.5">
            <li>Parsed: {state.summary.parsed} fills</li>
            <li>Inserted: {state.summary.inserted} executions</li>
            <li>Duplicates skipped: {state.summary.duplicates}</li>
            <li>Trades created: {state.summary.trades}</li>
          </ul>
          <Link href="/trades" className="inline-block text-[#58a6ff] hover:underline">
            View trades →
          </Link>
        </div>
      )}
    </div>
  );
}
