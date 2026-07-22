# Trading Journal Design System

> Status: Canonical · Last updated: 2026-07-22 · Themes: dark · light · daylight · evening

This is the single source of truth for the product's visual language:
principles, typography, color roles, spacing, primitives, and component rules.

**Source-of-truth split (read this first):**

- **This document owns the _rules_** — the roles, the hierarchy, the "when to
  use what," the do/don't.
- **[`src/app/globals.css`](../../src/app/globals.css) owns the _values_** — every
  color token's actual hex/rgba, per theme. When a token value here and the CSS
  ever disagree, **the CSS is correct** and this doc is stale. The token table
  below is a generated reference, not an independent definition — do not hand-tune
  values in it.

Journal-specific behavior and note structure live in
[`JOURNAL_DESIGN.md`](JOURNAL_DESIGN.md). Coach tag chips have their own visual
spec in [`../coach/TAG_VISUAL_SYSTEM.md`](../coach/TAG_VISUAL_SYSTEM.md).
Superseded material is in [`_archive/`](./_archive/) — do not cite it.

## How to use this doc

Before making UI changes:

1. Read this file for the rules.
2. Use semantic tokens from `globals.css` — never raw hex in components.
3. When in doubt, remove the box and let type, spacing, and a single hairline do
   the work.

The system is **type-first and open**: structure comes from clear hierarchy,
mono eyebrow labels, tabular figures, whitespace, and thin hairline rules — not
from boxed, rounded cards.

## Design direction

Trading Journal should feel calm, focused, and data-literate. It is not a
marketing site and should not feel decorative. The interface supports quick
scanning during review, then gets out of the way when the user is writing.

- Open layouts over heavy card layouts.
- Ledger-like tables with quiet rules instead of boxed grids.
- Typography-led hierarchy.
- Compact mono metadata for dates, metrics, labels, and ticker rails.
- Red/green reserved for P&L, status dots, and trading-outcome signals.
- The accent color is reserved for links, focus, active states, and selected
  accents.
- Controls stay clearly clickable, but content areas avoid unnecessary borders
  and containers.

## Themes

The app ships **four themes**, applied via the `data-theme` attribute on
`<html>` and persisted in `localStorage`. The default is **`daylight`** (a warm
light theme). Theme plumbing lives in [`src/lib/theme.ts`](../../src/lib/theme.ts)
(`THEMES`, `DEFAULT_THEME`, `applyTheme`) and boots in
[`src/components/ThemeBoot.tsx`](../../src/components/ThemeBoot.tsx).

| Theme | `data-theme` | Character | `color-scheme` |
| --- | --- | --- | --- |
| Daylight | `daylight` (default) | Warm paper light; amber accent | light |
| Light | `light` | Cool neutral light (GitHub-like); blue accent | light |
| Evening | `evening` | Warm charcoal dark; amber accent | dark |
| Dark | `dark` (`:root`) | Cool blue-black dark; blue accent | dark |

Because components reference **semantic tokens** (not raw colors), the same
markup renders correctly in all four. The two warm themes (daylight, evening)
use an amber `--accent`; the two cool themes (dark, light) use a blue `--accent`.
`--blue` is a raw color used directly only in the cool themes and is marked
`reserved` in the warm ones — prefer `--accent` for interactive accent needs.

Theme provenance: `daylight` and `evening` were derived from the prototypes in
[`themes/daylight-theme-v1.html`](themes/daylight-theme-v1.html) and
[`themes/evening-theme-v1.html`](themes/evening-theme-v1.html), which
`globals.css` cites directly.

## Tokens (generated reference — values live in `globals.css`)

Use stable semantic token names so themes swap values without touching component
code. Values shown are the **`dark` (`:root`)** baseline for orientation; each
theme remaps them. Always read the real value from
[`globals.css`](../../src/app/globals.css).

### Surfaces & structure

| Token | `:root` (dark) | Use |
| --- | --- | --- |
| `--background` | `#080c12` | App background and open content surfaces. |
| `--surface` | `#111821` | Controls, inputs, elevated modules, editors. |
| `--surface-2` | `#151e2a` | Active segmented controls, slightly stronger surfaces. |
| `--panel` | `#1a2432` | Grouped module / rail backgrounds. |
| `--border` | `#273040` | Control borders and stronger dividers. |
| `--hairline` | `rgba(255,255,255,0.07)` | Internal rules, table rows, chart dividers. |

### Text

