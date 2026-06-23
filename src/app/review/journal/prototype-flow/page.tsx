"use client";

import Link from "next/link";
import { useState } from "react";
import TickerReviewRail from "@/components/TickerReviewRail";

type Surface = "dashboard" | "journal";
type WeekDay = {
  date: string;
  shortDate: string;
  weekday: string;
  recap: string;
  trades: number;
  pnl: number;
  accuracy: number;
  profitFactor: number | null;
  tickers: Array<{ symbol: string; pnl: number; trades: number }>;
};

const compactRecap =
  "Green day with 17 trades and a 65% win rate. INHD was the best lift at $364.00, while OCC was the main drag at -$124.00. The main thing to carry forward is that the better trades had time to work; stay patient when the move confirms instead of forcing extra entries.";

const dashboardInputs = [
  ["Pre-market", "Only trade clean reclaim setups. No opening-extension chase."],
  ["Midday", "Tape got thinner. One good trade left only if volume returns."],
  ["End of day", "Skipped the third-extension entry. Good restraint."],
];

const juneWeek: WeekDay[] = [
  {
    date: "2026-06-01",
    shortDate: "June 1",
    weekday: "Monday",
    recap:
      "Small green day. Best work came from waiting for confirmation instead of buying the first spike.",
    trades: 6,
    pnl: 184.25,
    accuracy: 67,
    profitFactor: 2.14,
    tickers: [
      { symbol: "NPT", pnl: 122.4, trades: 2 },
      { symbol: "INHD", pnl: 84.1, trades: 1 },
      { symbol: "OCC", pnl: -22.25, trades: 3 },
    ],
  },
  {
    date: "2026-06-02",
    shortDate: "June 2",
    weekday: "Tuesday",
    recap: compactRecap,
    trades: 17,
    pnl: 1312.57,
    accuracy: 65,
    profitFactor: 7.21,
    tickers: [
      { symbol: "INHD", pnl: 1311.16, trades: 6 },
      { symbol: "NPT", pnl: 62.63, trades: 2 },
      { symbol: "FRSX", pnl: 61.99, trades: 2 },
      { symbol: "CHAI", pnl: 0.79, trades: 1 },
      { symbol: "OCC", pnl: -124, trades: 6 },
    ],
  },
  {
    date: "2026-06-03",
    shortDate: "June 3",
    weekday: "Wednesday",
    recap:
      "Red day. Took two trades outside the plan after missing the clean open. Need to slow down after first loss.",
    trades: 9,
    pnl: -286.4,
    accuracy: 33,
    profitFactor: 0.48,
    tickers: [
      { symbol: "SUNE", pnl: 92.5, trades: 2 },
      { symbol: "INHD", pnl: -144.2, trades: 3 },
      { symbol: "OCC", pnl: -234.7, trades: 4 },
    ],
  },
  {
    date: "2026-06-04",
    shortDate: "June 4",
    weekday: "Thursday",
    recap:
      "No real edge after the first hour. Reduced size and protected the week instead of trying to force a bigger day.",
    trades: 4,
    pnl: 42.8,
    accuracy: 50,
    profitFactor: 1.31,
    tickers: [
      { symbol: "NPT", pnl: 56.2, trades: 2 },
      { symbol: "CHAI", pnl: -13.4, trades: 2 },
    ],
  },
  {
    date: "2026-06-05",
    shortDate: "June 5",
    weekday: "Friday",
    recap:
      "Clean half-day. Took the A setup, skipped the lower-quality continuation, and shut it down before lunch.",
    trades: 5,
    pnl: 318.9,
    accuracy: 60,
    profitFactor: 3.82,
    tickers: [
      { symbol: "FRSX", pnl: 244.7, trades: 2 },
      { symbol: "NPT", pnl: 86.1, trades: 1 },
      { symbol: "OCC", pnl: -11.9, trades: 2 },
    ],
  },
];

