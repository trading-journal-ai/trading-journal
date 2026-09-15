# Project Status — where we are, what's next

> **The pick-up-where-we-left-off doc.** Read this first to re-orient. It's a thin
> pointer to the detailed lists, not a copy of them — when in doubt, follow the links.
>
> **Last worked:** 2026-09-15 · **Convention:** at the end of each work session,
> add a dated entry to the [Worklog](#worklog) and bump "Last worked". When a
> **Now** item ships, move it to [CHANGELOG.md](CHANGELOG.md) with its date.

## Right now: shared trading-system consolidation

Shared Schwab ownership and the Server-owned Massive/DTS migration are installed
and verified. The explicitly approved duplicate purge is complete; rollback data
remains local and outside Git. Journal retains personal trades, notes, reviews and import persistence.
See [Schwab setup](setup/SCHWAB_SETUP.md) and Trading Server
`docs/SYSTEM_STATUS.md` for the cross-app contract and release ledger.

The content-model work below remains a separate product track. Its v2 contract
was documented in merged [PR #26](https://github.com/trading-journal-ai/trading-journal/pull/26).
The live generated-review parser still uses the earlier flat shape; full v2
adoption remains separate. The Phase 1 recap prototype also merged in PR #27.

For the current branch/worktree dispositions and publication boundary, see
[September consolidation](REPOSITORY_CONSOLIDATION.md).

Start the next session with [the four-track handoff](NEXT_SESSION.md): Coach/recap,
forward market context, optional design experiments and GitHub publication.

## Now / Next / Later

| Horizon | Owner track (Justin) | Build track |
|---|---|---|
| **Now** | Work the [OWNER_TODO ⭐ shortlist](OWNER_TODO.md): define setups, decide playbook storage/identity, raw-file retention | Archive candidate research is owned by Trading Server; Journal follows its accepted API contract. Opportunity-context v1 and Phase 1 recap prototype already exist |
| **Next** | Confirm §A decisions; author `EXECUTION.md` | Wire the v2 Coach Review schema; `buildJournalDay()` view-model |
| **Later** | Recap-flow product questions (§B); docs cleanup (§D) | One canonical recap template → then themes / alt-templates / export · weekly & monthly coach recaps (idea — [plan](product/AI_FIRST_DAILY_RECAP_PLAN.md#future-scope-weekly--monthly-coach-recaps); schema already scoped) |

Full sequencing lives in [DATA_MODEL.md §9](DATA_MODEL.md).

## Worklog

Most recent first. One entry per work session: date · what happened · where we
stopped. This is the "when did we last work on it" trail.

- **2026-09-15** — Accepted compact main import modal, published as an
  import-only snapshot on `codex/publish-compact-import-modal` from remote
  `d429df9`. The header account determines the destination; Sync imports directly,
  Upload file opens one picker, and results use a concise summary. Custom dates
  use a rounded calendar with circular selection and only necessary week rows.
  Gateway reauthorization prompts point to Trading Monitor. The inline daily
  importer is unchanged; unsupported/Paper account setup remains deferred.
  Full lint/production build and 34 focused import tests passed on the publication
  checkout. Existing Turbopack NFT tracing warning remains. No runtime/data or
  local/remote main merge is included. Private historical commits stay local.

- **2026-09-14** — Prepared remote synchronization of the accepted local baseline.
  - Publication branch `codex/publish-local-baseline-sept14` starts at refreshed
    remote main `1fda333`, preserving the September 13 trade-review questionnaire.
    It brings over the current accepted local files from `8a64a84` without the
    older private checkpoint commits. Remaining P&L examples in historical design
    QA were replaced with placeholders; only the synthetic demo DB is included.
  - Shared broker/market-history boundaries, fee reconciliation and accepted
    calendar/day-navigation behavior are included. No live runtime or database
    is changed by this source publication.
  - Initial full verification rejected a shared node_modules symlink. Existing
    dependencies were copied into the isolated checkout for final verification.
    Final `npm run verify:full` passed on Node 22.13.0 (lint, synthetic demo
    schema, TypeScript and production build); the existing NFT trace warning
    remains. All 266 runnable tests pass, with six existing skips. Whitespace
    checks pass. Justin authorized remote synchronization; this snapshot is
    ready to publish to remote main after commit. No browser tests repeated.
  - Outstanding: trade-review questionnaire UI and answer/custom-question
    persistence, v2 Coach Review adoption and canonical JournalDayVM, plus the
    owner decisions in OWNER_TODO. Daily-market-context research remains on its
    separate branch; Archive qualification work belongs to Trading Server.

- **2026-09-13** — Small-cap trade review questionnaire and integration handoff
  (branch `codex/trade-review-master-handoff`).
  - Added [the master questionnaire](product/TRADE_REVIEW_MASTER.md), combining
    the supplied Lance framework, Justin's Good Trade Checklist, and the agreed
    question-based day-to-trade review flow.
  - Captured core/optional questions, initial-burst and second-opportunity
    classification, trade thesis, opportunity and execution quality, repeated
    attempts, and an embedded handoff for integration on another computer.
  - **Stopped at:** content ready; UI integration and answer/custom-question
    persistence are not implemented. Integration starting points and open
    behavior decisions are recorded in the master file.
  - **Validation:** `npm run verify:full` passed (lint, bundled demo schema,
    TypeScript, and production build) after enabling network access for font
    downloads. The existing broad NFT trace warning remains. No browser tests
    were needed for this docs-only change.
  - Prepared on a clean checkout of current remote `main`; unrelated local
    edits and the older chart-handoff branch are outside this commit.

- **2026-09-11** — Accepted and integrated Journal day drilldown.
  - Implementation `0be70d0` from `codex/journal-day-drilldown` fast-forwarded
    into local main. Week and Journal Month now open Day → P&L; Day → Trades
    remains available and standalone Calendar retains its trade disclosure.
  - **Validation:** Node 22 `npm run verify:full` passed, including lint, demo
    schema verification, TypeScript and production build. Initial sandboxed
    build could not fetch Google Fonts; rerun with network access passed. The
    existing NFT tracing warning remains. `git diff --check` passed.
  - **Runtime:** browser verified canonical localhost:4317 Week → Day, Month
    keyboard/same-date → Day and Day → Trades, with no page errors or Journal
    Month detail-fetch requests. Canonical month screenshot inspected. Temporary
    demo preview on 4321 stopped; worktree retained. No new unit tests; prior
    desktop/laptop, empty-day and standalone Calendar smoke checks remain valid.
  - **State:** merged and verified locally; nothing pushed remotely. No provider,
    account configuration, import or database changes. No remaining task work.

- **2026-09-11** — Journal day drilldown exploration (`codex/journal-day-drilldown`).
  - New worktree: `/private/tmp/trading-journal-day-drilldown`, based on local
    main `4fe2761`. Week-strip clicks and Journal Month weekday links now open
    the selected date in Day → P&L; trades remain accessible in Day → Trades.
    Same-date clicks switch scope correctly. Journal Month no longer expands
    the trade ledger; standalone Calendar retains its disclosure and editing.
  - **Validation:** Node 22 `npm run verify:types` and `git diff --check` passed.
    Browser plugin unavailable; bundled Playwright with installed Chrome checked
    same/different dates, Month keyboard activation, an empty date, Day → Trades,
    direct Month URL navigation and preserved standalone Calendar disclosure.
    No page errors; no calendar-detail requests from Journal Month. Screenshots
    inspected at 1440×1000 and 1100×800. No new unit tests for this exploratory
    interaction change. Full production validation deferred until acceptance.
  - **State:** committed on the isolated branch; not merged, pushed or installed.
    Demo-only preview runs at `http://localhost:4321` using Webpack because the
    shared node_modules symlink is outside Turbopack's root. Primary app on 4317
    and its private configuration/data remain untouched. Next: review direction,
    run `npm run verify:full` before integration, then retire the preview.

- **2026-09-11** — Aligned weekly card metric rows (`codex/week-metric-alignment`).
  - Week cards now share two fixed rows beneath the weekday: P&L first, then
    stats or the empty-day status. Reserved first-row space aligns No-trade and
    No session with the stats baseline, with matching type size and line height.
  - **Validation:** Node 22 `npm run verify:full` and `git diff --check` passed;
    the existing NFT tracing warning remains. Browser checked identical row
    positions across all five days on 4317 and preserved the current-day marker.
    No new unit tests for this cosmetic adjustment.
  - **State:** implementation `f47f782` committed and integrated into local main;
    canonical runtime verified on localhost:4317. No remote push or new server.

- **2026-09-11** — Flattened weekly cards and corrected the today marker (`codex/week-strip-flat`).
  - Removed the Week at a glance group shadow and the stats' pill fill, radius
    and horizontal inset. Selected/current-day stats also stay transparent.
  - The blue dot and tinted cell now indicate the actual current ET day, using
    the same server-derived today value as navigation. They no longer follow the
    selected review date or pending click. Historical weeks have no today marker.
  - **Validation:** Node 22 `npm run verify:full` passed after the combined changes;
    the existing NFT tracing warning remains. Browser verified Friday's dot/tint
    while reviewing Thursday, no marker in a past week, no group shadow and
    transparent stats. No new unit tests for the presentation-only equality check.
  - **Runtime:** the development server retained old global CSS after restart.
    Stopped the primary launcher, moved its generated `.next/dev` cache to
    `/private/tmp/journal-week-style-cache-20260911`, and restarted on 4317.
    Fresh compilation and computed-style checks confirmed the current stylesheet.
    The cache move is reversible; source, configuration and database were unchanged.
  - **State:** implementation `6c518a2` committed and integrated into local main;
    canonical runtime verified on 4317. Handoff integrated locally. No trade edits,
    imports, new preview server or remote push.

- **2026-09-11** — Simplified the calendar review CTA (`codex/calendar-review-cta`).
  - Replaced Open in journal with Review trades. It opens Trade Review directly
    for the first chronological trade in the selected day; ticker navigation
    there supports other symbols. Individual symbol links still select their
    own trade. Both use one URL builder and preserve the origin return target.
  - Removed the obsolete Journal switch-to-Day callback. Review trades stays
    disabled until the day response supplies a trade; loading/error/empty states
    cannot send users to an invented symbol. Retry and Close remain available.
  - **Validation:** Node 22 `npm run verify:full` passed with the existing NFT
    tracing warning. Browser verified the CTA matches the first trade, the old
    label is absent, direct review and Calendar return work, alternate ticker
    links exist, and Journal Month preserves its return scope. No trade edits.
  - **State:** `6a5bc1f` committed, integrated into local main and served on
    localhost:4317. Handoff integrated locally; no remote push or new server.

- **2026-09-11** — Direct calendar Trade Review links (`codex/calendar-trade-review`).
  - Expanded-day symbol links now target `/trades/review` directly with the
    displayed calendar date, symbol, selected trade ID and originating returnTo.
    This preserves session attribution instead of deriving a date from the
    legacy trade-detail redirect's entry timestamp. Both calendar consumers use
    the shared link. The explicit whole-day Open in journal action is unchanged.
  - **Validation:** Node 22 `npm run verify:full` passed with the existing NFT
    tracing warning. Browser verified query parameters, the requested Trade
    Review surface loading, and its breadcrumb returning to Calendar. No new
    unit tests for link composition; no trade edits or imports.
  - **State:** `c1383d3` committed, integrated into local main and running on
    localhost:4317. Handoff integrated locally; nothing pushed remotely.

- **2026-09-11** — Added the expanded-day stats pill (`codex/calendar-stats-pill`).
  - Styled the shared panel stats as one surface-2 pill with rounded ends and
    middle-dot separators, following Justin's reference. Preserved the position
    below the heading, metric order and semantic P&L color.
  - **Validation:** Node 22 `npm run verify:full` passed with the existing NFT
    tracing warning. Browser screenshot confirmed the pill and loaded ledger on
    the standard live-account app. No new tests for this cosmetic change.
  - **State:** `38319f5` committed, integrated into local main and running on
    localhost:4317. Handoff integrated locally; no data mutations or remote push.

- **2026-09-11** — Repositioned expanded-calendar day stats (`codex/calendar-day-stats`).
  - The shared day panel now places its stats below the date heading, aligned
    left, in Trades / Accuracy / PF / P&L order. Both Calendar and Journal Month
    inherit the change; the month summary and trade ledger are unchanged.
  - **Validation:** Node 22 `npm run verify:full` passed with the existing NFT
    tracing warning. Browser verified loaded live trades, metric order and
    below-heading/left alignment; screenshot reviewed. No tests added for this
    layout-only change and no personal data mutations.
  - **State:** `ae3ccfd` committed, integrated into local main and running on
    localhost:4317. This handoff is also integrated locally; nothing pushed.

- **2026-09-11** — Simplified the Journal week header (`codex/journal-week-header`).
  - Removed years from the shared Week heading, including month/year boundaries.
    Hid the compact weekday/P&L navigation strip across Journal scopes with
    `SHOW_COMPACT_WEEK_STATS = false`; its implementation is retained for possible
    restoration. The full Week P&L cards and month-calendar summary remain visible.
  - **Validation:** all three existing period-label tests pass with updated
    expectations. Node 22 `npm run verify:full` passes; the existing NFT tracing
    warning remains. Browser confirmed the year-free Week heading, preserved
    weekly cards, and hidden compact strip in Day, Week and Month.
  - **State:** implementation `c98d19a` committed and integrated into local main;
    the running standard app on 4317 picked it up. Documentation handoff also
    integrated locally. No extra preview server, data mutation or remote push.

- **2026-09-11** — Accepted-calendar cleanup (`codex/calendar-cleanup`).
  - Justin accepted the running baseline and requested one maintained month
    component. Removed the older calendar heatmap and calendar rollup from the
    visualization previews, their unused fixture, and obsolete calendar CSS.
    Updated current design/process instructions to require `MonthCalendar`.
  - Stopped the A–E inventory on 3014 and removed its verified clean worktree
    with Git's normal safety checks. The index, A/B/C/E snapshots and local D
    reference files are no longer present in a runnable checkout. Port 3015 was
    already stopped. Historical branch refs/commits remain recoverable; unrelated
    design and research history was not deleted or merged.
  - **Validation:** Node 22 `npm run verify:full` passed lint, demo schema,
    TypeScript and production build; existing NFT tracing warning remains.
    Reference searches confirm only the shared month implementation remains in
    maintained source. No new tests needed for removal of unused alternatives.
    Browser smoke passed for Calendar, its live ledger, Journal Month, and both
    remaining visualization previews with their calendar experiments absent.
  - **State:** cleanup committed as `438883f`, integrated into local main and
    served by the existing app on 4317. Both temporary ports are stopped. No
    personal data mutations, remote push or PR publication. Historical branch
    refs are retained; the wider branch-deletion attempt was rejected by automatic
    review, and the authorized preview cleanup completed using Git's normal
    worktree removal checks without deleting branches.

- **2026-09-11** — Made the standard `journal` app the calendar source of truth.
  - Integrated `codex/shared-calendar-d` into local main by fast-forward, including
    implementation `48440f2`, then restarted the existing primary-checkout launcher
    at `http://localhost:4317`. Account, database and Gateway/Server configuration
    remain the primary setup's existing configuration. No migration or import.
  - Stopped the calendar preview server on 3015. Its branch/worktree and the
    separate historical calendar inventory remain preserved. Recorded the
    canonical local app convention in AGENTS.md to avoid competing active versions.
  - **Validation:** fresh Node 22 `npm run verify:full` passed lint, demo schema,
    TypeScript and production build before integration; the existing NFT tracing
    warning remains. Browser verified Live Account, the expanding ledger, Journal
    navigation and the shared Journal Month calendar on 4317. Existing tabs needed
    a fresh navigation after restart. No mutation tests against personal data.
  - **State:** implementation committed, merged into local main and running in the
    standard local app. This documentation handoff is also committed on the feature
    branch and integrated locally. Nothing pushed and no remote PR published.

- **2026-09-11** — Switched the shared-calendar preview to the live account at
  Justin's request (`codex/shared-calendar-d`).
  - Restarted only the isolated preview on port 3015. Its process loads the
    usual Journal checkout's local environment and resolves its configured
    database path against that checkout. Demo mode is disabled. No credentials
    or personal data were copied into tracked files; no schema changes or imports.
  - Selected Live Account in the preview and verified the current month and
    lazily expanded trade ledger load successfully. This preview now shares the
    actual Journal database, including normal editing behavior; it is not a
    synthetic demo or a database snapshot.
  - The usual Journal on port 4317 remains running from unchanged main.
    No merge, push or installed launcher change. Runtime verification only;
    application code is unchanged from the previously validated commit.
    The preview connection is process-local and must be restored when relaunching
    this worktree. Docs handoff committed on the feature branch.

- **2026-09-11** — Adopted calendar D as the shared month baseline (`codex/shared-calendar-d`).
  - Justin selected the original expanding-calendar design from the separate
    inventory preview and its centered Sessions/Trades/Accuracy/Profit factor
    groups with P&L at the far right. Calendar and Journal Month now render one
    `MonthCalendar`; their surrounding navigation remains with each page.
  - Added the under-week day ledger with lazy loading, Show all/fewer, Close/Escape,
    trade links and Journal navigation. Preserved raw aggregate metrics, ET session
    attribution, date-range totals and no-trade controls. The day API uses the
    cookie-selected account, rejects stale account requests and avoids cached data.
  - Documented the baseline and boundaries in [Calendar design](design/CALENDAR_DESIGN.md).
    The A–E inventory remains separately preserved on `codex/calendar-inventory`.
  - **Validation:** all 19 focused tests pass across the initial run and corrected
    isolated fixture rerun. Coverage includes ET attribution, partial-exit cost
    basis, account isolation, API errors and filtered aggregates. Node 22
    `npm run verify:full` passes lint, demo schema, TypeScript and production build;
    the existing broad NFT tracing warning remains. Browser checks cover both
    surfaces, ledger disclosure, Show all/fewer, Escape, Journal navigation and
    filtered totals using synthetic demo data. No-trade writes were not exercised
    because the preview is read-only. Whitespace checked.
  - **Handoff:** committed on the isolated branch; not merged into local main,
    pushed or installed/deployed. Local preview uses its own synthetic demo DB.
    Further visual iteration can build on this shared baseline; the inventory
    preview and existing installation remain available separately.

- **2026-09-10** — Saved the [next-session handoff](NEXT_SESSION.md).
  - Captured Coach/recap implementation and owner decisions, forward market-context
    reconciliation, optional design branches and the prepared-but-unpublished
    GitHub snapshot. Linked source documents and pinned preserved branch tips.
  - Recorded the completed fee work and Server-owned Archive research separately
    so they are not reopened as unfinished Journal features. No new decisions,
    feature work, branch adoption or remote publication were authorized by this note.
  - Docs-only change committed and integrated into local main; local links and
    whitespace checked. No runtime tests/builds needed. Resume from NEXT_SESSION.md.

- **2026-09-10** — Momentum Archive research transferred to Trading Server.
  - Created the canonical Server handoff at `docs/handoffs/momentum-archive-research.md`
    and preserved five historical producing handoffs on maintained Server source.
    It records false-positive causes, existing identity correction, staged candidate
    policy, remaining evidence/owner decisions, pinned code and private recovery paths.
  - Corrected Journal's stale archive-ownership contract and branch inventory.
    Journal retains display/API consumption and personal-trade comparison; Server
    owns data derivation, gainer qualification, quality review and candidate promotion.
  - Documentation committed on isolated branches and integrated into local main in
    both repositories. Candidate branches remain preserved and unadopted; no database,
    API, installed runtime, provider configuration or remote publication changes.
    Existing unrelated Server WIP is untouched.
  - Checked historical-copy fidelity, local documentation links and whitespace.
    No tests/builds: docs only. Next work belongs in Server: compare current accepted
    results with the candidate, explain membership changes, recommend policy, then
    seek acceptance before any active promotion.

- **2026-09-10** — Schwab import fee reconciliation (`codex/schwab-fee-reconciliation`).
  - Integrated `feat/schwab-fee-breakdown` from current main, preserving Gateway
    identities and Journal-owned imports. Added late fee reconciliation and
    queryable categories; daily Journal retains net P&L with no new fee metric tiles.
  - Preserved explicit zero observations separately from unavailable fee data.
    Existing positive totals migrate as unitemized legacy evidence. Unknown zeros
    remain unknown; a later zero snapshot never erases observed positive charges.
  - Added regression coverage for account isolation, stable fill IDs and user
    metadata, net P&L, duplicate idempotency, source precedence, read-only preview,
    identity conflicts and transactional rollback. Synthetic migration coverage
    proves existing rows stay unchanged and legacy totals reconcile.
  - **Validation:** all 254 tests pass with six existing skips. `npm run verify:full`
    passes lint, demo schema, TypeScript and the production build after allowing
    font downloads; the existing broad NFT trace warning remains. Migrated demo
    is synthetic, integrity-checked and independent of SQLite sidecars.
  - **Migration applied:** rehearsed on a consistent private backup, verified
    every original table's content, and tested a rollback copy. Applied the
    additive migration to the configured personal Journal DB; all original table
    contents and Gateway/Server settings are unchanged. Private recovery copies
    stay outside Git. No real broker import or retrospective fee rewrite was run.
  - **Integration:** committed and merged into local main; the original fee branch
    and this integration branch/worktree are closed after merge. Remote publication
    remains deferred and must use the refreshed sanitized aggregate patch.
    Fee details populate on future confirmed imports. Analytics presentation is deferred.

- **2026-09-10** — Owner-authorized merged-work cleanup (`codex/merged-branch-cleanup`).
  - Refreshed GitHub and rechecked exact branch tips, merge ancestry, complete
    checkpoint patch equivalence, clean worktrees and active process paths.
  - Removed 20 confirmed-integrated pre-existing local branches and three
    merged worktrees; pruned 23 broken registrations. Preserved all remaining
    branches, the uncertain detached checkout and four residual temporary folders.
  - Verified a private recovery bundle for deleted refs and backed up registration
    metadata and non-cache local files before removal. No remote changes,
    service interruption, private database deletion or history rewrite.
  - Committed this receipt on the task branch and fast-forwarded local main;
    removed the cleanup branch/worktree afterward. Final state: clean main,
    24 local branches including main, two registered worktrees, no stale registrations.
  - Updated the [inventory](REPOSITORY_CONSOLIDATION.md) and refreshed the local
    sanitized publication patch. Diff/ref/worktree and patch-application checks
    pass. No new tests/build: documentation and Git metadata only; application
    source and the prior validation result are unchanged.

- **2026-09-10** — Repository consolidation (`codex/september-consolidation`).
  - Refreshed GitHub metadata, checked all local branch tips and usable worktrees,
    and recorded merged, deferred, contained and uncertain work in
    [the consolidation inventory](REPOSITORY_CONSOLIDATION.md).
  - Integrated the saved August design-document checkpoint, labeled its findings
    historical, and replaced private trading examples with placeholders. Original
    checkpoint history stays local; publication must use the sanitized final diff.
  - Corrected the stale recap/prototype and opportunity-context roadmap claims.
    The calculator and service/payload wiring already exist; v2 review adoption
    and the canonical journal-day model remain separate work.
  - Kept the normalized Archive candidate, fee migration, design experiments and
    historical worktrees separate. No runtime, schema, private database, service
    or dependency changes; no branch/worktree deletion or history rewrite.
  - **Validation:** `npm run verify:full` passed under Node 22.13.0 after
    allowing font downloads; existing broad NFT trace warning remains. Initial
    suite: 230 pass, six existing skips, three sandbox-blocked socket tests;
    the focused Gateway rerun passed all four tests with socket permission.
    All 233 runnable tests therefore pass. Diff and local doc-link checks pass.
  - **Integrated locally:** committed on the task branch and fast-forwarded into
    local main. Primary design originals are privately backed up. No push, PR,
    deployment, database migration, candidate adoption or service interruption.
    A sanitized aggregate publication patch and PR description are prepared;
    do not upload preserved local checkpoint history. Deferred branches and
    23 stale worktree registrations remain documented, not deleted.


- **2026-09-04** — Shared market-history migration (`codex/market-history-migration`).
  - Compared the old Server archive, accepted Journal snapshot, normalized control,
    newer provider-close candidate and September grouped-daily research capture.
    Preserved distinct calculations/evidence; the newer candidate remains research.
  - Added the versioned loopback Server provider for archive queries and candles,
    with explicit offline behavior and no automatic local fallback. Personal trades,
    notes, reviews, existing database selection and bounded review caches stay local.
  - Journal-owned snapshot creation is blocked in shared mode or at a retired
    archive location. Independent local-provider installations remain supported.
  - Server owns the combined SQLite store, source files, DTS capture index and
    research catalog. Direct full-set/filter/candle parity and a restored rollback
    copy passed. Recovered normalization code and reader/capture branches are backed up.
  - **Installed and verified:** local main includes `53a51a5`; the primary Journal
    explicitly uses Server market history. Page, daily export and expanded chart pass
    against the installed Server, including after old archive locations were retired.
    Browser console is clean. All 233 tests passed (six existing skips), and
    `npm run verify:full` passed lint and production build.
  - **Cleanup completed:** after reviewing the exact list, Justin explicitly approved
    deletion of three quarantined duplicate folders and one failed staging copy.
    Fresh backup/file checks and post-deletion page/chart/API checks passed. Personal
    Journal databases were unchanged. Verified rollback copies remain local; Time
    Machine and Synology are the user-reported data backups. Large archives/backups
    are outside Git or ignored; no upload or remote push occurred.
  - **Remaining:** candidate adoption and optional live Stop/Start QA are separate.
    The interruption check still awaits explicit approval; this deletion approval
    does not authorize it. See Server `docs/SYSTEM_STATUS.md` for the release ledger.


- **2026-09-04** — Shared-system integration (`codex/system-consolidation`).
  - Merged the preserved gateway provider (`1e17a77`) with current Journal main
    (`c6d6dbd`) at `2fcb00c`. Preserved exact-identity Momentum Archive behavior
    and current import/reconciliation contracts.
  - Missing provider configuration now reports an error; standalone requires
    explicit selection. This installation uses gateway and no local OAuth
    credentials. Updated setup instructions to distinguish shared and independent
    installations; the August 28 standalone-default behavior below is superseded.
  - Verified all 228 tests passed (six existing skips). `npm run verify:full`
    passed lint and the production build after resolving isolated-worktree
    dependency-link and font-fetch constraints without changing dependencies.
  - **Integrated and verified:** local main includes `1ff95db`; the primary
    checkout now uses the gateway provider while preserving its current DB
    selection and unrelated design-document changes. Active duplicate provider
    credentials were backed up and removed. A live masked-account lookup and
    bounded import preview succeeded; no import write was made. Stock Info and
    Monitor were checked against the same Gateway, including Server restart.
  - **Remaining:** shared market history still uses the accepted Journal
    snapshot. Server source verification passed; the combined-store migration,
    reversible adapter, rollback proof and authorized duplicate cleanup are next.
    No archive or personal database was moved/deleted. Local main is updated;
    no remote push or PR publication was performed. Cross-app release and
    recovery evidence live in Trading Server `docs/SYSTEM_STATUS.md`.


- **2026-08-28** — Schwab Broker Gateway history/load slice
  (branch `codex/schwab-gateway-journal`).
  - Added an explicit `gateway` versus `standalone` provider boundary with no
    automatic fallback; existing installations keep standalone behavior when
    the setting is absent.
  - Added a private Unix-socket gateway client for masked accounts, bounded
    order history, and trade transactions using the gateway's read capability.
  - Kept ET date chunking, payload normalization, cross-source dedupe,
    reconciliation, and transactional persistence in the Journal.
  - Gateway-decorated order/execution identities are validated and fail closed;
    synthetic compatibility coverage proves they preserve the legacy Journal
    HMAC and canonical-fill identity contracts without exposing OAuth secrets.
  - Gateway mode explicitly refuses to spawn the standalone OAuth helper and
    directs authorization recovery through Trading Monitor, preserving the
    gateway's single token-owner boundary.
  - **Stopped at:** history and account discovery can use the gateway. OAuth
    initiation remains Journal-owned until the shared gateway authorization
    route lands; gateway mode is not yet the documented setup default.

- **2026-08-25** — Momentum Archive exact-identity remediation, rebuild, and cutover
  (branches `codex/momentum-archive` and `codex/momentum-archive-identity`).
  - Preserved the previously untracked Trading Server archive pipeline in an
    isolated task worktree and implemented exact provider identity through
    minute parsing, daily aggregation, reference/split joins, prior-close/RVOL
    state, SQLite keys, CLI resolution, and Journal candle lookup.
  - Added source/summary hashes, transform provenance, exact-symbol
    reconciliation, collision inventories, duplicate-minute checks, reference
    coverage, manifest format 2, and the TPC incident acceptance check.
  - Refreshed split evidence without case folding; this recovered the exact
    provider ticker `AXIAp`, stored as `AXIAP` in the legacy split archive.
  - Rebuilt all 410 sessions from 726,249,889 accepted minute rows with zero
    invalid, duplicate, out-of-order, or unreconciled rows. The full raw scan
    found four simultaneous collision families and restored 845 symbol-days.
  - The staged read-only snapshot passes integrity, foreign keys, source hashes,
    exact identity, and TPC/BCPC regression checks. Core movers reconcile from
    5,769 to 5,395: exactly 284 false TPC rows and 90 false BCPC rows removed,
    with no new Core rows.
  - Fixed the migration path so WAL sources are explicitly converted to a
    sidecar-free DELETE snapshot and failed partial sidecars are cleaned up.
  - After explicit owner approval, activated the verified format-2 snapshot with
    a rollback-aware same-filesystem rename. The legacy database, manifest, and
    invalidated candle cache remain under
    `quarantine/2026-08-25-legacy-casefold/`; the raw minute source was untouched.
  - Re-ran full installed-state integrity, foreign-key, database/raw/reference/
    split checksums, exact-symbol reconciliation, and the TPC incident contract.
    Direct live queries preserve distinct `TPC`/`TpC` and `BCPC`/`BCpC` rows.
  - Integrated the current local `main` into `codex/momentum-archive`, preserving
    the newer journal ledger/card behavior while sharing its disclosure control
    with Momentum Archive. Runtime archive health now fails closed unless the
    installed snapshot carries exact-identity v2 provenance and reconciliation.
  - Final validation passed: 211 tests passed (6 skipped), `npm run verify:full`
    completed, and desktop browser QA loaded a live session and an
    expanded archive-backed chart without console errors. Mobile is not part of
    this feature's release contract.
  - **Stopped at:** integration gate complete and the reviewed branch
    fast-forwarded into local `main`. Keep the legacy quarantine until a later
    deliberate cleanup; it is no longer needed by the running app.

- **2026-08-25** — Momentum Archive data-integrity remediation handoff
  (branch `codex/momentum-archive`).
  - Recorded the confirmed TPC/TpC case-sensitive identity failure, exact
    August 17–18 price evidence, collision inventory, and the distinction
    between structurally valid and semantically corrupt archive data.
  - Defined the cross-repository boundary: Trading Journal owns product
    acceptance and archive verification, while the current lossy raw-to-summary
    transform remains in Trading Server.
  - Specified the exact-symbol contract, regression fixtures, semantic quality
    gates, staged rebuild, atomic cutover, and acceptance criteria.
  - Kept TradingView float capture explicitly deferred and distinguished the
    proposed multi-day `is_continuation` field from the existing intraday
    `Cont.` path leg.
  - **Stopped at:** docs-only handoff complete; no application code or private
    archive data changed. See
    `docs/product/handoffs/2026-08-momentum-archive-data-integrity/README.md`.

- **2026-08-25** — Momentum Archive top-gainers rework and a data-integrity find
  (branch `codex/momentum-archive`).
  - Turned the session control from a display lens into a peak-session filter.
    The lens previously swapped the headline gain for the active session's slice,
    so a qualifying mover could render as `+6.3%` in a list titled top gainers.
    Gain is now always the qualifying peak, tagged with the session that made it.
  - Verified the three filters partition the Core set exactly (premarket 2,088 +
    regular 2,322 + after-hours 1,359 = 5,769), with tie-breaking consistent
    between the SQL predicate and the JavaScript classifier.
  - Replaced the per-session gain columns with path legs — PM, Cont., AH — each
    measured from where the previous ended, so none restates Gain.
  - Added a Show more tier for 30–50% near-misses, kept disjoint from the
    qualified set by `qualifies_mover = 0`.
  - Added sortable headers, a grouped sticky header, pinned identity columns,
    pagination, Min peak % / Min RVOL floors, and a full-field CSV export.
    Aggregates now cover the whole filtered set rather than the current page.
  - Moved Raw evidence off the Day view into a Full archive Universe filter, and
    aligned day navigation with the Journal's Latest / Previous / Next / calendar
    order.
  - **Found a preferred-share ticker collision corrupting the archive.** The
    ingest upper-cases tickers, folding `TpC` into `TPC` and `BCpC` into `BCPC`,
    which manufactures 377 phantom Core movers (7%) — 43% of everything above
    +400%. Root cause is `trading-server`
    `services/market-archive/session-summary.cjs:82`; the raw minute files are
    clean. Diagnosed and documented, not yet fixed. See
    `docs/analytics/MOMENTUM_ARCHIVE.md`.
  - TypeScript, ESLint and the full 206-test suite pass.

- **2026-08-25** — Momentum Archive ownership migration and first browser slice
  (branch `codex/momentum-archive`).
  - Established Trading Journal AI as the archive owner, with a standard
    application-data home and optional local path overrides.
  - Created a Journal-owned, filesystem-read-only SQLite snapshot in DELETE
    journal mode; the Trading Server source remains untouched.
  - Copied all 410 preserved compressed minute files into the same private
    archive home and verified every source/destination checksum.
  - Added repeatable migration and verification commands, a private manifest
    contract, a read-only health client, and versioned `core-common-stock-v1`
    qualification rules with explicit exclusion reasons.
  - Added typed Core/Raw Day and Archive queries with All, Premarket, Regular,
    and After-hours session lenses. Raw evidence retains excluded instruments
    and shows the controlling Core exclusion in the ledger.
  - Added the Analytics Momentum Archive surface with day stepping, full-archive
    search and sorting, Core/Raw toggles, session buttons, and the preserved
    no-maximum-gain anomaly policy.
  - Refined the browser surface against the supplied Daily Momentum HTML:
    removed the redundant archive eyebrow/hero and stock-row chevrons, restored
    the date-first Day heading, session jump and Previous/Next controls, stat
    strip, separate Symbol/Company ledger columns, labeled Full Archive filters,
    and the two-part evidence footer. Analytics navigation and the approved
    Core/Raw plus session controls remain intentional Journal additions.
  - Extracted the Journal row-disclosure behavior into a shared component and
    reused it for one-at-a-time inline mover charts.
  - Added a candidate-only candle cache that validates mover membership,
    streams the selected ticker block from the raw Massive day file, keeps
    04:00–20:00 ET, and invalidates derived rows when the source file changes.
  - Documented the ownership, normalization, Day/Archive session-lens, and
    inline-chart contracts in `docs/analytics/MOMENTUM_ARCHIVE.md`.
  - The archive query/cache suite (19 tests), ESLint, TypeScript, demo-schema
    verification, and the production build pass; the copied 4.2 GB database
    passed full integrity and foreign-key checks.
  - Browser-verified Day, session-lens, Core/Raw, Full Archive, inline chart,
    and 390px behavior with no feature errors. An uncached late-alphabet ticker
    loaded 589 candles in 1.23 seconds after ticker-block optimization; its
    cached repeat returned in 0.006 seconds.
  - **Stopped at:** first browser slice is implemented, fully verified, and
    ready for owner review. Journal execution overlays and entry-time
    comparisons remain later work. No source archive files were removed.

- **2026-08-13** — Journal Today navigation correction
  (branch `codex/fix-journal-today-navigation`).
  - Changed Today from scope-relative navigation to an absolute return to the
    current ET day, so it clears Week or Month and opens Day.
  - Updated the Journal navigation contract and regression coverage for Day,
    Week, and Month Today destinations.
  - Browser-verified Week → Today from August 6 to August 13: the URL dropped
    `scope=week`, Day became selected, August 13 became the current date, and
    the console remained clean.
  - Five focused navigation tests and `npm run verify:full` passed under Node
    22.13.0; the existing broad NFT trace warning remains.
  - **Stopped at:** fix complete and ready for review.
- **2026-08-14** — Calendar and journal card-state styling
  (branch `codex/review-card-states`).
  - Matched the design-review handoff's soft 1px edge, two-layer shadow, 8px
    radius, neutral hover lift, and 6% accent-selected surface across the month
    calendar and Week at a glance.
  - Kept the accepted month stats strip, calendar spacing, and all existing
    content unchanged.
  - Combined the existing Daily P&L chart and ticker rail into one shared card
    with a continuous hairline divider; no reference-only sidebar content was
    copied.
  - Follow-up: moved the chart canvas from the quiet `--surface` fill to the
    shared card background, making it white in the light theme without
    hard-coding a theme-specific color.
  - Extracted the centered capsule summary into a reusable `PillStatsBar` and
    replaced Journal Month's four boxed summary metrics with it. Month calendar
    cells now stay neutral while signed P&L figures carry the outcome color.
  - Rebuilt Day → Trades from the richer design handoff: the shared stats bar,
    win/loss distribution, expanded execution/price ledger columns, real tag or
    setup context pills, functional show-all behavior, and the existing inline
    trade-review disclosure now share one soft card surface.
  - Browser-verified the day card, week selected/hover states, month
    selected/hover states, and the 390px day layout with a clean console.
    Side-by-side design QA passed after correcting two P2 details.
  - Rechecked the shared stats bar on Calendar Month at 1440px and Journal
    Month at 1440px/390px; the capsule alignment, local overflow, and neutral
    month cells render as intended.
  - Impeccable's detector reported no new actionable findings; its output was
    limited to the existing typography/radius advisories in the touched files,
    including the preserved 22px value size moved into `PillStatsBar`.
  - `npm run verify:types` and a production Webpack build passed under Node
    22.13.0. The default Turbopack build cannot resolve this worktree's shared
    `node_modules` symlink, so the equivalent build was run with `--webpack`.
  - **Stopped at:** implementation, design QA, and project verification
    complete on the task branch.

- **2026-08-14** — Calendar summary and weekly-total alignment
  (branch `codex/calendar-stats-layout`).
  - Reworked the month summary into one shared label band with five centered
    metric columns, including P&L, while preserving the existing semantic
    labels and theme tokens.
  - Aligned weekly P&L and its trade/accuracy metadata with the corresponding
    daily value lanes by reusing the calendar cell's empty date slot.
  - Browser-verified desktop and 390px layouts with the committed synthetic
    demo database. Label/value center axes and daily/weekly P&L coordinates
    match exactly; Previous/Next navigation worked and the clean pass had no
    console warnings or errors.
  - Impeccable's layout detector and `npm run verify:quick` passed.
  - **Stopped at:** implementation complete and committed on the task branch.

- **2026-08-13** — Trade-chart execution-time integrity
  (branch `codex/chart-time-integrity`).
  - Made broker timestamps authoritative for chart markers; price matches can
    no longer relocate an execution to another candle.
  - Added execution-minute coverage checks to the candle cache. Partial days
    refresh on demand, while unresolved gaps render at the true time with a
    blank interval and an explicit incomplete-market-data notice.
  - Added regression coverage for late executions beyond a partial cache,
    multiple fills in one minute, and the former wrong-time price-match case.
  - Browser-verified the reported late-day trade after the cache repaired from
    partial to full extended-hours coverage; trade focus, prices, size, P&L,
    and hold duration remained intact with a clean console.
  - Focused regression tests and `npm run verify:full` passed under Node
    22.13.0; the existing broad NFT trace warning remains.
  - **Stopped at:** implementation complete and committed on the task branch.

- **2026-08-13** — Calendar month-at-a-glance redesign
  (branch `design/calendar-month-at-a-glance`).
  - Recovered the approved collapsed-month prototype from the clean
    `design/calendar-preview` worktree and implemented it on a fresh branch from
    current `main`; the old branch remains untouched as the original paper trail.
  - Rebuilt `/calendar` around a compact monthly performance strip, five weekday
    columns, and a fixed weekly-summary rail using real session, trade, accuracy,
    profit-factor, and P&L data.
  - Preserved range filtering, no-trade controls, Month / Year navigation, theme
    tokens, and direct Journal-day links with their Calendar return target.
  - Added focused tests for Calendar accuracy and profit-factor formatting.
  - Reconciled the redesign with the execution-date activity model from PR #73,
    preserving swing-trade dates and partial/final realized P&L while retaining
    the redesigned accuracy and profit-factor summaries.
  - Browser-checked desktop and 390px layouts, Previous / Next, Year, and direct
    Journal navigation; the narrow view has no document-level overflow and the
    console remained free of warnings and errors.
  - Repeated that interaction pass after the current-`main` reconciliation;
    desktop and 390px remained visually intact, the document stayed within the
    narrow viewport while the grid scrolled locally, and the console was clean.
  - Compared the source and implementation side by side, corrected the empty-day
    surface treatment, and recorded the passing evidence in `design-qa.md`.
  - Focused metric tests and `npm run verify:full` passed under Node 22.13.0;
    the existing broad NFT trace warning remains.
  - Opened [PR #71](https://github.com/trading-journal-ai/trading-journal/pull/71).
  - **Stopped at:** implementation reconciled with current `main`, fully
    reverified, and ready to merge as the canonical Calendar.

- **2026-08-13** — Journal scope-aware period heading regression
  (branch `fix/journal-scope-heading`).
  - Recovered the missing behavior from commit `3e22abb` on the old
    `design/calendar-preview` branch: Day shows the focused date, Week shows its
    Monday–Friday range, and Month shows month plus year in the same header.
  - Shared the review module's Day / Week / Month state with the date-navigation
    header while preserving a local fallback for standalone preview surfaces.
  - Added focused coverage for day, same-month week, cross-month week,
    cross-year week, and month labels.
  - Wired Today / Previous / Next to the selected scope: Day moves across
    trading weekdays, Week moves by seven days, and Month moves by one calendar
    month. The active scope is URL-backed and survives navigation, refresh, and
    return links.
  - Added boundary coverage for weekend skipping, week stepping, shorter-month
    clamping, scope URLs, and all three navigation destination sets.
  - Browser-verified all three period transitions at desktop and Week at 390px;
    the heading matched the selected scope, the narrow page had no horizontal
    overflow, and the final preview console was clean. A second interaction pass
    verified Day's Friday-to-Monday step, Previous Week, Previous/Next Month,
    scope-preserving Today, direct scoped URLs, and scope persistence after data
    navigation.
  - Eight focused period-label/navigation tests and `npm run verify:full` passed
    under Node 22.13.0; the existing broad NFT trace warning remains.
  - Opened [PR #72](https://github.com/trading-journal-ai/trading-journal/pull/72).
  - **Stopped at:** heading and period navigation regressions fixed and fully
    verified; PR #72 is ready for owner review.

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