| Token | `:root` (dark) | Use |
| --- | --- | --- |
| `--foreground` | `#e6edf3` | Primary headings and high-emphasis text. |
| `--body` | `#c3ccd8` | Labels, readable UI copy, standard prose. |
| `--muted` | `#7a8492` | Metadata, eyebrows, secondary labels. |
| `--faint` | `#4d5664` | Disabled text, empty states, lowest-emphasis marks. |

### Accent & action

| Token | `:root` (dark) | Use |
| --- | --- | --- |
| `--accent` | `#58a6ff` | Links, focus, selected/active accents. Warm themes make this amber. |
| `--accent-strong` | `#79b8ff` | Hover/emphasis on accent elements. |
| `--blue` | `#58a6ff` | Raw blue; used directly only in cool themes, `reserved` in warm themes. |
| `--action` | `#242a35` | Strong "action" button fill (Save / Done). |
| `--action-foreground` | `#f1f4f8` | Text on `--action`. |
| `--coach` | `#3fb950` | Coach voice / AI-generated accents. |
| `--review-helper-bg` | `transparent` | Background behind inline review helpers. |

### Trading semantics (P&L, outcomes, executions)

| Token | `:root` (dark) | Use |
| --- | --- | --- |
| `--green` | `#1db26b` | Positive P&L, positive status dots. |
| `--red` | `#f05143` | Negative P&L, negative status dots. |
| `--green-chart` / `--red-chart` | `#1db26b` / `#f05143` | Chart-optimized P&L greens/reds. |
| `--green-tint` / `--red-tint` | `rgba(29,178,107,.14)` / `rgba(240,81,67,.14)` | Subtle P&L cell/background fills. |
| `--execution-buy` / `--execution-sell` | `#2bd576` / `#ff6257` | Buy/sell execution markers on charts. |

> There is no `--page-bg` or `--prose` token — earlier docs referenced them, but
> they were never in the code. Page backgrounds use `var(--background)`; long-form
> prose uses `var(--body)`.

### Color rules

- Component surfaces use `--background`, `--surface`, `--surface-2`, or `--panel`.
- P&L color helper: `value > 0` → `--green`; `value < 0` → `--red`;
  `value === 0` → `--muted`. Neutral numeric values stay `--foreground`/`--body`.
- Red and green must mean trading outcome, process signal, or P&L — nothing else.
- Interactive accent (links, focus, selected) uses `--accent`, not raw `--blue`.
- Avoid colored backgrounds for calendar cells unless very subtle (`--*-tint`).
- **Never rely on color alone** — pair red/green with signs, labels, dots, or
  placement.

## Type scale

Use named type roles rather than one-off sizes.

| Role | Use | Size / Line | Weight | Family | Notes |
| --- | --- | --- | --- | --- | --- |
| Eyebrow | Section/kicker labels | 10.5 / 1.2 | 600 | Mono | Uppercase, muted, letter spaced. |
| Display | Journal month/week/day title | 48 / 1.0 | 600 | Sans | Strong editorial moment. Use sparingly. |
| Page title | Calendar month/year, reports stats, trades range | 30–38 / 1.1 | 600 | Sans | Primary page orientation. |
| Section title | Dashboard sections, chart titles | 24–26 / 1.2 | 600 | Sans | Major content sections. |
| Day title | Journal day / weekday | 19–21 / 1.25 | 600 | Sans | Pairs with compact metadata. |
| Trade symbol | Trade note symbol | 15 / 1.2 | 600 | Sans | Keep tight and scannable. |
| Body large | Journal prose | 15.5–18 / 1.62–1.75 | 300–400 | Sans | Reading mode, recap notes. |
| Body | Standard copy | 16 / 1.6 | 400 | Sans | Default descriptive text. |
| Label | Stat labels, form labels, meta | 12.5–13 / 1.4 | 500 | Sans | Quiet but legible. |
| Metric strip | Header submetrics (trades, win rate, PF, P&L) | 13–14 / 1.4 | 400–500 | Mono | Muted, tabular, dot-separated. |
| Figure | Prices, counts, P&L, percentages | Varies | 400–600 | Mono | Always tabular. |
| Stat value | Stacked stat values | 18–20 / 1.2 | 600 | Mono | Reports/dashboard metrics. |
| Pill text | Process/emotion pills | 11 / 1.3 | 400–600 | Mono | Text with tiny valence dot. |
| Ticker rail | Journal right-side ticker/P&L module | 11 / 1.55 | 400–500 | Mono | Compact, tabular, best-to-worst scan. |
| Sidebar nav | Journal sidebar month/week navigation | 13 / 1.45 | 500 | Mono | Navigation, not annotation; keep legible. |

### Fonts

- **Sans:** Geist Sans via `--font-sans`.
- **Mono:** Geist Mono via `--font-mono`.

