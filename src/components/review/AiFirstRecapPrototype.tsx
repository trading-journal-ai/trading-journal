"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useState } from "react";
import DictationTextarea from "@/components/DictationTextarea";

type ScenarioKey = "controlledRed" | "weakGreen";

type ReviewTrade = {
  id: string;
  time: string;
  symbol: string;
  result: string;
  outcome: "positive" | "negative";
  reason: string;
  read: string;
  context: string;
};

type Scenario = {
  date: string;
  day: string;
  account: string;
  result: string;
  resultTone: "positive" | "negative";
  trades: string;
  verdict: string;
  verdictSummary: string;
  confidence: string;
  strength: { title: string; copy: string; evidence: string };
  leak: { title: string; copy: string; evidence: string };
  focus: { trigger: string; action: string; measure: string };
  driver: {
    title: string;
    copy: string;
    primary: string;
    primaryValue: string;
    primaryWidth: string;
    secondary: string;
    secondaryValue: string;
    secondaryWidth: string;
    secondaryTone: "negative" | "neutral";
  };
  rules: { clean: number; breached: number; unevaluable: number };
  pattern: { title: string; copy: string; activeSessions: number[] };
  reviewQueue: ReviewTrade[];
  defaultSetup: string;
};

const SCENARIOS: Record<ScenarioKey, Scenario> = {
  controlledRed: {
    date: "July 10, 2026",
    day: "Friday",
    account: "Paper account",
    result: "−$4.14",
    resultTone: "negative",
    trades: "10 closed trades",
    verdict: "Controlled red day with one critical mistake",
    verdictSummary:
      "One hard-stop breach on T2 created the main avoidable loss. Outside that event, entries were selective and rule adherence was mostly clean.",
    confidence: "High confidence · 10 trades · 1 critical breach",
    strength: {
      title: "Patience produced the cleanest trades",
      copy: "T4 and T9 waited for confirmation and were the best-managed trades in the session.",
      evidence: "Calculated · T4, T9",
    },
    leak: {
      title: "The first loss changed the next decision",
      copy: "T2 was entered beneath the 200 EMA after T1 and exceeded the hard stop. That is the review that matters first.",
      evidence: "Coach interpretation · T1, T2 · Rule 2",
    },
    focus: {
      trigger: "When momentum fails after the first partial",
      action: "Exit the remainder at planned invalidation. Do not wait for a second expansion.",
      measure: "Track overstays and P&L given back for the next 3 sessions.",
    },
    driver: {
      title: "One stop violation drove most of the loss",
      copy: "T2 accounted for 62% of the net loss. Without it, the other nine trades were close to breakeven.",
      primary: "T2 hard-stop breach",
      primaryValue: "62%",
      secondary: "Remaining nine trades",
      secondaryValue: "38%",
      primaryWidth: "62%",
      secondaryWidth: "38%",
      secondaryTone: "neutral",
    },
    rules: { clean: 8, breached: 1, unevaluable: 1 },
    pattern: {
      title: "Exit targets loosen after the first trade works",
      copy: "This appeared in 3 of the last 5 sessions. The evidence is emerging, not yet a permanent rule.",
      activeSessions: [0, 2, 4],
    },
    reviewQueue: [
      {
        id: "T2",
        time: "07:51",
        symbol: "TKLF",
        result: "−$3.45",
        outcome: "negative",
        reason: "Critical rule breach",
        read: "Entered beneath the 200 EMA after T1 and exceeded the planned stop.",
        context: "Your note: Slightly triggered after the first loss.",
      },
      {
        id: "T9",
        time: "10:12",
        symbol: "JZXN",
        result: "+$1.69",
        outcome: "positive",
        reason: "Best-managed trade",
        read: "Patient entry and staged exit matched the intended scalp plan.",
        context: "Imported + your note",
      },
      {
        id: "T10",
        time: "10:52",
        symbol: "GMM",
        result: "−$0.93",
        outcome: "negative",
        reason: "Exit overstay",
        read: "The original scalp thesis weakened before the 37-minute hold ended.",
        context: "Coach interpretation · chart evidence available",
      },
    ],
    defaultSetup: "Break HOD",
  },
  weakGreen: {
    date: "July 16, 2026",
    day: "Thursday",
    account: "Paper account",
    result: "+$182.40",
    resultTone: "positive",
    trades: "7 closed trades",
    verdict: "Green result, weak process",
    verdictSummary:
      "One outsized winner created more than the net result. Several later entries did not meet the setup standard, even though the day finished green.",
    confidence: "Medium confidence · 7 trades · planned-risk coverage incomplete",
    strength: {
      title: "The opening trade was well selected",
      copy: "The first CRVO entry waited for volume confirmation and was managed inside the original plan.",
      evidence: "Imported + your note · T1",
    },
    leak: {
      title: "The green day hid lower standards later",
      copy: "T4 and T6 were added after the clean move had already extended. Their combined result was negative.",
      evidence: "Coach interpretation · T4, T6",
    },
    focus: {
      trigger: "After a clean opening winner",
      action: "Restate the next valid trigger before taking another entry. A green day is not permission to lower standards.",
      measure: "Track entries taken without a named trigger for the next 3 sessions.",
    },
    driver: {
      title: "One winner masked a weak session",
      copy: "T1 produced 146% of net P&L. The remaining six trades were negative, so the result is not broadly repeatable yet.",
      primary: "T1 opening winner",
      primaryValue: "146% of net",
      secondary: "Remaining six trades",
      secondaryValue: "−46% of net",
      primaryWidth: "100%",
      secondaryWidth: "46%",
      secondaryTone: "negative",
    },
    rules: { clean: 5, breached: 0, unevaluable: 2 },
    pattern: {
      title: "Standards drift after an early green trade",
      copy: "This is a session-only observation until more planned-trigger notes are available.",
      activeSessions: [3],
    },
    reviewQueue: [
      {
        id: "T1",
        time: "07:43",
        symbol: "CRVO",
        result: "+$266.40",
        outcome: "positive",
        reason: "Best process example",
        read: "Waited for confirmation and took the planned staged exit.",
        context: "Your note + calculated evidence",
      },
      {
        id: "T4",
        time: "09:18",
        symbol: "CRVO",
        result: "−$41.50",
        outcome: "negative",
        reason: "Late opportunity",
        read: "The move had already extended and volume was declining at entry.",
        context: "Calculated · chart context",
      },
      {
        id: "T6",
        time: "10:06",
        symbol: "PMAX",
        result: "−$32.50",
        outcome: "negative",
        reason: "Missing intent",
        read: "The execution is visible, but the planned trigger was not recorded.",
        context: "Coach question · add context",
      },
    ],
    defaultSetup: "VWAP reclaim",
  },
};

