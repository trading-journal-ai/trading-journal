# UI turn audit — old work vs. the new white/composition direction

> Status: Historical audit · Created 2026-08-19 · Scope: Journal + Calendar
> Preserved 2026-09-10. Findings and source line numbers describe that checkpoint
> and have not been revalidated against the current app. Trading values and counts
> have been replaced with placeholders; this is not a new acceptance of the design.
> **Findings doc.** The process these feed into is
> [`DESIGN_PROCESS.md`](DESIGN_PROCESS.md).
> Companion to [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) ·
> [`COMPONENT_INVENTORY.md`](COMPONENT_INVENTORY.md)

The product is mid-turn to a brighter white theme and a new Journal/Calendar
composition, but old work keeps resurfacing in review.

**The strategy this doc serves (decided 2026-08-19):** finalize the **Journal**
first — including the calendar that now lives inside it — then bring the
**Calendar** page up to match it. Once those two are settled they define the
system, and the treatment rolls out to everything else. Prototype cleanup is
sequenced behind that, and handled by *rule* rather than by reviewing 22
surfaces one at a time.

The Journal is **not final** — it is a work in progress. But it holds the most
recent thinking, so it is the reference the rest gets measured against. The goal
of this pass is to get it **stable enough to build on**, not to freeze it.

**Nothing here requires deleting work to get stable.** The instability is that
in-progress work is invisible and the decisions about it do not survive — §4
fixes both.

**The calendar is one shared component.** Not two implementations kept in sync —
one component, sized to its container, with props toggling what each context
needs on or off. §3b is what happens without that.

Source of the new direction: the Claude Design handoff
`design_handoff_calendar_journal` (exported 2026-08-11) — Calendar Month,
Calendar Year, Journal Day v2, plus the written Calendar Design Review.

---

## 1. Why old work keeps appearing

Three independent causes, each needing a different fix — which is why it has
felt like whack-a-mole.

### 1a. 24 prototype routes ship ungated — 6 of them inside the real app

`/preview/*` has a `NODE_ENV === "production"` gate on 5 pages. Nothing else
does. These render in production builds today:

| Where | Count | Why it bites |
| --- | --- | --- |
| `src/app/(app)/**` mocks | 6 | **Inside the `(app)` route group** — real nav, real shell, one URL segment from the real page (`/journal/mock` next to `/journal`). Indistinguishable at a glance from production. |
| `src/app/review/**` | 9 | Old journal-recap directions, all still reachable. |
| `src/app/preview/data-viz/**` | 8 | Pinned exploration, but ungated while its own index page is gated. |

### 1b. ~39 MB of old assets are tracked in git

| Path | Size | What it is |
| --- | --- | --- |
| `samples/demo/tradingjournaldemo.db` | 20.6 MB | Committed SQLite demo seed, mostly candle data. See §5 |
| `samples/Journal Design/` | 15 MB | Vendored React dev builds — "Journal Ledher-Terminal", "Journal Editorial". *Previous visual directions for the journal* |
| `samples/landing-page/` | 3.5 MB | Static landing-page exploration |

None are routes, so nothing ever prunes them — but they are what file searches
and greps surface first.

### 1c. The triage tool exists, but no decision was ever recorded

`src/lib/preview/prototypeCatalog.ts` already catalogs 30 surfaces, and
`/preview` renders a Keep/Remove triage UI over it. **The decisions live in
`localStorage` only** (`preview-triage-v1`) — nothing durable, nothing
committed, nothing deleted. The inventory work is done; the commitment step
never happened. §4 replaces per-item triage with a rule.

---

## 2. The theme finding — `--background` and `--surface` are inverted

**The most important item in this doc**, because it is invisible until someone
builds a new component from the design spec.

The white turn landed in #64 (2026-08-10) and inverted the two base tokens. The
design-system export was taken 2026-08-11 and says its values are "lifted
verbatim from `src/app/globals.css`" — but it carries the **pre-#64** pairing:

| Token | Shipped `globals.css` (light) | DS export (light) |
| --- | --- | --- |
| `--background` | `#ffffff` — page is pure white | `#f6f8fa` — page is grey |
| `--surface` | `#f6f8fa` — panels/cards are grey | `#ffffff` — cards are white |
| `--panel` | `#f6f8fa` | `#ffffff` |

Two coherent but **opposite** models:

- **Shipped:** white page, grey cards. (This is the brighter white you want.)
- **DS export:** grey page, white cards.

Consequences:

