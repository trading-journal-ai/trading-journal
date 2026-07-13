# Journal Design

## Purpose

The journal is a text-first review system for turning trading data into a
repeatable feedback loop. Reports answer what happened. The journal should help
answer why it happened and what to do next.

> Direction update: notes and dictation are the primary human context layer.
> Broad process/emotion pill banks should be de-emphasized or removed from main
> capture flows. Keep structured controls mainly for setups, patterns, rules,
> and experiments. See
> `../product/NOTES_DICTATION_COACH_MODEL.md`.

The product has two modes:

- Reading mode: review day, week, and month narratives with lightweight trade
  context.
- Editing mode: add concise notes, dictated context, setup/pattern labels, and
  only the minimum structured metadata needed for review.

## Visual Language

The current direction is a deep, low-noise interface that keeps the data close
to the writing instead of wrapping every section in cards.

Core theme:

- Background: deep blue-black.
- Surfaces: subtle blue-gray lifts only where an interactive control, popover,
  chart canvas, or note editor needs containment.
- Dividers: use quiet hairlines for table rows, stat rows, and section breaks.
- Green/red: softer trading colors, used for P&L and small status dots.
- Typography: keep the app's current font stack for now. Use size, weight,
  spacing, and mono labels for hierarchy instead of introducing a new font.

Layout rules:

- Tables should read like ledgers: no heavy outer boxes, just top/bottom rules
  and subtle row dividers.
- Stats should be grouped into open sections with compact labels and values,
  not boxed grid cells.
- Journal content stays prose-first. Metrics and ticker P&L modules should be
  compact secondary context.
- Controls may keep borders because they need clear click targets.

Reference files for this direction live in `samples/Journal Design/`, including
the dashboard, calendar, reports, and journal explorations.

## Note Hierarchy

Journal notes exist at four levels:

- Month: broad themes, bigger-picture progress, drawdown context, and what
  carries into the next month.
- Week: pattern recognition across days, especially whether red days stayed
  contained and whether one trade distorted the week.
- Day: the core review unit. Captures market read, plan quality, execution,
  emotions, what worked, and what to fix tomorrow.
- Trade: a focused note attached to a specific trade. Trade notes surface under
  the matching day and reopen the ticker/day chart with that trade selected.

Trade notes are authored inside the ticker/day review workspace and roll up into
the daily journal automatically.

## Trade Note Labels

Trade note labels are the short callouts that appear next to the ticker symbol.
They describe the type of trade review at a glance.

Recommended starting set:

- Best setup: one of the highest-quality trades of the period; worth studying
  and repeating.
- Good trade: followed the plan or showed solid process, even if the P&L was
  small.
- Bad trade: poor execution, weak setup selection, or a decision that should not
  be repeated.
- Needs review: unclear lesson; useful to revisit with the chart.
- Rule break: explicit violation of a trading rule.
- Revenge trade: entered to make money back after a loss, not because the setup
  was valid.
- Chased: late entry after the clean opportunity had already passed.
- Overtraded: too many trades for the environment or quality of setups.

Display treatment:

- Positive labels: green border/text.
- Negative labels: red border/text.
- Neutral labels: muted border/text.
- Labels should be compact and sit inline with the ticker symbol.

Suggested tones:

| Label | Tone |
| --- | --- |
| Best setup | Positive |
| Good trade | Positive |
| Needs review | Neutral |
| Bad trade | Negative |
| Rule break | Negative |
| Revenge trade | Negative |
| Chased | Negative |
| Overtraded | Negative |

## Dictation And Natural-Language Context

Process and emotion context should primarily live in the note body, especially
when captured through dictation. The trader should be able to say what happened
quickly and honestly without classifying every feeling or process mistake before
saving.

Examples that belong in prose/dictation:

- I hesitated because the prior loss was still in my head.
- I chased after missing the clean entry.
- I took profit early because the candle speed made me uncomfortable.
- I was calm, but I lowered standards after the first winner.
- I kept trading because I wanted to get back to high of day.

The coach can extract process/emotion signals after capture and show suggested
labels with evidence, confidence, and a correction path.

## Future Tag Taxonomy

