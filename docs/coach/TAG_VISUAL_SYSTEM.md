# Tag Visual System — Engineering Handoff

> Status: Ready for implementation · Companion to
> [`TAG_TAXONOMY.md`](TAG_TAXONOMY.md)

This document specifies how trade-review tag chips render: which icon, which
color, which fill, and how they lay out. It is the visual layer on top of the
taxonomy defined in `TAG_TAXONOMY.md` — it adds no new data model beyond one
optional field (`sentiment`, on emotion tags only).

---

## The governing idea

Two independent signals, carried on two independent channels:

- **The icon names the axis-behavior.** For a *graded* axis it shows the verdict
  (check / x); for a *descriptive* axis it shows a fixed identity glyph.
- **The color names the verdict (or sentiment).** Fill + text color.

The two never fight because the icon and color are chosen from the same source
of truth (`category` + `tone`/`sentiment`), so shape and color always agree.

### Why the icon can swap on some axes but not others

Every tag falls into one of two buckets, decided by its `category`:

| Bucket | Categories | Tag ↔ verdict relationship | Icon behavior |
| --- | --- | --- | --- |
| **Graded** | Execution, Risk, Management, Selection | The tag *is* a verdict — there is no neutral "Oversized," it is inherently review | Icon swaps `check` (reinforcing) / `x` (review), colored by tone |
| **Descriptive** | Pattern, Emotion, Context | The tag describes; it carries no good/bad | Icon is a fixed identity glyph, neutral (Emotion adds sentiment color) |

The icon *type* is itself a signal: a check-or-x means "this axis grades you,"
an identity glyph means "this axis just describes you." A reader learns the axis
character before reading the label.

### Why swapping (check/x) beats one recolored icon

An earlier iteration kept a single icon per graded axis and only recolored it by
tone. That produced a contradiction: a green "check" reads as *good*, but on a
review tag it was tinted red — a red check reads as half-broken. **Swapping the
glyph fixes this at the root:** review tags show an `x`, not a red check, so the
shape always agrees with the color. As a bonus the check-vs-x shape difference
is colorblind-safe (it survives when red/green don't).

---

## Icon assignments

| Category | Bucket | Reinforcing | Review | Neutral / identity | Source |
| --- | --- | --- | --- | --- | --- |
| Pattern | descriptive | — | — | `ti-activity` | Tabler |
| Execution | graded | `ti-circle-check` | `ti-circle-x` | — | Tabler |
| Risk | graded | `ti-circle-check` | `ti-circle-x` | — | Tabler |
| Emotion | descriptive | — | — | custom face (`emotion-face.svg`) | Custom |
| Management | graded | `ti-circle-check` | `ti-circle-x` | — | Tabler |
| Selection | graded | `ti-circle-check` | `ti-circle-x` | — | Tabler |
| Context | descriptive | — | — | `ti-timeline` | Tabler |

Icon package: **Tabler Icons** (`@tabler/icons-react`, MIT). Two glyphs are
custom SVGs drawn to Tabler's spec (24-grid, ~2px stroke, round caps/joins,
`stroke="currentColor"`) so they sit natively in the set — see `icons/custom/`.

### Notes on specific icons

- **Pattern → `ti-activity`.** The angular price-line. Chosen over a sine wave
  (too soft) and over `ti-trending-up` (an up-arrow implies *bullish*, but the
  Pattern library includes bear flags and top reversals — direction-neutral is
  required).
- **Emotion → custom face.** Tabler's `ti-mood-neutral` has *filled dot* eyes
  but a *thin stroke* mouth, so at 14px the mouth antialiases away and the face
  reads as "two eyes." The custom `emotion-face.svg` draws the mouth at the same
  weight as the eyes, so it holds at small sizes. A smiley or frown was rejected
  — Emotion is descriptive, not graded, so the icon must not imply good/bad.
- **Custom tight check (`check-tight.svg`).** Included as an *optional* single-
  glyph fallback only. It is **not** used in the final system (graded axes use
  the `circle-check`/`circle-x` pair). Keep it only if you ever want a bare
  non-circled check somewhere.

---

## Color

Color is one of two things depending on category. It is derived, never authored
per-chip.

### Graded axes → tone color

| Tone | Fill (bg) | Text + icon (fg) | Ramp |
| --- | --- | --- | --- |
| `reinforcing` | `#EAF3DE` | `#3B6D11` | green 50 / 600 |
| `review` | `#FCEBEB` | `#A32D2D` | red 50 / 600 |

### Descriptive axes → identity / sentiment color

| Category | State | Fill (bg) | Text + icon (fg) | Ramp |
| --- | --- | --- | --- | --- |
| Pattern | neutral | `#F1EFE8` | `#5F5E5A` | gray 50 / 600 |
| Context | neutral | `#F1EFE8` | `#5F5E5A` | gray 50 / 600 |
| Emotion | `settled` | `#E1F5EE` | `#085041` | teal 50 / 800 |
| Emotion | `activated` | `#FAEEDA` | `#633806` | amber 50 / 800 |

### The one hard rule

