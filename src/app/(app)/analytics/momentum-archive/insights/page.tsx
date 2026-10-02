import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Link from "next/link";
import AnalyticsSectionTabs from "@/components/AnalyticsSectionTabs";
import PeriodTabs from "@/components/ui/PeriodTabs";
import CurlLabeler from "@/components/marketInsights/CurlLabeler";
import MarketInsightsPrototype from "@/components/marketInsights/MarketInsightsPrototype";
import type { InsightsData } from "@/lib/marketInsights";
import { curlDaySummaries, curlLabelState } from "@/lib/marketInsightsStore";

export const dynamic = "force-dynamic";

/** Built offline by scripts/market-context-research/build-insights.py; gitignored, never committed. */
const DATA_PATH = "data/evals/market-insights/insights.json";
const BASE = "/analytics/momentum-archive/insights";

async function loadInsights(): Promise<InsightsData | null> {
  try {
    return JSON.parse(await readFile(resolve(process.env.MARKET_INSIGHTS_PATH ?? DATA_PATH), "utf8")) as InsightsData;
  } catch {
    return null;
  }
}

function MissingData({ command }: { command: string }) {
  return (
    <div className="max-w-2xl border-t border-[var(--hairline)] pt-6 text-[15px] leading-7 text-[var(--body)]">
      <p>No dataset is available yet. Build one from local market data, then reload this page:</p>
      <pre className="mt-3 overflow-x-auto rounded-md bg-[var(--surface)] p-3 font-mono text-[12.5px] leading-6 text-[var(--foreground)]">{command}</pre>
      <p className="mt-3 text-[13px] text-[var(--muted)]">Files stay in the gitignored data/evals folder. Nothing on this page calls Trading Server or a market-data provider.</p>
    </div>
  );
}

export default async function MarketInsightsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view === "dips" ? "dips" : "label";
  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsSectionTabs active="momentum" className="mb-6" />
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-baseline gap-3 text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--foreground)]">
          Insights
          <span className="rounded-full border border-[var(--hairline)] px-2.5 py-0.5 text-[12px] font-medium tracking-normal text-[var(--muted)]">Prototype</span>
        </h1>
        <Link href="/analytics/momentum-archive" className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
          Back to Market Context
        </Link>
      </div>
      <PeriodTabs ariaLabel="Insights views" value={view} className="mb-8 border-b border-[var(--hairline)]"
        items={[{ value: "label", label: "Structure review", href: `${BASE}?view=label` }, { value: "dips", label: "Pullback research", href: `${BASE}?view=dips` }]} />
      {view === "label" ? <LabelView /> : <DipView />}
    </div>
  );
}

async function DipView() {
  const data = await loadInsights();
  return data ? <MarketInsightsPrototype data={data} /> : <MissingData command={`python3 scripts/market-context-research/build-insights.py \\
  --candles data/evals/market-insights/sample-candles.json \\
  --movers data/evals/market-insights/movers.json \\
  --out ${DATA_PATH}`} />;
}

async function LabelView() {
  const [days, state] = await Promise.all([curlDaySummaries(), curlLabelState()]);
  return days?.length
    ? <CurlLabeler days={days} initialLabels={state.labels} initialAgreement={state.agreement} initialZoneReview={state.zoneReview} />
    : <MissingData command={`python3 scripts/market-context-research/build-curl-days.py \\
  --candles data/evals/market-insights/sample-candles.json \\
  --out data/evals/market-insights/curl-days.json`} />;
}
