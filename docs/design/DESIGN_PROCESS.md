# Design process — how UI work moves from exploration to system

> Status: Historical proposal · Created 2026-08-19 · Preserved 2026-09-10
> Owner: Justin. Recommendations describe the August exploration; they are not
> a current acceptance or an instruction to implement, merge, or delete work.
> Use `AGENTS.md` and `DESIGN_SYSTEM.md` for current working rules.
> Findings that motivated this: [`UI_TURN_AUDIT.md`](UI_TURN_AUDIT.md)

## Why this exists

We are still **designing** this product — look and feel *and* functionality, at
the same time. That is the normal state for now, not a problem to fix.

What is missing is a **process**. Work has been ad hoc: an idea gets prototyped,
looked at, judged — and then the judgement evaporates and the prototype becomes
invisible. So the same questions get re-asked and the same directions get
re-explored.

This doc is the process. It is deliberately light — this is a local-first app
with one developer; ceremony is not the goal, **not losing work** is.

### The three failure modes it fixes

| Failure | Evidence | Fix |
| --- | --- | --- |
| Work becomes invisible | 23 prototype surfaces, none in nav, URL-only | §2 — one link, in nav, indexed by category |
| Decisions evaporate | Verdicts stored in `localStorage` (`preview-triage-v1`, `design-artifact-triage-v1`) | §3 — verdicts committed to the repo |
| Tracking drifts from reality | 6 of 12 atoms in `COMPONENT_INVENTORY.md` marked `- [ ]` are **already built** (`Eyebrow`, `Money`, `Dot`, `StatBlock`, `Button`, `Tag`) | §5 — one promotion ladder, checked at the point of change |

---

## 1. The two tracks

Run in parallel; they meet at the component layer.

**Track A — Consolidate and review.** Get everything behind one link, categorized,
with a durable verdict on each. Ends the "I don't know what's up or down" state.

**Track B — Establish the baseline.** Decide what the Trading Journal actually
*is* right now — composition and functionality — and from that, what becomes a
shared component.

Track A makes Track B possible: you cannot decide a baseline against work you
cannot see.

---

## 2. Track A — one link, indexed by category

Today there are three entry points and no front door:

| Surface | Pages |
| --- | --- |
| `/review/**` | 10 |
| `/preview/**` | 13 |
| `/design-system` | 1 |

`/review` and `/preview` are the same idea with two names. Consolidate:

1. **Everything under `/review`.** One route, one index.
2. **A `Review` nav item.** This is a local app — no one else sees it, so it does
   not need elaborate gating. Simple and findable beats clever.
3. **`/design-system` stays separate and linked.** It is an instrument, not work
   under review — it renders the *real* components against live tokens.
4. **Index by category**, not by folder:

   | Category | What lives there |
   | --- | --- |
   | Journal | Day, week, month recap directions |
   | Calendar | Month, year, cell treatments |
   | Coach | Recap voice, chat, playbook |
   | Data viz | The v1–v7 studies (paused) |
   | Dashboard | Layout directions |
   | System | Tokens, atoms, tag taxonomy |

---

## 3. The loop

Every piece of design work runs this cycle. It is four steps.

```
   EXPLORE  →  REVIEW  →  VERDICT  →  ADOPT or RETIRE
      ↑                                     │
      └──────── note survives ──────────────┘
```

**1 · Explore.** Build the prototype. No constraints — this is where look, feel
and functionality get tried. Register it in the catalog when created, so it is
visible from day one.

**2 · Review.** Look at it against the current baseline (§4). The question is
not "is this good" but "**is this better than what we have, and in what specific
respect**."

**3 · Verdict.** Record it *in the repo*. This is the step that has been missing.

| Verdict | Meaning | Consequence |
| --- | --- | --- |
| `active` | Current direction, in play | Nothing yet |
| `keep` | Reference worth holding | Stays indefinitely |
| `paused` | Deliberately parked | Record the resume point |
| `tried` | **Built it, did not work** | Delete code, **keep the note** |
| `superseded` | Replaced by a named successor | Delete code, keep the pointer |

Every verdict carries a **reason** and a **date**. The reason is the durable
artifact — the prototype never was.

**4 · Adopt or retire.** Adopted work updates the baseline (§4) and, if it
recurs, climbs the promotion ladder (§5). Retired work gets swept, and its
reason moves to `ARCHIVE.md`.

> **The rule that stops circular pivots:** before exploring a direction, grep the
> catalog and `ARCHIVE.md` for `tried`. If we already tried it, the note says why
> — start from there rather than from zero.

---

## 4. Track B — the baseline

**The baseline is a written description of what a surface currently is**:
its composition (what elements appear, in what order) and its functionality
(what it does). Without one, "elements get added and removed" with nothing to
diff against — which is exactly what happened to the Journal.

### Why the Journal needs this first

Its composition already varies by scope, and this is written down nowhere:

| Scope | Section tabs |
| --- | --- |
| Day | P&L · Trades · Chart read · Coach |
| Week | P&L · Edge · Alignment · Coach |
| Month | P&L · Horizon · Risk · Coach |

