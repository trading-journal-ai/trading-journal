# Coach Tag Taxonomy

> Status: Proposed v1 · Last updated: 2026-07-22

This document defines the structured vocabulary behind trade-review tags, how
the vocabulary should be stored, which tags should appear first in the UI, and
how Coach may use them.

The chip icon, tone, color, and grouped-layout rules are defined separately in
[`TAG_VISUAL_SYSTEM.md`](TAG_VISUAL_SYSTEM.md).

The core product decision is:

> Seed a broad, typed tag library in the database, but surface a small,
> high-signal subset during review.

The review interaction should feel like quick classification, not a required
questionnaire. A fixed row of category controls sits directly above the note;
each control opens a compact list. The written note remains the primary place
for nuance.

## Relationship To The Playbook

A pattern tag records the trader's intent: what pattern they believed they
were trading. The pattern's definition does not belong in the tag assignment.

- `Curl` is the pattern tag.
- The Curl definition lives in [`SETUPS.md`](SETUPS.md#the-curl).
- Candle-over-candle action and increasing volume are part of the Curl
  definition; the trader should not have to tag them every time.
- The engine may later verify measurable playbook criteria from candles and
  fills, following the model in [`SETUPS.md`](SETUPS.md#tagging-and-grading-model).
- A mismatch between the selected pattern and chart evidence is a coaching
  finding, not permission to silently relabel the trade.

## V1 Review Categories

The first review control surfaces four categories.

| Category | Question answered | Selection rule | Coach meaning |
| --- | --- | --- | --- |
| Pattern | What pattern did I believe I was trading? | Exactly one when classified | Trader-authored intent; compare with the playbook and performance history. |
| Execution | How did I enter and execute the idea? | Optional, at most one | Trader assessment of entry quality; compare with the intended trigger and playbook. |
| Risk | Did a risk exception occur? | Optional, up to 2 | Exception-only self-report unless verified by planned-risk, size, or stop data. |
| Emotion | What state materially affected the decision? | Optional, up to 2 | Self-reported context; never inferred as fact from P&L. |

Emotion is deliberately optional. Notes and dictation remain the better source
for a complicated emotional story. Coach may later suggest emotion or process
tags from the note with evidence and a confirmation step.

## Deferred Categories

The database taxonomy should support these categories even if the first
inline control does not surface them.

| Category | Purpose | Likely scope |
| --- | --- | --- |
| Management | Partials, holds, adds, and exit decisions after entry | Trade |
| Selection | Why the trader participated or continued trading | Trade, ticker/day |
| Context | A larger regime such as drawdown, reduced size, or rebuilding confidence | Day, week, month |

This separation prevents `Took profits early`, `Overtrading concern`, and
`Curl` from becoming three indistinguishable strings.

## V1 Visible Vocabulary

These are the initial choices presented in the inline control. They are intentionally
smaller than the stored library.

### Pattern

One primary selection:

- Curl
- Micro pullback
- Flat-top breakout
- Reclaim
- Dip buy
- EMA rail
- Double bottom
- Other
- Chop

The list is ordered by expected usage. `Other` does not create a new permanent
pattern inline; new patterns belong in a future **Manage playbook** flow.

`Chop` is the exception on this axis: it means the trader participated in
consolidation or another low-structure, choppy condition without a clean play.
It is not a playbook setup. Coach should treat it as a trader-authored
selection-quality flag while preserving it in the Pattern slot for the compact
v1 interaction.

Choose the entry structure that caused action, not every structure visible on
the chart:

- Bull flag entered through a micro pullback → `Micro pullback`
- Micro pullback at the EMA → `Micro pullback`
- HOD or VWAP reclaim → `Reclaim`
- Dip or flush buy → `Dip buy`
- Bounce specifically taken from an EMA rail → `EMA rail`

Broader location and chart context stay in the note or deterministic evidence.
Coach must not silently relabel the chosen pattern.

### Execution

- Clean
- Early
- Chased
- Anticipated
- No trigger

Execution is single-select. The labels mean:

- `Clean`: the trader believes the entry matched the intended trigger and
  location. Reinforcing self-assessment, not proof.
- `Early`: an unplanned entry before the trader's intended trigger. Review.
- `Chased`: an entry after the intended location or after extension. Review.
- `Anticipated`: an intentional pre-confirmation entry tactic. This is
  review-needed and conditional, not automatically a mistake. Coach must not
  collapse it into `Early`; compare it with the playbook and available evidence.
- `No trigger`: no defined trigger guided the entry. Review.

No Execution tag does not mean `Clean`.

### Risk

- Undersized
- Oversized
- Averaged down
- Stop ignored

Risk is exception-only. `Undersized` and `Oversized` are mutually exclusive.
Leaving Risk blank means no exception was tagged; it does not verify perfect
risk management.

### Emotion

- Calm
- Focused
- Hesitant
- Impatient
- Frustrated
- FOMO

The interface does not require a choice in every category. Saving `Curl` by
itself is valid. Pattern and Execution are each capped at one; Risk and Emotion
are capped at two.

## V1 Seed Library

Seed the ratified v1 vocabulary first. Additional candidates can be added after
usage shows a real distinction that changes Coach analysis.

### Pattern

- Curl
- Micro pullback
- Flat-top breakout
- Reclaim
- Dip buy
- EMA rail
- Double bottom
- Other
- Chop

### Execution

- Clean (`reinforcing`)
- Early (`review`)
- Chased (`review`)
- Anticipated (`review`, conditional rather than an automatic violation)
- No trigger (`review`)

### Risk

- Undersized
- Oversized
- Averaged down
- Stop ignored

### Emotion

Emotion tags are neutral descriptions, not positive or negative grades.

- Calm
- Focused
- Patient
- Confident
- Hesitant
- Rushed
- Impatient
- Frustrated
- Fearful
- FOMO
- Revenge urge
- Tilted
- Overconfident
- Mentally fatigued
- Distracted
- Trying to make money back

### Management

Reinforcing:

- Managed to structure
- Exit on invalidation
- Partials followed plan
- Let winner work
- Protected without choking
- Held through normal volatility

Review:

- Early relief exit
- Took profits before plan
- Held beyond invalidation
- Let winner become loser
- Failed to reduce into extension
- Managed P&L instead of structure
- Added without confirmation
- Held and hoped

### Selection

Reinforcing:

- Fresh setup
- Playbook-only selection
- Reset after loss
- Correct pass
- Stopped when conditions degraded
- Protected session gains
- Waited for a new opportunity

Review:

- Forced trade
- Boredom trade
- No-setup trade
- Immediate trade after loss
- Revenge re-entry
- Re-entered without reset
- Continued after session limit
- Trade-frequency acceleration
- Gave back after session high
- Repeated same failed idea
- Lowered standards after missing move

### Context

- Drawdown
- Reduced size
- Rebuilding confidence
- Strategy reset
- Selectivity focus
- Experimental sizing
- Returning to normal risk
- New playbook emphasis
- Low-opportunity period
- Adapting to volatility
- Protecting capital
- Consistency focus
- Overtrading concern
- Scalping more frequently
- Avoiding normal risk
- Reviewing execution quality

## Values That Must Remain Calculated

Do not turn calculated outcomes into manual tags:

- Winner or loser
- P&L, R, or per-share result
- Hold duration
- MFE, MAE, or capture ratio
- Entry extension
- Directional alignment
- Trade-frequency change
- Size change after wins or losses
- Same-symbol re-entry
- Session giveback
- Setup expectancy
- Outcome concentration

These values belong to deterministic analysis. A manual tag may describe the
trader's intent or assessment, but it must not replace the calculation.

## Tag Definition Contract

Every canonical tag definition needs stable metadata rather than relying on its
display string.

```ts
type CoachTagCategory =
  | "pattern"
  | "execution"
  | "risk"
  | "emotion"
  | "management"
  | "selection"
  | "context";

type CoachTagTone = "neutral" | "reinforcing" | "review";

type CoachTagDefinition = {
  slug: string;                 // stable key, e.g. "anticipated"
  label: string;                // user-facing copy
  category: CoachTagCategory;
  tone: CoachTagTone;
  description: string;          // meaning and inclusion boundary
  allowedScopes: Array<"trade" | "ticker" | "day" | "week" | "month">;
  exclusiveGroup?: string;      // e.g. "entry-quality" or "position-size"
  isSystem: boolean;
  isActive: boolean;
  isFeatured: boolean;          // visible in the initial inline menu
  sortOrder: number;
};
```

`tone` describes how Coach should frame a process tag. It is not a judgment of
the trader as a person. Patterns and emotions default to `neutral`.

`exclusiveGroup` prevents contradictions such as selecting both `Undersized`
and `Oversized` for the same trade. The UI also enforces one Execution tag.

## Database Direction

The current database has a global `tags` table with only `id` and `name`, plus
`trade_tags` and `journal_entry_tags` joins. That is sufficient for free-form
filtering but not for Coach intelligence.

### Extend `tags`

Add typed definition fields:

```text
slug
account_id nullable        -- null = system tag; account id = custom tag
category
tone
description nullable
allowed_scopes_json
exclusive_group nullable
is_system
is_active
is_featured
sort_order
```

Canonical identity must use `slug`, not the editable display label. System tags
are shared; custom tags are account-scoped.

### Primary pattern

Keep the primary pattern distinct from multi-select behavior tags. The existing
`trades.setup` text should remain during migration, then be supplemented by a
nullable `trades.setup_tag_id` foreign key to a tag whose category is `pattern`.

The UI enforces one primary pattern and at most one Execution assessment. This
gives Coach and Reports a stable setup relationship while Risk and Emotion
remain small multi-select exception/context axes.

### Tag assignments

Continue using:

- `trade_tags` for trade-scoped execution, risk, emotion, management, and
  selection tags.
- `journal_entry_tags` for ticker/day/week/month context.

Add assignment provenance when schema work begins:

```text
source              -- user | coach_confirmed | migration
created_at
```

AI suggestions should not silently enter the canonical assignment tables.
A future suggestion table should hold:

```text
target
tag_id
evidence_ref
confidence
status              -- pending | accepted | rejected
```

Accepting a suggestion creates a normal assignment with
`source = coach_confirmed`.

## Coach Payload Contract

Coach should receive typed, attributed values:

```json
{
  "selfAssessment": {
    "pattern": { "slug": "curl", "label": "Curl", "source": "user" },
    "tags": [
      {
        "slug": "anticipated",
        "label": "Anticipated",
        "category": "execution",
        "source": "user"
      },
      {
        "slug": "undersized",
        "label": "Undersized",
        "category": "risk",
        "source": "user"
      }
    ]
  }
}
```

Coach rules:

1. Attribute manual tags: "You marked this as..."
2. Separate process from outcome.
3. Strengthen a claim only when deterministic evidence supports it.
4. If evidence cannot verify the tag, preserve it as trader context.
5. If evidence conflicts, name the discrepancy without silently changing the
   tag.
6. Aggregate only canonical slugs, never loose display strings.
7. Apply sample-size and outlier caveats before claiming a pattern.
8. Treat `Anticipated` as an intentional pre-confirmation tactic and compare it
   with the playbook; do not automatically rewrite it as `Early`.
9. Treat an absent Risk tag as "no exception reported," not proof that risk was
   perfect. Treat an absent Execution tag as unknown, not `Clean`.
10. Aggregate process relationships such as `(patternSlug, executionSlug)` and
    risk-exception rates only after applying provenance and sample-size caveats.

## Inline Review Behavior

The review screen uses one compact classification block directly above the
written note:

- Fixed control order: Pattern, Execution, Risk, Emotion.
- Each category control opens a compact dropdown in place.
- Choices are ordered by expected usage.
- Selected semantic pills render directly below the control row.
- Pattern and Execution close after a single selection.
- Risk and Emotion remain open for up to two selections.
- The prototype updates immediately; production persistence is defined when
  the database work begins.
- The note sits directly beneath the classification block.
- Emotion is never required.
- Reading mode may show the same semantic pills without repeating category
  headers when the adjacent controls already provide the axis context.

The control should not contain setup criteria, calculate grades, or ask the
trader to restate facts already implied by the pattern definition.

## Migration And Cleanup

Current free-form data should be preserved, then mapped conservatively:

| Existing value | Canonical destination |
| --- | --- |
| HOD retest | Pattern: Reclaim only after trader confirmation |
| Late entry | Execution: Chased or Early; requires confirmation |
| No setup | Pattern: Chop only when the trader confirms consolidation/low structure |
| Too large of a position | Risk: Oversized |
| Revenge tade | Selection: Revenge re-entry or Emotion: Revenge urge; requires confirmation |
| Poor exit | Leave as legacy until a more specific management tag is chosen |
| Chop | Pattern: Chop only when the trade occurred in consolidation/low structure |
| Good set up | Leave as legacy; do not infer a pattern |

Unmapped strings remain available as legacy/free-form tags but do not enter
canonical Coach aggregates.

## Recommended Delivery Sequence

1. Ratify the categories, v1 visible tags, and canonical slugs in this doc.
2. Build an interactive prototype of the inline category controls against
   realistic trade notes.
3. Extend the database and seed the full taxonomy.
4. Backfill only unambiguous legacy tags; queue ambiguous values for review.
5. Wire typed tags into Coach with explicit user attribution.
6. Add Reports breakdowns after enough classified trades exist.
7. Add Coach suggestions from notes only after evidence and correction UX are
   defined.
