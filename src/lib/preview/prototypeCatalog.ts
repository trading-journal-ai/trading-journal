import { execFileSync } from "node:child_process";

import { dataVizPreviewRoutes } from "./dataVizPreviewRoutes";

/**
 * Master catalog of every non-production prototype / preview / review / mock
 * surface in the app. Powers the triage index at /preview, where each entry
 * can be marked Keep or Remove so the sprawl can be pruned deliberately.
 *
 * When you add a new throwaway route, add it here so it shows up for triage.
 */

export type PrototypeGroupKey =
  | "data-viz"
  | "product"
  | "journal-review"
  | "review-misc"
  | "in-app-mock"
  | "static";

export type PrototypeEntry = {
  /** Stable key for triage state (also the removal target when no `file`). */
  id: string;
  /** Live route to open, if it is a Next.js page. Omit for static files. */
  href?: string;
  /** Repo-relative path used for the age badge and the removal list. */
  file: string;
  title: string;
  description: string;
  meta: string;
  group: PrototypeGroupKey;
  /** Paused/active exploration that should be preserved, not pruned. */
  pinned?: boolean;
};

export type PrototypeGroup = {
  key: PrototypeGroupKey;
  label: string;
  blurb: string;
};

export const PROTOTYPE_GROUPS: PrototypeGroup[] = [
  {
    key: "data-viz",
    label: "Data-visualization studies",
    blurb:
      "Paused exploration (v1–v7). Preserved by default — resume from v7, do not prune without a decision.",
  },
  {
    key: "product",
    label: "Product workflows",
    blurb: "Working and wireframe explorations of the core review, coach, and playbook flows.",
  },
  {
    key: "journal-review",
    label: "Journal recap prototypes",
    blurb: "Competing directions for the daily journal recap and coach interpretation. Likely where the most consolidation is possible.",
  },
  {
    key: "review-misc",
    label: "Other design reviews",
    blurb: "Standalone dashboard and journal-content review surfaces under /review.",
  },
  {
    key: "in-app-mock",
    label: "In-app mock routes",
    blurb: "Mock/prototype routes that ship inside the real (app) route group. Strong cleanup candidates.",
  },
  {
    key: "static",
    label: "Static samples & HTML",
    blurb: "Committed HTML/JSX explorations (not live routes). Includes the ~6 MB of vendored sample builds flagged in CODE_REVIEW.md.",
  },
];

const dataVizEntries: PrototypeEntry[] = [
  {
    id: "/preview/data-viz",
    href: "/preview/data-viz",
    file: "src/app/preview/data-viz/page.tsx",
    title: "Data-viz collection index",
    description: "Landing page for the data-visualization study collection.",
    meta: "Index",
    group: "data-viz",
    pinned: true,
  },
  ...dataVizPreviewRoutes.map<PrototypeEntry>((study) => ({
    id: study.href,
    href: study.href,
    file: `src/app${study.href}/page.tsx`,
    title: study.title,
    description: study.description,
    meta: `${study.version} · ${study.meta}`,
    group: "data-viz",
    pinned: true,
  })),
];

const productEntries: PrototypeEntry[] = [
  {
    id: "/preview/journal",
    href: "/preview/journal",
    file: "src/app/preview/journal/page.tsx",
    title: "Journal review workspace",
    description: "Day, week, and month review states for deciding what belongs in the journal before and after Coach interpretation.",
    meta: "Interactive prototype",
    group: "product",
  },
  {
    id: "/preview/coach",
    href: "/preview/coach",
    file: "src/app/preview/coach/page.tsx",
    title: "AI Coach conversation",
    description: "A working coach chat for debriefing the session, dictating context, and returning to process with model or fallback responses.",
    meta: "Working preview",
    group: "product",
  },
  {
    id: "/preview/playbook",
    href: "/preview/playbook",
    file: "src/app/preview/playbook/page.tsx",
    title: "Playbook workspace",
    description: "A wireframe for archiving one high-signal play, developing setup rules, and rehearsing the best examples.",
    meta: "Workflow wireframe",
    group: "product",
  },
];

