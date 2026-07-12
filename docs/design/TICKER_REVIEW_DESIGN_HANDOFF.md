# Ticker Review → Daily Coach Review

> Designer handoff · Working product direction · July 2026

## The assignment

Explore the information architecture and interaction model for two connected
surfaces:

1. **Ticker review:** where the trader documents how they traded one ticker
   during one session.
2. **Daily review:** where the AI Coach synthesizes imported data, calculated
   evidence, and the trader's ticker/trade context into a useful narrative of
   the day.

This is primarily a content and interaction problem—not a dashboard styling
exercise. The product should continue to feel like a journal: human, calm, and
reflective, while remaining technically credible.

## Product model

```text
Imported executions + chart facts
              ↓
Ticker/day review
  ├─ ticker narrative
  ├─ trade 1 context
  ├─ trade 2 context
  └─ trade n context
              ↓
Deterministic session evidence
              ↓
AI Coach daily review
  ├─ what happened
  ├─ what mattered
  ├─ evidence and caveats
  └─ one carry-forward focus
```

The ownership model is important:

| Layer | Owner | Purpose |
| --- | --- | --- |
| Imported facts | System | Executions, prices, size, timestamps, and P&L |
| Calculated evidence | System | Contributions, timing, concentration, and review-engine facts |
| Ticker and trade context | Trader | Intent, setup, execution nuance, and what the data cannot know |
| Daily review | Coach | Evidence-backed interpretation of the complete session |
| Carry-forward focus | Trader + Coach | One useful behavior or experiment for the next session |

The UI should preserve these voices. A trader should understand what they
wrote, what was imported, what was calculated, and what the Coach inferred.

## Locked decisions

### One ticker/day review surface

The ticker review is the primary trader-authored review workspace.

- It represents one ticker on one trading date.
- It contains the full-session chart and every trade taken in that ticker.
- The model is identical whether the trader took 1, 5, or 15 trades.
- Individual trades remain identifiable and selectable, but do not open a
  separate product page.
- Old single-trade URLs may redirect here for compatibility.

### Current page hierarchy

1. Ticker/date, session result, and compact facts.
2. One robust full-session TradingView chart containing all executions.
3. A review workspace directly below the chart:
   - **Left:** overall ticker review and note.
   - **Right:** the day's trades and selected-trade context.
4. On mobile, the ticker review appears above the trade list.

This layout is a starting scaffold, not a fixed visual solution.

### Day-level narrative belongs to the Coach

The ticker page is not a second daily recap. The trader supplies context at the
ticker and trade level; the AI Coach owns the synthesized day narrative in the
Journal.

The main Journal review can show at-a-glance evidence such as:

- Session P&L path.
- Tickers traded and contribution.
- Session verdict and confidence.
- One strength and one primary leak.
- Important ticker/trade citations.
- One next-session focus.

When the Coach cites a trade, the citation should open its ticker/day review
with that trade selected—not a separate trade-detail page.

## Design challenge 1: ticker-level capture

The ticker review answers:

> How did I trade this ticker today?

The ticker-level note should capture the pattern across the session:

- Did the trader repeatedly chase or enter well?
- Did behavior change after a win or loss?
- Was the trader early, late, patient, or reactive?
- Did multiple trades express the same thesis?
- Did the setup evolve or fail during the session?
- What should the trader repeat or avoid next time?

The note experience should be:

- Text-first and dictation-friendly.
- Fast enough to use while the session is still fresh.
- Editable.
- Consistent with note capture elsewhere in the product.
- Lightly structured only where the structure compounds over time.

Avoid turning the ticker note into a long mandatory form or a bank of emotion
pills.

## Design challenge 2: trade-level context without another page

The trades beneath the chart are evidence within the ticker story. Most trades
will not need a forensic review, but the trader needs enough tools to add nuance
where it matters.

A compact trade row should make these facts scannable:

- Trade number or sequence.
- Entry time.
- Side and size.
- P&L.
- Note/context state.
- Setup or intent when supplied.
- Role in the sequence when supplied.

Selecting a trade can reveal:

- Executions.
- Editable prose or dictated context.
- Intended setup.
- Setup-quality call.
- Whether the plan was followed.
- Optional screenshots, video, or chart references later.

### Setup intent

Setup identification is an important piece of human ground truth. The Coach
should not silently infer what the trader intended from candles alone.

The trader may identify:

- The intended setup or playbook pattern.
- Whether it was a valid, partial, or forced instance.
- A trigger, stop, thesis, or invalidation when useful.

The Coach may later suggest a likely setup with confidence, but the trader
confirms or corrects it.

### Trade role and sequence

Several trades in the same ticker may be related without being identical. The
design should explore a lightweight way to communicate roles such as:

- Initial entry.
- Add or scale.
- Continuation trade.
- Re-entry.
- Reversal attempt.
- Independent setup.

This vocabulary is not finalized. The design task is to determine whether role
belongs in a compact selector, is inferred from grouping, or emerges naturally
from the trader's note.

### Chart interaction

The shared chart remains the spatial source of truth. Potential interactions
to explore:

- Selecting a trade row emphasizes its executions on the chart.
- Selecting a chart marker selects the corresponding trade row.
- Hovering either surface connects the two without navigating away.
- Zooming or panning never loses the broader ticker/session context.

Chart-marker selection is not currently a locked requirement. A clear trade
list is the baseline interaction.

## How notes surface to the Coach

Saved context should never become a dead end.

### Ticker note

