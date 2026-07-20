import Link from "next/link";
import { dataVizPreviewRoutes, type DataVizPreviewRoute } from "@/lib/preview/dataVizPreviewRoutes";

const studyGroups: Array<{
  title: string;
  description: string;
  phase: DataVizPreviewRoute["phase"];
}> = [
  {
    title: "Current review studies",
    description: "The active work: trade context, opportunity, price-action quality, and the strongest ideas distilled toward Journal use.",
    phase: "current",
  },
  {
    title: "Data-grounded analytics",
    description: "Experiments built from the trade×candle join and a configurable factor lens rather than illustrative data alone.",
    phase: "evidence",
  },
  {
    title: "Vocabulary foundations",
    description: "The original chart-language explorations that established the useful forms, interaction ideas, and comprehension limits.",
    phase: "foundation",
  },
  {
    title: "Open exploration",
    description: "Outside the narrowing track: forms picked for visual interest, tested on the real join, with field notes on what the beauty buys and what it costs.",
    phase: "exploration",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StudyRow({ study }: { study: DataVizPreviewRoute }) {
  return (
    <Link
      href={study.href}
      className="group grid gap-3 border-t border-[var(--hairline)] py-5 outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--blue)_4%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--blue)_6%,transparent)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)] md:grid-cols-[72px_minmax(200px,0.75fr)_minmax(320px,1.2fr)_140px_24px] md:items-center md:gap-5 md:px-3"
    >
      <span className="font-mono text-[12px] font-semibold text-[var(--blue)]">{study.version}</span>
      <span className="text-[17px] font-semibold leading-6 text-[var(--foreground)]">{study.title}</span>
      <span className="max-w-2xl text-[13px] leading-6 text-[var(--prose)]">{study.description}</span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{study.meta}</span>
      <span className="text-[var(--muted)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--blue)] group-focus-visible:text-[var(--blue)]"><ArrowIcon /></span>
    </Link>
  );
}

export default function DataVizIndexPage() {
  return (
    <main className="min-h-screen bg-[image:var(--page-bg)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-12 sm:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/preview" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue)]">← Prototype index</Link>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--blue)]">Active collection</p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[60px]">Data visualization studies</h1>
              <p className="mt-6 max-w-3xl text-[16px] leading-7 text-[var(--body)]">Seven iterations of the chart vocabulary, kept as review artifacts. Open any study, test the idea, then return here instead of navigating a chain of version links.</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4">
              <div><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Studies</dt><dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">07</dd></div>
              <div className="border-l border-[var(--hairline)] pl-4"><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Current</dt><dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">03</dd></div>
              <div className="border-l border-[var(--hairline)] pl-4"><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Mode</dt><dd className="mt-2 font-mono text-[13px] font-semibold uppercase">Review</dd></div>
            </dl>
          </div>
        </header>

        {studyGroups.map((group, index) => {
          const studies = dataVizPreviewRoutes.filter((study) => study.phase === group.phase);
          return (
            <section key={group.phase} className="grid gap-8 border-t border-[var(--border)] py-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
              <header>
                <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">0{index + 1} · {studies.length} studies</p>
                <h2 className="mt-4 text-[25px] font-semibold leading-8 tracking-[-0.02em]">{group.title}</h2>
                <p className="mt-4 max-w-sm text-[13px] leading-6 text-[var(--prose)]">{group.description}</p>
              </header>
              <div className="border-b border-[var(--hairline)]">
                {studies.map((study) => <StudyRow key={study.href} study={study} />)}
              </div>
            </section>
          );
        })}

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-7 text-[11px] leading-5 text-[var(--muted)]">
          <p>Each study preserves its original question and data boundary. New work should enter this collection before graduating into Journal or Reports.</p>
          <Link href="/preview" className="inline-flex items-center gap-2 font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)] transition-colors hover:text-[var(--blue)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue)]">All prototypes <ArrowIcon /></Link>
        </footer>
      </div>
    </main>
  );
}
