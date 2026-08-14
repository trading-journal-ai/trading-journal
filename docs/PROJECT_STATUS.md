# Project Status — where we are, what's next

> **The pick-up-where-we-left-off doc.** Read this first to re-orient. It's a thin
> pointer to the detailed lists, not a copy of them — when in doubt, follow the links.
>
> **Last worked:** 2026-08-13 · **Convention:** at the end of each work session,
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

- **2026-08-13** — Import parity, statement coverage, splits, and swing dates
  (branch `fix/import-parity-and-swings`).
  - Unified ThinkorSwim statement persistence with the Schwab append-only
    execution ledger, including cross-source dedupe and stable open-trade
    updates.
  - Reconciled detailed Trade History rows with the full Cash Balance ledger
    instead of treating an unlabeled one-day detailed section as complete.
  - Added source-backed share-split quantity/basis adjustment and verified a
    multi-day ETF lifecycle closes without inventing an opposite position.
  - Projected trades onto every ET execution date in Journal, Calendar, Trades,
    Analytics, and ticker review; partial/final realized P&L now belongs to exit
    dates.
  - Focused tests, type verification, and a gitignored private-statement import
    into a temporary database passed; the real Journal database was not
    mutated.
  - Focused importer/activity tests and `npm run verify:full` passed under Node
    22.13.0; the existing broad NFT trace warning remains.
  - **Stopped at:** implementation complete and committed on the isolated
    branch; the real Journal database was not mutated or backfilled.

- **2026-08-13** — Schwab ETF import coverage
  (branch `fix/schwab-etf-import`).
  - Reconciled Schwab transaction history against Journal executions and traced
    complete missing instruments to Schwab's `COLLECTIVE_INVESTMENT`
    classification for exchange-traded funds.
  - Updated the Schwab normalizer to accept only the
    `EXCHANGE_TRADED_FUND` subtype while continuing to exclude mutual funds,
    options, and other unsupported assets.
  - Added focused regression coverage for accepted ETFs, rejected collective
    investments, and symbol-safe diagnostics; updated the import contract.
  - Focused normalizer tests and `npm run verify:full` passed under Node
    22.13.0. The existing broad NFT trace warning remains.
  - **Stopped at:** implementation complete and committed on the isolated
    branch; existing local Journal data was not mutated or backfilled.

- **2026-08-13** — Schwab one-year history range
  (branch `fix/schwab-history-range`).
  - Confirmed with sanitized, read-only live probes that Schwab returns valid
    order and transaction history beyond the app's assumed 60-day cutoff and
    at the one-year boundary.
  - Replaced the client and server 60-day floor with a shared 365-day limit;
    retained Eastern Time boundaries, seven-day request chunks, future-date
    rejection, and the existing result-cap safeguard.
  - Updated the importer copy and import contract to direct history older than
    one year to statement files.
  - Focused date-range tests and `npm run verify:full` passed under Node
    22.13.0. The existing broad NFT trace warning remains.
  - **Stopped at:** implementation complete on the isolated branch; no local
    Journal data was imported or changed.

