# Data Model & Definition of Finalized

> **Status:** Working synthesis — captures how our data is imported, stored, and
> used, and defines what "finalized" means for the Daily Recap, Coach Review, and
> Notes before we build templates, themes, or export.
> **Updated:** 2026-07-11
> **Companions:** [product/COACH_RECAP_CONTENT_SPEC.md](product/COACH_RECAP_CONTENT_SPEC.md) ·
> [product/NOTE_MODEL.md](product/NOTE_MODEL.md) ·
> [product/AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md) ·
> [analytics/REVIEW_ENGINE_SPEC.md](analytics/REVIEW_ENGINE_SPEC.md) ·
> [import/IMPORT_ARCHITECTURE.md](import/IMPORT_ARCHITECTURE.md) ·
> [design/JOURNAL_DESIGN.md](design/JOURNAL_DESIGN.md)

## Why this document exists

We started from a visual question ("can we add a theme switcher for the journal
designs?") and it bottomed out at a data question. The finding:

- **Color/type is themeable; structure is not.** A CSS-variable theme swaps how
  things look. It cannot rearrange the page. A structurally different design
  (e.g. an editorial "margin column" layout) is a **second template**, not a
  theme. See [design/JOURNAL_DESIGN.md](design/JOURNAL_DESIGN.md).
- **Templates are cheap only if the data contract is real.** Multiple designs,
  user-selectable layouts, and export all ride on one thing: a finalized,
  structured model of a journal day. That model does not exist yet in typed
  form — especially the Coach Review.
- **The prototypes are expendable.** The ~12 `review/*` and `journal/mock/*`
  pages are work-in-progress. None is canonical until it renders the finalized
  contract. Do not treat them as sources of truth.

So the real foundation is the content model. This document defines it, in terms
of the tables we already have.

---

## 1. The provenance layers ARE the data model

The Content Spec's foundational rule (§1) is that a trader must always know what
they **wrote**, what was **imported**, what was **calculated**, what the coach
**inferred**, and what they **approved**. That is not just a UI convention — our
tables already sort into exactly these layers. This mapping is the spine of
everything below.

| Provenance layer (voice) | Marker | Source of truth (tables / modules) | Nature |
|---|---|---|---|
| **User-authored** (`✎ you`) | your note | `journal_entries`, `tags`, trade self-grades | Prose + a little structure. Ground truth for intent/emotion. |
| **Imported facts** (`⇣ imported`) | broker source | `import_batches`, `fills`, `candles`, `attachments` | Immutable. Never edited in place. |
| **Calculated facts** (`ƒ calculated`) | calculated | `trades` (derived round-trips), `SessionFactPack` (`lib/coach/reviewEngine.ts`) | Deterministic. Recomputable from imports. |
| **Coach interpretation** (`✳ coach`) | coach | `coach_reviews.reviewJson` | LLM output. Structured, versioned, regenerable. |
| **User-approved knowledge** | playbook | `coach_playbooks`, `coach_experiments` | Durable, user-confirmed. Changes slowly. |
| **Historical pattern** | pattern | derived over prior sessions (no dedicated table yet) | Cross-session; computed, not stored raw. |

**Design consequence:** provenance is never a styling afterthought — it is a
required field on every content object. A finding, a fact, a note each carries
*which layer produced it*. The designs (glyph + label + hue) render that field;
export serializes it; the coach prompt is constrained by it.

---

## 2. Data lifecycle: import → derive → interpret → retain → export

```
 broker CSV / bars        deterministic            LLM                persisted
   (ToS, DAS, …)          calculation           interpretation        artifact
        │                     │                      │                    │
        ▼                     ▼                      ▼                    ▼
 import_batches ──▶ fills ──▶ trades ──▶ SessionFactPack ──▶ coach_reviews ──▶ Daily Recap
   candles ───────────────────┘   (reviewEngine.ts)   (reviewJson)      (composite view)
        ▲                                                   ▲
   provenance kept                                    journal_entries (✎ you)
   (source, fileName)                                 coach_playbooks (approved)
```

### Import (see [import/IMPORT_ARCHITECTURE.md](import/IMPORT_ARCHITECTURE.md))

- `import_batches` records provenance for every ingest: `kind`
  (`executions | candles`), `source` (`tos_csv | das_csv | manual | massive |
  alpha_vantage | tradingview_csv | tos_chart_csv`), `fileName`, `rowCount`,
  `importedAt`.
- `fills` are **immutable broker fills**, deduped by `sourceRowHash`.
- `candles` are cached OHLCV bars (epoch seconds), fetched once on import.
  `massive.ts` fetches **full-day** 1-min bars per date (`adjusted=false`) and
  `getCandles`/`dayBounds` cache ET-midnight−1h to +26h — so **premarket and
  after-hours bars are already stored**, not just the regular session.
  **Verified** (2026-07-11, demo DB): RXT 2026-05-08 has 960 bars spanning
  **04:00–19:59 ET** (180 early-pre + 150 premarket + 390 regular + 240
  after-hours, 0 overnight). The full 07:00–20:00 window is covered — and data
  reaches 04:00, so the 07:00 start is a display trim, not a data limit.
- `trades` are **derived** round-trip positions computed from fills — the first
  calculated layer.

### Review session window (premarket → after-hours)

The ticker-day **review chart** — the view you get when you click into a ticker
and see all its trades for the day — must render the **full trading session**, not
just the regular session, so you can see the setup and what was developing before
and after the open.

- **Window: 07:00–20:00 ET** (practical premarket through after-hours), **excluding
  overnight.** 07:00 is chosen over the true extended-session open (04:00 ET) to
  trim dead early-premarket; 20:00 ET is the after-hours close. This is a product
  decision (§8 #10), not the exchange definition.
- Define it as **one shared constant** (e.g. `REVIEW_SESSION_WINDOW = { start:
  "07:00", end: "20:00", tz: MARKET_TZ }` in `lib/time.ts`) consumed by: the
  review chart's x-axis domain, candle retention (ensure the window is cached),
  and opportunity-context (§7.2 — premarket-high relationship needs premarket
  bars). One definition, three consumers — never let them drift.
- The current mock charts draw only `09:30–16:00`; the finalized review chart
  spans the full window with the regular session visually delineated (e.g. VWAP
  and session-open marker) inside it.

### Storage principle (the rule everything else follows)

> **Canonical data is structured and typed. Presentational formats
> (markdown / HTML / PDF) are projections rendered on demand.**
> Never let a rendered document become the source of truth.

This single rule decides both the JSON-vs-markdown question (§3) and the export
strategy (§5).

---

## 3. Structured vs prose: what to type, what to leave as text

The test for any field:

> Structure the parts you need to **address, lay out, or attribute**
> independently. Keep genuinely freeform prose as text.

Applied to our objects:

| Object | Decision | Why |
|---|---|---|
| **Coach Review** (`reviewJson`) | **Structured JSON**, prose only in leaf fields | Its sections (verdict, findings, review queue, next focus) must be re-slotted into different template layouts and individually attributed. A markdown blob is linear and un-slottable. |
| **User day/trade note** (`journal_entries`) | **Text / light markdown** | One human-authored blob; nothing re-slots its internals. Structure only the few fields that compound (setup tag, quality call, followed-plan) — see [product/NOTE_MODEL.md](product/NOTE_MODEL.md). |
| **Playbook** (`coach_playbooks.body`) | Body as prose; `rubric` structured enough to drive review | Rules are read by the coach; the rubric is machine-applied. |
| **Fact pack** (`SessionFactPack`) | Fully structured | Pure calculated data. |

Corollary: **JSON is the envelope, prose is the leaf.** A finding is a typed
object; the sentence inside it is text (bold/lists fine). This is already the
instinct in the schema — the field is literally named `reviewJson`.

---

## 4. The content-contract seam (why this unlocks templates + export)

```
raw tables ──▶ buildJournalDay(scopeKey) ──▶ JournalDayVM ──▶ { LowLight | InkMargin | … } template
                (one place data is computed)      │        └─▶ exporter (md / pdf / json)
                                                   └─ same object feeds screen AND file
```

- **One view-model builder** composes the finalized layers into a
  `JournalDayVM` (day note + coach review + fact pack + trade cards, in the
  Content Spec's fixed thought-order: what happened → what mattered → evidence →
  carry forward).
- **Templates** consume `vm` and own only *arrangement*. Structural variety
  (1a / 1b / 1c) lives here.
- **Exporters** are just another consumer of `vm`.
- **Avoid** a config/JSON-driven "layout engine." Separate the **data**, not the
  **layout language**. Templates stay hand-written React.

---

## 5. Export strategy

Two distinct needs; do not conflate them.

1. **Portability / backup** — "give me all my data." A **lossless structured
   dump** of every table (JSON, or CSV-per-table in a zip), ideally
   re-importable. A data-layer feature, largely orthogonal to design. "Everything"
   = dump the six provenance layers of §1 plus `import_batches` provenance.
2. **Document export** — "give me my recap / coach notes to read or paste
   elsewhere." Rendered output produced by the **same** view-model + template
   (§4). Export is the template pointed at a file.

**Open decision — raw file retention.** `import_batches` keeps provenance
(`source`, `fileName`) and `fills` are stored normalized with `sourceRowHash`,
but the **original uploaded broker file is not retained**. A structured export is
therefore lossless *relative to what we ingested*, but we cannot currently hand
back the exact ToS/DAS CSV. If "export everything" must include the original
files verbatim, add raw-blob retention now — cheap now, a backfill headache
later. (See §7 decisions.)

---

## 6. Definition of Finalized

"Finalized" = a typed contract + resolved decisions, such that a template, an
exporter, or the coach prompt can depend on it without guessing.

### 6a. Notes — mostly settled

`journal_entries` is well-modeled: scoped (`trade | ticker | day | week |
month`), keyed by `scopeKey`, with `thesis / whatWentWell / whatWentWrong /
lessons / followedPlan / emotionalState`. Label/tone taxonomy lives in
`lib/journalLabels.ts` (`positive | negative | neutral`).

- **Finalize:** confirm the label/tone vocabulary is complete and stable; confirm
  the trade-note "quality call" (`valid | partial | forced`) from
  [product/NOTE_MODEL.md](product/NOTE_MODEL.md) is represented in the schema (it
  is described in docs but not yet an explicit column).
- **Status:** low effort; mostly ratification.

### 6b. Coach Review — the big one (currently the least finalized)

**Today** (`lib/coach/generatedReview.ts`, `CoachGeneratedReview`) — 8 mostly-flat
fields:

```
dayVerdict: string
whatMatchedPlaybook: string[]
whatDriftedFromPlaybook: string[]
keyTradeToStudy: { tradeId, symbol, reason }
behaviorPattern: string
statisticalRead: string
oneExperiment: StarterExperiment
confidenceAndMissingContext: string[]
```

**Target** (Content Spec §6) — a family of typed objects with evidence refs:

| Spec object (§6) | Have today? | Gap |
|---|---|---|
| 6.1 Session verdict `{label, summary, process_outcome_relationship, confidence, sample_size, evidence_refs, caveat, user_status}` | `dayVerdict: string` | Promote string → object; add confidence/sample/evidence/status. |
| 6.2 Finding (array) `{title, claim, category, polarity, evidence_refs, impact, confidence, why_it_matters, recommended_action, status}` | flat `whatMatched/Drifted[]` | Net-new structured findings model — the core change. |
| 6.3 Rule evaluation | — | Net-new (needs playbook rules as addressable units). |
| 6.4 Trade review item (queue) | `keyTradeToStudy` (one) | Expand to a ranked 2–4 item queue with selection reasons. |
| 6.5 Pattern | `behaviorPattern: string` | Promote to object with historical window + recurrence + confidence. |
| 6.6 Experiment | `StarterExperiment` ✓ | Close — aligns with `coach_experiments`; add `linked_finding`, `dashboard_copy`. |
| 6.7 Playbook candidate | — | Net-new; candidates must never silently become rules. |
| 6.8 Session structure ("What drove the result?") | **mostly in `SessionFactPack`** | See §7 — largely a naming/exposure change, not new math. |
| 6.9 Opportunity context ("Was the opportunity still there?") | — | Net-new; needs the candle-join calculator (biggest lift). |

- **Finalize:** rewrite `CoachGeneratedReview` into the §6 object family; keep the
  `reviewJson` envelope (`{version, model, generatedAt, review}`) and its
  `parseCoachGeneratedReview` guard; bump `version`. Every finding/verdict
  carries `evidence_refs` (trade ids / rule ids) — this is what makes provenance
  and "See how this was calculated" work.
- **Drafted:** the field-level contract is written up in
  [product/COACH_REVIEW_SCHEMA_V2.md](product/COACH_REVIEW_SCHEMA_V2.md)
  (envelope, shared primitives, each §6 object as a typed shape, v1→v2 map, and
  the deterministic-vs-LLM split). That doc is the realized form of this bullet
  and of Phase 0 in [product/AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md).
- **Status:** high effort; this is the center of the finalization.

### 6c. Daily Recap composite — the artifact

Per Content Spec §18 decision #1: **Daily Recap is the journal artifact; Coach
Review is a labeled section inside it.** A finalized recap = the `JournalDayVM`
composed of:

- Session header + key-facts strip (≤4 facts) — calculated
- User day note (`journal_entries`, day scope) — ✎ you
- Coach Review section (§6b objects) — ✳ coach
- Review queue (2–4 trades) — coach-selected, opens the ticker/day workspace
  with the cited trade selected
- Supporting facts / evidence (collapsed) — calculated
- Playbook + Dashboard handoffs — approved-knowledge

arranged with progressive disclosure (Glance / Review / Investigate, Spec §4)
and the max-visible caps (Spec §8). `AI_FIRST_DAILY_RECAP_PLAN.md` and
`DAILY_RECAP_FLOW.md` are the in-flight drafts of this; finalizing means
reconciling them with the §6 object contract.

### 6d. Raw-file retention — decide (see §5)

---

## 7. Review-engine impact

The Content Spec (§17 Phase 1) requires session-structure and opportunity math to
be computed **deterministically, outside the LLM**. Good news: the engine already
does most of the hard part.

**Already computed** (`SessionFactPack`, `reviewEngine.ts`):

- `robustness`: `trimOneNetPnl` (result without largest), `trimTailNetPnl`
  (without both tails), `retention`, `distributionLabel` → **this *is* the
  "What drove the result?" sensitivity analysis** (Spec §6.8 / §13). Mostly a
  rename from internal "trim/robustness" to human labels.
- `segments`: `byTicker`, `byTimeWindow`, `byPriceBand` → ticker and time-window
  concentration.
- `history` trends, `mechanism`, `surprises`, `confidence` (with `riskModel`
  dollar-fallback and `limitations`).

**Gaps to close for the spec:**

1. **Session structure (§6.8):** ~80% there. Add `setup_concentration` and
   `rule_break_concentration`; map internal labels → human-language
   classifications; enforce the 5-closed-trade minimum before presenting a
   session-level classification (Spec §18 #4).
2. **Opportunity context (§6.9):** **net-new module.** Join `fills` to `candles`
   to compute time-since-high, distance-from-high, VWAP relationship, volume
   state, prior failed attempts, MFE/MAE — and strictly separate
   *information-available-at-entry* from *hindsight* (Spec §5H). This is the
   largest new piece of engine work; raw material (candles) already exists.
   Compute over the **full review session window** (07:00–20:00 ET, §2) so
   premarket-high and premarket-vs-regular-session relationships are available.
   **v1 spec + data audit:**
   [analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md](analytics/OPPORTUNITY_CONTEXT_CALCULATOR.md).
3. **Coach output schema:** the engine's job stays "produce structured facts";
   what changes is the **coach output shape** it feeds (§6b) — flat fields →
   object family with evidence refs.

**Net:** the deterministic engine is closer to the spec than the coach *output*
is. Prioritize the coach-review schema (6b) and the opportunity-context
calculator (7.2); the session-structure work is mostly relabeling.

---

## 8. Open decisions (consolidated)

Recommendations carried from Content Spec §18 plus ours. Marked ★ where they gate
the data contract.

1. ★ **Daily output naming** → Daily Recap (artifact) containing a Coach Review
   (section). *Rec: adopt.*
2. **Session-structure UI label** → "What drove the result?"; internal object
   stays `session_structure`.
3. **Opportunity UI label** → "Was the opportunity still there?"; compact
   "Opportunity at entry" for the selected trade in the ticker/day workspace.
4. ★ **Min sample for session structure** → compute always; present a
   classification only at ≥5 closed trades.
5. **Market-data resolution** → 1-min OHLCV + executions for v1 (we have
   `candles`); tick data later.
6. **R-multiples** → dollars/percent by default; R only when planned risk is
   recorded (engine already has `riskModel: dollar-fallback`).
7. **Trade intent captured** → lightweight setup + optional trigger/stop/thesis;
   coach asks a question when intent is missing rather than blocking.
8. **Letter grades** → not in the default experience.
9. ★ **Raw broker-file retention** (§5) → *decide:* retain original uploads for
   true "export everything," or accept normalized-lossless only. **Recommend
   deciding now** while the model is in focus.
10. ★ **Review session window** (§2) → **07:00–20:00 ET, overnight excluded**, as a
    single shared constant driving the review chart, candle retention, and
    opportunity context. *Rec: adopt 07:00–20:00; keep 04:00 true-open as a
    possible later setting.* **Data confirmed present** (§2) — bars already span
    04:00–19:59 ET, no fetching change needed; this is a display-window task only.

---

## 9. Sequencing (definition of done)

```
1. Finalize contracts        6a notes · 6b coach-review schema · 6c recap composite · 6d/§8 decisions
2. Extend the review engine  §7.1 concentration+labels · §7.2 opportunity-context calculator
3. Build ONE canonical template on JournalDayVM   → the ~12 prototypes collapse into it (expendable)
4. Everything then rides the same contract, cheaply:
     • color themes (1a)     • alternate structural templates (1b)     • export (md/json/pdf)
```

Steps 3–4 are cheap **only if** step 1 is real. Theming was never the
foundation; it was the thing that revealed the foundation was missing.

### How the existing plan docs map to this

- [product/AI_FIRST_DAILY_RECAP_PLAN.md](product/AI_FIRST_DAILY_RECAP_PLAN.md) is
  the delivery plan. Its **Phase 0 ("lock the content contract")** == step 1 here
  and == [product/COACH_REVIEW_SCHEMA_V2.md](product/COACH_REVIEW_SCHEMA_V2.md).
  Its **Phase 3** (deterministic contribution/rule/recurrence visuals) == §7.1.
  Its **Phase 4** (immutable generated version + separate corrections) is honored
  by the §0 envelope and `UserStatus` in the schema doc.
- [product/DAILY_RECAP_FLOW.md](product/DAILY_RECAP_FLOW.md) is the earliest
  concept; its flow and the compact-day/full-editor split still hold. Its loose
  "Coach Review Components" table is superseded by the schema's typed objects.
- All three agree on the canonical relationship: **Daily Recap is the journal
  artifact; Coach Review is a labeled section inside it** (Content Spec §18 #1).