const SETUPS = ["Break HOD", "Dip", "VWAP reclaim"];

export default function AiFirstRecapPrototype() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("controlledRed");
  const [setup, setSetup] = useState(SCENARIOS.controlledRed.defaultSetup);
  const [context, setContext] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [focusSaved, setFocusSaved] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(SCENARIOS.controlledRed.reviewQueue[0].id);
  const scenario = SCENARIOS[scenarioKey];

  function chooseScenario(nextScenario: ScenarioKey) {
    setScenarioKey(nextScenario);
    setSetup(SCENARIOS[nextScenario].defaultSetup);
    setSelectedTrade(SCENARIOS[nextScenario].reviewQueue[0].id);
    setFocusSaved(false);
  }

  function saveContext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setContext(String(formData.get("context") ?? "").trim());
    setCaptureOpen(false);
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--body)]">
      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-[var(--hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Eyebrow>Clickable prototype</Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              AI-first daily recap
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--prose)]">
              A trader contributes only the context the data cannot know. The Coach gives that context an evidence-backed read, then carries one useful behavior forward.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/review/journal" className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
              Review hub
            </Link>
            <button
              type="button"
              onClick={() => chooseScenario(scenarioKey === "controlledRed" ? "weakGreen" : "controlledRed")}
              className="inline-flex h-10 items-center rounded-md border border-[var(--blue)] bg-[rgba(77,155,255,.1)] px-4 text-sm font-medium text-[var(--blue)] transition-colors hover:bg-[rgba(77,155,255,.16)]"
            >
              Switch scenario
            </button>
          </div>
        </header>

        <section aria-label="Prototype controls" className="mt-6 flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] pb-6">
          <span className="mr-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Review state</span>
          <ChoiceButton active={scenarioKey === "controlledRed"} onClick={() => chooseScenario("controlledRed")}>Controlled red</ChoiceButton>
          <ChoiceButton active={scenarioKey === "weakGreen"} onClick={() => chooseScenario("weakGreen")}>Weak green</ChoiceButton>
        </section>

        <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <section className="border-b border-[var(--hairline)] pb-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <Eyebrow>{scenario.date} · {scenario.day}</Eyebrow>
                  <h2 className="mt-3 max-w-3xl text-2xl font-semibold leading-tight text-[var(--foreground)] md:text-4xl">{scenario.verdict}</h2>
                  <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--body)]">{scenario.verdictSummary}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">Coach interpretation · {scenario.confidence}</p>
                </div>
                <div className="min-w-[150px] border-l border-[var(--hairline)] pl-5">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Net P&amp;L</div>
                  <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneClass(scenario.resultTone)}`}>{scenario.result}</div>
                  <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{scenario.trades}</div>
                </div>
              </div>
            </section>

            <section className="border-b border-[var(--hairline)] py-8">
              <SectionHeader label="Your context" source="Your note" title="Capture what the tape could not tell us" />
              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
                <div className="border-l border-[var(--blue)] pl-4">
                  {context ? (
                    <>
                      <p className="text-[15px] leading-7 text-[var(--foreground)]">{context}</p>
                      <button type="button" onClick={() => setCaptureOpen(true)} className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--blue)] hover:text-[var(--foreground)]">Edit your context</button>
                    </>
                  ) : (
                    <>
                      <p className="text-[15px] leading-7 text-[var(--body)]">Add the intention, hesitation, or tape feel that executions cannot explain. It remains your note; the Coach only reads it as context.</p>
                      <button type="button" onClick={() => setCaptureOpen(true)} className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-[var(--blue)] bg-[rgba(77,155,255,.1)] px-4 text-sm font-medium text-[var(--blue)] transition-colors hover:bg-[rgba(77,155,255,.16)]">
                        <MicIcon /> Talk through the session
                      </button>
                    </>
                  )}
                </div>
                <div className="border-t border-[var(--hairline)] pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)]">Intended setup</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SETUPS.map((candidate) => <ChoiceButton key={candidate} active={setup === candidate} onClick={() => setSetup(candidate)}>{candidate}</ChoiceButton>)}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--prose)]">Use structured context for teachable setups. Keep feelings and process observations in your own words.</p>
                </div>
              </div>
            </section>

            <section className="border-b border-[var(--hairline)] py-8">
              <SectionHeader label="Next-session focus" source="Coach proposal" title={scenario.focus.trigger} />
              <div className="mt-4 flex flex-col justify-between gap-5 border-l border-[var(--blue)] pl-4 sm:flex-row sm:items-end">
                <div>
                  <p className="max-w-2xl text-[17px] leading-7 text-[var(--foreground)]">{scenario.focus.action}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--prose)]">Measure: {scenario.focus.measure}</p>
                </div>
                <button type="button" onClick={() => setFocusSaved((saved) => !saved)} className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--body)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]">
                  {focusSaved ? "Carried to dashboard" : "Carry to dashboard"}
                </button>
              </div>
            </section>

            <section className="grid gap-8 border-b border-[var(--hairline)] py-8 md:grid-cols-2">
              <Finding finding={scenario.strength} polarity="positive" label="What worked" />
              <Finding finding={scenario.leak} polarity="negative" label="What cost you" />
            </section>

            <section className="border-b border-[var(--hairline)] py-8">
              <SectionHeader label="What drove the result?" source="Calculated" title={scenario.driver.title} />
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--body)]">{scenario.driver.copy}</p>
              <div className="mt-6 max-w-xl space-y-3">
                <ContributionBar label={scenario.driver.primary} value={scenario.driver.primaryValue} width={scenario.driver.primaryWidth} tone={scenario.resultTone === "negative" ? "negative" : "positive"} />
                <ContributionBar label={scenario.driver.secondary} value={scenario.driver.secondaryValue} width={scenario.driver.secondaryWidth} tone={scenario.driver.secondaryTone} />
              </div>
              <button type="button" className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--blue)] hover:text-[var(--foreground)]">See calculation details</button>
            </section>

            <section className="border-b border-[var(--hairline)] py-8">
              <SectionHeader label="Review queue" source="Coach-selected evidence" title="Three trades deserve your attention" />
              <div className="mt-5 divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
                {scenario.reviewQueue.map((trade, index) => (
                  <button key={trade.id} type="button" onClick={() => setSelectedTrade(trade.id)} className={`grid w-full gap-3 py-4 text-left transition-colors sm:grid-cols-[62px_86px_110px_minmax(0,1fr)_auto] sm:items-start ${selectedTrade === trade.id ? "bg-[rgba(77,155,255,.06)]" : "hover:bg-[rgba(255,255,255,.02)]"}`}>
                    <span className="pl-3 font-mono text-[12px] font-semibold text-[var(--foreground)] sm:pl-4">{trade.id}</span>
                    <span className="font-mono text-[12px] text-[var(--muted)]">{trade.time}</span>
                    <span className={`font-mono text-[12px] font-semibold tabular-nums ${toneClass(trade.outcome)}`}>{trade.symbol} · {trade.result}</span>
                    <span className="pr-3 sm:pr-0">
                      <span className="block text-sm font-medium text-[var(--foreground)]">{trade.reason}</span>
                      <span className="mt-1 block text-sm leading-6 text-[var(--prose)]">{trade.read}</span>
                    </span>
                    <span className="pr-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--blue)] sm:pt-1 sm:pr-4">{selectedTrade === trade.id ? "Selected" : `Review ${index + 1}`}</span>
                  </button>
                ))}
              </div>
              {selectedTrade ? <p className="mt-4 border-l border-[var(--hairline)] pl-4 text-sm leading-6 text-[var(--body)]">{scenario.reviewQueue.find((trade) => trade.id === selectedTrade)?.context}</p> : null}
            </section>
          </div>

          <aside className="space-y-8 xl:pt-1">
            <section className="border-b border-[var(--hairline)] pb-7">
              <Eyebrow>Rule integrity</Eyebrow>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">{scenario.rules.breached} critical breach · {scenario.rules.clean} rules clean</p>
              <div aria-label="Rule integrity distribution" className="mt-5 flex h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <RuleIntegrityBar rules={scenario.rules} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[10px] uppercase tracking-[0.11em] text-[var(--muted)]">
                <span>{scenario.rules.clean} clean</span><span>{scenario.rules.breached} breach</span><span>{scenario.rules.unevaluable} unknown</span>
              </div>
              <button type="button" className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--blue)] hover:text-[var(--foreground)]">Open scorecard</button>
            </section>

            <section className="border-b border-[var(--hairline)] pb-7">
              <Eyebrow>Pattern</Eyebrow>
              <p className="mt-3 text-lg font-semibold leading-7 text-[var(--foreground)]">{scenario.pattern.title}</p>
              <div className="mt-5 flex gap-2" aria-label="Pattern evidence across five sessions">
                {[0, 1, 2, 3, 4].map((session) => <span key={session} className={`h-7 flex-1 rounded-sm border ${scenario.pattern.activeSessions.includes(session) ? "border-[rgba(224,169,74,.65)] bg-[rgba(224,169,74,.22)]" : "border-[var(--hairline)] bg-[var(--surface)]"}`} />)}
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--prose)]">{scenario.pattern.copy}</p>
            </section>

            <section>
              <Eyebrow>Evidence map</Eyebrow>
              <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">Session timeline</p>
              <div className="relative mt-6 border-l border-[var(--hairline)] pl-5">
                {scenario.reviewQueue.map((trade) => <div key={trade.id} className="relative pb-5 last:pb-0"><span className={`absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-[var(--background)] ${trade.outcome === "positive" ? "bg-[var(--green)]" : "bg-[var(--red)]"}`} /><p className="font-mono text-[11px] text-[var(--muted)]">{trade.time} · {trade.id}</p><p className="mt-1 text-sm text-[var(--body)]">{trade.reason}</p></div>)}
              </div>
            </section>
          </aside>
        </div>
      </div>

      {captureOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/65 p-4 sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="capture-title">
          <form onSubmit={saveContext} className="w-full max-w-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><Eyebrow>Your context</Eyebrow><h2 id="capture-title" className="mt-2 text-xl font-semibold text-[var(--foreground)]">Talk through the session</h2></div>
              <button type="button" onClick={() => setCaptureOpen(false)} className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--foreground)]">Close</button>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--prose)]">What did you see? What were you trying to do? Where did standards hold or slip? Speak or type naturally; the transcript stays editable.</p>
            <div className="mt-5"><DictationTextarea name="context" defaultValue={context} rows={7} autoFocus placeholder="Talk through what happened, what you saw, where standards held or slipped, and what to remember next time." className="w-full resize-y rounded-md border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[15px] leading-7 text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--blue)]" /></div>
            <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setCaptureOpen(false)} className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]">Cancel</button><button type="submit" className="inline-flex h-10 items-center rounded-md bg-[var(--blue)] px-4 text-sm font-semibold text-white hover:bg-[#6aa9ff]">Save your context</button></div>
          </form>
        </div>
      ) : null}
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{children}</div>;
}

function ChoiceButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`h-8 rounded-md border px-3 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${active ? "border-[var(--blue)] bg-[rgba(77,155,255,.12)] text-[var(--foreground)]" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"}`}>{children}</button>;
}

