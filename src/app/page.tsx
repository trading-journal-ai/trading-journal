import Link from "next/link";

const githubUrl = "https://github.com/trading-journal-ai/trading-journal";

const reviewSteps = [
  {
    number: "01",
    title: "Daily recap",
    body: "The day starts with a human recap: market read, execution quality, what worked, and what to carry forward.",
  },
  {
    number: "02",
    title: "Ticker review",
    body: "Charts, P&L, and trades sit beside the note so you can review the evidence without losing the story.",
  },
  {
    number: "03",
    title: "Trade note",
    body: "When a trade deserves attention, add a focused note and tag the behavior, emotion, or setup behind it.",
  },
];

const localCards = [
  {
    icon: "monitor",
    title: "On your machine",
    body: "Everything lives in a local SQLite file in your project folder. Stopping the app never touches your entries.",
  },
  {
    icon: "lock",
    title: "Private by default",
    body: "Your broker exports and notes are gitignored. Trade data stays yours unless you intentionally deploy or share it.",
  },
  {
    icon: "help",
    title: "No subscription",
    body: "No hosted account, no monthly fee, no signup. Reflection that does not depend on someone else's server.",
  },
  {
    icon: "github",
    title: "Open source · MIT",
    body: "Built in the open. Download it, fork it, run it, or use it as the starting point for your own journal.",
  },
];

const installCommand = `git clone https://github.com/trading-journal-ai/trading-journal.git
cd trading-journal
./install-trading-journal.sh`;

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#0b0d12] text-[var(--foreground)]">
      <SiteHeader />

      <main>
        <Hero />
        <ValueBand />
        <ReviewHabit />
        <CoachSection />
        <LocalFirstSection />
        <GetStartedSection />
      </main>

      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--hairline)] bg-[#0b0d12]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center justify-between px-6 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-[15px] font-semibold">
          <span className="size-2 rounded-full bg-[var(--green)] shadow-[0_0_14px_rgba(29,178,107,.35)]" />
          <span>Trading Journal AI</span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-5 text-[13px] font-medium text-[var(--muted)] md:gap-7">
          <a href="#review" className="hidden transition-colors hover:text-[var(--foreground)] md:inline">
            The review habit
          </a>
          <a href="#coach" className="hidden transition-colors hover:text-[var(--foreground)] md:inline">
            AI coach
          </a>
          <a href="#local" className="hidden transition-colors hover:text-[var(--foreground)] lg:inline">
            Local-first
          </a>
          <a
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
            className="hidden items-center gap-2 transition-colors hover:text-[var(--foreground)] sm:inline-flex"
          >
            <GitHubIcon />
            GitHub
          </a>
          <Link
            href="/demo"
            className="inline-flex h-9 items-center rounded-md bg-[var(--foreground)] px-4 text-[13px] font-semibold text-[#0b0d12] transition-opacity hover:opacity-90"
          >
            View the demo
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-16 md:px-8 md:pb-20 md:pt-24">
      <div className="max-w-[820px]">
        <SectionEyebrow className="text-[var(--green)]">
          Local-first trading journal · Open source
        </SectionEyebrow>
        <h1 className="mt-7 max-w-[800px] text-[54px] font-semibold leading-[1.02] md:text-[72px]">
          A journal-first trading review system.
        </h1>
        <p className="mt-8 max-w-[760px] text-[24px] font-medium leading-snug text-[var(--body)] md:text-[32px]">
          Review faster. Understand your patterns. Refine your trading process.
        </p>
        <p className="mt-6 max-w-[680px] text-lg leading-8 text-[var(--muted)] md:text-xl">
          Trading Journal AI brings notes, charts, P&amp;L, tags, and coaching into
          one journal-first workflow, so the data supports reflection instead of
          replacing it.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <PrimaryButton href="/demo">View the live demo</PrimaryButton>
          <GhostButton href={githubUrl}>
            <GitHubIcon />
            View on GitHub
          </GhostButton>
        </div>
        <p className="mt-6 font-mono text-sm text-[var(--muted)]">
          No signup · No subscription · Your data stays on your machine
        </p>
      </div>

      <div className="mt-20">
        <StepRail />
        <BrowserFrame>
          <DailyJournalPreview />
        </BrowserFrame>
      </div>
    </section>
  );
}

