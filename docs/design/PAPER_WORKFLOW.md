# Paper Design Workflow

> Status: Working agreement · Last updated: 2026-08-08

Paper is the visual workbench for Trading Journal. It is where components and
page states can be restructured, compared, and refined before implementation.
It is **not** a second application or an independent source of product truth.

## Source-of-truth split

- **Code owns the live product:** behavior, accessibility, data contracts,
  reusable component APIs, and the token values currently shipped in
  [`src/app/globals.css`](../../src/app/globals.css).
- **The design-system docs own the rules:** hierarchy, semantic roles, and
  component conventions remain canonical in
  [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) and feature-specific design docs.
- **Paper owns active visual intent:** layout exploration, composition, and the
  approved appearance of changes that have not reached code yet.

An approved Paper design may intentionally differ from production. That is a
planned change, not permission to silently overwrite either side.

## Active light-theme direction

The current Paper page explorations intentionally move away from the shipped
warm **Daylight** theme. The working direction is a white, neutral light theme:
clean, restrained, enterprise-leaning, and data-first, with crisp rules and
less visual warmth.

Daylight remains the production default until this direction is accepted and
implemented. Do not "correct" exploratory Paper artboards back to Daylight just
to remove drift. When the direction is finalized, update the relevant token
blocks in `globals.css`, the canonical design-system documentation, and the
living `/design-system` reference together. Whether the new direction replaces
`light`, replaces `daylight`, or changes the default theme is still an explicit
implementation decision.

## Paper organization

The current two-file model is useful:

- **Trading Journal - Design Lab** — foundations, components, and small layout
  experiments.
- **Trading Journal Pages** — composed route and state explorations.

Paper tokens are file-scoped, so the two files will not stay aligned
automatically. Exploration may drift deliberately. Before an artboard becomes
a candidate for implementation, sync its intended tokens and canonical
components into that file.

Organize page artboards by route and state, not just by a friendly screen name:

```text
/journal — P&L — Explore
/journal — Trades — Candidate
/calendar — Month collapsed — Candidate
/calendar — Day expanded — Explore
```

`Journal Day — P&L` and `Journal Day — Trades` are two states of the same route.
The collapsed and expanded calendar designs are likewise two states of the
same route, not separate product pages.

Do not mirror every application route in Paper. Keep only active design work,
approved handoff targets, and a small set of valuable reference states.

## Status labels

Every page-level artboard that diverges from production should carry one status:

- **Explore** — intentionally loose; structure, copy, and tokens may diverge.
- **Candidate** — selected direction; uses intended tokens, real component
  patterns, and canonical product language.
- **Approved** — owner-approved and ready to implement.
- **Implemented** — matched in code and visually verified.

Status is part of the artboard name. Do not infer it from polish.

## Working rules

1. **Start component-first.** Resolve reusable structures such as metric strips,
   tags, tabs, controls, and table rows before composing a full page.
2. **Use canonical language.** Pull labels, taxonomy, and UI copy from the
   product system. Invented copy must be visibly marked as placeholder.
3. **Use realistic but sanitized data.** Never place private broker data,
   account identifiers, or real trading results into committed references.
4. **Use semantic tokens.** Candidate and Approved work must use token names
   that can map back to code. Flag genuinely new values as proposed additions
   instead of hiding them as one-offs.
5. **Preserve behavior in code.** Paper can express states and interaction
   intent, but route behavior, accessibility, responsive behavior, and data
   logic are verified in the application.
6. **Do not maintain constant bidirectional parity.** Sync at meaningful
   checkpoints. Continuous mirroring creates busywork and makes ownership
   ambiguous.

## Paper to code

1. Select the exact component or artboard in Paper and state its status.
2. Read its exported structure and computed styles; use screenshots only for
   visual verification.
3. Find the corresponding route and existing shared components in the repo.
4. Translate the design into the repo's components, Tailwind conventions, and
   semantic tokens. Do not paste Paper's generated JSX wholesale.
5. Call out new tokens, arbitrary values, changed contracts, and behavior that
   Paper cannot specify before implementing them.
6. Implement on a focused branch and visually compare the same route/state.
7. After acceptance, mark the Paper artboard **Implemented** and update any
   affected design-system contract in the same change.

## Code to Paper

When code changes a shared token or component materially, refresh its Design
Lab specimen before using that specimen in new page exploration. Refresh page
artboards only when they are active, Candidate, or Approved; historical Explore
artboards may remain snapshots of the direction they tested.

Interactive theme and component-state experiments belong in the dev-only
Next.js Design Lab defined in [`DESIGN_LAB_SPEC.md`](DESIGN_LAB_SPEC.md). Export
a reviewed snapshot from that Lab, then apply its approved tokens or component
treatment to Paper; do not recreate the JavaScript control system on the canvas.

## Conflict rule

When Paper and code disagree:

- production behavior and currently shipped token values come from code;
- unimplemented visual intent comes from an Approved Paper artboard;
- canonical product language and component meaning come from the product and
  design-system docs;
- if the status or intended direction is unclear, stop and resolve it rather
  than guessing which side wins.
