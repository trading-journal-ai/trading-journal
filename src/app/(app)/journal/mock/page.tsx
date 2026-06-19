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
  trades: number;
  winRate: number;
  profitFactor: number;
  pnl: number;
  body: string;
  tags: string[];
  tickers: TickerPnl[];
  notes: TradeNote[];
};

const weekSummary = {
  label: "THE JOURNAL",
  week: "WEEK 02",
  title: "Week 2",
  dateRange: "June 8 - June 12, 2026",
  trades: 31,
  winRate: 60,
  profitFactor: 0.82,
  pnl: -478.64,
  body:
    "Two clean green days bookended a brutal Thursday. The math is simple: one oversized GLXG trade erased the entire week - that's the lesson, not the eight small losers on Tuesday. Keep red days small and Thursday never happens.",
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

const journalDays: JournalDay[] = [
  {
    name: "Monday",
    date: "June 8",
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
      },
    ],
  },
  {
    name: "Tuesday",
    date: "June 9",
    trades: 11,
    winRate: 49,
    profitFactor: 0.69,
    pnl: -116.94,
    body:
      'Choppy, headline-driven tape. I knew by 9:45 it was a "sit on your hands" day and traded it anyway. Eight small names just churned commissions, and CCTG was the real damage - I added to a loser instead of cutting because I decided it "had to bounce."',
    tags: ["Impatient", "Overtraded"],
    tickers: [
      { symbol: "PAVS", pnl: 23.84 },
      { symbol: "XELB", pnl: 15.54 },
      { symbol: "AZI", pnl: 11.9 },
      { symbol: "YOUL", pnl: 3 },
      { symbol: "RGNT", pnl: 1.02 },
      { symbol: "GMEX", pnl: 0 },
      { symbol: "EPSM", pnl: -1.75 },
      { symbol: "QTEX", pnl: -10.42 },
      { symbol: "UK", pnl: -12.47 },
      { symbol: "AHMA", pnl: -29.98 },
      { symbol: "CCTG", pnl: -117.6 },
    ],
    notes: [
      {
        symbol: "CCTG",
        label: "REVENGE TRADE",
        tone: "negative",
        href: "/trades/304",
        body:
          "Took this right after the AHMA loss to make it back. Doubled size, no plan, moved my stop down twice. Worst trade of the week and it wasn't close.",
      },
    ],
  },
  {
    name: "Wednesday",
    date: "June 10",
    trades: 5,
    winRate: 68,
    profitFactor: 1.99,
    pnl: 22.21,
    body:
      "Quiet and disciplined. Cut my size after Tuesday - the right call. Took only the setups written in the morning plan, nothing heroic. Green and calm. Recovery starts with small wins like this one.",
    tags: ["Calm", "Followed plan"],
    tickers: [
      { symbol: "DSY", pnl: 15.04 },
      { symbol: "BATL", pnl: 3.88 },
      { symbol: "VSME", pnl: 1.85 },
      { symbol: "FLD", pnl: 1.33 },
      { symbol: "CHOW", pnl: 0.11 },
    ],
    notes: [
      {
        symbol: "DSY",
        label: "GOOD TRADE",
        tone: "positive",
        href: "/trades/303",
        body:
          "Patient entry on the opening drive - took the meat of the move and left the rest alone. Small, but exactly the process I wanted to see the day after Tuesday.",
      },
    ],
  },
  {
    name: "Thursday",
    date: "June 11",
    trades: 6,
    winRate: 44,
    profitFactor: 0.24,
    pnl: -484.34,
    body:
      "Ugly. GLXG was a full-size position into a halt-prone runner with no clear stop - I had no business being that size. Two weeks of green undone in one afternoon. I need a hard daily max-loss that actually locks me out, not a number I can talk myself past.",
    tags: ["Frustrated", "Oversized"],
    tickers: [
      { symbol: "ADIL", pnl: 14.65 },
      { symbol: "LASE", pnl: -0.3 },
      { symbol: "GELS", pnl: -1.02 },
      { symbol: "EDHL", pnl: -52.65 },
      { symbol: "PPCB", pnl: -157.77 },
      { symbol: "GLXG", pnl: -287.26 },
    ],
    notes: [
      {
        symbol: "GLXG",
        label: "RULE BREAK",
        tone: "negative",
        href: "/trades/304",
        body:
          "Sized 3x my max on a halted name with no stop. Broke the one rule that actually protects the account. If I fix nothing else this month, I fix this.",
      },
      {
        symbol: "ADIL",
        label: "NEEDS REVIEW",
        tone: "neutral",
        href: "/trades/303",
        body:
          "Small winner, but I held it twice as long as planned hoping it would carry the day. Right instinct, wrong reason - I was trying to dig out, not trade the setup.",
      },
    ],
  },
  {
    name: "Friday",
    date: "June 12",
    trades: 4,
    winRate: 60,
    profitFactor: 1.42,
    pnl: 58.1,
    body:
      "Came in shaken but with a smaller plan and a hard stop written down before the open. Hit the stop once early and actually respected it. Ended green - but more importantly, ended in control. Closing the week down, not broken.",
    tags: ["Focused", "Followed plan"],
    tickers: [
      { symbol: "TXMD", pnl: 21.3 },
      { symbol: "RILY", pnl: 18.44 },
      { symbol: "BBAI", pnl: 12.06 },
      { symbol: "NUZE", pnl: 6.3 },
    ],
    notes: [],
  },
];

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

