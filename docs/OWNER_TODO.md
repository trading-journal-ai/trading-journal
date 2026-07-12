# Owner To-Dos & Decisions

> **Purpose:** the running list of things that need **Justin** specifically —
> decisions only you can make and content only you can author. This is the
> bottleneck-buster: if it's here, the build is (or will be) waiting on it.
> **Updated:** 2026-07-11
>
> Format: `[ ]` open · `[x]` done · **(rec: …)** = my recommendation, so where you
> agree you can just check it off. Each item links to where it came from.

---

## ⭐ Start here — what actually gates the next build

The list below is long because it spans decisions + owner-authored content +
cleanup + backlog. But only a few things truly block forward motion right now:

1. **Define the real setups** (§C) — blocks coach-per-trade review and by-setup
   stats. Highest leverage.
2. **Playbook/rules storage + identity** (§A "Setup & playbook model" + §C) —
   blocks the v2 Coach Review's rule references.
3. **Raw broker-file retention** (§A) — the one decision with no default yet.

Everything else can trail behind these without stalling the build.

---

## A. Decisions to confirm (gating the recap build)

These are consolidated from [DATA_MODEL.md §8](DATA_MODEL.md) and
[COACH_RECAP_CONTENT_SPEC.md §18](product/COACH_RECAP_CONTENT_SPEC.md). Most have a
recommended default — you mostly just need to confirm or override.

- [ ] **Daily output naming** — Daily Recap (journal artifact) *containing* a
  Coach Review (section). **(rec: adopt)**
- [ ] **Raw broker-file retention** — do we keep the original uploaded ToS/DAS CSV
  so "export everything" can hand it back, or accept normalized-lossless only?
  **(rec: decide now while the model is in focus; leaning "retain")** — this is the
  one with no default yet.
- [ ] **Review session window** — ticker-day chart shows **07:00–20:00 ET**
  (premarket→after-hours, overnight excluded). **(rec: adopt; data confirmed present)**
- [ ] **Min sample for "What drove the result?"** — only show a session-level
  classification at **≥5 closed trades**; below that, describe the largest
  contributor without calling the day broad-based. **(rec: adopt)**
- [ ] **Outcome color default** — tuned green/red by default, teal/coral as an
  accessibility setting. **(rec: adopt)**
- [ ] **R-multiples** — dollars/percent by default; R only when planned risk is
  recorded. **(rec: adopt)**
- [ ] **Trade-intent required** — lightweight setup + optional trigger/stop/thesis;
  coach asks a question when intent is missing rather than blocking. **(rec: adopt)**
- [ ] **Letter grades** — keep out of the default experience. **(rec: adopt)**

### Setup & playbook model (net-new, from the 2026-07-11 doc sweep)

These come from [ONBOARDING_SETUP_FLOW.md](product/ONBOARDING_SETUP_FLOW.md),
[TRADING_COACH.md](coach/TRADING_COACH.md), and
[ANALYTICS_RESEARCH_PLAN.md](analytics/ANALYTICS_RESEARCH_PLAN.md). They cluster
with the setups/rules work in §C and directly shape the rule-identity gap.

- [ ] **Playbook storage model** — setup/rule definitions as **database rows**,
  **markdown-backed docs**, or **both**? This is the concrete form of "give rules
  stable identity" (§C). **(rec: DB rows for identity + citation; markdown as an
  authoring/export view)**
- [ ] **Is "setup" a first-class structured field** (separate column with stable
  ids), or does it stay a free `tag`? Coach evaluation and by-setup stats want the
  former. **(rec: first-class field)**
- [ ] **Ship a starter setup template** (e.g. for active momentum traders), or is
  every setup user-authored from empty? **(rec: offer a starter, fully editable)**
- [ ] **Privacy stance on AI-assisted broker-adapter generation** — entirely
  local, or allow explicit opt-in to send anonymized samples to a hosted model?
  **(rec: local by default; opt-in only, never automatic)**

## B. Recap-flow product questions (your call)

From [DAILY_RECAP_FLOW.md](product/DAILY_RECAP_FLOW.md) and
[NOTE_MODEL.md](product/NOTE_MODEL.md) open questions:

- [ ] After importing today's trades: auto-open the recap editor, or show an
  import-complete banner with a "review" action?
- [ ] Compact journal-day recap: show section snippets, or only status counts?
- [ ] Coach review: generate immediately on save, or require an explicit action
  after you add thoughts?
- [ ] How much statistical analysis belongs in the recap before it feels like
  Reports duplicated inside Journal?
