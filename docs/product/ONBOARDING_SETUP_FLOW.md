# Setup Workspace & Coach Context

> Status: Draft · Last updated: 2026-07-03

This doc defines the in-app setup experience for Trading Journal AI. The goal
is not to force a first-run wizard or recap the installer. The goal is to give
the trader a clear Settings-based workspace for adding the context that makes
the app work intelligently: broker/import source, language-model access,
trader self-assessment, trading rules, setup playbook, and coach preferences.

Working name: **Setup Workspace**. It should feel lightweight, recoverable, and
useful from minute one. First launch can point here, but setup itself should
live where users expect to maintain it long term: Settings.

## Product Thesis

The app becomes more valuable when it knows five things early:

- Where trade data will come from.
- Whether AI coaching can run, and which model/provider should power it.
- Where the trader believes they are in their trading journey, what is working,
  what is not working, and what the coach should help with.
- What rules the trader is trying to follow.
- Which setups and behaviors the coach should evaluate against.
- Whether candle data can be fetched for chart context.

Broker selection makes import trustworthy. Language-model setup unlocks live
coach generation. Trader self-assessment, trading rules, setup playbook, and
coach preferences make the coach specific to the trader instead of generic.
Market-data setup improves charts, but it is supporting infrastructure, not the
heart of the coach setup experience.

## Goals

- Give a new or returning user clear wayfinding toward a configured review
  state.
- Keep install/demo/empty starts separate from long-term Settings.
- Make missing config obvious without blocking the rest of the app.
- Let users return later to finish or change setup.
- Keep sensitive data local-first and clearly explain what is stored.
- Give the coach structured context instead of asking the LLM to infer a
  trading plan from scattered notes.

## Non-Goals

- No broker account linking or automated execution sync.
- No auth, cloud profile, or multi-user workspace assumptions.
- No required AI configuration before the journal can be used.
- No installer walkthrough or package/dependency setup.
- No giant intake form that delays importing the first trades.

## Design Principles

### Setup Is Wayfinding, Not a Sequence

The user should be able to configure the app in the order that matches their
moment. Setup should live primarily in Settings as a small set of status panels,
not a forced first-run sequence. First-run, Dashboard, Import, and Coach views
can link into the relevant Settings panel when context is missing.

### Unlock The Next Useful Question

Some setup questions make sense only after another capability exists. For
example, once the user connects an AI model, the app can present the trader
self-assessment because the answer now powers live coaching, rule drafting, and
playbook help. The user can still skip it, but the timing should feel useful
rather than bureaucratic.

### Ask Only When the Answer Improves the App

Every question should unlock a capability:

- Massive key unlocks high-quality charts.
- Language-model key unlocks live AI coaching.
- Trader self-assessment unlocks coach vocabulary, priorities, and a baseline
  self-model the app can compare against data over time.
- Broker choice unlocks import instructions and better diagnostics.
- Trading rules unlock daily accountability and coach evaluation.
- Setup playbook unlocks setup-level analytics, cleaner note tags, and better
  AI review.
- Coach preferences unlock tone and focus calibration.

### Defaults Beat Blankness

When the user skips a section, the app should provide sensible defaults and name
the limitation. Example: if no setup playbook exists, the coach can still review
execution and behavior, but should not pretend to know whether the technical
setup was valid.

### Tunable Forever

Anything collected during setup must be editable later. The same underlying
Settings data should power first-run wayfinding and long-term configuration.

## Entry Points

- First app launch after install or hosted-demo entry, as lightweight wayfinding
  into Settings rather than a required wizard.
- First launch with no broker/import source selected.
- First launch with no AI provider configured.
- First launch with no trading rules or setup playbook.
- Settings: primary home for all setup and coach-context panels.
- Dashboard: persistent incomplete setup nudges.
- Import page: broker setup and market-data setup prompts.
- Coach page or report flow: self-assessment, setup playbook, and coach
  preference prompts when review quality is limited by missing context.

## Settings Panels

The panels below can be shown as a compact setup health area in Settings. They
are ordered by practical dependency, not by required completion sequence.

### AI Coach / Language Model

Purpose: connect the user's preferred language-model service so coach
generation, rule assistance, and setup/playbook help can run outside the static
demo path.

Fields:

- Provider:
  - OpenAI / ChatGPT.
  - Anthropic Claude.
  - Google Gemini.
  - Ollama / local model.
  - Other OpenAI-compatible endpoint.
- API key or local model endpoint.
- Connection/test status.
- Default model, if the provider exposes useful choices.
- Whether live coach generation is enabled.

