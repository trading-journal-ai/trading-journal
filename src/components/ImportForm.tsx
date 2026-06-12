"use client";

import Link from "next/link";
import { useActionState } from "react";
import { importTosAction, type ImportState } from "@/app/import/actions";

export default function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importTosAction,
    null,
  );

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="block text-sm text-[var(--muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-[var(--foreground)] file:border file:border-[var(--border)] hover:file:border-[#58a6ff] cursor-pointer"
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
        <div className="rounded-md border border-[var(--red)]/40 bg-[var(--red)]/10 px-4 py-2 text-sm text-[var(--red)]">
          {state.error}
        </div>
      )}

      {state?.ok && (
        <div className="rounded-md border border-[var(--green)]/40 bg-[var(--green)]/10 px-4 py-2 text-sm">
          <span className="font-semibold text-[var(--green)]">Imported</span>{" "}
          <span className="text-[var(--foreground)]">
            {state.summary.inserted} executions · {state.summary.trades} trades
            {state.summary.duplicates > 0 && ` · ${state.summary.duplicates} dupes skipped`}
          </span>{" "}
          <Link href="/trades" className="text-[#58a6ff] hover:underline">
            view →
          </Link>
        </div>
      )}
    </div>
  );
}
