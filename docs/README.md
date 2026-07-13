# Docs Map

This directory is organized by decision area:

- `product/`: product spec, feature inventory, app map, onboarding/setup flow,
  playbook thesis/MVP, notes/dictation/coach direction, and dashboard concepts.
- `design/`: visual language, design system references, journal UI notes, and
  design prototypes.
- `analytics/`: reporting research, statistical review logic, and review-engine
  specs.
- `coach/`: coaching strategy, coach architecture, setup taxonomy,
  psychology/process coaching, private eval contract, and prompt drafts.
- `import/`: canonical import architecture, broker normalizer notes, adapter
  assumptions, source-format docs, and parser diagnostics.
- `deployment/`: Vercel/runtime boundaries, hosted demo contracts, and
  deployment operations.

Top-level docs are reserved for repo-wide notes that do not clearly belong to
one product area:

- [`PROJECT_STATUS.md`](PROJECT_STATUS.md): **start here** — where the project is,
  now/next/later, and a map to every working doc. The pick-up-where-we-left-off page.
- [`OWNER_TODO.md`](OWNER_TODO.md): the running list of decisions and
  owner-authored content the build is waiting on, plus the docs-cleanup backlog.
- [`CHANGELOG.md`](CHANGELOG.md): dated record of completed work / shipped
  features (the durable "what got done, when" trail).
- [`DATA_MODEL.md`](DATA_MODEL.md): how data is imported, stored, and used across
  layers; the provenance/voice model; and the "definition of finalized" for the
  Daily Recap, Coach Review, and Notes (gating templates, themes, and export).
- [`CODE_REVIEW.md`](CODE_REVIEW.md): repo-wide review notes.

Key product-area specs referenced by the data model:

- [`product/COACH_RECAP_CONTENT_SPEC.md`](product/COACH_RECAP_CONTENT_SPEC.md):
  Trading Coach + Daily Recap content design specification (Rev 2) — coach content
  objects, progressive disclosure, and product decisions.
- [`product/COMPETITIVE_ANALYSIS.md`](product/COMPETITIVE_ANALYSIS.md): current
  trading-journal landscape, user-friction hypotheses, TradeNote deep dive,
  product position, and the evaluation needed to prove the coaching loop.