- **2026-08-13** — Journal today-import fast path
  (branch `design/importer-update`).
  - Recovered the Claude Design handoff and matched its focused empty-Day
    treatment: Day/Week/Month remain available, while irrelevant Day data tabs
    disappear until trades exist.
  - Added a one-click **Import today's trades** action for a single authorized
    Schwab account; multiple accounts reveal only the required masked-account
    choice.
  - Added specific recovery states for expired authorization, missing setup,
    unavailable Schwab service, no fills, duplicates, and fills held for review.
  - Replaced the expired-authorization terminal instruction with an in-app
    **Authorize Schwab** button in both the Journal fast path and full importer.
    The local-only action opens Schwab consent, keeps OAuth secrets server-side,
    refreshes the running Journal without a restart, and automatically resumes
    the one-account today import after consent.
  - Preserved the full importer for historical ranges, detailed previews, and
    file uploads.
  - Focused outcome/auth tests, targeted ESLint, TypeScript, rendered desktop /
    narrow-window QA, and `npm run verify:full` passed. Live Schwab consent and
    the live import mutation were intentionally not run during browser QA
    because they can update the local credential and append real executions to
    the local DB. The existing broad NFT trace warning remains.
  - Opened draft [PR #70](https://github.com/trading-journal-ai/trading-journal/pull/70).
  - **Stopped at:** focused importer slice implemented, fully verified, and
    ready for owner review in PR #70.

- **2026-08-13** — Vercel local-only development mode
  (branch `chore/disable-vercel-deployments`).
  - Confirmed the marketing site and journal app are separate Vercel projects:
    `trading-journal-site` continues serving `trading-journal.ai`, while the
    paused `trading-journal-app` project owns `demo.trading-journal.ai`.
  - Disabled Git-created deployments on `trading-journal-app`; the separate
    marketing-site project remains enabled and unchanged.
  - Added a source-controlled `vercel.json` policy that disables automatic
    Preview and Production deployments from this repository during local-only
    development.
  - Updated the architecture contract so app pushes mean GitHub backup and
    local verification until a hosted demo release is deliberately restored.
  - Backed up the repository policy in draft
    [PR #69](https://github.com/trading-journal-ai/trading-journal/pull/69).
  - **Stopped at:** automatic app deployments are disabled operationally and
    in repository configuration; the public marketing site remains live.

- **2026-08-13** — Low-friction local journal launcher
  (branch `chore/journal-open-browser`).
  - Confirmed the existing `journal`, `journal-stop`, and `journal-restart`
    aliases are installed in the local shell config.
  - Updated the launcher so `journal` opens the exact localhost URL once Next.js
    is ready, including a fallback port when 4317 is occupied.
  - Running `journal` while the app is already active now opens that existing
    instance instead of only printing its URL.
  - Fixed stale Next.js lock handling so a dead recorded PID no longer produces
    a false "already running" result, and uses the live lock's recorded port
    when process inspection cannot resolve it.
  - Node syntax validation, targeted ESLint, and `git diff --check` passed.
    Full-repository quick verification remains blocked only by the two known,
    unchanged `react-hooks/set-state-in-effect` errors under
    `src/components/preview/`.
  - Combined with the preview hydration fix, `npm run verify:full` passed under
    Node 22.13.0 before merge; the existing broad NFT trace warning remained.
  - Merged [PR #65](https://github.com/trading-journal-ai/trading-journal/pull/65).
  - **Stopped at:** launcher improvement landed on `main`; no user data or
    database behavior changed.

- **2026-08-13** — Preview hydration lint fix
  (branch `fix/preview-hydration-lint`).
  - Recovered two uncommitted preview fixes from a pre-history worktree onto a
    fresh branch based on current `main`; the old branch remains unpublishable.
  - Replaced mount-effect hydration flags with `useSyncExternalStore`, keeping
    server markup deterministic while preserving local triage decisions.
  - `npm run verify:types` and `git diff --check` passed.
  - Merged [PR #67](https://github.com/trading-journal-ai/trading-journal/pull/67).
  - **Stopped at:** focused fix landed on `main`.

- **2026-08-10** — Journal Day micro-calendar reference match
  (branch `design/journal-micro-calendar`).
  - Compared the production Journal against the supplied screenshot and Claude
    Design HTML handoff, and confirmed no existing branch contained the missing
    focused-Day micro rail/header treatment.
  - Added a separate borderless five-day rail above the Day heading, restored
    textual Today / Previous / Next / Calendar controls, changed Previous/Next
    to trading-day steps, aligned both tab groups to the accent underline, and
    widened the review canvas to the reference desktop insets.
  - Preserved the richer bordered five-session strip in Week → P&L rather than
    reusing it as the compact header rail.
  - Recovered the updated white Light theme as the app default. Its token set
    had already landed, but the `DEFAULT_THEME = "light"` commit was stranded on
    `design/calendar-preview`; Daylight remains available as an explicit choice.
  - Restored Journal to the shared `max-w-6xl` (72rem / 1152px) workspace used by
    Calendar, Trades, and Analytics. The uncapped screenshot-matching pass had
    overridden that established cross-product alignment.
  - Browser-compared the 1440 × 838 implementation with the normalized source;
    Next/Previous navigation, the Week strip, the Light/Daylight selector, and
    the 1152px width across all four primary workspaces passed, with no console
    warnings or errors. The in-app browser did not honor its requested 390px
    override, so that breakpoint was not claimed as browser-verified in this
    pass.
  - Targeted ESLint, TypeScript, and `git diff --check` passed. Repository-wide
    `verify:quick` remains blocked only by the two known, unchanged
    `react-hooks/set-state-in-effect` errors under `src/components/preview/`.
  - Synced merged PRs #65 and #67 into the branch; repository-wide
    `npm run verify:types` now passes.
  - Final completion check: lint and bundled schema validation passed; the
    Turbopack build was blocked by unrelated IBM Plex Sans 404s in the
    `day-recap-redesign` prototype, while the Webpack production build,
    TypeScript, and all 22 static pages passed under Node 22.13.0.
  - Opened [PR #66](https://github.com/trading-journal-ai/trading-journal/pull/66).
  - **Stopped at:** implementation and design QA complete; owner accepted the
    direction and the branch is ready to merge.

- **2026-08-10** — Journal formatting merge preparation
  (branch `design/journal-formatting`).
  - Confirmed the branch is current with `origin/main` and reviewed its final
    22-file journal, design-contract, and product-documentation scope.
  - Browser-tested `/journal` at desktop and 390px widths: Day and Week render,
    Week reveals the relocated five-session strip and P&L timeline, previous-week
    navigation updates the date and heading, and the console remains clean.
  - Targeted ESLint passed for every changed TypeScript/React file. The Node 22
    production build, TypeScript pass, static generation, and bundled demo-schema
    verification passed.
  - Full-repository lint remains blocked only by the two known, unchanged
    `react-hooks/set-state-in-effect` errors under `src/components/preview/`.
  - Opened completion [PR #64](https://github.com/trading-journal-ai/trading-journal/pull/64).
  - **Stopped at:** merge candidate validated, documented, and ready to merge.

- **2026-08-07** — Week-at-a-glance placement pass
  (branch `design/journal-formatting`).
  - Split the week range/navigation header from the reusable five-session strip.
  - Removed the strip from the persistent focused-Day header and placed it first
    inside Week → P&L, directly above the existing week-state summary and daily
    progress timeline.
  - Preserved the strip's complete hairline border, selected-day treatment,
    direct day links, optimistic navigation, and no-trade/future/empty states.
  - Verified Day has no duplicate strip; Week leads with the at-a-glance strip;
    selecting a weekday returns to that Day view; 1423×1047 and 1024×768 have no
    page overflow; and the browser console remains clean.
  - Targeted ESLint, TypeScript, the bundled demo-schema check, and a Webpack
    production build passed. Full-repository lint remains blocked only by the
    two known `react-hooks/set-state-in-effect` errors under
    `src/components/preview/`.
  - **Stopped at:** placement and hierarchy are implemented for owner review.
    The week-progress visualization and its evidence model are intentionally
    unchanged and remain the next design iteration.

- **2026-08-07** — Journal learning-loop and unified navigation exploration
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
  - Separated the work into two tracks: dictation-first human reflection with
    Dashboard carry-forward, and Analytics/Coach evidence-based pattern
    detection. The tracks may reinforce each other without being forced to
    merge on every day.
  - Confirmed Calendar as Journal's browse/index mode rather than a separate
    destination, with one canonical focused-day view behind date selection.
  - Added the emotional execution spiral as the representative quick-capture
    use case: preserve the trader's narrative, reflect a tentative behavior
    chain, locate an intervention, and carry it forward only with trader
    acceptance.
  - Initialized the Impeccable `PRODUCT.md` with the confirmed product truth:
    Journal is the calendar-based record, Dashboard owns live carry-forward,
    Analytics owns investigation, and Coach connects narrative with evidence.
  - Implemented the first production Journal structure directly on `/journal`:
    a reusable five-day week strip with previous/next week controls, an existing
    Calendar shortcut, direct day selection, compact daily P&L, and explicit
    no-trade/future/empty states.
  - Removed the archive sidebar from the focused-day route and made the existing
    Day/Week/Month review module the content core. Session verdict, market
    context, and chart-read prose no longer render above the module; Coach owns
    that interpretation through its tab.
  - Refined the focused Journal for its desktop-first window: widened the week
    strip and review module to 1240px, spelled out month and weekday labels, and
    removed the account banner plus the oversized duplicate selected-day
    heading. A compact day heading now separates the selected week cell from the
    review without repeating its metrics.
  - Reworked each active week-strip cell around the selected structural lockup:
    weekday/date first, P&L second, then trades, win rate, and profit factor as
    one grouped metric pill. Empty-day labels remain quiet and use the same cell
    rhythm without manufacturing metrics.
  - Locked the week-cell typography to the annotated Figma spec: Geist Sans
    semibold 16px for weekday/date, semibold 14px for P&L, and regular 11px for
    the grouped trades/win-rate/profit-factor pill.
  - Removed the redundant trailing Week summary cell. The review module already
    owns the Week scope, while the five daily cells now share the entire strip
    width and give the selected lockup more horizontal room.
  - Rebalanced the cool Light theme around a white app canvas with light-gray
    review surfaces. P&L/chart modules and selected content now sit one neutral
    step above the page while compact metric pills retain the stronger gray.
  - Refined the week-strip selected state with matching left/right borders and a
    4px radius while retaining the bottom accent. Removed the outer top rule
    above the date-range/navigation header so the strip stays open to the page.
  - Reduced the selected day's P&L from three visible repetitions to two: the
    primary value remains in the selected week cell and the review rail's metric
    summary, while the redundant heading strip and chart-card total are hidden.
  - Replaced the focused day's hand-built P&L SVG with the app's existing
    TradingView Lightweight Charts runtime. A zero-based Baseline series keeps
    the positive/negative split, adds an exact crosshair, follows theme tokens,
    and resizes with the review module; scroll and zoom handling stay disabled
    so the chart does not interfere with Journal navigation. Its narrower value
    scale is on the right, with a small left plot inset balancing the chart
    gutters beneath the Daily P&L heading. The Journal card omits TradingView
    branding; the existing trade-chart surface retains the app-level linked
    attribution.
  - Kept the selected date, review tabs, and Coach available on zero-trade days
    instead of replacing the Journal with the generic imported-trades empty
    screen.
  - Reframed Week -> P&L so it no longer repeats the five-cell navigation strip:
    a compact week-state flag and evidence-based concentration read now lead a
    horizontal session timeline. Daily P&L bars rise or fall from the shared
    baseline with redundant green/red encoding, and hover or keyboard focus
    reveals that day's trades, win rate, and profit factor.
  - Added explicit in-progress, completed, upcoming, no-import, and future-day
    states to the weekly visualization while keeping the underlying evidence
    boundary visible.
  - Owner clarified that the Electron app is desktop-first. Future design and
    routine visual QA should prioritize laptop/desktop windows; phone-specific
    layouts are not a supported product target and only need basic resilience.
  - Stabilized the optimistic date-navigation handoff so pointer activation is
    recorded once, resolved navigation clears the plotting state, and selecting
    the active date cannot strand the chart loader.
  - Verified the completed slice with targeted ESLint across every changed app
    file, TypeScript, the bundled demo schema, a Webpack production build, and
    Browser interaction checks at 1440×1000 and 1024×768. Date selection, chart
    handoff, Day/Week scope switching, the weekly P&L timeline, and page-level
    overflow all passed. Full repository lint remains blocked only by the two
    known `react-hooks/set-state-in-effect` errors under `src/components/preview/`.
  - **Completed at:** the Journal formatting, five-day navigation, daily P&L,
    and Week -> P&L timeline are stabilized and updated onto current `main`.
    The full month Calendar intentionally remains on `/calendar`; embedding it
    should wait until its route-local grid/cells are extracted rather than
    duplicated. Quick dictation capture and Dashboard carry-forward remain a
    separate next interaction slice.

- **2026-08-07** — Impeccable project initialization
  (branch `codex/impeccable-init`).
  - Installed the project-local Impeccable skill and Codex design hook under
    `.agents/` and `.codex/`.
  - Added root `PRODUCT.md` from owner-confirmed product truth: an active
    day/momentum trader audience, local-first journal positioning, grounded
    post-trade coaching, and trader-controlled playbook knowledge.
  - Added root `DESIGN.md` and `.impeccable/design.json`, distilled from the
    existing canonical design-system contract so Impeccable and other
    DESIGN.md-aware tools inherit the shipped visual language without replacing
    `docs/design/DESIGN_SYSTEM.md` or the runtime tokens in `globals.css`.
  - Added Impeccable's ephemeral runtime paths to `.gitignore`; shared future
    design artifacts remain trackable.
  - Preserved Impeccable's Apache 2.0 attribution and license alongside the
    vendored project-local skill.
  - Verification: Impeccable context resolved `PRODUCT.md` and `DESIGN.md`; hook
    and sidecar JSON parsed; all vendored `.mjs` files passed Node syntax
    checking; the production build passed. Repository lint remains blocked only
    by the two known `react-hooks/set-state-in-effect` errors in the preview
    components, unrelated to this branch.

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

- **2026-07-27** — Iterative agent workflow.
  - Replaced edit-by-edit validation guidance with an explicit exploration →
    stabilization → completion workflow.
  - Prototype and design work now stays implementation-first while behavior is
    moving; focused tests begin at settled contracts and dependency boundaries.
  - Kept the repository's `verify:quick`, `verify:types`, and `verify:full`
    commands as completion tiers, with earlier validation for high-risk work.
  - **Stopped at:** workflow documented; docs-only change requires no automated
    verification.

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