Feeds the Coach's understanding of the pattern across one ticker, including
concentration, repeated attempts, changing behavior, and the trader's own
summary of the opportunity.

### Trade context

Feeds setup segmentation, intent, execution assessment, evidence quotes, and
the review queue. It is especially valuable when imported data cannot explain
why the trader entered.

### Daily Coach review

Combines:

- Imported trade and execution facts.
- Deterministic calculations.
- Ticker-level notes.
- Selected trade annotations.
- Playbook rules and setup definitions.
- Historical comparisons when the sample supports them.

The Coach should cite the source when it uses trader context. Notes can surface
in three ways:

1. **Quoted:** the Coach cites a useful phrase and links to its ticker/trade.
2. **Counted:** structured setup and quality fields contribute to patterns.
3. **Resurfaced:** the most useful lesson becomes the next-session focus.

Notes improve Coach confidence; they should not be mandatory before a review
can exist. When important intent is missing, the Coach should ask a focused
question or state the limitation rather than inventing an explanation.

## Progressive disclosure

The experience should support different depths without displaying everything
at once.

### Default ticker review

- Full-session chart.
- Overall ticker note.
- Scannable trade list.
- Clear indication of which trades have context.

### Selected trade

- Executions.
- Setup/intent.
- Trade role or relationship to the sequence.
- Note and supporting media.

### Technical explanation on demand

Detailed analysis can be opened or requested from the Coach when the trader is
curious:

- Included trades.
- Before/after calculations.
- Concentration percentage.
- Sample thresholds.
- Calculation definitions.
- Missing-data caveats.
- Historical comparison.

The default narrative should remain human. Technical depth should be available,
not forced into the primary reading experience.

## Responsive principles

- Desktop: chart first; ticker narrative left and trades right beneath it.
- Mobile: chart first; ticker narrative above trades.
- Preserve the trade sequence and note state when rows become narrower.
- Avoid shrinking essential content into unreadable tables.
- Dense execution data can be progressively disclosed after selecting a trade.

## Questions for the designer

1. How should 1 trade versus 15 trades feel like the same model without making
   the single-trade case look redundant or the 15-trade case overwhelming?
2. What is the fastest credible way to capture setup intent per trade?
3. How should continuation, re-entry, and independent setups be represented?
4. Should ticker narrative and selected-trade context be edited simultaneously,
   or should one become visually primary when a trade is selected?
5. How should the chart and trade list communicate selection to each other?
6. Which trades deserve an explicit annotation prompt, and which can remain
   untouched?
7. How does the Coach show that a day-level claim came from a specific ticker
   note or trade annotation?
8. What are the empty, partial, saved, and missing-context states?
9. How can dictation be central without making the interface feel like a voice
   product?
10. What interaction gives access to technical analysis without turning the
    journal into an analytics dashboard?

## Out of scope for this pass

- Designing a separate single-trade page.
- Rebuilding the main Analytics section.
- Full Coach chat.
- Automatic setup classification without trader confirmation.
- Final playbook management UI.
- A mandatory note for every trade.
- Visual theme exploration before the information hierarchy works.

## Current prototype

In local development, use:

- Journal day: `/journal?from=2026-04-01`
- High-volume ticker example: `/trades/review?date=2026-04-01&symbol=AGPU`

The implementation is scaffolding intended to make the content model tangible.
It is not a finished interaction or visual design.

## Primary source documents

Read these in order:

1. [`docs/product/NOTE_MODEL.md`](../product/NOTE_MODEL.md)
   - Note taxonomy, the capture-to-recap ladder, and how notes resurface.
2. [`docs/product/NOTES_DICTATION_COACH_MODEL.md`](../product/NOTES_DICTATION_COACH_MODEL.md)
   - Shared composer behavior, dictation, prose versus structure, and Coach use.
3. [`docs/product/AI_FIRST_DAILY_RECAP_PLAN.md`](../product/AI_FIRST_DAILY_RECAP_PLAN.md)
   - Ownership, provenance, quick capture, Coach hierarchy, and progressive disclosure.
4. [`docs/product/COACH_RECAP_CONTENT_SPEC.md`](../product/COACH_RECAP_CONTENT_SPEC.md)
   - Full Coach content architecture. Focus on §§1–5, 9, and 13–15.
5. [`docs/coach/SETUPS.md`](../coach/SETUPS.md)
   - Setup intent, manual tagging, grading, and playbook evaluation.
6. [`docs/DATA_MODEL.md`](../DATA_MODEL.md)
   - Provenance, the ticker/day review window, and structured-versus-prose decisions.
7. [`docs/design/DESIGN_SYSTEM_ONE_SHEET.md`](DESIGN_SYSTEM_ONE_SHEET.md)
   - Visual language after the interaction and hierarchy are settled.

## Superseded statements in older docs

Some older documents still describe the previous drill-down model. For this
design pass, the decisions in this handoff take precedence.

- `NOTE_MODEL.md` says ticker notes exist only when multiple trades occurred.
  The current direction uses one ticker/day review surface for every traded
  ticker, including the single-trade case.
- `DAILY_RECAP_FLOW.md`, `FEATURES.md`, `APP_MAP.md`, `JOURNAL_DESIGN.md`, and
  portions of the Coach content spec mention a separate trade-detail page.
  That surface is now disabled. Trade inspection and annotation remain inside
  ticker/day review.
- Older pill-heavy emotion/process capture is superseded by prose and dictation,
  with structure reserved mainly for setup, rules, and durable experiments.

When a source conflicts with this handoff, use this handoff for the ticker
review model and use the source document for its deeper domain guidance.