function ValueBand() {
  return (
    <section className="border-y border-[var(--hairline)]">
      <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-16">
        <h2 className="max-w-[520px] text-[32px] font-semibold leading-tight md:text-[40px]">
          Reflection first. Data where it helps.
        </h2>
        <p className="max-w-[680px] text-lg leading-8 text-[var(--muted)]">
          Most trading journals start with a table. This one starts with the review
          habit: write the recap, see the day in context, and open the trade evidence
          only when it helps you understand what happened.
        </p>
      </div>
    </section>
  );
}

function ReviewHabit() {
  return (
    <section id="review" className="scroll-mt-28">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-24 md:px-8">
        <div className="max-w-[760px]">
          <SectionEyebrow>The review habit</SectionEyebrow>
          <h2 className="mt-5 text-[38px] font-semibold leading-tight md:text-[52px]">
            A calmer way to read your trading day.
          </h2>
          <p className="mt-6 max-w-[660px] text-lg leading-8 text-[var(--muted)]">
            The journal gives your recap, ticker review, and trade note a clear place
            in the same flow. The result feels more like a record you can revisit and
            less like data you have to sort through again.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {reviewSteps.map((step) => (
            <article key={step.number} className="border-t border-[var(--border)] pt-5">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-sm text-[var(--green)]">{step.number}</span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="mt-4 text-base leading-7 text-[var(--muted)]">{step.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div>
            <p className="font-mono text-sm text-[var(--green)]">01 · See the day in context</p>
            <h3 className="mt-4 text-2xl font-semibold">The recap leads, the data follows.</h3>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Open a day and the written recap sits first: market read, execution,
              lesson, and what stood out. The P&amp;L chart and ticker list are nearby,
              but they support the note instead of becoming the whole experience.
            </p>
          </div>
          <PreviewPanel>
            <DayContextMock />
          </PreviewPanel>
        </div>

        <div className="mt-20 grid gap-12 border-t border-[var(--hairline)] pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <PreviewPanel>
            <TradeNoteMock />
          </PreviewPanel>
          <div>
            <p className="font-mono text-sm text-[var(--green)]">02 · Capture it in seconds</p>
            <h3 className="mt-4 text-2xl font-semibold">Tag the trade in your own language.</h3>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Add a short note, then use consistent labels for quality, process, and
              emotion. Over time, the journal becomes a searchable memory of the
              habits that move your trading forward or hold it back.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CoachSection() {
  return (
    <section id="coach" className="scroll-mt-28 border-y border-[var(--hairline)] bg-[var(--surface)]">
      <div className="mx-auto grid w-full max-w-[1200px] gap-14 px-6 py-24 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <SparkIcon />
            <SectionEyebrow className="text-[var(--blue)]">The AI in Trading Journal AI</SectionEyebrow>
            <span className="rounded border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--muted)]">
              Preview
            </span>
          </div>
          <h2 className="mt-5 text-[38px] font-semibold leading-tight md:text-[52px]">
            A coach that grades against <span className="text-[var(--blue)]">your</span> rules.
          </h2>
          <p className="mt-6 max-w-[620px] text-lg leading-8 text-[var(--muted)]">
            First you codify what an A+ trade looks like: the entry, risk, and process
            criteria you already track as pills. Then the coach reads every imported
            trade against that standard, flags where you drifted, and drafts the note
            and recap in your voice.
          </p>
          <div className="mt-10 space-y-7">
            {[
              ["01", "Codify your edge", "Turn your process pills into the rubric the coach grades by."],
              ["02", "Review against it", "Each trade gets read against your own criteria, not generic advice."],
              ["03", "Draft, never auto-post", "The coach proposes the note and recap; you always edit before it saves."],
            ].map(([number, title, body]) => (
              <div key={number} className="grid grid-cols-[32px_1fr] gap-4">
                <span className="font-mono text-sm text-[var(--blue)]">{number}</span>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-base leading-7 text-[var(--muted)]">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-12 font-mono text-sm text-[var(--faint)]">
            Concept preview · runs on your trades, on your machine.
          </p>
        </div>
        <CoachCard />
      </div>
    </section>
  );
}

function LocalFirstSection() {
  return (
    <section id="local" className="scroll-mt-28">
      <div className="mx-auto grid w-full max-w-[1200px] gap-14 px-6 py-24 md:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <SectionEyebrow className="text-[var(--green)]">Local-first</SectionEyebrow>
          <h2 className="mt-5 text-[38px] font-semibold leading-tight md:text-[52px]">
            Your trading day stays on your machine.
          </h2>
          <p className="mt-8 max-w-[620px] text-lg leading-8 text-[var(--muted)]">
            It&apos;s the first thing serious traders ask about, and the answer is simple.
            A trading journal holds some of your most sensitive records: account
            history, positions, timestamps. Trading Journal AI is a personal tool,
            not a hosted service. It runs locally and stores everything on disk, so
            your review habit stays completely private.
          </p>
          <Link
            href="#get-started"
            className="mt-10 inline-flex items-center gap-3 font-semibold text-[var(--blue)] transition-opacity hover:opacity-80"
          >
            Read how it works
            <ArrowRight className="ml-0" />
          </Link>
        </div>
        <div className="grid overflow-hidden rounded-md border border-[var(--border)] bg-[#0b0d12]/40 md:grid-cols-2">
          {localCards.map((card, index) => (
            <article
              key={card.title}
              className={[
                "min-h-[240px] p-7 md:p-8",
                index % 2 === 0 ? "md:border-r md:border-[var(--border)]" : "",
                index < 2 ? "border-b border-[var(--border)]" : "",
              ].join(" ")}
            >
              <LocalCardIcon icon={card.icon} />
              <h3 className="mt-8 text-lg font-semibold">{card.title}</h3>
              <p className="mt-5 max-w-[310px] text-base leading-7 text-[var(--muted)]">{card.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GetStartedSection() {
  return (
    <section id="get-started" className="scroll-mt-28 border-t border-[var(--hairline)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-24 text-center md:px-8">
        <SectionEyebrow>Get started</SectionEyebrow>
        <h2 className="mx-auto mt-5 max-w-[760px] text-[38px] font-semibold leading-tight md:text-[52px]">
          Try the demo, or run your own journal locally.
        </h2>
        <p className="mx-auto mt-6 max-w-[620px] text-lg leading-8 text-[var(--muted)]">
          Explore the hosted demo with seeded trades and journal notes, or clone the
          repo and start a private local journal with your own broker CSV.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <PrimaryButton href="/demo">View the live demo</PrimaryButton>
          <GhostButton href={githubUrl}>
            <GitHubIcon />
            View on GitHub
          </GhostButton>
        </div>
        <div className="mx-auto mt-10 max-w-[680px] rounded-md border border-[var(--border)] bg-[var(--surface)] p-5 text-left">
          <pre className="overflow-x-auto font-mono text-sm leading-7 text-[var(--body)]">
            <code>{installCommand}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--hairline)]">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-8 font-mono text-xs text-[var(--muted)] md:flex-row md:items-center md:justify-between md:px-8">
        <span>Trading Journal AI · trading-journal.ai</span>
        <div className="flex gap-6">
          <Link href="/demo" className="transition-colors hover:text-[var(--foreground)]">
            Demo
          </Link>
          <a
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
            className="transition-colors hover:text-[var(--foreground)]"
          >
            GitHub
          </a>
          <span>MIT License</span>
        </div>
      </div>
    </footer>
  );
}

function StepRail() {
  return (
    <div className="mb-6 grid gap-5 md:grid-cols-3">
      {[
        ["01", "Daily recap", "The recap leads: market read, execution, lesson."],
        ["02", "Ticker review", "Trades, charts, and P&L stay in context."],
        ["03", "Trade note", "Capture the behavior behind the result."],
      ].map(([number, title, body], index) => (
        <div key={number} className="border-t border-[var(--border)] pt-4">
          <div className={index === 0 ? "h-0.5 -translate-y-[17px] bg-[var(--green)]" : "h-0.5 -translate-y-[17px] bg-transparent"} />
          <div className="flex items-baseline gap-3">
            <span className={index === 0 ? "font-mono text-xs text-[var(--green)]" : "font-mono text-xs text-[var(--faint)]"}>
              {number}
            </span>
            <h2 className={index === 0 ? "text-base font-semibold" : "text-base font-semibold text-[var(--muted)]"}>
              {title}
            </h2>
          </div>
          <p className={index === 0 ? "mt-3 text-sm leading-6 text-[var(--body)]" : "mt-3 text-sm leading-6 text-[var(--faint)]"}>
            {body}
          </p>
        </div>
      ))}
    </div>
  );
}

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/35">
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-[var(--red)]" />
          <span className="size-3 rounded-full bg-[#f5b83d]" />
          <span className="size-3 rounded-full bg-[var(--green)]" />
        </div>
        <div className="hidden rounded-md border border-black/40 bg-black/35 px-4 py-1 font-mono text-xs text-[var(--muted)] sm:block">
          trading-journal.ai/demo
        </div>
        <div className="w-12" />
      </div>
      {children}
    </section>
  );
}

function DailyJournalPreview() {
  return (
    <div className="min-h-[520px] bg-[#0d121a]">
      <div className="flex items-center gap-8 border-b border-[var(--hairline)] px-7 py-5">
        <span className="text-lg font-semibold">Trading Journal</span>
        <span className="text-sm font-medium text-[var(--muted)]">Calendar</span>
        <span className="text-sm font-semibold">Journal</span>
        <span className="text-sm font-medium text-[var(--muted)]">Trades</span>
        <span className="text-sm font-medium text-[var(--muted)]">Reports</span>
      </div>
      <div className="grid gap-10 p-7 md:grid-cols-[1fr_270px] md:p-10">
        <div>
          <p className="font-mono text-sm font-semibold text-[var(--muted)]">
            Week 2 · June 8 - 12 2026
          </p>
          <div className="mt-9 flex items-baseline gap-4">
            <span className="size-2.5 rounded-full bg-[var(--green)]" />
            <h3 className="text-[40px] font-semibold leading-none">June 11</h3>
            <span className="font-mono text-lg text-[var(--muted)]">Thursday</span>
          </div>
          <p className="mt-7 max-w-[700px] text-lg leading-8 text-[var(--body)]">
            Strong session. The day rewarded patience more than activity, and the
            biggest winner did most of the heavy lifting. Keep looking for the moments
            where volume, direction, and entry location line up before adding risk.
          </p>
          <div className="mt-10 rounded-md bg-[var(--panel)] p-7">
            <PnlSparkline />
          </div>
        </div>
        <aside className="pt-28 font-mono text-lg">
          <TickerList />
          <div className="mt-12 border-t border-[var(--border)] pt-7 text-[var(--muted)]">
            <div className="flex justify-between gap-8">
              <span>Accuracy</span>
              <span className="text-[var(--foreground)]">75%</span>
            </div>
            <div className="mt-3 flex justify-between gap-8">
              <span>Profit Factor</span>
              <span className="text-[var(--foreground)]">2.42</span>
            </div>
            <div className="mt-3 flex justify-between gap-8">
              <span>P&amp;L</span>
              <span className="text-[var(--green)]">+$546.69</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DayContextMock() {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_180px]">
      <div>
        <div className="flex items-baseline gap-4">
          <span className="size-2.5 rounded-full bg-[var(--green)]" />
          <h4 className="text-3xl font-semibold">June 11</h4>
          <span className="font-mono text-[var(--muted)]">Thursday</span>
        </div>
        <p className="mt-6 text-base leading-7 text-[var(--body)]">
          Strong session. I stayed patient while the best trade did most of the work.
          Review the weaker entry, but keep the main lesson simple: wait for volume,
          direction, and entry location to line up.
        </p>
        <div className="mt-8 rounded-md bg-[var(--panel)] p-5">
          <PnlSparkline compact />
        </div>
      </div>
      <div className="pt-24 font-mono text-sm">
        <TickerList compact />
      </div>
    </div>
  );
}

function TradeNoteMock() {
  return (
    <div>
      <p className="font-mono text-[13px] font-semibold uppercase text-[var(--muted)]">
        Trade note
      </p>
      <div className="mt-6 rounded-md border border-dashed border-[#2a3950] p-5">
        <p className="font-mono text-base font-semibold text-[var(--blue)]">
          + Add a trade note
        </p>
        <p className="mt-4 max-w-[440px] text-sm leading-6 text-[var(--muted)]">
          Setup quality, execution, rules followed or broken, emotions, and what to
          remember next time.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {[
          ["Best setup", "green"],
          ["Patient", "green"],
          ["Let winner work", "green"],
          ["Took profits early", "red"],
        ].map(([tag, tone]) => (
          <span
            key={tag}
            className="rounded-md border border-[var(--border)] px-3 py-1 font-mono text-xs text-[var(--body)]"
          >
            <span className={tone === "green" ? "text-[var(--green)]" : "text-[var(--red)]"}>•</span>{" "}
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function CoachCard() {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[#0f141c] p-7 md:p-8">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-2 font-mono text-sm font-semibold uppercase text-[var(--blue)]">
          <SparkIcon />
          <span>Coach review</span>
          <span className="text-[var(--faint)]">· NPT · Trade 1</span>
        </div>
        <span className="text-2xl font-semibold text-[var(--green)]">A-</span>
      </div>
      <div className="mt-9 font-mono text-[13px] font-semibold uppercase text-[var(--faint)]">
        Read against your rules
      </div>
      <div className="mt-6 space-y-5">
        {[
          ["pass", "Waited for confirmation", "Entry after the reclaim held"],
          ["pass", "Sized to plan", "10 sh · within your risk"],
          ["pass", "Let the winner work", "Added on the first pullback"],
          ["warn", "Took profits early", "Trimmed half before your 2R target"],
        ].map(([status, title, body]) => (
          <div key={title} className="grid grid-cols-[28px_1fr] items-start gap-3">
            <span
              className={
                status === "pass"
                  ? "grid size-5 place-items-center rounded-full bg-[rgba(29,178,107,.18)] text-[var(--green)]"
                  : "grid size-5 place-items-center rounded-full bg-[rgba(255,91,76,.18)] text-[var(--red)]"
              }
            >
              {status === "pass" ? "✓" : "!"}
            </span>
            <p className="text-base leading-6">
              <span className="font-semibold">{title}</span>{" "}
              <span className="text-[var(--muted)]">{body}</span>
            </p>
          </div>
        ))}
      </div>
      <div className="mt-9 border-t border-[var(--border)] pt-7">
        <p className="text-lg leading-8 text-[var(--body)]">
          “Your highest-quality entry this week. The only drift was trimming early,
          the same pattern flagged Tuesday. Worth sizing the runner next time.”
        </p>
      </div>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]"
        >
          <SparkIcon />
          Use as note draft
        </button>
        <p className="font-mono text-xs text-[var(--faint)]">You always edit before it saves</p>
      </div>
    </div>
  );
}

function PnlSparkline({ compact = false }: { compact?: boolean }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-sm font-semibold uppercase text-[var(--muted)]">
        <span>Daily P&amp;L</span>
        <span className="text-[var(--green)]">+$546.69</span>
      </div>
      <svg
        viewBox="0 0 640 170"
        className={compact ? "mt-12 h-32 w-full" : "mt-20 h-40 w-full"}
        role="img"
        aria-label="Daily P&L chart preview"
      >
        <line x1="0" y1="116" x2="640" y2="116" stroke="rgba(255,255,255,.14)" strokeDasharray="5 6" />
        <path
          d="M0 116 L70 104 L132 120 L210 92 L282 100 L360 72 L448 82 L520 42 L640 24 L640 116 L0 116 Z"
          fill="rgba(29,178,107,.22)"
        />
        <path
          d="M0 116 L70 104 L132 120 L210 92 L282 100 L360 72 L448 82 L520 42 L640 24"
          fill="none"
          stroke="var(--green)"
          strokeWidth="3"
        />
        <text x="0" y="160" fill="var(--muted)" fontSize="13" fontFamily="monospace">10:18</text>
        <text x="300" y="160" fill="var(--muted)" fontSize="13" fontFamily="monospace">13:31</text>
        <text x="600" y="160" fill="var(--muted)" fontSize="13" fontFamily="monospace">15:14</text>
      </svg>
    </div>
  );
}

function TickerList({ compact = false }: { compact?: boolean }) {
  const tickers = [
    ["CUPR", "+$305.53", "green"],
    ["RGNT", "+$120.00", "green"],
    ["JRSH", "+$98.42", "green"],
    ["MTEN", "-$105.00", "red"],
  ];

  return (
    <div className={compact ? "space-y-3" : "space-y-5"}>
      {tickers.map(([ticker, pnl, tone]) => (
        <div key={ticker} className="flex justify-between gap-8">
          <span>{ticker}</span>
          <span className={tone === "green" ? "text-[var(--green)]" : "text-[var(--red)]"}>
            {pnl}
          </span>
        </div>
      ))}
    </div>
  );
}

function PreviewPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-[#111821] p-6 shadow-2xl shadow-black/20">
      {children}
    </div>
  );
}

function SectionEyebrow({
  children,
  className = "text-[var(--muted)]",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`font-mono text-[13px] font-semibold uppercase ${className}`}>
      {children}
    </p>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--foreground)] px-6 text-sm font-semibold text-[#0b0d12] transition-opacity hover:opacity-90"
    >
      {children}
      <ArrowRight />
    </Link>
  );
}

function GhostButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      rel="noreferrer"
      target="_blank"
      className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[var(--border)] px-6 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--muted)] hover:bg-[var(--surface)]"
    >
      {children}
    </a>
  );
}

function ArrowRight({ className = "ml-3" }: { className?: string }) {
  return (
    <svg className={`${className} size-4`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function LocalCardIcon({ icon }: { icon: string }) {
  if (icon === "monitor") {
    return (
      <svg className="size-6 text-[var(--green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </svg>
    );
  }

  if (icon === "lock") {
    return (
      <svg className="size-6 text-[var(--green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (icon === "help") {
    return (
      <svg className="size-6 text-[var(--green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.7 2.7 0 0 1 5.2 1c0 2-2.7 2-2.7 4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  return <GitHubIcon className="size-6 text-[var(--green)]" />;
}

function GitHubIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3" />
      <path d="M15 22v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.7A5.2 5.2 0 0 0 19 5.3a4.9 4.9 0 0 0-.1-3.6s-1.1-.3-3.6 1.4a12.3 12.3 0 0 0-6.6 0C6.2 1.4 5.1 1.7 5.1 1.7A4.9 4.9 0 0 0 5 5.3 5.2 5.2 0 0 0 3.7 8.8c0 5.2 3.2 6.4 6.2 6.7a3.4 3.4 0 0 0-.9 2.6V22" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="size-4 text-[var(--blue)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v5" />
      <path d="M12 17v5" />
      <path d="M4.22 4.22 7.76 7.76" />
      <path d="m16.24 16.24 3.54 3.54" />
      <path d="M2 12h5" />
      <path d="M17 12h5" />
      <path d="m4.22 19.78 3.54-3.54" />
      <path d="m16.24 7.76 3.54-3.54" />
    </svg>
  );
}
