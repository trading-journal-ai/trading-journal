import Link from "next/link";
import { notFound } from "next/navigation";

import PrototypeTriage from "@/components/preview/PrototypeTriage";
import { PROTOTYPE_GROUPS, catalogWithDates } from "@/lib/preview/prototypeCatalog";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const entries = catalogWithDates();
  const totalSurfaces = entries.length;
  const pinned = entries.filter((entry) => entry.pinned).length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-10 sm:pb-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Trading Journal / Prototype triage
            </span>
            <Link
              href="/preview/design-artifacts"
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              Design artifacts review →
            </Link>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[56px]">
                Prototype triage index
              </h1>
              <p className="mt-6 max-w-2xl text-[16px] leading-7 text-[var(--body)]">
                Every non-production preview, review, and mock surface in one place. Mark each one
                <span className="font-semibold text-[var(--green)]"> Keep</span> or
                <span className="font-semibold text-[var(--red)]"> Remove</span>, then copy the removal
                list to hand off for cleanup. Age is the last commit date — a signal for what has gone stale.
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4">
              <div>
                <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Surfaces</dt>
                <dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">{String(totalSurfaces).padStart(2, "0")}</dd>
              </div>
              <div className="border-l border-[var(--hairline)] pl-4">
                <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Groups</dt>
                <dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">{String(PROTOTYPE_GROUPS.length).padStart(2, "0")}</dd>
              </div>
              <div className="border-l border-[var(--hairline)] pl-4">
                <dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Pinned</dt>
                <dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">{String(pinned).padStart(2, "0")}</dd>
              </div>
            </dl>
          </div>
        </header>

        <PrototypeTriage groups={PROTOTYPE_GROUPS} entries={entries} />
      </div>
    </main>
  );
}
