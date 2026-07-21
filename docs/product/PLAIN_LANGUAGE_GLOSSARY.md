# Plain-Language Glossary

> Status: v1 · 2026-07-21 · companion to the content contract
>
> Purpose: every technical/engine term gets one canonical **plain label** and a
> one-line **trader-language explanation**. The UI shows the plain label by
> default; the technical term lives in tooltips and the inspectable data view,
> not the other way around. The coach LLM should use the plain labels too, so
> the trader hears one vocabulary everywhere.

## Ground rules for plain language

1. **Plain label first, technical term underneath.** A stat tile says "Would
   the day still be green without your best trade?" — the tooltip may say
   "trim/robustness classifier."
2. **Explain what it tells you, not how it's computed.** Computation belongs in
   the inspector and the analytics docs.
3. **Write like a trading buddy, not a quant.** Target: a trader who has never
   read a stats book but knows what chasing feels like.
4. **Numbers stay exact.** Plain language never rounds, softens, or re-derives
   a number (numeric-integrity rule, STATISTICAL_REVIEW §10).
5. **One term, one meaning.** If two docs use different words for the same
   thing, this glossary picks the winner.

---

## 1. Day basics

| We capture (technical) | Plain label | In plain terms |
| --- | --- | --- |
| Net P&L | P&L | What you made or lost after the day was done. |
| Trade (derived round-trip) | Trade | One full in-and-out position in a symbol. |
| Fills / executions | Orders & fills | How many separate orders (and broker fills) it took to build and exit your trades. Lots of fills per trade = lots of in-and-out. |
| Win rate / accuracy | Win % | Share of trades that made money. On a single day this is a small sample — don't read much into it alone. |
| Breakeven win rate | Break-even line | The win % you'd need — given how big your winners and losers are — to come out flat. Above the line, your day's math worked. |
| Profit factor | Profit factor (PF) | Dollars won ÷ dollars lost. Above 1.0 = winners outweighed losers. Noisy on a single day; trust it over weeks. |
| Expectancy (E[R]) | Average trade | What a typical trade earned or lost. The single best "is this working" number. |

## 2. Risk & R

| We capture (technical) | Plain label | In plain terms |
| --- | --- | --- |
| R / R-multiple | R (risk unit) | Your planned risk on a trade = 1R. A +2R trade made twice what you agreed to risk. Keeps big and small trades comparable. |
| Planned risk / stop | Planned risk | The amount you decided you could lose before you entered. Without it, we fall back to dollars. |
| `riskModel: dollar-fallback` | Measured in dollars | Not enough trades had a recorded stop, so results are shown in $ instead of R. |
| R coverage | Trades with a plan | How many of the day's trades had a recorded stop/planned risk. Higher coverage = smarter coach. |
| Max adverse add percent | Deepest add into a loser | How far offside you were (in %) at your worst add to a losing position. |

## 3. Session read (verdict & process)

| We capture (technical) | Plain label | In plain terms |
| --- | --- | --- |
| Session verdict / top surprise | What the numbers hide | The one thing about today that isn't what it looks like from the P&L alone. |
| Surprise / contradiction | Hidden story | A place where the result and the process disagree — e.g. a green day carried by one lucky trade. |
| `aligned` findings | What worked | Things the data says went right today. |
| `unresolved` findings | Open questions | Things the data flags but can't explain until you add your side of the story. |
| Trim / robustness classifier | Would it hold up? | If we set aside your biggest winner (or loser), is the day still the same color? Tells you if the result was broad or carried by one trade. |
| Outcome distribution (broad / top-heavy / tail-driven) | How the day was built | Whether P&L came from many trades, mostly one big one, or was dragged by one big loss. |
| Baseline / rolling personal baseline | Your recent normal | Your own last few weeks of trading — the standard today is compared against. Not other traders. Not perfection. You, lately. |
| Trend vote (4-signal) | Trending better / worse | Four checks against your recent normal (win %, average trade, PF, daily net). Three agreeing = a real trend, not noise. |
| Mechanism: `ticker-concentration` | One-stock day | A single symbol drove most of the result. |
| Mechanism: `tail-concentration` | One-trade day | A single trade drove most of the result. |
| Mechanism: `same-symbol-re-entry` | Revenge re-entries | Going back into the same symbol repeatedly after it hurt you. |
| Mechanism: `post-peak-giveback` | Gave it back | You were up more earlier — later trading handed part of it back. |
| Mechanism: `segment-leak` | Leaky pocket | One slice of your trading (a time of day, a price range) is quietly draining the rest. |
| Confidence (low / medium / high) | How sure the coach is | Based on how much data backs the read — trade count, recorded stops, notes. Low confidence = "interesting, not proven." |