**Deferred — the "Editorial" serif voice.** The visual-direction explorations
(`themes/journal-visual-directions.html`, and the `Journal Editorial` vs
`Journal Ledger-Terminal` samples) tested a serif face — Newsreader — for
journal dates and long-form prose to warm the editorial tone. The warm *palette*
from that direction shipped as the daylight/evening themes, but the serif
typography **did not** — shipped code is Geist-only. This is an intentional
deferral, not an oversight: revisit adopting a `--font-serif` (Newsreader) for
journal dates/prose only after the Geist type scale is fully normalized (see
Open items). Do not introduce serif faces ad hoc before that decision.

### Typography rules

- Use size, weight, spacing, and position before color for hierarchy.
- Use **mono** for: table headers; metric strips and compact metrics;
  dates/ranges that behave like data; ticker rails; journal sidebar
  month/week nav; pills and labels; figures and page counts.
- Use **sans** for: page titles; prose; navigation; form labels and controls.
- Use `font-variant-numeric: tabular-nums` on every number.
- Every P&L / figure span uses `white-space: nowrap`.
- Metric strips: muted mono text, generous dot separators, red/green only on the
  P&L value.
- Letter spacing stays in a small set: Eyebrow `0.16em`–`0.28em`; table
  header / small labels `0.16em`–`0.22em`; normal text `0`. Avoid negative
  letter spacing except for large display titles.
- Micro type (< 12px) must be named and intentional: approved contexts are the
  Journal ticker rail and pill text. Never below 10px.

## Spacing and layout

Recommended spacing roles: `4` (micro gaps) · `8` (control internals) ·
`12` (label→control, table rhythm) · `16` (standard component spacing) ·
`24` (filter→content) · `32` (header→content, chart spacing) ·
`48` (major section breaks) · `64` (editorial/journal reading breaks).

Layout rules:

- **No boxes by default.** Group content with an eyebrow and a single hairline,
  not a bordered rounded card.
- Use `--hairline` for internal rules; reserve `--border` for real controls.
- Center major page content when it has a readable max width; let dense tables
  use the full practical width.
- Whitespace is the grid. Stacked label-over-value is often more scannable than
  label-left/value-right.
- Avoid cards inside cards and heavy outer boxes around content sections.

Radii: containers `5–7px`; pills/toggles `6–7px`; avoid radius above `10px`
without a specific reason. Prefer no container at all when content can stand on
spacing and rules.

## Primitives

Build once, reuse everywhere.

- **Eyebrow** — mono uppercase kicker for sections and chart labels.
- **Money** — mono tabular figure, P&L-colored, signed (`+$…` / `-$…`), no wrap.
- **Dot** — small green/red valence circle. Use sparingly. Not on the calendar.
- **Toggle / Segmented control** — peer view choices (e.g. Today / Week / Month).
  One outer border; active segment uses `--surface-2` + foreground; inactive
  muted; modest radius; height matches nearby controls.
- **Ghost Button** — outline button for Prev/Next/Clear/Apply/Back and secondary
  actions. 40px default height; radius ≤ 6px; 14px semibold text. Primary
  actions may use accent fill; destructive uses red text/border only when needed.
- **Tag** — pill with a small valence dot for process/emotion vocabulary;
  secondary metadata. (Coach review chips: see `TAG_VISUAL_SYSTEM.md`.)
- **StatBlock** — stacked label above mono value for dashboard summary metrics.
- **ReportsStatsMatrix** — diagnostic stats table for Reports (default when
  comparing many metrics). Compact summary strip first, then grouped rows
  (Performance, Accuracy, Sizing, Timing); label-left/value-right per cell;
  subtle row rules; mono tabular values; money red/green by sign; no hover-gating.
- **OpenSection** — eyebrow, thin rule, content, no outer box. The default for
  most dashboard/reports/journal content.
- **Strip** — one bordered, hairline-divided rail. Use sparingly.
- **HBar / DivBar** — count bar and diverging P&L bar for Reports.
- **LineChart** — cumulative P&L polyline with subtle area gradient; final sign
  controls line color.

## Components

- **App header** — brand left, nav beside it, utility actions right. Active nav
  item is foreground + semibold; inactive muted, foreground on hover.
- **Forms & filters** — labels use Label or Eyebrow; inputs/selects 40px high,
  14px, on a `--surface` (or `--surface-2`) **fill**; compact aligned filter bars.
  **Controls use fills, not borders** — reserve `--border` for real cards and rare
  containers, and lean on the surface fill + focus ring (`--accent`) to signal a
  control. Keep the journal feeling like a note app, not a data grid.
