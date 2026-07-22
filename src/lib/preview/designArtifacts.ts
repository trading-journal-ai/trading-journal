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

export type ArtifactKind = "image" | "html" | "dir";

export type DesignArtifactGroupKey = "wireframes" | "themes" | "samples" | "prototypes";

export type DesignArtifact = {
  id: string;
  title: string;
  description: string;
  kind: ArtifactKind;
  /** Repo-relative source path (also the removal target). */
  file: string;
  /** Web-servable URL for a live thumbnail/preview (images under /public only). */
  src?: string;
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

export const DESIGN_ARTIFACTS: DesignArtifact[] = [
  ...wireframeEntries,
  ...themeEntries,
  ...sampleEntries,
  ...prototypeEntries,
];

export type DesignArtifactWithDate = DesignArtifact & { lastCommit: string | null };

/** Attach git dates to every artifact. Server-only. */
export function designArtifactsWithDates(): DesignArtifactWithDate[] {
  return DESIGN_ARTIFACTS.map((artifact) => ({ ...artifact, lastCommit: lastCommitDate(artifact.file) }));
}
