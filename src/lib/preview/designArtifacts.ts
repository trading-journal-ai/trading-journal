import { lastCommitDate } from "./prototypeCatalog";

/**
 * Catalog of graphical design explorations — the visual artifacts behind the
 * design system's tone. Powers the review surface at /preview/design-artifacts,
 * where each can be marked Keep or Remove.
 *
 * Sources today: the journal recap wireframes (imported from a design zip) and
 * the in-repo theme / sample / prototype HTML. Once the Claude Design project is
 * populated, synced artifacts can be added here as another group.
 */

export type ArtifactKind = "image" | "html" | "dir" | "external";

export type DesignArtifactGroupKey = "wireframes" | "themes" | "samples" | "prototypes" | "claude-design";

export type DesignArtifact = {
  id: string;
  title: string;
  description: string;
  kind: ArtifactKind;
  /** Repo-relative source path, or (for external artifacts) a stable label — the removal/harvest target. */
  file: string;
  /** Web-servable URL for a live thumbnail/preview (images under /public only). */
  src?: string;
  /** For external (Claude Design) artifacts: display date (YYYY-MM-DD) since there is no git commit. */
  sourceDate?: string;
  /** For external artifacts: link out to Claude Design. */
  externalUrl?: string;
  group: DesignArtifactGroupKey;
};

export type DesignArtifactGroup = {
  key: DesignArtifactGroupKey;
  label: string;
  blurb: string;
};

export const DESIGN_ARTIFACT_GROUPS: DesignArtifactGroup[] = [
  {
    key: "wireframes",
    label: "Journal recap wireframes",
    blurb: "The freshest graphical exploration — the before/after page, coach feed, and day/week/month inventories that set the recap tone.",
  },
  {
    key: "themes",
    label: "Theme & visual directions",
    blurb: "The warm-theme packages and the visual-directions study that resolved the Editorial vs Ledger-Terminal fork. Daylight/Evening shipped from here.",
  },
  {
    key: "samples",
    label: "Sample directions",
    blurb: "The two named tonal directions and landing-page explorations. Heavy vendored builds — strong candidates to prune once captured.",
  },
  {
    key: "prototypes",
    label: "Static prototypes",
    blurb: "One-off HTML prototypes kept for reference.",
  },
  {
    key: "claude-design",
    label: "Claude Design projects",
    blurb:
      "Design work living in Claude Design, not yet in the repo. Pointers only — the sync tool can't enumerate or pull these (they aren't design-system projects), so there are no thumbnails yet. Export a project (like Design Structure) to pull real visuals. Keep = worth harvesting into the repo; Remove = leave in Claude Design.",
  },
];

const wireframeFiles: { slug: string; title: string; description: string }[] = [
  { slug: "1a-page-before", title: "Page — before generation", description: "The recap page in its starter state, before the coach generates." },
  { slug: "1b-page-after", title: "Page — after generation", description: "Same page after generation: coach verdict replaces the starter in place, bullets cite evidence." },
  { slug: "1c-coach-feed", title: "Coach feed", description: "The coach conversation feed alongside the recap." },
  { slug: "2a-day-inventory", title: "Day inventory", description: "What belongs in the day view — the inventory of modules." },
  { slug: "2b-week-inventory", title: "Week inventory", description: "Module inventory for the week view." },
  { slug: "2c-month-inventory", title: "Month inventory", description: "Module inventory for the month view." },
  { slug: "3a-day", title: "Day — behavioral", description: "Day layout: P&L / trades / process / coach segmented views, same-day valid." },
  { slug: "3b-week", title: "Week", description: "Week recap layout." },
  { slug: "3c-month", title: "Month", description: "Month recap layout." },
];

const wireframeEntries: DesignArtifact[] = wireframeFiles.map((wf) => ({
  id: `wireframe-${wf.slug}`,
  title: wf.title,
  description: wf.description,
  kind: "image",
  file: `public/design-artifacts/wireframes/wireframe-${wf.slug}.png`,
  src: `/design-artifacts/wireframes/wireframe-${wf.slug}.png`,
  group: "wireframes",
}));

const themeEntries: DesignArtifact[] = [
  {
    id: "daylight-theme-v1",
    title: "Daylight theme v1",
    description: "Warm light theme package — cream ground, amber accent, coach green. Shipped as data-theme=\"daylight\".",
    kind: "html",
    file: "docs/design/themes/daylight-theme-v1.html",
    group: "themes",
  },
  {
    id: "evening-theme-v1",
    title: "Evening theme v1",
    description: "Warm charcoal dark theme package. Shipped as data-theme=\"evening\".",
    kind: "html",
    file: "docs/design/themes/evening-theme-v1.html",
    group: "themes",
  },
  {
    id: "journal-visual-directions",
    title: "Journal visual directions",
    description: "The exploration that tested Editorial (Newsreader serif) vs Ledger-Terminal and resolved toward warm editorial. Source for the shipped palette; the serif voice was deferred.",
    kind: "html",
    file: "docs/design/themes/journal-visual-directions.html",
    group: "themes",
  },
];

