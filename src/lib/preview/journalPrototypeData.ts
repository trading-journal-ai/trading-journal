export const journalScopeViews = {
  day: ["pnl", "trades", "process", "coach"],
  week: ["pnl", "edge", "alignment", "coach"],
  month: ["pnl", "horizon", "risk", "coach"],
} as const;

export type JournalPrototypeScope = keyof typeof journalScopeViews;
export type DayPrototypeView = (typeof journalScopeViews.day)[number];
export type WeekPrototypeView = (typeof journalScopeViews.week)[number];
export type MonthPrototypeView = (typeof journalScopeViews.month)[number];
export type JournalPrototypeView = DayPrototypeView | WeekPrototypeView | MonthPrototypeView;
export type JournalPrototypePageState = "before" | "after" | "feed";

export type PrototypeTone = "neutral" | "positive" | "negative" | "watch";

export type PrototypeMetric = {
  label: string;
  value: string;
  detail?: string;
  tone?: PrototypeTone;
};

export type PrototypeDatum = {
  label: string;
  value: number;
  display: string;
  detail?: string;
  tone?: PrototypeTone;
};

export type PrototypeTable = {
  columns: string[];
  rows: string[][];
};

export type PrototypeRule = {
  label: string;
  status: "Honored" | "Broken" | "Clear" | "Watch";
  detail: string;
};

export type PrototypeHeatCell = {
  label: string;
  value: string;
  intensity: 0 | 1 | 2 | 3;
  tone: "empty" | "positive" | "negative";
};

export type PrototypeSection =
  | { kind: "bars"; title: string; items: PrototypeDatum[]; footnote?: string }
  | { kind: "rows"; title: string; items: PrototypeDatum[]; footnote?: string }
  | { kind: "table"; title: string; table: PrototypeTable; footnote?: string }
  | { kind: "rules"; title: string; rules: PrototypeRule[]; footnote?: string }
  | { kind: "heatmap"; title: string; cells: PrototypeHeatCell[]; footnote?: string }
  | { kind: "coach"; title: string; columns: { label: string; body: string }[]; action?: string; footnote?: string };

export type PrototypeDataContract = {
  endpoint: string;
  parameters: string[];
  sources: string[];
  responseFields: string[];
  caveat: string;
};

export type JournalPrototypePayload = {
  scope: JournalPrototypeScope;
  view: JournalPrototypeView;
  label: string;
  question: string;
  sample: string;
  coachStrip: string;
  takeaway: string;
  metrics: PrototypeMetric[];
  sections: PrototypeSection[];
  contract: PrototypeDataContract;
};

export type PrototypeMarketContext = {
  grade: 0 | 1 | 2 | 3 | 4;
  label: string;
  summary: string;
  moverCounts: { threshold: string; count: number }[];
  qualifiedCandidates: string;
  leadership: string;
  catalystMix: string;
  broadMarket: string;
  participation: { label: string; detail: string; tone: PrototypeTone };
  timeline: { time: string; grade: 0 | 1 | 2 | 3 | 4; label: string; detail: string }[];
  coverage: string;
};

export const journalAnchorMarketContext: PrototypeMarketContext = {
  grade: 3,
  label: "Productive",
  summary: "NXTC held clear leadership through the opening window; LGHL supplied a second tradable opportunity before momentum narrowed.",
  moverCounts: [
    { threshold: ">10%", count: 12 },
    { threshold: ">20%", count: 4 },
    { threshold: ">50%", count: 2 },
    { threshold: ">100%", count: 1 },
  ],
  qualifiedCandidates: "3 qualified · 1 clear leader",
  leadership: "NXTC clear → LGHL secondary → fading after 10:45",
  catalystMix: "1 fresh · 1 continuation · 1 no-news momentum",
  broadMarket: "Neutral to mild headwind · small caps remained independently active",
  participation: {
    label: "Slightly high",
    detail: "22 trades across 5 ticker sequences; participation stayed concentrated but exceeded the day baseline.",
    tone: "watch",
  },
  timeline: [
    { time: "09:30", grade: 3, label: "Productive", detail: "Multiple qualified names; NXTC leads." },
    { time: "10:05", grade: 3, label: "Productive", detail: "Leadership persists; LGHL joins." },
    { time: "10:45", grade: 2, label: "Selective", detail: "Momentum narrows; new attempts need stronger evidence." },
  ],
  coverage: "Prototype snapshot · scanner breadth + candidate review + SPY/QQQ context · ET",
};

