import Link from "next/link";

const githubUrl = "https://github.com/trading-journal-ai/trading-journal";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0b0d12] text-[var(--foreground)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-8 md:px-10">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Trading Journal AI
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[var(--muted)]">
          <Link href="/demo" className="transition-colors hover:text-[var(--foreground)]">
            Demo
          </Link>
          <a
            href={githubUrl}
            className="transition-colors hover:text-[var(--foreground)]"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-6 pb-20 pt-10 md:px-10 md:pt-20">
        <section className="max-w-[760px]">
          <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.32em] text-[var(--green)]">
            Local-first trading journal · Open source
          </p>
          <h1 className="mt-9 max-w-[720px] text-[56px] font-semibold leading-[0.98] tracking-[-0.04em] md:text-[86px]">
            A journal-first trading review system.
          </h1>
          <p className="mt-8 max-w-[720px] text-2xl font-medium leading-snug text-[var(--body)] md:text-[32px]">
            Review faster. Understand your patterns. Refine your trading process.
          </p>
          <p className="mt-6 max-w-[680px] text-lg leading-8 text-[var(--muted)] md:text-xl">
            Trading Journal AI brings notes, charts, P&amp;L, tags, and coaching into
            one journal-first workflow, so your data supports reflection instead of
            replacing it.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/demo"
              className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--foreground)] px-6 text-sm font-semibold text-[#0b0d12] transition-opacity hover:opacity-90"
            >
              View the live demo <span aria-hidden="true" className="ml-3">-&gt;</span>
            </Link>
            <a
              href={githubUrl}
              rel="noreferrer"
              target="_blank"
              className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--border)] px-6 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--muted)] hover:bg-[var(--surface)]"
            >
              View on GitHub
            </a>
          </div>

          <p className="mt-6 font-mono text-sm text-[var(--muted)]">
            No signup · No subscription · Your data stays on your machine
          </p>
        </section>

        <section className="mt-28">
          <div className="mb-8 flex items-center justify-between gap-6">
            <p className="font-mono text-[13px] font-semibold uppercase tracking-[0.32em] text-[var(--muted)]">
              The review, in three steps
            </p>
            <p className="hidden font-mono text-sm text-[var(--faint)] md:block">
              Import from your broker CSV, then review from the journal.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                number: "01",
                title: "Daily recap",
                body: "Start with the story of the session: market read, execution, and what stood out.",
              },
              {
                number: "02",
                title: "Ticker review",
                body: "See repeated trades, chart context, and P&L together before you decide what mattered.",
              },
              {
                number: "03",
                title: "Trade note",
                body: "Capture the lesson, tag the behavior, and keep the record easy to revisit later.",
              },
            ].map((step) => (
              <article
                key={step.number}
                className="border-t border-[var(--border)] pt-5"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-sm text-[var(--green)]">
                    {step.number}
                  </span>
                  <h2 className="text-lg font-semibold">{step.title}</h2>
                </div>
                <p className="mt-4 max-w-[340px] text-base leading-7 text-[var(--muted)]">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-md border border-[var(--border)] bg-[#10151d] shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <div className="flex gap-2">
              <span className="size-3 rounded-full bg-[var(--red)]" />
              <span className="size-3 rounded-full bg-[#f5b83d]" />
              <span className="size-3 rounded-full bg-[var(--green)]" />
            </div>
            <div className="rounded-md border border-black/40 bg-black/35 px-4 py-1 font-mono text-xs text-[var(--muted)]">
              trading-journal.ai/demo
            </div>
            <div className="w-14" />
          </div>
          <div className="grid min-h-[460px] gap-8 p-6 md:grid-cols-[1fr_280px] md:p-10">
            <div>
              <div className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                Week 2 · June 8 - 12 2026
              </div>
              <div className="mt-8 flex items-baseline gap-4">
                <span className="size-2.5 rounded-full bg-[var(--green)]" />
                <h3 className="text-4xl font-semibold tracking-tight">June 11</h3>
                <span className="font-mono text-lg text-[var(--muted)]">Thursday</span>
              </div>
              <p className="mt-6 max-w-[680px] text-lg leading-8 text-[var(--body)]">
                Strong session. The day rewarded patience more than activity, and the
                biggest winner did most of the heavy lifting. Keep looking for the
                moments where volume, direction, and entry location line up before
                adding risk.
              </p>
              <div className="mt-10 rounded-md bg-[var(--panel)] p-7">
                <div className="flex justify-between font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
                  <span>Daily P&amp;L</span>
                  <span className="text-[var(--green)]">+$546.69</span>
                </div>
                <div className="mt-20 h-36">
                  <svg viewBox="0 0 640 160" className="h-full w-full" role="img" aria-label="Daily P&L chart preview">
                    <line x1="0" y1="112" x2="640" y2="112" stroke="rgba(255,255,255,.14)" strokeDasharray="5 6" />
                    <path
                      d="M0 112 L72 102 L132 116 L210 92 L282 98 L360 72 L448 82 L520 42 L640 26 L640 112 L0 112 Z"
                      fill="rgba(29,178,107,.22)"
                    />
                    <path
                      d="M0 112 L72 102 L132 116 L210 92 L282 98 L360 72 L448 82 L520 42 L640 26"
                      fill="none"
                      stroke="var(--green)"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <aside className="pt-24 font-mono text-lg">
              <div className="space-y-5">
                <div className="flex justify-between gap-8">
                  <span>CUPR</span>
                  <span className="text-[var(--green)]">+$305.53</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>RGNT</span>
                  <span className="text-[var(--green)]">+$120.00</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>MTEN</span>
                  <span className="text-[var(--red)]">-$105.00</span>
                </div>
              </div>
              <div className="mt-12 border-t border-[var(--border)] pt-8 text-[var(--muted)]">
                <div className="flex justify-between gap-8">
                  <span>Accuracy</span>
                  <span className="text-[var(--foreground)]">75%</span>
                </div>
                <div className="mt-3 flex justify-between gap-8">
                  <span>P&amp;L</span>
                  <span className="text-[var(--green)]">+$546.69</span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
