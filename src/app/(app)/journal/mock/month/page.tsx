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

type JournalWeek = {
  title: string;
  dateRange: string;
  trades: number;
  winRate: number;
  profitFactor: number;
  pnl: number;
  body: string;
  days: JournalDay[];
};

const monthSummary = {
  label: "THE JOURNAL",
  year: "2026",
  title: "June 2026",
  trades: 49,
  winRate: 63,
  profitFactor: 1.05,
  pnl: -291.74,
  body:
    "June started with patience and cleaner execution, then exposed the same sizing problem again. The month is not about finding more trades. It is about protecting the days that are already working and making the big red day structurally harder to create.",
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

const weeks: JournalWeek[] = [
  {
    title: "Week 1",
    dateRange: "June 1 - June 5, 2026",
    trades: 18,
    winRate: 67,
    profitFactor: 2.1,
    pnl: 186.9,
    body:
      "A clean start to the month. Waited for better setups, sized up only when the trade quality was obvious, and protected the week instead of forcing Friday.",
    days: [
      {
        name: "Monday",
        date: "June 1",
        trades: 4,
        winRate: 71,
        profitFactor: 2.6,
        pnl: 88.2,
        body:
          "Strong open, took the gap-and-go I planned, and left the desk before the afternoon chop.",
        tags: ["Confident", "Followed plan"],
        tickers: [
          { symbol: "HKIT", pnl: 35.14 },
          { symbol: "JZXN", pnl: 29.44 },
          { symbol: "FJET", pnl: 23.62 },
        ],
        notes: [],
      },
      {
        name: "Tuesday",
        date: "June 2",
        trades: 2,
        winRate: 60,
        profitFactor: 1.5,
        pnl: 31.05,
        body:
          "Slower tape. One clean trade, then I sat out the chop. Good discipline, not much to press.",
        tags: ["Patient"],
        tickers: [
          { symbol: "RUBI", pnl: 26.25 },
          { symbol: "BBAI", pnl: 4.8 },
        ],
        notes: [],
      },
      {
        name: "Wednesday",
        date: "June 3",
        trades: 5,
        winRate: 40,
        profitFactor: 0.6,
        pnl: -54.4,
        body:
          "Gave back gains chasing a second entry that was never really there. Not a disaster, but the impulse was obvious.",
        tags: ["Chased"],
        tickers: [
          { symbol: "SUNE", pnl: 12.22 },
          { symbol: "NPT", pnl: -18.55 },
          { symbol: "BCLI", pnl: -48.07 },
        ],
        notes: [
          {
            symbol: "BCLI",
            label: "CHASED",
            tone: "negative",
            href: "/trades/304",
            body:
              "Entered late after the clean move had already happened. The loss was manageable, but the reason for the trade was weak.",
          },
        ],
      },
      {
        name: "Thursday",
        date: "June 4",
        trades: 4,
        winRate: 75,
        profitFactor: 3.1,
        pnl: 112.75,
        body:
          "A+ setup on the morning reclaim. Sized right, let it work, and did not give it back.",
        tags: ["Focused", "Best setup"],
        tickers: [
          { symbol: "PPCB", pnl: 74.3 },
          { symbol: "EDHL", pnl: 31.2 },
          { symbol: "GELS", pnl: 7.25 },
        ],
        notes: [],
      },
      {
        name: "Friday",
        date: "June 5",
        trades: 3,
        winRate: 55,
        profitFactor: 1.2,
        pnl: 9.3,
        body:
          "Tiny green into the weekend. Protected the week, no heroics, and that was the right call.",
        tags: ["Calm"],
        tickers: [
          { symbol: "NUZE", pnl: 14.6 },
          { symbol: "RILY", pnl: -5.3 },
        ],
        notes: [],
      },
    ],
  },
  {
    title: "Week 2",
    dateRange: "June 8 - June 12, 2026",
    trades: 31,
    winRate: 60,
    profitFactor: 0.82,
    pnl: -478.64,
    body:
      "Two clean green days bookended a brutal Thursday. One oversized GLXG trade erased the entire week - that's the lesson, not the eight small losers on Tuesday.",
    days: [
      {
        name: "Monday",
        date: "June 8",
        trades: 5,
        winRate: 63,
        profitFactor: 1.64,
        pnl: 42.33,
        body:
          "Clean open. Waited for the first pullback on NPT instead of chasing the spike. Sized normal, took profits into strength, and walked away after the morning push.",
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
              "Textbook green-to-red reclaim. Entered on the reclaim, added on the first pullback, trimmed half into the move.",
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
          "Choppy, headline-driven tape. I knew by 9:45 it was a sit-on-your-hands day and traded it anyway.",
        tags: ["Impatient", "Overtraded"],
        tickers: [
          { symbol: "PAVS", pnl: 23.84 },
          { symbol: "XELB", pnl: 15.54 },
          { symbol: "AZI", pnl: 11.9 },
          { symbol: "EPSM", pnl: -1.75 },
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
              "Took this right after the AHMA loss to make it back. Doubled size, no plan, moved my stop down twice.",
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
          "Quiet and disciplined. Cut my size after Tuesday, took only the setups written in the morning plan, and kept the day green.",
        tags: ["Calm", "Followed plan"],
        tickers: [
          { symbol: "DSY", pnl: 15.04 },
          { symbol: "BATL", pnl: 3.88 },
          { symbol: "VSME", pnl: 1.85 },
          { symbol: "FLD", pnl: 1.33 },
          { symbol: "CHOW", pnl: 0.11 },
        ],
        notes: [],
      },
      {
        name: "Thursday",
        date: "June 11",
        trades: 6,
        winRate: 44,
        profitFactor: 0.24,
        pnl: -484.34,
        body:
          "Ugly. GLXG was a full-size position into a halt-prone runner with no clear stop. This is the day the month has to learn from.",
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
              "Sized 3x my max on a halted name with no stop. Broke the rule that actually protects the account.",
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
          "Came in shaken but smaller. Hit the stop once early, respected it, and ended green.",
        tags: ["Focused", "Followed plan"],
        tickers: [
          { symbol: "TXMD", pnl: 21.3 },
          { symbol: "RILY", pnl: 18.44 },
          { symbol: "BBAI", pnl: 12.06 },
          { symbol: "NUZE", pnl: 6.3 },
        ],
        notes: [],
      },
    ],
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
            index === 2
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

function MiniTickerRail({ day }: { day: JournalDay }) {
  const sortedTickers = [...day.tickers].sort((a, b) => b.pnl - a.pnl);

  return (
    <aside className="mt-1 w-[85%] justify-self-end md:mt-10">
      <div className="space-y-0.5">
        {sortedTickers.slice(0, 7).map((ticker) => (
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
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">Acc</span>
          <span className="tabular-nums text-[var(--foreground)]">
            {day.winRate}%
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">PF</span>
          <span className="tabular-nums text-[var(--foreground)]">
            {day.profitFactor.toFixed(2)}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-baseline gap-3 font-mono text-[11px] leading-4">
          <span className="text-[var(--muted)]">P&L</span>
          <span className={`tabular-nums ${pnlClass(day.pnl)}`}>
            {formatMoney(day.pnl)}
          </span>
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

function MonthDayEntry({ day }: { day: JournalDay }) {
  return (
    <section className="grid grid-cols-[8px_minmax(0,1fr)] gap-x-4">
      <span
        className={`mt-2.5 size-2 rounded-full ${
          day.pnl >= 0 ? "bg-[var(--green)]" : "bg-[var(--red)]"
        }`}
      />
      <div className="grid gap-7 md:grid-cols-[minmax(0,1fr)_122px] md:gap-8">
        <div>
          <div className="flex items-baseline gap-3">
            <h3 className="text-[24px] font-semibold leading-none tracking-[-0.01em] text-[#e6edf3]">
              {day.name}
            </h3>
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
          <p className="mt-4 max-w-3xl text-[15.5px] font-light leading-7 text-[var(--foreground)]">
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
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {day.tags.map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
            </div>
          )}
        </div>
        <MiniTickerRail day={day} />
      </div>
    </section>
  );
}

function WeekSection({ week }: { week: JournalWeek }) {
  return (
    <section className="border-t border-[var(--border)] pt-10">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h2 className="text-3xl font-semibold leading-none tracking-[-0.02em] text-[#e6edf3]">
          {week.title}
        </h2>
        <span className="font-mono text-sm text-[var(--muted)]">
          {week.dateRange}
        </span>
      </div>
      <div className="mt-3">
        <MetricLine
          trades={week.trades}
          winRate={week.winRate}
          profitFactor={week.profitFactor}
          pnl={week.pnl}
        />
      </div>
      <p className="mt-4 max-w-none text-[16px] font-light leading-7 text-[var(--foreground)]">
        {week.body}
      </p>
      <div className="mt-9 space-y-12">
        {week.days.map((day) => (
          <MonthDayEntry key={`${week.title}-${day.name}`} day={day} />
        ))}
      </div>
    </section>
  );
}

export default function MockJournalMonthPage() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-24 pt-8 md:grid-cols-[190px_minmax(0,1fr)] lg:gap-14">
      <JournalSidebar />
      <div className="min-w-0">
        <CurrentShortcuts />
        <div className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.38em] text-[var(--muted)]">
          {monthSummary.label}
          <span className="px-3">·</span>
          {monthSummary.year}
        </div>
        <div className="mt-5">
          <h1 className="text-5xl font-semibold leading-none tracking-[-0.03em] text-[#e6edf3]">
            {monthSummary.title}
          </h1>
        </div>
        <div className="mt-4">
          <MetricLine
            trades={monthSummary.trades}
            winRate={monthSummary.winRate}
            profitFactor={monthSummary.profitFactor}
            pnl={monthSummary.pnl}
          />
        </div>
        <p className="mt-8 max-w-4xl text-[18px] font-light leading-8 text-[var(--foreground)]">
          {monthSummary.body}
        </p>

        <div className="mt-12 space-y-14">
          {weeks.map((week) => (
            <WeekSection key={week.title} week={week} />
          ))}
        </div>
      </div>
    </div>
  );
}
