import Link from "next/link";

const priorityOne = [
  {
    title: "Current phase",
    body: "Pre-market, active session, reorientation check-in, post-market review, or after-hours watch.",
  },
  {
    title: "Focus now",
    body: "One behavior for this phase. Fed by the latest coach review or current check-in.",
  },
  {
    title: "Import / refresh",
    body: "The future one-button checkpoint: upload latest fills and scanner notes to reorient.",
  },
  {
    title: "Risk posture",
    body: "Risk up, normal, risk down, stop trading, or step back based on tape and behavior.",
  },
];

const checkInModes = [
  {
    title: "Pre-market",
    body: "Plan the day: early movers, top gainers, catalysts, active themes, A+ candidates, and one rule to carry in.",
  },
  {
    title: "Opening bell",
    body: "Highest attention window. Track A+ candidates, first clean setups, chase risk, and spread/liquidity quality.",
  },
  {
    title: "Midday / lunch",
    body: "Reorient after early trades. Import latest fills, check churn, and decide whether continued trading is justified.",
  },
  {
    title: "Power hour",
    body: "Re-check continuation, squeezes, fades, second-leg moves, active themes, and risk posture.",
  },
  {
    title: "After hours",
    body: "Capture late movers, earnings/news catalysts, and names that may shape tomorrow's pre-market plan.",
  },
  {
    title: "Hot all day",
    body: "Exception state for rare tapes where names keep moving across multiple windows.",
  },
];

const marketContext = [
  {
    title: "Market condition",
    body: "Hot, choppy, thin, theme-driven, broad momentum, or selective tape.",
  },
  {
    title: "Active themes",
    body: "Crypto, AI, biotech, energy, earnings, sympathy, or other daily narrative.",
  },
  {
    title: "Top gainers",
    body: "Best movers of the day, whether traded, missed, watched, or avoided.",
  },
  {
    title: "Stocks up 100%+",
    body: "Names with exceptional opportunity or exceptional risk. Capture catalyst and tradeability.",
  },
];

const focusResets = [
  {
    title: "Risk up",
    body: "Market is hot, A+ names are holding, spreads are workable. Consider whether planned risk is too conservative.",
  },
  {
    title: "Risk down",
    body: "Spikes are failing, names are rolling over, or volume is fading. Reduce size, trade count, or new attempts.",
  },
  {
    title: "Stop trading",
    body: "No A+ candidates, repeated failed breakouts, revenge entries, or rule drift. Preserve focus for the next window.",
  },
  {
    title: "Step back",
    body: "Prompt a 60-second check: what is the market doing, what am I doing, and do those still match?",
  },
];

const selfCheckPrompts = [
  {
    title: "What am I seeing?",
    body: "Say the tape out loud: hot, fading, selective, choppy, theme-driven, or no clean edge.",
  },
  {
    title: "What am I feeling?",
    body: "Name the state before it drives the next click: calm, FOMO, impatient, frustrated, confident, tired.",
  },
  {
    title: "What am I about to do?",
    body: "Write the next action in plain language: wait, size up, size down, stop, or take only A+ setups.",
  },
  {
    title: "Does it match?",
    body: "Check alignment between market condition, candidate quality, risk, and your current behavior.",
  },
];

const notificationPrompts = [
  {
    title: "15 min before open",
    body: "How did pre-market go? What are the A+ names, active themes, and first rule for the open?",
  },
  {
    title: "90 min after open",
    body: "How did the opening bell session go? Are you green in a cold tape, chasing, or still seeing quality?",
  },
  {
    title: "Midday reset",
    body: "Is the market still paying, or is this becoming churn? Should risk come down until power hour?",
  },
  {
    title: "Post-market",
    body: "What did you capture, miss, or avoid? What carries into tomorrow's plan?",
  },
];

const topGainerStates = [
  "Captured opportunity",
  "Missed opportunity",
  "Poorly executed opportunity",
  "False opportunity",
  "Correct avoidance",
];

const fivePillars = [
  ["Price range", "$1-$20"],
  ["Float", "<10M shares"],
  ["Relative volume", ">=5x"],
  ["Daily change", ">=10%"],
  ["News catalyst", "Required"],
];

function WireBox({
  title,
  eyebrow,
  children,
  emphasis = false,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <section
      className={`rounded-md border p-5 ${
        emphasis
          ? "border-[var(--blue)] bg-[var(--surface)]"
          : "border-dashed border-[var(--border)] bg-transparent"
      }`}
    >
      {eyebrow ? (
        <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-[var(--body)]">{children}</div>
    </section>
  );
}

function MiniBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-[var(--hairline)] p-4">
      <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--body)]">{body}</p>
    </div>
  );
}

