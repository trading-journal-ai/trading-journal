# Baby Onboarding & Setup Flow

> Status: Draft · Last updated: 2026-07-03

This doc defines the first-run setup experience for Trading Journal AI. The goal
is not to trap a new user in a long wizard. The goal is to get enough context
into the app that imports, charts, reports, and coaching work immediately, while
leaving every preference tunable later.

Working name: **Baby Onboarding**. It should feel lightweight, recoverable, and
useful from minute one.

## Product Thesis

The app becomes more valuable when it knows four things early:

- Where trade data will come from.
- Whether candle data can be fetched.
- Whether AI coaching can run, and which model/provider should power it.
- What rules the trader is trying to follow.
- Which setups and behaviors the coach should evaluate against.

Broker selection and the Massive key make the app functional. Trading rules,
language-model setup, setup playbook, and coach preferences make the app feel
personal and intelligent.

## Goals

- Guide a new user from first launch to useful review state.
- Support demo, empty, and real-import starts.
- Make missing config obvious without blocking the rest of the app.
- Let users return later to finish or change setup.
- Keep sensitive data local-first and clearly explain what is stored.
- Give the coach structured context instead of asking the LLM to infer a
  trading plan from scattered notes.

## Non-Goals

- No broker account linking or automated execution sync.
- No auth, cloud profile, or multi-user workspace assumptions.
- No required AI configuration before the journal can be used.
- No giant intake form that delays importing the first trades.

## Design Principles

### Setup Is a Checklist, Not a Wall

The user should be able to skip any step and land in the app. Skipped items
remain visible as incomplete setup cards in Settings, Dashboard, or an explicit
Setup page.

### Ask Only When the Answer Improves the App

Every question should unlock a capability:

- Massive key unlocks high-quality charts.
- Language-model key unlocks live AI coaching.
- Broker choice unlocks import instructions and better diagnostics.
- Risk rules unlock daily accountability and coach evaluation.
- Setup playbook unlocks setup-level analytics and better AI review.
- Coach preferences unlock tone and focus calibration.

### Defaults Beat Blankness

When the user skips a section, the app should provide sensible defaults and name
the limitation. Example: if no setup playbook exists, the coach can still review
execution and behavior, but should not pretend to know whether the technical
setup was valid.

### Tunable Forever

Anything collected during onboarding must be editable later. The same underlying
settings should power first-run setup and long-term configuration.

## Entry Points

- First launch with no local database.
- First launch with database but no imported trades.
- Settings: manual return to setup checklist.
- Dashboard: persistent incomplete setup nudges.
- Import page: broker setup and market-data setup prompts.
- Coach page or report flow: setup playbook and coach preference prompts.

## Setup Checklist

### 1. Start Mode

Purpose: decide how the user wants to enter the product.

Options:

- **Use demo data**: fastest way to inspect the app.
- **Import real trades**: go directly to broker import setup.
- **Start empty**: create workspace/account and continue without data.

Expected behavior:

- Demo mode should be clearly labeled and reversible.
- Real import should route into broker selection.
- Empty mode should still create a default account/profile so navigation works.

### 2. Account Profile

Purpose: create a clean scope for imports, reporting, and settings.

Fields:

- Account name.
- Account type label: paper, live, IRA, other.
- Default timezone, with ET as the market-review default.
- Default gross/net reporting preference.
- Optional starting balance or account size for risk context.

Notes:

- This should not become brokerage authentication.
- Account switching should continue to scope imports, calendar, trades, reports,
  and journal views.

### 3. Market Data

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

### 4. Broker / Import Format

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

### 5. AI Coach / Language Model

Purpose: connect the user's preferred language-model service so coach generation
can run outside the static demo path.

Fields:

- Provider: OpenAI first; other providers later if supported.
- API key or local model endpoint.
- Connection/test status.
- Default model, if the provider exposes useful choices.
- Whether live coach generation is enabled.

UX copy should be plain:

- Used for AI coach reviews, summaries, and setup/playbook assistance.
- Stored locally/server-side, never in browser bundles.
- The app can still run without it; coach surfaces fall back to static reviews,
  deterministic facts, or missing-context prompts.
- Hosted demo should not ask public visitors to enter secrets unless there is a
  clearly local-only/private storage path and explicit copy.

Open implementation question:

- For local-first installs, should the key live in `.env.local`, an encrypted
  local settings store, or a desktop wrapper keychain integration?

### 6. Trading Rules

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

### 7. Setup Playbook

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

