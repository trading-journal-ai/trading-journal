import Link from "next/link";

type Tone = "positive" | "negative" | "neutral";

type TickerPnl = {
  symbol: string;
  pnl: number;
};

type TradeNote = {
  symbol: string;
  label: string;
  tone: Tone;
  body: string;
  href: string;
  tags?: string[];
};

type JournalDay = {
  name: string;
  date: string;
  fullDate: string;
  trades: number;
  winRate: number;
  profitFactor: number;
  pnl: number;
  body: string;
  tags: string[];
  tickers: TickerPnl[];
  notes: TradeNote[];
};

const archiveMonths = [
  {
    label: "June",
    active: true,
    weeks: [
      { label: "Week 1", range: "Jun 1-5", active: false },
      { label: "Week 2", range: "Jun 8-12", active: true },
      { label: "Week 3", range: "Jun 15-19", active: false },
      { label: "Week 4", range: "Jun 22-26", active: false },
      { label: "Week 5", range: "Jun 29-30", active: false },
    ],
  },
  { label: "May", active: false, weeks: [] },
  { label: "April", active: false, weeks: [] },
  { label: "March", active: false, weeks: [] },
  { label: "February", active: false, weeks: [] },
  { label: "January", active: false, weeks: [] },
];

const today: JournalDay = {
  name: "Monday",
  date: "June 8",
  fullDate: "June 8, 2026",
  trades: 5,
  winRate: 63,
  profitFactor: 1.64,
  pnl: 42.33,
  body:
    "Clean open. Waited for the first pullback on NPT instead of chasing the spike - that patience set the tone for the whole session. Sized normal, took profits into strength, and walked away after the morning push. Exactly the day I want to repeat.",
  tags: ["Patient", "Followed plan"],
  tickers: [
    { symbol: "NPT", pnl: 15.44 },
    { symbol: "INHD", pnl: 14.71 },
    { symbol: "SUNE", pnl: 8.36 },
    { symbol: "BYAH", pnl: 2.91 },
    { symbol: "PN", pnl: 0.9 },
  ],
  notes: [
    {
      symbol: "NPT",
      label: "BEST SETUP",
      tone: "positive",
      href: "/trades/303",
      body:
        "Textbook green-to-red reclaim. Entered on the reclaim, added on the first pullback, trimmed half into the move. This is the A+ I keep talking about - patient entry, defined risk, let it work.",
      tags: ["Patient", "Followed plan"],
    },
  ],
};

