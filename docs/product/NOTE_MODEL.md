# Note Model: Purpose, Data, and the Ladder

> Working draft to settle what each note is for before designing more UI.
> Companion to [NOTES_DICTATION_COACH_MODEL.md](NOTES_DICTATION_COACH_MODEL.md)
> and [REVIEW_ENGINE_SPEC.md](../analytics/REVIEW_ENGINE_SPEC.md).

## The One-Sentence Model

Traders speak prose; the app keeps structure only where it compounds: setups,
rules, and experiments. The coach turns prose plus trade data into the Daily
Recap, which is the one surface everything else exists to feed.

## The Ladder

```text
trade notes ----+
                +--> inform --> DAY NOTE (trader's voice)
ticker/day -----+                          |
notes                                      v
trade data ----> deterministic ---------> DAILY RECAP = coach read + day note,
rules/setups     fact pack                one artifact under day P&L
                                             |
                                             v
                                     carry-forward cue -> tomorrow
```

## Each Note, Defined

### Trade Note

- **Purpose:** why I clicked, what I saw, and execution quality on one trade.
- **Captured:** dictated prose plus one structured verdict: setup tag from the
  user's defined setups, and quality call: valid, partial, or forced. Nothing
  else. No emotion pills; emotions come out in the prose.
- **Why the tag is manual:** we do not yet trust AI to read a setup from chart
  and trade data. The manual tag is ground truth. AI may suggest, for example,
  "looks like partial VWAP reclaim, 60%," but the human confirms. Every
  confirm or correction sharpens the playbook definition over time.
- **Feeds:** by-setup segmentation in the fact pack, evidence quotes in the
  recap, and pattern memory such as "third chase note this month."

### Ticker/Day Note

- **Purpose:** the pattern across multiple trades in one ticker in one session,
  such as "how did I trade CRVO?"
- **Rule:** only exists when there is more than one trade on the ticker. If a
  ticker had a single trade, the trade note is the ticker story. Never ask the
  trader to say it twice.
- **Captured:** prose, with optional setup chips when the pattern was thematic.
- **Feeds:** day-note draft and the coach's mechanism read, such as ticker
  concentration.

### Day Note

- **Purpose:** market context, behavior, rules held or slipped, and the lesson,
  in the trader's own voice, one pass.
- **Captured:** prose only. The composer offers **Draft from my notes**:
  pre-fill the transcript from today's trade and ticker notes so nothing said
  earlier is lost or repeated.
- **Feeds:** the "you said" half of the recap. The coach quotes it back
  verbatim as evidence.

### Coach Note Merges Into the Daily Recap

Proposed decision: there is no separate coach note. The Daily Recap is one
artifact with two voices:

1. **Trader's read:** the day note, on top. Editable and dictated.
2. **Coach's read:** the deterministic layer below: distribution label,
   mechanism, matched evidence quoting the trader's notes, extracted
   emotion/process signals with confidence and tap-to-correct, and one thing to
   try.

The trader adds color by editing their half or correcting the coach's extracted
labels, not by writing in a third place.

### Check-In Note

Out of scope for this slice. It should use the same composer later.

### Coach Session

Future direction: a coach chat can become its own day-linked artifact. It is
related to the trading day, but it should not automatically merge into the
Daily Recap.

Purpose:

- Process a bad day, spiral, reset, or stop-trading moment.
- Talk through trades or emotions without forcing the conversation into the
  structured review format.
- Preserve useful coach guidance as part of the personal/trading journal record.

Demo decision:

- Start with a standalone **AI Coach** preview tab or route.
- Do not persist coach sessions in v0.
- If the surface proves useful, save sessions by trading date with a distinct
  type, then let Journal filter or view them separately from trade notes and
  daily recaps.

Open product question:

- Does the journal eventually show coach sessions as a separate day section,
  a filterable note type, or a private personal-journal layer?

## Solving "Notes Get Buried"

A note is never a dead end. Every saved note has three exits:

1. **Quoted:** the recap cites it verbatim, linked back to the trade.
2. **Counted:** extracted signals accumulate into pattern memory the coach can
   cite across days, such as "chase notes cluster on green days."
3. **Resurfaced:** the carry-forward cue appears again at the next session's
   first capture, closing the loop.

The recap is the surfacing mechanism. Trade and ticker notes do not need their
own prominence; they need to be reachable from the recap in one click.

## What Stays Structured vs. Prose

| Structured, because it compounds | Prose, because the coach extracts it |
| -------------------------------- | ------------------------------------ |
| Setup tag and quality verdict | Emotions: FOMO, tilt, calm |
| Rules and guardrails | Process observations |
| Experiments with schema | Why I clicked |
| Playbook definitions | What felt unclear |

## Fit With the Review Engine

Notes enter at exactly one point: the evidence-gated narrative step, which is
the only LLM step. The LLM may quote notes and align or contrast them with
pre-computed facts. It never derives numbers from them.

Extracted emotion/process signals are suggestions with provenance: evidence
phrase, note link, confidence, and a correction path.

## Open Questions

1. Setup quality verdict: is valid/partial/forced the right scale, or should it
   be good setup/bad setup/not a setup?
2. When the trader edits the day note after the recap generates, does the
   coach's read regenerate, or annotate the diff?
3. Does the ticker/day note collapse into a "trade group" note when trade
   grouping improves, or stay a first-class surface?
4. How much of the recap is visible before any notes exist? Coach read from data
   alone should still work. Notes upgrade it, never gate it.