function FlowStep({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-[var(--hairline)] px-3 py-2 text-center font-mono text-[12px] text-[var(--body)]">
      {children}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <header className="space-y-4">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Dashboard wireframe
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Trading day orientation
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--body)]">
              Text-only IA for the future dashboard: what belongs above the fold, what context
              should be captured, and how the coach, journal, and analytics loop together.
            </p>
          </div>
          <Link
            href="/reports"
            className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--blue)] hover:text-[var(--foreground)]"
          >
            Analytics
          </Link>
        </div>
      </header>

      <WireBox title="Priority 1: pre-session command strip" eyebrow="Above the fold" emphasis>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {priorityOne.map((item) => (
            <MiniBox key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </WireBox>

      <WireBox title="Time-aware check-in modes" eyebrow="Dashboard state">
        <p>
          One combined model for page state and intraday check-ins. Each mode changes the
          dashboard emphasis: what to watch, whether to import/refresh, and whether risk should
          stay normal, move up, move down, or stop.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {checkInModes.map((item) => (
            <MiniBox key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </WireBox>

      <WireBox title="How the main loop should work" eyebrow="Interaction model">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
          <FlowStep>Analytics facts</FlowStep>
          <div className="hidden self-center text-center text-[var(--muted)] md:block">→</div>
          <FlowStep>Coach verdict</FlowStep>
          <div className="hidden self-center text-center text-[var(--muted)] md:block">→</div>
          <FlowStep>Dashboard brief</FlowStep>
          <div className="hidden self-center text-center text-[var(--muted)] md:block">→</div>
          <FlowStep>Journal follow-up</FlowStep>
        </div>
        <p className="mt-4">
          Dashboard should not generate new analysis. It should surface the current state and the
          next action from Analytics, Coach, and Journal.
        </p>
      </WireBox>

      <div className="grid gap-8 lg:grid-cols-2">
        <WireBox title="Priority 2: market context" eyebrow="Opportunity set">
          <div className="grid gap-3">
            {marketContext.map((item) => (
              <MiniBox key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </WireBox>

        <WireBox title="Top gainers review" eyebrow="Learning object">
          <p>
            Capture the best movers even when they were not traded. The dashboard should make it
            easy to ask whether the trader participated in the best opportunities, avoided them
            correctly, or mishandled them.
          </p>
          <div className="mt-4 grid gap-2">
            {topGainerStates.map((state) => (
              <div key={state} className="rounded border border-[var(--hairline)] px-3 py-2 font-mono text-[12px] text-[var(--body)]">
                {state}
              </div>
            ))}
          </div>
        </WireBox>
      </div>

      <WireBox title="Focus reset prompts" eyebrow="Anti-tunnel-vision layer">
        <p>
          These are lightweight coach callouts for stepping back during the day. The goal is not to
          predict trades; it is to interrupt autopilot and ask whether risk, trade count, and focus
          still match the tape.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {focusResets.map((item) => (
            <MiniBox key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </WireBox>

      <WireBox title="Say it / write it check-in" eyebrow="Self-awareness loop">
        <p>
          The coach is not an oracle. It is a sounding board that helps the trader pause, name
          what they see, and write down the decision they are about to make before FOMO turns into
          another trade.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {selfCheckPrompts.map((item) => (
            <MiniBox key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </WireBox>

      <WireBox title="Timed coaching prompts" eyebrow="Notifications">
        <p>
          Future reminders can act like mentor check-ins at natural market moments. The tone should
          be brief and practical: reflect, reassess, and decide whether to keep pressing or go home
          green on a cold day.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {notificationPrompts.map((item) => (
            <MiniBox key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </WireBox>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <WireBox title="Five pillars of stock selection" eyebrow="Candidate quality">
          <div className="grid gap-3 sm:grid-cols-2">
            {fivePillars.map(([label, value]) => (
              <MiniBox key={label} title={label} body={value} />
            ))}
          </div>
        </WireBox>

        <WireBox title="Priority 3: review and accountability" eyebrow="After session">
          <div className="grid gap-3 md:grid-cols-3">
            <MiniBox
              title="Recent session verdict"
              body="Broad green, outlier-carried, churn-heavy, payoff-led, tail-caused, or other coach label."
            />
            <MiniBox
              title="Experiment follow-up"
              body="Did the trader follow the active rule? Did it help? Should it continue, change, or expire?"
            />
            <MiniBox
              title="Opportunity gap"
              body="Compare actual trades against top gainers and A+ candidates."
            />
          </div>
        </WireBox>
      </div>

      <WireBox title="Future automation boundary" eyebrow="Not first pass">
        <div className="grid gap-3 md:grid-cols-4">
          <MiniBox title="Scanner import" body="Paste or import top gainer rows before direct provider integration." />
          <MiniBox title="One-button refresh" body="Future checkpoint: import latest trades, update market context, and regenerate orientation." />
          <MiniBox title="Float/RVOL enrichment" body="Useful later, but requires a trusted market data source." />
          <MiniBox title="Catalyst feed" body="News tagging should start manual to avoid noisy automated labels." />
          <MiniBox title="Realtime windows" body="Manual focus resets first; live intraday evaluation only after data flow is reliable." />
        </div>
      </WireBox>
    </div>
  );
}
