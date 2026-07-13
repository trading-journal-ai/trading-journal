# AI-First Daily Recap Plan

**Status:** Proposed product direction · July 11, 2026  
**Build posture:** Prototype the interaction and evidence hierarchy first; keep
live coach generation behind the existing deterministic fact-pack boundary.

## Why this direction

The Journal should remain the durable source of truth, but it should not begin
with a large writing assignment. The trader contributes the context the system
cannot know; the Coach turns that context, executions, chart facts, and
playbook rules into a concise review.

```text
Fast trader capture -> deterministic evidence -> Coach interpretation
                     -> one carry-forward experiment -> next session
```

This is an evolution of `DAILY_RECAP_FLOW.md`, not a replacement for it.

## Product decisions to lock

### Two voices, two ownership models

| Layer | Owner | Purpose | Editing rule |
| --- | --- | --- | --- |
| Trader capture | Trader | Intent, setup, self-grade, emotion, private context, corrections | Directly editable |
| Deterministic evidence | System | Executions, P&L, timing, rule checks, chart-derived facts | Never manually edited; source data can be corrected |
| Coach review | Coach | Evidence-backed conclusion, findings, review queue, recommendation | Preserve the original; accept, dismiss, or correct with a separate trader annotation |
| Carry-forward focus | Trader + Coach | One behavior to test next session | Coach proposes it; trader may edit/save their adopted version, with provenance retained |

The distinction must be visible in the UI through source labels: **Your note**,
**Imported**, **Calculated**, **Coach interpretation**, and **Playbook**.

### Fast capture, not a big form

Default daily capture should be a compact `Quick capture` block:

1. Setup / intent pill (required only when the trader wants coach precision).
2. Self-grade pill: `would repeat`, `mixed`, `would avoid`.
3. `Add context` via typing or dictation, with the transcript editable before save.
   Emotional state and process observations belong in this natural-language
   context, not in a mandatory pill taxonomy.
4. `Review this trade` on selected trades only.

The existing freeform day recap remains available as an intentional expanded
action: `Talk through the session`. It is not the first obstacle after import.

The Coach should ask one focused question when missing intent materially limits
an assessment; it should not block a recap or invent a thesis.

### Coach as explanatory visualization

The Coach is not a second analytics dashboard. Its small visuals exist only to
make a specific recommendation legible at a glance.

| Coach claim | Small visual | Opens to |
| --- | --- | --- |
| Session verdict | Process × outcome indicator | Evidence and caveats |
| What drove the result? | Trade/ticker contribution bar or waterfall | Full calculation |
| Rule integrity | Compact clean / breach / not-evaluable rail | Rule scorecard |
| Repeated pattern | Five-session recurrence strip | Historical examples |
| Opportunity at entry | Annotated chart thumbnail: entry, VWAP, high, exit | Trade chart |
| Review queue | Session timeline highlighting 2–4 trades | Ticker/day chart with cited trade selected |

Do not use generic metric cards where a sentence and one proof visual do more
work. Analytics remains the place to explore the wider data landscape.

### Recap hierarchy

The default Coach Review should fit a 10–20 second glance:

1. Session verdict and confidence.
2. One next-session focus.
3. One strength and one primary leak.
4. `What drove the result?` when the sample supports it.
5. A two-to-four trade review queue.

Rule scorecards, complete trade rows, charts, calculations, trend comparisons,
and extra findings belong behind progressive disclosure.

## What already exists

The app already has the important foundations:

- Imported and normalized trade data, plus the deterministic session fact pack.
- A review engine that supplies a starter read and one experiment.
- A structured AI Coach payload with a numeric/fact boundary.
- Daily recap, trade-note, and ticker-note capture surfaces.
- Browser dictation that transcribes locally and inserts editable text.
- Saved coach experiments and an import-to-journal-review handoff.

This means we are ready to build a prototype now. We are **not** ready to make
the full live Coach the source of truth until the new object contract,
provenance, and representative evaluation set are in place.

## Recommended delivery plan

### Phase 0 — Lock the content contract (small spec, no product behavior)

Define the first production fields, source labels, status transitions, empty
states, confidence rules, and ranking rules for:

- Trader quick-capture item
- Coach verdict
- Finding
- Review queue item
- Rule evaluation
- Session-structure conclusion
- Experiment / carry-forward focus
- User correction to a coach item

**Exit criteria:** one field-level contract and 8–12 seeded examples cover
strong-process losses, bad winners, small samples, missing context, a critical
breach, and no material issue.

### Phase 1 — Static recap prototype (first build)

Build the target experience from seeded data on a review route or feature flag.
It should use the current deep, type-led design system and implement:

- Glance hierarchy.
- Two-voice provenance labels.
- Quick capture with existing dictation.
- One contribution visual, one rule-integrity visual, and one review timeline.
- Selected-trade queue and collapsed evidence.

Do not add a database migration or a live AI dependency in this phase.

