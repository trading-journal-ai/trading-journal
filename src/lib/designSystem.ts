/**
 * Metadata for the living design-system reference at /design-system.
 *
 * This file holds only *names and descriptions* — the token VALUES are read live
 * from the running app's CSS (globals.css) at render time, so this page can never
 * drift from code. See docs/design/DESIGN_SYSTEM.md for the governing rules.
 */

export type TokenSpec = { name: string; use: string };
export type TokenGroup = { label: string; tokens: TokenSpec[] };

export const TOKEN_GROUPS: TokenGroup[] = [
  {
    label: "Surfaces & structure",
    tokens: [
      { name: "--background", use: "App background and open content surfaces" },
      { name: "--surface", use: "Controls, inputs, elevated modules, editors" },
      { name: "--surface-2", use: "Active segmented controls, stronger surfaces" },
      { name: "--panel", use: "Grouped module / rail backgrounds" },
      { name: "--border", use: "Control borders and stronger dividers" },
      { name: "--hairline", use: "Internal rules, table rows, chart dividers" },
    ],
  },
  {
    label: "Text",
    tokens: [
      { name: "--foreground", use: "Primary headings and high-emphasis text" },
      { name: "--body", use: "Labels, readable UI copy, standard prose" },
      { name: "--muted", use: "Metadata, eyebrows, secondary labels" },
      { name: "--faint", use: "Disabled text, empty states, lowest emphasis" },
    ],
  },
  {
    label: "Accent & action",
    tokens: [
      { name: "--accent", use: "Links, focus, selected/active accents" },
      { name: "--accent-strong", use: "Hover/emphasis on accent elements" },
      { name: "--blue", use: "Raw blue; reserved in warm themes" },
      { name: "--action", use: "Strong action button fill (Save / Done)" },
      { name: "--action-foreground", use: "Text on --action" },
      { name: "--coach", use: "Coach voice / AI-generated accents" },
    ],
  },
  {
    label: "Trading semantics",
    tokens: [
      { name: "--green", use: "Positive P&L, positive status dots" },
      { name: "--red", use: "Negative P&L, negative status dots" },
      { name: "--green-chart", use: "Chart-optimized positive" },
      { name: "--red-chart", use: "Chart-optimized negative" },
      { name: "--green-tint", use: "Subtle positive cell/background fills" },
      { name: "--red-tint", use: "Subtle negative cell/background fills" },
      { name: "--execution-buy", use: "Buy execution markers on charts" },
      { name: "--execution-sell", use: "Sell execution markers on charts" },
    ],
  },
];

export const ALL_TOKEN_NAMES: string[] = TOKEN_GROUPS.flatMap((g) => g.tokens.map((t) => t.name));

export type TypeRole = {
  role: string;
  use: string;
  px: number;
  leading: number;
  weight: number;
  family: "sans" | "mono";
  tracking?: string;
  upper?: boolean;
  sample: string;
};

/** The named type roles from DESIGN_SYSTEM.md, rendered as live specimens. */
export const TYPE_ROLES: TypeRole[] = [
  { role: "Eyebrow", use: "Section / kicker labels", px: 10.5, leading: 1.2, weight: 600, family: "mono", tracking: "0.18em", upper: true, sample: "Session verdict" },
  { role: "Display", use: "Journal month/week/day title", px: 48, leading: 1.0, weight: 600, family: "sans", tracking: "-0.03em", sample: "Monday, June 8" },
  { role: "Page title", use: "Calendar, reports, trades range", px: 32, leading: 1.1, weight: 600, family: "sans", tracking: "-0.02em", sample: "July 2026" },
  { role: "Section title", use: "Dashboard sections, chart titles", px: 25, leading: 1.2, weight: 600, family: "sans", tracking: "-0.01em", sample: "This week" },
  { role: "Day title", use: "Journal day / weekday", px: 20, leading: 1.25, weight: 600, family: "sans", sample: "Thursday" },
  { role: "Body large", use: "Journal prose, reading mode", px: 17, leading: 1.7, weight: 400, family: "sans", sample: "Leaned into the highest-quality mover instead of spreading attention." },
  { role: "Body", use: "Standard descriptive text", px: 16, leading: 1.6, weight: 400, family: "sans", sample: "Standard copy for descriptions and helper text." },
  { role: "Label", use: "Stat labels, form labels, meta", px: 13, leading: 1.4, weight: 500, family: "sans", sample: "Win rate" },
  { role: "Metric strip", use: "Header submetrics", px: 13, leading: 1.4, weight: 500, family: "mono", sample: "14 trades · 64% · PF 2.1" },
  { role: "Stat value", use: "Stacked stat values", px: 20, leading: 1.2, weight: 600, family: "mono", sample: "+$1,284" },
  { role: "Eyebrow / ticker rail", use: "Compact tabular rail", px: 11, leading: 1.55, weight: 500, family: "mono", sample: "AGPU +412" },
];
