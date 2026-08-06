# Project Status — where we are, what's next

> **The pick-up-where-we-left-off doc.** Read this first to re-orient. It's a thin
> pointer to the detailed lists, not a copy of them — when in doubt, follow the links.
>
> **Last worked:** 2026-08-06 · **Convention:** at the end of each work session,
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

- **2026-08-06** — Journal learning-loop and unified navigation exploration
  (branch `design/journal-formatting`).
  - Audited the production Journal -> Calendar -> day -> trade flow after
    hands-on use exposed slow retrieval in the continuous-scroll model.
  - Reopened the 2026-07-21 Journal navigation decision while preserving its
    useful canonical-day principle.
  - Captured the missing stepping-stone contract: reflection -> Coach
    distillation -> trader-adopted focus -> next-session resurfacing -> evidence
    -> explicit resolution.
  - Captured a shared period navigator for Journal, Calendar, Trades, and
    Analytics plus one reusable inline trade-inspection interaction for Journal
    and Trades.
  - Clarified the minimum Journal contract: roughly thirty-second, unstructured
    day-note capture must work even when the trader never opens Coach or mines
    the archive manually.
  - Defined a cited pattern ledger with recurrence states, trader correction,
    positive-habit reinforcement, and an evidence-based overtrading diagnosis
    rather than a raw trade-count threshold.
  - Captured a weekly/monthly Personal Edge Profile for time window, price band,
    trade sequence, setup, relative volume, opportunity quality, and
    price-action cohorts, with sample and coverage guardrails.
  - No production UI, route, schema, or data-contract changes were made.
  - **Stopped at:** product/IA and learning-cadence direction captured; next
    step is a focused quick-capture interaction prototype before implementation
    decisions are locked.

- **2026-07-27** — Free-plan market-data sync + Analytics architecture home
  (branch `feat/free-plan-market-data-sync`).
  - Added `npm run market-data:sync`: an idempotent, Free-rate-safe workflow
    that plans from local traded ticker-days, caches the traded session plus an
    approximately 14-session baseline, deduplicates bars, skips unresolved
    security identifiers, and retries historical ticker symbols.
  - Added the canonical
    [Analytics Architecture](analytics/ARCHITECTURE.md) and
    [Market Data Strategy](analytics/MARKET_DATA_STRATEGY.md); reconciled the
    product, opportunity-context, opportunity-set, and docs-map references.
  - The production contract now treats Massive Free as the baseline and a paid
    month as a finite backfill accelerator. Snapshots, WebSockets, flat files,
    and second bars remain optional rather than runtime dependencies.
  - Verified: focused market-data and market-context tests pass; TypeScript
    passes; production build passes. Repository lint remains blocked only by
    the two known `react-hooks/set-state-in-effect` errors in preview
    components, unrelated to this branch.
  - Owner approved sending ticker/date request windows to Massive. Completed
    the local paid-speed candle backfill and caught market context up through
    the latest imported session. All traded dates now have market context;
    nearly all traded ticker-days have the full baseline, with a small
    provider-limited subset retaining only the available post-listing history.

- **2026-07-25** — Docs audit + AI-first README + agent hygiene rules
  (branch `codex/schwab-import`, on top of the append-only Schwab import).
  - Full documentation audit of all 77 docs:
    [DOCS_AUDIT_2026-07-25.md](DOCS_AUDIT_2026-07-25.md) — per-file verdicts,
    duplication/staleness findings, recommended sequence.
  - Added the **Built AI-First** section to the root README (broker-adapter
    and coach-tuning extension paths with breadcrumbs).
  - Archived `import/TOS_TO_TRADERVUE_RECONSTRUCTION.md` (owner call — its
    reconstruction shipped as the broker normalizer); created
    `import/_archive/`; resolved the OWNER_TODO §D item.
  - Backfilled [CHANGELOG.md](CHANGELOG.md) for 2026-07-12 → 2026-07-25.
  - Added **Branching & Worktrees** and **Session Handoffs** rules to
    `AGENTS.md` (worklog + changelog upkeep is now part of finishing a session).
  - Adopted the **delete + tombstone** retirement policy (owner call):
    `DEMO_RUNTIME.md`, `NEXT_BUILD.md`, `TOS_TO_TRADERVUE_RECONSTRUCTION.md`,
    and the `design/_archive/` files are deleted; [ARCHIVE.md](ARCHIVE.md) is
    the tombstone index. Git history is the archive.
  - Scrubbed real-account data from committed docs (audit F6, owner call):
    BROKER_NORMALIZER, THINKORSWIM_ADAPTER, TRADERVUE_ADAPTER, PRIVATE_EVALS
    now use placeholders for statement filenames, counts, and P&L values.
  - **Rewrote git history** (`filter-repo --replace-text`, 376 commits) to
    redact the same values from every past commit; verified zero occurrences
    on all remote refs. Backup bundle:
    `~/Working/trading-journal-pre-rewrite-2026-07-25.bundle`. Repo went
    private for the rewrite window, then back to public (the hosted demo
    deploys from it). Side effect caught and fixed: two vendored
    `babel.min.js` sample files had digits rewritten by the numeric tokens
    and were restored from pristine copies.
  - **Post-rewrite caution for agents:** any branch or worktree created before
    2026-07-25 sits on pre-rewrite history and must be rebased onto the new
    history rather than pushed as-is, or it reintroduces the redacted values.
  - **GitHub Support ticket submitted 2026-07-25** requesting removal of
    cached views and `refs/pull/*` references for PRs #20 and #30, which
    GitHub freezes for closed PRs and a force-push cannot update. This is the
    documented remedy from "Removing sensitive data from a repository"; the
    ticket authorizes deleting those two PRs. Draft kept outside the repo at
    `~/Working/tj-private-notes/` (it names the affected SHAs, so it must not
    be committed to a public repo). **Awaiting reply.** When it lands, verify
    with a fresh anonymous mirror clone, then delete the pre-rewrite bundle.
  - Merging PRs #47 and #54 back-to-back reintroduced the phantom `--prose`
    token (#47 removed every usage, #54 re-added the definitions). Fix is
    [PR #57](https://github.com/trading-journal-ai/trading-journal/pull/57).
  - **Loose ends:** this doc's Now/Next table + Docs Map refresh still pending
    (audit F1); PR #57 unmerged; the two `set-state-in-effect` lint errors in
    `src/components/preview/` are still open; `claude/sleepy-hermann-87268a`
    and three dormant local branches remain on pre-rewrite history and must be
    rebased, never pushed as-is.
  - **Stopped at:** audit recommendations F1 (meta refresh) partially done —
    worklog/changelog current, Now/Next table and `docs/README.md` not yet
    rewritten. Support ticket is the only item blocked on an external party.

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
  - Captured the next IA decisions: ticker/day is the single trade-authoring
    workspace; analytical Coach claims have an on-demand technical explanation;
    Journal and Analytics share finding/query context; explanation depth is
    independent from Coach tone; findings can move through explicit Analytics,
    Playbook, Dashboard, and next-Journal feedback loops.
  - **Stopped at:** docs merged; recap prototype in review (Phase 1). Owner to
    work the ⭐ shortlist; build track's next net-new piece is the
    opportunity-context calculator (not yet started).
  - Synced local `main` to the upstream history rewrite; recovered two
    non-sensitive docs the rewrite dropped (`coach/NEXT_BUILD.md`,
    `deployment/DEMO_RUNTIME.md`) and **deleted the P&L research study forever**
    (real trading numbers, unfit for a public repo). Reconcile items logged in
    [OWNER_TODO §D](OWNER_TODO.md).

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
