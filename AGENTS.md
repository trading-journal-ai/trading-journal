# Agent Instructions

## Validation Policy

For small UI, copy, CSS, and landing page changes:
- Prefer `npm run verify:quick`.
- Do not run a full production build after every small edit.

For routing, database, import, charting, API, or shared component changes:
- Run `npm run verify:full`.

Before committing:
- Run the smallest relevant verification command.
- Mention any skipped verification in the final response.

Before pushing to `main` or deploying:
- Run `npm run verify:full`.

## Notes

- `verify:quick` currently runs lint only.
- `verify:full` currently runs lint and a production build.
- `npm run test` exists, but is not part of the default verification loop yet.
