"use client";

import Link from "next/link";
import { useState } from "react";
import { PnlSeriesChart, type PnlSeries } from "@/components/CumulativePnlChart";

type RecapStatus = "ready" | "generating" | "generated";

const pnlSeries: PnlSeries = {
  trades: 6,
  points: [
    { label: "09:06", value: -0.48 },
    { label: "09:18", value: -4.1 },
    { label: "09:31", value: -7.54 },
    { label: "09:47", value: -6.2 },
    { label: "10:02", value: 9.72 },
    { label: "10:20", value: 13.97 },
    { label: "10:34", value: 35.48 },
  ],
};

const tickerRows = [
  { symbol: "SMX", pnl: "+$21.48", tone: "positive", notes: "1 ticker note" },
  { symbol: "FCUV", pnl: "+$14.96", tone: "positive", notes: "No note" },
  { symbol: "PFSA", pnl: "-$0.96", tone: "negative", notes: "1 trade note" },
] as const;

const inputs = [
  {
    label: "Trade facts",
    value: "6 trades · 14 fills",
    detail: "Executions normalized and ready",
    status: "Ready",
  },
  {
    label: "Playbook",
    value: "Momentum playbook · v12",
    detail: "3 setups · 8 active rules",
    status: "Loaded",
  },
  {
    label: "Trader context",
    value: "4 notes available",
    detail: "1 day · 2 ticker · 1 trade",
    status: "Parsed",
  },
] as const;

const alignment = [
  { label: "Setup selection", value: "Strong", tone: "positive" },
  { label: "Entry quality", value: "Mixed", tone: "warning" },
  { label: "Risk definition", value: "Unknown", tone: "neutral" },
  { label: "Exit management", value: "Strong", tone: "positive" },
] as const;

const moments = [
  {
    type: "Key trade",
    symbol: "SMX",
    meta: "09:49–10:34 · +$21.48",
    why: "Waited for confirmation, then gave the move room after the first partial.",
    source: "Ticker note + executions",
  },
  {
    type: "Coach question",
    symbol: "PFSA",
    meta: "09:43–09:44 · -$6.52 trade",
    why: "The loss was small, but the note does not say whether the early entry followed your plan.",
    source: "Trade note + playbook gap",
  },
  {
    type: "Pattern to confirm",
    symbol: "SMX + FCUV",
    meta: "2 patient holds · +$36.44",
    why: "Both winners followed confirmation. One day is not enough to call this a durable edge.",
    source: "Executions + 30-day baseline",
  },
] as const;

function toneClass(tone: "positive" | "negative" | "warning" | "neutral") {
  if (tone === "positive") return "text-[var(--green)]";
  if (tone === "negative") return "text-[var(--red)]";
  if (tone === "warning") return "text-[#d5a34f]";
  return "text-[var(--muted)]";
}

