# Coach Review Schema v2 — field-level contract

> **Status:** Draft contract for review — not yet wired. Proposes the typed shape
> that replaces the flat `CoachGeneratedReview` (v1). This is the "next
> specification" called for by [COACH_RECAP_CONTENT_SPEC.md](COACH_RECAP_CONTENT_SPEC.md)
> §19 and Phase 0 of [AI_FIRST_DAILY_RECAP_PLAN.md](AI_FIRST_DAILY_RECAP_PLAN.md).
> **Updated:** 2026-07-11 · **Companion:** [../DATA_MODEL.md](../DATA_MODEL.md) §6b

## Scope and intent

This is the **coach interpretation layer only** (`coach_reviews.reviewJson`). It
does not restate the deterministic fact pack (`SessionFactPack`) or user notes —
it *references* them. Rules that hold throughout:

- **Structured envelope, prose leaves.** Every object is typed; the sentences
  inside leaf fields are plain text (light markdown allowed). See DATA_MODEL §3.
- **Every claim is signed and sourced.** Each finding/verdict carries `provenance`
  and `evidence_refs`. No numeric claim originates in prose — deterministic
  numbers come from the fact pack via refs (Spec §14).
- **Generated content is immutable; user reactions are separate.** Regeneration
  never overwrites trader context or the prior artifact (Plan Phase 4).
- **Caps are part of the contract** (Spec §8): the schema encodes maximum item
  counts so a template never has to defend against overload.

## 0. Envelope (unchanged shape, bumped version)

Matches today's persistence in `src/app/coach/actions.ts` / `parseCoachStoredReview`:

```ts
type CoachStoredReview =
  | { version: 2; model: string; generatedAt: string; review: CoachReviewV2 }
  | { version: 2; generatedAt: string; error: string }; // generation failed → status "stale"
```

`coach_reviews` columns are unchanged: `status` (`draft | generated | stale`),
`payloadJson` (the deterministic input snapshot), `reviewJson` (the above).

## 1. Shared primitives

```ts
/** Which provenance layer authored a claim. Required on every coach object. */
type Provenance =
  | "coach"        // ✳ interpretation (default for this file)
  | "calculated"   // ƒ deterministic fact the coach is citing
  | "user"         // ✎ trader note the coach is quoting
  | "playbook"     // an approved rule/example
  | "pattern";     // cross-session historical

/** Pointer into the deterministic record. At least one kind per claim. */
type EvidenceRef =
  | { kind: "trade"; tradeId: number; label?: string }      // → trades.id
  | { kind: "rule"; ruleId: string; label?: string }        // → playbook rule
  | { kind: "fact"; path: string; label?: string }          // → SessionFactPack path, e.g. "robustness.trimOneNetPnl"
  | { kind: "segment"; by: "ticker" | "timeWindow" | "setup"; key: string }
  | { kind: "candleWindow"; symbol: string; fromEt: string; toEt: string }; // review-session window (07:00–20:00 ET)

type Confidence = "low" | "medium" | "high";

/** The trader's reaction to a coach item — stored separately, never mutates the item. */
type UserStatus = "new" | "accepted" | "dismissed" | "corrected";
```

## 2. The review object (Spec §6 → types)

```ts
type CoachReviewV2 = {
  verdict: SessionVerdict;              // §6.1  exactly one
  nextFocus: CarryForwardFocus;         // §6.6/§5C  exactly one
  findings: Finding[];                  // §6.2  ≤2 positive + ≤2 negative (Spec §8)
  sessionStructure: SessionStructure | null;   // §6.8  null when <5 closed trades
  reviewQueue: TradeReviewItem[];       // §6.4  2–4 items
  ruleIntegrity: RuleEvaluation[];      // §6.3  collapsed by default
  pattern: Pattern | null;              // §6.5  ≤1; only above threshold
  opportunity: OpportunityContext[];    // §6.9  0–1 unless it changes the diagnosis
  playbookCandidates: PlaybookCandidate[]; // §6.7  ≤2; never auto-promoted
  overflowCount: number;               // "N additional observations" (Spec §8)
};
```

### 2.1 SessionVerdict (§6.1)

