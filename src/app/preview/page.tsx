import Link from "next/link";
import { notFound } from "next/navigation";
import { dataVizPreviewRoutes } from "@/lib/preview/dataVizPreviewRoutes";

type PrototypeItem = {
  href: string;
  title: string;
  description: string;
  meta: string;
};

const productPrototypes: PrototypeItem[] = [
  {
    href: "/preview/journal",
    title: "Journal review workspace",
    description: "Day, week, and month review states for deciding what belongs in the journal before and after Coach interpretation.",
    meta: "Interactive prototype",
  },
  {
    href: "/preview/coach",
    title: "AI Coach conversation",
    description: "A working coach chat for debriefing the session, dictating context, and returning to process with model or fallback responses.",
    meta: "Working preview",
  },
  {
    href: "/preview/playbook",
    title: "Playbook workspace",
    description: "A wireframe for archiving one high-signal play, developing setup rules, and rehearsing the best examples.",
    meta: "Workflow wireframe",
  },
];

const designReviewPrototypes: PrototypeItem[] = [
  {
    href: "/review/dashboard",
    title: "Dashboard design variations",
    description: "Three switchable directions for the Dashboard: the base layout, active orientation loop, and sticky-board treatment.",
    meta: "3 variations",
  },
  {
    href: "/review/journal/coach-review-mockup",
    title: "Coach review mockup",
    description: "A completed daily recap combining dashboard inputs, coach review, statistical evidence, and carry-forward cues.",
    meta: "Journal structure",
  },
  {
    href: "/review/journal/day-recap-redesign",
    title: "Journal day recap redesign",
    description: "One recap object with two voices: the trader’s read followed by a deterministic Coach interpretation.",
    meta: "Visual mockup",
  },
  {
    href: "/review/journal/coach-recap-spine",
    title: "Coach recap spine",
    description: "An import-ready, coach-first recap with playbook alignment, targeted questions, and progressively disclosed analytics.",
    meta: "Clickable prototype",
  },
  {
    href: "/review/journal/ai-first-recap",
    title: "AI-first daily recap",
    description: "An evidence-led recap with lightweight trader context, one Coach focus, explanatory visuals, and a trade review queue.",
    meta: "Clickable prototype",
  },
  {
    href: "/review/journal/prototype-flow",
    title: "Daily recap flow",
    description: "The complete loop from Dashboard to trade import, recap editing, Journal save, and return with carry-forward cues.",
    meta: "End-to-end flow",
  },
];

const dataVizPrototypes: PrototypeItem[] = dataVizPreviewRoutes.map((study) => ({
  href: study.href,
  title: study.title,
  description: study.description,
  meta: `${study.version} · ${study.meta}`,
}));

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrototypeLink({ item, index }: { item: PrototypeItem; index: number }) {
  return (
    <Link
      href={item.href}
      className="group grid gap-3 border-t border-[var(--hairline)] py-5 outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--blue)_4%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--blue)_6%,transparent)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--blue)] md:grid-cols-[54px_minmax(200px,0.72fr)_minmax(300px,1.15fr)_150px_24px] md:items-center md:gap-5 md:px-3"
    >
      <span className="font-mono text-[11px] tabular-nums text-[var(--faint)]">{String(index + 1).padStart(2, "0")}</span>
      <span className="text-[16px] font-semibold leading-6 text-[var(--foreground)]">{item.title}</span>
      <span className="max-w-2xl text-[13px] leading-6 text-[var(--prose)]">{item.description}</span>
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{item.meta}</span>
      <span className="text-[var(--muted)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--blue)] group-focus-visible:text-[var(--blue)]"><ArrowIcon /></span>
    </Link>
  );
}

function PrototypeSection({
  number,
  title,
  description,
  items,
  collectionHref,
}: {
  number: string;
  title: string;
  description: string;
  items: PrototypeItem[];
  collectionHref?: string;
}) {
  return (
    <section className="grid gap-8 border-t border-[var(--border)] py-14 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
      <header>
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{number} · {items.length} routes</p>
        <h2 className="mt-4 text-[25px] font-semibold leading-8 tracking-[-0.02em] text-[var(--foreground)]">{title}</h2>
        <p className="mt-4 max-w-sm text-[13px] leading-6 text-[var(--prose)]">{description}</p>
        {collectionHref ? <Link href={collectionHref} className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--blue)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue)]">Open collection index <ArrowIcon /></Link> : null}
      </header>
      <div className="border-b border-[var(--hairline)]">
        {items.map((item, index) => <PrototypeLink key={item.href} item={item} index={index} />)}
      </div>
    </section>
  );
}

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const totalRoutes = productPrototypes.length + designReviewPrototypes.length + dataVizPrototypes.length;

  return (
    <main className="min-h-screen bg-[image:var(--page-bg)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-12">
        <header className="pb-12 sm:pb-16">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/dashboard" className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue)]">
              Trading Journal / App dashboard
            </Link>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">Development routes only</p>
          </div>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-[42px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[60px]">Prototype index</h1>
              <p className="mt-6 max-w-2xl text-[16px] leading-7 text-[var(--body)]">One jumping-off point for the product flows, design reviews, and data-visualization studies currently available in the project.</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 border-t border-[var(--hairline)] pt-4">
              <div><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Routes</dt><dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">{String(totalRoutes).padStart(2, "0")}</dd></div>
              <div className="border-l border-[var(--hairline)] pl-4"><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Collections</dt><dd className="mt-2 font-mono text-[20px] font-semibold tabular-nums">03</dd></div>
              <div className="border-l border-[var(--hairline)] pl-4"><dt className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Surface</dt><dd className="mt-2 font-mono text-[13px] font-semibold uppercase">Local</dd></div>
            </dl>
          </div>
        </header>

        <PrototypeSection number="01" title="Data visualization" description="The active collection, from broad chart exploration to real candle joins, price-action quality, and Journal-level distillation." items={dataVizPrototypes} collectionHref="/preview/data-viz" />
        <PrototypeSection number="02" title="Product workflows" description="Working and wireframe explorations for the daily review ritual, Coach conversation, and reusable trading playbook." items={productPrototypes} />
        <PrototypeSection number="03" title="Design reviews" description="Earlier and current Dashboard and Journal directions. These routes live under /review but belong in the same prototype directory." items={designReviewPrototypes} />

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-7 text-[11px] leading-5 text-[var(--muted)]">
          <p>Legacy redirect aliases are intentionally omitted. Add new prototype routes to this index when they become reviewable.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 font-mono font-semibold uppercase tracking-[0.12em] text-[var(--body)] transition-colors hover:text-[var(--blue)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--blue)]">Return to app <ArrowIcon /></Link>
        </footer>
      </div>
    </main>
  );
}