function formatMoney(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pnlClass(value: number) {
  if (value > 0) return "text-[var(--green)]";
  if (value < 0) return "text-[var(--red)]";
  return "text-[var(--muted)]";
}

function toneClass(tone: Tone) {
  if (tone === "positive") return "border-[var(--green)] text-[var(--green)]";
  if (tone === "negative") return "border-[var(--red)] text-[var(--red)]";
  return "border-[var(--border)] text-[var(--muted)]";
}

function CurrentShortcuts() {
  return (
    <nav aria-label="Current journal shortcuts" className="flex flex-wrap gap-2">
      {[
        { label: "Today", href: "/journal/mock/day", active: true },
        { label: "This week", href: "/journal/mock", active: false },
        { label: "This month", href: "/journal/mock/month", active: false },
      ].map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold transition-colors ${
            item.active
              ? "border-[var(--blue)] bg-[var(--surface)] text-[var(--foreground)]"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function JournalSidebar() {
  return (
    <aside className="md:sticky md:top-24 md:self-start md:pt-48">
      <div className="space-y-4 font-mono text-[12px] text-[var(--muted)]">
        {archiveMonths.map((month) => (
          <div key={month.label}>
            <Link
              href="/journal/mock/month"
              className={`block ${
                month.active
                  ? "text-[var(--foreground)]"
                  : "hover:text-[var(--foreground)]"
              }`}
            >
              {month.label}
            </Link>
            {month.active && month.weeks.length > 0 ? (
              <div className="mt-3 space-y-2 pl-3">
                {month.weeks.map((week) => (
                  <Link
                    key={week.label}
                    href="/journal/mock"
                    className={`grid grid-cols-[1fr_auto] gap-3 text-[11px] leading-5 ${
                      week.active
                        ? "text-[var(--green)]"
                        : "hover:text-[var(--foreground)]"
                    }`}
                  >
                    <span>{week.label}</span>
                    <span>{week.range}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <Link href="/journal/mock/month" className="block hover:text-[var(--foreground)]">
          2025
        </Link>
        <Link href="/journal/mock/month" className="block hover:text-[var(--foreground)]">
          2024
        </Link>
      </div>
    </aside>
  );
}

function MetricLine({
  trades,
  winRate,
  profitFactor,
  pnl,
}: {
  trades: number;
  winRate: number;
  profitFactor: number;
  pnl: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[13px] text-[var(--muted)]">
      <span>{trades} trades</span>
      <span aria-hidden="true">·</span>
      <span>{winRate}% win</span>
      <span aria-hidden="true">·</span>
      <span>PF {profitFactor.toFixed(2)}</span>
      <span aria-hidden="true">·</span>
      <span className={pnlClass(pnl)}>{formatMoney(pnl)}</span>
    </div>
  );
}

function TagPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--muted)]">
      {label}
    </span>
  );
}

function SelectMock({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${toneClass(
        tone,
      )}`}
    >
      {label}
      <span className="text-[9px]">v</span>
    </button>
  );
}

function TogglePill({
  label,
  active = false,
  tone = "neutral",
}: {
  label: string;
  active?: boolean;
  tone?: Tone;
}) {
  const activeClass =
    tone === "positive"
      ? "border-[var(--green)] bg-[color-mix(in_srgb,var(--green)_12%,transparent)] text-[var(--green)]"
      : tone === "negative"
        ? "border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-[var(--red)]"
        : "border-[var(--blue)] bg-[color-mix(in_srgb,var(--blue)_12%,transparent)] text-[var(--foreground)]";

  return (
    <button
      type="button"
      className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
        active
          ? activeClass
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
      }`}
    >
      {label}
    </button>
  );
}

function PillGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function DailyNoteEditorMock() {
  return (
    <section className="mt-7 max-w-4xl border-l border-[var(--border)] pl-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
          Daily note edit state
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-[var(--blue)] px-3 text-sm font-semibold text-black"
          >
            Save note
          </button>
        </div>
      </div>
      <div className="mt-3 min-h-28 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[15px] font-light leading-7 text-[var(--foreground)]">
        Clean open. Waited for the first pullback on NPT instead of chasing the
        spike. Felt patient, followed the plan, and stopped once the morning
        push was done.
      </div>
    </section>
  );
}

function TradeNoteEditorMock({ note }: { note: TradeNote }) {
  return (
    <section className="mt-5 border-l border-[var(--border)] pl-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
          Trade note create state
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-md bg-[var(--blue)] px-3 text-sm font-semibold text-black"
          >
            Save note
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="text-[15px] font-semibold text-[var(--foreground)]">
          {note.symbol}
        </span>
        <SelectMock label={note.label} tone={note.tone} />
      </div>
      <div className="mt-3 min-h-24 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[14.5px] font-light leading-6 text-[var(--foreground)]">
        Textbook reclaim. Waited for confirmation, added only after the first
        pullback held, and took profits into strength.
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <PillGroup title="Process">
          <TogglePill label="Patient" active tone="positive" />
          <TogglePill label="Followed plan" active tone="positive" />
          <TogglePill label="Sized correctly" />
          <TogglePill label="Took profits early" />
          <TogglePill label="More" />
        </PillGroup>
        <PillGroup title="Emotion">
          <TogglePill label="Calm" active tone="positive" />
          <TogglePill label="Focused" />
          <TogglePill label="Impatient" />
          <TogglePill label="FOMO" tone="negative" />
          <TogglePill label="More" />
        </PillGroup>
      </div>
    </section>
  );
}

function TickerRail({ day }: { day: JournalDay }) {
  return (
    <aside className="w-[85%] justify-self-end">
      <div className="space-y-0.5">
        {[...day.tickers]
          .sort((a, b) => b.pnl - a.pnl)
          .map((ticker) => (
            <div
              key={ticker.symbol}
              className="grid grid-cols-[1fr_auto] items-baseline gap-3 leading-4"
            >
              <span className="font-mono text-[11px] text-[var(--foreground)]">
                {ticker.symbol}
              </span>
              <span
                className={`whitespace-nowrap font-mono text-[11px] tabular-nums ${pnlClass(
                  ticker.pnl,
                )}`}
              >
                {formatMoney(ticker.pnl)}
              </span>
            </div>
          ))}
      </div>
      <div className="mt-2 space-y-0.5 pt-1">
        <div className="mb-1.5 border-t border-[var(--border)]" />
        <div className="grid grid-cols-[1fr_auto] gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">Acc</span>
          <span>{day.winRate}%</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">PF</span>
          <span>{day.profitFactor.toFixed(2)}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">P&L</span>
          <span className={pnlClass(day.pnl)}>{formatMoney(day.pnl)}</span>
        </div>
      </div>
    </aside>
  );
}

function TradeNoteBlock({ note }: { note: TradeNote }) {
  return (
    <article className="border-l border-[var(--border)] pl-5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[15px] font-semibold text-[var(--foreground)]">
          {note.symbol}
        </span>
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] ${toneClass(
            note.tone,
          )}`}
        >
          {note.label}
        </span>
      </div>
      <p className="mt-1.5 text-[14.5px] font-light leading-6 text-[var(--foreground)]">
        {note.body}
      </p>
      {note.tags && note.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <TagPill key={tag} label={tag} />
          ))}
        </div>
      ) : null}
      <Link
        href={note.href}
        className="mt-3 inline-flex font-mono text-[12px] text-[var(--blue)] hover:underline"
      >
        View trade -&gt;
      </Link>
    </article>
  );
}

export default function MockJournalDayPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-8 md:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
      <JournalSidebar />
      <div className="min-w-0">
        <CurrentShortcuts />
        <div className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--muted)]">
          THE JOURNAL
          <span className="px-3">·</span>
          TODAY
        </div>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-3">
          <h1 className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[#e6edf3]">
            {today.name}
          </h1>
          <p className="font-mono text-base text-[var(--muted)]">
            {today.fullDate}
          </p>
        </div>
        <div className="mt-8">
          <MetricLine
            trades={today.trades}
            winRate={today.winRate}
            profitFactor={today.profitFactor}
            pnl={today.pnl}
          />
        </div>
        <div className="mt-10 grid gap-7 md:grid-cols-[minmax(0,1fr)_122px] md:gap-8">
          <div>
            <p className="max-w-4xl text-[18px] font-light leading-8 text-[var(--foreground)]">
              {today.body}
            </p>
            <div className="mt-6 space-y-6">
              {today.notes.map((note) => (
                <div key={`${note.symbol}-${note.label}`}>
                  <TradeNoteBlock note={note} />
                  <TradeNoteEditorMock note={note} />
                </div>
              ))}
            </div>
            <DailyNoteEditorMock />
          </div>
          <TickerRail day={today} />
        </div>
      </div>
    </div>
  );
}