```ts
type SessionVerdict = {
  label: string;              // short classification, e.g. "Strong process, red result"
  summary: string;            // one sentence, ≤200 chars
  processOutcome: "strong-process-positive" | "strong-process-negative"
                | "weak-process-positive" | "contained-risk-red"
                | "rule-driven-loss" | "exit-leak" | "overtrading"
                | "insufficient-evidence";
  confidence: Confidence;
  sampleSize: number;         // closed trades considered
  caveat: string | null;
  evidenceRefs: EvidenceRef[];
  provenance: "coach";
};
```

### 2.2 Finding (§6.2)

```ts
type Finding = {
  title: string;
  claim: string;                       // prose leaf
  category: "entry" | "exit" | "risk" | "sizing" | "selection" | "patience"
          | "overtrading" | "emotional-response" | "rule-adherence"
          | "setup-quality" | "market-alignment" | "review-quality";
  polarity: "positive" | "negative";
  scope: "session" | "recurring";
  impact: { dollars: number | null; note: string | null }; // deterministic when present
  historicalComparison: string | null;
  confidence: Confidence;
  whyItMatters: string;
  recommendedAction: string | null;    // may seed a PlaybookCandidate
  evidenceRefs: EvidenceRef[];
  provenance: "coach";
};
```

### 2.3 SessionStructure — "What drove the result?" (§6.8)

Mostly **already computed** in `SessionFactPack.robustness` + `.segments`; this
object is the coach's human-language projection of it (DATA_MODEL §7.1).

```ts
type SessionStructure = {
  plainLanguageLabel: string;          // "One loss overwhelmed an otherwise controlled session"
  classification: "one-loss-dominated" | "one-winner-dominated" | "broadly-negative"
                | "broadly-positive" | "ticker-concentrated" | "time-concentrated"
                | "mixed" | "insufficient-sample";
  actualResult: number;
  resultWithoutLargestLoss: number | null;   // ← robustness.trimOneNetPnl family
  resultWithoutLargestWinner: number | null;
  resultWithoutBoth: number | null;          // ← robustness.trimTailNetPnl
  largestTradeShare: number | null;
  concentration: { ticker: number | null; setup: number | null;
                   timeWindow: number | null; ruleBreak: number | null };
  minimumSampleMet: boolean;                 // false → present descriptively, no classification
  confidence: Confidence;
  caveat: string | null;
  evidenceRefs: EvidenceRef[];               // "fact" refs into robustness/segments
  provenance: "calculated";                  // numbers are deterministic; label is coach-worded
};
```

### 2.4 TradeReviewItem — the queue (§6.4)

```ts
type TradeReviewItem = {
  tradeId: number;
  selectionReason: "critical-breach" | "best-process" | "largest-avoidable-loss"
                 | "representative" | "missing-context" | "conflicting-evidence";
  priority: number;                    // 1..n ranking
  coachRead: string;                   // one sentence
  ruleStatus: "clean" | "breached" | "not-applicable" | "not-evaluable" | "needs-clarification";
  noteStatus: "present" | "missing";
  chartStatus: "available" | "missing";
  openQuestions: string[];
  evidenceRefs: EvidenceRef[];
  provenance: "coach";
};
```

### 2.5 RuleEvaluation (§6.3)

```ts
type RuleEvaluation = {
  ruleId: string;
  ruleName: string;
  result: "clean" | "breached" | "not-applicable" | "not-evaluable" | "needs-clarification";
  severity: "critical" | "major" | "minor" | null;
  tradeRefs: number[];
  missingData: string | null;          // missing data is NOT compliance (Spec §5J)
  coachExplanation: string;
  proposedChange: string | null;
  provenance: "coach";
};
```

### 2.6 Pattern (§6.5)

```ts
type Pattern = {
  name: string;
  currentObservation: string;
  historicalWindow: string;            // e.g. "last 5 sessions"
  sampleSize: number;
  frequency: string;                   // "3 of 5"
  direction: "improving" | "worsening" | "stable";
  status: "session-only" | "emerging" | "repeated" | "established" | "resolved";
  contradictingEvidence: string | null;
  confidence: Confidence;
  evidenceRefs: EvidenceRef[];
  provenance: "pattern";
};
```

### 2.7 OpportunityContext — "Was the opportunity still there?" (§6.9)

**Net-new deterministic module** (DATA_MODEL §7.2). Computed by joining `fills` to
`candles` over the **07:00–20:00 ET review window**. Must separate
information-available-at-entry from hindsight (Spec §5H).