- [ ] Is the setup-quality scale `valid / partial / forced` right?
- [ ] When you edit the day note *after* the recap generates, should the coach
  read regenerate, flag as stale, or stay put?
- [ ] **Ticker/day versus individual trade surface** — confirm one ticker/day
  TradingView workspace as the first-class authoring surface. Individual trades
  remain selectable/addressable evidence with their own notes and media, but do
  not require a separate journaling destination. A one-trade ticker must never
  ask for duplicate ticker and trade context. **(rec: adopt)**
- [ ] **Selected-trade interaction inside the ticker/day chart** — persistent
  annotation panel, chart-anchored popover, or lower review drawer? The choice
  must support dictation, setup/plan fields, screenshots/video, and deep links
  that reopen the cited trade in context.
- [ ] **Coach explanation depth** — add `guided / standard / technical` as a
  preference independent from `supportive / balanced / blunt` tone. The review
  engine, evidence, confidence, and caveats remain identical. **(rec: adopt)**
- [ ] **On-demand technical explanation contract** — every analytical finding
  can expand to included trades, before/after values, concentration, sample
  threshold, calculation definition, missing-data caveats, and historical
  comparison; follow-up questions must use deterministic Analytics/review-engine
  results rather than freeform model arithmetic. **(rec: adopt)**
- [ ] **Journal-to-Analytics handoff** — confirm that `Open in Analytics`
  preserves the finding's filters, trade ids, comparison, and baseline window,
  with a return path for a clarified finding, experiment, or Playbook candidate.
  **(rec: adopt)**

## C. Content only you can author (owed work)

This is the cluster you flagged — the "rules" gap traces back to here.

- [ ] **Define the real setups.** [SETUPS.md](coach/SETUPS.md) is an explicit
  *scaffold* with placeholder bodies. The coach evaluates every trade against its
  setup's criteria and the stats layer segments by setup — both are blocked until
  the setups are real. **This is the highest-leverage owner task.**
- [ ] **Give playbook rules stable identity.** `coach_playbooks` stores rules as
  prose (`body` / `rubric`). The v2 Coach Review needs addressable rules
  (`RuleEvaluation.ruleId`, `PlaybookCandidate.relatedRuleId`) — see
  [COACH_REVIEW_SCHEMA_V2.md §5](product/COACH_REVIEW_SCHEMA_V2.md). Decide the
  rule-identity model (list of rules with ids) so the coach can cite a specific rule.
- [ ] **Write `EXECUTION.md`** — referenced by SETUPS.md as *(planned)* but doesn't
  exist. The *when/how* pillar (entry/exit/sizing mechanics) that pairs with setups.
- [ ] **Pick the final visual direction.** Three explored (Low Light / Ink & Margin
  / Meridian); designer's rec is **1a base + Newsreader for day-titles & coach
  verdicts + 1c glyph badges**. Currently lives only in the Claude Design project —
  choosing it unblocks capturing tokens in-repo (see audit gap below).

## D. Docs cleanup (from the 2026-07-11 audit)

The audit's first pass flagged "duplicates," but a content-completeness review
found **no true duplicates to delete** — the design-system trio (`DESIGN_SYSTEM.md`
reference + `DESIGN_SYSTEM_ONE_SHEET.md` working checklist + `.html` visual
companion) and the two import docs (current adapter vs. rich-export gap analysis)
each hold unique content and already cross-link. So this section is
freshness/linking, not merging.