const sharedParams = ["accountId", "anchorDate", "timezone=America/New_York"];

const payloads: Record<string, JournalPrototypePayload> = {
  "day:pnl": {
    scope: "day",
    view: "pnl",
    label: "Day · P&L",
    question: "How did the session unfold, and which names made the result?",
    sample: "22 trades · 10W / 12L · net of fees",
    coachStrip: "The second push recovered the early drawdown, but most of the result came from one ticker.",
    takeaway: "NXTC supplied 86% of the day’s net result; without it, the session was nearly flat.",
    metrics: [
      { label: "Net P&L", value: "+$1,129", tone: "positive" },
      { label: "Accuracy", value: "45.5%" },
      { label: "Profit factor", value: "1.55" },
      { label: "Peak give-back", value: "7.4%", tone: "watch" },
    ],
    sections: [
      {
        kind: "bars",
        title: "Intraday P&L path · ET",
        items: [
          { label: "09:30", value: -180, display: "−$180", tone: "negative" },
          { label: "09:45", value: -780, display: "−$780", tone: "negative", detail: "session trough" },
          { label: "10:00", value: 720, display: "+$720", tone: "positive", detail: "sign flip" },
          { label: "10:20", value: 1219, display: "+$1,219", tone: "positive", detail: "session peak" },
          { label: "10:45", value: 1129, display: "+$1,129", tone: "positive" },
        ],
        footnote: "Clock-time shape only; the production chart can reuse the existing cumulative P&L series.",
      },
      {
        kind: "rows",
        title: "Ticker contribution + note state",
        items: [
          { label: "NXTC · noted", value: 972, display: "+$972", tone: "positive" },
          { label: "LGHL · noted", value: 311, display: "+$311", tone: "positive" },
          { label: "VEEE · unnoted", value: -154, display: "−$154", tone: "negative" },
        ],
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=day&view=pnl",
      parameters: sharedParams,
      sources: ["trades", "executions", "journal_entries"],
      responseFields: ["pnlPoints[]", "tickerContribution[]", "summary", "noteState"],
      caveat: "Net values must use one fee policy across the header, path, and ticker rows.",
    },
  },
  "day:trades": {
    scope: "day",
    view: "trades",
    label: "Day · Trades",
    question: "What did trade behavior look like, apart from the final P&L?",
    sample: "22 trades · 5 ticker sequences",
    coachStrip: "Size increased after the first loss, while the winning hold remained shorter than the losing hold.",
    takeaway: "The re-entry worked, but the size progression and hold asymmetry are the reviewable process signals.",
    metrics: [
      { label: "Trades", value: "22" },
      { label: "Untagged", value: "36%", tone: "watch" },
      { label: "Hold W / L", value: "0.55×", tone: "negative" },
      { label: "Gap after loss", value: "5m" },
    ],
    sections: [
      {
        kind: "table",
        title: "Trade inventory",
        table: {
          columns: ["Time", "Ticker", "Side", "Candidate", "Attention", "Tag", "Held", "P&L"],
          rows: [
            ["09:15", "NXTC", "Long", "Strong", "Emerging", "Untagged", "1m 40s", "−$569"],
            ["09:22", "NXTC", "Long", "Strong", "Leader", "Held level", "55s", "+$975"],
            ["09:41", "LGHL", "Long", "Watchable", "Emerging", "Read", "2m 52s", "+$311"],
            ["10:09", "VEEE", "Long", "Weak", "Fading", "Untagged", "52s", "−$154"],
          ],
        },
        footnote: "Candidate quality and attention are entry-time snapshots. They do not use the final high of day or the later winning ticker.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=day&view=trades",
      parameters: sharedParams,
      sources: ["trades", "executions", "trade_tags", "tags", "candidate_snapshots"],
      responseFields: ["tradeRows[]", "candidateAtEntry", "attentionAtEntry", "untaggedRate", "holdRatio", "postLossGap"],
      caveat: "Hold ratio is descriptive at one-day resolution. Candidate and attention labels need a frozen entry-time snapshot, not reconstructed hindsight.",
    },
  },
  "day:process": {
    scope: "day",
    view: "process",
    label: "Day · Process",
    question: "Which observable rules were honored, broken, or still unclear after accounting for the opportunity set?",
    sample: "5 deterministic checks · 2 need trader context",
    coachStrip: "The hard stop held, but the post-loss reset and tag timing need context before Coach judges them.",
    takeaway: "One rule was clearly broken; two should remain watch items until the note explains intent.",
    metrics: [
      { label: "Honored", value: "2", tone: "positive" },
      { label: "Broken", value: "1", tone: "negative" },
      { label: "Watch", value: "2", tone: "watch" },
    ],
    sections: [
      {
        kind: "rules",
        title: "Rule + evidence status",
        rules: [
          { label: "Hard daily stop", status: "Honored", detail: "Session stayed inside −$2,500." },
          { label: "Pause after loss", status: "Watch", detail: "Five-minute gap; reset quality needs note context." },
          { label: "Size escalation", status: "Broken", detail: "400 → 700 shares immediately after a loss." },
          { label: "Tag before resolve", status: "Watch", detail: "Eight trades remained untagged at close." },
          { label: "Trade cutoff", status: "Clear", detail: "No new risk after 10:45 ET." },
        ],
        footnote: "Rule engine owns status. Coach commentary arrives only after review generation.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=day&view=process",
      parameters: sharedParams,
      sources: ["trades", "executions", "coach_playbooks", "journal_entries"],
      responseFields: ["ruleChecks[]", "status", "evidenceRefs[]", "contextNeeded"],
      caveat: "Do not infer mental-stop adherence from fills when no planned invalidation was captured.",
    },
  },
  "day:coach": {
    scope: "day",
    view: "coach",
    label: "Day · Coach",
    question: "Was the result driven by selection, timing, execution, risk, or participation?",
    sample: "Facts + market context + day note + 3 ticker notes",
    coachStrip: "The market offered real opportunity. Selection was mostly sound; the repeatable leak was increasing size before the reset had new evidence.",
    takeaway: "Right stocks, mostly right windows; the next improvement belongs to risk progression rather than finding more names.",
    metrics: [],
    sections: [
      {
        kind: "coach",
        title: "Signal + one thing to try",
        columns: [
          { label: "Diagnosis", body: "Selection was strong and participation was only slightly high. Size increased after a loss before the note identified new evidence." },
          { label: "One thing to try", body: "After a loss, name the new evidence before increasing size." },
        ],
        action: "Save experiment · 5 sessions",
        footnote: "Short, data-focused coaching—not a duplicate of the page verdict.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=day&view=coach",
      parameters: [...sharedParams, "coachReviewId"],
      sources: ["coach_reviews", "coach_experiments", "journal_entries", "market_context_snapshots", "candidate_snapshots"],
      responseFields: ["diagnosis", "selectionRead", "participationAlignment", "signals[]", "experiment", "evidenceRefs[]", "confidence"],
      caveat: "Generated copy must preserve evidence links and distinguish facts from trader-supplied context.",
    },
  },
  "week:pnl": {
    scope: "week",
    view: "pnl",
    label: "Week · P&L",
    question: "Was the week carried by one day or built consistently?",
    sample: "5 sessions · 128 trades · 1 no-trade day",
    coachStrip: "One outsized red day dominated an otherwise controlled week; Friday’s no-trade decision matched a thin tape.",
    takeaway: "Tuesday’s −$4,537 occurred during the week’s lowest-quality traded tape; Friday preserved capital when no clean leader developed.",
    metrics: [
      { label: "Week P&L", value: "−$800", tone: "negative" },
      { label: "Win rate", value: "46.7%" },
      { label: "Profit factor", value: "0.96" },
      { label: "Best / worst", value: "+$1,842 / −$4,537" },
    ],
    sections: [
      {
        kind: "bars",
        title: "Five session results",
        items: [
          { label: "Mon · G3 · 22 trades", value: 1129, display: "+$1,129", tone: "positive" },
          { label: "Tue · G1 · 57 trades", value: -4537, display: "−$4,537", tone: "negative", detail: "over-participated" },
          { label: "Wed · G2 · 18 trades", value: 766, display: "+$766", tone: "positive" },
          { label: "Thu · G4 · 31 trades", value: 1842, display: "+$1,842", tone: "positive", detail: "hot tape" },
          { label: "Fri · G1 · 0 trades", value: 0, display: "$0", tone: "neutral", detail: "aligned no-trade" },
        ],
        footnote: "G0–G4 is the opportunity-quality grade. Zero trades is a valid session outcome, not missing data.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=week&view=pnl",
      parameters: sharedParams,
      sources: ["trades", "executions", "market_context_snapshots"],
      responseFields: ["sessions[]", "tradeCount", "opportunityGrade", "participationAlignment", "summary", "bestDay", "worstDay"],
      caveat: "Aggregate net-of-fee P&L by ET session date. Distinguish no trades, no opportunity, missing scanner coverage, and market-closed days.",
    },
  },
  "week:edge": {
    scope: "week",
    view: "edge",
    label: "Week · Edge",
    question: "Which tagged behaviors carried positive or negative expectancy?",
    sample: "128 trades · 4 setup buckets",
    coachStrip: "Held-level entries carried the tagged sample; untagged trades and thin-tape participation erased the advantage.",
    takeaway: "Held-level entries averaged +$31 per trade; untagged trades averaged −$59. Dollar expectancy is shown because planned-risk coverage is incomplete.",
    metrics: [
      { label: "Tagged coverage", value: "72%" },
      { label: "Overall expectancy", value: "−$6 / trade", tone: "negative" },
      { label: "Planned-risk coverage", value: "34%", tone: "watch", detail: "R hidden" },
    ],
    sections: [
      {
        kind: "rows",
        title: "Expectancy by setup tag",
        items: [
          { label: "Held level · n=39 · PF 1.48", value: 31, display: "+$31", tone: "positive" },
          { label: "Compression · n=28 · PF 1.21", value: 12, display: "+$12", tone: "positive" },
          { label: "Read · n=25 · PF 0.98", value: -9, display: "−$9", tone: "negative" },
          { label: "Untagged · n=36 · PF 0.73", value: -59, display: "−$59", tone: "negative" },
        ],
        footnote: "Average net dollars per trade. Treat these small buckets as directional; roughly 50–100 trades per tag before acting.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=week&view=edge",
      parameters: sharedParams,
      sources: ["trades", "trade_tags", "tags"],
      responseFields: ["setupBuckets[]", "sampleSize", "winRate", "profitFactor", "expectancyDollars", "plannedRiskCoverage"],
      caveat: "Tag timing and missingness affect trust. Show R only when planned risk was captured reliably; untagged remains visible as its own bucket.",
    },
  },
  "week:alignment": {
    scope: "week",
    view: "alignment",
    label: "Week · Alignment",
    question: "Did participation match what the market was offering each day?",
    sample: "5 sessions · opportunity × activity",
    coachStrip: "Participation matched the tape on four days. Tuesday was the exception: 57 trades during a thin Grade 1 session.",
    takeaway: "The week’s largest loss was also its clearest context mismatch; Friday’s zero-trade day was aligned, not missing activity.",
    metrics: [
      { label: "Aligned sessions", value: "4 / 5", tone: "positive" },
      { label: "Over-participated", value: "1", tone: "negative" },
      { label: "No-trade decisions", value: "1", tone: "positive" },
      { label: "Median opportunity", value: "G2 · Selective" },
    ],
    sections: [
      {
        kind: "table",
        title: "Opportunity quality vs activity",
        table: {
          columns: ["Day", "Grade", "Tape", "Trades", "Participation"],
          rows: [
            ["Mon", "G3", "Productive", "22", "Aligned"],
            ["Tue", "G1", "Thin", "57", "Over-participated"],
            ["Wed", "G2", "Selective", "18", "Aligned"],
            ["Thu", "G4", "Hot", "31", "Aligned"],
            ["Fri", "G1", "Thin", "0", "Aligned no-trade"],
          ],
        },
        footnote: "Alignment compares activity with the opportunity set. It does not infer boredom, FOMO, or tilt without trader-authored context.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=week&view=alignment",
      parameters: sharedParams,
      sources: ["trades", "market_context_snapshots", "scanner_daily_summaries"],
      responseFields: ["sessionAlignment[]", "opportunityGrade", "tradeCount", "participationState", "coverage"],
      caveat: "A context mismatch is observable behavior, not proof of an emotional state. Missing scanner capture must remain distinct from a Grade 0–1 tape.",
    },
  },
  "week:coach": {
    scope: "week",
    view: "coach",
    label: "Week · Coach",
    question: "What repeated, what drifted, and what is ready to formalize?",
    sample: "5 day reviews · 1 active experiment",
    coachStrip: "Participation matched market quality on four days; Tuesday’s thin-tape overtrading was the exception.",
    takeaway: "Selection quality and participation alignment now explain more of the week than win rate alone.",
    metrics: [],
    sections: [
      {
        kind: "coach",
        title: "Weekly read",
        columns: [
          { label: "What clustered", body: "Held-level entries worked across fresh, continuation, and no-news momentum candidates when leadership was still clear." },
          { label: "What drifted", body: "Tuesday produced 57 trades in a Grade 1 tape; untagged attempts continued after the only leader faded." },
        ],
        action: "Experiment candidate · cap attempts after leadership fades",
        footnote: "Weekly reads also appear in the reverse-chron Coach feed.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=week&view=coach",
      parameters: sharedParams,
      sources: ["coach_reviews", "coach_experiments", "journal_entries", "trade_tags", "market_context_snapshots"],
      responseFields: ["clusters[]", "drifts[]", "participationAlignment", "protoSetupCandidate", "evidenceRefs[]"],
      caveat: "Coach may surface a candidate, but the trader chooses whether it enters the playbook.",
    },
  },
  "month:pnl": {
    scope: "month",
    view: "pnl",
    label: "Month · P&L",
    question: "How were outcomes distributed across the month?",
    sample: "19 sessions · 1,050 trades",
    coachStrip: "Most sessions were small; two outlier red days determined the month.",
    takeaway: "Ten red sessions outweighed nine green sessions because the worst two days contributed 62% of losses.",
    metrics: [
      { label: "Month P&L", value: "−$18,100", tone: "negative" },
      { label: "Green / red days", value: "9 / 10" },
      { label: "Win rate", value: "44.5%" },
      { label: "Profit factor", value: "0.80" },
      { label: "Worst day", value: "−$6,427", tone: "negative" },
    ],
    sections: [
      {
        kind: "heatmap",
        title: "Session heat · Mon–Fri",
        cells: [
          { label: "1", value: "+$820", intensity: 1, tone: "positive" },
          { label: "2", value: "−$723", intensity: 1, tone: "negative" },
          { label: "3", value: "+$1,129", intensity: 2, tone: "positive" },
          { label: "6", value: "−$4,537", intensity: 3, tone: "negative" },
          { label: "7", value: "+$766", intensity: 1, tone: "positive" },
          { label: "8", value: "+$1,842", intensity: 2, tone: "positive" },
          { label: "9", value: "−$1,923", intensity: 2, tone: "negative" },
          { label: "10", value: "+$278", intensity: 1, tone: "positive" },
          { label: "13", value: "−$6,427", intensity: 3, tone: "negative" },
          { label: "14", value: "+$1,129", intensity: 2, tone: "positive" },
          { label: "15", value: "−$982", intensity: 1, tone: "negative" },
          { label: "16", value: "+$643", intensity: 1, tone: "positive" },
          { label: "17", value: "—", intensity: 0, tone: "empty" },
          { label: "20", value: "—", intensity: 0, tone: "empty" },
          { label: "21", value: "—", intensity: 0, tone: "empty" },
        ],
        footnote: "Intensity represents absolute day size; future sessions remain empty.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=month&view=pnl",
      parameters: sharedParams,
      sources: ["trades", "executions"],
      responseFields: ["sessions[]", "heatCells[]", "summary", "bestDay", "worstDay"],
      caveat: "Heat intensity should scale within the visible month and keep signed values readable without color.",
    },
  },
  "month:horizon": {
    scope: "month",
    view: "horizon",
    label: "Month · Horizon",
    question: "Is the measured edge improving, stable, or fading across honest windows?",
    sample: "30d / 60d / 90d / YTD",
    coachStrip: "Expectancy remains positive, but profit factor has faded across the longer windows.",
    takeaway: "Recent expectancy improved, while YTD profit factor remains weaker—promising, not yet a regime change.",
    metrics: [],
    sections: [
      {
        kind: "table",
        title: "Edge by window",
        table: {
          columns: ["Window", "Trades", "Exp / trade", "Win%", "PF", "Trend"],
          rows: [
            ["30d", "1,833", "+$36", "46.3%", "1.23", "Improving"],
            ["60d", "3,839", "+$26", "45.4%", "1.21", "Stable"],
            ["90d", "5,496", "+$21", "45.7%", "1.20", "Stable"],
            ["YTD", "7,275", "+$14", "45.3%", "1.15", "Fading"],
          ],
        },
        footnote: "Trend detection—not reacting to one window—is the purpose of this view.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=month&view=horizon",
      parameters: sharedParams,
      sources: ["trades", "executions"],
      responseFields: ["windows[]", "tradeCount", "expectancyPerTrade", "winRate", "profitFactor", "trend"],
      caveat: "Each window is computed as of the selected month end; no look-ahead data.",
    },
  },
  "month:risk": {
    scope: "month",
    view: "risk",
    label: "Month · Risk",
    question: "How costly was the left tail, and where did realized losses concentrate?",
    sample: "19 sessions · dollar risk view",
    coachStrip: "Two sessions created most of the month’s loss; this view stays descriptive until planned risk and rule coverage improve.",
    takeaway: "The worst two days produced 62% of gross losses, and above-baseline activity days contained 71% of the damage.",
    metrics: [
      { label: "Max drawdown", value: "−$17,049", tone: "negative" },
      { label: "Worst day", value: "−$6,427", tone: "negative" },
      { label: "Worst 2 / losses", value: "62%", tone: "watch" },
      { label: "Peak give-back", value: "−$3,120", tone: "negative" },
      { label: "High-activity loss share", value: "71%", tone: "watch" },
      { label: "Fees", value: "−$911", tone: "negative" },
    ],
    sections: [
      {
        kind: "rows",
        title: "Realized loss concentration",
        items: [
          { label: "Worst two sessions", value: 62, display: "62%", tone: "negative" },
          { label: "Above-baseline activity days", value: 71, display: "71%", tone: "negative" },
          { label: "All other sessions", value: 29, display: "29%", tone: "neutral" },
        ],
        footnote: "Shares of realized gross loss. These are descriptive associations, not simulated claims about what a rule would have saved.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=month&view=risk",
      parameters: [...sharedParams, "riskUnit=dollars"],
      sources: ["trades", "executions"],
      responseFields: ["drawdown", "worstDays[]", "lossConcentration", "giveBack", "activityBuckets[]", "caveats[]"],
      caveat: "No Kelly, Sharpe-in-R, or counterfactual stop simulation until planned risk and declared-rule coverage are reliable.",
    },
  },
  "month:coach": {
    scope: "month",
    view: "coach",
    label: "Month · Coach",
    question: "Which findings converged, what remains open, and what changes next?",
    sample: "19 day reviews · 4 weekly reads · 2 experiments",
    coachStrip: "The monthly review is where repeated patterns, context alignment, and experiment outcomes can justify a playbook change.",
    takeaway: "Held-level entries converged as a positive cluster; participation during Grade 0–1 tapes remains the unresolved leak.",
    metrics: [],
    sections: [
      {
        kind: "coach",
        title: "Monthly review",
        columns: [
          { label: "Converged", body: "Held-level entries remained positive across fresh, continuation, and no-news momentum candidates when leadership was clear." },
          { label: "Still open", body: "Participation on Grade 0–1 tapes improved, but the sample remains too small to change the playbook." },
        ],
        action: "Formalize what clustered · review experiment outcomes",
        footnote: "Coach may discuss risk concentration here, but advanced sizing metrics remain outside the V1 Journal evidence set.",
      },
    ],
    contract: {
      endpoint: "/api/preview/journal?scope=month&view=coach",
      parameters: sharedParams,
      sources: ["coach_reviews", "coach_experiments", "coach_playbooks", "journal_entries", "market_context_snapshots"],
      responseFields: ["converged[]", "open[]", "contextAlignment", "experimentOutcomes[]", "promotionCandidate"],
      caveat: "Promotion to the playbook stays a user decision; Coach supplies evidence and confidence.",
    },
  },
};

export function isJournalPrototypeScope(value: string | null): value is JournalPrototypeScope {
  return value === "day" || value === "week" || value === "month";
}

export function isViewForScope(scope: JournalPrototypeScope, value: string | null): value is JournalPrototypeView {
  return Boolean(value && (journalScopeViews[scope] as readonly string[]).includes(value));
}

export function getJournalPrototypePayload(scope: JournalPrototypeScope, view: JournalPrototypeView): JournalPrototypePayload {
  const payload = payloads[`${scope}:${view}`];
  if (!payload) throw new Error(`Unknown journal prototype view: ${scope}:${view}`);
  return payload;
}
