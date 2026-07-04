# Playbook MVP

> Status: Draft · Last updated: 2026-07-04

## Purpose

This spec turns the playbook thesis into the first shippable product surface.
The MVP should prove one loop:

```text
Review today's session
  -> archive one high-signal play
  -> attach it to a setup
  -> extract rules / mistakes / reasons to sell
  -> rehearse the best examples before the next session
```

The first implementation should be useful before the full schema is perfect. A
small preview/workspace that changes how review happens is better than a large
form that only collects static setup definitions.

## Product Principles

- The playbook is built from real trades, not imagined rules.
- Each trading day should produce one candidate playbook entry when possible.
- A+ setups should be separated from ordinary valid setups.
- Exit logic is part of the setup, not an afterthought.
- The playbook should remove weak behavior, not only celebrate strong trades.
- The coach should draft and compare, but the trader approves playbook changes.
- The dashboard should rehearse what matters before the next session.

## MVP Data Model

Do not migrate immediately. Use this as the target shape for the first schema
pass after the preview flow feels right.

### `playbook_setups`

The reusable setup definition.

| Field | Notes |
| --- | --- |
| `id` | Primary key. |
| `account_id` | Keeps setup definitions account-scoped. |
| `name` | Trader-authored setup name. |
| `status` | `developing`, `core`, `retired`, `avoid`. |
| `grade` | Optional default grade bucket: `a_plus`, `valid`, `watch`, `avoid`. |
| `market_context` | Big picture conditions required for the setup. |
| `catalyst` | News, volume, sector, order-flow, or reason in play. |
| `technical_structure` | Pattern description and required levels. |
| `entry_trigger` | What makes the trade actionable. |
| `stop_logic` | Invalidation and risk definition. |
| `target_logic` | Target, hold, and profit-taking logic. |
| `reasons_to_sell` | Structured list or markdown list of exit reasons. |
| `invalid_conditions` | What disqualifies the setup. |
| `common_mistakes` | Repeat failure modes. |
| `created_at` / `updated_at` | Audit trail. |

### `playbook_entries`

The archived daily play. This is the ritual object.

| Field | Notes |
| --- | --- |
| `id` | Primary key. |
| `account_id` | Account scope. |
| `setup_id` | Optional at first; entries can become setup candidates. |
| `trade_id` | Optional trade reference. |
| `journal_entry_id` | Optional daily recap reference. |
| `entry_date` | ET trading date. |
| `symbol` | Ticker or market instrument. |
| `title` | Short archived-play title. |
| `classification` | `a_plus`, `valid`, `clean_loss`, `missed`, `avoid`, `unclear`. |
| `why_this_play` | Why this was the highest-signal archive candidate. |
| `big_picture` | Market read. |
| `intraday_fundamentals` | Catalyst / in-play reason. |
| `technical_analysis` | Pattern, levels, structure. |
| `tape_read` | Execution/order-flow read when available. |
| `trade_management` | How size, adds, stop, exits, and hold decisions went. |
| `strategy_next_time` | How to attack this setup next time. |
| `review_notes` | Human review and coach synthesis. |
| `created_at` / `updated_at` | Audit trail. |

### `playbook_entry_links`

Optional later join table for screenshots, chart snapshots, tags, or multiple
trades per playbook entry.

### `playbook_rules`

Reusable execution, sizing, exit, and avoidance rules.

| Field | Notes |
| --- | --- |
| `id` | Primary key. |
| `account_id` | Account scope. |
| `setup_id` | Optional setup-specific rule. |
| `kind` | `entry`, `risk`, `sizing`, `exit`, `avoid`, `review`. |
| `name` | Short rule label. |
| `body` | Rule text. |
| `status` | `active`, `testing`, `retired`. |

## First Screens

### 1. Playbook Home

Purpose: answer "What am I trying to get better at right now?"

Sections:

- Current experiment.
- A+ setup rehearsal list.
- Recent archived plays.
- Setup health: core, developing, avoid.
- CTA: archive today's play.

### 2. Daily Archive Flow

Entry points:

- Journal day recap.
- Trade detail.
- Trades table row action later.
- Dashboard end-of-day prompt.

Flow:

1. Choose the play: trade, missed opportunity, or day-level pattern.
2. Pick or create setup.
3. Classify: A+, valid, clean loss, missed, avoid, unclear.
4. Fill the five-variable review:
   - Big picture.
   - Intraday fundamentals / catalyst.
   - Technical analysis.
   - Tape / execution read.
   - Intuition / judgment.
5. Add management review:
   - Could I have been bigger responsibly?
   - Did I sell early?
   - Was there a reason to sell?
   - Was risk correct?
6. Save as a daily playbook entry.
7. Optionally promote rules, mistakes, or examples back to the setup.

### 3. Setup Detail

Purpose: show the reusable setup definition and its evidence.

Sections:

- Setup definition.
- Entry / stop / target / reasons to sell.
- Invalid conditions.
- Common mistakes.
- A+ examples.
- Clean losses.
- Avoid examples.
- Stats by setup.
- Coach notes and proposed edits.

### 4. Pre-Open Rehearsal

Purpose: review the playbook before trading.

Sections:

- Today's current experiment.
- A+ examples to rehearse.
- Avoid list for the session.
- One rule to protect.
- One setup to look for.

This can live on Dashboard first and later become a dedicated Playbook mode.

## Coach Behavior

The coach can:

- Ask which play from today belongs in the playbook.
- Draft a daily playbook entry from a trade and journal recap.
- Compare the archived play against the setup definition.
- Suggest reasons to sell when exits were premature or vague.
- Identify when a trade belongs on the avoid list.
- Promote repeated clean examples into A+ setup candidates.
- Propose setup edits, but require trader approval.

The coach should not:

- Auto-change the playbook.
- Treat one trade as proof of edge.
- Grade a setup as invalid when the setup definition is missing.
- Turn the playbook into live trade advice.

## Implementation Sequence

1. Build `/preview/playbook` as a static wireframe for the flow.
2. Add the Playbook home and daily archive UI as local/client-only prototype
   state.
3. Decide the minimum schema based on the prototype.
4. Add `playbook_setups` and `playbook_entries`.
5. Wire daily archive from Journal and Trade detail.
6. Add setup detail pages.
7. Feed playbook entries into coach review context.
8. Add dashboard pre-open rehearsal from A+ examples and current experiment.

## Open Questions

- Should setup definitions live in Settings first, or should the Playbook have
  its own top-level nav once it is real?
- Should a daily archive entry require a trade, or allow missed opportunities
  without a persisted trade reference?
- Should `reasons_to_sell` be markdown first or structured rules from day one?
- How much of setup grading should be deterministic before the coach narrates
  it?
- Should A+ be a setup-level label, an entry-level label, or both?
