# Contributing

Thanks for helping improve Trading Journal AI.

This project is early and intentionally practical: the best contributions are
real workflow fixes, importer samples, documentation improvements, and focused
UI/reporting improvements that make trade review clearer.

## Good first contributions

- Improve setup, demo, and onboarding docs.
- Report import problems with anonymized broker CSV structure.
- Add parser tests for edge cases in ThinkorSwim, DAS, or another broker export.
- Improve empty states, error messages, and first-run flows.
- Tighten chart, journal, calendar, or report behavior without broad rewrites.

## Privacy

Do not commit real broker exports, account numbers, API keys, local databases,
screenshots with private account data, or `.env.local` files.

If you share a sample CSV for parser work, anonymize account numbers and
personally identifying fields while preserving columns, row order, timestamps,
quantities, prices, fees, and partial-fill behavior.

## Local setup

```bash
npm install
npm run setup:local
npm run dev
```

For demo data:

```bash
npm run demo:paper
```

## Before opening a PR

Run the checks that match your change:

```bash
npm run lint
npm run test
npm run build
```

If you cannot run a check, mention that in the PR and explain why.

## Pull requests

Keep PRs focused. Include:

- What changed.
- Why it matters.
- How you tested it.
- Any known risks or follow-up work.