const journalReviewEntries: PrototypeEntry[] = [
  {
    id: "/review/journal",
    href: "/review/journal",
    file: "src/app/review/journal/page.tsx",
    title: "Journal data-exploration wireframe",
    description: "The base journal review wireframe: before/after content and coach feed.",
    meta: "Wireframe",
    group: "journal-review",
  },
  {
    id: "/review/journal/ai-first-recap",
    href: "/review/journal/ai-first-recap",
    file: "src/app/review/journal/ai-first-recap/page.tsx",
    title: "AI-first daily recap",
    description: "An evidence-led recap with lightweight trader context, one Coach focus, explanatory visuals, and a trade review queue.",
    meta: "Clickable prototype",
    group: "journal-review",
  },
  {
    id: "/review/journal/coach-recap-spine",
    href: "/review/journal/coach-recap-spine",
    file: "src/app/review/journal/coach-recap-spine/page.tsx",
    title: "Coach recap spine",
    description: "An import-ready, coach-first recap with playbook alignment, targeted questions, and progressively disclosed analytics.",
    meta: "Clickable prototype",
    group: "journal-review",
  },
  {
    id: "/review/journal/coach-review-mockup",
    href: "/review/journal/coach-review-mockup",
    file: "src/app/review/journal/coach-review-mockup/page.tsx",
    title: "Coach review mockup",
    description: "A completed daily recap combining dashboard inputs, coach review, statistical evidence, and carry-forward cues.",
    meta: "Journal structure",
    group: "journal-review",
  },
  {
    id: "/review/journal/day-recap-redesign",
    href: "/review/journal/day-recap-redesign",
    file: "src/app/review/journal/day-recap-redesign/page.tsx",
    title: "Journal day recap redesign",
    description: "One recap object with two voices: the trader's read followed by a deterministic Coach interpretation.",
    meta: "Visual mockup",
    group: "journal-review",
  },
  {
    id: "/review/journal/prototype-flow",
    href: "/review/journal/prototype-flow",
    file: "src/app/review/journal/prototype-flow/page.tsx",
    title: "Daily recap flow",
    description: "The complete loop from Dashboard to trade import, recap editing, Journal save, and return with carry-forward cues.",
    meta: "End-to-end flow",
    group: "journal-review",
  },
  {
    id: "/review/journal/tag-taxonomy",
    href: "/review/journal/tag-taxonomy",
    file: "src/app/review/journal/tag-taxonomy/page.tsx",
    title: "Tag taxonomy",
    description: "Trade-review tag taxonomy and visual-system reference surface.",
    meta: "Reference",
    group: "journal-review",
  },
];

const reviewMiscEntries: PrototypeEntry[] = [
  {
    id: "/review/dashboard",
    href: "/review/dashboard",
    file: "src/app/review/dashboard/page.tsx",
    title: "Dashboard design variations",
    description: "Three switchable directions for the Dashboard: base layout, active orientation loop, and sticky-board treatment.",
    meta: "3 variations",
    group: "review-misc",
  },
  {
    id: "/review/journal-content",
    href: "/review/journal-content",
    file: "src/app/review/journal-content/page.tsx",
    title: "Journal content review",
    description: "A review surface for journal content structure.",
    meta: "Review surface",
    group: "review-misc",
  },
  {
    id: "/review/journal-coach-recap",
    href: "/review/journal-coach-recap",
    file: "src/app/review/journal-coach-recap/page.tsx",
    title: "Journal coach recap",
    description: "A standalone journal + coach recap review surface.",
    meta: "Review surface",
    group: "review-misc",
  },
];

