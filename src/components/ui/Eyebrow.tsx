import type { ElementType, ReactNode } from "react";

type EyebrowTone = "muted" | "coach" | "accent";

type EyebrowProps = {
  children: ReactNode;
  /** Element to render as. Defaults to a paragraph. */
  as?: ElementType;
  /** Color role. `coach` for coach-authored sections, `accent` for the trader's own. */
  tone?: EyebrowTone;
  className?: string;
};

const TONE_COLOR: Record<EyebrowTone, string> = {
  muted: "var(--muted)",
  coach: "var(--coach)",
  accent: "var(--accent)",
};

/**
 * Section / kicker label. Editorial treatment: Geist Sans, title case (no
 * all-caps), muted, subtle tracking — consistent across all four themes.
 *
 * The earlier mono-UPPERCASE "terminal" eyebrow was retired: it read too
 * technical for the warm editorial themes (daylight/evening). See the Eyebrow
 * role in docs/design/DESIGN_SYSTEM.md.
 */
export default function Eyebrow({ children, as: Tag = "p", tone = "muted", className = "" }: EyebrowProps) {
  return (
    <Tag
      className={`text-[11.5px] font-semibold leading-[1.3] tracking-[0.02em] ${className}`}
      style={{ color: TONE_COLOR[tone], fontFamily: "var(--font-sans)" }}
    >
      {children}
    </Tag>
  );
}
