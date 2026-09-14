# Repository consolidation — September 10, 2026

This is a dated inventory with a subsequent cleanup receipt, not a live branch
dashboard. Recheck Git and GitHub before integration or cleanup. Justin explicitly
requested the confirmed-merged cleanup recorded below after the initial inventory.

## Momentum Archive research transferred — September 10 follow-up

The remaining false-positive investigation and normalized-candidate adoption are
owned by Trading Server. Its canonical `docs/handoffs/momentum-archive-research.md`
now preserves the context and next steps on maintained source, alongside five
historical producing handoffs. Journal owns display/API consumption and comparison
with personal trades. Candidate branches remain preserved references; this transfer
neither adopts their calculations nor merges or deletes their code. The old direct
local QA reader must be reconciled with today's Server API if reused.

## Calendar consolidation — September 11 follow-up

The accepted month calendar is committed in local main and served by `journal`
at localhost:4317. Calendar and Journal Month share `MonthCalendar`; earlier
calendar variants are superseded, including those retained in historical design
branches. The A–E inventory server on 3014 and the preview on 3015 are stopped;
the clean inventory worktree was removed. Its commit `8babdd5` remains on
`codex/calendar-inventory` for historical recovery only, not future development.
All existing branch refs remain preserved; no remote branches were changed.

## Fee reconciliation completed — September 10 follow-up

