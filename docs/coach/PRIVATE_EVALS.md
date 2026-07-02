# Private Coach Evals

Private coach evals are local-only test cases for judging AI Coach v1 against
real trading data. They are not training data for deployment, and they must not
be committed or uploaded to the hosted demo.

## Storage Contract

Private files live under:

```text
data/evals/coach/
  raw/      # real CSV exports
  cases/    # private eval case JSON
  outputs/  # local model outputs and payload snapshots
```

The entire `data/evals/` tree is gitignored. Keep real broker exports, real
notes, and real playbook drafts there.

Committed files may include:

- this document
- the local eval runner
- public-safe schemas or templates
- sanitized demo fixtures in `samples/demo/`

Committed files must not include:

- raw real trades
- real journal notes
- private edge/process notes
- generated model outputs from private cases

## Case Format

Each private case is a JSON file:

```json
{
  "version": 1,
  "id": "2026-06-16-paper",
  "title": "June 16 paper trading day",
  "sourceCsv": "data/evals/coach/raw/2026-06-18-app-trades-export.csv",
  "scope": "day",
  "scopeKey": "2026-06-16",
  "playbook": {
    "title": "Paper Momentum Playbook",
    "body": "Approved setups, entry rules, invalidation, exits, and common mistakes.",
    "rubric": "Setup quality: strong / mixed / weak / unknown"
  },
  "humanContext": {
    "recap": "What happened?",
    "intent": "What were you trying to trade?",
    "didWell": "What did you execute well?",
    "standardsDrift": "Where did standards slip?",
    "emotionalState": "calm / rushed / tilted / hesitant / FOMO / revenge / confident"
  },
  "expected": {
    "shouldSay": ["One or more judgments the coach should make."],
    "shouldNotSay": ["Claims the coach should avoid."],
    "tags": ["good-loss", "overtrading-day"]
  }
}
```

## Running

Validate cases and write local payload snapshots:

```bash
npm run coach:eval
```

Run one case:

```bash
npm run coach:eval -- --case data/evals/coach/cases/001-june-16-paper.json
```

Generate a live model response only when you intentionally want to send the
private payload to OpenAI:

```bash
npm run coach:eval -- --case data/evals/coach/cases/001-june-16-paper.json --generate
```

`--generate` requires `OPENAI_API_KEY` in `.env.local` or the shell
environment. Outputs are saved under `data/evals/coach/outputs/`.

## Review Standard

The first v1 evals should check whether the coach can:

- separate outcome quality from process quality
- identify trades that matched or drifted from the playbook
- use only deterministic numbers from the payload
- admit missing context instead of inventing intent
- propose one concrete experiment, not a vague motivational note
