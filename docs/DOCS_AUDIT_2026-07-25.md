# Documentation Audit — 2026-07-25

> Non-destructive review: nothing was deleted, merged, or edited. Every finding
> here is a recommendation for the owner to accept or reject. Follow-up to the
> 2026-07-11 doc sweep recorded in [OWNER_TODO §D](OWNER_TODO.md).

**Scope:** all 77 markdown docs under `docs/` (~1.7 MB incl. assets), plus root
`README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `tradingview-indicators/README.md`,
and the small `samples/` / `public/` READMEs. Excluded: `.claude/worktrees/`
(stale checkout copy) and `.venv-dictation/` (third-party packages).

---

## Verdict in one paragraph

The docs are **large but not rotten**. Hygiene practices are genuinely good —
most docs carry status banners with dates, superseded content gets explicit
reconciliation notes instead of silent drift, and `design/` has a working
`_archive/` discipline with a category README. The bloat is concentrated, not
diffuse: (1) the **meta layer** (PROJECT_STATUS, CHANGELOG) stopped being
maintained on 2026-07-11 while ~25 docs changed since, so the "start here" path
now misleads; (2) four docs are **known-stale and already flagged** but still
awaiting the owner call (PRODUCT_SPEC, DEMO_RUNTIME, NEXT_BUILD,
TOS_TO_TRADERVUE_RECONSTRUCTION); (3) a handful of **mechanical duplications**
(section catalogs, column lists, eval lists) exist in import/ and coach/. No
category needs wholesale deletion.

**Cross-reference health:** every relative link in the tree resolves (checked
mechanically). The only referenced-but-missing file is `EXECUTION.md`, which 7
docs cite — all correctly marked *(planned)*.

---

## Findings

### F1 — The meta layer is the stalest part of the tree (highest impact)

The docs designed to orient a reader are the ones most behind:

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — says **"Last worked: 2026-07-11"**
  and its Now/Next table predates: the design-system consolidation (PR #43/#44),
  tag system (PR #51/#52), the Schwab direct import (merged this week), the
  Levels/Voice/FYL coach docs, the data-viz study register, and the chart-read /
  Pine indicator discovery docs. Its own convention (worklog entry per session)
  was followed exactly once.
- [CHANGELOG.md](CHANGELOG.md) — one entry (2026-07-11), despite at least four
  significant merges since. It currently documents its own abandonment: the
  header instructs a workflow that isn't happening.
- [OWNER_TODO.md](OWNER_TODO.md) — header says "Updated: 2026-07-11"; §D was
  partially updated 2026-07-22 (design one-sheet retirement) but other items
  (DEMO_RUNTIME, NEXT_BUILD, PRODUCT_SPEC banners) remain open and correct.
- [docs/README.md](README.md) (the Docs Map) — lists 6 categories but there are
  now 7 (`setup/` is missing); category descriptions predate: levels, voice,
  tag taxonomy (coach), data-viz catalog/register + 5 new plans (analytics),
  Schwab API docs (import). *(Note: this file has uncommitted local edits —
  an update may already be in progress.)*

**Recommendation:** one maintenance session: backfill CHANGELOG from
`git log --since=2026-07-11 --merges`, rewrite PROJECT_STATUS's Now/Next and
worklog, refresh the Docs Map categories. Alternatively, consciously demote
CHANGELOG (point to git history) rather than leaving a dead convention.

### F2 — Already-flagged stale docs, still awaiting the owner call

These four were flagged in OWNER_TODO §D on 2026-07-11 and are still in the same
state. Re-confirmed in this audit; the flags are accurate:

| Doc | State | Suggested resolution |
| --- | --- | --- |
| [product/PRODUCT_SPEC.md](product/PRODUCT_SPEC.md) | Header still "Draft v2 · 2026-06-11" — the oldest major doc. Describes manual CSV export as the only data entry; Schwab direct API sync now exists. Predates the AI-first recap, coach object model, and content-model phase. | Add a "historical — see newer docs" banner with pointers (DATA_MODEL, TRADE_IMPORT_BEHAVIOR, AI_FIRST_DAILY_RECAP_PLAN). Full rewrite optional later. |
| [deployment/DEMO_RUNTIME.md](deployment/DEMO_RUNTIME.md) | Has an honest STALE banner (describes removed Turso runtime). [ARCHITECTURE.md](ARCHITECTURE.md) Part 2 now claims — correctly — to be the source of truth for demo ops. | Retire to an archive (see F5) or refresh. Retirement looks right: ARCHITECTURE covers it. |
| [coach/NEXT_BUILD.md](coach/NEXT_BUILD.md) | Restored 2026-07-11 pickup handoff from 2026-07-02. Its durable content (two-layer stance, product flow, output contract, "not next" list, eval set) has since been absorbed nearly verbatim into [COACH_ARCHITECTURE.md](coach/COACH_ARCHITECTURE.md) and [PRIVATE_EVALS.md](coach/PRIVATE_EVALS.md). | Retire to archive. Nothing unique remains except the dated handoff snapshot, which is historical. |
| [import/TOS_TO_TRADERVUE_RECONSTRUCTION.md](import/TOS_TO_TRADERVUE_RECONSTRUCTION.md) | Self-describes as partly superseded ("now called broker normalization"). Duplicates the ToS statement-section catalog with [THINKORSWIM_ADAPTER.md](import/THINKORSWIM_ADAPTER.md). | Per the OWNER_TODO plan: keep ADAPTER as "how the app reads ToS today," fold the V2 findings + strategy into it or IMPORT_ARCHITECTURE, archive this one. |

### F3 — Duplication (beyond F2)

Ranked by maintenance cost:

1. **TraderVue canonical column list (22 columns) appears in full 3×**:
   [IMPORT_ARCHITECTURE.md](import/IMPORT_ARCHITECTURE.md),
   [BROKER_NORMALIZER.md](import/BROKER_NORMALIZER.md),
   [TOS_TO_TRADERVUE_RECONSTRUCTION.md](import/TOS_TO_TRADERVUE_RECONSTRUCTION.md)
   (+ a partial copy in TRADERVUE_ADAPTER). If a column is ever added, three
   docs silently disagree. Make IMPORT_ARCHITECTURE the one home; others link.
2. **Eval starter case list (10 bullets) verbatim 2×**:
   [coach/NEXT_BUILD.md](coach/NEXT_BUILD.md) and
   [coach/PRIVATE_EVALS.md](coach/PRIVATE_EVALS.md). Resolves itself if
   NEXT_BUILD retires (F2). PRIVATE_EVALS is canonical.
3. **Schwab edge-case/reconciliation description 2×**:
   [SCHWAB_DIRECT_IMPORT_PLAN.md](import/SCHWAB_DIRECT_IMPORT_PLAN.md) and
   [TRADE_IMPORT_BEHAVIOR.md](import/TRADE_IMPORT_BEHAVIOR.md) both carry
   edge-case matrices and reconciliation rules. This is plan-vs-behavior, not
   accidental copy — but now that the plan's Phases 0–4 are complete, the
   behavior doc is the living contract. Mark the plan **Delivered** (its header
   still says `Status: Proposed`) and add "behavior contract now lives in
   TRADE_IMPORT_BEHAVIOR.md."
4. **Coach pillar cross-reference tables** repeat across SETUPS, PSYCHOLOGY,
   STATISTICAL_REVIEW, COACH_ARCHITECTURE headers. This is deliberate
   wayfinding, low cost — fine to leave, but COACH_ARCHITECTURE's table is the
   most complete; the others could shrink to one line.
5. **"Structured vs. prose" principle stated 3×** (DATA_MODEL §3, NOTE_MODEL,
   NOTES_DICTATION_COACH_MODEL) — already an open OWNER_TODO §D item; still
   accurate; DATA_MODEL should be canonical.
6. **The recap story spans 4 docs** (DAILY_RECAP_FLOW → AI_FIRST_DAILY_RECAP_PLAN
   → COACH_RECAP_CONTENT_SPEC → COACH_REVIEW_SCHEMA_V2). This chain is
   *well-managed* — each doc carries reconciliation banners pointing forward —
   but it's the heaviest onboarding read in the tree (~75 KB). No action needed
   beyond keeping the banners honest.

### F4 — Vagueness / undated docs

- **Deliberate scaffolds (not defects, but the critical path):**
  [coach/SETUPS.md](coach/SETUPS.md) bodies are TODO placeholders and
  `EXECUTION.md` doesn't exist yet — referenced by 7 docs, all marked
  *(planned)*. Both are owner-authored content, already the top of the ⭐
  shortlist. The docs correctly refuse to fake this (FYL review process returns
  `insufficient_evidence` for TODO setups).
- **No status banner / date** on: [product/DASHBOARD_CONCEPT.md](product/DASHBOARD_CONCEPT.md)
  (last touched 2026-07-02), [product/APP_MAP.md](product/APP_MAP.md),
  [product/TRADING_JOURNAL_LEARNING_LOOP.md](product/TRADING_JOURNAL_LEARNING_LOOP.md),
  [analytics/REVIEW_ENGINE_SPEC.md](analytics/REVIEW_ENGINE_SPEC.md),
  [analytics/STATISTICAL_REVIEW.md](analytics/STATISTICAL_REVIEW.md),
  [coach/TRADING_COACH.md](coach/TRADING_COACH.md). Most are fine content-wise;
  a reader just can't tell. Cheap fix: add the standard `> Status: … · Last
  updated: …` banner each already-current doc uses.
- **Checklist drift risk:** [product/FEATURES.md](product/FEATURES.md)
  (2026-07-11) and [coach/BUILD_TODO.md](coach/BUILD_TODO.md) (2026-07-03) are
  scoped checklists whose ✅/Now items predate a month of shipping. BUILD_TODO's
  "Level Records" and screenshot sections have since been superseded in detail
  by [coach/LEVELS.md](coach/LEVELS.md) and CHART_READ_PANEL.
- **Settled questions still posed as open:** TRADING_COACH and NEXT_BUILD still
  ask questions OWNER_TODO §F marks decided (saved-vs-regenerated reviews,
  separate coach layer, candle summaries over chart images). §F itself notes
  "update those docs to point here when convenient" — still pending.

### F5 — Structure: adopt the `design/_archive` pattern tree-wide

`design/` solved doc aging correctly: a category README declaring source of
truth, a `_archive/` folder, and "superseded — do not cite" language. No other
category has this. Creating `coach/_archive/` and `import/_archive/` would give
F2's retirements a destination that preserves history without polluting the
active read path — and a category README for `import/` (9 docs, unclear
precedence between plan/behavior/adapter docs) would help the next agent or
collaborator pick the right entry point.

### F6 — Privacy flag (RESOLVED 2026-07-25)

The 2026-07-11 history rewrite deliberately purged the P&L research study
("real trading numbers, unfit for a public repo"). At audit time, two import
docs still carried real account aggregates from the same data: real P&L
totals, fee totals, and fill/trade counts in BROKER_NORMALIZER's result
section, and real fill counts and section statistics in
TOS_TO_TRADERVUE_RECONSTRUCTION.

**Resolution (owner call):** the reconstruction doc was deleted (see
[ARCHIVE.md](ARCHIVE.md)), and BROKER_NORMALIZER / THINKORSWIM_ADAPTER /
TRADERVUE_ADAPTER / PRIVATE_EVALS were scrubbed — real statement filenames and
values replaced with placeholders. The pre-scrub values remain reachable in
git history; removing them entirely would require another history rewrite,
accepted as out of proportion for aggregates.

### F7 — Small mechanical items

- [import/SCHWAB_DIRECT_IMPORT_PLAN.md](import/SCHWAB_DIRECT_IMPORT_PLAN.md)
  header: `Status: Proposed` while Phases 0–4 are individually marked
  *(complete)*.
- [IMPORT_ARCHITECTURE.md](import/IMPORT_ARCHITECTURE.md) closing line says the
  app "should eventually" normalize internally; BROKER_NORMALIZER says it now
  does. One sentence to fix.
- [import/THINKORSWIM_ADAPTER.md](import/THINKORSWIM_ADAPTER.md) "Current
  2026-07-02 File Finding" section documents a since-replaced local file —
  label it historical.
- Root `README.md` "Data Importer" section describes CSV-only import; Schwab
  direct API sync isn't mentioned anywhere in the README.
- [CODE_REVIEW.md](CODE_REVIEW.md) is a 2026-06-18 snapshot whose header claims
  ("zero TODO in src/", "7/7 tests") are no longer verified — fine as a dated
  record, but the Docs Map cites it without the date.
- `docs/.DS_Store` is tracked-adjacent noise (check `.gitignore`).
- **Uncommitted work at audit time:** `product/CHART_READ_PANEL.md`,
  `product/PINE_SETUP_INDICATOR.md`, `tradingview-indicators/` are untracked;
  `docs/README.md` and `coach/LEVELS.md` have uncommitted edits — all sitting
  on the `codex/schwab-import` branch where they're easy to lose.

---

## Recommended sequence (all non-destructive until you say otherwise)

1. **Meta refresh** (F1): PROJECT_STATUS + CHANGELOG backfill + Docs Map. One
   session, unblocks every future "where are we" read.
2. **One-line status fixes** (F7 + banners from F4): Schwab plan → Delivered,
   IMPORT_ARCHITECTURE sentence, ToS file-finding label, banners on the six
   undated docs. Trivial, high signal.
3. **Owner decisions**: P&L numbers in import docs (F6); confirm the four F2
   retirements.
4. **Execute F2/F3 merges** after sign-off, using new `_archive/` dirs (F5).
5. **Root README refresh**: Schwab sync in Data Importer — and this is the
   natural moment for the deferred "built AI-first / extending with an AI
   agent" section (AGENTS.md exists for agents, but the README says nothing
   about the workflow).

---

# Index of all documentation

Verdict key: **✅ current** (accurate as of this audit) · **🟡 aging** (mostly
right, needs a banner or a refresh pass) · **🔴 stale** (actively misleading or
flagged for retirement) · **📦 record** (dated snapshot, correct *as of its
date*, keep as history) · **🧩 scaffold** (intentionally incomplete,
owner-gated) · **📌 pinned** (paused by decision).

## Top level

| Doc | What it is | Verdict |
| --- | --- | --- |
| [README.md](../README.md) | Public product narrative, roadmap, install, demo | 🟡 aging — no Schwab API sync; no AI-workflow note |
| [AGENTS.md](../AGENTS.md) | Agent/contributor working rules, validation policy | ✅ current (2026-07-22) |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | PR/setup conventions | ✅ current |
| [docs/README.md](README.md) | Docs Map (category index) | 🟡 aging — missing `setup/`, newer docs (edit in progress?) |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | "Start here" status + worklog | 🔴 stale — frozen at 2026-07-11 |
| [OWNER_TODO.md](OWNER_TODO.md) | Owner decisions + cleanup backlog | 🟡 aging — content right, partially updated |
| [CHANGELOG.md](CHANGELOG.md) | Dated shipped-work record | 🔴 stale — one entry, convention abandoned |
| [DATA_MODEL.md](DATA_MODEL.md) | Provenance layers, definition-of-finalized, sequencing | ✅ current (2026-07-25) — **canonical** |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 3-surface system map + demo ops reference | ✅ current (2026-07-22) — supersedes DEMO_RUNTIME |
| [CODE_REVIEW.md](CODE_REVIEW.md) | Repo-wide review snapshot | 📦 record (2026-06-18) |
| [CACHE_COMPONENTS_MIGRATION.md](CACHE_COMPONENTS_MIGRATION.md) | Paused Next 16 PPR migration, honest blockers | 📌 pinned (branch `perf/demo-ppr-static`) |

## import/ + setup/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [IMPORT_ARCHITECTURE.md](import/IMPORT_ARCHITECTURE.md) | Canonical pipeline + adapter contract (hub) | ✅ current — one stale closing sentence (F7) |
| [TRADE_IMPORT_BEHAVIOR.md](import/TRADE_IMPORT_BEHAVIOR.md) | Execution/trade semantics, dedupe, edge matrix, P0 gaps | ✅ current (2026-07-25) — **canonical**, best doc in the tree |
| [SCHWAB_DIRECT_IMPORT_PLAN.md](import/SCHWAB_DIRECT_IMPORT_PLAN.md) | Direct-sync delivery plan, Phases 0–4 complete | 🟡 aging — header says Proposed; mark Delivered |
| [SCHWAB_API_PROBE.md](import/SCHWAB_API_PROBE.md) | Sanitized probe conclusions, identity decision | 📦 record — accurate |
| [../setup/SCHWAB_SETUP.md](setup/SCHWAB_SETUP.md) | End-user BYO-credentials setup guide | ✅ current |
| [THINKORSWIM_ADAPTER.md](import/THINKORSWIM_ADAPTER.md) | How the app reads ToS statements today | ✅ current — one historical section to label |
| [TOS_TO_TRADERVUE_RECONSTRUCTION.md](import/TOS_TO_TRADERVUE_RECONSTRUCTION.md) | Feasibility study, V2 findings | 🔴 stale — partly superseded; merge target (F2) |
| [BROKER_NORMALIZER.md](import/BROKER_NORMALIZER.md) | CLI normalizer + partial-fill grouping rules | ✅ current — scrubbed 2026-07-25 (F6 resolved) |
| [TRADERVUE_ADAPTER.md](import/TRADERVUE_ADAPTER.md) | TraderVue/DAS trade-summary adapter | ✅ current |

## coach/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [TRADING_COACH.md](coach/TRADING_COACH.md) | Founding coach product doc: positioning, inputs, guardrails | 🟡 aging — still sound; open questions partly settled elsewhere; no banner |
| [COACH_ARCHITECTURE.md](coach/COACH_ARCHITECTURE.md) | Runtime map: constitution vs playbook, request assembly, build order | ✅ current — **canonical** for coach systems |
| [COACH_INTELLIGENCE_RESEARCH_PLAN.md](coach/COACH_INTELLIGENCE_RESEARCH_PLAN.md) | Research index: capability map, detector families, eval program | ✅ current (2026-07-22) |
| [FYL_DETERMINISTIC_REVIEW_PROCESS.md](coach/FYL_DETERMINISTIC_REVIEW_PROCESS.md) | Frozen chart-read → coaching sequence | ✅ current (v1, 2026-07-21) |
| [LEVELS.md](coach/LEVELS.md) | Calculated vs marked levels, quality, capture flow | ✅ current (uncommitted edits pending) |
| [VOICE.md](coach/VOICE.md) | House register: read → receipt → next rep | ✅ current (v1, 2026-07-21) |
| [SETUPS.md](coach/SETUPS.md) | Setup pillar; predicate checklist model | 🧩 scaffold — bodies are owner TODOs (the ⭐ blocker) |
| [PSYCHOLOGY.md](coach/PSYCHOLOGY.md) | Psychology pillar: patterns, rubric, eval cases | ✅ current — no banner |
| [TAG_TAXONOMY.md](coach/TAG_TAXONOMY.md) | Typed tag vocabulary, categories, DB direction | ✅ current (2026-07-22) |
| [TAG_VISUAL_SYSTEM.md](coach/TAG_VISUAL_SYSTEM.md) | Chip icon/color/fill engineering handoff | ✅ current (2026-07-22) |
| [BUILD_TODO.md](coach/BUILD_TODO.md) | Working coach build list | 🟡 aging (2026-07-03) — sections superseded by LEVELS/CHART_READ |
| [NEXT_BUILD.md](coach/NEXT_BUILD.md) | Restored 2026-07-02 pickup handoff | 🔴 stale — absorbed by COACH_ARCHITECTURE; retire (F2) |
| [PRIVATE_EVALS.md](coach/PRIVATE_EVALS.md) | Local-only eval storage contract + runner | ✅ current |
| [LOCAL_DICTATION.md](coach/LOCAL_DICTATION.md) | Whisper service setup + proxy behavior | ✅ current |
| [prompts/fyl_trade_review_coach.md](coach/prompts/fyl_trade_review_coach.md) | FYL trade-review coach prompt draft | 🟡 aging (2026-07-02) — predates VOICE/FYL process docs |

## product/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [PRODUCT_SPEC.md](product/PRODUCT_SPEC.md) | Founding design doc (Draft v2) | 🔴 stale (2026-06-11) — needs "see newer" banner (F2) |
| [COACH_RECAP_CONTENT_SPEC.md](product/COACH_RECAP_CONTENT_SPEC.md) | Content architecture Rev 2: objects, disclosure, writing rules | ✅ current — **canonical** for content |
| [COACH_REVIEW_SCHEMA_V2.md](product/COACH_REVIEW_SCHEMA_V2.md) | Typed Coach Review contract (drafted, not wired) | ✅ current — status banner accurate |
| [AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md) | Phased recap delivery plan | ✅ current — plan of record |
| [DAILY_RECAP_FLOW.md](product/DAILY_RECAP_FLOW.md) | Earliest recap concept, reconciled 2026-07-11 | 📦 record — banner handles it |
| [JOURNAL_REVIEW_MODULE.md](product/JOURNAL_REVIEW_MODULE.md) | 12-view review component contract | ✅ current (accepted 2026-07-20) |
| [JOURNAL_COMPARE_INDICATORS_KEY_MOMENTS.md](product/JOURNAL_COMPARE_INDICATORS_KEY_MOMENTS.md) | Compare/indicators/key-moments exploration + V1 decision | ✅ current (2026-07-18) |
| [CHART_READ_PANEL.md](product/CHART_READ_PANEL.md) | Hindsight chart-read discovery + `ChartRead` contract | ✅ current (2026-07-24) — **untracked, commit it** |
| [PINE_SETUP_INDICATOR.md](product/PINE_SETUP_INDICATOR.md) | TradingView Pine companion spec | ✅ current (2026-07-24) — **untracked, commit it** |
| [NOTE_MODEL.md](product/NOTE_MODEL.md) | Note ladder: purpose + data per note type | ✅ current |
| [NOTES_DICTATION_COACH_MODEL.md](product/NOTES_DICTATION_COACH_MODEL.md) | Dictation-first direction shift | ✅ current (2026-07-03 draft, still the direction) |
| [PLAYBOOK.md](product/PLAYBOOK.md) | Playbook thesis (standards layer) | ✅ current |
| [PLAYBOOK_MVP.md](product/PLAYBOOK_MVP.md) | First shippable playbook slice | ✅ current — complements, doesn't duplicate |
| [ONBOARDING_SETUP_FLOW.md](product/ONBOARDING_SETUP_FLOW.md) | Settings-based Setup Workspace spec | 🟡 aging (2026-07-03) — large; verify against shipped Settings |
| [DASHBOARD_CONCEPT.md](product/DASHBOARD_CONCEPT.md) | Active-day dashboard concept | 🟡 aging (2026-07-02) — no banner |
| [TRADING_JOURNAL_LEARNING_LOOP.md](product/TRADING_JOURNAL_LEARNING_LOOP.md) | Journal↔coach↔dashboard loop model | 🟡 aging — no banner |
| [FEATURES.md](product/FEATURES.md) | Scoped feature checklist vs reference tool | 🟡 aging (2026-07-11) — checklist drift |
| [APP_MAP.md](product/APP_MAP.md) | Route → code map | 🟡 aging — thin, drift-prone, no banner |
| [COMPETITIVE_ANALYSIS.md](product/COMPETITIVE_ANALYSIS.md) | Landscape brief v2 | ✅ current (2026-07-13) |
| [PLAIN_LANGUAGE_GLOSSARY.md](product/PLAIN_LANGUAGE_GLOSSARY.md) | Canonical plain labels for engine terms | ✅ current (v1, 2026-07-21) |
| [DATA_BACKUP.md](product/DATA_BACKUP.md) | Backup primitive design + guardrails | ✅ current (v1, 2026-07-21) |
| [handoffs/README.md](product/handoffs/README.md) + [2026-07 bundle](product/handoffs/2026-07-journal-compare-dashboard/README.md) | Cross-device handoff bundles | ✅ current |

## analytics/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [REVIEW_ENGINE_SPEC.md](analytics/REVIEW_ENGINE_SPEC.md) | Deterministic engine spec v0.1 | ✅ current — no banner |
| [STATISTICAL_REVIEW.md](analytics/STATISTICAL_REVIEW.md) | R-based statistical framework (math pillar) | ✅ current — no banner |
| [ANALYTICS_RESEARCH_PLAN.md](analytics/ANALYTICS_RESEARCH_PLAN.md) | Reports/analytics research + Five Pillars | 🟡 aging (2026-06-20) — oldest analytics doc; predates data-viz work |
| [DATA_VIZ_CATALOG.md](analytics/DATA_VIZ_CATALOG.md) | Data inventory + chart vocabulary synthesis | 📌 pinned (2026-07-18, by decision) |
| [DATA_VIZ_STUDY_REGISTER.md](analytics/DATA_VIZ_STUDY_REGISTER.md) | The 10 review questions from v1–v7 | 📌 pinned (2026-07-18, by decision) |
| [EDGE_ATTRIBUTION_PLAN.md](analytics/EDGE_ATTRIBUTION_PLAN.md) | Expectancy-by-characteristic plan | ✅ current (2026-07-21) |
| [INDICATOR_PRICE_ACTION_PLAN.md](analytics/INDICATOR_PRICE_ACTION_PLAN.md) | 9/20/VWAP event vocabulary plan | ✅ current |
| [OPPORTUNITY_CONTEXT_CALCULATOR.md](analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md) | Fills×candles v1 spec + data audit | ✅ current (2026-07-21) |
| [OPPORTUNITY_SET_CAPTURE_PLAN.md](analytics/OPPORTUNITY_SET_CAPTURE_PLAN.md) | Movers-of-the-day capture contract | ✅ current |
| [PRICE_ACTION_QUALITY_MODEL.md](analytics/PRICE_ACTION_QUALITY_MODEL.md) | Three-layer price-action read | ✅ current |

## design/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [README.md](design/README.md) | Category index + source-of-truth declaration | ✅ current — **the model for other categories** |
| [DESIGN_SYSTEM.md](design/DESIGN_SYSTEM.md) | Canonical visual rules (values live in globals.css) | ✅ current (2026-07-22) — **canonical** |
| [COMPONENT_INVENTORY.md](design/COMPONENT_INVENTORY.md) | UI census + extraction backlog | ✅ current (living, 2026-07-22) |
| [JOURNAL_DESIGN.md](design/JOURNAL_DESIGN.md) | Journal visual language + note hierarchy | ✅ current |
| [JOURNAL_NAVIGATION_DECISION.md](design/JOURNAL_NAVIGATION_DECISION.md) | One-surface navigation decision | ✅ current (decided 2026-07-21) |
| [TICKER_REVIEW_DESIGN_HANDOFF.md](design/TICKER_REVIEW_DESIGN_HANDOFF.md) | Designer handoff for ticker→daily review | ✅ current (July 2026) |
| `_archive/` (4 files) | Retired one-sheet + design-QA records | 📦 record — properly archived |

## deployment/

| Doc | What it is | Verdict |
| --- | --- | --- |
| [DEMO_RUNTIME.md](deployment/DEMO_RUNTIME.md) | Old Turso demo runtime contract | 🔴 stale (self-labeled) — retire; ARCHITECTURE covers it |
| [PERFORMANCE_AUDIT.md](deployment/PERFORMANCE_AUDIT.md) | Demo first-load latency analysis | 📦 record (2026-07-03) — feeds CACHE_COMPONENTS_MIGRATION |

## Other roots

| Doc | What it is | Verdict |
| --- | --- | --- |
| [tradingview-indicators/README.md](../tradingview-indicators/README.md) | Pine scripts overview + conventions | ✅ current — **untracked, commit it** |
| [samples/README.md](../samples/README.md), [samples/demo/README.md](../samples/demo/README.md) | Demo data provenance | ✅ current |
| [samples/landing-page-design/README.md](../samples/landing-page-design/README.md) | Landing-page design handoff bundle | 📦 record |
| [public/brand/README.md](../public/brand/README.md), [public/icons/tags/README.md](../public/icons/tags/README.md) | Asset notes | ✅ current |