The previously deferred fee branch is now integrated and closed. Broker-reported
categories, missing/zero evidence and later fee reconciliation are implemented;
daily Journal continues showing net P&L without new fee metrics. The Journal-only
migration is applied and verified with private recovery copies. No broker import
or new analytics presentation was included. See the
[fee contract](import/TRADE_IMPORT_BEHAVIOR.md#fee-reporting-and-presentation)
and [worklog](PROJECT_STATUS.md) for validation and rollout details.
After closing the fee and temporary integration branches, 23 local branches
including main remain; the two retained worktrees are unchanged.

## Authorized cleanup — September 10 follow-up

- Removed 20 pre-existing local branches: nine ancestors of local main, ten exact
  merged-PR heads whose merge commits are in main, and one fully patch-equivalent
  design checkpoint. Deleted rows below are marked **Removed locally**. This
  includes `codex/september-consolidation` at `87d6217`, added after the original inventory.
- Removed three clean, inactive, merged worktrees: the consolidation checkout,
  the sibling Gateway checkout, and `friendly-pike-60f8d7` (merged PR #54).
- Pruned all 23 broken worktree registrations. Four residual temporary folders
  (`checkpoint-sept4`, `market-history-migration`, `market-mover-capture`,
  `system-consolidation`) remain untouched: registration cleanup does not prove
  their remaining files are expendable.
- Verified a private Git bundle containing all 20 deleted branch tips before
  deletion. Preserved registration indexes/HEADs and non-cache ignored files
  from removed worktrees, including local configuration and empty database
  placeholders. Recovery material is local, outside the repository.
- Kept 23 other pre-existing task branches, including the normalized candidate,
  fee feature, design experiments, and code-equivalent branches whose complete
  history is not established as merged. Kept the clean detached
  `sleepy-hermann-87268a` worktree because its old history remains uncertain.
- Final state: primary main plus the retained detached worktree; 24 local
  branches including main. The cleanup receipt branch/worktree is removed after
  its documentation commit is fast-forwarded into local main.
- No remote branch deletion, push, service restart, installed application change
  or history rewrite. Docs-only checks cover whitespace, remaining refs/worktrees,
  recovery bundle and prepared publication-patch applicability. Tests/builds were
  not rerun because application source and prior validation are unchanged.

## Accepted baseline and next work

- Baseline: local `main` at `47f72e2`, 27 commits ahead of refreshed
  `origin/main`, none behind. No open GitHub PRs on inspection.
- September 4 worklog records installed/verified Gateway-owned Schwab access and
  Server-owned market history, with personal Journal persistence kept local.
  This consolidation changes documentation only; installed services were not restarted.
- `codex/september-consolidation` starts from that baseline and integrates the
  saved design checkpoint `8618962` via `f3987be`, with historical labels and
  placeholder trading examples added afterward.
- Fee breakdown: completed by the follow-up above; no longer an integration candidate.
- Server-owned research: normalized Archive candidate evidence policy and
  membership changes. Follow the canonical Server handoff; candidate code/data
  remain preserved and unadopted, outside Journal feature-integration work.
- Design Lab, Electron and date labels remain separate design choices.
  Calendar variants were superseded by the September 11 shared baseline.
- Coach work: opportunity-context v1 and its service/payload wiring already exist.
  Remaining product work includes v2 generated-review adoption and the canonical
  journal-day view model, with setup/rule identity still needing owner input.

## Every pre-existing local task branch

Evidence combines commit ancestry, exact merged-PR head identity, reverse-patch
checks and branch handoffs. Non-equivalent commits are not automatically new
features, particularly across squash merges and the older history rewrite.

| Branch and inspected tip | Disposition | Evidence / resume point |
| --- | --- | --- |
| `chore/disable-vercel-deployments` · `a4d4cbe` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #69](https://github.com/trading-journal-ai/trading-journal/pull/69); merge commit is in main. Squash ancestry alone can look unmerged. |
| `chore/journal-open-browser` · `00b754f` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #65](https://github.com/trading-journal-ai/trading-journal/pull/65); merge commit is in main. Squash ancestry alone can look unmerged. |
| `claude/sleepy-hermann-87268a` · `dadf6de` | Historical; retain | Detached old-history checkout. Patch comparison leaves three non-equivalent old commits; do not merge or delete wholesale. |
| `codex/calendar-stats-bar` · `24f9249` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/calendar-stats-layout` · `0dcac26` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/checkpoint-design-docs` · `8618962` | **Removed locally** — Integrated in this pass | Exact saved checkpoint cherry-picked, then labeled historical and sanitized. Original retained locally. |
| `codex/fix-journal-today-navigation` · `24f9249` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/flat-stats-summary` · `b5de066` | Superseded calendar alternative; historical only | The September 11 shared MonthCalendar is accepted. Do not restore this alternative summary/calendar implementation. |
| `codex/market-history-migration` · `47f72e2` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/market-mover-capture` · `4cb5458` | Preserved research | Grouped-daily capture and warrant filtering. September migration preserved research; reconcile ownership with Trading Server before adopting code. |
| `codex/massive-backfills` · `1b2af6e` | Preserved research | Historical backfill/export tooling. Paid-window handoff is historical; reconcile with Server ownership, do not rerun old capture instructions. |
| `codex/momentum-archive` · `c6d6dbd` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/momentum-archive-audit` · `8575d68` | Contained in deferred candidate | Ancestor of codex/momentum-normalized-close; preserved audit checkpoint. |
| `codex/momentum-archive-normalization-plan` · `9f55766` | Contained in deferred candidate | Ancestor of codex/momentum-normalized-close; preserved plan checkpoint. |
| `codex/momentum-close-policy` · `2bc80e3` | Contained in deferred candidate | Ancestor of codex/momentum-normalized-close; preserved closing-policy checkpoint. |
| `codex/momentum-daily-evidence` · `9f7b624` | Contained in deferred candidate | Ancestor of codex/momentum-normalized-close; preserved evidence checkpoint. |
| `codex/momentum-date-labels` · `9679c71` | Deferred UI alternative | One unique date-label simplification; not in main. Keep for the next Archive UI decision. |
| `codex/momentum-desktop-context` · `42567d6` | Contained in deferred candidate | Ancestor of codex/momentum-normalized-close; staged filters/chart context. |
| `codex/momentum-normalized-close` · `a377fb0` | Server-owned research; retain | Canonical continuation: Server `docs/handoffs/momentum-archive-research.md`. Contains historical Journal QA reader and research checkpoints; selectively adapt consumer code only after Server policy/API acceptance. |
| `codex/review-card-states` · `609e04a` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/schwab-gateway-journal` · `1e17a77` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `codex/system-consolidation` · `106f8c3` | **Removed locally** — Integrated in local main | Tip is an ancestor of the September 4 baseline; no remaining commits to merge. |
| `design/browser-tweaks-workflow` · `1005433` | Contained in deferred Design Lab | Ancestor of feat/design-lab; its instruction changes have not been adopted by main. |
| `design/calendar-month-at-a-glance` · `6fbd191` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #71](https://github.com/trading-journal-ai/trading-journal/pull/71); merge commit is in main. Squash ancestry alone can look unmerged. |
| `design/calendar-preview` · `16ad5ea` | Historical variant; retain | Calendar portions are superseded by shared MonthCalendar. Other divergent Journal changes remain historical; do not merge wholesale. |
| `design/importer-update` · `ad77a28` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #70](https://github.com/trading-journal-ai/trading-journal/pull/70); merge commit is in main. Squash ancestry alone can look unmerged. |
| `design/journal-formatting` · `c7d3a0a` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #64](https://github.com/trading-journal-ai/trading-journal/pull/64); merge commit is in main. Squash ancestry alone can look unmerged. |
| `design/journal-micro-calendar` · `c11c2ac` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #66](https://github.com/trading-journal-ai/trading-journal/pull/66); merge commit is in main. Squash ancestry alone can look unmerged. |
| `design/paper-calendar-journal` · `50d8afc` | Contained in deferred Design Lab | Ancestor of feat/design-lab; design references/tooling remain on that track. |
| `docs/design-lab-spec` · `9d51307` | Contained in deferred Design Lab | Ancestor of feat/design-lab; specification is not shipped functionality. |
| `docs/market-context-forward-plan` · `4eb5b99` | Deferred cross-app plan | After-hours/forward-capture plan predates September Server migration. Refresh against Server status before importing its roadmap. |
| `docs/paper-design-workflow` · `6f61863` | Contained in deferred Design Lab | Ancestor of feat/design-lab; retained as a checkpoint, not a separate implementation task. |
| `docs/record-launcher-lint-merges` · `f590ed7` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #68](https://github.com/trading-journal-ai/trading-journal/pull/68); merge commit is in main. Squash ancestry alone can look unmerged. |
| `feat/design-lab` · `0dd642c` | Unfinished experiment | Calendar/design-system Lab foundation and instrumentation. Remaining acceptance, reusable registration, metrics/tags, snapshots and export; do not auto-merge. |
| `feat/electron-desktop-shell` · `654243c` | Unfinished experiment | Development shell plus older month/week navigation changes. Packaging deferred; reconcile navigation with current Journal before adoption. |
| `feat/schwab-fee-breakdown` · `95a5fef` | **Completed; branch removed** | Integrated through the September 10 fee-reconciliation follow-up. Journal migration applied after backup/rehearsal; 254 tests and full verification pass. Analytics UI remains deferred. |
| `fix/import-parity-and-swings` · `47b08c0` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #73](https://github.com/trading-journal-ai/trading-journal/pull/73); merge commit is in main. Squash ancestry alone can look unmerged. |
| `fix/journal-scope-heading` · `46f455c` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #72](https://github.com/trading-journal-ai/trading-journal/pull/72); merge commit is in main. Squash ancestry alone can look unmerged. |
| `fix/preview-hydration-lint` · `b02181e` | **Removed locally** — Merged on GitHub | Exact branch tip was merged in [PR #67](https://github.com/trading-journal-ai/trading-journal/pull/67); merge commit is in main. Squash ancestry alone can look unmerged. |
| `fix/schwab-etf-import` · `a8effd4` | Code already integrated | Entire src patch reverse-applies cleanly to main; ETF regression exists. Historical worklog wording need not be reintroduced. |
| `fix/schwab-history-range` · `1a572fb` | Code already integrated | Entire src patch reverse-applies cleanly to main; one-year lookback and regression already present. |
| `test/merge-pr65-pr67` · `61cdb91` | Historical integration experiment | Launcher/lint changes landed via PRs #65/#67. Test merge has separate history; no new feature acceptance inferred, retained for comparison. |

## Worktrees

Before this pass there were 27 registered worktrees: four usable and 23 stale.
This pass adds one usable isolated checkout on `codex/september-consolidation`.
A stale registration can still have residual files in its folder: it is not a
license to remove the directory.

| Usable checkout | State at inspection | Disposition |
| --- | --- | --- |
| Primary `trading-journal` | `main`; three design-document working copies | Copies matched `8618962` byte-for-byte before consolidation. Original copies are backed up privately; sanitized documentation is integrated locally with this pass. |
| Sibling `trading-journal-gateway` | Clean; `codex/schwab-gateway-journal` | Already an ancestor of main; retain until explicit cleanup. |
| `.claude/worktrees/friendly-pike-60f8d7` | Clean; detached `d3f080a` | Preserved by merged PR #54; later CSS correction #57 intentionally superseded part of it. Do not reapply. |
| `.claude/worktrees/sleepy-hermann-87268a` | Clean; detached `dadf6de` | Old rewritten history; three patches remain non-equivalent. Retain for targeted historical review. |
| Temporary consolidation checkout | `codex/september-consolidation` | Validation and documentation integration only; separate dependency copy, no private environment copied. |

The 23 stale registrations belong to these worktree folder suffixes under the
old temporary `trading-journal-` prefix:

`checkpoint-sept4`, `disable-vercel`, `etf-fix`, `fee-breakdown`, `flat-stats`,
`history-fix`, `import-parity`, `market-context-forward-plan`,
`market-history-migration`, `market-mover-capture`, `massive-backfills`,
`momentum-archive`, `momentum-archive-audit`, `momentum-close-policy`,
`momentum-daily-evidence`, `momentum-date-labels`, `momentum-desktop-context`,
`momentum-main-integration`, `momentum-normalization-plan`,
`momentum-normalized-close`, `scope-heading`, `stats-bar`, `system-consolidation`.

The original consolidation left this cleanup queue intact. The authorized
follow-up above supersedes these registration counts and branch retention
statuses. Residual folders and uncertain work remain preserved.

## Publication preparation

The outgoing application slice adds/refines Calendar and Journal review behavior,
exact-identity Momentum Archive browsing, the explicit Schwab provider boundary,
and the Server archive/candle provider. The 27 baseline commits change 68 files;
there are no changed binary data files in that slice. The consolidation adds only
documentation, not another application feature or schema change.

The design checkpoint contained private trading examples. The integrated tip uses
placeholders, but the original checkpoint and its cherry-pick remain in local
history. **Do not directly push this historical branch or local main.** Publish
from the reviewed sanitized aggregate patch on a fresh branch rooted at the
verified remote base, without rewriting or uploading the preserved local history.
A local publication patch and PR description are prepared with the handoff.
This also keeps dormant research branches and private runtime files out of the PR.

This is a bounded preparation review, not a claim that all older repository
history has been audited for private material. No remote push or PR creation has
occurred. Creating a review branch/PR from the prepared patch is the next remote step.

## Verification

- Node 22.13.0; isolated dependency copy, no private environment copied.
- `npm run verify:full`: lint, demo schema, TypeScript and production Turbopack
  build passed. The initial sandbox attempt could not download Google Fonts;
  rerun with network permission passed. Existing broad NFT trace warning remains.
- `npm run test -- --run`: 230 passed, six existing skips, three failed solely
  because the sandbox forbids the synthetic Gateway Unix socket listener.
  `npm run test -- --run src/lib/schwab/gatewayClient.test.ts` with socket
  permission then passed all four tests: all 233 runnable tests pass across
  the initial suite and the focused rerun.
- `git diff --check` and local documentation link checks passed.
- Generated `next-env.d.ts` was restored to its original content; no application
  source, dependencies, private configuration or live data changed.
- Browser/runtime interruption QA was not rerun for this docs-only consolidation.
  September 4 installed validation remains historical evidence, not a fresh
  runtime check. Optional live Stop/Start testing still requires its own approval.
- Local integration: consolidation commits are on the task branch and fast-forwarded
  into local main. No GitHub push/PR, deployment, candidate cutover or fee migration.