function TimelineDot({ pnl }: { pnl: number }) {
  return (
    <span
      className={`mt-2.5 size-2 rounded-full ${
        pnl >= 0 ? "bg-[var(--green)]" : "bg-[var(--red)]"
      }`}
    />
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

function CurrentShortcuts() {
  return (
    <nav aria-label="Current journal shortcuts" className="flex flex-wrap gap-2">
      {["Today", "This week", "This month"].map((label, index) => (
        <Link
          key={label}
          href={
            index === 0
              ? "/journal/mock/day"
              : index === 1
                ? "/journal/mock"
                : "/journal/mock/month"
          }
          className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-semibold transition-colors ${
            index === 1
              ? "border-[var(--blue)] bg-[var(--surface)] text-[var(--foreground)]"
              : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--blue)] hover:text-[var(--foreground)]"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function JournalSidebar() {
  return (
    <aside className="md:sticky md:top-24 md:self-start md:pt-56">
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

function TickerRail({ day }: { day: JournalDay }) {
  const sortedTickers = [...day.tickers].sort((a, b) => b.pnl - a.pnl);

  const summaryRows = [
    { label: "Acc", value: `${day.winRate}%`, className: "text-[var(--foreground)]" },
    {
      label: "PF",
      value: day.profitFactor.toFixed(2),
      className: "text-[var(--foreground)]",
    },
    {
      label: "P&L",
      value: formatMoney(day.pnl),
      className: pnlClass(day.pnl),
    },
  ];

  return (
    <aside className="mt-1 w-[85%] justify-self-end md:mt-10">
      <div className="space-y-0.5">
        {sortedTickers.map((ticker) => (
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
        {summaryRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-mono text-[11px] leading-4"
          >
            <span className="text-[var(--muted)]">{row.label}</span>
            <span className={`tabular-nums ${row.className}`}>{row.value}</span>
          </div>
        ))}
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

function DayEntry({ day }: { day: JournalDay }) {
  return (
    <section className="grid grid-cols-[8px_minmax(0,1fr)] gap-x-4">
      <TimelineDot pnl={day.pnl} />
      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_122px] md:gap-8">
        <div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-[26px] font-semibold leading-none tracking-[-0.01em] text-[#e6edf3]">
              {day.name}
            </h2>
            <span className="font-mono text-sm text-[var(--muted)]">
              {day.date}
            </span>
          </div>
          <div className="mt-3">
            <MetricLine
              trades={day.trades}
              winRate={day.winRate}
              profitFactor={day.profitFactor}
              pnl={day.pnl}
            />
          </div>
          <p className="mt-4 max-w-3xl text-[16px] font-light leading-7 text-[var(--foreground)]">
            {day.body}
          </p>
          {day.notes.length > 0 ? (
            <div className="mt-5 space-y-6">
              {day.notes.map((note) => (
                <TradeNoteBlock
                  key={`${note.symbol}-${note.label}`}
                  note={{ ...note, tags: day.tags }}
                />
              ))}
            </div>
          ) : null}
          {day.notes.length === 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {day.tags.map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
            </div>
          ) : null}
        </div>
        <TickerRail day={day} />
      </div>
    </section>
  );
}

export default function MockJournalWeekPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-8 md:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
      <JournalSidebar />
      <div className="min-w-0">
        <CurrentShortcuts />
        <div className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--muted)]">
          {weekSummary.label}
          <span className="px-3">·</span>
          {weekSummary.week}
        </div>
        <div className="mt-5 flex items-baseline gap-5">
          <h1 className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[#e6edf3]">
            {weekSummary.title}
          </h1>
          <p className="font-mono text-base text-[var(--muted)]">
            {weekSummary.dateRange}
          </p>
        </div>
        <div className="mt-4">
          <MetricLine
            trades={weekSummary.trades}
            winRate={weekSummary.winRate}
            profitFactor={weekSummary.profitFactor}
            pnl={weekSummary.pnl}
          />
        </div>
        <p className="mt-8 max-w-4xl text-[18px] font-light leading-8 text-[var(--foreground)]">
          {weekSummary.body}
        </p>
        <div className="mt-10 border-t border-[var(--border)]" />

        <div className="relative mt-8 space-y-12">
          {journalDays.map((day) => (
            <DayEntry key={day.name} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}
