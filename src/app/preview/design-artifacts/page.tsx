import Link from "next/link";
import { notFound } from "next/navigation";

import DesignArtifactReview from "@/components/preview/DesignArtifactReview";
import { DESIGN_ARTIFACT_GROUPS, designArtifactsWithDates } from "@/lib/preview/designArtifacts";

export default function DesignArtifactsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const artifacts = designArtifactsWithDates();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/preview"
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              ← Prototype triage
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">Development routes only</p>
          </div>

          <div className="mt-10 max-w-3xl">
            <h1 className="text-[38px] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[48px]">Design artifacts review</h1>
            <p className="mt-5 text-[16px] leading-7 text-[var(--body)]">
              The graphical explorations behind the design system&rsquo;s tone, in one place. Review each one visually,
              mark it <span className="font-semibold text-[var(--green)]">Keep</span> or
              <span className="font-semibold text-[var(--red)]"> Remove</span>, then copy the removal list for cleanup.
            </p>
            <p className="mt-4 rounded-[6px] bg-[var(--surface-2)] px-4 py-3 text-[12.5px] leading-6 text-[var(--muted)]">
              <span className="font-semibold text-[var(--body)]">Sync note:</span> the Claude Design project
              (&ldquo;Trading Journal AI - Landing&rdquo;) is currently empty, so nothing was pulled from it. These artifacts
              are sourced from the repo and the journal-wireframe zip. Once the Design project holds the Type &amp; Spacing
              Guide and visual directions, those can feed a new group here.
            </p>
          </div>
        </header>

        <DesignArtifactReview groups={DESIGN_ARTIFACT_GROUPS} artifacts={artifacts} />
      </div>
    </main>
  );
}
