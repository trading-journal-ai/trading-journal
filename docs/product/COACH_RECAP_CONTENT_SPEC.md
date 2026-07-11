# Trading Journal AI
## Trading Coach + Daily Recap Content Design Specification

**Status:** Working content architecture — Revision 2  
**Updated:** July 11, 2026  
**Primary surfaces:** Journal → Coach → Playbook → Dashboard → next Journal  
**Purpose:** Define what the Trading Coach should say, where it should appear, how much should be visible at once, and how detailed evidence should be progressively disclosed.

---

## 1. Product premise

The daily recap should not behave like a static performance report.

It should help the trader answer, in order:

1. **What happened?**
2. **What actually mattered?**
3. **What should I repeat or stop?**
4. **What deserves deeper review?**
5. **What carries into the next session?**

The system should preserve a strict distinction between:

- **User-authored context:** notes, dictation, self-grades, emotions, intent.
- **Imported facts:** fills, P&L, timestamps, hold time, position size.
- **Calculated facts:** win rate, rule compliance, concentration, distributions.
- **Coach interpretation:** findings, patterns, significance, recommendations.
- **User-approved knowledge:** playbook rules, examples, exceptions, active focus.

This distinction is foundational. A trader should always know what they wrote, what the system calculated, what the coach inferred, and what they explicitly approved.


### Human-language principle

The product may use statistical and market calculations under the hood, but the trader should not need a statistics background to understand the result.

The default experience should:

- Lead with the plain-English conclusion.
- Explain why it matters in trading terms.
- Link the conclusion to specific trades or chart moments.
- Keep formulas and methodology behind **See how this was calculated**.
- Avoid academic or data-science labels when an everyday phrase communicates the same idea.
- Never make an insight sound more certain than the evidence supports.

Example:

Avoid:

> Trimmed P&L remains negative after symmetric tail exclusion.

Prefer:

> **The loss was spread across the session.**  
> Removing the largest winner and largest loss does not materially change the result.

The product should feel like a thoughtful trading coach who can use data—not a statistics dashboard asking the trader to interpret the analysis.

---

## 2. The four-surface learning loop

### 1. Journal — captures the record

The Journal is the source of truth for the trading day.

It contains:

- Daily recap
- Trade notes
- Check-ins
- Market context
- Emotional context
- Screenshots and charts
- Imported executions
- Self-grades
- User corrections to coach output

The Journal answers: **What happened, and what was I thinking?**

### 2. Coach — develops the feedback

The Coach reads the Journal against the trader’s rules, playbook, historical patterns, and deterministic trade facts.

It produces:

- Session verdict
- Evidence-backed findings
- Rule compliance review
- Trade review queue
- Pattern significance
- One next-session experiment
- Playbook candidates
- Questions where context is missing

The Coach answers: **What mattered, and why?**

### 3. Playbook — accumulates standards

The Playbook stores only user-approved, durable knowledge:

- Rules
- Setups
- Entry criteria
- Exit criteria
- Exceptions
- A+ examples
- Avoid examples
- Repeated lessons
- Review criteria

The Playbook answers: **What do I currently believe good trading looks like?**

### 4. Dashboard — orients the next session

The Dashboard carries only the highest-value items forward:

- Current focus
- Active experiment
- Relevant rule reminder
- Recent recurring pattern
- Unresolved review item
- Pre-session check-in

The Dashboard answers: **What should affect my decisions today?**

### System flow

**Journal captures → Coach interprets → Playbook retains → Dashboard reminds → Journal records the next session**

The daily recap is the main handoff between Journal and Coach.

---

## 3. Separate content design from UI design

The work should be split into three layers.

### Layer A — Content model

Define:

- What objects exist
- What each object means
- Required fields
- Data source
- Confidence rules
- Maximum visible items
- Promotion and dismissal behavior

### Layer B — Information hierarchy and interaction

Define:

- What appears by default
- What is collapsed
- What opens in a drawer
- What links to trade detail
- What can be promoted to Playbook
- What can be carried to Dashboard

### Layer C — Visual design

Define:

- Typography
- Spacing
- Card treatment
- Color semantics
- Responsive behavior
- Chart placement
- Motion
- Dense-table presentation

**Recommendation:** lock Layers A and B before polishing the visual system. A polished UI cannot solve an unclear coaching hierarchy.

---

## 4. Progressive disclosure model

