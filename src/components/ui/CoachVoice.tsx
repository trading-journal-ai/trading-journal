import type { ReactNode } from "react";

import Eyebrow from "./Eyebrow";

type CoachVoiceProps = {
  /** The section label (e.g. "Session verdict", "What worked"). */
  label: string;
  children: ReactNode;
  className?: string;
};

/**
 * A coach-authored block: green (`--coach`) eyebrow + a green left rule, so
 * authorship reads at a glance. Pairs with the trader's own annotations, which
 * use the amber `--accent` instead. See the Coach-voice convention in
 * DESIGN_SYSTEM.md.
 */
export default function CoachVoice({ label, children, className = "" }: CoachVoiceProps) {
  return (
    <div className={`border-l-2 pl-3 ${className}`} style={{ borderColor: "var(--coach)" }}>
      <Eyebrow tone="coach">{label}</Eyebrow>
      <div className="mt-1.5 text-[13px] leading-6 text-[var(--body)]">{children}</div>
    </div>
  );
}