- [ ] **OWNER REVIEW — design one-sheet: legacy from prototypes?** You flagged
  this. `DESIGN_SYSTEM_ONE_SHEET.md` is a working migration checklist, and its
  Fix List / Phase 1–5 steps (e.g. "add `--prose`", "replace `#58a6ff` with
  `var(--blue)`") appear **already done** in the current `globals.css` — i.e. it
  reads as completed prototype-era work. Also, `.html` and `.md` one-sheets have
  *different* content (not one generated from the other). **Your call:** archive/
  trim the completed Fix List, decide whether `.md` + `.html` both need to exist,
  and whether the one-sheet still earns its place next to `DESIGN_SYSTEM.md`.
  *(Facts gathered 2026-07-11; no content is a true duplicate, so this is a
  keep/trim/merge judgment, not an obvious delete.)*
- [ ] **OWNER REVIEW — ThinkorSwim import docs: real overlap to reconcile.** You
  flagged possible duplication here, and there is some. Precise picture:
  - **Genuine overlap:** both `THINKORSWIM_ADAPTER.md` and
    `TOS_TO_TRADERVUE_RECONSTRUCTION.md` carry the **same statement-section
    catalog** (Cash Balance / Account Trade History / Account Order History /
    Profits and Losses / Equities — headers + field meanings). That catalog is
    duplicated and is the merge target.
  - **Unique to ADAPTER** (keep): current app behavior + code paths
    (`persist.ts`/`tos.ts`/`match.ts`), `broker:inspect` usage, Adapter Decision
    Rules, Open Work.
  - **Unique to RECONSTRUCTION** (keep — this is the work you did): TraderVue
    target shape, the preferred/fallback/lower-confidence **reconstruction
    strategy**, and the **real V2 rich-file findings** (10,269 fills, 10,222 exact
    matches, 895 `~` market orders, etc.). Its own note says the process "is now
    called broker normalization" → it may be **partly superseded by**
    `IMPORT_ARCHITECTURE.md` + `BROKER_NORMALIZER.md`.
  - **Your call:** likely — collapse the duplicated section catalog into one home,
    keep ADAPTER as "how the app reads ToS today," fold RECONSTRUCTION's strategy +
    V2 findings into ADAPTER or IMPORT_ARCHITECTURE, then retire/trim
    RECONSTRUCTION. Confirm before anything is deleted.
- [ ] **Cross-link the "structured vs prose" principle** — stated in DATA_MODEL §3,
  NOTE_MODEL, and NOTES_DICTATION. Make DATA_MODEL canonical; point the other two
  at it. (Non-destructive; safe to do anytime — say the word and I'll do just this one.)
- [ ] **Verify `PRODUCT_SPEC.md` currency** — Draft v2 (2026-06-11), the oldest
  major doc; predates AI-first recap, reworked onboarding, and the coach object
  model. Refresh or add "see newer docs" pointers.
- [ ] **Capture the chosen visual direction in-repo** — the 1a/1b/1c tokens exist
  only in Claude Design; once C is decided, add the palette/type to `globals.css`
  notes or DESIGN_SYSTEM.
- [ ] **Reconcile restored `coach/NEXT_BUILD.md` vs `coach/BUILD_TODO.md`** — both
  were recovered/added around the rewrite; decide which is canonical and fold the
  other in. (Restored 2026-07-11 from pre-rewrite history.)
- [ ] **Update or retire `deployment/DEMO_RUNTIME.md`** — restored but **stale**:
  it describes the Turso demo runtime that `main` removed (demo now reads a bundled
  SQLite file). Refresh to the current runtime or delete.
- [ ] **Recapture audit — what else did the `main` history rewrite drop?** The
  rewrite (to purge sensitive P&L docs) also removed some non-sensitive docs. We
  recovered `NEXT_BUILD.md` + `DEMO_RUNTIME.md`; **deliberately deleted the P&L
  research study forever** (real trading numbers, not for a public repo). Do a pass
  to confirm nothing else valuable was lost. *(This is the "stuff we didn't get
  captured" note.)*

## E. Build backlog (our list, not yours — here so it's visible)

- [ ] **Opportunity-context calculator** *(next up)* — the one net-new engine
  piece; joins `fills`→`candles` over the 07:00–20:00 window. Data confirmed present.
- [ ] Wire the v2 Coach Review schema (replace flat `CoachGeneratedReview`).
- [ ] Session-structure relabel (mostly renaming existing `SessionFactPack` output).
- [ ] `buildJournalDay()` view-model + one canonical template.

## F. Already decided (don't re-litigate)

Older docs still pose these as open questions, but our 2026-07-11 work settled
them. Listed so they stop resurfacing — reopen only with a reason.

- [x] **Are AI reviews saved or regenerated?** Saved as an **immutable generated
  version**; regeneration doesn't overwrite it; user reactions stored separately.
  ([COACH_REVIEW_SCHEMA_V2.md §0](product/COACH_REVIEW_SCHEMA_V2.md), Plan Phase 4)
- [x] **Are coach reviews editable journal notes or separate?** **Separate** —
  `coach_reviews` is its own layer, distinct from user `journal_entries`.
- [x] **Chart images vs candle summaries?** **Candle summaries** (deterministic);
  no chart-image interpretation in the first build (Content Spec "not in v1").
- [x] **Daily output naming** is captured in §A but effectively settled: Daily
  Recap (artifact) containing a Coach Review (section).

*(Older sources: [TRADING_COACH.md](coach/TRADING_COACH.md) Open Questions,
[coach/NEXT_BUILD.md](coach/NEXT_BUILD.md). Update those docs to point here when
convenient.)*

---

*When an item here gets resolved, check it off and (if it changes a contract)
update the linked doc so this file and the specs never drift.*