**Exit criteria:** the entire recap can be understood in 20 seconds; each
Coach claim visibly links to supporting data; long-form writing is optional.

### Phase 2 — Put fast capture into the real daily flow

Replace the default empty-state prompt for the day recap with `Quick capture`.
Keep `Talk through the session` available. Add a selected-trade review toggle
and use the existing dictation component in both places.

**Exit criteria:** a trader can import trades, self-grade/contextualize one or
two important trades, and request a review without completing a long form.

### Phase 3 — Deterministic visual evidence

Extend the existing fact pack with the minimum deterministic inputs for:

- Largest trade, ticker, and time-window contribution.
- Rule integrity counts and evaluability.
- Review-queue selection reasons.
- Five-session recurrence data where sample thresholds are met.

Add these visuals to the real recap, but only when facts meet their thresholds.

**Exit criteria:** every visible visual is deterministic, has source references,
and handles small-sample/missing-data states honestly.

### Phase 4 — Structured Coach persistence and corrections

Persist the new coach objects and their evidence references. Preserve generated
content as an immutable version; store user acceptance, dismissal, and
corrections separately. Allow a user-edited carry-forward focus to retain its
Coach origin.

**Exit criteria:** regenerated reviews do not overwrite the trader's context or
erase the prior Coach artifact; provenance is inspectable.

### Phase 5 — Live Coach, only after evaluation

Create an evaluation set of 10–20 reviewed sessions and compare generated
output against expected trader-language judgments. Then enable live generation
from the deterministic fact pack and selected human context.

**Exit criteria:** numeric claims come exclusively from deterministic facts,
the Coach handles missing context explicitly, and one focused experiment is
consistently more useful than a generic recap essay.

## The first build to approve

Build **Phase 1: an AI-first Daily Recap prototype** before changing production
data structures. This gives us something concrete to react to and tests the
essential product bet:

> Can pills plus optional dictation produce enough human context for a Coach
> Review that is more useful than a large text form?

Use one realistic red-day fixture and one green-but-weak-process fixture. The
prototype should make the visual evidence feel like a proof of the Coach's
claim, not like a miniature Reports page.

## Deliberately not in the first build

- Full freeform Coach chat.
- A single letter grade or opaque score.
- Mandatory notes for every trade.
- Auto-promoting Coach output into the Playbook.
- Chart-image interpretation.
- Live intraday trade advice.

## Future scope: weekly & monthly coach recaps

The daily recap is the atom; the same coach-driven, evidence-led model should roll
up into **weekly** and **monthly** recaps. This is future scope — after the daily
recap contract ([COACH_REVIEW_SCHEMA_V2.md](COACH_REVIEW_SCHEMA_V2.md)) is real —
but worth capturing now because the model already points here.

**The storage contract already exists.** `coach_reviews`, `coach_experiments`, and
`journal_entries` all carry `scope: day | week | month`. So weekly/monthly coach
reviews need new *content and rollup logic*, not a new data shape.

**Why these are more than longer dailies.** The content spec's pattern ladder
(session-only → emerging → repeated → established) is inherently multi-session. The
daily recap deliberately defers most pattern claims ("emerging, not yet a rule");
**weekly/monthly are where a pattern earns "repeated"/"established," and where a
carry-forward experiment is finally judged.**

**Weekly recap (coach view).** Did the week's daily focuses/experiments stick (roll
up carry-forward outcomes)? Which behavior most shaped the week; recurring rule
breaches vs. clean streaks; best/worst sessions and what separated them;
process-quality trend across the sessions. Promote or retire one emerging pattern;
one weekly adjustment.

**Monthly recap (coach view).** Playbook evolution (which candidate rules
graduated, were revised, or retired); by-setup edge over the month (which setups
carried vs. leaked); the arc (drawdown/recovery, process quality independent of
P&L); established patterns; one structural lesson carried into next month.

**Reuses, doesn't reinvent.** Same provenance/voice labels, same progressive
disclosure, same "what drove the result?" logic at a higher aggregation — weekly
and monthly are aggregations over the same typed Coach Review objects, feeding the
same Journal → Coach → Playbook → Dashboard loop at longer cadences.

## Related documents

- `docs/DATA_MODEL.md` — data-model synthesis and the "definition of finalized"
  (this plan's Phase 0 objects are specified there and in the schema below)
- `docs/product/COACH_REVIEW_SCHEMA_V2.md` — field-level contract that realizes
  Phase 0's object list
- `docs/product/COACH_RECAP_CONTENT_SPEC.md` — content design spec, Rev 2 (the
  working source shared July 11, 2026, now in-repo)
- `docs/product/DAILY_RECAP_FLOW.md`
- `docs/product/TRADING_JOURNAL_LEARNING_LOOP.md`
- `docs/product/NOTES_DICTATION_COACH_MODEL.md`
- `docs/coach/NEXT_BUILD.md`
- `docs/analytics/REVIEW_ENGINE_SPEC.md`
