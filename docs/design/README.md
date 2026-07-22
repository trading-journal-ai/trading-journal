# Design docs

One index for the product's design material. If a doc isn't listed here as
**canonical** or **feature**, treat it as exploration or history.

## Source of truth

- **Rules & principles:** [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — the single
  canonical design-system doc. Read this before any UI or visual work.
- **Token values:** [`../../src/app/globals.css`](../../src/app/globals.css) —
  the four themes (`dark`, `light`, `daylight`, `evening`) and every color token.
  Code owns values; the doc owns rules.
- **Component inventory & extraction plan:** [`COMPONENT_INVENTORY.md`](COMPONENT_INVENTORY.md)
  — the per-area census of what exists and the tiered plan to turn recurring
  patterns into real shared components. The living reference for that work.
- **Living reference:** the `/design-system` route renders tokens, type, and
  components live from `globals.css` (dev only).

## Feature-scoped design

| Doc | Scope |
| --- | --- |
| [`JOURNAL_DESIGN.md`](JOURNAL_DESIGN.md) | Journal layout, note structure, reading mode. |
| [`JOURNAL_NAVIGATION_DECISION.md`](JOURNAL_NAVIGATION_DECISION.md) | Journal navigation decision record. |
| [`TICKER_REVIEW_DESIGN_HANDOFF.md`](TICKER_REVIEW_DESIGN_HANDOFF.md) | Ticker-review V1 engineering handoff. |
| [`../coach/TAG_VISUAL_SYSTEM.md`](../coach/TAG_VISUAL_SYSTEM.md) | Coach trade-review tag chips (icon/color/fill). |

## Reference (explorations, not specs)

- [`themes/daylight-theme-v1.html`](themes/daylight-theme-v1.html) ·
  [`themes/evening-theme-v1.html`](themes/evening-theme-v1.html) — prototypes the
  shipped warm themes were derived from (cited in `globals.css`).
- [`themes/journal-visual-directions.html`](themes/journal-visual-directions.html) —
  journal visual-direction exploration.
- [`prototypes/`](prototypes/) — one-off HTML prototypes.

## Archived (superseded — do not cite)

See [`_archive/`](_archive/) and its README. Contains the retired "Deep"
single-theme design-system one-sheet (`.md` + `.html`) and two one-off design-QA
logs whose evidence paths no longer exist.
