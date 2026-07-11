# Project Status — where we are, what's next

> **The pick-up-where-we-left-off doc.** Read this first to re-orient. It's a thin
> pointer to the detailed lists, not a copy of them — when in doubt, follow the links.
>
> **Last worked:** 2026-07-11 · **Convention:** at the end of each work session,
> add a dated entry to the [Worklog](#worklog) and bump "Last worked". When a
> **Now** item ships, move it to [CHANGELOG.md](CHANGELOG.md) with its date.

## Right now: finalizing the content model

We paused feature-building to **finalize the journal/coach data contract** before
building templates, themes, or export. Why: a theme-switcher question revealed we
don't yet have a typed model of a journal day — and templates, export, and theming
are all cheap *only if* that contract is real.

- Contracts are **drafted** and in review: **[PR #26](https://github.com/trading-journal-ai/trading-journal/pull/26)** (docs-only).
- Nothing is wired yet — the schema is a draft for review, not live code.

## Now / Next / Later

| Horizon | Owner track (Justin) | Build track |
|---|---|---|
| **Now** | Work the [OWNER_TODO ⭐ shortlist](OWNER_TODO.md): define setups, decide playbook storage/identity, raw-file retention | **AI-first recap prototype** (Phase 1, in review) · Opportunity-context calculator (data confirmed present) |
| **Next** | Confirm §A decisions; author `EXECUTION.md` | Wire the v2 Coach Review schema; `buildJournalDay()` view-model |
| **Later** | Recap-flow product questions (§B); docs cleanup (§D) | One canonical recap template → then themes / alt-templates / export · weekly & monthly coach recaps (idea — [plan](product/AI_FIRST_DAILY_RECAP_PLAN.md#future-scope-weekly--monthly-coach-recaps); schema already scoped) |

Full sequencing lives in [DATA_MODEL.md §9](DATA_MODEL.md).

## Worklog

Most recent first. One entry per work session: date · what happened · where we
stopped. This is the "when did we last work on it" trail.

- **2026-07-11** — Recalibration + content-model finalization.
  - Explored the journal theme-switcher question; concluded structure needs
    templates, not themes, and that the real blocker is a typed content model.
  - Wrote the finalization docs: DATA_MODEL, COACH_REVIEW_SCHEMA_V2, in-repo
    COACH_RECAP_CONTENT_SPEC (Rev 2); reconciled the recap plan docs.
  - Verified extended-hours candle coverage (bars span 04:00–19:59 ET).
  - Built OWNER_TODO (with ⭐ shortlist) and this status doc; swept all 37 docs
    for owner decisions; found no true duplicate docs to delete.
  - Opened **[PR #26](https://github.com/trading-journal-ai/trading-journal/pull/26)** (docs-only); merged into main after resolving the rewritten-history conflicts.
  - Recovered an in-progress **AI-first daily recap prototype** from stashed WIP,
    verified it renders on the synced main, and branched it as
    `feat/ai-first-recap-prototype` for review.
  - **Stopped at:** docs merged; recap prototype in review (Phase 1). Owner to
    work the ⭐ shortlist; build track's next net-new piece is the
    opportunity-context calculator (not yet started).

## Active prototype: AI-first daily recap

An exploratory redesign of the daily recap at `/review/journal/ai-first-recap`
([AiFirstRecapPrototype.tsx](../src/components/review/AiFirstRecapPrototype.tsx)).
The bet: make the recap **coach-driven and evidence-led** rather than a stack of
form fields — the trader contributes only the context the data can't know
(**dictation-first**, minimal structured input), and the Coach turns that plus
deterministic facts into a verdict, one carry-forward focus, and a small review
queue. Realizes Phase 1 of [AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md)
with two seeded scenarios (Controlled Red / Weak Green); static/seeded, no DB or
live AI yet, by design.

## Where things live (the map)

| Doc | What it is |
|---|---|
| [OWNER_TODO.md](OWNER_TODO.md) | Decisions + content only Justin can do; the ⭐ shortlist of what gates the build |
| [DATA_MODEL.md](DATA_MODEL.md) | The data-model synthesis, "definition of finalized," review-engine impact, and sequencing |
| [product/COACH_REVIEW_SCHEMA_V2.md](product/COACH_REVIEW_SCHEMA_V2.md) | The drafted typed Coach Review contract (replaces flat `CoachGeneratedReview`) |
| [product/COACH_RECAP_CONTENT_SPEC.md](product/COACH_RECAP_CONTENT_SPEC.md) | Content design spec, Rev 2 (what the coach says, disclosure, decisions) |
| [product/AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md) | The phased delivery plan for the recap |
| [CHANGELOG.md](CHANGELOG.md) | Dated record of what's shipped/completed (features, releases) |
| root `README.md` → Active Roadmap | Public, thematic product narrative (what the product is becoming) |

## Key facts already settled (so we don't re-litigate)

- Daily Recap is the journal artifact; **Coach Review is a labeled section inside it.**
- Coach Review stored as **structured JSON** (`reviewJson`), immutable generated
  version + separate user corrections; user notes stay prose. See [OWNER_TODO §F](OWNER_TODO.md).
- Ticker-day review chart shows the **full session 07:00–20:00 ET** (data confirmed present).
- The ~12 `review/*` / `journal/mock/*` prototype pages are **expendable** until
  they render the finalized contract.
- Biggest owner unblock: **define the real setups** (SETUPS.md is a scaffold).
  Biggest net-new build: the **opportunity-context calculator**.

## How we got here (one line)

Theme switcher → "which designs are themeable?" → structure isn't → templates need
a data contract → the coach review isn't typed yet → **finalize the content model first.**