The daily recap should support three depths of review.

### Level 1 — Glance

**Time:** 10–20 seconds  
**Goal:** Understand the session and the next action.

Show only:

- Session verdict
- One primary strength
- One primary leak
- One next-session focus
- Three or four key facts
- Critical rule breach, when present

### Level 2 — Review

**Time:** 2–5 minutes  
**Goal:** Understand the evidence and annotate important trades.

Show:

- Coach findings
- **What drove the result?** summary
- **Was the opportunity still there?** summary, when market data supports it
- Review queue
- Rule scorecard summary
- Self-grade distribution
- Key timeline moments
- Playbook candidates
- Trend comparison

### Level 3 — Investigate

**Time:** 10+ minutes  
**Goal:** Perform forensic review.

Show:

- Trade-by-trade breakdown
- Full chart and executions
- Session timeline
- Segment tables
- Distribution and concentration analysis
- Result-without-largest-trades comparison
- Entry-time opportunity context
- Counterfactual views
- Calculation details
- Full source notes
- Historical examples

The default page should never expose all three levels at once.

---

## 5. Recommended daily recap hierarchy

### A. Session header

Show:

- Date
- Account
- Session status: Draft / Ready for coach / Reviewed / Complete
- Market window
- Optional market context tag
- Last edited time

Do not lead with P&L as the page title.

### B. Session verdict

This is the highest-priority coach output.

**Required structure:**

- **Verdict label:** short classification
- **One-sentence explanation**
- **Confidence:** High / Medium / Low
- **Evidence count or sample note**
- **Open evidence action**

Example:

> **Good process, red result**  
> One hard-stop breach created most of the avoidable loss; otherwise, entries were mostly selective and rule-compliant.  
> **Confidence: High · 10 trades · 1 critical breach**

Useful verdict labels:

- Strong process, positive result
- Strong process, negative result
- Positive result, weak process
- Red day with contained risk
- Rule-driven loss
- Exit-management leak
- Overtrading session
- Insufficient evidence

Avoid an unexplained letter grade as the primary verdict.

If a grade is retained, label it **Process grade**, explain the rubric, and keep it secondary.

### C. Next-session focus

Show exactly one primary action.

The focus must be:

- Triggered by a defined situation
- Behaviorally specific
- Measurable
- Time-limited
- Editable
- Dismissible

Example:

> **When a trade fails to continue after the first partial, exit the remainder at the planned invalidation instead of waiting for a second expansion.**  
> Measure: number of overstays and P&L given back.  
> Expires after: 3 sessions.

Actions:

- Carry to Dashboard
- Edit
- Replace
- Mark not useful

### D. Key facts strip

Show no more than four values.

Recommended default:

1. Net P&L
2. Trade count
3. Process quality or “would do again” rate
4. Rule integrity

Possible secondary values under **More stats**:

- Win rate
- Profit factor
- Average winner
- Average loser
- Maximum drawdown
- Hold time
- R-multiple coverage
- Largest ticker concentration

Use P&L as context, not as the coach’s conclusion.

### E. What worked

Maximum two findings.

Each finding includes:

- Claim
- Evidence reference
- Why it matters
- Optional Playbook action

Example:

> **Patience improved entry quality.**  
> T4 and T9 waited for confirmation and were the two cleanest managed trades.  
> `Save as playbook example`

### F. What cost you

Maximum one primary finding and one secondary finding.

Each finding includes:

- Claim
- Evidence reference
- Estimated impact when deterministic
- Whether it is isolated or recurring
- Recommended review target

Example:

> **The main avoidable loss was not stock selection; it was the response after the first loss.**  
> T2 exceeded the hard stop immediately after T1, creating the only critical rule breach.

### G. What drove the result?

**User-facing label:** **What drove the result?**  
**Internal concept:** Session structure, concentration, and robustness analysis.

This module answers:

> Was the day broadly good or bad, or did one unusual trade dominate the result?

It should not be labeled **Trim Review**, **Outlier Analysis**, or **Robust Statistics** in the normal interface.

Possible plain-language conclusions:

- **One loss overwhelmed an otherwise controlled session**
- **One winner masked a weak session**
- **The loss was spread across the session**
- **The result was concentrated in one ticker**
- **Most of the damage happened in one time window**
- **The result was broadly consistent across trades**
- **Not enough trades to judge session structure**

Default content:

- One conclusion
- One or two supporting facts
- The trade, ticker, or time period responsible
- An optional historical comparison
- A **See calculations** action

Example:

> **One stop violation drove most of the loss.**  
> T2 accounted for 62% of the net loss. Without it, the other nine trades were close to breakeven.  
> `Review T2` · `See calculations`

Alternative example:

> **The weakness was spread across the session.**  
> The day remains materially negative after excluding both the largest winner and largest loss. No single trade explains the result.

#### Suggested calculations

The system may calculate:

- Actual net result
- Result without the largest loss
- Result without the largest winner
- Result without both
- Share of result by ticker
- Share of result by setup
- Share of result by time window
- Share of result created by rule-breaking trades

The purpose is not to erase trades or replace the actual result. It is to understand how fragile or concentrated the result was.

#### Safeguards

- Always show the actual result first.
- Never imply that an excluded trade “does not count.”
- Do not call a session broad-based when only a few trades were taken.
- Do not equate an unusually large trade with a bad trade; it may have been excellent execution.
- Separate **result concentration** from **process quality**.
- Use dollar values by default; use R only when planned-risk data is sufficiently complete.
- Keep multi-level tail-removal tables in the deep evidence view, not the recap.

### H. Was the opportunity still there?

**Recommended user-facing label:** **Was the opportunity still there?**  
**Alternative labels:** **What was the stock offering?** or **Opportunity at entry**  
**Internal concept:** Opportunity context.

This module helps separate:

1. Wrong stock
2. Right stock, wrong time
3. Valid opportunity, poor entry
4. Good entry, poor management

It asks what was observable when the trader entered:

- Had the stock already made its high?
- How long ago was the high?
- Was price holding near the high or steadily fading?
- Was price above or below VWAP?
- Was volume expanding, stable, or declining?
- Had the setup already failed one or more times?
- Was the stock consolidating for continuation?
- Was a legitimate regular-session move still developing?
- Did the stock continue after exit, suggesting management rather than selection was the issue?

Example:

> **Most losing entries came after the move had weakened.**  
> Four of six losing entries occurred after the stock’s high, below VWAP, while volume was declining. This points more toward late opportunity selection than stop execution alone.  
> `View entries on chart`

Alternative:

> **The opportunity was valid; the execution was not.**  
> JZXN was still making higher highs with expanding volume at entry. The loss came from entering too far above the planned trigger and adding before confirmation.

#### Information available at entry versus hindsight

The coach must distinguish between:

**Available at entry**

- Time since the current high
- Distance from high
- VWAP relationship
- Volume trend
- Prior failed breakouts
- Current price structure
- Premarket versus regular-session high
- Known catalyst and halt history
- The trader’s stated setup and trigger

**Known only afterward**

- The final high of day
- Whether the stock faded for the rest of the session
- Which later ticker became the strongest mover
- The full maximum favorable or adverse move after entry

Post-trade information is useful for learning, but it must not be written as though it was fully predictable at entry.

Avoid:

> You should have known the move was over.

Prefer:

> At entry, the stock had been below VWAP for 18 minutes, volume was declining, and two reclaim attempts had failed. Those were visible signs that continuation quality had weakened.

#### Minimum data

For an MVP, one-minute bars plus executions may support:

- Premarket and regular-session high/low
- Time of current high at entry
- Distance from high at entry
- VWAP relationship
- Volume trend
- Price structure around entry
- Maximum favorable excursion after entry
- Maximum adverse excursion after entry
- Time and price of exit

Faster bars may improve short-scalp accuracy later, but Level 2 order-book data is not required for the initial module.

The coach should request or use trader-provided context for:

- Intended setup
- Planned trigger
- Planned stop
- Initial target or exit condition
- Whether the trade was intended as a scalp, breakout, pullback, dip, or reclaim

When intent is missing, the coach should describe the chart facts and ask a question rather than invent the thesis.

### I. Review queue

Do not show every trade by default.

Surface two to four trades selected for different reasons:

- Critical rule breach
- Best process example
- Largest avoidable loss
- Representative trade
- Missing note or context
- Conflicting evidence

Each queue card shows:

- Ticker
- Time
- P&L
- Self-grade
- Reason it was selected
- One-sentence coach read
- Annotation status
- Open trade action

### J. Rule integrity summary

Default collapsed.

Collapsed state:

> **1 critical breach · 8 rules clean · 1 rule not evaluable**