const sampleEntries: DesignArtifact[] = [
  {
    id: "sample-journal-editorial",
    title: "Journal — Editorial direction",
    description: "The warm editorial direction (serif accents). The tone that won.",
    kind: "html",
    file: "samples/Journal Design/Journal Editorial.html",
    group: "samples",
  },
  {
    id: "sample-journal-ledger-terminal",
    title: "Journal — Ledger-Terminal direction",
    description: "The mono/terminal direction. The alternative that was set aside.",
    kind: "html",
    file: "samples/Journal Design/Journal Ledher-Terminal.html",
    group: "samples",
  },
  {
    id: "sample-landing-page-design",
    title: "Landing page design",
    description: "Landing-page design exploration.",
    kind: "dir",
    file: "samples/landing-page-design",
    group: "samples",
  },
  {
    id: "sample-landing-page",
    title: "Landing page",
    description: "Landing-page build sample.",
    kind: "dir",
    file: "samples/landing-page",
    group: "samples",
  },
];

const prototypeEntries: DesignArtifact[] = [
  {
    id: "trade-chart-prototype",
    title: "Trade chart prototype",
    description: "One-off static trade-chart HTML prototype.",
    kind: "html",
    file: "docs/design/prototypes/trade_chart (10)-prototype.html",
    group: "prototypes",
  },
];

/**
 * Claude Design projects, transcribed from the project list (2026-07-22).
 * These live in claude.ai/design, not the repo. The sync tool only surfaces
 * design-*system* projects (just the empty "Trading Journal AI - Landing"), so
 * these regular projects can't be enumerated or pulled programmatically — they
 * are catalogued here as pointers. Export one to ingest real thumbnails.
 */
const CLAUDE_DESIGN_URL = "https://claude.ai/design";

const claudeDesignProjects: { slug: string; title: string; date: string; description: string }[] = [
  { slug: "taxonomy-modal", title: "Taxonomy modal design for notes", date: "2026-07-22", description: "Modal design for the notes tagging taxonomy." },
  { slug: "coach-review-payload", title: "Coach review payload formatting", date: "2026-07-21", description: "Formatting of the coach review payload." },
  { slug: "journal-edge-cases", title: "Trading journal edge cases", date: "2026-07-21", description: "Edge-case UI explorations." },
  { slug: "trade-execution-popover", title: "Trade execution popover redesign", date: "2026-07-20", description: "Redesign of the trade-execution popover." },
  { slug: "journal-page-redesign", title: "Journal page redesign discussion", date: "2026-07-19", description: "Journal page redesign discussion." },
  { slug: "creative-data-viz", title: "Creative data visualization approaches", date: "2026-07-19", description: "Data-viz exploration — relates to the /preview/data-viz studies." },
  { slug: "design-structure", title: "Trading Journal Design Structure", date: "2026-07-19", description: "Source of the journal recap wireframes already imported above." },
  { slug: "visual-project-refresh", title: "Visual project refresh", date: "2026-07-14", description: "Broad visual refresh pass." },
  { slug: "theme-refinement", title: "Trading journal theme refinement", date: "2026-07-13", description: "Warm-theme refinement — feeds the daylight/evening palette. Design-system relevant." },
  { slug: "visual-directions", title: "Trading Journal AI visual directions", date: "2026-07-12", description: "The Editorial vs Ledger-Terminal directions that set the tone. Design-system relevant." },
  { slug: "design-system-extraction", title: "Design system from Trading Journal", date: "2026-07-12", description: "A design-system extraction — candidate to reconcile with DESIGN_SYSTEM.md." },
  { slug: "daily-recap-design", title: "Trading journal daily recap design", date: "2026-07-11", description: "Daily recap layout design." },
  { slug: "level-2-simulator", title: "Level 2 Simulator UI Refresh", date: "2026-07-10", description: "Level 2 simulator UI refresh." },
  { slug: "shared-screenshot", title: "Shared screenshot", date: "2026-07-10", description: "Shared screenshot artifact." },
  { slug: "circle-animation", title: "Circle animation improvement", date: "2026-07-07", description: "Animation exploration." },
  { slug: "trees-to-trails", title: "Trees to Trails redesign", date: "2026-07-03", description: "Redesign exploration." },
  { slug: "font-selection", title: "Font selection request", date: "2026-07-02", description: "Typography / font selection — relevant to the deferred serif decision. Design-system relevant." },
  { slug: "stock-buttons-pills", title: "Stock app buttons and pills", date: "2026-06-30", description: "Button and pill component tone. Design-system relevant." },
  { slug: "journal-early", title: "Journal", date: "2026-06-28", description: "Early journal design." },
];

const claudeDesignEntries: DesignArtifact[] = claudeDesignProjects.map((p) => ({
  id: `claude-design-${p.slug}`,
  title: p.title,
  description: p.description,
  kind: "external",
  file: `claude-design: ${p.title}`,
  sourceDate: p.date,
  externalUrl: CLAUDE_DESIGN_URL,
  group: "claude-design",
}));

export const DESIGN_ARTIFACTS: DesignArtifact[] = [
  ...wireframeEntries,
  ...themeEntries,
  ...sampleEntries,
  ...prototypeEntries,
  ...claudeDesignEntries,
];

export type DesignArtifactWithDate = DesignArtifact & { lastCommit: string | null };

/** Attach git dates to every artifact. Server-only. */
export function designArtifactsWithDates(): DesignArtifactWithDate[] {
  return DESIGN_ARTIFACTS.map((artifact) => ({ ...artifact, lastCommit: lastCommitDate(artifact.file) }));
}