1. **`--card` does not exist** — not in `globals.css`, and not in the DS bundle
   either. The calendar spec's `var(--card, var(--surface))` always resolves to
   `--surface`. Under shipped tokens that is `#f6f8fa`, so a *faithful* port of
   the Calendar spec renders **grey cells on a white page** — inverted from what
   the design shows. Any new component built to spec inherits this.
2. The shipped Calendar works around it: cells hardcode `bg-[var(--background)]`
   with `hover:bg-[var(--surface)]`. Looks right, semantically backwards, will
   not survive a refactor.
3. This inversion is **already causing visible drift** — the Journal's month
   grid uses `--surface` for cells while the Calendar page uses `--background`.
   Same object, two different greys. See §3b.
4. `DESIGN_SYSTEM.md` declares light the default (line 73) but its value table
   (lines 100–103) still lists the **dark** values as canonical.
5. `globals.css` `:root` is still the **dark** theme; light is only
   `:root[data-theme="light"]`. `RootLayout` sets `data-theme` server-side so
   nothing renders dark today — but "the base is dark" contradicts "light is
   default," and any context that loses the attribute falls back to dark.

**Recommendation: keep the shipped model, fix the definitions around it.** Don't
revert to the export. Promote light to `:root`, define `--card` explicitly, and
re-issue the DS export from the corrected `globals.css`.

This is the one item that should land **before** the Journal/Calendar work,
because both surfaces will be re-typed against these tokens.

---

## 2b. Why grey and other themes keep creeping back

Three separate mechanisms, which is why removing a grey background in one place
did not make grey go away.

### 2b-i. A stale stored theme silently outranks the product default 🔴

`ThemeBoot` reads `localStorage.theme` on mount and applies it, overriding the
server-rendered `data-theme`:

```tsx
const stored = localStorage.getItem("theme");
document.documentElement.dataset.theme = isTheme(stored) ? stored : DEFAULT_THEME;
```

`applyTheme()` (`src/lib/theme.ts:39`) writes that key whenever the theme toggle
is used. So **one click on the toggle, at any point in the past, pins that
browser to that theme forever** — across every branch, every rebuild, every
change to `DEFAULT_THEME`. The server sends `light`, then the client flips it
back to `daylight`/`evening`/`dark` after hydration.

This is almost certainly the "other themes creeping in" symptom. It is
per-browser and invisible in the code, so it looks random and won't reproduce
for anyone else. Immediate check, in the browser console:

```js
localStorage.getItem("theme")   // null = fine; anything else is pinning you
localStorage.removeItem("theme")
```

Fix: `DEFAULT_THEME` should win until the user *deliberately* chooses a theme in
Settings — the stored value should not silently outrank a changed product
default. Simplest version: version the key (`theme-v2`), so the old pin is
abandoned.

### 2b-ii. `--surface` *is* grey, and 77 places ask for it

In the light theme `--surface: #f6f8fa`. Production surfaces reference
`bg-[var(--surface)]` / `bg-[var(--panel)]` **77 times across 29 files**.
Removing a grey background in one component does not remove grey — the token
itself is grey, everywhere it is used.

This is the §2 inversion biting again: pre-#64 `--surface` meant *white card*,
post-#64 it means *grey fill*. Every call site written before the turn now reads
backwards.

Fix ordering matters: settle `--card` / `--surface` semantics (Phase 0), *then*
sweep call sites. Sweeping first just re-does the work.

### 2b-iii. Two calendars, one of which is older

Covered in §3b — the same surface built twice, both live.

---

## 3. Where Journal and Calendar actually stand

Verified against the running app on 2026-08-19.

### Journal Day — converged ✅

`/journal` matches the Journal Day v2 design: day rail, page title with
Today/Previous/Next, zoom tabs (Day/Week/Month), section tabs
(P&L/Horizon/Risk/Coach), intraday chart with ticker rail beside it. No
structural work needed.

### 3b. There are two different calendars — this is the real problem 🔴

