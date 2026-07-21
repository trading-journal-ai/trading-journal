# Journal Navigation — one surface, one vocabulary

> Status: decision captured 2026-07-21 · implementation is its own later pass
>
> Companion to [JOURNAL_DESIGN.md](JOURNAL_DESIGN.md) and DATA_MODEL §9 step 3
> (one canonical template). This locks the navigation model so nothing further
> gets built on the archive-page split.

## The problem (observed, twice)

The journal currently has **two Day/Week/Month systems wearing the same
clothes**:

1. **Route-level page modes** — `/journal?date=…` renders the full day
   workroom; `/journal?month=…` renders a differently-shaped archive where
   days appear as summaries (no coach flow, no entry-context reasons). The
   left sidebar navigates this system.
2. **The journal module's tabs** — Day / Week / Month × P&L / Trades /
   Process / Coach, client state inside the module, comparing the focused day
   against its week and month.

Same three words, unrelated mechanisms, one of them silently changing the
whole page. Cost is not hypothetical: the owner twice concluded that UI had
been *removed* ("ghost in the system") when the route had merely switched to
the archive shape (and once when the account cookie switched). A navigation
model that can masquerade as data loss is wrong.

## The decision

**The journal is one continuously scrolling surface of full-fidelity day
entries. Navigation moves you along it; it never changes the page's shape.**

1. **One canonical day template.** Every day entry renders the same
   structure: header + stat strip, session verdict, process read, module,
   annotation prompts, coach flow. There is no "summary day" vs "full day"
   split — the difference between a day in passing and a day in focus is
   **collapse state, not template**.
2. **Progressive disclosure instead of amputation.** Heavy sections — the
   coach review flow, and any section that makes "all the data out at once"
   overwhelming — are **collapsed by default**, showing a one-line status
   (e.g. "✳ Coach review · generated · open"). The focused day (deep-linked
   `?date=…`, or today) auto-expands. This is what makes full-fidelity days
   affordable in a continuous scroll, and it retires the need for a separate
   archive shape. (Also aligns with DAILY_RECAP_FLOW's original "compact
   recap, quiet affordance to open" principle.)
3. **Month and week are navigation positions, not places.** The sidebar keeps
   its good behavior — pick a month, then continuously scroll week by week
   with scroll-spy — but what it scrolls is the one canonical surface. Route
   params: `?date=` focuses (and expands) a day; the month/week in the URL is
   only a scroll anchor. No route renders a different page kind.
4. **The module's tabs own the analysis vocabulary.** "Day / Week / Month" as
   *comparison scope* lives exclusively in the module (client state, already
   holds week/month comparison data and per-scope coach reviews). After
   consolidation this is the only Day/Week/Month the user ever sees.
5. **The active account is part of the surface's identity.** Which account
   (and its date range) is being displayed must be visible on the journal
   surface itself, and empty days say *why* they're empty ("no trades on
   Paper Account this day") — silent empties are how navigation gets
   mistaken for data loss.

## What this retires

- The `?month=` archive as a distinct page shape, and the
  `archiveLinkMode: "legacy" | "review-module"` split.
- The summary-vs-full rendering split in `TradeJournalReview`
  (`showReviewModule` / `showContextDetails` / `showLegacyPnl` flags become a
  collapse-state concern of one template).
- The **"Open day review · coach & annotations →"** links added 2026-07-21 —
  an explicit interim band-aid. Once every scrolled day *is* the full day,
  the door to the full day is unnecessary.

## Performance note (why this is feasible)

Entry-context computation (candle joins) should be lazy: computed for the
focused/expanded day, on-demand as days expand. Never eagerly recompute for
every day in a scrolled month — dead/delisted symbols would re-attempt
rate-limited candle fetches per render. Same rule for any future heavy
per-day computation: **expansion is the trigger, not scroll.**

## Migration requirements (must-not-forget)

1. **Re-home month/week coach-review generation before retiring the page
   mode.** The `?month=` page is currently what supplies `scope: "month"` for
   generating monthly LLM reviews; that trigger moves to the module's
   Week/Month → Coach tab, and must land *before* the archive shape is
   removed or the feature silently disappears.
2. **Collapse must be placeholder-render, not hidden-mount.** A collapsed
   day section renders a cheap status line only; the module, charts, and
   coach flow mount on expand. Hiding mounted content would make a
   month-length scroll pay full render cost for ~22 days.

## Open questions (settle during implementation)

1. Which sections are always-visible per day vs collapsed? (Working default:
   verdict + process read + stat strip visible; module, annotation prompts,
   coach flow collapsed except on the focused day.)
2. Does collapse state persist per user (remember what I keep open) or reset
   per visit?
3. Virtualization/pagination for long scrolls (a month is ~22 entries; likely
   fine unvirtualized, but measure).
4. Where do week/month LLM coach reviews surface once the archive is gone?
   (Working answer: the module's Week/Month → Coach tab, same as day.)
