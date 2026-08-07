---
name: Trading Journal AI
description: A calm, evidence-first interface for reviewing trading decisions and strengthening process.
colors:
  background: "#080c12"
  surface: "#111821"
  surface-2: "#151e2a"
  panel: "#1a2432"
  border: "#273040"
  foreground: "#e6edf3"
  body: "#c3ccd8"
  muted: "#7a8492"
  faint: "#4d5664"
  accent: "#58a6ff"
  coach: "#3fb950"
  positive: "#1db26b"
  negative: "#f05143"
typography:
  display:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "48px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  page-title:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "clamp(30px, 3vw, 38px)"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  figure:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "5px"
  md: "6px"
  lg: "7px"
  maximum: "10px"
spacing:
  micro: "4px"
  control: "8px"
  rhythm: "12px"
  component: "16px"
  content: "24px"
  section: "32px"
  major: "48px"
  editorial: "64px"
components:
  button-action:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 12px"
  coach-voice:
    textColor: "{colors.body}"
    typography: "{typography.body}"
    padding: "0 0 0 16px"
---

# Design System: Trading Journal AI

This root document is the portable Impeccable design context. The detailed
contract remains [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md),
and runtime token values remain authoritative in
[`src/app/globals.css`](src/app/globals.css). The frontmatter above mirrors the
dark-theme baseline so DESIGN.md-aware tools can understand the system.

## Overview

**Creative North Star: "The Reflective Ledger"**

Trading Journal AI combines the clarity of a trading ledger with the breathing
room of an editorial notebook. It should feel calm, focused, and data-literate:
dense enough to review quickly, but open enough for the trader's narrative and
evidence to remain primary.

The interface organizes rather than decorates. Type, spacing, tabular figures,
and thin rules establish hierarchy. Controls are compact and obvious; content
areas avoid unnecessary framing. Warm themes soften the reading experience,
while cool themes retain a precise terminal character without becoming harsh.

**Key Characteristics:**

- Type-first hierarchy with open surfaces and hairline structure.
- Ledger-like metrics beside generous journal prose.
- Four semantic-token themes: dark, light, daylight, and evening.
- Distinct visual authorship for trader annotations and AI coaching.
- Restrained motion and decoration in service of review speed.

## Colors

The palette is dark and cool at its baseline, with semantic tokens remapped by
theme. Daylight and evening use a warm amber accent; dark and light use blue.

### Primary

- **Interactive accent:** Links, keyboard focus, active controls, and selected
  accents. Use the semantic `--accent` token so the hue adapts by theme.

### Secondary

- **Coach green:** AI-authored interpretation and coaching voice. It identifies
  authorship, not generic success.

### Neutral

- **Background and surfaces:** Layer only when interaction or grouping needs it.
- **Foreground, body, muted, and faint:** Use the semantic emphasis ladder; do
  not substitute arbitrary gray values.
- **Hairline and border:** Hairlines organize content. Borders are reserved for
  actual controls and rare containers.

### Named Rules

**The Semantic Token Rule.** Components consume semantic CSS variables; raw
color values belong in the theme definitions, not component markup.

**The Trading Color Rule.** Red and green indicate P&L, outcome, execution, or
clearly labeled process signals. Never rely on either color without a sign,
label, icon, or position cue.

**The Two Voices Rule.** Coach-authored content uses coach green; the trader's
own annotation uses the theme accent. Keep those channels distinct.

## Typography

**Display Font:** Geist Sans

**Body Font:** Geist Sans

**Label/Mono Font:** Geist Mono for tabular figures and dense metadata; metric
strips may switch to Geist Sans in warm themes through `--font-metric`.

**Character:** Editorial clarity meets trading precision. Sans-serif headings
and prose stay calm and readable; mono is a functional signal for dates,
figures, prices, percentages, and compact rails rather than a decorative motif.

### Hierarchy

