# Psychology

The **psychology pillar** of the coach: *how* the trader handled uncertainty,
loss, pressure, confidence, discomfort, and risk while executing the plan.

This pillar is intentionally separate from:

- [`SETUPS.md`](SETUPS.md) - *what* to trade.
- `EXECUTION.md` *(planned)* - *when/how* to enter, exit, size, and manage risk.
- [`../analytics/STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md) -
  the math layer that evaluates outcomes across trades.

Psychology does not replace setup or execution review. It explains the human
side of why a trade or session followed the plan, drifted from the plan, or
became harder to manage than the chart alone suggests.

## Scope

The coach should support trading psychology as post-trade reflection and
process coaching. It should not act as a therapist, diagnose mental health, give
medical advice, or provide live trading instructions.

The central question is:

> Did my emotional state and decision process support the trade I said I wanted
> to take?

Good psychology coaching is practical. It connects feelings and impulses to
observable trading behavior: entries, exits, size, re-entries, stop movement,
trade frequency, hesitation, and journal notes.

## Core Principles

- Process over outcome. A disciplined red trade can be good work. A green trade
  taken from fear, chase, revenge, or oversized confidence can still be poor
  process.
- Emotion is signal, not shame. FOMO, fear, frustration, hesitation, and
  confidence are review inputs, not character judgments.
- Evidence first. The coach should cite notes, trade sequence, size changes,
  exits, re-entries, and rule breaks before naming a psychology pattern.
- Losses are part of the system. The review question is whether the loss was
  planned, contained, and accepted.
- Confidence must be earned by evidence. Sizing up should come from repeated
  process quality, not from one good result or the urge to get paid.
- Calm is operational. The goal is not to feel nothing; the goal is to keep
  decisions tied to structure while emotion is present.

## Guardrails

The coach should:

- Review completed trades only.
- Frame psychology as trading process, not therapy.
- Avoid diagnosing, pathologizing, or labeling the trader.
- Avoid motivational filler or generic reassurance.
- Avoid shaming language after losses or rule breaks.
- Say when emotional context is missing or inferred weakly.
- Separate observed behavior from possible emotional cause.
- Ask review questions when evidence is thin instead of pretending certainty.

The coach should not:

- Tell the trader what to buy, sell, short, hold, or size in real time.
- Claim to know the trader's emotional state from P&L alone.
- Treat a red day as proof of poor mindset.
- Treat a green day as proof of discipline.
- Push the trader to hold longer when the setup was actually invalidated.
- Encourage bigger size without evidence of process readiness.
- Give mental health, medical, or therapeutic advice.

## Evidence Sources

The psychology layer should use multiple inputs and label its confidence.

Signals also split by **provenance**:

- **Deterministic signals** are computable from the fact pack — re-entry
  latency after a red trade, same-ticker churn, size escalation after losses,
  trade-count acceleration, hold-time asymmetry between winners and losers,
  exits before planned invalidation while structure stayed intact. These are
  detected in code and raise a *candidate* pattern.
- **Narrative signals** come only from trader-authored notes, dictation, and
  the daily context form — FOMO language, frustration, "wanted to lock it
  in." These confirm or deny the candidate.

The coach names a psychology pattern only when at least one narrative signal
supports the deterministic read; otherwise it labels the pattern an
unconfirmed candidate and asks a review question. Numbers alone never
establish an emotion. Baselines for "size increase" or "frequency
acceleration" are `{calibrate}` values tuned to the trader's own history,
like every other threshold
([`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md)).

Strong evidence:

- Trader-authored notes or dictated recap.
- The emotional-state field from the daily context form (trader-authored:
  calm, rushed, tilted, hesitant, FOMO, revenge, confident).
- Explicit labels such as revenge trade, FOMO, hesitation, overtraded, or best
  setup.
- Moving or ignoring a planned stop.
- Adding to a loser or averaging down outside the plan.
- Re-entering quickly after a loss without a fresh setup.
- Size increasing after frustration, a big win, or a desire to make money back.
- Exiting before planned invalidation while structure remained valid.
- Continuing to trade after a stated stop, max loss, or reset cue.

Medium evidence:

- Standing self-assessment claims ("FOMO hits me on re-entries") — hypotheses
  that prioritize review, never confirmation by themselves
  ([`TRADING_COACH.md`](TRADING_COACH.md) §Trader Self-Assessment).
- Rapid trade frequency after a loss.
- Larger size on lower-quality or undefined setups.
- Winners cut quickly while losers were given more room.
- Multiple entries in the same ticker without new structure.
- Notes and data contradicting each other.
- Session P&L dominated by one emotional or oversized decision.

Weak evidence:

- P&L alone.
- Win rate alone.
- A single early exit without chart or note context.
- One missed trade or one loss without a repeated pattern.
- Generic market volatility without a trader-authored reaction.

## Common Psychology Patterns

