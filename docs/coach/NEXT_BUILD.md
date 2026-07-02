# AI Coach Next Build

## Status

Captured after implementing the starter deterministic review engine on
`codex/starter-review-engine`.

The current branch includes:

- A deterministic starter review engine.
- Journal embed for the starter coach read.
- Prior-30-day baseline trend vote.
- Saved coach experiments for day/week/month recap scopes.

This is enough to explain **what happened** and promote one experiment. It is
not yet the full AI coach.

## Product Stance

The coach needs two layers:

1. **Deterministic layer** — the film-room stats board.
   - What happened?
   - Was the day broad-based or outlier-carried?
   - Which ticker, time window, or price band mattered?
   - What contradiction might the trader miss?
   - What one experiment should carry forward?

2. **Human/context layer** — the coaching conversation.
   - What was the trader trying to do?
   - What did the trader believe in the moment?
   - Where did behavior match or drift from standards?
   - What should be reinforced, repaired, or carried into tomorrow?

The LLM should narrate from both layers. It should not calculate statistics.

## Intended Flow

```text
Import trades
  -> App builds deterministic day read
  -> Trader reviews key trades, not every trade
  -> Trader fills daily context
  -> Coach generates daily review
  -> One experiment/cue saves back to dashboard
```

Do not make per-trade notes mandatory for every trade. That becomes homework.
The app should surface the trades that deserve human context:

- Best trade.
- Worst trade.
- Biggest surprise.
- Largest ticker concentration.
- Repeated loss or same-ticker re-entry.
- Any trade manually marked "needs coach review."

The trader can annotate the important trades and write a daily recap.

## Daily Coach Prep

Before the coach review, capture a compact daily context form:

- What were you trying to trade today?
- What did the market feel like?
- What did you do well?
- Where did you lower standards?
- Any trade you want the coach to inspect closely?
- Emotional state: calm, rushed, tilted, hesitant, FOMO, revenge, confident.
- Did today match your playbook? `yes / mixed / no / unsure`.

This context should attach to the daily recap. It should not replace the user’s
recap prose.

## Trade-Level Context

For selected trades only, capture:

- Intended setup.
- Why did you enter?
- Where was invalidation?
- Did you follow the plan?
- What happened emotionally?
- Needs coach review toggle.

This gives the AI enough human context to evaluate process without asking for a
full write-up on every trade.

## Playbook Rubric Draft

The first rubric should be qualitative, not a fake-precise numeric score.

Recommended dimensions:

- Setup quality.
- Entry quality.
- Risk definition.
- Size discipline.
- Exit management.
- Emotional discipline.
- Journal completeness.

Suggested ratings:

- `strong`
- `mixed`
- `weak`
- `unknown`

Avoid a single 0-100 score until the app has enough eval data to earn that
precision.

## Coach Output Contract

The first generated coach review should be structured:

- Day verdict.
- What matched the playbook.
- What drifted from the playbook.
- Key trade to study.
- Behavior pattern.
- Statistical read, sourced from the deterministic fact pack.
- One experiment to carry forward.
- Confidence and missing-context caveats.

The coach may say context is thin. That is better than inventing intent.

## Eval Set

Before trusting the AI coach, create 10-20 known examples:

- Good loss.
- Bad winner.
- Revenge trade.
- Clean A setup.
- Overtrading/churn day.
- Sizing mistake.
- Early exit from valid trend.
- Trade outside playbook.
- Outlier-carried green day.
- High-win-rate red day.

Each eval example should include the expected coach judgment in the trader’s
own vocabulary.

## Next Build Recommendation

Build **Daily Coach Prep** before wiring the LLM:

1. After import, offer a primary action to open the daily recap.
2. Show the deterministic starter coach read inside the recap.
3. Highlight the key trades that deserve annotation.
4. Add daily human context fields.
5. Add selected-trade context fields.
6. Add a placeholder coach review schema and persistence.
7. Keep the AI call disabled until the playbook/rubric and eval set exist.

This gets the product from analytics into coaching without crossing the
determinism boundary too early.

## Not Next

Do not prioritize:

- A single coach score.
- A freeform LLM review from raw trades alone.
- Mandatory notes on every trade.
- Chart-image analysis before candle/level facts are reliable.
- Live coaching or trade advice.