### 8. Coach Preferences

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

### 9. Finish State

Purpose: make progress visible and send the user somewhere useful.

Possible completion destinations:

- Demo data: Dashboard or Journal.
- Real import complete: imported day/trades review.
- No data yet: Import page.
- Setup only: Dashboard with next action card.

Completion summary:

- Market data: connected / missing.
- AI coach: connected / static only / missing.
- Broker import: selected / not selected.
- Account: configured.
- Rules: configured / skipped.
- Setups: count configured / skipped.
- Coach: configured / default.

## Later Editing Model

Onboarding and Settings should share the same underlying configuration. The app
should not have separate "first-run answers" that become stale.

Skipped onboarding items become **setup hooks** throughout the app. If the user
skips trading rules, setup definitions, coach preferences, broker choice, or
market-data setup, the app should keep a clear return path:

- Settings owns the full editable version of every setup area.
- Dashboard can show compact incomplete setup prompts when they affect the
  current workflow.
- Import can prompt for broker setup or unsupported broker assistance.
- Coach can prompt for rules, setup playbook, or preference tuning when review
  quality is limited by missing context.
- Reports can prompt for setup taxonomy when free-form labels are too noisy to
  explain edge.

Recommended future Settings sections:

- Account profile.
- Data providers.
- AI model provider.
- Broker import preferences.
- Broker adapter lab / unsupported broker assistant.
- Trading rules.
- Setup playbook.
- Coach preferences.
- Backup/export.

Dashboard or Setup page should show a compact setup health checklist:

- Market data connected.
- AI coach connected.
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

## UX Shape

Preferred structure:

- A compact setup checklist with 6-8 steps.
- Each step opens a focused panel or page section.
- Steps can be completed out of order.
- Primary actions stay concrete: Test key, choose broker, import CSV, add rule,
  add setup, save coach preferences.
- Avoid onboarding slides, marketing copy, or abstract education.

Visual tone:

- Use the existing dark, type-led system.
- Prefer hairlines and quiet status indicators over card-heavy decoration.
- Treat setup completion as operational status, not gamification.
- Keep forms dense but calm; rules/playbooks need room for real language.

## Data and Architecture Implications

Likely future entities or settings groups:

- App setup state or derived checklist status.
- Account profile settings.
- Market data provider credentials/config.
- Language-model provider credentials/config.
- Broker import preference.
- Broker adapter/mapping drafts.
- Trading rules.
- Setup definitions.
- Coach preference profile.

Important boundary:

- Credentials and secrets need a careful local storage decision. If the app is
  deployed or hosted, secrets must remain server-side and never leak to browser
  bundles.

## Implementation Slices

### Slice 1: Setup Doc + Settings Skeleton

- Add this product spec.
- Define setup checklist status model.
- Add placeholder Settings sections for setup recovery.

### Slice 2: First-Run Detection

- Detect no database / no account / no trades.
- Route to setup checklist or show setup prompt.
- Support demo, import, or empty start.

### Slice 3: Market Data + Broker Setup

- Add Massive key status and connection test.
- Add AI provider key status and connection test.
- Add broker choice and import instructions.
- Keep CSV inspection authoritative.
- Add unsupported broker route into an assisted mapping/adapter workflow.

### Slice 4: Rules + Playbook

- Add trading rules editor.
- Add setup playbook editor.
- Feed setup options into trade notes/review forms.

### Slice 5: Coach Preferences

- Add coach preference editor.
- Include rules, setup playbook, and preferences in coach payloads.
- Make missing-context caveats explicit.

### Slice 6: AI-Assisted Broker Adapter

- Let the user provide an unsupported broker sample.
- Inspect columns and representative rows locally.
- Generate a proposed mapping or adapter draft with confidence notes.
- Preview normalized executions before import.
- Save adapter drafts only after user confirmation.

## Open Questions

- Should first-run setup be its own route (`/setup`) or a mode inside
  `/settings`?
- Where should a local `MASSIVE_API_KEY` live in production-like deployments?
- Should setup playbook definitions be database rows, markdown-backed docs, or
  both?
- What is the right boundary between a generic CSV mapper and a code-backed
  broker adapter?
- Should AI-assisted adapter generation happen entirely locally, or can users
  explicitly opt into sending anonymized samples to a hosted model?
- How much of the coach preference profile belongs in deterministic app
  settings versus prompt text?
- Should the app ship with a starter setup template for active momentum
  traders, or should every setup be user-authored?