The patterns below are **templates**. The trader's self-assessment supplies
the personal forms each one takes ("re-entry FOMO after a stop" vs. "watching
a runner without me"), and the coach should name the trader's form, not the
generic label. Personal definitions of patience and discipline evolve; the
current assessment version holds the operative meaning.

### FOMO And Chasing

The trader enters because the move is happening without them, not because the
setup has reached a defined entry.

Signals:

- Entry into an extended candle or open space.
- No nearby structural invalidation.
- Notes mention missing the move, being late, or needing to participate.
- Size is normal or larger despite weaker setup quality.

Coach response:

- Name whether the trade had structure behind it.
- Separate a valid first-pullback entry from buying the rip.
- Ask what the trader needed to see before the click.
- Convert the lesson into a waiting rule.

### Revenge And Repair Trading

The trader tries to repair the emotional discomfort of a loss rather than wait
for a fresh setup.

Signals:

- Fast re-entry after a loss.
- Same ticker churn after being stopped.
- Size increase after red P&L.
- Notes mention getting it back, frustration, or refusing to let the trade be
  wrong.

Coach response:

- Identify whether the next trade had a new setup or only a new need.
- Reinforce that one controlled loss is acceptable.
- Suggest a reset cue before the next entry.

### Hesitation And Fear Of Loss

The trader sees the setup but delays, sizes too small without a reason, or exits
before the trade has invalidated.

Signals:

- Notes mention fear, doubt, freezing, or not trusting the move.
- Entry comes late after the clean trigger.
- Early exit while trend, volume, and structure remain intact.
- Planned stop was defined but not emotionally accepted.

Coach response:

- Do not simply tell the trader to be braver.
- Review whether the setup was valid and risk was acceptable before entry.
- Ask whether the discomfort came from real invalidation or normal volatility.
- Tie confidence to pre-accepted risk, not hope.

### Gun-Shy After Drawdown

The multi-day version of hesitation: after a losing streak or drawdown, the
trader undersizes or skips valid setups for days, so recovery lags the edge.

Signals:

- Size drops on valid setups after red days without a stated reason.
- Skipped playbook setups appear in notes or missed-trade reviews.
- Notes mention protecting the account, not trusting anything, or fear of
  another loss.

Coach response:

- Distinguish deliberate risk reduction (a plan) from fear-driven shrinkage
  (a drift).
- Review whether setup quality actually dropped or only confidence did.
- Support evidence-based re-scaling: size returns as process quality repeats,
  per the sizing-readiness review.

### Relief Taking

The trader exits for emotional relief rather than because the trade reached the
planned target, showed invalidation, or hit a management rule.

Signals:

- Profit is taken quickly after a stressful entry.
- Notes mention wanting to lock something in, being nervous, or needing the
  trade to work.
- The trade continues according to the original structure after exit.
- Partial profit was not part of the plan.

Coach response:

- Distinguish planned partials from relief exits.
- Ask what would have invalidated the remaining position.
- Reinforce that a good entry should create emotional time.

*Dependency: judging planned versus unplanned partials requires the partial
and exit rules in `EXECUTION.md`. Until that pillar is authored, label this
read low-confidence.*

### Cutting Winners, Holding Losers

The trader takes profits quickly but gives losing trades extra room, hoping
they come back — the classic disposition pattern, and the most measurable
psychology leak.

Signals:

- Hold-time and R asymmetry: winners exited faster than losers across the
  session or week (deterministic).
- Losers held past planned invalidation while winners were cut before targets.
- Notes mention hoping, waiting for it to come back, or not wanting to take
  the stop.
- Average loss creeping up relative to average win despite stable size.

Coach response:

- Show the asymmetry from the fact pack; this pattern is measurable before it
  is felt.
- Review whether losers were held on structure or on hope.
- Reconnect the planned stop to pre-accepted risk.
- Frame as an exit-rule adherence review, not a character flaw.

### Overconfidence

The trader relaxes standards after a win, good day, or hot streak.

Signals:

- Later trades are lower quality than the first winner.
- Size increases without clearer setup quality.
- More marginal trades appear after the day is already green.
- Notes mention feeling locked in, invincible, or wanting to press without a
  defined reason.

Coach response:

- Treat confidence as useful only when it improves selectivity.
- Ask whether size followed setup quality or mood.
- Reinforce protecting a good day as a process win.

### Tilt And Overtrading

The trader keeps trading after standards have dropped.

Signals:

- Trade count accelerates after emotional triggers.
- Same ticker produces repeated small losses or chopped entries.
- Notes mention frustration, rushing, forcing, or losing patience.
- The deterministic read shows activity without proportional edge.

Coach response:

- Name the point where review suggests standards changed.
- Suggest a stop, pause, or written fresh-setup requirement.
- Keep the recommended experiment small and measurable.

### Boredom And No-Setup Trading

The trader takes trades to stay busy — mid-day chop entries with no playbook
setup — without an emotional trigger like a loss or a missed move.

Signals:

- Entries with no setup tag during low-quality windows.
- Notes mention slow tape, nothing moving, or wanting to be involved.
- Small repeated losses in windows the time-of-day review flags as weak.

Coach response:

- Name the absence of a setup rather than an emotion.
- Tie the review to the time-of-day and E[R]/trade data.
- Suggest a written no-trade condition instead of willpower.

### Trusting A Valid Move

The trader exits a valid setup because volatility feels uncomfortable, not
because the trade failed.

Signals:

- Entry was near defined risk.
- Structure, volume, and trend remained supportive.
- Exit came before planned invalidation.
- Notes mention anxiety, wanting relief, or not trusting the move.

Coach response:

- Ask whether the trade was managed around structure or discomfort.
- Review what invalidation actually was.
- Avoid turning this into blanket advice to hold longer.
- Reinforce the link between clean entries, accepted risk, and calmer
  management.

## Review Rubric

The psychology rubric should be qualitative, not a fake-precise score.

Suggested ratings:

- `strong` - emotion was present but decisions stayed tied to plan, structure,
  and risk.
- `mixed` - some decisions followed the plan, but emotion likely affected one
  or more entries, exits, size choices, or re-entries.
- `weak` - emotional pressure clearly drove behavior away from the playbook.
- `unknown` - not enough note, chart, or sequence evidence to judge.

Suggested dimensions:

- Patience before entry.
- Loss acceptance.
- Reset behavior after mistakes.
- Size discipline under pressure.
- Ability to stop when standards drop.
- Trust in valid structure after entry.
- Willingness to take planned risk without moving the goalposts.
- Confidence that improves selectivity instead of loosening standards.

## Coach Output

The psychology layer should produce short, specific coaching language that can
fit inside a daily review.

Useful sections:

- **Behavior pattern:** the main emotional/process pattern that affected the
  session.
- **Evidence:** the trades, notes, sizing, sequence, or exits that support the
  read.
- **What to repeat:** the best example of calm, plan-aligned behavior.
- **What to interrupt:** the one behavior that needs a reset cue.
- **Next-session cue:** a small phrase or checklist item to carry forward.
  Each review produces exactly **one** persisted experiment, shared with the
  statistical layer ([`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md)
  §8–9). When the day's main finding is behavioral, this cue *is* that
  experiment — it is saved and followed up like any other, so psychology
  advice compounds instead of recurring forever.
- **Confidence:** what the coach knows, what it is inferring, and what context
  is missing.

Example language:

> The issue was not that you lost on LABT. The issue was that the next entry
> came before a fresh setup was written. That makes the second trade a psychology
> review: was it a new opportunity, or was it an attempt to erase the first
> stop?

> This looks like a relief exit, not a planned partial. The trade had not
> invalidated yet, and your note says you wanted to "make sure the day stayed
> green." That is useful context: the exit protected emotion more than structure.

> Good loss. You entered near defined risk, accepted the stop, and did not
> immediately re-enter. That is the exact kind of red trade the system can
> absorb.

## Data Model Implications

Psychology should mostly come from prose and behavior, not mandatory emotion
forms.

Near-term:

- Keep notes and dictation as the primary psychology input.
- Let the coach extract possible process/emotion labels after save.
- Show extracted labels with evidence and confidence.
- Let the trader correct labels so the coach learns their vocabulary.
- Seed each pattern's personal forms from the trader self-assessment, and
  track how definitions (patience, discipline) evolve across assessment
  versions.
- Keep setup/pattern selection structured, because setups compound into
  measurable playbook concepts.

Avoid:

- Large emotion-pill banks as the main note capture UI.
- Requiring the trader to classify every feeling before saving a note.
- Treating old process/emotion tags as more authoritative than the user's
  written context.

## Evaluation Examples

The eval set should include psychology-specific cases before the AI coach is
trusted.

- Good loss with accepted risk and no revenge entry.
- Bad winner from a chase or oversized confidence.
- Red day kept small after a reset cue.
- Green day with poor process hidden by one outlier.
- Revenge re-entry after a clean stop.
- Early exit from a valid move because of discomfort.
- Planned partial versus relief partial.
- Size increase on weaker setup after frustration.
- Size increase on stronger setup with clear evidence.
- Overtrading in one ticker after the first loss.
- Hesitation that turns a clean setup into a late entry.
- Trader note contradicts trade sequence.
- Winners cut fast while losers get extra room across a week.
- Undersized valid setups in the days after a drawdown.
- No-setup boredom trades in a weak time-of-day window.

Each eval should include expected psychology read, evidence, confidence, and the
one next-session cue.

## Relationship To The Coach

The full coach should synthesize four lenses:

- **Setups:** was this the right thing to trade?
- **Execution:** was the trade entered, sized, managed, and exited according to
  plan?
- **Statistics:** what did the results and distributions show?
- **Psychology:** did emotional pressure help, distort, or override the plan?

The psychology lens should not dominate every review. On clean days, it may only
reinforce patience and loss acceptance. On messy days, it may become the main
finding because the chart problem was really a behavior problem.
