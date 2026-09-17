# Next session — remaining Journal work

Saved September 10, 2026. This is the resume point after consolidation, broker-fee
completion and the Momentum Archive research handoff. These are deferred tracks,
not approved implementations or an instruction to merge their branches.

## Start here

Read this document and [Project Status](PROJECT_STATUS.md), then run the repository
health check. Recheck branch tips and installed Server contracts before relying on
older plans. Work on one selected track at a time; preserve unrelated work.
Recommended starting point: Coach/recap decisions, followed by a focused v2 plan.
Optional design experiments can wait.

## 1. Coach / recap — Journal

**Remaining:** adopt the v2 Coach Review schema in generation, validation,
persistence and rendering; build the canonical `buildJournalDay()` / `JournalDayVM`
so recap views share one interpretation of a day. Preserve existing saved reviews
and account/date scope while defining compatibility for the older flat format.

The v2 contract and Phase 1 recap prototype already exist. Opportunity-context v1
calculation and service/payload wiring also exist; do not rebuild them as new work.
The current generated-review parser still uses the earlier flat shape.

**Decisions still needed from Justin:**

- Real setup definitions and criteria; the setup document is still a scaffold.
- Playbook/rule storage and stable identity, including whether setup is a
  first-class field. Existing recommendation: database identity with an
  authoring/export view; this is not a recorded acceptance.
- Original broker-file retention versus retaining only normalized records and
  provenance. No new retention policy has been approved.

**First deliverable next session:** check the current parser/rendering against the
v2 contract, summarize the smallest implementation slice and resolve the decisions
that actually block it. Do not invent setup rules for Justin.

Read: [Owner shortlist and decisions](OWNER_TODO.md),
[v2 review contract](product/COACH_REVIEW_SCHEMA_V2.md),
[data model and sequencing](DATA_MODEL.md),
[recap prototype plan](product/AI_FIRST_DAILY_RECAP_PLAN.md).

## 2. Forward market context — Server data, Journal review

**September 16 planning update:** start with the
[Market Context master plan](analytics/MARKET_CONTEXT_MASTER_PLAN.md). It records
the agreed post-mortem red/yellow/green direction, five-pillar and mover inputs,
1–5-minute tradeability research, DTS cross-reference, coverage gaps and phased
acceptance. Confirmed absence of +50% movers defines Cold for this strategy;
systematic +10–49% capture is not required. A bounded coverage audit, local
processing benchmark and raw-feature prototype are now available in the
[research toolkit](../scripts/market-context-research/README.md). Real outputs and
independent verification remain under gitignored `data/evals/market-context-pilot-2026-09-16/`.
The first verbal review is recorded privately in `feedback-verbal-v1.json`:
it distinguishes highlighted windows from surrounding moves, structure from
price fit, and frontside advances from backside sell-offs. Some mappings/scope
and the meaning of price concerns remain uncertain. Next: refine the review
packet/rubric before calibration; do not train on these as clean binary labels.
Weights, quality/yellow-green cutoffs and production scoring remain uncalibrated.

**Remaining:** reconcile the after-hours opportunity-capture plan and preserved
research tooling with Trading Server's current implementation. Determine what
capture, session coverage, daily summaries and historical queries already support
before deciding what to build or port.

The old plan described summaries finalizing near the regular close and incomplete
after-hours representation. Treat these as historical findings to verify, not
proof that today's installed Server still has those gaps. Keep alert-time evidence
separate from hindsight outcomes; missing capture means unknown coverage, not zero
opportunities. Preserve source distinctions between Massive history and DTS events.

**Preserved references:**

| Branch | Recorded tip | Purpose |
|---|---|---|
| `docs/market-context-forward-plan` | `4eb5b99` | After-hours plan in `docs/analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md` |
| `codex/market-mover-capture` | `4cb5458` | Grouped-daily research capture and warrant filtering |
| `codex/massive-backfills` | `1b2af6e` | Historical backfill/export tooling |

**First deliverable:** a small implemented/missing/superseded comparison against
maintained Server source and its release ledger, followed by an ownership-correct
next step. Do not merge old tooling wholesale or recreate retired Journal archives.
Server owns shared market capture/storage/derivation; Journal owns trade comparison
and recap presentation.

Server references: `docs/SYSTEM_STATUS.md`, `docs/shared-market-history.md` and
`docs/market-context.md` on maintained Server main. Its primary checkout may be on
an unrelated WIP branch; inspect the registered main worktree.

## 3. Design experiments — optional, unaccepted

The calendar decision is settled: Calendar and Journal Month share `MonthCalendar`
in local main. Historical calendar variants and the A–E inventory are retired;
do not restore them from these branches. See [Calendar design](design/CALENDAR_DESIGN.md).

| Branch | Recorded tip | What to review |
|---|---|---|
| `feat/design-lab` | `0dd642c` | Design Lab and contained design/workflow experiments; compare with current UI before adoption |
| `feat/electron-desktop-shell` | `654243c` | Development desktop shell; packaging unfinished and older navigation needs reconciliation |
| `codex/momentum-date-labels` | `9679c71` | Archive date-label simplification |

These are choices, not required fixes. Review visually only when Justin wants to
choose a direction. Adopt useful changes selectively and validate on the current
base; branch existence and old tests do not imply product acceptance.
Related design/spec branches and other retained historical refs are mapped in
[the branch inventory](REPOSITORY_CONSOLIDATION.md).

## 4. GitHub publication — September 17 synchronization

Accepted source through local `0c4e824` is prepared on
`codex/publish-journal-updates-sept17`, based on refreshed remote main `1e372e5`.
This publishes the Analytics workspace, Top Gainers updates, shared control
polish and offline research tooling already integrated locally. See the latest
[worklog](PROJECT_STATUS.md#worklog) for validation and publication status.
Private research outputs and the separate `codex/analytics-research-refresh`
audit/prototype branch remain local; their presence is not permission to publish
screenshots or account observations.

**Important publication boundary:** older local checkpoint history retains private
design examples. Publish a reviewed final-tree snapshot from a fresh branch based
on refreshed GitHub main, rather than pushing the existing local history. Do not
upload private originals, recovery bundles, live databases or broker exports.
Future synchronization must preserve remote-only work. Local main must not be
pushed wholesale, even after a release is reconciled locally. Trading Server
publication and installed services are outside this Journal release.

## Completed today / keep out of the Journal backlog

- Broker fee reconciliation is integrated locally; its additive Journal migration
  is applied, with backups and rollback verification. Daily totals stay net of
  fees without new fee columns. Future confirmed imports populate fee details;
  fee analytics UI remains deferred. The fee branches/worktree were closed.
- Momentum Archive false-positive investigation and candidate adoption now belong
  to Trading Server. Its canonical `docs/handoffs/momentum-archive-research.md`
  and five historical research notes are integrated on Server main (`b2f1f08`).
  Candidate code and evidence remain preserved and unadopted. Journal owns only
  presentation/API consumption and personal-trade comparison for this track.
- Confirmed-merged cleanup was completed earlier. Remaining research/experiment
  branches are preserved; do not treat the whole inventory as ready to delete.

No new feature, market-data migration, candidate promotion or publishing is
performed by this next-session handoff. Documentation checks only; previous
runtime validation results remain recorded in Project Status.
