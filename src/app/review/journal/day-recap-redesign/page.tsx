"use client";

import Link from "next/link";
import { useState } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

const plexSans = IBM_Plex_Sans({
  variable: "--font-recap-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-recap-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

type Confidence = "high" | "medium" | "low";

const CONFIDENCE_TEXT_CLASS: Record<Confidence, string> = {
  high: "text-[#34d399]",
  medium: "text-[#e0a94a]",
  low: "text-[#8a94a6]",
};

export default function DayRecapRedesignPage() {
  const [hasDayNote, setHasDayNote] = useState(true);
  const [confidence, setConfidence] = useState<Confidence>("medium");

  const confLabel = `${confidence.toUpperCase()} CONFIDENCE`;
  const coachBasis = hasDayNote
    ? "from trade data + your notes + rules"
    : "from trade data + rules alone — add your read to upgrade it";

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--body)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-5 border-b border-[var(--hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Eyebrow>Static mockup</Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              Journal day recap — redesign
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--body)]">
              Pixel recreation of the Claude Design &quot;Journal Day Recap&quot;
              concept: one recap object with two voices, the trader&apos;s read on
              top and the coach&apos;s deterministic read below. Toggle the demo
              state to see how it adapts when there is no day note yet, and at
              each confidence level.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/review/journal"
              className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)]"
            >
              Review hub
            </Link>
            <Link
              href="/review/journal/coach-review-mockup"
              className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)]"
            >
              Coach review mockup
            </Link>
          </div>
        </header>

        <section className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--hairline)] bg-[rgba(18,21,29,.55)] p-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Demo state
          </span>
          <ToggleButton active={hasDayNote} onClick={() => setHasDayNote(true)}>
            Has day note
          </ToggleButton>
          <ToggleButton active={!hasDayNote} onClick={() => setHasDayNote(false)}>
            No day note
          </ToggleButton>
          <span className="mx-1 h-5 w-px bg-[var(--hairline)]" />
          <ToggleButton active={confidence === "high"} onClick={() => setConfidence("high")}>
            High confidence
          </ToggleButton>
          <ToggleButton active={confidence === "medium"} onClick={() => setConfidence("medium")}>
            Medium confidence
          </ToggleButton>
          <ToggleButton active={confidence === "low"} onClick={() => setConfidence("low")}>
            Low confidence
          </ToggleButton>
        </section>

        <div
          className={`${plexSans.variable} ${plexMono.variable} overflow-hidden rounded-2xl border border-[rgba(255,255,255,.08)] bg-[#04060a] pb-[80px] text-[#c3ccd9] [font-family:var(--font-recap-sans)]`}
        >
          {/* NAV */}
          <div className="flex items-center gap-[28px] border-b border-[rgba(255,255,255,.06)] px-[32px] py-[14px]">
            <span className="text-[15px] font-bold tracking-[-.01em] text-[#f4f7fb]">
              Trading Journal AI
            </span>
            <div className="flex gap-[22px] text-[13px] text-[#7a8598]">
              <span>Dashboard</span>
              <span className="font-semibold text-[#f4f7fb]">Journal</span>
              <span>Calendar</span>
              <span>Trades</span>
              <span>Analytics</span>
            </div>
            <span className="ml-auto rounded-[9px] border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.03)] px-[14px] py-[7px] text-[12.5px] text-[#c3ccd9]">
              Paper Account ⌄
            </span>
          </div>

          <div className="mx-auto max-w-[920px] px-6 pt-9">
            {/* DAY HEADER */}
            <div className="flex items-baseline gap-3">
              <span className="h-2 w-2 flex-none self-center rounded-full bg-[#34d399]" />
              <span className="text-[28px] font-bold tracking-[-.02em] text-[#f4f7fb]">
                June 16
              </span>
              <span className="text-sm text-[#7a8598]">Tuesday</span>
              <span className="ml-auto [font-family:var(--font-recap-mono)] text-[17px] font-semibold text-[#34d399]">
                +$150.35
              </span>
            </div>

            {/* P&L CARD */}
            <div className="mt-5 grid grid-cols-[1fr_240px] overflow-hidden rounded-[14px] border border-[rgba(255,255,255,.08)] bg-gradient-to-b from-[#0e1420] to-[#0a0e15]">
              <div className="px-5 py-[18px]">
                <div className="flex items-baseline justify-between">
                  <span className="[font-family:var(--font-recap-mono)] text-[10.5px] tracking-[.18em] text-[#6b7686]">
                    DAILY P&L
                  </span>
                  <span className="[font-family:var(--font-recap-mono)] text-[15px] font-semibold text-[#34d399]">
                    +$150.35
                  </span>
                </div>
                <svg viewBox="0 0 560 150" className="mt-[10px] block h-[150px] w-full">
                  <line
                    x1="0"
                    y1="75"
                    x2="560"
                    y2="75"
                    stroke="rgba(255,255,255,.08)"
                    strokeDasharray="3 4"
                  />
                  <path
                    d="M0,75 L60,78 140,110 260,112 380,108 470,40 560,18 L560,75 Z"
                    fill="rgba(52,211,153,.14)"
                  />
                  <path
                    d="M0,75 L60,78 140,110 260,112 380,108"
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M380,108 L470,40 560,18"
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="1.8"
                  />
                  <g fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#5b6473">
                    <text x="4" y="146">08:31</text>
                    <text x="150" y="146">08:45</text>
                    <text x="330" y="146">09:30</text>
                    <text x="520" y="146">11:02</text>
                  </g>
                </svg>
              </div>
              <div className="flex flex-col border-l border-[rgba(255,255,255,.06)] px-5 py-[18px] [font-family:var(--font-recap-mono)] text-[12.5px]">
                <TickerLine symbol="CRVO" value="+$234.60" tone="positive" />
                <TickerLine symbol="SUGP" value="+$5.00" tone="positive" />
                <TickerLine symbol="LASE" value="$0.00" tone="neutral" />
                <TickerLine symbol="PMAX" value="-$89.25" tone="negative" />
                <div className="mt-auto border-t border-[rgba(255,255,255,.06)] pt-[10px]">
                  <StatLine label="Accuracy" value="67%" />
                  <StatLine label="Profit Factor" value="2.68" />
                </div>
              </div>
            </div>

            {/* DAILY RECAP - one object, two voices */}
            <div className="mt-6 overflow-hidden rounded-[14px] border border-[rgba(255,255,255,.09)] bg-gradient-to-b from-[#0e1420] to-[#0a0e15]">
              <div className="flex items-center gap-[10px] border-b border-[rgba(255,255,255,.06)] px-5 py-[14px]">
                <span className="[font-family:var(--font-recap-mono)] text-[10.5px] tracking-[.18em] text-[#8a94a6]">
                  DAILY RECAP
                </span>
                <span
                  className={`ml-auto [font-family:var(--font-recap-mono)] text-[10.5px] tracking-[.14em] ${CONFIDENCE_TEXT_CLASS[confidence]}`}
                >
                  {confLabel}
                </span>
              </div>

              {/* YOUR READ */}
              <div className="px-5 py-[18px]">
                <div className="flex items-center gap-2">
                  <span className="[font-family:var(--font-recap-mono)] text-[10px] tracking-[.16em] text-[#6b7686]">
                    YOUR READ
                  </span>
                </div>

                {hasDayNote ? (
                  <>
                    <p className="mt-[10px] text-[14.5px] leading-[1.65] text-[#dfe5ee]">
                      Good day overall. I finished up $150.35 with enough accuracy
                      to keep the session controlled. CRVO was the best lift at
                      $234.60. I still want to review the weaker entry so I can
                      separate normal variance from avoidable execution noise.
                    </p>
                    <div className="mt-3 flex items-center gap-[10px]">
                      <button
                        type="button"
                        className="inline-flex flex-none items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-[rgba(110,162,255,.35)] bg-[rgba(110,162,255,.08)] px-[13px] py-[7px] [font-family:var(--font-recap-sans)] text-[12.5px] text-[#9dbcf5] transition-colors hover:bg-[rgba(110,162,255,.14)]"
                      >
                        <MicIcon className="h-[13px] w-[13px]" />
                        Add to your read
                      </button>
                      <span className="text-[11.5px] text-[#5b6473]">
                        appends — never overwrites
                      </span>
                      <span className="ml-auto text-[11.5px] text-[#5b6473]">Edit</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 flex items-center gap-[14px] rounded-xl border-[1.5px] border-dashed border-[rgba(110,162,255,.3)] p-4">
                    <button
                      type="button"
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-gradient-to-b from-[#5b93ff] to-[#4278f0] text-white shadow-[0_6px_18px_-6px_rgba(66,120,240,.7)]"
                    >
                      <MicIcon className="h-[18px] w-[18px]" />
                    </button>
                    <div>
                      <div className="text-[13.5px] font-medium text-[#dfe5ee]">
                        Talk the day
                      </div>
                      <div className="mt-0.5 text-xs text-[#7a8598]">
                        One pass: what you tried, what worked, where standards
                        slipped. Your trade notes are pulled in as a draft.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* COACH READ */}
              <div className="border-t border-[rgba(110,162,255,.14)] bg-[rgba(110,162,255,.025)] px-5 py-[18px]">
                <div className="flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8.5" stroke="#6ea2ff" strokeWidth="1.6" />
                    <circle cx="12" cy="12" r="3" fill="#6ea2ff" />
                  </svg>
                  <span className="[font-family:var(--font-recap-mono)] text-[10px] tracking-[.16em] text-[#6ea2ff]">
                    COACH READ
                  </span>
                  <span className="ml-[6px] min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#5b6473]">
                    {coachBasis}
                  </span>
                </div>

                <div className="mt-[14px] grid grid-cols-4 gap-[14px]">
                  <CoachStat label="DISTRIBUTION" value="top-heavy green" />
                  <CoachStat label="MECHANISM" value="Ticker concentration" />
                  <CoachStat label="MATH BASIS" value="Dollar fallback" />
                  <CoachStat label="TREND" value="mixed" valueClassName="text-[#6ea2ff]" />
                </div>

                {hasDayNote ? (
                  <>
                    <div className="mt-4 border-l-2 border-[#6ea2ff] px-[14px] py-0.5">
                      <div className="text-[13.5px] italic text-[#dfe5ee]">
                        &quot;CRVO was the best lift at $234.60&quot;
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11.5px]">
                        <span className="text-[#6b7686]">— your read</span>
                        <span className="inline-flex items-center gap-[5px] text-[#34d399]">
                          <CheckIcon />
                          data agrees: removing CRVO flips the session sign
                        </span>
                      </div>
                    </div>
                    <div className="mt-[14px] flex flex-wrap gap-2">
                      <EvidencePill tone="positive">discipline held · 78%</EvidencePill>
                      <EvidencePill tone="warning">chase risk · 41%</EvidencePill>
                      <span className="self-center text-[11px] text-[#5b6473]">
                        extracted from your notes — tap to correct
                      </span>
                    </div>
                  </>
                ) : null}

                <div className="mt-4 rounded-[11px] bg-[rgba(255,255,255,.025)] px-[15px] py-[13px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
                  <div className="[font-family:var(--font-recap-mono)] text-[9.5px] tracking-[.14em] text-[#6b7686]">
                    ONE THING TO TRY
                  </div>
                  <div className="mt-[5px] text-[13.5px] font-semibold text-[#f4f7fb]">
                    Pause that ticker for 30 minutes and write the next valid setup
                    before re-entry.
                  </div>
                  <div className="mt-1 text-xs text-[#7a8598]">
                    Trigger: one ticker dominates session P&L. Measure: blocked
                    trades, avoided P&L, missed opportunity.
                  </div>
                </div>

                <div className="mt-3 text-[11px] leading-[1.5] text-[#5b6473]">
                  Small sample (4 trades) — treat as a session read, not a
                  persistent pattern. Updates automatically when you edit your
                  read; previous versions kept in history.
                </div>
              </div>
            </div>

            {/* INPUTS (quiet) */}
            <div className="mt-[22px]">
              <div className="flex items-center gap-[10px] px-0.5">
                <span className="[font-family:var(--font-recap-mono)] text-[10px] tracking-[.16em] text-[#6b7686]">
                  INPUTS FEEDING THIS RECAP
                </span>
                <span className="h-px flex-1 bg-[rgba(255,255,255,.06)]" />
                <span className="flex-none whitespace-nowrap text-[11px] text-[#5b6473]">
                  4 trades · 2 notes
                </span>
              </div>

              <div className="mt-[10px] flex flex-col gap-[6px]">
                <div className="flex items-center gap-3 rounded-[11px] bg-[rgba(255,255,255,.02)] px-4 py-[11px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.05)] transition-colors hover:bg-[rgba(255,255,255,.04)]">
                  <span className="[font-family:var(--font-recap-mono)] w-[52px] text-[12.5px] text-[#eef2f7]">
                    CRVO
                  </span>
                  <span className="[font-family:var(--font-recap-mono)] w-[72px] text-[11px] text-[#34d399]">
                    +$234.60
                  </span>
                  <span className="flex-none whitespace-nowrap rounded-full border border-[rgba(255,255,255,.14)] px-[9px] py-0.5 [font-family:var(--font-recap-mono)] text-[10.5px] text-[#9aa4b4]">
                    VWAP reclaim
                  </span>
                  <span className="flex-none whitespace-nowrap rounded-full bg-[rgba(52,211,153,.1)] px-[9px] py-0.5 [font-family:var(--font-recap-mono)] text-[10.5px] text-[#8fd6b8]">
                    valid
                  </span>
                  <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs italic text-[#7a8598]">
                    &quot;cleanest winner — defined entry, room to develop…&quot;
                  </span>
                  <span className="flex-none whitespace-nowrap text-[11px] text-[#5b6473]">
                    quoted ↑
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-[11px] bg-[rgba(255,255,255,.02)] px-4 py-[11px] shadow-[inset_0_0_0_1px_rgba(224,169,74,.18)] transition-colors hover:bg-[rgba(255,255,255,.04)]">
                  <span className="[font-family:var(--font-recap-mono)] w-[52px] text-[12.5px] text-[#eef2f7]">
                    PMAX
                  </span>
                  <span className="[font-family:var(--font-recap-mono)] w-[72px] text-[11px] text-[#f87171]">
                    -$89.25
                  </span>
                  <span className="flex-none whitespace-nowrap rounded-full border border-dashed border-[rgba(224,169,74,.5)] px-[9px] py-0.5 [font-family:var(--font-recap-mono)] text-[10.5px] text-[#dcbd85]">
                    tag setup ?
                  </span>
                  <span className="flex-1 text-xs italic text-[#7a8598]">
                    worst trade — a verdict here sharpens the coach read
                  </span>
                  <span className="flex-none cursor-pointer text-[11.5px] text-[#9dbcf5]">
                    + note
                  </span>
                </div>

                <div className="flex items-center gap-3 rounded-[11px] bg-[rgba(255,255,255,.012)] px-4 py-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.03)]">
                  <span className="[font-family:var(--font-recap-mono)] w-[52px] text-[12.5px] text-[#8a94a6]">
                    SUGP
                  </span>
                  <span className="[font-family:var(--font-recap-mono)] w-[72px] text-[11px] text-[#7a8598]">
                    +$5.00
                  </span>
                  <span className="flex-1 text-xs text-[#5b6473]">no note</span>
                  <span className="flex-none cursor-pointer text-[11.5px] text-[#5b6473]">
                    + note
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-[11px] bg-[rgba(255,255,255,.012)] px-4 py-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,.03)]">
                  <span className="[font-family:var(--font-recap-mono)] w-[52px] text-[12.5px] text-[#8a94a6]">
                    LASE
                  </span>
                  <span className="[font-family:var(--font-recap-mono)] w-[72px] text-[11px] text-[#7a8598]">
                    $0.00
                  </span>
                  <span className="flex-1 text-xs text-[#5b6473]">no note</span>
                  <span className="flex-none cursor-pointer text-[11.5px] text-[#5b6473]">
                    + note
                  </span>
                </div>
              </div>
              <div className="mt-[10px] px-0.5 text-[11px] text-[#5b6473]">
                Ticker &amp; trade notes are inputs — captured in the same
                composer, surfaced only through the recap above.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TickerLine({
  symbol,
  value,
  tone,
}: {
  symbol: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[#34d399]"
      : tone === "negative"
        ? "text-[#f87171]"
        : "text-[#7a8598]";
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#c3ccd9]">{symbol}</span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-[3px]">
      <span className="text-[#6b7686]">{label}</span>
      <span className="text-[#c3ccd9]">{value}</span>
    </div>
  );
}

function CoachStat({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="border-t border-[rgba(255,255,255,.1)] pt-2">
      <div className="[font-family:var(--font-recap-mono)] text-[9.5px] tracking-[.14em] text-[#6b7686]">
        {label}
      </div>
      <div className={`mt-[3px] text-sm font-semibold ${valueClassName ?? "text-[#eef2f7]"}`}>
        {value}
      </div>
    </div>
  );
}

function EvidencePill({
  tone,
  children,
}: {
  tone: "positive" | "warning";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "border-[rgba(52,211,153,.3)] bg-[rgba(52,211,153,.06)] text-[#8fd6b8]"
      : "border-[rgba(224,169,74,.3)] bg-[rgba(224,169,74,.06)] text-[#dcbd85]";
  return (
    <span
      className={`inline-flex flex-none items-center gap-[6px] whitespace-nowrap rounded-full border px-[11px] py-1 [font-family:var(--font-recap-mono)] text-[11px] ${toneClass}`}
    >
      {children} <span className="cursor-pointer opacity-60">✎</span>
    </span>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
      {children}
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 13l4 4L19 7"
        stroke="#34d399"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] text-[var(--foreground)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