First-pass behavior:

- OpenAI is the available provider because the app already generates coach
  reviews from `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Claude, Gemini, Ollama, and OpenAI-compatible endpoints should appear in the
  setup UI as intentional provider paths, but be labeled as adapter-next until
  the server-side provider adapters exist.
- The UI should ask the user to choose the provider they want the coach to use,
  then reveal that provider's specific fields. Do not start with a giant model
  menu.

UX copy should be plain:

- Used for AI coach reviews, summaries, rule/playbook drafting, and setup
  assistance.
- Stored locally/server-side, never in browser bundles.
- The app can still run without it; coach surfaces fall back to static reviews,
  deterministic facts, or missing-context prompts.
- Hosted demo should not ask public visitors to enter secrets unless there is a
  clearly local-only/private storage path and explicit copy.

Open implementation question:

- For local-first installs, should the key live in `.env.local`, an encrypted
  local settings store, or a desktop wrapper keychain integration?

### Trader Self-Assessment

Purpose: give the coach a baseline view of where the trader thinks they are in
their trading journey, what is working, what is not working, and what kind of
help they want from the coach.

Trigger:

- Present this prominently after an AI model is connected or selected.
- Keep it available in Settings forever.
- Prompt for refresh on a recurring cadence, such as monthly or quarterly, and
  after major playbook changes.

The assessment should feel like coach setup, not a personality quiz. It should
be short enough to complete in one sitting, but deep enough to create useful
review context.

Suggested sections:

- **Performance self-read:** what is working, what is not working, which setups
  seem strongest, where losses seem to concentrate, and what the last real
  improvement was.
- **Psychology vocabulary:** how FOMO, hesitation, revenge, patience,
  discipline, fear, confidence, and session drift show up for this trader.
- **Coaching contract:** what the trader wants the coach to watch closely, what
  feedback style lands, and what would make the trader dismiss the coach's
  feedback.

Important use rules:

- Assessment answers are hypotheses, not facts.
- They shape coach framing, vocabulary, and priorities.
- They never feed deterministic detectors directly.
- Later reviews can mark claims as `unverified`, `supported`, or
  `contradicted` by data.
- The gap between self-read and observed behavior is a coaching feature, not a
  failure state.

Feeds:

- Coach review prompt/context.
- Psychology pattern vocabulary.
- Monthly self-model review.
- Suggested rules, setup focus, and improvement themes.

### Broker / Import Format

Purpose: give the importer enough context to show the right instructions and
diagnostics.

Supported first choices:

- ThinkorSwim account statement.
- DAS / TraderVue export.
- App export.
- Generic CSV mapping / AI-assisted adapter, future.
- Not sure yet.

Expected behavior:

- Broker choice changes instructions, sample screenshots/copy, and warning
  language.
- Import still inspects the uploaded file rather than trusting the selected
  broker blindly.
- Unsupported files should produce actionable diagnostics instead of generic
  parse failures.

Unsupported broker hook:

- If a broker is not supported, offer an **AI-assisted adapter path** instead of
  a dead end.
- The user can upload or paste a sample export, ideally anonymized, and ask the
  assistant to identify columns, timestamp shape, fill semantics, fees, side,
  quantity, and price fields.
- The assistant should explain what it can confidently map, what is ambiguous,
  and what questions or sample rows are needed before an adapter can be trusted.
- The result should be a proposed mapping or adapter draft, not an automatic
  import into the journal until the user previews and confirms normalized rows.
- The product should keep raw broker files private/local and remind users to
  remove account numbers or identifying data before sharing samples outside the
  local app.

### Trading Rules

Purpose: define the guardrails the trader wants to be judged against.

Suggested fields:

- Daily max loss.
- Max trades per day.
- Max loss streak before pause.
- Risk per trade.
- Default stop behavior.
- Time windows to avoid or prefer.
- Rule after hitting daily goal.
- Rule after large loss or emotional trigger.

This should be optional but strongly encouraged. Without rules, the app can
report outcomes, but it cannot fully evaluate discipline.

Rule capture should allow both structured fields and plain-language rules:

- Structured fields handle limits and numeric guardrails.
- Plain-language rules handle trader-specific standards, such as "No first
  candle chase unless it reclaims VWAP and holds the bid."
- The model can help turn prose into candidate structured rules, but the trader
  confirms what becomes official.
- Rules should be editable later and visible anywhere the coach claims a rule
  was held, bent, or broken.

### Setup Playbook

Purpose: define what the trader is allowed to trade.

Start lightweight:

- Setup name.
- Long/short/both.
- One-line valid conditions.
- One-line invalidation.
- Common mistake.
- Whether it is active, paused, or experimental.

Examples:

- VWAP reclaim.
- HOD breakout retest.
- Failed breakdown reclaim.
- EMA rail.
- Opening range continuation.

Later expansion:

- Required volume behavior.
- Market regime fit.
- Entry trigger.
- Stop placement.
- Target behavior.
- Screenshot examples.
- Per-setup sizing guidance.

The setup playbook should feed:

- Trade setup picker.
- Reports by setup.
- Coach review prompt/context.
- Daily recap: whether trades matched approved setups.

### Coach Preferences

Purpose: tune how the app talks back to the trader.

Suggested fields:

- Coach strictness: supportive, balanced, blunt.
- Primary focus: overtrading, chasing, sizing, early exits, revenge trading,
  rule adherence, setup selectivity.
- Review cadence: trade, day, week, month.
- Default action style: one experiment, checklist, or direct rule.
- Topics to avoid or de-emphasize.

The coach should never hide evidence because of tone settings. Tone changes the
delivery, not the facts.

### Market Data

Purpose: connect candle data so charts render correctly after import.

Fields:

- `MASSIVE_API_KEY`.
- Connection test status.
- Optional fallback note for manual candle CSV later.

UX copy should be plain:

- Used for 1-minute candles and chart context.
- Stored locally/server-side.
- Never exposed to the browser.
- App can still run without it, but charts may use cached or execution-derived
  fallback behavior.

Open implementation question:

- The current app reads `MASSIVE_API_KEY` from environment variables. A true
  setup flow likely needs a local settings/config storage path, otherwise setup
  still requires editing `.env.local`.

### Account / Review Preferences

Purpose: create a clean scope for imports, reporting, and settings without
turning onboarding into brokerage authentication.

Fields:

- Account name.
- Account type label: paper, live, IRA, other.
- Default timezone, with ET as the market-review default.
- Default gross/net reporting preference.
- Optional starting balance or account size for risk context.

Notes:

- This should not become broker login.
- Account switching should continue to scope imports, calendar, trades, reports,
  and journal views.
- This step should feel secondary to broker/model/rules setup.

### Setup Health Summary

Purpose: make progress visible and send the user somewhere useful.

Possible completion destinations:

- Real import complete: imported day/trades review.
- No data yet: Import page.
- Setup only: Dashboard or Journal with next action card.

Completion summary:

- AI coach: connected / static only / missing.
- Trader self-assessment: current / stale / missing.
- Broker import: selected / not selected.
- Rules: configured / skipped.
- Setups: count configured / skipped.
- Coach: configured / default.
- Market data: connected / missing.
- Account/review preferences: configured / default.

## Later Editing Model

Setup and Settings should be the same system. The app should not have separate
"first-run answers" that become stale.

Skipped setup items become **setup hooks** throughout the app. If the user
skips self-assessment, trading rules, setup definitions, coach preferences,
broker choice, or market-data setup, the app should keep a clear return path:

- Settings owns the full editable version of every setup area.
- Dashboard can show compact incomplete setup prompts when they affect the
  current workflow.
- Import can prompt for broker setup or unsupported broker assistance.
- Coach can prompt for self-assessment, rules, setup playbook, or preference
  tuning when review quality is limited by missing context.
- Reports can prompt for setup taxonomy when free-form labels are too noisy to
  explain edge.

Recommended future Settings sections:

- Account profile.
- Data providers.
- AI model provider.
- Broker import preferences.
- Broker adapter lab / unsupported broker assistant.
- Trader self-assessment.
- Trading rules.
- Setup playbook.
- Coach preferences.
- Backup/export.

Dashboard or Settings should show a compact setup health checklist:

- Market data connected.
- AI coach connected.
- Trader self-assessment current.
- Broker import ready.
- At least one account exists.
- Rules configured.
- Approved setups configured.
- Coach preferences configured.
- First import complete.

## Empty, Missing, and Recovery States

Missing Massive key:

- Charts should use cached data or execution fallback when possible.
- Import should still work.
- Chart surfaces should explain that better candles require market-data setup.

Missing language-model key:

- Coach surfaces should show deterministic/session facts and seeded reviews
  where available.
- Live AI generation should be disabled or clearly marked unavailable.
- The app should invite the user to add a provider key or local model endpoint
  from Settings.

No broker selected:

- Import page should still accept a CSV and inspect it.
- Broker picker should remain visible as a helper, not a blocker.

Unsupported broker:

- Import page should show the inspection result and offer to start an
  AI-assisted adapter/mapping workflow.
- The workflow should ask for a small representative file or pasted rows,
  explain privacy/anonymization expectations, and preview normalized output
  before anything is saved.
- If key fields are ambiguous, the app should ask targeted questions instead of
  guessing silently.

No trading rules:

- Coach should avoid claiming rule breaks unless the rule is obvious from user
  notes or deterministic app context.
- Dashboard should invite the user to add risk guardrails.

No setup playbook:

- Trade setup field can remain free-form.
- Reports can still group by existing setup labels.
- Coach should state that setup validity is under-specified.

No coach preferences:

- Use balanced, evidence-first defaults.

No trader self-assessment:

- Coach can still review completed trades from facts, rules, notes, and setup
  definitions.
- Coach should use generic psychology vocabulary and avoid claiming it knows
  the trader's personal forms of FOMO, patience, discipline, or tilt.
- Settings should invite the trader to complete the assessment after an AI model
  is connected.

## UX Shape

Preferred structure:

- A compact setup health area in Settings.
- Each item opens a focused panel or page section.
- Items can be completed out of order.
- Primary actions stay concrete: Test key, choose broker, import CSV, add rule,
  complete assessment, add setup, save coach preferences.
- Avoid onboarding slides, marketing copy, or abstract education.

Visual tone:

- Use the existing dark, type-led system.
- Prefer hairlines and quiet status indicators over card-heavy decoration.
- Treat setup completion as operational status, not gamification.
- Keep forms dense but calm; rules/playbooks need room for real language.

## Data and Architecture Implications

Likely future entities or settings groups:

- App setup state or derived setup health status.
- Account profile settings.
- Market data provider credentials/config.
- Language-model provider credentials/config.
- Broker import preference.
- Broker adapter/mapping drafts.
- Trader self-assessment snapshots.
- Trading rules.
- Setup definitions.
- Coach preference profile.

Important boundary:

- Credentials and secrets need a careful local storage decision. If the app is
  deployed or hosted, secrets must remain server-side and never leak to browser
  bundles.

## Implementation Slices

### Slice 1: Settings Setup Skeleton

- Add this product spec.
- Define setup health/status model.
- Add placeholder Settings sections for setup recovery.

### Slice 2: Model Key + Broker Setup

- Add AI provider key status and connection test.
- After a model is connected, present Trader Self-Assessment as the next useful
  coach-context action.
- Add broker choice and import instructions.
- Keep CSV inspection authoritative.
- Add unsupported broker route into an assisted mapping/adapter workflow.

### Slice 3: Trader Self-Assessment

- Add a short assessment editor in Settings.
- Capture performance self-read, psychology vocabulary, and coaching contract.
- Version each completed assessment snapshot.
- Include the current assessment in coach payloads as hypothesis context with
  verification status.

### Slice 4: Trading Rules

- Add trading rules editor.
- Support structured numeric guardrails and plain-language rules.
- Let the model suggest structured rules from prose, with user confirmation.
- Feed rules into coach payloads and missing-context caveats.

### Slice 5: Setup Playbook

- Add setup playbook editor.
- Feed setup options into trade notes/review forms.
- Feed setup definitions into reports and coach payloads.

### Slice 6: Coach Preferences

- Add coach preference editor.
- Include preferences in coach payloads.
- Make missing-context caveats explicit.

### Slice 7: Market Data + Account Preferences

- Add Massive key status and connection test.
- Add review/account preferences that affect reporting, timezone, and gross/net
  defaults.

### Slice 8: AI-Assisted Broker Adapter

- Let the user provide an unsupported broker sample.
- Inspect columns and representative rows locally.
- Generate a proposed mapping or adapter draft with confidence notes.
- Preview normalized executions before import.
- Save adapter drafts only after user confirmation.

## Open Questions

- Should Settings include a dedicated Setup/Coach Context tab, or should setup
  health appear at the top of existing Settings sections?
- Where should a local `MASSIVE_API_KEY` live in production-like deployments?
- Should setup playbook definitions be database rows, markdown-backed docs, or
  both?
- What is the right boundary between a generic CSV mapper and a code-backed
  broker adapter?
- Should AI-assisted adapter generation happen entirely locally, or can users
  explicitly opt into sending anonymized samples to a hosted model?
- How much of the coach preference profile belongs in deterministic app
  settings versus prompt text?
- How short can the Trader Self-Assessment be while still producing a useful
  baseline self-model?
- Should the app ship with a starter setup template for active momentum
  traders, or should every setup be user-authored?
