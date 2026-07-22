# Tag icons

Canonical SVG assets for the Coach tag visual system. The full rendering and
color rules live in [`docs/coach/TAG_VISUAL_SYSTEM.md`](../../../docs/coach/TAG_VISUAL_SYSTEM.md).

- `activity.svg`: descriptive Pattern identity.
- `circle-check.svg`: reinforcing verdict for graded categories.
- `circle-x.svg`: review verdict for graded categories.
- `emotion-face.svg`: descriptive Emotion identity, custom matched-weight face.
- `timeline.svg`: descriptive Context identity (deferred category).

All icons use a 24px viewBox, round caps/joins, and `stroke="currentColor"`.
When rendered as external image files, `currentColor` does not inherit from the
parent element; use an SVG-aware component/import strategy when dynamic chip
color is required.

The Tabler-derived icons are MIT licensed. `emotion-face.svg` is a custom asset
drawn to the same grid and stroke conventions.
