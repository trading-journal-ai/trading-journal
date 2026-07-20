# Data-Viz Study Register

> Status: **Pinned 2026-07-18** — a capture of intent, not a build plan.
> The v1–v7 explorations each turned out to be *defining a review question and
> the data needed to answer it*. This file records those questions at day /
> week / month scope so we can circle back and flesh them out without
> re-reading seven prototype pages.
> Companions: [DATA_VIZ_CATALOG.md](DATA_VIZ_CATALOG.md) (chart vocabulary +
> verdicts) · [OPPORTUNITY_SET_CAPTURE_PLAN.md](OPPORTUNITY_SET_CAPTURE_PLAN.md)
> (study 8's full plan) ·
> [INDICATOR_PRICE_ACTION_PLAN.md](INDICATOR_PRICE_ACTION_PLAN.md) (study 10's
> indicator-event and trade-join plan)

**The pattern every study follows** — one question in trader voice, then an
honesty gradient by scope: at **day** the answer is a *fact about a moment*;
at **week** it becomes a *leaning*; at **month** it becomes a *statistic with
a sample size*. Data marked ✅ exists today (trades + the candle join);
⚠ means derived/estimated; ⛔ needs new capture.

---

## 1. The shape of the session — *"How did the result get built, and when was the day effectively over?"*

Data: entry/exit timestamps + P&L ✅ (accumulate in **exit** order).

- **Day** — one annotated path: peak, low, give-back shading, "80% built by 10:29", bold final.
- **Week** — five small multiples on one shared dollar scale; peak dot vs end = each day's give-back.
- **Month** — all paths overlaid + median day; "half of the decisive sessions were 80% built by 11:36."

Verdict: **the winner** (v6 D1 → v7 hero). First candidate to replace the
Journal Day·P&L chart. Fleshing out: walk-away marker ("if the day ended at
its peak"), regular-session shading, note/coach annotations on the path.

## 2. The echo — *"What does a loss do to your next trade?"*

Data: within-day sequencing (gap, size ratio, next outcome) ✅. "Big loss" =
worst-quartile loss (~$55+ in demo).

- **Day** — fact: "After the worst loss (PDYN −$35 at 07:21) your next trade came 46s later at 0.82× size → +$13." Or the strongest sentence in the set: "…and you stopped. No trade followed it."
- **Week** — leaning, only if n allows.
- **Month** — statistic: "23 trades followed a $55+ loss: median re-entry 2m later at 1.02× size, +$13/t."

Verdict: keep as **sentences**, not charts. Note: the demo data *cleared* the
trader (no revenge pattern) — a study that can exonerate is as valuable as one
that indicts.

## 3. Did you try to re-enter? — *"After exiting, did you chase back into the same name — and what did it cost?"*

Data: sequencing ✅ + exit price ⚠ (estimated from P&L per share; production
should use actual exit fills). Re-entry = same symbol within 15m of exit.

- **Day** — fact per occurrence: "Left NXTC at $5.20, back in 4m later at +1.2% → −$45."
- **Week** — count + net of re-entries.
- **Month** — statistic: "680 re-entries, 65% paid up (median +1.0%); they made +$20/t vs +$44/t on first touches."

Verdict: the full scatter is **analytics-tier** (too much for the journal);
the journal gets the day-fact and the month-sentence. One of the clearest
measurable leaks found in the whole exploration.

## 4. Pace — *"Does firing again immediately pay, or does a breath?"*

Data: gap between previous exit and next entry ✅.

- **Day** — fact: "Fastest re-fire: 0s after a win → +$280."
- **Week/Month** — expectancy by gap bins (<1m / 1–5m / 5–15m / 15m+). Demo read was U-shaped: instant is fine, the 5–15m twilight zone worst, 15m+ best.

Verdict: **liked** ("entries under a minute after the last exit" was called
out as good). Read it against study 2: speed after wins is style; speed only
after losses is a pattern.

## 5. The conviction test — *"Does your size show up when conditions are objectively good?"*

Data: position dollars ✅ × entry-time conditions from the candle join ✅
(rel-vol 2–6×, within 2m of a fresh high, above the premarket high). In
production the conditions should come from the trader's own playbook, not a
hardcoded score.

- **Day** — fact: "Biggest bet: $28.7k BNAI at 10:08 — unfavorable (1.1× vol, 10m off high) → +$220."
- **Month** — statistic + meter: "23% of your top-quartile bets landed in favorable conditions — there they made +$86/t."

Verdict: concept approved, **2×2 grid presentation retired** (not unique or
interesting). Stays a sentence with an inline meter.

## 6. The nth bite — *"When you keep going back to the same name, does bite N pay like bite 1?"*

Data: per-symbol trade count within the day ✅.

Verdict: **parked — failed the comprehension test** as presented. If revived,
it needs plainer framing (possibly merged into study 3, since "re-entry" and
"nth bite" are the same behavior counted differently).

## 7. Move anatomy — *"Where inside the stock's move — time, extension, volume story — did you act, and where does it pay?"*

Data: the trade×candle join ✅ (`scripts/generate-candle-join-data.mjs`):
ignition (+10% in 5m onset), extension from session base, volume clock,
rel-vol, MAE/MFE, capture ratio, post-exit run-up. All hindsight-labeled
except rel-vol/fresh-high/PM-high.

- **Day** — facts per trade against the day's own move (entry vs ignition, extension at entry, capture of MFE).
- **Month** — the cohort statistics (v3): only 26 first-5-minute entries (+$39/t); extension U-shaped ($8/t mid vs $40/t at 50%+); early-volume entries +$43/t; 95% of P&L from ≥50% movers.

Verdict: strongest **analytics-tier** material; the journal day-recap borrows
individual facts, not the cohort charts.

## 8. The opportunity set — *"Were you able to capitalize on the movers of the day?"*

Owned by [OPPORTUNITY_SET_CAPTURE_PLAN.md](OPPORTUNITY_SET_CAPTURE_PLAN.md)
(v5, approved vocabulary; capture ⛔ pending — scanner events, five-pillar
snapshot at alert time, dispositions Traded/Missed/Avoided/False).

- **Day** — ranked candidate ledger + participation ("the market offered 24%; you finished +$690").
- **Week/Month** — participation-vs-opportunity aggregates and glyph calendar.

## 9. The factor lens — *a tool, not a study: "pick one factor; how do winners and losers differ on it, and did more of it pay?"*

Data: any per-trade factor ✅. Scope selector (day/week/month/stock) + form
switcher (dots/mirror/interval) + computed verdict with sample gates.

Verdict: **sortability liked, visuals thin**. If revived, its factor list is
where studies 5 and 7's dimensions live, and study 8 adds disposition/rank as
factors once captured.

## 10. Indicator respect and entry location — *"Did price use the 9, 20, or VWAP as a rail—and did you buy the decision point?"*

Data: one-minute OHLCV ✅ for EMA 9/20 and VWAP; executions ✅ for entry/exit;
exact setup thresholds ⛔ require trader-authored rules. Full contract:
[INDICATOR_PRICE_ACTION_PLAN.md](INDICATOR_PRICE_ACTION_PLAN.md).

The shared taxonomy for chop, tight grind, whippy expansion, clean expansion,
move phase, and volume participation is defined in
[PRICE_ACTION_QUALITY_MODEL.md](PRICE_ACTION_QUALITY_MODEL.md).

- **Trade** — exact candle chart plus a readable event sequence: test, hold,
  loss, reclaim, confirmation, entry, and exit. Join entry distance to MAE/MFE
  and capture.
- **Day** — the strongest rail-based entry and the clearest extended/off-rule
  entry as facts, not a dashboard of every crossing.
- **Week/Month** — expectancy, win/loss size, MAE/MFE, and hold time by event
  family with visible sample size.

Verdict: **build the event vocabulary before grading setups**. V6 Study 04 is
the illustrative prototype. A VWAP curl remains a candidate label until its
structure and confirmation rules are authored; the system must not pretend a
generic line cross is the trader's setup.

---

## Parked questions (named but never built)

- **The walk-away test** — what each day looked like if it ended at its peak vs where it actually ended (belongs inside study 1's day view).
- **Loss-streak escalation** — study 2 extended to 2nd/3rd consecutive losses.
- **"The one you didn't take"** — study 3's sibling for missed candidates (needs study 8's capture).
- **The opening bell decision window** — a separate daily case study for the
  high-volume period around the market open. Align every qualifying mover on a
  shared clock, then show which stock led, how many names were moving, where the
  trader focused, and whether entries followed a valid setup or reacted to raw
  volatility. It shares the scanner-response vocabulary, but its question is
  stock selection under simultaneous opportunity rather than one alert's setup.