Three different compositions of one surface. Some of that is deliberate; some is
drift. Nothing currently distinguishes the two.

### Recording a baseline

For each surface, one short section capturing:

1. **Composition** — the elements, in order, with what each is for.
2. **Functionality** — what a trader can *do* here.
3. **Variants** — how it changes by scope/context, and *why* each difference is
   intentional.
4. **Open** — known-unstable parts, so they are not mistaken for settled.

Baselines live in the surface's own design doc (e.g.
[`JOURNAL_DESIGN.md`](JOURNAL_DESIGN.md)) and are updated when a verdict is
adopted — not before.

### Order

**Journal first**, because it holds the most recent thinking and now contains a
calendar. Then Calendar, which consumes the same component. Then the rest.

---

## 5. Track B — the promotion ladder

The question "what becomes a shared component" gets a rule instead of a
case-by-case debate.

| Tier | Lives in | Criterion |
| --- | --- | --- |
| **1 · Private helper** | Inside the feature file | Used once. Default for new work — do **not** promote early |
| **2 · Feature module** | `src/components/` | Owned by one feature, with its own data/behavior |
| **3 · System atom/pattern** | `src/components/ui/` | **Used on 2+ surfaces**, theme-driven, no feature-specific data |

**The trigger is the second use.** When a pattern is needed on a second surface,
promote it *then* — not on first sight (speculative), not on the fifth
(divergence has already set in). The Journal/Calendar month grid is the textbook
case: the second use arrived and nothing promoted, so two versions now exist.

### Promotion checklist

- [ ] Reads tokens only — no hardcoded colour
- [ ] Props cover the known variants (size/density, what is shown, interactivity)
- [ ] Rendered on `/design-system` so the system mirrors code
- [ ] Old inline copies replaced, not left alongside
- [ ] `COMPONENT_INVENTORY.md` checked off **in the same commit**

That last box is why the inventory drifted — six atoms were built and never
checked off. Checking it at the point of change is the only version that holds.

### Current ladder state

Built (`src/components/ui/`): `Button` · `CoachVoice` · `Dot` · `Eyebrow` ·
`MetricStrip` · `Money` · `PeriodTabs` · `StatBlock` · `Tag`

Not yet built: `SegmentedControl` · `OpenSection` · `ReportsStatsMatrix` ·
`LedgerTable` · `HBar`/`DivBar`

**`MonthCalendar` is built** (`src/components/MonthCalendar.tsx`): Calendar and
Journal Month share the same summary, cells, weekly totals and expanding ledger.
Cells remain private to that component. See [Calendar design](CALENDAR_DESIGN.md).

Next candidate:

- **Journal section primitives** — `JournalDayDataViews.tsx` holds ~25 private
  helpers (`SectionLabel`, `MetricGrid`, `Metric`, `ReadFirst`,
  `EvidenceBoundary`, `TradeTable`, `SessionTable`, `CoachRead`). These are de
  facto system parts living inside one 940-line file. Promote the ones the
  Calendar and Dashboard also need.

---

## 6. What is stable vs. what is moving

Not everything is equally in flux, and treating it that way is what makes it
feel unstable. Three tiers:

| Tier | Examples | Change policy |
| --- | --- | --- |
| **Frozen** — costly to change, breaks call sites silently | Token *semantics* (what `--surface` means), whether `--card` exists, `:root` baseline | Change deliberately, sweep call sites in the same pass |
| **Settled** — decided, revisit only with a reason | Flat calendar cells (hover + active only), four themes with white default, one shared calendar component | Reopen via a recorded verdict |
| **Moving** — expected to change, safe to change | Colour *values*, spacing refinements, section copy, which tabs appear | Explore freely in the tooling |

**Frozen ≠ final.** It means "changing this has blast radius, so do it as a
deliberate pass." The §2 token inversion in the audit is what happens when a
frozen-tier change is made casually: `--surface` flipped meaning and 77 call
sites silently started reading backwards.

Colour values are **moving**, which is why nothing here waits on the palette.

---

## 7. Where truth lives

| Question | Source of truth |
| --- | --- |
| What are the rules? | [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) |
| What are the values? | `src/app/globals.css` |
| What does it look like right now? | `/design-system` (live, reads computed tokens) |
| What exists and what did we decide? | The `/review` index + catalog verdicts |
| What is this surface supposed to be? | The surface's design doc (§4 baseline) |
| What did we try that failed? | Catalog `tried` verdicts, then `ARCHIVE.md` |
| How do we work? | This doc |

---

## 8. Definition of done, for a surface

A surface is "stable enough to build on" — not final — when:

- [ ] Its baseline is written down (§4)
- [ ] Repeated patterns are promoted (§5), not copy-pasted
- [ ] It reads tokens only
- [ ] Competing directions carry a verdict — nothing sits unjudged
- [ ] Its open questions are listed, so unstable parts are not mistaken for settled

Note what is *not* required: final colours, final copy, or every question
answered. Stable means **safe to build on**, not finished.