**Green and red are reserved for `tone` (verdict).** No other channel may use
them. That is why Emotion sentiment uses teal/amber (not green/red): a red
"FOMO" chip would be indistinguishable from a red review verdict sitting next to
it. Any future category-identity color must come from the remaining ramps
(purple, teal, amber, blue, coral, pink), never green or red.

The icon always inherits `currentColor` from the chip, so setting the chip's
text color is sufficient — do not color icons independently.

---

## Fill style

**Solid tinted fills** (the `50` stop backgrounds above). Solid is safe here
*because* review tags carry an `x`, not a red check — fill, shape, and text all
agree, so there is no "red success badge" contradiction.

Solid gives faster verdict scanning (color masses pop) than outline. Because
tags are grouped and Pattern/Context stay gray while Emotion sits in teal/amber,
the red/green mass is confined to the graded rows and reads as purposeful color
rather than a stoplight wall.

**Density escape hatch:** if a trade ever carries many tags and a row of
saturated fills gets heavy, drop the fill to the palette's palest tint (the
`50` stop is already fairly pale; a `25`-equivalent or reducing opacity works)
rather than reverting to outline. Keeps the mass, lowers the volume.

---

## Layout

Saved/read-only tag collections render **grouped under category headers** when
the axis is otherwise ambiguous. The compact inline editor is a documented
exception: its fixed Pattern / Execution / Risk / Emotion control row supplies
the axis context, so selected pills may render as one compact row directly
beneath those controls.

This matters because the graded axes share the same `check`/`x` pair — a check
on Execution and a check on Risk are identical glyphs. The category header is
what tells you which axis a chip belongs to. In a flat, header-less row the two
graded axes would not be icon-distinguishable and the reader would fall back to
reading labels.

- Category order: Pattern, Execution, Risk, Emotion (deferred: Management,
  Selection, Context).
- Descriptive axes (Pattern, Emotion, Context) keep their identity glyph inside
  the group; they do not receive a check/x.
- In the compact inline editor, keep each pill's colored icon so descriptive
  axes and review/reinforcing verdicts remain scannable without repeated
  headers.
- `Anticipated` uses the review visual tone to invite inspection, but Coach must
  treat it as a conditional intentional tactic rather than an automatic error.

---

## Data model impact

Almost none. The visual system reads fields already defined in
`CoachTagDefinition` (`category`, `tone`), plus **one new optional field**:

```text
sentiment   -- "settled" | "activated" | null
            -- meaningful ONLY for emotion-category tags
            -- distinct from `tone` (emotion tone is always "neutral")
```

Set `sentiment` at seed time on each emotion tag. Rough split:

- **settled** → Calm, Focused, Patient, Confident
- **activated** → Hesitant, Rushed, Impatient, Frustrated, Fearful, FOMO,
  Revenge urge, Tilted, Overconfident, Mentally fatigued, Distracted

Depleted states (fatigued, distracted) don't sit cleanly in either bucket;
default them to `activated`, since if they're being tagged mid-session they're
usually pulling the trader off their game. This is a per-tag judgment as the
vocabulary grows.

Everything else — which icon, which color — is a pure lookup on
`category` + `tone`/`sentiment` at render time. No migration, no columns beyond
`sentiment`.

---

## Implementation checklist

1. Install `@tabler/icons-react`.
2. Drop the two custom SVGs (`icons/custom/emotion-face.svg`, and
   `check-tight.svg` only if wanted) into your icon assets, or inline the face
   as a component (see `TagIcon.jsx`).
3. Add the `sentiment` column to emotion tag definitions; backfill the v1
   emotion vocabulary using the split above.
4. Implement the icon resolver: `category` + `tone` → glyph (`TagIcon.jsx`).
5. Implement the chip: derive fill/text color from `tone` (graded) or
   `sentiment` (emotion) or neutral (`TagChip.jsx`); render icon inheriting
   `currentColor`.
6. Render tags grouped under category headers on trade cards; use the compact
   selected-pill row only when the fixed category controls are immediately
   adjacent.
7. Accessibility: icons are decorative (`aria-hidden`) since the label carries
   meaning; ensure the label text is the accessible name of the chip. Verdict is
   conveyed by shape (check/x) as well as color, so it survives colorblindness —
   do not remove the shape distinction.

---

## Rationale log (why the non-obvious calls were made)

- **Icon = category on descriptive axes, = verdict on graded axes.** A single
  rule ("icon always = category") broke down because graded tags *are* verdicts;
  forcing a neutral identity glyph there wasted the strongest signal available.
- **Green/red reserved for tone.** Prevents Emotion sentiment or Pattern
  identity color from colliding with verdict color in a shared row.
- **Check/x swap, not one recolored icon.** Makes shape agree with color on
  every tag; adds colorblind safety for free.
- **Grouped layout.** The price of the check/x swap is that graded axes share
  glyphs; the header pays that price by carrying the axis.
- **Custom face.** Off-the-shelf neutral faces lose the mouth at chip size;
  matched stroke weight fixes legibility without implying good/bad.
- **Solid fills.** Became safe once review tags show an `x` instead of a red
  check; chosen for verdict scannability.