const inAppMockEntries: PrototypeEntry[] = [
  {
    id: "/journal/mock",
    href: "/journal/mock",
    file: "src/app/(app)/journal/mock/page.tsx",
    title: "Journal mock",
    description: "Mock journal surface living inside the real (app) route group.",
    meta: "In-app mock",
    group: "in-app-mock",
  },
  {
    id: "/journal/mock/day",
    href: "/journal/mock/day",
    file: "src/app/(app)/journal/mock/day/page.tsx",
    title: "Journal mock — day",
    description: "Mock day view.",
    meta: "In-app mock",
    group: "in-app-mock",
  },
  {
    id: "/journal/mock/month",
    href: "/journal/mock/month",
    file: "src/app/(app)/journal/mock/month/page.tsx",
    title: "Journal mock — month",
    description: "Mock month view.",
    meta: "In-app mock",
    group: "in-app-mock",
  },
  {
    id: "/reports/stats-mock",
    href: "/reports/stats-mock",
    file: "src/app/(app)/reports/stats-mock/page.tsx",
    title: "Reports stats mock",
    description: "Mock of the reports stats matrix.",
    meta: "In-app mock",
    group: "in-app-mock",
  },
  {
    id: "/trades/lightweight-prototype",
    href: "/trades/lightweight-prototype",
    file: "src/app/(app)/trades/lightweight-prototype/page.tsx",
    title: "Trades lightweight-chart prototype",
    description: "Prototype of the lightweight trade chart integration.",
    meta: "In-app prototype",
    group: "in-app-mock",
  },
  {
    id: "/trades/review/mock",
    href: "/trades/review/mock",
    file: "src/app/(app)/trades/review/mock/page.tsx",
    title: "Trade review mock",
    description: "Mock of the trade-review surface.",
    meta: "In-app mock",
    group: "in-app-mock",
  },
];

const staticEntries: PrototypeEntry[] = [
  {
    id: "samples/Journal Design",
    file: "samples/Journal Design",
    title: "Journal Design samples",
    description: "Vendored React dev builds (~1.4 MB each) of journal/dashboard explorations. The bulk of the repo bloat flagged in CODE_REVIEW.md.",
    meta: "Sample dir",
    group: "static",
  },
  {
    id: "samples/landing-page",
    file: "samples/landing-page",
    title: "Landing page sample",
    description: "Static landing-page exploration.",
    meta: "Sample dir",
    group: "static",
  },
  {
    id: "samples/landing-page-design",
    file: "samples/landing-page-design",
    title: "Landing page design sample",
    description: "Static landing-page design exploration.",
    meta: "Sample dir",
    group: "static",
  },
  {
    id: "docs/design/prototypes/trade_chart-prototype.html",
    file: "docs/design/prototypes/trade_chart (10)-prototype.html",
    title: "Trade chart prototype (HTML)",
    description: "One-off static trade-chart HTML prototype.",
    meta: "HTML prototype",
    group: "static",
  },
  {
    id: "docs/design/themes/journal-visual-directions.html",
    file: "docs/design/themes/journal-visual-directions.html",
    title: "Journal visual directions (HTML)",
    description: "Broad journal visual-direction exploration (1.9k lines). Not the shipped themes.",
    meta: "HTML exploration",
    group: "static",
  },
];

export const PROTOTYPE_CATALOG: PrototypeEntry[] = [
  ...dataVizEntries,
  ...productEntries,
  ...journalReviewEntries,
  ...reviewMiscEntries,
  ...inAppMockEntries,
  ...staticEntries,
];

/**
 * Last commit date (YYYY-MM-DD) for a repo path, or null if uncommitted/new.
 * Server-only — shells out to git. Safe on the dev-only /preview page.
 */
export function lastCommitDate(file: string): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

export type PrototypeEntryWithDate = PrototypeEntry & { lastCommit: string | null };

/** Attach git dates to every catalog entry. Server-only. */
export function catalogWithDates(): PrototypeEntryWithDate[] {
  return PROTOTYPE_CATALOG.map((entry) => ({ ...entry, lastCommit: lastCommitDate(entry.file) }));
}