const carryForward = [
  ["Current experiment", "No third-extension entries unless volume is expanding."],
  ["Risk guardrail", "Two avoidable rule breaks ends active trading."],
  ["Dashboard cue", "Missing the first move is not a reason to lower standards."],
];

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function pnlClass(value: number) {
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

export default function JournalContentReviewPage() {
  const [surface, setSurface] = useState<Surface>("dashboard");
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("2026-06-02");
  const [expandedDates, setExpandedDates] = useState<string[]>([]);
  const [importedDates, setImportedDates] = useState<string[]>([]);
  const [reviewedDates, setReviewedDates] = useState<string[]>([]);
  const [notes, setNotes] = useState(
    "I noticed the urge to keep trading after the morning win. The most important decision was accepting that the tape got thinner and not giving back the day.",
  );
  const selectedDay = juneWeek.find((day) => day.date === selectedDate) ?? juneWeek[1];
  const imported = importedDates.length > 0;
  const coachReviewed = reviewedDates.length > 0;

  function importTrades() {
    const dates = juneWeek.map((day) => day.date);
    const mostRecentDate = dates[dates.length - 1];
    setImportedDates(dates);
    setSelectedDate(mostRecentDate);
    setExpandedDates((currentDates) =>
      currentDates.includes(mostRecentDate)
        ? currentDates
        : [...currentDates, mostRecentDate],
    );
    setSurface("journal");
    setEditorOpen(true);
  }

  function saveRecap() {
    setReviewedDates((dates) =>
      dates.includes(selectedDate) ? dates : [...dates, selectedDate],
    );
    setEditorOpen(false);
  }

  function toggleDay(date: string) {
    setExpandedDates((dates) =>
      dates.includes(date)
        ? dates.filter((existingDate) => existingDate !== date)
        : [...dates, date],
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--body)]">
      <style>{`
        @keyframes tj-review-expand {
          from {
            opacity: 0;
            clip-path: inset(0 0 100% 0);
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            clip-path: inset(0 0 0 0);
            transform: translateY(0);
          }
        }
      `}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 lg:px-10">
        <div>
          <Link
            href="/review/journal"
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--blue)] hover:text-[var(--foreground)]"
          >
            ← Review hub
          </Link>
        </div>

        <header className="flex flex-col gap-5 border-b border-[var(--hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Eyebrow>Clickable prototype</Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[var(--foreground)] md:text-5xl">
              Daily recap flow prototype
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--prose)]">
              A lightweight click-through for the core flow: dashboard captures
              the day, trade import opens the recap editor, the journal stores
              the recap, and the dashboard carries the lesson forward.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2" aria-label="Prototype surfaces">
            <SurfaceButton
              active={surface === "dashboard"}
              label="Dashboard"
              onClick={() => {
                setSurface("dashboard");
                setEditorOpen(false);
              }}
            />
            <SurfaceButton
              active={surface === "journal"}
              label="Journal"
              onClick={() => {
                setSurface("journal");
                setEditorOpen(false);
              }}
            />
            <ImportButton importedCount={importedDates.length} onClick={importTrades} />
          </nav>
        </header>

        {surface === "dashboard" ? (
          <DashboardView
            imported={imported}
            coachReviewed={coachReviewed}
            onJournal={() => {
              setSurface("journal");
              setEditorOpen(false);
            }}
          />
        ) : null}

        {surface === "journal" && !editorOpen ? (
          <JournalView
            importedDates={importedDates}
            expandedDates={expandedDates}
            reviewedDates={reviewedDates}
            onToggleDay={toggleDay}
            onOpenEditor={(date) => {
              setSelectedDate(date);
              setEditorOpen(true);
            }}
          />
        ) : null}

        {surface === "journal" && editorOpen ? (
          <RecapEditor
            selectedDay={selectedDay}
            tradeDataImported={importedDates.includes(selectedDay.date)}
            notes={notes}
            onNotesChange={setNotes}
            onClose={() => setEditorOpen(false)}
            onSave={saveRecap}
          />
        ) : null}
      </div>
    </main>
  );
}

