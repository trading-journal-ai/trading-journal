# Notes, Dictation, and Coach Context

> Status: Draft · Last updated: 2026-07-03

This note captures a product direction shift: notes are not a sidecar to the
trading journal. Notes are the most important human context surface, and
dictation should become a first-class way to create them.

## Product Thesis

**Notes are the primary human context layer. Structured controls should only be
used where the structure compounds over time.**

The trader's real context usually comes out faster and more honestly when it is
spoken than when it is clicked through a set of tiny tags. The app should make
that spoken context easy to capture, edit, save, and hand to the AI coach.

Marketing-ready phrasing:

> Speak the trade while it is still fresh. The journal turns your real context
> into coachable feedback, without making you click through a form.

Alternate short lines:

- Talk through the trade. Let the coach find the pattern.
- Capture the context before it goes cold.
- Your voice carries the nuance the chart cannot.
- Less clicking, better coaching.

## Direction

The product should move away from broad process/emotion pill UIs as the main
capture mechanism.

Keep structured controls for:

- Setups.
- Patterns.
- Rules and risk guardrails.
- Planned experiments.
- User-defined playbook concepts that can be taught, corrected, and measured.

Move into prose/dictation:

- Emotional state.
- FOMO, fear, hesitation, revenge, frustration, confidence, impatience.
- Process observations.
- Why the trader clicked.
- What felt unclear in the moment.
- What the trader noticed but cannot cleanly classify yet.

The AI can extract softer behavior and emotion labels from notes after the
fact, then present them as suggestions with confidence and editability. The
human should not have to pre-classify every feeling or process mistake before
saving a note.

## Why Setups Still Deserve Structure

Setups and patterns are gray, but they are still worth structuring because they
can become teachable concepts.

A setup/pattern should eventually support:

- Name.
- Definition.
- Valid conditions.
- Invalidation.
- Common false positives.
- Screenshot/chart examples.
- User corrections over time.
- Status: active, paused, experimental.

That lets the coach say things like:

> This looks like a partial VWAP reclaim, but volume and entry timing were weak.

That is better than forcing the trader to decide upfront whether the trade was
or was not a perfect setup. The model should support partial matches, weak
matches, false positives, and user correction.

## Unified Note Surfaces

The app currently has several note-like surfaces that are similar but not quite
the same. That fragmentation weakens the coach because context gets split
across inconsistent inputs.

The note input itself should feel like the same product everywhere. A trader
should not have to relearn a different composer on Trade Detail, Journal,
Dashboard check-ins, ticker/day review, or Coach handoff. The surrounding
context can change, but the act of capturing a note should stay consistent.

Recommended model:

- **Trade note**: what happened on this trade.
- **Ticker/day note**: what happened while trading one ticker across a day.
- **Day note**: market context, behavior, rules, emotional state, and lesson.
- **Check-in note**: what I am seeing, what I am about to do, whether I should
  keep trading, risk down, or stop.
- **Coach note**: AI synthesis, next experiment, and carry-forward cue.

These should share one note composer pattern:

- Text-first.
- Dictation-first.
- Editable transcript.
- Optional setup/pattern selector.
- Optional rule/experiment association.
- Minimal metadata shown only when it improves review.
- Same keyboard, focus, save, cancel, append, and dictation behavior across
  every surface.

Different surfaces can pass different context into the same composer, but the
capture behavior should feel like one product.

Implementation boundary:

- Build one shared React composer primitive.
- Surface-specific behavior should be enabled through explicit props or slots,
  not by forking separate note inputs.
- Examples: `showSetupPicker`, `showRuleLink`, `showExperimentLink`,
  `showTickerContext`, `showCoachHandoff`, `dictationEnabled`, `contextType`,
  or a small actions slot for surface-owned commands.
- The default behavior should remain identical. Props should expose extra
  capability only when a surface genuinely needs it.
- If a surface requires behavior that would change core typing, dictation,
  save/cancel, or transcript editing, reconsider whether it belongs in the
  shared composer instead of making a special-case input.

## Dictation as a First-Class Input

Dictation should not be a novelty button hidden inside one textarea. It should
be the fastest path into the journal.

Important behavior:

- Available anywhere a meaningful note can be written.
- Inserts editable transcript into the focused note.
- Does not store raw audio by default.
- Can append to an existing note without destroying text.
- Makes it easy to capture a note immediately after a trade, during a midday
  reset, or at end of day.
- Supports "talk through the whole session" daily recap capture.

The app should treat spoken notes as normal journal text. The coach receives the
same saved text context, not raw audio.

## Coach Implications

The coach should use notes as the user's authored context layer:

- What the user says happened.
- What the data says happened.
- Where notes and data agree.
- Where notes and data contradict each other.
- Which patterns repeat across trade notes, day notes, and check-ins.

The coach should extract process/emotion signals from prose, not rely on the
user clicking a dense pill taxonomy. Extracted signals should be transparent:

- Suggested label.
- Evidence phrase or note reference.
- Confidence.
- User correction path.

The coach should avoid pretending certainty when setup definitions are missing
or vague. It can say the trade resembled a setup, partially matched a setup, or
needs the user to define the pattern more clearly.

## UI Implications

Prefer:

- One strong note composer.
- Consistent note input behavior across all note surfaces.
- Prompts that help the trader talk naturally.
- Dictation controls that feel core, not decorative.
- Setup/pattern chips where they add teachable structure.
- AI-suggested labels after capture, with quick correction.

Avoid:

- Large banks of emotion/process pills.
- Making the user classify every note before saving.
- Treating "FOMO", "calm", "tilted", or "patient" as mandatory inputs.
- Splitting notes into unrelated composer designs across Journal, Trade Detail,
  Dashboard, and Coach.

## Implementation Notes

Near-term design direction:

- Consolidate trade, day, ticker/day, and check-in note composers.
- Treat surface-specific differences as context and prompts, not separate input
  experiences.
- Expose surface-specific additions through props/slots on the shared React
  composer.
- Keep note text as the source of truth.
- Keep setup/pattern selection as the main structured note control.
- De-emphasize or remove broad process/emotion pills from capture UI.
- Add dictation to every primary note surface.
- Let AI extract process/emotion tags after save, with user corrections.

This direction supersedes the older pill-heavy process/emotion tagging idea in
the journal design docs. Those signals still matter, but they should mostly be
captured in natural language and extracted by the coach.

## Near-Term POC Scope

This is a good small implementation slice to ship before the larger setup
playbook and AI extraction work.

Goal:

- Make all primary note inputs feel like one experience.
- Keep setup/strategy/pattern chips as lightweight placeholders.
- Remove emotion/process pills from the capture UI.
- Preserve existing saved note text and avoid schema churn.

Recommended scope:

1. **Normalize the composer**
   - Create or refine one shared note composer for trade notes, day recaps,
     ticker/day notes, and check-ins.
   - Standardize textarea styling, dictation control placement, focus behavior,
     empty state, save/cancel buttons, and placeholders.
   - Pass surface-specific context through props/slots rather than forking the
     input.

2. **Keep strategy/setup chips**
   - Add placeholder setup/pattern chips where useful.
   - They do not need to link to a full setup definition yet.
   - Treat them as a preview of the future playbook model, not the final data
     architecture.

3. **Remove emotion/process pills from capture**
   - Hide or remove the process/emotion pill groups from note forms.
   - Stop showing old process/emotion chips prominently in the note reading
     state.
   - Do not delete underlying stored data in this POC; just stop making those
     pills the main interaction.

4. **Update copy**
   - Use dictation-forward placeholders:
     "Talk through what happened, what you saw, where standards held or slipped,
     and what to remember next time."
   - Avoid prompting users to classify emotion/process manually.

5. **Verification**
   - Run the smallest relevant UI/type verification.
   - Smoke test trade note add/edit, daily recap edit, ticker/day note if
     present, and dictation textarea rendering.

What this intentionally does not include:

- A full setup playbook editor.
- AI extraction of emotion/process signals.
- Schema migration for setup definitions.
- Backfilling old process/emotion tags.
- Demo deployment automation beyond normal push/deploy flow.

This should be relatively quick because the current process/emotion pills are
already isolated in the trade note form, and the daily recap has already moved
toward one-pass dictated prose.