- **Display** (600, 48px, 1.0): Journal month, week, and day orientation.
- **Page title** (600, 30–38px, 1.1): Primary screen context.
- **Title** (600, 19–26px, 1.2): Sections and focused review modules.
- **Body** (400, 16px, 1.6): Standard interface copy; journal prose may grow to
  18px with a more generous line height.
- **Label** (500, 12.5–13px, 1.4): Controls and metadata.
- **Figure** (400–600, tabular mono): Money, prices, counts, and percentages.

### Named Rules

**The Mono-With-Purpose Rule.** Use mono for data and compact metadata, not for
ordinary prose or every heading.

**The Legibility Floor.** Type below 12px must have a named compact context and
must never fall below 10px.

## Layout

Spacing follows an 4/8/12/16/24/32/48/64px role scale. Whitespace is the grid:
major reading surfaces use a comfortable maximum width, while tables and chart
workspaces may consume the full practical width.

Group content with an eyebrow, one rule, and spacing before reaching for a
container. Stacked label-over-value arrangements are preferred when they scan
more quickly than label-left/value-right layouts. Dense screens remain orderly
through alignment and rhythm, not through nested cards.

Responsive layouts preserve the review hierarchy first. Secondary rails may
stack beneath the primary narrative or chart, but controls retain usable target
sizes and the main evidence remains visible.

## Elevation & Depth

The system is flat by default. Depth comes from tonal surface changes,
hairlines, focus rings, and occasional overlays rather than ambient shadows.
Shadows are not a general container treatment.

### Named Rules

**The Flat-by-Default Rule.** A surface earns elevation only when its interaction
model requires separation from the document flow.

## Shapes

Corners are restrained: ordinary controls and containers use 5–7px radii;
10px is the practical ceiling without a specific reason. Pills may be fully
rounded when their semantics require it, but broad content sections should
usually remain open.

Borders are functional. Filled controls, selected underlines, and hairline
separators are preferred to prominent rounded rectangles.

## Components

### Buttons

- **Shape:** Compact and restrained (40px high, radius no greater than 6px).
- **Primary/action:** Clear filled treatment with semibold 14px text.
- **Ghost:** Secondary navigation or reversible actions; never compete with the
  primary action.
- **Focus:** A visible `--accent` ring in every theme.

### Chips

- **Style:** Theme-owned tag colors, compact text, and a local SVG mask icon.
- **Meaning:** Icon communicates the behavioral axis; color communicates the
  verdict or sentiment, preserving colorblind legibility.

### Cards / Containers

- **Corner style:** Restrained 5–7px radius when a container is necessary.
- **Background:** Semantic surface fill.
- **Shadow strategy:** None by default.
- **Border:** Hairline organization before full borders.
- **Internal padding:** Usually 16–24px, proportional to content density.

### Inputs / Fields

- **Style:** 40px high with a surface fill and compact label.
- **Focus:** Visible accent ring.
- **Error / disabled:** Calm, specific, and recoverable; maintain readable
  contrast and do not encode state with color alone.

### Navigation

App navigation places the brand first, peer destinations next, and utilities
last. Active items use foreground emphasis and weight; peer-view tabs use an
underline rather than a bordered pill.

### Coach Voice

Coach-authored interpretation uses a coach-green eyebrow and, for emphasized
blocks, a coach-green left rule. Trader-authored annotations use the theme
accent instead.

## Do's and Don'ts

### Do:

- **Do** read the canonical design-system document before changing UI.
- **Do** use semantic tokens from `globals.css` and verify every theme affected.
- **Do** let typography, spacing, and one hairline establish hierarchy.
- **Do** keep numeric columns tabular and P&L signs explicit.
- **Do** define default, hover, focus, active, disabled, empty, loading, and
  error states where they apply.

### Don't:

- **Don't** nest cards or wrap every section in a rounded box.
- **Don't** introduce raw hex colors in components.
- **Don't** use red or green as generic decoration.
- **Don't** turn mono typography into an all-purpose visual theme.
- **Don't** hide essential review information behind hover-only interactions.
- **Don't** add decorative motion that slows scanning or writing.