Expanded state:

- Rule
- Result
- Evidence
- Trade references
- Severity
- User note
- Proposed rule change, when relevant

A rule should be marked:

- Clean
- Breached
- Not applicable
- Not evaluable
- Needs clarification

Do not treat missing data as compliance.

### K. Pattern and significance

Show only when the evidence crosses a defined threshold.

Structure:

- Current-session observation
- Historical comparison
- Sample size
- Confidence
- Recurrence status
- Why it matters

Status labels:

- Session-only observation
- Emerging pattern
- Repeated pattern
- Established pattern
- Resolved or improving

Example:

> **Emerging pattern: profitable trades are being held longer than invalidated trades.**  
> Seen in 3 of the last 5 sessions, but planned-stop coverage is incomplete.  
> **Confidence: Medium**

### L. Playbook candidates

Coach findings should never silently become rules.

Candidate types:

- New rule
- Rule revision
- Setup criterion
- Exit criterion
- Exception
- A+ example
- Avoid example
- Review question

Actions:

- Add to Playbook
- Edit first
- Compare with existing rule
- Dismiss
- Revisit later

### M. Full evidence

The complete trade-by-trade recap belongs at the bottom or behind an evidence view.

Provide:

- Compact table mode
- Timeline mode
- Chart mode
- Filter by self-grade
- Filter by rule breach
- Filter by ticker
- Filter by setup
- Filter by coach finding

---

## 6. Coach content objects

Every coach output should be generated as a structured object rather than a freeform essay.

### 6.1 Session verdict

Fields:

- `label`
- `summary`
- `process_outcome_relationship`
- `confidence`
- `sample_size`
- `evidence_refs`
- `caveat`
- `generated_at`
- `user_status`

### 6.2 Finding

Fields:

- `title`
- `claim`
- `category`
- `polarity`
- `scope`
- `evidence_refs`
- `impact`
- `historical_comparison`
- `confidence`
- `why_it_matters`
- `recommended_action`
- `status`

Suggested categories:

- Entry
- Exit
- Risk
- Sizing
- Selection
- Patience
- Overtrading
- Emotional response
- Rule adherence
- Setup quality
- Market alignment
- Review quality

### 6.3 Rule evaluation

Fields:

- `rule_id`
- `rule_name`
- `result`
- `severity`
- `trade_refs`
- `evidence`
- `missing_data`
- `coach_explanation`
- `user_override`

### 6.4 Trade review item

Fields:

- `trade_id`
- `selection_reason`
- `priority`
- `coach_read`
- `self_grade`
- `rule_status`
- `note_status`
- `chart_status`
- `open_questions`
- `review_complete`

### 6.5 Pattern

Fields:

- `name`
- `current_observation`
- `historical_window`
- `sample_size`
- `frequency`
- `direction`
- `confidence`
- `evidence_refs`
- `status`
- `contradicting_evidence`

### 6.6 Experiment

Fields:

- `title`
- `trigger`
- `behavior`
- `measure`
- `duration`
- `expiration`
- `linked_finding`
- `dashboard_copy`
- `completion_status`
- `result`

### 6.7 Playbook candidate

Fields:

- `candidate_type`
- `proposed_text`
- `source_session`
- `evidence_refs`
- `related_rule`
- `confidence`
- `user_decision`


### 6.8 Session structure

Fields:

- `plain_language_label`
- `classification`
- `actual_result`
- `result_without_largest_loss`
- `result_without_largest_winner`
- `result_without_both`
- `largest_trade_share`
- `ticker_concentration`
- `setup_concentration`
- `time_window_concentration`
- `rule_break_concentration`
- `minimum_sample_met`
- `evidence_refs`
- `confidence`
- `caveat`

Suggested classifications:

- One-loss dominated
- One-winner dominated
- Broadly negative
- Broadly positive
- Ticker-concentrated
- Time-concentrated
- Mixed
- Insufficient sample

### 6.9 Opportunity context

Fields:

- `trade_id`
- `plain_language_conclusion`
- `opportunity_classification`
- `intended_setup`
- `intent_source`
- `entry_time`
- `entry_price`
- `current_high_at_entry`
- `time_since_current_high`
- `distance_from_current_high`
- `premarket_high_relationship`
- `vwap_relationship`
- `volume_state`
- `price_structure`
- `failed_attempt_count`
- `mfe_after_entry`
- `mae_after_entry`
- `information_available_at_entry`
- `post_trade_observations`
- `evidence_refs`
- `confidence`
- `missing_context`