function DashboardView({
  imported,
  coachReviewed,
  onJournal,
}: {
  imported: boolean;
  coachReviewed: boolean;
  onJournal: () => void;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Panel tone="blue" roomy>
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <Eyebrow>Dashboard</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                Active trading day
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--prose)]">
                The dashboard handles the lightweight intraday check-ins. Trade
                data can strengthen the recap, but the dashboard is mostly about
                planning, accountability, and prompts.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {dashboardInputs.map(([label, body]) => (
              <div
                key={label}
                className="rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,.02)] p-5"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--blue)]">
                  {label}
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--prose)]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        {coachReviewed ? (
          <Panel tone="green">
            <Eyebrow>Resurfaced from journal</Eyebrow>
            <h2 className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              Tomorrow&apos;s focus
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {carryForward.map(([label, body]) => (
                <FocusCard key={label} label={label} body={body} />
              ))}
            </div>
          </Panel>
        ) : null}
      </div>

      <aside className="space-y-4">
        <Panel>
          <Eyebrow>Status</Eyebrow>
          <StatusRow label="Trades imported" done={imported} />
          <StatusRow label="Daily recap reviewed" done={coachReviewed} />
          <StatusRow label="Dashboard cues ready" done={coachReviewed} />
          {imported ? (
            <button
              type="button"
              onClick={onJournal}
              className="mt-5 h-10 w-full rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--foreground)]"
            >
              Open journal week
            </button>
          ) : null}
        </Panel>

        <Panel>
          <Eyebrow>Shared day record</Eyebrow>
          <p className="mt-3 text-sm leading-6 text-[var(--prose)]">
            Dashboard check-ins and trade import attach to the same daily
            records in the June 1-5 journal week. The dashboard reads active
            lessons back from those records after review.
          </p>
        </Panel>
      </aside>
    </section>
  );
}

function JournalView({
  importedDates,
  expandedDates,
  reviewedDates,
  onToggleDay,
  onOpenEditor,
}: {
  importedDates: string[];
  expandedDates: string[];
  reviewedDates: string[];
  onToggleDay: (date: string) => void;
  onOpenEditor: (date: string) => void;
}) {
  const mostRecentImportedDate = importedDates[importedDates.length - 1];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Eyebrow>Journal</Eyebrow>
          <h2 className="mt-3 text-4xl font-semibold leading-none text-[var(--foreground)]">
            June 1-5
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--prose)]">
            A scrollable journal week. Import trades soon after the session so
            each recap has the freshest P&L, ticker, and execution context.
          </p>
        </div>
      </div>

      <Panel>
        <Eyebrow>State note</Eyebrow>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--prose)]">
          A day can begin with dashboard notes only, but the product should
          keep nudging trade import because the recap is better while the
          session is fresh. Bulk import can update several days; focus the most
          recent day first, then work backward.
        </p>
      </Panel>

      {importedDates.length === 0 ? (
        <Panel tone="blue">
          <Eyebrow>Before trade import</Eyebrow>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--prose)]">
            Dashboard notes can live here before trades are imported, but the
            best recap happens while the tape is still fresh. Import trades to
            attach P&L, tickers, and execution evidence to these days.
          </p>
        </Panel>
      ) : (
        <Panel tone="green">
          <Eyebrow>Bulk import result</Eyebrow>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--prose)]">
            Trades were attached to {importedDates.length} daily records. Start
            with the most recent day while the context is freshest, then work
            backward through the older imported days.
          </p>
        </Panel>
      )}

      <section className="max-w-5xl divide-y divide-[var(--hairline)] border-y border-[var(--hairline)]">
        {juneWeek.map((day) => (
          <JournalDayRow
            key={day.date}
            day={day}
            expanded={expandedDates.includes(day.date)}
            imported={importedDates.includes(day.date)}
            reviewed={reviewedDates.includes(day.date)}
            focus={day.date === mostRecentImportedDate && !reviewedDates.includes(day.date)}
            onToggle={() => onToggleDay(day.date)}
            onOpenEditor={() => onOpenEditor(day.date)}
          />
        ))}
      </section>
    </section>
  );
}