```ts
type OpportunityContext = {
  tradeId: number;
  plainLanguageConclusion: string;
  classification: "developing" | "still-valid" | "weakening" | "move-mature"
                | "valid-stock-late-entry" | "valid-setup-poor-execution"
                | "good-entry-poor-management" | "cannot-determine";
  atEntry: {                           // only facts observable at entry time
    entryTime: string; entryPrice: number;
    timeSinceCurrentHigh: string | null; distanceFromCurrentHigh: number | null;
    premarketHighRelationship: string | null; vwapRelationship: "above" | "below" | "at" | null;
    volumeState: "expanding" | "stable" | "declining" | null;
    priceStructure: string | null; failedAttemptCount: number | null;
  };
  postTrade: { mfe: number | null; mae: number | null; note: string | null }; // hindsight, labeled as such
  intent: { setup: string | null; source: "user" | "inferred" | "missing" };
  confidence: Confidence;
  missingContext: string[];
  evidenceRefs: EvidenceRef[];         // includes a candleWindow ref
  provenance: "calculated";
};
```

### 2.8 CarryForwardFocus / Experiment (§6.6)

Extends today's `StarterExperiment` and aligns with the `coach_experiments` table.

```ts
type CarryForwardFocus = {
  title: string;
  trigger: string;                     // defined situation
  behavior: string;                    // behaviorally specific action  (v1: "action")
  measure: string[];
  duration: string;                    // "next 3 sessions"  (v1: "expires")
  scope: string;                       // (v1: "scope"/experimentScope)
  linkedFindingTitle: string | null;
  dashboardCopy: string;               // short line the Dashboard carries forward
  provenance: "coach";                 // trader-adopted edits retain this origin (Plan Phase 4)
};
```

### 2.9 PlaybookCandidate (§6.7)

```ts
type PlaybookCandidate = {
  candidateType: "new-rule" | "rule-revision" | "setup-criterion" | "exit-criterion"
               | "exception" | "a-plus-example" | "avoid-example" | "review-question";
  proposedText: string;
  relatedRuleId: string | null;
  confidence: Confidence;
  evidenceRefs: EvidenceRef[];
  provenance: "coach";                 // never silently promoted; user decides
};
```

## 3. v1 → v2 migration map

| v1 field (`CoachGeneratedReview`) | v2 target |
|---|---|
| `dayVerdict: string` | `verdict.label` + `verdict.summary` |
| `whatMatchedPlaybook: string[]` | `findings[]` (polarity `positive`) |
| `whatDriftedFromPlaybook: string[]` | `findings[]` (polarity `negative`) + `ruleIntegrity[]` |
| `keyTradeToStudy` | first `reviewQueue[]` item |
| `behaviorPattern: string` | `pattern.currentObservation` |
| `statisticalRead: string` | `sessionStructure.plainLanguageLabel` (+ refs) |
| `oneExperiment: StarterExperiment` | `nextFocus` (CarryForwardFocus) |
| `confidenceAndMissingContext: string[]` | `verdict.caveat` + per-object `missingContext` |

**Compatibility:** bump envelope `version` to 2; `parseCoachStoredReview` branches
on `version` so stored v1 rows still parse (render read-only or lazily re-generate).
Keep `parseCoachGeneratedReview`'s strict-guard pattern for v2.

## 4. Deterministic vs LLM-authored

| Produced deterministically (engine, before LLM) | LLM-authored (constrained by refs) |
|---|---|
| `sessionStructure.*` numbers, `concentration`, `robustness` | `verdict`, `findings`, `pattern`, `reviewQueue` reads |
| `opportunity.atEntry` / `postTrade` (candle join) | `plainLanguageLabel` / `plainLanguageConclusion` wording |
| `ruleIntegrity.result` where a rule is machine-checkable | `coachExplanation`, `whyItMatters`, `recommendedAction` |
| all `evidenceRefs` targets (facts must exist) | `nextFocus`, `playbookCandidates` |

The LLM chooses wording and selection; it never invents numbers. Every numeric
claim resolves through an `EvidenceRef` to the fact pack.

## 5. Open items

- Rule identity: `ruleId` needs stable ids on `coach_playbooks` rules (today the
  playbook `body`/`rubric` are prose — rules aren't individually addressable yet).
- Character limits per leaf field (Spec §19) — set during Phase 1 prototyping.
- Whether `opportunity` is emitted per reviewed trade or only when it changes the
  diagnosis (Spec §18, deferred).
- Ranking function that fills `overflowCount` (Spec §8 priority order).