Suggested classifications:

- Opportunity developing
- Opportunity still valid
- Opportunity weakening
- Move likely mature
- Valid stock, late entry
- Valid setup, poor execution
- Good entry, poor management
- Cannot determine

---

## 7. Content priority matrix

### Must appear in the default recap

- Session verdict
- One next-session focus
- Critical rule breach
- One strength
- One primary leak
- Key facts
- Review queue
- A **What drove the result?** conclusion when the sample is sufficient

### Available one level deeper

- Self-grade split
- Rule scorecard
- Trend comparison
- Opportunity-at-entry context
- Playbook candidates
- Timeline moments
- Coach evidence
- Additional stats

### Deep evidence only

- Full trade table
- Segment analysis
- Concentration math
- Counterfactuals
- Distribution charts
- Calculation methodology
- Full historical comparisons
- Raw coach payload

---

## 8. Maximum visible content rules

To prevent overload, the default recap should show no more than:

- 1 session verdict
- 1 active focus
- 4 key facts
- 2 positive findings
- 2 negative findings
- 4 review trades
- 1 session-structure conclusion
- 1 opportunity-context conclusion, only when it changes the diagnosis
- 1 pattern
- 2 Playbook candidates
- 6 coach-generated statements total before expansion

When more findings exist, rank them and show:

> **3 additional observations**

The coach should prioritize by:

1. Safety and risk
2. Rule severity
3. Avoidable impact
4. Recurrence
5. Confidence
6. Playbook relevance
7. P&L magnitude

---

## 9. Trade-row content design

The reference recap’s trade-by-trade section is useful but too dense as the default view.

### Compact row

Show:

- Trade number
- Time
- Ticker
- Outcome
- Self-grade
- Setup
- Rule status
- One-line note
- Expand action

Example:

> **T2 · 07:51 · TKLF · −$3.45**  
> `Should avoid` · Break HOD · **Hard-stop breach**  
> Entered into the 200 EMA after the first loss.  
> `Open review`

### Expanded trade

Add:

- Chart
- Executions
- Planned entry and actual entry
- Planned stop and actual stop
- Planned exit and actual exit
- Hold time
- Market context
- User note
- Emotion and process tags
- Rule evaluations
- Coach interpretation
- Similar historical trades
- Playbook links
- Annotation actions

Avoid repeating the same facts in the row, rule scorecard, and coach paragraph unless the repetition serves a different task.

---

## 10. How the screenshot should be reorganized

### Keep

- Self-grading split
- Rule scorecard
- Trade-by-trade evidence
- A synthesized “real issue”
- Session-level conclusion
- Specific references to trades and rules

### Change

- Move **“The real issue: exits, not entries”** near the top.
- Combine **Hard stop breach** and **Rule violations** into one Rule Integrity card.
- Move the complete trade breakdown into a collapsed evidence section.
- Reduce the top metric strip to four items.
- Make self-grading a compact distribution rather than three large cards.
- Put the most important rule breach inside the coach finding, not in three different places.
- Replace or demote the unexplained **B−**.
- Show confidence and sample-size caveats beside findings.
- Add explicit actions: review, promote, carry forward, dismiss.
- Separate user notes from coach interpretation visually and semantically.

### Suggested top-of-page transformation

> **Controlled red day with one critical mistake**  
> One hard-stop breach on T2 created the main avoidable loss. The larger recurring issue was exit management on T7 and T10.  
> **High confidence · 10 trades**
>
> **Next session:** Take the planned base hit when momentum fails; do not convert a scalp into a long hold.
>
> **Review first:** T2 rule breach · T9 best-managed trade · T10 exit overstay

Everything else can be opened below.

---

## 11. Access and navigation

### Dashboard

Before the session, show:

- Active experiment
- One relevant rule
- Last-session carry-forward
- Unresolved review count
- Start check-in

Do not show the entire prior recap.

### Journal

The day page is the complete source of truth.

Default sequence:

1. User recap
2. Coach summary
3. Review queue
4. Supporting facts
5. Evidence
6. Playbook and Dashboard handoffs

### Coach

The Coach surface should function as a review workspace, not just a chat window.

Useful views:

- Today’s review
- Needs annotation
- Rule breaches
- Emerging patterns
- Playbook candidates
- Experiments
- Questions from coach

### Playbook

Each rule and setup should link back to:

- Source sessions
- Supporting examples
- Contradicting examples
- Revision history
- Active or retired status

### Trade detail

Trade-specific coach content should stay close to the chart and executions.

The session recap should summarize the finding and link to the trade rather than reproducing the complete analysis.

---

## 12. Coach writing rules

The coach should sound:

- Direct
- Calm
- Specific
- Non-judgmental
- Evidence-led
- Process-oriented
- Brief by default

### Preferred construction

**Observation → evidence → significance → action**

Example:

> You followed the entry plan on four of five FTBO trades. The one exception was T2, entered directly beneath the 200 EMA after a loss. Because it also exceeded the hard stop, it is the highest-priority review. Next session, pause after the first loss and restate the setup before re-entry.

### Avoid

- Generic encouragement
- Motivational filler
- Repeating every metric
- Treating P&L as proof of good or bad process
- False precision
- Diagnosing emotion without user evidence
- Turning one session into a persistent pattern
- Giving multiple competing “one things to try”
- Auto-writing permanent rules
- Blaming language
- Long narrative before the conclusion

### Language examples

Prefer:

- “The evidence suggests…”
- “This appears session-specific…”
- “This repeated in 3 of the last 5 sessions…”
- “The rule could not be evaluated because…”
- “The main avoidable cost was…”
- “Your note and the executions disagree on…”
- “This is a candidate, not yet a rule.”

Avoid:

- “You always…”
- “You never…”
- “Clearly…”
- “Obviously…”
- “This proves…”
- “The market punished you…”

---

## 13. Humanized analytical language

The system can retain precise internal names in code and documentation while presenting human language in the product.

| Internal concept | Avoid as the default label | Preferred product language |
|---|---|---|
| Trimmed or tail-excluded result | Trim review | What drove the result? |
| Concentration analysis | P&L concentration coefficient | Where did the result come from? |
| Robustness check | Robust result | Does one trade explain the day? |
| Outlier | Statistical outlier | Unusual trade |
| Move retention | Percentage of move retained | Did the move hold? |
| Maximum favorable excursion | MFE | Best move after entry |
| Maximum adverse excursion | MAE | Worst move against the trade |
| Expected R per trade | E[R] / trade | Average result relative to risk |
| Time-of-high analysis | Peak-time cohort | Had the stock already made its move? |
| Opportunity classification | Regime label | What was the stock offering at entry? |

### Content pattern

Use:

**Conclusion → supporting evidence → trading meaning → action**

Example:

> **The day was not ruined by one trade.**  
> Excluding the largest winner and loss, the session remains meaningfully negative. The issue was spread across stock selection and entries, so reviewing only the worst trade would miss the larger pattern.  
> `Open the four representative trades`

Do not require the user to interpret a table before learning the conclusion.

### Analytical detail is optional, not hidden

The user should be able to inspect:

- The exact trades included
- The values before and after comparison
- The chart state at entry
- Calculation definitions
- Missing-data warnings
- Why the coach chose its wording

The experience should be easy by default and rigorous on demand.

---

## 14. Trust and provenance

Every insight should expose its basis.

Recommended source labels:

- **Your note**
- **Imported**
- **Calculated**
- **Coach interpretation**
- **Playbook**
- **Historical pattern**

An expanded finding should answer:

- Which trades support this?
- Which rule was used?
- What time window was compared?
- What data is missing?
- What contradicts the finding?
- How confident is the coach?
- Was the finding accepted or corrected by the user?

The coach should never perform hidden arithmetic in prose when a deterministic calculation can provide the fact.

---

## 15. Important states

### Incomplete day

Show:

> Coach review is waiting for 2 trade annotations.

Do not fabricate context.

### Small sample

Show:

> Session-only observation. There is not enough evidence to call this a pattern.

### Missing planned risk

Show:

> Exit quality can be described, but R-multiple and stop adherence cannot be evaluated.

### Conflicting evidence

Show:

> Your note says the entry was planned, but the recorded entry occurred before the stated trigger. Review the chart before accepting this finding.

### No critical issue

Do not invent a problem.

Show:

> No material rule breach or repeated execution leak was detected. The most useful review is the best-managed trade.

### Positive but concentrated result

Show:

> The session was green, but one ticker produced more than the net result. Treat the outcome as concentrated rather than broadly repeatable.


### One loss dominated the day

Show:

> One rule-breaking loss produced most of the net damage. The other trades were close to breakeven. Review the risk event before drawing conclusions about the whole strategy.

### One winner masked weak execution

Show:

> The day finished green, but the result depended on one unusually large winner. Excluding it, the remaining trades were materially negative.

### Insufficient trades for session structure

Show:

> There are not enough trades to judge whether the result was broad-based or dominated by an unusual trade.

### Missing market bars

Show:

> The coach can review executions and notes, but cannot determine whether the stock had already made its move because intraday market data is unavailable.

### Missing trade intent

Show:

> The chart suggests the opportunity was weakening, but the intended setup and trigger were not recorded. Add the trade thesis to make this conclusion more reliable.

---

## 16. Example recap

# July 10, 2026

### Controlled red day with one critical mistake

One hard-stop breach on T2 created the main avoidable loss. Outside that trade, rule adherence was strong. The broader repeat issue was exit management: T7 and T10 were held beyond the original scalp thesis.

**Confidence: High · 10 trades · 1 critical breach**

### Next session focus

**When momentum fails after the first partial, exit the remainder at the planned invalidation. Do not wait for a second expansion.**

Measure: overstays and P&L given back  
Duration: next 3 sessions  
`Carry to Dashboard`

### Key facts

- Net P&L: −$4.14
- Trades: 10
- Would do again: 5
- Rule integrity: 1 critical breach

### What worked

**Patience produced the best process.**  
T4 and T9 waited for confirmation and were the cleanest managed trades.

**Most rules were followed.**  
The hard-stop breach was isolated; the remaining evaluated rules were clean.

### What cost you

**T2 was the highest-priority error.**  
The entry came directly beneath the 200 EMA after the first loss and exceeded the hard stop.

**Exit management remains the repeated leak.**  
T7 stretched a scalp while T10 became a 37-minute hold after the original thesis weakened.

### What drove the result?

**One loss overwhelmed an otherwise controlled session.**  
T2 produced most of the avoidable loss. Without that trade, the remaining session was close to breakeven. This makes the stop violation more important than the overall win rate.

`Review T2` · `See calculations`

### Was the opportunity still there?

**The trades were not all the same problem.**  
T2 entered directly beneath the 200 EMA after the first loss, while T9 entered a stock that was still developing with stronger volume. T7 and T10 were less about stock selection and more about staying after the original scalp thesis weakened.

`View entries on chart`

### Review queue

1. **T2 TKLF** — Critical rule breach
2. **T9 JZXN** — Best-managed trade
3. **T10 GMM** — Exit overstay
4. **T7 GMM** — Similar exit pattern

### Emerging pattern

**Exit targets are becoming less disciplined after the initial trade works.**  
Seen in this session and referenced in last week’s T2/T3 review.  
**Confidence: Medium**

### Playbook candidates

- Add T9 as an example of patient entry and staged exit.
- Clarify the FTBO exit rule when continuation fails.

### Evidence

`Open rule scorecard`  
`Open all 10 trades`  
`View session timeline`  
`View coach evidence`

---

## 17. Implementation plan

### Phase 1 — Content schema

Build structured types for:

- Verdict
- Finding
- Rule evaluation
- Review queue item
- Pattern
- Experiment
- Playbook candidate
- Session structure
- Opportunity context

Define deterministic inputs and required evidence references.

For session structure, calculate actual result and simple largest-trade/ticker/time-window comparisons outside the language model.

For opportunity context, join executions to intraday bars and clearly separate information available at entry from post-trade observations.

### Phase 2 — Static recap prototype

Create seeded examples for:

- Strong green process day
- Green day with weak process
- Controlled red day
- Critical rule breach
- No-trade day
- Small-sample day
- Missing-risk-data day
- One-loss-dominated red day
- One-winner-dominated green day
- Broad-based weak day
- Valid-opportunity/poor-execution day
- Late-opportunity-selection day

Test the hierarchy with real review sessions before generating live AI copy.

### Phase 3 — Progressive disclosure

Implement:

- Glance summary
- Expandable findings
- Review queue
- Collapsed rule scorecard
- Full evidence modes
- Source and confidence panels

### Phase 4 — Four-surface handoffs

Implement:

- Coach → Playbook candidate
- Coach → Dashboard active focus
- Playbook → Coach review criteria
- Dashboard → Journal check-in
- Journal correction → Coach regeneration

### Phase 5 — Personalization

Allow users to configure:

- Preferred top metrics
- Grade visibility
- Coach tone
- Review depth
- Rule severity
- Maximum surfaced trades
- Experiment duration
- P&L visibility

---

## 18. Decisions and owner input

Most of the architecture can move forward with recommended defaults. The following decisions materially affect the content model or navigation.

### Decisions to make now

#### 1. Name of the daily output

Options:

- **Daily Recap**
- **Coach Review**
- **Daily Recap** containing a **Coach Review**

**Recommendation:** Keep **Daily Recap** as the journal artifact and make **Coach Review** a clearly labeled section within it. This preserves the journal-first model and prevents the AI output from becoming the entire record.

#### 2. User-facing name for session-structure analysis

Options:

- **What drove the result?**
- Session structure
- Session concentration
- Was this one trade or the whole day?

**Recommendation:** Use **What drove the result?** as the UI heading. Retain `session_structure` as the internal object name.

#### 3. User-facing name for opportunity analysis

Options:

- **Was the opportunity still there?**
- What was the stock offering?
- Opportunity at entry

**Recommendation:** Use **Was the opportunity still there?** in the recap. Use **Opportunity at entry** as a compact label in Trade Detail.

#### 4. Minimum sample for “What drove the result?”

**Recommendation:** Run the calculation for any session, but only present a session-level classification with **5 or more closed trades**. With fewer trades, describe the largest contributor without calling the result broad-based.

#### 5. Market-data resolution for the first implementation

**Recommendation:** Start with **one-minute OHLCV bars plus executions**. This is sufficient for a first version of high timing, VWAP relationship, distance from high, volume state, and post-entry movement. Treat 10-second or tick data as a later accuracy enhancement.

#### 6. Use of R-multiples

**Recommendation:** Show dollars and percentages by default. Show R only when the trader recorded planned risk or the application can determine it reliably. Never estimate R from the final loss alone.

#### 7. How much trade intent must be captured

**Recommendation:** Require only a lightweight setup selection plus optional planned trigger, stop, and thesis. When intent is missing, the coach should describe facts and ask a focused question rather than block the entire recap.

#### 8. Letter grades

**Recommendation:** Do not make a letter grade part of the initial default experience. Revisit it only after a transparent process rubric exists and users show that a grade helps them.

### Decisions that can wait until prototype testing

- Whether the Coach is a full standalone destination or primarily contextual
- Exact confidence thresholds for recurring patterns
- Whether users can accept only part of a coach finding
- How long experiments remain active by default
- Which additional statistics appear under **More stats**
- Whether users can rename modules
- Whether opportunity context is shown for every reviewed trade or only when it changes the diagnosis

### Proposed defaults for the first prototype

- Daily Recap is the primary artifact.
- Coach Review sits inside the Daily Recap.
- **What drove the result?** appears after the primary finding.
- **Was the opportunity still there?** appears only when chart data provides a meaningful distinction.
- Four representative trades appear in the review queue.
- Full calculations and chart evidence remain collapsed.
- The system uses everyday trading language by default.
- Statistical names remain internal or appear only in methodology help.

---

## 19. Recommended next specification

The next document should be a **field-level content and interaction specification** with:

- Exact object schemas
- Required and optional fields
- Character limits
- Empty states
- Confidence thresholds
- Ranking logic
- Coach prompt contract
- Session-structure calculation contract
- Opportunity-context market-data contract
- Entry-time versus hindsight evidence rules
- Human-language terminology map
- Example copy for every state
- Component-to-data mapping
- Desktop and narrow-screen behavior
- Acceptance criteria

This content architecture is enough to begin a low-fidelity prototype. It should be refined into the field-level specification before the live coach is implemented.


---

## Revision 2 additions

This revision adds:

- Human-language guidance for analytical insights
- **What drove the result?** session-structure analysis
- Simple best/worst-trade sensitivity checks without exposing “trim review” terminology
- Ticker, setup, rule-break, and time-window concentration
- **Was the opportunity still there?** entry-time market context
- A formal distinction between information available at entry and hindsight
- Minimum market-data requirements
- New structured coach objects
- New empty and insufficient-evidence states
- Recommended product decisions and prototype defaults