function JournalDayRow({
  day,
  expanded,
  imported,
  reviewed,
  focus,
  onToggle,
  onOpenEditor,
}: {
  day: WeekDay;
  expanded: boolean;
  imported: boolean;
  reviewed: boolean;
  focus: boolean;
  onToggle: () => void;
  onOpenEditor: () => void;
}) {
  const bestTicker = day.tickers.reduce((best, row) => (row.pnl > best.pnl ? row : best), day.tickers[0]);
  const worstTicker = day.tickers.reduce((worst, row) => (row.pnl < worst.pnl ? row : worst), day.tickers[0]);
  const pillItems = imported
    ? ["6 check-ins in", reviewed ? "1 cue out" : "cue pending", "Statistical read ready"]
    : ["Dashboard notes in", "Trade import pending"];

  return (
    <article className="py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <h3 className="text-[24px] font-semibold leading-none text-[var(--foreground)]">
              {day.shortDate}
            </h3>
            <span className="font-mono text-sm text-[var(--muted)]">
              {day.weekday}
            </span>
            {focus ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--blue)]">
                Start here
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] text-[var(--muted)]">
            {imported ? (
              <>
                <span className={pnlClass(day.pnl)}>{formatMoney(day.pnl)}</span>
                <span>{day.trades} trades</span>
                <span>{day.accuracy}% win</span>
                <span>
                  best {bestTicker.symbol}{" "}
                  <span className={pnlClass(bestTicker.pnl)}>{formatMoney(bestTicker.pnl)}</span>
                </span>
                <span>
                  worst {worstTicker.symbol}{" "}
                  <span className={pnlClass(worstTicker.pnl)}>{formatMoney(worstTicker.pnl)}</span>
                </span>
              </>
            ) : (
              <>
                <span>Dashboard notes available</span>
                <span>Import trades to add P&L</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className={`h-9 rounded-md border px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] hover:border-[rgba(77,155,255,.55)] ${
              focus
                ? "border-[rgba(77,155,255,.5)] bg-[rgba(77,155,255,.08)] text-[var(--foreground)]"
                : "border-[var(--border)] text-[var(--blue)] hover:text-[var(--foreground)]"
            }`}
          >
            {expanded ? "Close recap" : "Open recap"}
          </button>
        </div>
      </div>

      <div className="mt-5 max-w-[665px]">
        <p className="text-sm leading-6 text-[var(--foreground)]">
          {day.recap}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {pillItems.map((item, index) => (
          <span
            key={item}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,.03)] px-3 py-1 font-mono text-[11px] text-[var(--muted)]"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                index === 1 && imported ? "bg-[var(--green)]" : "bg-[var(--blue)]"
              }`}
            />
            {item}
          </span>
        ))}
      </div>

      {imported ? (
        <div className="mt-6 grid max-w-[880px] gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
          <ProductionLikePnlCard day={day} />
          <div className="space-y-4">
            <TickerReviewRail
              rows={day.tickers.map((row) => ({
                symbol: row.symbol,
                pnl: row.pnl,
                href: "#",
              }))}
              accuracy={day.accuracy}
              profitFactor={day.profitFactor}
              pnl={day.pnl}
            />
          </div>
        </div>
      ) : null}

      {expanded ? (
        <ExpandedDayReview
          day={day}
          imported={imported}
          onOpenEditor={onOpenEditor}
        />
      ) : null}

      {reviewed ? (
        <div className="mt-5 max-w-[665px] rounded-md border border-[rgba(29,178,107,.28)] bg-[rgba(29,178,107,.05)] p-4">
          <Eyebrow>Coach review attached</Eyebrow>
          <p className="mt-2 text-sm leading-6 text-[var(--prose)]">
            Narrative on the day, execution feedback, statistical read, and
            carry-forward cues have been saved back to this recap.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function ExpandedDayReview({
  day,
  imported,
  onOpenEditor,
}: {
  day: WeekDay;
  imported: boolean;
  onOpenEditor: () => void;
}) {
  if (!imported) {
    return (
      <div className="mt-6 overflow-hidden rounded-md border border-[var(--hairline)] bg-[rgba(255,255,255,.02)] p-5 motion-safe:animate-[tj-review-expand_180ms_ease-out]">
        <ExpandedSectionHeader
          eyebrow="Recap context"
          helper="dashboard notes only"
        />
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--prose)]">
          Dashboard notes can start the recap, but trade import should be the
          next step so the day has P&L, ticker, and execution evidence.
        </p>
        <button
          type="button"
          onClick={onOpenEditor}
          className="mt-5 h-9 rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] hover:border-[rgba(77,155,255,.55)]"
        >
          Add notes
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-md border border-[var(--hairline)] bg-[rgba(255,255,255,.02)] p-5 motion-safe:animate-[tj-review-expand_180ms_ease-out]">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-9">
          <section>
            <ExpandedSectionHeader eyebrow="Recap" helper="the day, in your words" />
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--green)]">
                  + AI generated
                </div>
                <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--foreground)]">
                  {day.recap}
                </p>
                <p className="mt-4 font-mono text-[11px] text-[var(--faint)]">
                  Drafted from {day.trades} trades + 6 dashboard check-ins ·
                  last edited by AI
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={onOpenEditor}
                  className="h-8 rounded-md border border-[var(--border)] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="h-8 rounded-md border border-[var(--border)] px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Regenerate
                </button>
              </div>
            </div>
          </section>

          <section>
            <ExpandedSectionHeader
              eyebrow="Statistical review"
              helper="generated from trade data"
            />
            <div className="mt-5 rounded-md border border-[rgba(240,81,67,.34)] bg-[rgba(240,81,67,.10)] p-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--red)]">
                Outlier check
              </span>
              <span className="ml-3 text-sm leading-6 text-[var(--foreground)]">
                Remove the best ticker and the day gets materially weaker. The
                headline result was green, but the edge may have been
                concentrated in one name.
              </span>
            </div>
            <button
              type="button"
              className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--blue)] hover:text-[var(--foreground)]"
            >
              Show full statistical analysis ↓
            </button>
          </section>

          <section>
            <ExpandedSectionHeader
              eyebrow="Trade-note coverage"
              helper="summarized from ticker drill-down"
            />
            <div className="mt-5 rounded-md border border-[var(--hairline)] bg-[rgba(7,9,13,.24)] p-4">
              <p className="text-sm leading-6 text-[var(--prose)]">
                Trade notes should live with the individual trades. This review
                only needs to know whether the important winners, avoidable
                losers, and emotion/process breaks have enough context.
              </p>
              <button
                type="button"
                className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--blue)] hover:text-[var(--foreground)]"
              >
                Trade note routing TBD
              </button>
            </div>
          </section>
        </div>

        <aside className="rounded-md border border-[var(--hairline)] bg-[rgba(7,9,13,.24)] p-4">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Dashboard loop
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--prose)]">
            Dashboard check-ins shape the recap. The coach promotes one cue
            back to tomorrow&apos;s dashboard.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--blue)]">
                In
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                {dashboardInputs[0][1]}
              </p>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--green)]">
                Out
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">
                Fewer, better trades. One A setup is enough.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExpandedSectionHeader({
  eyebrow,
  helper,
}: {
  eyebrow: string;
  helper?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--hairline)] pb-3">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {eyebrow}
      </div>
      {helper ? (
        <div className="font-mono text-[11px] text-[var(--faint)]">
          {helper}
        </div>
      ) : null}
    </div>
  );
}

function RecapEditor({
  selectedDay,
  tradeDataImported,
  notes,
  onNotesChange,
  onClose,
  onSave,
}: {
  selectedDay: WeekDay;
  tradeDataImported: boolean;
  notes: string;
  onNotesChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-lg border border-[rgba(232,174,76,.34)] bg-[rgba(18,21,29,.8)] p-6 md:p-7">
      <div className="flex flex-col gap-5 border-b border-[var(--hairline)] pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <Eyebrow>Full-page editor</Eyebrow>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
            {selectedDay.shortDate} recap review
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--prose)]">
            {tradeDataImported
              ? "Trade data is attached to this daily record. Add your thoughts, let the coach add feedback, then save back to the journal day."
              : "This daily record only has dashboard context right now. You can still add notes, then attach trade data later when it is imported."}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)]"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onSave}
            className="h-10 rounded-md border border-[rgba(29,178,107,.42)] bg-[rgba(29,178,107,.08)] px-4 text-sm font-semibold text-[var(--foreground)]"
          >
            Save review
          </button>
        </div>
      </div>

      <div className="grid gap-6 pt-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section>
            <Eyebrow>Generated summary</Eyebrow>
            <textarea
              className="mt-3 min-h-32 w-full resize-y rounded-md border border-[rgba(77,155,255,.34)] bg-[rgba(7,9,13,.55)] p-4 text-base leading-8 text-[var(--body)] outline-none focus:border-[rgba(77,155,255,.7)]"
              defaultValue={selectedDay.recap}
            />
          </section>

          <section>
            <Eyebrow>Your notes before coach</Eyebrow>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              className="mt-3 min-h-36 w-full resize-y rounded-md border border-[var(--border)] bg-[rgba(7,9,13,.55)] p-4 text-base leading-7 text-[var(--body)] outline-none focus:border-[rgba(77,155,255,.7)]"
            />
          </section>

          <section>
            <Eyebrow>Coach adds</Eyebrow>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <MiniCard
                title="Narrative on the day"
                body="You made most of the money when you waited for confirmation."
              />
              <MiniCard
                title="Execution feedback"
                body="Best trades matched your system; weak trades came from lowering standards."
              />
              <MiniCard
                title="Statistical read"
                body="P&L was front-loaded. Afternoon attempts added noise."
              />
              <MiniCard
                title="Carry forward"
                body="No third-extension entries unless volume is expanding."
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <Panel>
            <Eyebrow>Dashboard inputs</Eyebrow>
            <div className="mt-4 space-y-4">
              {dashboardInputs.map(([label, body]) => (
                <MiniCard key={label} title={label} body={body} />
              ))}
            </div>
          </Panel>
        </aside>
      </div>
    </section>
  );
}

function ProductionLikePnlCard({ day }: { day: WeekDay }) {
  const points = day.pnl >= 0
    ? "0,148 74,132 148,136 222,118 296,72 370,46 444,34 518,40"
    : "0,76 74,92 148,88 222,112 296,138 370,126 444,154 518,166";
  const area = `${points} 518,180 0,180`;

  return (
    <section className="flex h-[380px] flex-col rounded-[6px] bg-[#1a2432] px-4 py-4">
      <div className="mb-1 flex items-center justify-between gap-4">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Daily P&L
        </h2>
        <span className={`font-mono text-sm font-semibold tabular-nums ${pnlClass(day.pnl)}`}>
          {formatMoney(day.pnl)}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center">
        <svg
          viewBox="0 0 540 220"
          className="h-full w-full"
          role="img"
          aria-label={`${day.shortDate} running P&L`}
        >
          <line x1="0" x2="540" y1="180" y2="180" stroke="var(--muted)" strokeDasharray="5 7" strokeOpacity="0.7" />
          <line x1="0" x2="540" y1="112" y2="112" stroke="var(--hairline)" />
          <polygon
            points={area}
            fill={day.pnl >= 0 ? "var(--green)" : "var(--red)"}
            opacity="0.18"
          />
          <polyline
            points={points}
            fill="none"
            stroke={day.pnl >= 0 ? "var(--green)" : "var(--red)"}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <text x="0" y="212" fill="var(--body)" fontFamily="var(--font-mono)" fontSize="14">
            08:35
          </text>
          <text x="238" y="212" fill="var(--body)" fontFamily="var(--font-mono)" fontSize="14" textAnchor="middle">
            12:10
          </text>
          <text x="540" y="212" fill="var(--body)" fontFamily="var(--font-mono)" fontSize="14" textAnchor="end">
            16:00
          </text>
        </svg>
      </div>
    </section>
  );
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-4 border-t border-[var(--hairline)] pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <span className="text-sm text-[var(--prose)]">{label}</span>
      <span
        className={`font-mono text-[11px] uppercase tracking-[0.16em] ${
          done ? "text-[var(--green)]" : "text-[var(--muted)]"
        }`}
      >
        {done ? "Done" : "Pending"}
      </span>
    </div>
  );
}

function SurfaceButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-md border px-4 text-sm font-semibold ${
        active
          ? "border-[rgba(77,155,255,.42)] bg-[rgba(77,155,255,.08)] text-[var(--foreground)]"
          : "border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      {label}
    </button>
  );
}

function ImportButton({
  importedCount,
  onClick,
}: {
  importedCount: number;
  onClick: () => void;
}) {
  const imported = importedCount > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-md border px-4 text-sm font-semibold ${
        imported
          ? "border-[rgba(29,178,107,.42)] bg-[rgba(29,178,107,.08)] text-[var(--foreground)]"
          : "border-[rgba(77,155,255,.42)] bg-[rgba(77,155,255,.08)] text-[var(--foreground)]"
      }`}
    >
      {imported ? `${importedCount} days imported` : "Import trades"}
    </button>
  );
}

function Panel({
  children,
  tone = "neutral",
  roomy,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green";
  roomy?: boolean;
}) {
  const toneClass = {
    neutral: "border-[var(--border)]",
    blue: "border-[rgba(77,155,255,.34)]",
    green: "border-[rgba(29,178,107,.34)]",
  }[tone];

  return (
    <div
      className={`${toneClass} rounded-lg border bg-[rgba(18,21,29,.72)] ${
        roomy ? "p-6 md:p-7" : "p-5"
      }`}
    >
      {children}
    </div>
  );
}

function MiniCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-[var(--hairline)] bg-[rgba(255,255,255,.02)] p-4">
      <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--prose)]">{body}</p>
    </div>
  );
}

function FocusCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-[rgba(29,178,107,.28)] bg-[rgba(29,178,107,.05)] p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--green)]">
        {label}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{body}</p>
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