## 4. Entry context (opportunity-context calculator)

| We capture (technical) | Plain label | In plain terms |
| --- | --- | --- |
| Time since current high | Minutes past the high | How long the stock had gone without a new high when you entered. Fresh = the move was alive; stale = you may be late. |
| Distance from current high (ATR-normalized) | How far you chased | How far above the last "safe" spot you paid up, sized to how much this stock normally moves. |
| ATR (average true range, 1-min) | Normal wiggle | How much this stock typically moves in a minute. "2 ATR extended" = you paid two normal wiggles above the spot that made sense. |
| VWAP | Average price of the day | Where the average share traded today. Above it, buyers in control; below it, you're arguing with the tape. |
| Decision point | The spot that made sense | The level (base, pullback, reclaim) where a planned entry had defined risk — as opposed to open air. |
| Premarket high relationship | Vs. the premarket high | Where your entry sat relative to the morning's pre-open high — a level everyone was watching. |
| Volume state (expanding / stable / declining) | Fuel | Was participation growing, steady, or drying up when you entered? Moves without fuel stall. |
| Failed attempt count | Failed breaks before you | How many times the stock had already tried and failed to break the high before your entry. Each failure lowers the odds. |
| Classification: `move-mature` | The move was already old | By time and behavior, the run had likely done most of what it was going to do before you got in. |
| Classification: `valid-stock-late-entry` | Right stock, late click | The idea was fine; the entry paid up after the easy part. |
| Classification: `good-entry-poor-management` | Good entry, gave it away | The entry was at a real spot; the exit/management lost the trade. |
| Classification: `cannot-determine` | Not enough chart data | We don't have the bars (or the context) to judge this one — no guess is made. |
| MFE (max favorable excursion) | Best it got | The most this trade was ever up while you were in it. |
| MAE (max adverse excursion) | Worst it got | The most this trade was ever down while you were in it. |
| Capture ratio | How much you kept | What you actually banked vs. the best the trade offered. Chronic low capture = exit problem, not entry problem. |
| Adverse add / averaging down | Adding to a loser | Buying more while the trade was against you. Flagged every time, with the chart context at that moment. |
| Scale-in to a winner | Adding to a winner | Pressing a working trade. Can be a strength — the coach asks rather than assumes. |
| Conviction–execution gap | Said vs. did | Your stated conviction didn't match your size or your fills — high conviction you didn't act on, or low conviction at full size. |

## 5. Price action vocabulary (price-action quality model)

| We capture (technical) | Plain label | In plain terms |
| --- | --- | --- |
| `chop` | Chop | Small, overlapping bars going nowhere. Not tradeable, just tempting. |
| `tight_grind` | Steady climb | Controlled, orderly progress with shallow pullbacks. Easier to hold, harder to chase-lose. |
| `whippy_expansion` | Big but sloppy | Big candles and big travel, but wicks and reversals everywhere. Moves a lot, pays badly. |
| `clean_expansion` | Clean run | Range expanding and actually going somewhere. The tape you want to be aggressive in. |
| `ignition` | Launch | The initial burst — new highs, new participation, the move announcing itself. |
| `pullback_consolidation` | Catching its breath | Pausing, retracing, or basing after a run. Where the next decision point forms. |
| `exhaustion_failure` | Running out of gas | Effort without progress — climax volume, failed pushes, the move ending. |
| Participation | Crowd showing up | Whether volume backed the move or the move was running on empty. |

---

## The two-layer outline pattern

For docs and coach output alike, the structure is always:

```
What we captured        ← exact fields, exact numbers (inspectable)
  └─ What it means      ← one plain-language sentence using labels from this glossary
```

The day page already does this shape in one place (verdict headline over stat
strip); the pattern should extend to every module: plain sentence first,
expandable exact data underneath. Applied to the current day page, this
glossary also implies two renames: **"Process read" → "What worked / Open
questions"** and the stat-strip tooltip layer for PF, break-even line, and R.

## Where this lives next (not yet built)

This doc is the source of truth for wording. When the canonical template gets
built (DATA_MODEL §9 step 3), promote the label column into a single TS copy
map (e.g. `src/lib/copy/glossary.ts`) so UI labels, tooltips, and the coach
prompt's vocabulary instructions all read from one dictionary — and add a line
to the coach payload instructions: "Use the plain labels from the provided
vocabulary; technical terms only in evidence references."
