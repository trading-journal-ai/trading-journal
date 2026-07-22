# Setups

The **setups pillar** of the coach: *what* to trade. Each entry defines a pattern
the trader recognizes and considers tradeable — its structure, the conditions
that make it valid or invalid, and the mistakes that commonly ruin it.

This pillar is intentionally separate from:
- `EXECUTION.md` *(planned)* — *when/how* to pull the trigger (mechanical entry /
  exit / sizing rules). Setups say "this is an ABCD"; execution says "enter on the
  break of the pullback high with a stop under the low."
- [`PSYCHOLOGY.md`](PSYCHOLOGY.md) — *how* uncertainty, pressure, confidence,
  and discomfort affected execution.
- [`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md) — the *math*
  layer that evaluates outcomes across trades.

**How this feeds the coach.** Every trade carries a setup tag. The coach reviews
each trade against its setup's criteria (was this a *valid* instance? was the
entry/stop/exit consistent with the definition?), and the stats layer breaks down
performance **by setup** so we learn which setups carry the edge and which leak.
A losing trade in a valid setup can be good process; a winning trade outside any
setup is a flag.

## Tagging and grading model

**The trader tags; the engine verifies; detection only ever suggests.**

1. **Tag (manual, always).** The setup label on a trade records *intent* — what
   the trader believed they were taking. Intent cannot be recovered from
   candles, and the gap between intent and what the chart shows is the
   coaching signal itself: a "micro pullback" tag on an extended chase is a
   finding, not a labeling error. Tagging happens in trade-level context
   capture ([`TRADING_COACH.md`](TRADING_COACH.md) §Daily Coach Prep).
2. **Verify (deterministic).** Whole-chart pattern recognition is unreliable,
   but individual criteria are cheap to compute from candles + fills: distance
   from the 9/20 EMA or VWAP at entry, pullback depth and candle count, volume
   on up-legs vs. down-legs, higher-low / lower-high relations between swing
   points, stop distance vs. the prior candle low, extension of the entry
   candle. Each setup definition below is therefore a **checklist of
   predicates**, and the review engine grades a tagged trade by checking each
   one: `met / violated / not computable`. The LLM narrates the checklist; it
   does not eyeball the chart.
3. **Suggest (later, optional).** Once definitions are predicate checklists,
   auto-suggestion falls out for free: run every setup's preconditions against
   a trade's entry context and offer the best match for one-tap confirmation.
   Trader corrections accumulate into a labeled dataset. Chart-image pattern
   detection stays out of the grading path (see "not next" in
   [`COACH_ARCHITECTURE.md`](COACH_ARCHITECTURE.md)).

When authoring a setup, phrase every criterion you can as a measurable
predicate and mark it `[D]` (deterministic — computable from candles, fills,
and marked levels). Mark the rest `[J]` (judgment — needs notes or trader
confirmation). The more `[D]` criteria a setup has, the more of its grading is
free of LLM guesswork.

Several `[J]` marks below (overhead supply, chase vs. support buy, structural
stops) upgrade to `[D]` once a level map exists for the ticker/day — see
[`LEVELS.md`](LEVELS.md) §What levels unlock for grading.

> **Status: scaffold.** The setup bodies below are placeholders for the trader to
> author. Fill the `TODO` fields with your own definitions — keep the wording in
> your framework's vocabulary so the coach can speak it back to you. Mark each
> criterion `[D]` or `[J]` per the tagging and grading model above.

## Setup index

| Setup | Phase | Bias | Proficiency | Status |
| --- | --- | --- | --- | --- |
| [Micro Pullback](#micro-pullback) | TODO | long | TODO | draft / unauthored |
| [ABCD Pattern](#abcd-pattern) | TODO | long | TODO | draft / seeded from cheat sheet |
| [The Curl](#the-curl) | Phase 2 | long | core | draft / trader-defined |
| [Bull Flag (Bear Flag)](#bull-flag-bear-flag) | TODO | both | TODO | draft / seeded from cheat sheet |
| [Flat Top Breakout](#flat-top-breakout) | TODO | both | TODO | draft / seeded from cheat sheet |
| [Moving Average Pullback](#moving-average-pullback) | TODO | long | TODO | draft / seeded from cheat sheet |
| [Top & Bottom Reversal](#top--bottom-reversal) | TODO | both | TODO | draft / seeded from cheat sheet |

*(Add rows as setups are added.)*

**Proficiency** records where each setup sits in the trader's development:
`core` (proven — trade at normal size) or `developing` (still learning it).
The coach uses this field: developing setups get closer coaching and smaller
size expectations, and the stats layer reports them separately so learning
trades don't pollute the read on the core edge.

---

## Per-setup template

Copy this block for each new setup. Fields mirror the "Approved Setups" list in
[`TRADING_COACH.md`](TRADING_COACH.md) so the coach reads every setup the same
way.

```markdown
## <Setup Name>

- **What it looks like:** <one- or two-line description of the pattern>
- **Required chart structure:** <trend / base / level / role-flip context that must be present>
- **Required volume behavior:** <what volume must do into and during the setup>
- **Entry trigger:** <the precise event that makes it actionable>  ← detailed rules live in EXECUTION.md
- **Stop / risk definition:** <where 1R is and what invalidates the trade structurally>
- **Exit logic:** <how the trade is managed and exited when right>
- **Invalid conditions:** <what disqualifies the setup before or after entry>
- **Common mistakes:** <the recurring ways this setup is traded badly>
- **Examples:** <links to trades / screenshots once available>
- **Phase / scene:** <e.g. Phase 1 first move vs Phase 2 post-first-move>
- **Proficiency:** <core | developing>
- **Notes:** <anything else worth capturing>
```

---

## Micro Pullback

- **What it looks like:** TODO — brief continuation pullback within a strong move.
- **Required chart structure:** TODO
- **Required volume behavior:** TODO
- **Entry trigger:** TODO *(mechanical rule → `EXECUTION.md`)*
- **Stop / risk definition:** TODO — where is 1R, what structurally invalidates it?
- **Exit logic:** TODO
- **Invalid conditions:** TODO
- **Common mistakes:** TODO — e.g. chasing extended, entering into supply, no defined risk.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** TODO

## ABCD Pattern

> Draft seeded from the group cheat sheet ("ABCD (1234) Pattern") as the worked
> example of predicate-style authoring — edit the wording and thresholds into
> your own vocabulary.

- **What it looks like:** A leg up from A to a high at B, a pullback that holds
  at C, then a continuation entry as price breaks back over B toward D.
- **Required chart structure:** `[D]` C (2nd low) stays above A (prior low);
  `[D]` B (2nd high) does not break the prior high before entry; `[D]` pattern
  forms above the 9EMA (cheat-sheet "ideally" — decide if it's required).
- **Required volume behavior:** `[D]` volume contracts on the B→C pullback and
  expands on the break of B. TODO — your minimum expansion ratio.
- **Entry trigger:** `[D]` break of point B *(mechanical rule → `EXECUTION.md`)*.
- **Stop / risk definition:** `[D]` low of the previous candle (cheat-sheet
  default) or `[D]` below C — TODO pick one; below C is the structural
  invalidation.
- **Exit logic:** TODO — measured-move target at D? trail the 9EMA?
- **Invalid conditions:** `[D]` C undercuts A; `[D]` entry fills more than
  TODO% above B (chase); `[J]` no fresh volume interest at the break.
- **Common mistakes:** anticipating the break by buying at C without
  confirmation; chasing D after the move is extended; stop placed inside
  pullback noise.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** the cheat sheet also calls this the "1234" pattern.

## The Curl

> A core pattern in the trader's Find Your Levels framework. The trade-review
> tag is simply `Curl`; the structure below is implied by that pattern
> selection and should not be re-entered as confirmation tags on every trade.

- **What it looks like:** Price reclaims a meaningful level, holds the reclaim,
  then begins curling higher candle over candle as participation returns.
- **Required chart structure:** A reclaim and hold at a meaningful level,
  followed by candle-over-candle upward progression. TODO — define how much
  overlap or pullback is acceptable before the curl is invalid.
- **Required volume behavior:** Volume increases / comes in as the curl begins
  progressing. TODO — decide whether this remains a visual judgment or gets a
  deterministic expansion threshold.
- **Entry trigger:** TODO *(mechanical rule → `EXECUTION.md`)*
- **Stop / risk definition:** TODO
- **Exit logic:** TODO
- **Invalid conditions:** TODO
- **Common mistakes:** TODO
- **Examples:** TODO
- **Phase / scene:** Phase 2 — after the initial move has produced a meaningful
  level to reclaim and hold.
- **Proficiency:** core
- **Notes:** One of the trader's top three patterns. Tagging records intent; the
  engine may later verify the reclaim, candle-over-candle progression, and
  volume behavior from data.

## Bull Flag (Bear Flag)

> Draft seeded from the group cheat sheet — edit wording and thresholds into
> your own vocabulary. Bear flag is the mirrored short.

- **What it looks like:** a strong vertical leg (the pole), then an orderly
  drift lower on fading volume (the flag), resolved when a candle breaks back
  over the flag's high.
- **Required chart structure:** `[D]` a qualifying pole — TODO% move or N
  consecutive directional candles; `[D]` this is the 1st or 2nd pullback of
  the move (caution on the 3rd — later flags fail more often); `[D]` the flag
  holds at or above the 9EMA ("watch the tap off the 9EMA").
- **Required volume behavior:** `[D]` high volume on the pole, low volume in
  the flag. TODO — contraction ratio.
- **Entry trigger:** `[D]` first candle to make a new high out of the flag
  *(mechanical rule → `EXECUTION.md`)*.
- **Stop / risk definition:** `[D]` low of the previous candle.
- **Exit logic:** TODO
- **Invalid conditions:** `[D]` 3rd+ pullback of the same move; `[D]` flag
  retraces more than TODO% of the pole; `[D]` volume fails to contract in the
  flag; `[J]` breakout into overhead supply.
- **Common mistakes:** buying inside the flag before the trigger; chasing an
  extended breakout candle; calling a deep retrace a flag.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** TODO

## Flat Top Breakout

> Draft seeded from the group cheat sheet ("Flat Top (Bottom) Breakout") —
> flat-bottom breakdown is the mirrored short.

- **What it looks like:** repeated pushes into the same resistance price with
  rising or holding lows, then entry as the first candle breaks the flat top.
- **Required chart structure:** `[D]` ≥ TODO touches of the same level within
  a TODO tolerance; `[D]` a long consolidation (minimum TODO candles) is
  better; `[J]` a cup-and-handle shape strengthens the setup; `[J]` a 'U' or
  double-top shape into the level is bearish — disqualifier for the long.
- **Required volume behavior:** `[D]` volume expands on the breakout candle.
  TODO — expansion ratio.
- **Entry trigger:** `[D]` first candle to break the flat top *(mechanical
  rule → `EXECUTION.md`)*.
- **Stop / risk definition:** `[D]` low of the last 5-minute candle.
- **Exit logic:** TODO
- **Invalid conditions:** `[D]` price closes back below the level right after
  the break (false breakout); `[D]` lows falling into the level instead of
  rising.
- **Common mistakes:** buying in anticipation of the break without the
  trigger; chasing the extended breakout candle; ignoring the U / double-top
  warning shape.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** TODO

## Moving Average Pullback

> Draft seeded from the group cheat sheet. Possibly the same family as
> [Micro Pullback](#micro-pullback) — decide whether these merge or how they
> differ before authoring both.

- **What it looks like:** a trending move pulls back to a rising 9EMA, 20EMA,
  or VWAP and bounces off it — the "perfect 5-min pullback" tags the 9EMA.
- **Required chart structure:** `[D]` established trend (9EMA above 20EMA,
  price above VWAP — TODO your definition); `[D]` pullback reaches within TODO
  of the chosen MA; `[D]` the MA is still rising, not flattening.
- **Required volume behavior:** `[D]` volume fades on the pullback; `[D]`
  volume comes in on the bounce — this substitutes for an obvious price
  trigger.
- **Entry trigger:** `[J]` the cheat sheet has no mechanical entry ("no
  obvious entry, look for volume coming in") — TODO define one, e.g. break of
  the prior candle's high at the MA *(→ `EXECUTION.md`)*.
- **Stop / risk definition:** `[J]` "tight mental stop" — TODO replace with a
  structural rule (below the MA, or below the bounce candle low) so the coach
  can grade it.
- **Exit logic:** TODO
- **Invalid conditions:** `[D]` candle closes below the 20EMA/VWAP; `[D]` the
  MA flattens or rolls over; `[D]` pullback comes on expanding volume.
- **Common mistakes:** buying the MA touch without confirmation; letting a
  "mental" stop stretch; mistaking a trend break for a pullback.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** can take on bull/bear flag characteristics per the cheat sheet.

## Top & Bottom Reversal

> Draft seeded from the group cheat sheet ("Top & Bottom Reversals"). Written
> as the bottom-reversal long; the top reversal is the mirrored short.
> Counter-trend — the cheat sheet's own warning is "be careful of false
> reversals!"

- **What it looks like:** an extended sell-off ends with an exhaustion candle
  (doji or bottoming tail), then the first candle to make a new high signals
  the turn.
- **Required chart structure:** `[D]` 3–5+ good-sized directional candles into
  the low; `[D]` a doji or bottoming-tail candle at the extreme.
- **Required volume behavior:** TODO — e.g. climax volume on the flush,
  sustained volume on the turn.
- **Entry trigger:** `[D]` first candle to make a new high after the
  exhaustion candle *(mechanical rule → `EXECUTION.md`)*.
- **Stop / risk definition:** `[D]` low of the previous candle.
- **Exit logic:** TODO — reversals often fade into prior supply; first target?
- **Invalid conditions:** `[D]` no exhaustion candle at the extreme; `[D]`
  fewer than 3 sizable candles into it; `[D]` the entry candle fails and
  undercuts the reversal low.
- **Common mistakes:** knife-catching before the exhaustion candle prints;
  oversizing a counter-trend trade; re-entering repeatedly after false
  reversals.
- **Examples:** TODO
- **Phase / scene:** TODO
- **Proficiency:** TODO
- **Notes:** TODO

---

## Relationship to other docs

- [`TAG_TAXONOMY.md`](TAG_TAXONOMY.md) — defines the typed `pattern` tag and the
  execution, risk, emotion, management, selection, and context vocabularies.
- [`LEVELS.md`](LEVELS.md) — *where* the setup happens; upgrades location
  `[J]` predicates to `[D]`.
- `EXECUTION.md` *(planned)* — the mechanical entry/exit/sizing rules for these setups.
- [`PSYCHOLOGY.md`](PSYCHOLOGY.md) — reviews the emotional and behavioral side
  of whether the trader followed the setup and plan.
- [`STATISTICAL_REVIEW.md`](../analytics/STATISTICAL_REVIEW.md) — evaluates
  performance **by setup** across trades.
- [`TRADING_COACH.md`](TRADING_COACH.md) — the overall coach; its "Approved
  Setups" section defines these fields and the playbook intent.