function SectionHeader({ label, source, title }: { label: string; source: string; title: string }) {
  return <div><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><Eyebrow>{label}</Eyebrow><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--blue)]">{source}</span></div><h3 className="mt-3 text-xl font-semibold leading-7 text-[var(--foreground)]">{title}</h3></div>;
}

function Finding({ finding, polarity, label }: { finding: Scenario["strength"]; polarity: "positive" | "negative"; label: string }) {
  return <div className={`border-l pl-4 ${polarity === "positive" ? "border-[var(--green)]" : "border-[var(--red)]"}`}><Eyebrow>{label}</Eyebrow><h3 className="mt-3 text-lg font-semibold text-[var(--foreground)]">{finding.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--body)]">{finding.copy}</p><p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">{finding.evidence}</p></div>;
}

function ContributionBar({ label, value, width, tone }: { label: string; value: string; width: string; tone: "positive" | "negative" | "neutral" }) {
  const color = tone === "positive" ? "bg-[var(--green)]" : tone === "negative" ? "bg-[var(--red)]" : "bg-[var(--muted)]";
  return <div><div className="flex justify-between gap-3 font-mono text-[11px] text-[var(--muted)]"><span>{label}</span><span>{value}</span></div><div className="mt-2 h-2 bg-[var(--surface-2)]"><div className={`h-full ${color}`} style={{ width }} /></div></div>;
}

function RuleIntegrityBar({ rules }: { rules: Scenario["rules"] }) {
  const total = rules.clean + rules.breached + rules.unevaluable;
  const width = (count: number) => `${(count / total) * 100}%`;

  return <>
    <span className="bg-[var(--green)]" style={{ width: width(rules.clean) }} />
    <span className="bg-[var(--red)]" style={{ width: width(rules.breached) }} />
    <span className="bg-[var(--muted)]" style={{ width: width(rules.unevaluable) }} />
  </>;
}

function MicIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none"><path d="M8 9.5a2.4 2.4 0 0 0 2.4-2.4V4.2a2.4 2.4 0 0 0-4.8 0v2.9A2.4 2.4 0 0 0 8 9.5Z" stroke="currentColor" strokeWidth="1.4" /><path d="M3.8 7.2a4.2 4.2 0 0 0 8.4 0M8 11.4v2.1M5.8 13.5h4.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" /></svg>;
}

function toneClass(tone: "positive" | "negative") {
  return tone === "positive" ? "text-[var(--green)]" : "text-[var(--red)]";
}
