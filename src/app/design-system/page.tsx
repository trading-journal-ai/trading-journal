import Link from "next/link";
import { notFound } from "next/navigation";

import DesignSystemBrowser from "@/components/design-system/DesignSystemBrowser";

export const metadata = {
  title: "Design system — Trading Journal",
};

export default function DesignSystemPage() {
  // Internal reference surface; keep it out of the production demo.
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Trading Journal / Design system
            </span>
            <Link
              href="/preview"
              className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent)]"
            >
              Prototype triage →
            </Link>
          </div>

          <div className="mt-10 max-w-3xl">
            <h1 className="text-[42px] font-semibold leading-[1.0] tracking-[-0.03em] sm:text-[56px]">Design system</h1>
            <p className="mt-5 text-[16px] leading-7 text-[var(--body)]">
              The living reference for Trading Journal&rsquo;s visual language — tokens, type, and components,
              rendered live from the running app. Rules live in{" "}
              <span className="font-mono text-[14px]">docs/design/DESIGN_SYSTEM.md</span>; values live in{" "}
              <span className="font-mono text-[14px]">src/app/globals.css</span>. This page reflects the code, so
              it cannot drift.
            </p>
          </div>
        </header>

        <DesignSystemBrowser />
      </div>
    </main>
  );
}
