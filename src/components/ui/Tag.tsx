export type TagCategory = "pattern" | "execution" | "risk" | "management" | "selection" | "emotion" | "context";
export type TagTone = "reinforcing" | "review" | "neutral";
export type TagSentiment = "settled" | "activated";

export type TagChipData = {
  label: string;
  category: TagCategory;
  tone: TagTone;
  /** Emotion tags only — shifts the color to a settled/activated ramp. */
  sentiment?: TagSentiment;
};

type TagVisual = { background: string; foreground: string };

/**
 * Trade-review tag chip. Two independent channels (see coach/TAG_VISUAL_SYSTEM.md):
 * - The **icon** names the axis behavior: a check/x pair for *graded* axes
 *   (Execution/Risk/Management/Selection), a fixed identity glyph for
 *   *descriptive* axes (Pattern/Emotion/Context). check-vs-x is colorblind-safe.
 * - The **color** names the verdict (tone) or, for Emotion, the sentiment.
 *
 * Colors are theme-owned tokens (`--tag-*` in globals.css): warm/light values on
 * the light themes, darker tints on dark/evening, so chips adapt to the theme.
 */
const TAG_VISUAL_STYLES: Record<TagTone | TagSentiment, TagVisual> = {
  reinforcing: { background: "var(--tag-reinforcing-bg)", foreground: "var(--tag-reinforcing-fg)" },
  review: { background: "var(--tag-review-bg)", foreground: "var(--tag-review-fg)" },
  neutral: { background: "var(--tag-neutral-bg)", foreground: "var(--tag-neutral-fg)" },
  settled: { background: "var(--tag-settled-bg)", foreground: "var(--tag-settled-fg)" },
  activated: { background: "var(--tag-activated-bg)", foreground: "var(--tag-activated-fg)" },
};

/** Resolve a tag's fill + foreground. Exported for surfaces that style beyond the chip (e.g. selection buttons). */
export function tagVisualStyle(tag: TagChipData): TagVisual {
  if (tag.category === "emotion" && tag.sentiment) return TAG_VISUAL_STYLES[tag.sentiment];
  if (tag.category === "pattern" || tag.category === "context" || tag.category === "emotion") {
    return TAG_VISUAL_STYLES.neutral;
  }
  return TAG_VISUAL_STYLES[tag.tone];
}

function tagIconPath(tag: TagChipData): string {
  if (tag.category === "pattern") return "/icons/tags/activity.svg";
  if (tag.category === "context") return "/icons/tags/timeline.svg";
  if (tag.category === "emotion") return "/icons/tags/emotion-face.svg";
  // Graded axes: the glyph swaps by verdict so shape always agrees with color.
  return tag.tone === "review" ? "/icons/tags/circle-x.svg" : "/icons/tags/circle-check.svg";
}

/** The axis-behavior glyph for a tag, rendered as a CSS mask over `bg-current`. */
export function TagIcon({ tag, size = 13 }: { tag: TagChipData; size?: number }) {
  const iconPath = tagIconPath(tag);
  // Rendered as a CSS mask over `bg-current`, so the glyph inherits the chip's
  // foreground color from a single source.
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 bg-current"
      style={{
        width: size,
        height: size,
        WebkitMask: `url(${iconPath}) center / contain no-repeat`,
        mask: `url(${iconPath}) center / contain no-repeat`,
      }}
    />
  );
}

export default function Tag({
  label,
  category,
  tone,
  sentiment,
  size = 13,
  className = "",
}: TagChipData & { size?: number; className?: string }) {
  const tag: TagChipData = { label, category, tone, sentiment };
  const visual = tagVisualStyle(tag);
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-[5px] rounded-full px-[9px] py-1 font-mono text-[11px] font-medium leading-none ${className}`}
      style={{ backgroundColor: visual.background, color: visual.foreground }}
    >
      <TagIcon tag={tag} size={size} />
      {label}
    </span>
  );
}
