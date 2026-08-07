# Agent Instructions

## Project Overview

This is a front-end-heavy trading journal app for reviewing trades, sessions,
and AI coaching feedback. Prioritize fast UI iteration, clean information
hierarchy, and preserving existing behavior.

Default priorities:

- Preserve existing behavior before chasing polish.
- Prefer small, targeted diffs over broad rewrites.
- Keep the journal, calendar, trades, and reports flows feeling consistent.
- Optimize for scanability, review speed, and low-friction iteration.

## Tech Stack

- App framework: Next.js 16 App Router + React 19
- Styling system: Tailwind CSS v4 + app-level CSS variables in
  `src/app/globals.css`
- Database: Drizzle ORM over local SQLite/libSQL, with optional Turso remote DB
  via env vars
- Auth: no user auth layer; account selection is local and cookie-scoped
- Charts/data: TradingView Lightweight Charts, Massive candle fetches, local
  candle cache, execution-derived chart fallback
- Package manager: npm

## Important Directories

- `src/app/`: routes, layouts, server actions, and API route handlers
- `src/components/`: reusable UI building blocks and screen-level components
- `src/lib/`: utilities, data transforms, import parsers, account scope, DB
  access, candle fetching
- `src/lib/db/` and `drizzle/`: schema and migrations
- `docs/`: product specs, design system notes, analytics research, coach docs,
  and app map
- `data/`: local/private SQLite DB files and imported data fixtures

## Fast Working Loop

- Prefer narrow `rg` / `rg --files` searches over broad repo scans.
- Generated and reference-heavy paths are excluded in `.rgignore`. Only search
  them when the task explicitly needs them.
- Before editing, identify the specific files involved.
- For UI tasks, inspect the relevant component tree first, then patch only what
  is needed.
- For UI or visual polish work, use
  `docs/design/DESIGN_SYSTEM.md` as the canonical visual-system reference.
- Avoid touching `.env*`, `data/`, and private broker exports unless the task
  is specifically about local setup, parsing, or data repair.

## Working Rules

- Do not rewrite large parts of the app unless explicitly asked.
- Prefer small, targeted diffs.
- Preserve current styling patterns unless the task asks for a redesign.
- Do not introduce new dependencies without asking.
- Do not change the database schema unless the task explicitly requires it.
- Preserve existing account scoping, date filtering, and navigation behavior
  unless the task is about those flows.
- Be careful around ET date handling, `returnTo` links, import dedupe, and chart
  fallback behavior. Many screens depend on those assumptions.
- Never put real trading data in committed files — no real broker-statement
  filenames, account identifiers, row/fill counts, or P&L values, in docs or
  fixtures. Use placeholders (`<your-account-statement>.csv`, `<N>`,
  `<amount>`). Real exports live only under gitignored `data/evals/`.

## Branching & Worktrees

- Never commit directly to `main`. Every task starts on a fresh branch, named
  `<area>/<short-slug>` (existing patterns: `codex/schwab-import`,
  `feat/ai-first-recap-prototype`, `docs/...`, `perf/...`).
- One branch per task. Do not stack unrelated changes onto a branch because it
  happens to be checked out.