Tags should eventually separate into three related but distinct groups:

- Trade classification: the main review label, such as Good trade, Best setup,
  Needs review, Rule break, Revenge trade, or Bad trade.
- Trade setup: the technical setup or strategy context, such as VWAP reclaim,
  opening range breakout, news momentum, continuation, pullback, or scalp.
- AI-extracted emotion/process signals: the execution state inferred from prose,
  such as calm, frustrated, FOMO, patient, followed plan, chased, oversized, or
  moved stop.

Custom tags should be managed separately from the current visual cleanup work.
They will affect trade notes, journal editing, trade log filtering, reports, and
future AI review, so this should be handled as a focused Part 2 feature.

## Ticker/Day Review Workspace

Treat the individual trade as selectable evidence, not as a required third
navigation level. The trader should be able to review and document every trade
for a ticker from one robust ticker/day chart.

- The chart shows the full review session and every entry/exit marker.
- Selecting a trade keeps the user on the same surface and reveals that trade's
  executions, setup, intended trigger, invalidation, plan-adherence judgment,
  note, screenshots, and video.
- Ticker-level context describes the session thesis, important levels, and the
  sequence across multiple attempts.
- Trade-specific context remains linked to the selected trade id for coach
  evidence and historical analysis.
- A one-trade ticker does not get a duplicate ticker note and trade note. The
  selected trade is the ticker story.
- Links from the Journal open this workspace with the relevant trade selected.
  The individual trade route may remain an implementation/deep-link detail, but
  it should not feel like a separate journaling product.

This is an information-architecture decision before it is a layout decision:
retain ticker and trade scopes in data, but expose one authoring surface.

Journal page:

- Trade note displays as:
  - ticker
  - primary callout label
  - note body
  - setup/pattern context when present
  - AI-suggested process/emotion signals only when useful
  - link to the ticker/day chart with the cited trade selected
- In reading mode, edit controls should stay hidden.
- Clicking the note can enter editing mode.

## Daily Note UI

The daily note is the heart of the journal.

Daily view should show:

- Day header and date.
- Coach narrative: how the trader did, what mattered, how it relates to their
  history, and what should change next.
- One carry-forward focus for the next session.
- The trader's day-level context when it adds information that no ticker or
  trade annotation can provide.
- A compact result line rather than a competing analytics section.
- Two to four cited ticker/trade evidence items that support the narrative or
  still need context.
- Quiet access to the full day record: ticker/day workspaces, remaining trades,
  media, calculations, and analytics.

The root Journal page should not reproduce the ticker/day workspace. It should
surface only the evidence the Coach used, the context still missing, and the
lesson that carries forward.

Daily note prompts:

- What was the market environment?
- What was the plan?
- Did I follow the plan?
- What emotions showed up?
- Did I revenge trade, chase, oversize, or force anything?
- What should I repeat?
- What should I fix tomorrow?

## Data Model Direction

Current `journal_entries` fields support the first version:

- `scope`: trade, day, week, or month.
- `scopeKey`: date/week/month key for non-trade notes.
- `tradeId`: links trade notes to trades.
- `lessons`: currently used for most note body text.
- `emotionalState`: currently stores one trade label/status.

For Part 2, likely additions:

- Rename or generalize `emotionalState` to `label` or `reviewLabel`.
- Add setup/pattern references.
- Add optional storage for AI-extracted process/emotion signals with evidence
  and user correction.
- Keep note text as plain text or Markdown-compatible text.

Possible future tables:

- `journal_labels`: canonical primary labels.
- `setup_patterns`: user-defined setup/pattern definitions.
- `journal_extracted_signals`: AI-suggested process/emotion signals.
- `journal_entry_tags`: many-to-many join between notes and tags.

## Part 2 Scope

Part 2 should focus on authoring, not layout.

Build order:

1. Define canonical label/tag constants in one shared module.
2. Reuse those constants in the ticker/day selected-trade editor and journal
   edit forms.
3. Replace duplicated hard-coded select options.
4. Add primary label editing for trade notes.
5. Add setup/pattern selection where it improves review.
6. Add dictation to primary note surfaces.
7. Add AI-extracted process/emotion signals after save, with user corrections.
