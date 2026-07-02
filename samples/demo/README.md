# Demo Fixtures

This directory is the source of truth for committed demo content.

Current fixtures:

- `trades.csv` - public-safe DAS-style trade summaries from January through
  June 2026, normalized for demo use.
- `coach-reviews.json` - approved static coach responses that can be seeded into
  `coach_reviews` for local and hosted demo.

Planned fixtures:

- `journal-notes.json` - approved daily recaps and selected trade notes.
- `playbook.json` - the demo trader's setup/rubric definitions.
- `candles/` - cached chart data used by hosted/offline demo flows.

The hosted demo database should be generated from these files. The database is a
runtime artifact, not the source of truth.