The Journal's Month scope renders its **own** month grid
(`JournalDayDataViews.tsx`, modified 2026-08-13 — the newest UI work in the
repo). The Calendar page renders a **different** one (PR #71, 2026-08-10). They
disagree on nearly every decision:

| Decision | Journal month grid (newest) | Calendar page (#71) |
| --- | --- | --- |
| Cell fill | tinted — `color-mix(in oklch, var(--green) 8%, var(--surface))` | none — flat, hairline grid only |
| Cell background | `--surface` (grey) | `--background` (white) |
| Weekday header | `MON TUE WED` uppercase 11px, tracking .08em | `Monday Tuesday` sentence case 12.5px |
| Day number | mono 12px semibold | sans 12.5px medium |
| P&L | mono 13px, signed `+<amount>` | sans 17px medium, `<amount>` |
| Meta line | `<N> trades` | `<N> trades · <rate>%` |
| Week-total column | none | yes, 205px 6th column |
| Grid rule | `gap-px bg-[var(--hairline)]` | `gap-px bg-[color-mix(--foreground 6%)]` |
| Month stats | bordered stat cards | bare stat row |
| Cell click | not clickable | links to the journal day |
| color-mix space | `oklch` | `srgb` |

Add the Claude Design handoff and there are **three** specifications of one
object. This is the single largest source of "we keep seeing older work" —
it is not old routes, it is the same surface built twice, live, in production.

**Resolved 2026-08-19 — flat cells. See §3d.** Three implementations of cell
tint exist at three strengths; all of them go.

Note: `CalendarCell` is *not* a real component anywhere. It is a Claude Design
primitive plus an unchecked to-do at `COMPONENT_INVENTORY.md:86`. Extracting it
for real is the unification vehicle — see §5.

### 3d. The canonical cell — decided 2026-08-19 ✅

**Design language: clean, typographic, forward and central.** Hierarchy and
color on the *numerals* carry the meaning. The grid stays scannable, clear and
light.

| Rule | |
| --- | --- |
| Cell background | **Flat.** The only two fills are **hover** and **active/selected day** |
| Weighted colour | **No.** No darker-green-for-a-bigger-day ramp, no heat-map saturation |
| Where colour lives | On the P&L numeral (`--green` / `--red` / `--muted` at zero) |
| Structure | Hairline grid + whitespace + type scale — not fills |

This retires all three current treatments:

| Location | Today | Action |
| --- | --- | --- |
| `calendar/page.tsx:599` (Year mini-months) | `color-mix(in oklch, var(--green) 13%, transparent)` | Remove |
| `JournalDayDataViews.tsx:704` (Journal month) | `color-mix(in oklch, var(--green) 8%, var(--surface))` | Remove |
| Calendar Month grid | already flat | Keep — this is the reference |

It also settles the doc conflict: the Claude Design review's *"no filled cell
backgrounds"* wins, and `DESIGN_SYSTEM.md:149` ("avoid unless very subtle")
should be tightened to match rather than left as a loophole.

**This decides structure, not values.** "No fills except hover and active" is a
composition rule and is settled. *Which* green, *which* grey, and the exact hover
value remain open and are expected to keep moving — see §5b. The two are
independent: the component can be built now and re-tinted later without a
rewrite, because it reads tokens rather than hardcoding colour.

*Note this is the one place where "most recent is right" does not hold — the
Journal's newer grid is the tinted one, and the older Calendar page is already
correct.*

### Calendar Month page — ~80% converged ⚠️

Correct today: 5 weekday columns + 205px week-total column, 1px grid-gap rules,
96px cells, 17px signed P&L, 12.5px day number, `<N> trades · <rate>%` meta, the four
day states.

| Gap | Design says | Shipped |
| --- | --- | --- |
| **Inline expander (Model A)** | Click a traded day → band slides open under that week (200ms), day stat row + light ledger + "Open in journal" | Not built. Cell is a `<Link>` straight to `/journal?date=` — that is Model C, the *escape hatch*, not the decision |
| **Range filter** | Design review rejects it outright | **Kept — decision 2026-08-19.** Capability stays; its out-of-range rendering is a bug, see §3c |
| **Selected state** | `color-mix(in srgb, var(--accent) 6%, ...)` on the open day | No selection concept |
| Cell surfaces | traded = card, rest/future = mixed-down | Inverted per §2 |

### 3c. Range filter — keep the capability, fix the rendering ⚠️

We are deliberately **not** following the design review's "no filters on
Calendar" decision. The filtering stays. But evaluating what ships today turned
up a real defect.

`filterByRange` (`calendar/page.tsx:96`) **drops out-of-range days from the
aggregate map entirely** rather than dimming them. A traded day outside the
range falls through to `journalDayState(0, null)` → `unconfirmed_empty` and
renders as an empty cell with an actionable **"Mark no-trade"** button.

Historical reproduction: at
`/calendar?m=<month>&range=custom&from=<from>&to=<to>`, traded dates outside
the selected range rendered as "Mark no-trade". Private dates and trade counts
are omitted; recheck with synthetic fixtures before treating this as a current bug.

**Data is safe** — `setNoTradeDayAction` re-checks the database and returns early
when the day has trades (`src/app/journal/actions.ts:49`). Nothing can be
corrupted. But the calendar misreports real trading days as empty, and the
button silently does nothing.

The fix is the behavior the design review itself cites: *"the calendar keeps its
full shape and days outside the range simply lose their color."* Dim, don't drop.

Secondary: the filter's chrome is pre-turn — `shadow-xl` on the popover, where
the system sanctions only `--shadow-popover`.

### Calendar Year — still old work ❌

Visibly a different era from Month view, side by side in one feature:

| | Design | Shipped |
| --- | --- | --- |
| Mini-month columns | 5 (weekdays only) | 7 (`YEAR_WEEKDAYS` includes Sat/Sun) |
| Tile grid | 4-column | `xl:grid-cols-3` |
| Day cell | 22px, radius 3px, tinted, readable numeral | loose default grid |
| Tile chrome | `--card`, 1px `--hairline`, radius 8px, 14px padding | grey `--surface` panels |
| Header order | h1 above tabs (as Month) | tabs above h1 |

---

## 4. One Review surface — make the work visible, record the verdicts

*(Rewritten 2026-08-19. Supersedes the earlier "delete by default" proposal,
which was the wrong instinct: the problem is not that too much exists, it is
that none of it is visible and no decision about it survives.)*

### Why work disappears — three mechanical causes

**1. Nothing is in the nav.** Every prototype is URL-only. If you do not
remember `/review/journal/coach-recap-spine`, it does not exist. Work is not
lost, it is unreachable.

**2. Verdicts are stored in `localStorage`.** Both triage tools record Keep /
Remove to the browser only:

| Tool | Key |
| --- | --- |
| `PrototypeTriage` | `preview-triage-v1` |
| `DesignArtifactReview` | `design-artifact-triage-v1` |

So a decision dies on a cache clear, never reaches another browser, is invisible
in code review, and cannot be read by anyone — or any agent — working in the
repo. **Every judgement you have made about this work has already evaporated.**
That is the whole problem, and it is a five-line fix.

**3. The tracking is itself fragmented.** Three entry points and two catalogs:

| Surface | Pages | Catalog |
| --- | --- | --- |
| `/review/**` | 10 | — |
| `/preview/**` | 13 | `prototypeCatalog.ts` · `designArtifacts.ts` |
| `/design-system` | 1 | `designSystem.ts` |

(`/demo` does not exist, though `NavLinks.tsx:15` still references it — dead
code.) You asked whether it is review or preview or demo. It is two of them,
plus a third you did not mention. Not knowing is the correct response to this.

### The system

**One route. In the nav. Verdicts committed to the repo.**

1. **Consolidate to `/review`.** Move the `/preview` triage index and its
   catalogs under it; `/review` is the name you reach for, and the name that
   describes the activity. `/design-system` stays separate — it is an instrument
   (§5), not work under review.
2. **Add a `Review` nav item**, rendered only when
   `process.env.NODE_ENV !== "production"`. Development gets a front door; the
   real product never shows it.
3. **Move verdicts from `localStorage` into the catalog file**, so they are
   committed, greppable, reviewable in a PR, and readable by anyone picking the
   work up.

### The verdict vocabulary

The state you asked for — *"we tried it, it didn't work"* — is the one the
current Keep/Remove pair cannot express, which is why pivots repeat.

| Verdict | Meaning | Then what |
| --- | --- | --- |
| `active` | Current direction, in play | Nothing — this is live work |
| `keep` | Reference worth holding | Stays indefinitely |
| `paused` | Deliberately parked (data-viz v1–v7) | Resume point recorded |
| `tried` | **We built it, it did not work** | Delete the code, **keep the note** |
| `superseded` | Replaced by a named successor | Delete the code, keep the pointer |

Extend the existing `PrototypeEntry` type — the catalog already carries `id`,
`file`, `title`, `description`, `group`, `pinned`, and derives git dates:

```ts
verdict: "active" | "keep" | "paused" | "tried" | "superseded";
verdictNote?: string;   // why it did not work / what replaced it
verdictDate?: string;   // YYYY-MM-DD
```

**The note outlives the code.** When a `tried` entry is finally swept, its row
moves to `ARCHIVE.md` with the reason intact. That is what stops the same dead
end being re-explored in three months — not the prototype itself, which was
never the valuable part.

### What this changes about cleanup

Deletion stops being a bulk event and becomes a **consequence of a recorded
verdict**. Nothing is removed until it is marked `tried` or `superseded` with a
reason. Sweeping is then mechanical and safe, and can happen whenever — the
knowledge is already preserved.

**Stabilization, not pruning.** Nothing needs deleting to get stable. Making the
work visible and the verdicts durable *is* the stabilization.

### Sequence

1. Add the `Review` nav item (dev-only) + index at `/review`. **Small — do it
   early; it is what makes the rest legible.**
2. Merge `prototypeCatalog.ts` + `designArtifacts.ts` into one catalog with the
   verdict fields. Seed every entry as `active` — no judgements assumed.
3. Walk the list once, at whatever pace, assigning verdicts. This is the pass
   that ends the "I don't know what's up or down" state.
4. Sweep `tried` / `superseded` entries when convenient, tombstones to
   `ARCHIVE.md`.
5. Delete the dead `/demo` reference in `NavLinks.tsx:15`.

### Recovery is proven, not theoretical

Verified 2026-08-19 by restoring a 410-line doc deleted three weeks earlier in
`e4e593f`:

```bash
git log --diff-filter=D --oneline -- "docs/**/<FILENAME>"   # find the deleting commit
git show <commit>^:<full/path> > recovered.md               # print/restore it
```

Caveat from `ARCHIVE.md` still applies: history *rewrites* destroy this. This
repo had one (2026-07-11, to purge private P&L data) and lost two docs with it.
Normal delete commits are safe.

---

## 5. Design tooling — protected, and the reason colours need not be final

The project has a working loop for exploring theme against the real codebase.
**This is tooling, not prototypes.** The §4 delete-by-default rule does not
touch it.

| Piece | What it does |
| --- | --- |
| **`/design-system`** (`DesignSystemBrowser.tsx`) | Live token explorer. Reads the *computed* value of every token off the DOM, re-reads on `data-theme` change via `MutationObserver`, and renders the **real** components against them. Not a mockup — a mirror |
| `src/lib/designSystem.ts` | The token registry behind it (`TOKEN_GROUPS`, `ALL_TOKEN_NAMES`, `TYPE_ROLES`) |
| `ThemeSettings` | Four-theme switcher, embedded in the browser above |
| **Browser Tweaks** (MCP) | The editing half — `get_theme_snapshots` saves named sets of CSS-variable values; `get_pending_tweaks` returns before/after class diffs to apply back to source. This is the Claude-Design-style edit loop |
| **DesignSync** (`/design-sync`) | Keeps the local component library and the Claude Design project in sync, component by component |

*(No theme snapshots are saved as of 2026-08-19 — the queue is empty.)*

### What this means for sequencing

**Colour values do not need to be finalized to proceed.** Phase 0 is *not*
"choose the palette." It is narrower — fix **which token means what**:

| Phase 0 settles (blocking) | Stays open (explore freely) |
| --- | --- |
| Does `--surface` mean *card* or *grey fill*? | Which grey |
| Does `--card` exist at all? | Which green / red |
| Is light the `:root` baseline? | Hover and active fill values |
| Which token each component reads | Whether daylight/evening survive |

Once the *semantics* are stable, every component reads tokens and the tooling
can keep moving the *values* underneath — including after the calendar ships.
The §2 inversion is painful precisely because it was a semantics change made
while call sites assumed the old meaning; that is the class of change worth
freezing, not the palette.

---

## 6. Demo data — retire the committed database

**Decision 2026-08-19: the 20.6 MB committed demo database goes.**

What is there now:

- `samples/demo/tradingjournaldemo.db` — 20.6 MB SQLite seed, tracked in git,
  mostly candle data.
- `npm run build` runs `verify:demo-db` first, so **the demo database is a hard
  build dependency**. The build fails without it.
- `demo.trading-journal.ai` ran this app with `DEMO_READ_ONLY=true` against that
  seed. Automatic deployments are currently **disabled** (`vercel.json`,
  PR #69), so nothing is shipping from it today.
- `isDemoReadOnly()` branches through import, candle fetching, and the calendar's
  no-trade controls — a second product mode maintained everywhere.

**Decision 2026-08-19: remove it.**

1. Delete `samples/demo/tradingjournaldemo.db` (+ `-shm` / `-wal`) from the repo
   and from git tracking.
2. Drop `verify:demo-db` from the `build` script, so the build no longer depends
   on a committed database. Keep the script itself for local seeding.
3. Leave `isDemoReadOnly()` in place for now — it is load-bearing in import,
   candle fetching, and the calendar's no-trade controls. Retiring the dual mode
   is a separate, later change.

If a public demo comes back later, it should be **static sample data, not a
database** — enough to show how the product works, simple enough to live
alongside the marketing site.

---

## 7. Path forward

Sequenced so each phase leaves the app shippable, and so the Journal defines the
system before anything rolls out.

**Phase 0 — token *semantics*, not palette** *(do first; everything re-types
against it. Colour values stay open — see §5)*
1. Promote light to `:root` in `globals.css`; keep `[data-theme="light"]` as an
   explicit alias.
2. Define `--card` in all four themes so the design spec's `var(--card, …)`
   resolves correctly.
3. Update the `DESIGN_SYSTEM.md` value table to light-first.
4. Re-issue the Claude Design export from the corrected `globals.css`, so the
   export and the code stop disagreeing about what `--surface` means.

**Phase 0.5 — stabilize what you can see** *(small; do alongside Phase 0)*
1. Version the theme storage key so stale pins are abandoned (§2b-i). All four
   themes stay; `light` is the default and must win until deliberately changed.
2. Add the dev-only `Review` nav item + `/review` index, and move verdicts into
   the committed catalog (§4 steps 1–2). **This is what stops work
   disappearing** — worth doing before the Journal work, not after.
3. Sweep `bg-[var(--surface)]` call sites against the corrected semantics
   (§2b-ii) — after Phase 0, not before.

**Phase 1 — build the one shared calendar component** *(the defining work)*
1. Extract `<MonthCalendar>` (+ its cell) as **one component**, sized to its
   container, with props for what varies:

   | Prop | Journal month | Calendar page |
   | --- | --- | --- |
   | `density` | compact | comfortable |
   | `showWeekTotals` | false | true |
   | `interactive` | day → journal | day → expander/journal |
   | `showAccuracy` | false | true |

   Flat cells per §3d; hover and active are the only fills.
   `COMPONENT_INVENTORY.md:86` already queues this extraction.
2. Rebuild the Journal's Month scope on it. Journal is the reference — stable
   enough to build on, not frozen.

**Phase 2 — Calendar page becomes the second consumer**
1. Swap its month grid for the same component. One definition, two consumers —
   the §3b divergence cannot recur.
2. Rebuild Year view on the same cell (5-column mini-months, 4-column tiles,
   matching header order), flat per §3d.
3. Fix out-of-range rendering (dim, don't drop) so filtered days stop posing as
   "Mark no-trade" days; retheme the popover to `--shadow-popover`.
4. Decide on the inline expander (§8 Q1).

**Phase 3 — roll out**
Apply the settled treatment to Dashboard, Trades, Analytics.

**Phase 4 — cleanup**
Sweep entries already marked `tried` / `superseded` (§4), tombstones to
`ARCHIVE.md`. Remove the demo database per §6. No bulk deletion — only recorded
verdicts.

*Cleanup sits last deliberately: the prototypes are harmless once the canonical
surfaces exist, and deleting them earlier risks discarding something Phase 1
turns out to want.*

---

## 8. Open questions

1. **Inline expander.** Still worth building the Model A band on the Calendar
   page, now that the Journal's own month view is the primary month surface? It
   may be redundant — and it is the one open item that changes the component's
   prop surface.
2. **Week-total column.** Ships on Calendar, absent from the Journal grid,
   "not yet committed" per the design review. Confirming it as a
   `showWeekTotals` prop (as Phase 1 assumes) is probably enough.
*(Themes resolved — see below.)*

### Resolved

| | Decision | Date |
| --- | --- | --- |
| Cell treatment | Flat — hover + active only, no weighted colour (§3d) | 2026-08-19 |
| Calendar architecture | One shared component with props, not two grids | 2026-08-19 |
| Range filter | Kept on Calendar; fix out-of-range rendering (§3c) | 2026-08-19 |
| Demo database | Remove; static data if a demo returns (§6) | 2026-08-19 |
| Design tooling | Protected — not prototypes, never in the delete scope (§5) | 2026-08-19 |
| Themes | **Keep all four.** White (`light`) is the default | 2026-08-19 |
| Prototype handling | One `/review` surface in nav + committed verdicts, not bulk deletion (§4) | 2026-08-19 |
| Colour values | Stay open; only token *semantics* are frozen in Phase 0 (§5) | 2026-08-19 |
