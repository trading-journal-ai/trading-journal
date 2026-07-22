import { notFound } from "next/navigation";

const archiveSteps = [
  {
    label: "Pick the play",
    detail: "Choose the trade, missed opportunity, or session pattern that taught the most.",
  },
  {
    label: "Attach intent",
    detail: "Connect it to a setup, or mark it as a new setup candidate.",
  },
  {
    label: "Review variables",
    detail: "Capture market context, catalyst, structure, tape read, and judgment.",
  },
  {
    label: "Promote learning",
    detail: "Add rules, reasons to sell, mistakes, or A+ examples back to the playbook.",
  },
];

const setupCards = [
  {
    name: "Opening Drive",
    status: "A+ rehearsal",
    meta: "Core setup · 14 archived examples",
    note: "Best when catalyst, premarket structure, and volume all align. Needs confident size only when stop is defined.",
  },
  {
    name: "VWAP Reclaim",
    status: "Developing",
    meta: "Testing · 6 archived examples",
    note: "Good read when reclaim follows failed flush. Avoid late entries after the second extension.",
  },
  {
    name: "Thin Name Chase",
    status: "Avoid",
    meta: "Retired behavior · 5 warnings",
    note: "Repeatedly drains attention and creates outsized slippage. Only review as an anti-example.",
  },
];

const dataObjects = [
  ["Setup", "Reusable definition: context, trigger, risk, exit, invalid conditions."],
  ["Daily entry", "Archived play from a specific session, tied to trade evidence when possible."],
  ["Rule", "Entry, sizing, exit, avoid, or review standard."],
  ["Example", "A+ trade, clean loss, missed opportunity, or avoid case."],
];

const fiveVariables = [
  "Big picture",
  "Intraday fundamentals",
  "Technical analysis",
  "Tape / execution read",
  "Intuition / judgment",
];

export default function PlaybookPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-6 text-[var(--body)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <header className="border-b border-[var(--hairline)] pb-8">
          <Eyebrow>Preview</Eyebrow>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
                Playbook workspace
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--body)]">
                A wireframe for turning the daily review ritual into a living
                setup library: archive one high-signal play, classify it, extract
                rules, and rehearse the best examples before the next session.
              </p>
            </div>
            <div className="border-l border-[var(--hairline)] pl-5">
              <Eyebrow>Current experiment</Eyebrow>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                No late chase entries after missing the opening drive.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                Review three A+ opening-drive examples before the bell. Archive
                today&apos;s clearest play after the close.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <Eyebrow>Daily archive</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              One play per day
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--body)]">
              The MVP should make the end-of-day question obvious: which play
              from today belongs in the playbook?
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            {archiveSteps.map((step, index) => (
              <div key={step.label} className="border-t border-[var(--hairline)] pt-4">
                <div className="font-mono text-xs text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-base font-semibold text-[var(--foreground)]">
                  {step.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">{step.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] pb-4">
              <div>
                <Eyebrow>Setup library</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                  Rehearse, develop, avoid
                </h2>
              </div>
              <button
                type="button"
                className="h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]"
              >
                Archive today&apos;s play
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              {setupCards.map((setup) => (
                <article
                  key={setup.name}
                  className="grid gap-4 border-b border-[var(--hairline)] pb-5 md:grid-cols-[180px_minmax(0,1fr)_150px]"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{setup.name}</h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {setup.meta}
                    </p>
                  </div>
                  <p className="text-sm leading-6 text-[var(--body)]">{setup.note}</p>
                  <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--blue)]">
                    {setup.status}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="border-l border-[var(--hairline)] pl-5">
            <Eyebrow>Data model</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              First objects
            </h2>
            <div className="mt-5 space-y-4">
              {dataObjects.map(([label, detail]) => (
                <div key={label}>
                  <div className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {label}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--body)]">{detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div>
            <Eyebrow>Archive form</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              Five-variable review
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--body)]">
              These become the first form groups for a daily playbook entry.
              Reasons to sell and size review sit beside the main variables.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {fiveVariables.map((item) => (
              <div key={item} className="min-h-28 border border-[var(--hairline)] bg-[var(--surface)] p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Field
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[var(--hairline)] pt-8">
          <Eyebrow>Next build slice</Eyebrow>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <BuildSlice
              title="Prototype state"
              body="Make the archive flow clickable with local state before adding persistence."
            />
            <BuildSlice
              title="Schema decision"
              body="Validate whether daily entries and setup definitions are enough for the first migration."
            />
            <BuildSlice
              title="Journal entry point"
              body="Add an end-of-day archive prompt from the daily recap once the form feels right."
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function BuildSlice({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-t border-[var(--hairline)] pt-4">
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--body)]">{body}</p>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
      {children}
    </div>
  );
}