- **Tables** — read like ledgers. No heavy outer card; top/bottom rules + subtle
  row dividers; headers mono uppercase 11–12px letter-spaced; body 14px; numeric
  columns tabular; P&L red/green; hover row can use subtle `--surface`.
- **Stats** — diagnostic first. Dashboard summary → StatBlock; Reports detailed →
  ReportsStatsMatrix. Group into Performance / Accuracy / Sizing / Timing with an
  Eyebrow label and one rule below it.
- **Charts** — titles use Eyebrow with a rule beneath; generous space before
  chart groups; two-column grids need enough gutter to avoid merging; cumulative
  P&L usually spans full width before smaller distribution charts.
- **Calendar** — month view earns its grid; cells use `--hairline` rules, modest
  radius, no dots; quiet compact day headers; clear day-number/P&L/count
  hierarchy; today uses the accent day number or a subtle marker; weekly total
  column flat, not filled; year mini-months may use subtle green/red heatmap fills.
- **Journal** — prose-first. Headers use Display/Page title; recap text uses Body
  large; metrics sit under the header as quiet mono metadata; ticker rail compact
  and sorted best-to-worst; pills secondary; reading mode hides edit controls
  until interaction.
- **Coach voice** — content authored or interpreted by the Coach reads as a
  distinct voice: a green (`--coach`) mono eyebrow, and where it's a called-out
  block, a green left rule. In the recap wireframes this marks the session
  verdict, the what-worked/what-cost read, and the "one thing to try." The amber
  `--accent` is the trader's own annotation (constraints, "✎ you"); keep the two
  voices on their own colors so authorship is legible at a glance.

## States

Every reusable component defines: Default, Hover, Focus, Active/selected,
Disabled, Empty, and (where applicable) Loading, Error/success.

- Focus states use `--accent` and must be visible in every theme.
- Empty states are quiet but actionable; error states are specific, calm,
  recoverable.

## Accessibility

- Readable body/controls at common desktop and laptop sizes; no type below 10px.
- Do not encode meaning with color alone.
- Icon-only controls need accessible labels; form controls need visible or
  screen-reader labels.
- Keyboard focus is visible for links, buttons, inputs, selects, editable notes.
- Preserve semantic headings; keep click/touch targets large enough even when
  the visual treatment is compact.

## Open items

- Trades list/detail full visual pass (still needs one).
- Whether to revisit Hanken Grotesk after the Geist type scale is normalized.
- Whether green/red should move from hex to OKLCH tokens for better perceptual
  tuning across the four themes.
- Whether to auto-generate the token table above from `globals.css` via a small
  script so it can never drift (currently hand-synced).

## Source map

Production surfaces live under the `(app)` route group.

| Concern | Reference |
| --- | --- |
| Token values (source of truth) | [`src/app/globals.css`](../../src/app/globals.css) |
| Theme logic / switching | [`src/lib/theme.ts`](../../src/lib/theme.ts) · [`src/components/ThemeBoot.tsx`](../../src/components/ThemeBoot.tsx) |
| Journal feature design | [`JOURNAL_DESIGN.md`](JOURNAL_DESIGN.md) · [`JOURNAL_NAVIGATION_DECISION.md`](JOURNAL_NAVIGATION_DECISION.md) |
| Coach tag chips | [`../coach/TAG_VISUAL_SYSTEM.md`](../coach/TAG_VISUAL_SYSTEM.md) |
| Ticker review handoff | [`TICKER_REVIEW_DESIGN_HANDOFF.md`](TICKER_REVIEW_DESIGN_HANDOFF.md) |
| App shell | [`src/app/(app)/layout.tsx`](../../src/app/(app)/layout.tsx) |
| Home | [`src/app/page.tsx`](../../src/app/page.tsx) |
| Dashboard | [`src/app/(app)/dashboard/page.tsx`](../../src/app/(app)/dashboard/page.tsx) |
| Calendar | [`src/app/(app)/calendar/page.tsx`](../../src/app/(app)/calendar/page.tsx) |
| Reports | [`src/app/(app)/reports/page.tsx`](../../src/app/(app)/reports/page.tsx) |
| Journal | [`src/app/(app)/journal/page.tsx`](../../src/app/(app)/journal/page.tsx) |
| Trades list / detail | [`src/app/(app)/trades/page.tsx`](../../src/app/(app)/trades/page.tsx) · [`src/app/(app)/trades/[id]/page.tsx`](../../src/app/(app)/trades/[id]/page.tsx) |
| Trade review | [`src/app/(app)/trades/review/page.tsx`](../../src/app/(app)/trades/review/page.tsx) |
| Superseded material | [`_archive/`](./_archive/) |