export default function CoachRecapSpinePrototype() {
  const [status, setStatus] = useState<RecapStatus>("ready");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [answerApplied, setAnswerApplied] = useState(false);

  function generateRecap() {
    setStatus("generating");
    window.setTimeout(() => setStatus("generated"), 650);
  }

  function resetRecap() {
    setStatus("ready");
    setEvidenceOpen(false);
    setAnswer("");
    setAnswerApplied(false);
  }

  function applyAnswer() {
    if (!answer.trim()) return;
    setAnswerApplied(true);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--body)]">
      <div className="mx-auto w-full max-w-6xl px-5 py-7 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-[var(--hairline)] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/review/journal"
              className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--blue)] hover:text-[var(--foreground)]"
            >
              Review hub
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.025em] text-[var(--foreground)]">
              Coach recap spine
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--body)]">
              One recap structure with progressive evidence. Notes stay where they were written;
              the coach pulls them into the review only as context.
            </p>
          </div>
          <div className="flex items-center gap-2" aria-label="Prototype state">
            <StateButton active={status !== "generated"} onClick={resetRecap}>
              Ready to generate
            </StateButton>
            <StateButton active={status === "generated"} onClick={() => setStatus("generated")}>
              Generated recap
            </StateButton>
          </div>
        </header>

        <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[#090d13] shadow-[0_28px_90px_rgba(0,0,0,.28)]">
          <nav className="flex items-center gap-7 border-b border-[var(--hairline)] px-5 py-4 text-sm md:px-7" aria-label="Prototype navigation">
            <span className="font-semibold text-[var(--foreground)]">Trading Journal AI</span>
            <span className="hidden text-[var(--muted)] md:inline">Dashboard</span>
            <span className="hidden text-[var(--foreground)] md:inline">Journal</span>
            <span className="hidden text-[var(--muted)] md:inline">Trades</span>
            <span className="hidden text-[var(--muted)] md:inline">Playbook</span>
            <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Paper account
            </span>
          </nav>

          <div className="mx-auto max-w-[1000px] px-5 py-8 md:px-8 md:py-10">
            <div className="flex flex-col gap-4 border-b border-[var(--hairline)] pb-7 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)] md:text-[38px]">
                    Monday, April 6
                  </h2>
                  <span className="font-mono text-xl font-semibold tabular-nums text-[var(--green)]">
                    +$35.48
                  </span>
                </div>
                <p className="mt-3 font-mono text-[12px] tracking-[0.04em] text-[var(--muted)]">
                  6 trades&nbsp;&nbsp;·&nbsp;&nbsp;14 fills&nbsp;&nbsp;·&nbsp;&nbsp;67% win&nbsp;&nbsp;·&nbsp;&nbsp;PF 5.71
                </p>
              </div>
              {status === "generated" ? (
                <button
                  type="button"
                  onClick={resetRecap}
                  className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--body)] hover:border-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
                >
                  Regenerate
                </button>
              ) : null}
            </div>

            {status === "ready" || status === "generating" ? (
              <ReadyToGenerate status={status} onGenerate={generateRecap} />
            ) : (
              <GeneratedRecap
                answer={answer}
                answerApplied={answerApplied}
                evidenceOpen={evidenceOpen}
                onAnswerChange={(value) => {
                  setAnswer(value);
                  setAnswerApplied(false);
                }}
                onApplyAnswer={applyAnswer}
                onToggleEvidence={() => setEvidenceOpen((open) => !open)}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ReadyToGenerate({ status, onGenerate }: { status: RecapStatus; onGenerate: () => void }) {
  const loading = status === "generating";

  return (
    <div className="py-8">
      <div className="max-w-2xl">
        <Eyebrow>Coach preparation</Eyebrow>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--foreground)] md:text-3xl">
          The coach has enough context to review this session.
        </h3>
        <p className="mt-3 text-[15px] leading-7 text-[var(--body)]">
          Trade facts are ready, your current playbook is loaded, and notes from the day,
          tickers, and selected trades will be cited as context. Generate the recap when
          you are ready to synthesize the feedback.
        </p>
      </div>

      <div className="mt-8 border-y border-[var(--hairline)]">
        {inputs.map((input) => (
          <div
            key={input.label}
            className="grid gap-2 border-b border-[var(--hairline)] py-5 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              {input.label}
            </span>
            <div>
              <div className="text-sm font-medium text-[var(--foreground)]">{input.value}</div>
              <div className="mt-1 text-xs text-[var(--muted)]">{input.detail}</div>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--green)]">
              {input.status}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-4 rounded-lg border border-[rgba(88,166,255,.28)] bg-[rgba(88,166,255,.045)] p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium text-[var(--foreground)]">Generate a coach recap</div>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            The coach explains what happened, checks it against your playbook, and asks only
            for context that could change the judgment.
          </p>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="h-11 flex-none rounded-md bg-[var(--blue)] px-5 text-sm font-semibold text-[#06101c] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
        >
          {loading ? "Generating recap…" : "Generate recap"}
        </button>
      </div>
    </div>
  );
}

function GeneratedRecap({
  answer,
  answerApplied,
  evidenceOpen,
  onAnswerChange,
  onApplyAnswer,
  onToggleEvidence,
}: {
  answer: string;
  answerApplied: boolean;
  evidenceOpen: boolean;
  onAnswerChange: (value: string) => void;
  onApplyAnswer: () => void;
  onToggleEvidence: () => void;
}) {
  return (
    <div className="py-8">
      <section className="border-l-2 border-[var(--green)] pl-5 md:pl-7">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>Coach recap</Eyebrow>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Low confidence · small sample
          </span>
        </div>
        <h3 className="mt-4 max-w-3xl text-3xl font-semibold leading-[1.16] tracking-[-0.03em] text-[var(--foreground)] md:text-[42px]">
          Green result. The cleaner signal was patience—not broad execution quality.
        </h3>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--body)]">
          SMX and FCUV carried the session after an early dip. Both winners waited for
          confirmation and were given room to work. PFSA was the only losing ticker, but its
          impact was too small to explain the day.
        </p>
        <p className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">
          Sources: executions · playbook v12 · day note · 2 ticker notes · 1 trade note
        </p>
      </section>

      <section className="mt-8 grid overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <h4 className="text-sm font-semibold text-[var(--foreground)]">Daily cumulative P&amp;L</h4>
            <span className="font-mono text-sm font-semibold text-[var(--green)]">+$35.48</span>
          </div>
          <div className="mt-3">
            <PnlSeriesChart series={pnlSeries} period="day" splitTone filled />
          </div>
        </div>
        <aside className="border-t border-[var(--hairline)] p-5 lg:border-l lg:border-t-0">
          <Eyebrow>By ticker</Eyebrow>
          <div className="mt-3">
            {tickerRows.map((ticker) => (
              <div key={ticker.symbol} className="border-b border-[var(--hairline)] py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-4 font-mono text-sm">
                  <span className="text-[var(--foreground)]">{ticker.symbol}</span>
                  <span className={toneClass(ticker.tone)}>{ticker.pnl}</span>
                </div>
                <div className="mt-1 text-[11px] text-[var(--muted)]">{ticker.notes}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-[var(--hairline)] pt-4 font-mono text-xs text-[var(--muted)]">
            <StatRow label="Accuracy" value="67%" />
            <StatRow label="Profit factor" value="5.71" />
          </div>
        </aside>
      </section>

      <section className="mt-5 border-y border-[var(--hairline)] py-5">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          <Eyebrow>Playbook alignment</Eyebrow>
          <span className="text-xs text-[var(--muted)]">Today’s execution against your current rules.</span>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {alignment.map((item) => (
            <div key={item.label} className="border-l border-[var(--hairline)] pl-4 first:border-l-0 first:pl-0">
              <div className="text-xs text-[var(--muted)]">{item.label}</div>
              <div className={`mt-2 text-lg font-medium ${toneClass(item.tone)}`}>{item.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] pb-3">
          <div>
            <Eyebrow>Moments that shaped the recap</Eyebrow>
            <h4 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Review the signal, not every trade.</h4>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] md:block">
            3 prioritized
          </span>
        </div>
        <div>
          {moments.map((moment, index) => (
            <div
              key={moment.type}
              className="grid gap-4 border-b border-[var(--hairline)] py-5 md:grid-cols-[36px_190px_minmax(0,1fr)_190px] md:items-start"
            >
              <span className="font-mono text-xs text-[var(--muted)]">0{index + 1}</span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--blue)]">{moment.type}</div>
                <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">{moment.symbol}</div>
                <div className="mt-1 font-mono text-[11px] text-[var(--muted)]">{moment.meta}</div>
              </div>
              <p className="text-sm leading-6 text-[var(--body)]">{moment.why}</p>
              <div className="font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-[var(--muted)]">
                {moment.source}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-lg border border-[rgba(88,166,255,.28)] bg-[rgba(88,166,255,.04)] p-5 md:p-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <Eyebrow>Coach needs one answer</Eyebrow>
            <h4 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              Did the PFSA entry follow your planned trigger?
            </h4>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--body)]">
              The executions show an early entry, but the note does not say whether it was intentional.
              Your answer determines whether this was normal variance or a process miss.
            </p>
            <label htmlFor="coach-answer" className="mt-5 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Your answer
            </label>
            <textarea
              id="coach-answer"
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              placeholder="Add the context the trade data cannot know…"
              className="mt-2 min-h-24 w-full resize-y rounded-md border border-[var(--border)] bg-[#080c12] px-3 py-3 text-sm leading-6 text-[var(--foreground)] outline-none placeholder:text-[var(--faint)] focus:border-[var(--blue)]"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onApplyAnswer}
                disabled={!answer.trim()}
                className="h-10 rounded-md bg-[var(--blue)] px-4 text-sm font-semibold text-[#06101c] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
              >
                Update recap
              </button>
              <span className="text-xs text-[var(--muted)]">Saved back to the PFSA trade context.</span>
            </div>
          </div>
          <aside className="border-t border-[var(--hairline)] pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <Eyebrow>Why this matters</Eyebrow>
            <p className="mt-3 text-sm leading-6 text-[var(--body)]">
              If the trigger was valid, the coach should reinforce loss acceptance. If it was anticipated,
              the coach should mark entry quality as mixed and adjust the experiment.
            </p>
            {answerApplied ? (
              <div className="mt-5 border-t border-[var(--hairline)] pt-4 text-sm leading-6 text-[var(--green)]">
                Answer applied. The recap now treats PFSA as a planned loss and reinforces the stop discipline.
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mt-8 border-y border-[var(--hairline)] py-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
          <div>
            <Eyebrow>Carry forward</Eyebrow>
            <h4 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Wait for confirmation before the first probe.</h4>
          </div>
          <button type="button" className="text-left text-sm font-medium text-[var(--blue)] hover:text-[var(--foreground)]">
            Carry to dashboard
          </button>
        </div>
        <div className="mt-5 grid gap-5 text-sm md:grid-cols-4">
          <ExperimentCell label="Trigger" value="First setup appears before a valid expansion." />
          <ExperimentCell label="Action" value="Wait for the first confirmed range break before entering." />
          <ExperimentCell label="Expires" value="At the next session close." />
          <ExperimentCell label="Measure" value="Avoided loss and missed opportunity." />
        </div>
      </section>

      <section className="mt-5">
        <button
          type="button"
          onClick={onToggleEvidence}
          aria-expanded={evidenceOpen}
          className="flex w-full items-center justify-between border-b border-[var(--hairline)] py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]"
        >
          <span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--foreground)]">Evidence drawer</span>
            <span className="ml-3 text-xs text-[var(--muted)]">Advanced analytics and calculation provenance</span>
          </span>
          <span className="font-mono text-xs text-[var(--blue)]">{evidenceOpen ? "Close" : "Open"}</span>
        </button>
        {evidenceOpen ? <EvidenceDetails /> : null}
      </section>
    </div>
  );
}

function EvidenceDetails() {
  return (
    <div className="grid gap-6 border-b border-[var(--hairline)] py-6 md:grid-cols-3">
      <EvidenceGroup
        title="Robustness"
        rows={[
          ["Distribution", "Broad green"],
          ["Trim-1 retention", "82%"],
          ["Trim-5 retention", "36%"],
        ]}
      />
      <EvidenceGroup
        title="Economics"
        rows={[
          ["Breakeven WR margin", "+7.3 pp"],
          ["Payoff ratio", "2.41"],
          ["Expectancy", "+$5.91 / trade"],
        ]}
      />
      <EvidenceGroup
        title="Trend vote"
        rows={[
          ["Win rate", "+1"],
          ["Profit factor", "+1"],
          ["Net / session", "0"],
          ["Result", "Mixed · 2 of 4"],
        ]}
      />
    </div>
  );
}

function EvidenceGroup({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div>
      <Eyebrow>{title}</Eyebrow>
      <div className="mt-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-[var(--hairline)] py-2 text-xs last:border-b-0">
            <span className="text-[var(--muted)]">{label}</span>
            <span className="font-mono text-[var(--foreground)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)] ${
        active
          ? "border-[rgba(88,166,255,.5)] bg-[rgba(88,166,255,.08)] text-[var(--foreground)]"
          : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
      {children}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span>{label}</span>
      <span className="text-[var(--foreground)]">{value}</span>
    </div>
  );
}

function ExperimentCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--hairline)] pl-4 first:border-l-0 first:pl-0">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]">{label}</div>
      <p className="mt-2 leading-6 text-[var(--body)]">{value}</p>
    </div>
  );
}