- Multiple agents often work this repo in parallel. If another session may be
  active, work in a **git worktree** (or your harness's worktree isolation)
  instead of sharing the main checkout — a shared dirty tree is how work gets
  lost or cross-contaminated.
- Do not leave work sitting untracked or uncommitted at the end of a session.
  Commit it on your branch (WIP commits are fine) or explicitly hand it off in
  the worklog. Untracked files on someone else's branch are how docs disappear.

## Session Handoffs

The next agent starts with zero context. Before ending a work session:

1. **Worklog:** add a dated entry to `docs/PROJECT_STATUS.md` (§Worklog) —
   what happened, where you stopped, and any loose ends (failing checks,
   skipped verification, half-wired features, open questions). Bump the
   "Last worked" date.
2. **Changelog:** when a feature or contract actually lands (merges), add a
   short dated entry to `docs/CHANGELOG.md` with the PR link. Day-to-day
   "where we stopped" notes belong in the worklog, not the changelog.
3. **Contracts:** if your change touches a documented contract (import
   behavior, coach schema, design tokens, data model), update that doc in the
   same PR. Stale contract docs are worse than missing ones.
4. **Owner items:** if you hit a decision only the owner can make, add it to
   `docs/OWNER_TODO.md` instead of guessing or blocking.
5. **Retiring docs:** delete the file and add a tombstone row to
   `docs/ARCHIVE.md` (git history is the archive). Do not create `_archive/`
   folders, and never rewrite history to remove a doc — plain deletion keeps
   it recoverable.

## Iterative Development and Validation

Follow the exploration, stabilization, and completion workflow from the global
agent guidance. For new feature and design work in this repository, assume the
work remains exploratory while requirements, behavior, or presentation are
still changing.

### During exploration

- Work implementation-first and batch related changes before validating.
- Do not keep tests synchronized with every prototype iteration.
- Do not run full-project tests, lint, type-checking, or production builds after
  every edit or intermediate agent turn.
- Use targeted checks, browser smoke tests, or manual verification only when
  they answer a specific question, protect a likely regression point, or
  validate a completed feature slice.
- Cosmetic and low-risk UI iteration may proceed without automated validation.
- Do not rerun an unchanged check unless subsequent changes could affect it.

### Stabilization checkpoints

Stabilize behavior after Justin accepts the direction, when it becomes a
durable contract or dependency, or when further work will build on it.

At a stabilization checkpoint:

- Clean up temporary implementation decisions.
- Add or update focused tests for important settled behavior.
- Validate the completed slice with the narrowest relevant checks.

Good candidates for earlier focused tests include bug fixes, parsing, data
transforms, ET date handling, shared business logic, APIs, import dedupe, and
previously regressed behavior.

### Completion tiers

Before marking work complete, run the smallest complete validation tier
appropriate to the final scope:

- Small UI, copy, CSS, and landing-page changes: `npm run verify:quick`.
- Local TypeScript/React logic that does not affect routing, database, imports,
  charting, APIs, or shared contracts: `npm run verify:types`.
- Routing, database, import, charting, API, or shared-component changes:
  `npm run verify:full`.
- Docs-only changes: no automated verification unless scripts or executable
  examples changed.

An intermediate iteration or WIP handoff is not feature completion. It may
defer the completion tier when the worklog and final response clearly identify
the remaining validation.

Fix failures caused by the change before marking it complete. Do not chase
unrelated pre-existing failures; report them clearly. Report exactly which
checks ran, their results, and anything intentionally skipped.

For security, authentication, authorization, payments, database migrations,
destructive data operations, concurrency, and core shared infrastructure,
validate earlier at each meaningful risk boundary and run the full relevant
validation before handoff.

Before pushing to `main` or deploying, run `npm run verify:full`.

## Verification Notes

- `verify:quick` runs ESLint with a local cache under `.next/cache`.
- `verify:types` runs cached lint plus `tsc --noEmit`.
- `verify:full` runs cached lint and a production build.
- `npm run test` exists, but is not part of the default verification loop yet.

## Design Rules

- Prioritize typography, spacing, hierarchy, rhythm, and scanability.
- Trading screens should be dense but not cluttered.
- Use clear visual hierarchy for session verdicts, trade metrics,
  screenshots/charts, and review notes.
- Use type, spacing, and hairlines before adding more boxes or decoration.
- Give journal prose and review sections room to breathe.
- Avoid decorative UI that reduces speed or clarity.

## Response Style

- Start with a brief plan only when needed.
- Avoid long explanations unless asked.
- Summarize changed files and verification at the end.
- Call out anything intentionally not tested.
