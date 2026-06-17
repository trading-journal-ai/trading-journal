"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetActiveAccountImportsAction } from "@/app/accounts/actions";

export default function DevResetImports() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3 rounded-md border border-[var(--red)]/35 bg-[var(--red)]/10 p-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Development reset</h3>
        <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Clear imported trades, executions, import batches, and trade-level notes for the selected account. The account stays in place.
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const confirmed = window.confirm(
            "Reset imported data for the selected account? This cannot be undone.",
          );
          if (!confirmed) return;
          setMessage(null);
          startTransition(async () => {
            await resetActiveAccountImportsAction();
            setMessage("Imported data reset for the selected account.");
            router.refresh();
          });
        }}
        className="inline-flex h-10 cursor-pointer items-center rounded-md border border-[var(--red)]/60 px-4 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--red)] hover:text-[var(--red)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Resetting..." : "Reset imported data"}
      </button>
      {message && <p className="text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
