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
 * NOTE: the chip colors below are the shipped light-tuned values, not yet
 * tokenized per theme — tracked as a follow-up in DESIGN_SYSTEM.md. The chip is
 * self-contained (own bg + fg) so it stays legible on any background.
 */
const TAG_VISUAL_STYLES: Record<TagTone | TagSentiment, TagVisual> = {
  reinforcing: { background: "#EAF3DE", foreground: "#3B6D11" },
  review: { background: "#FCEBEB", foreground: "#A32D2D" },
  neutral: { background: "#F1EFE8", foreground: "#5F5E5A" },
  settled: { background: "#E1F5EE", foreground: "#085041" },
  activated: { background: "#FAEEDA", foreground: "#633806" },
};

function tagVisualStyle(tag: TagChipData): TagVisual {
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

function TagIcon({ tag, size }: { tag: TagChipData; size: number }) {
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
