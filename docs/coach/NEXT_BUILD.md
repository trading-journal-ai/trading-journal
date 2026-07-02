# AI Coach Next Build

## Pickup Handoff - 2026-07-02

Latest working checkpoint:

- Branch: `codex/starter-review-engine`
- Latest committed app work: `7cb79a3 feat: polish import flow and ticker review`
- Verification before commit: `npm run verify:types`

What is now in place:

- Broker imports route through the normalized trade contract.
- ThinkorSwim/Schwab statements can be normalized from fill-level data into
  app trades with import diagnostics.
- The import modal has a richer upload/import/success flow with date range,
  counts, warnings, and a primary action to open the journal review.
- Ticker-day review pages now support a ticker-level note below the chart.
- Individual trade notes can surface under the ticker-level review when they
  exist.
- The ticker review header has a lightweight `<- Back` link aligned to the
  chart column, plus whole-dollar chart axis labels for easier review.

Private/local data state:

- Raw broker and eval files should stay under `data/evals/` and remain ignored.
- The LABT May 1 note was captured locally as reference context under
  `data/evals/coach/notes/`.
- Do not commit real trading exports or private eval notes.

Current product decision:

The next AI coach should not be a freeform LLM over raw trades. The app should
first build a clean coaching workspace:

```text
Import -> normalized trades -> journal review -> ticker/day notes ->
deterministic fact pack -> playbook rubric -> AI coach draft
```

Near-term priorities:

1. QA import reconstruction across several high-activity days.
2. Add/fine-tune note capture where real review happens: day, ticker, and
   selected trades.
3. Define the playbook rubric fields in the user's language.
4. Shape a coach fact pack that combines deterministic analytics, import
   confidence, ticker notes, trade notes, and daily context.
5. Only then wire the LLM response into a persistent coach review.

Open questions for the next session:

- Which imported days have obvious reconstruction errors or missing executions?
- Is ticker-level review enough, or do we need a dedicated daily context form
  before coach generation?
- What are the first playbook dimensions: setup, entry quality, chasing,
  add/average-down behavior, exit quality, emotional discipline?
- Should the first coach output be daily only, or should ticker-level coaching
  come first for days like LABT/TLIH?
- Which pieces of static demo coach copy need to be recorded once AI coach v1 is
  stable?

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
