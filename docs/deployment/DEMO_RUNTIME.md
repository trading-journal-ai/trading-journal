# Demo Runtime Contract

## Purpose

This doc defines how the Trading Journal AI marketing site, local app, local
demo, and hosted demo relate to each other.

The goal is to keep the product easy to reason about:

```text
One app codebase
One demo fixture source
Multiple runtime databases
```

The hosted demo should feel like the real app, but it should not depend on
public users triggering imports, API calls, or live AI generation.

## Product Surfaces

| Surface | Repo | Host | Domain | Runtime role |
| --- | --- | --- | --- | --- |
| Marketing site | `trading-journal-site` | Vercel | `trading-journal.ai` | Public website, docs, install/demo CTA |
| Hosted demo app | `trading-journal` | Vercel | `demo.trading-journal.ai` target | Read-only app preview |
| Local app | `trading-journal` | Local machine | `localhost:3000` | User-owned journal with local SQLite |
| Local demo | `trading-journal` | Local machine | `localhost:3000` | Resettable demo data for testing and fixture generation |

Current transitional state:

- `trading-journal-site` exists as a separate GitHub repo but is not yet the
  production marketing deployment.
- `https://trading-journal.ai` and `https://trading-journal.ai/demo` are still
  served by the existing Vercel app project.
- `demo.trading-journal.ai` is the preferred future demo host, but it must be
  added to the app Vercel project before the marketing CTA points there.

## Source Of Truth

The app source of truth is the `trading-journal` repo.

The demo content source of truth should be fixture files in the app repo. The
hosted demo database is not the source of truth. It is a generated runtime copy.

Target fixture layout:

```text
samples/demo/
  trades.csv
  journal-notes.json
  playbook.json
  coach-reviews.json
  candles/
```

Current repo state:

- Demo trades currently live at `samples/demo/trades.csv`.
- `samples/demo-trades-and-notes.csv` remains as a legacy compatibility copy.
- Demo database builders currently write `data/tradingjournaldemo.db`.
- Coach review fixtures do not exist yet.
- Hosted Turso refresh is not automated yet.

## Runtime Matrix

| Runtime | Database | Writes | Imports | Candles | AI coach |
| --- | --- | --- | --- | --- | --- |
| Local app | `DB_PATH=data/journal.db` | Enabled | Enabled | Remote fetch allowed with `MASSIVE_API_KEY` | Live OpenAI allowed with `OPENAI_API_KEY` |
| Local demo | `DB_PATH=data/tradingjournaldemo.db` | Enabled/resettable | Seeded by scripts | Remote fetch allowed locally | Live OpenAI allowed locally for fixture generation |
| Hosted demo | `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` | Disabled by `DEMO_READ_ONLY=true` | Disabled | Cached/fallback only | Static seeded coach reviews only |
| Marketing site | None | None | None | None | None |

## Environment Contract

### Local app

```text
DB_PATH=data/journal.db
DEMO_READ_ONLY=false
MASSIVE_API_KEY=optional_local_key
OPENAI_API_KEY=optional_local_key
```

### Local demo

```text
DB_PATH=data/tradingjournaldemo.db
DEMO_READ_ONLY=false
MASSIVE_API_KEY=optional_local_key
OPENAI_API_KEY=optional_local_key
```

Local demo may call OpenAI because it is developer-owned and useful for creating
approved coach fixtures.

### Hosted demo app

```text
TURSO_DATABASE_URL=libsql://demo-database...
TURSO_AUTH_TOKEN=demo_database_token
DEMO_READ_ONLY=true
MASSIVE_API_KEY=unset
OPENAI_API_KEY=unset
```

Hosted demo must not require public live API calls. It should render from seeded
database content and cached/fallback market data.

### Marketing site

```text
NEXT_PUBLIC_DEMO_URL=https://demo.trading-journal.ai
```

During transition, the site can default to `https://trading-journal.ai/demo`.
After the app project owns `demo.trading-journal.ai`, set
`NEXT_PUBLIC_DEMO_URL` to that subdomain.

## Hosted Demo Data Flow

The hosted demo data flow should be:

```text
Fixture files in app repo
  -> local build/seed script
  -> generated local demo SQLite DB
  -> hosted refresh script
  -> Turso hosted demo DB
  -> Vercel app reads Turso in read-only mode
```

The fixture files should be reviewed and committed. The hosted database should
be treated as a deploy artifact that can be rebuilt intentionally.

## AI Coach Demo Behavior

The public hosted demo should not call OpenAI live.

Preferred flow:

1. Run local demo with a private `OPENAI_API_KEY`.
2. Generate coach reviews from the deterministic payload and demo notes.
3. Edit and approve the responses.
4. Save approved responses as fixtures.
5. Seed fixtures into `coach_reviews` rows in the demo database.
6. Hosted demo displays those seeded reviews in read-only mode.

When `DEMO_READ_ONLY=true`, coach UI should prefer existing seeded coach review
rows and should not expose a public path that triggers paid or nondeterministic
OpenAI generation.

## Refresh Rules

Refreshing hosted demo data is a mutating operation. It should be explicit.

Target command shape:

```bash
TURSO_DATABASE_URL=...
TURSO_AUTH_TOKEN=...
npm run demo:refresh-hosted -- --confirm-hosted-demo
```

The refresh script should:

- Refuse to run without `--confirm-hosted-demo`.
- Refuse to run without Turso env vars.
- Print the target database host before making changes.
- Verify the target looks like the demo database.
- Apply migrations before seeding.
- Clear and reseed demo-owned rows.
- Seed trades, journal notes, playbook, candles, and approved coach reviews.
- Print final record counts.

Do not make hosted demo refresh part of ordinary app deploy. App code can deploy
automatically through Vercel, but database refreshes should stay intentional.

## Deployment Flow

### App code update

```text
Push app repo main
  -> Vercel app project rebuilds
  -> hosted demo receives latest app UI/code
  -> hosted demo keeps existing Turso data
```

### Demo content update

```text
Update fixture files
  -> verify local demo
  -> run hosted demo refresh script
  -> hosted Turso demo DB updates
```

### Marketing update

```text
Push site repo main
  -> Vercel site project rebuilds
  -> trading-journal.ai updates
  -> CTA links to hosted demo app
```

## Next Build Checklist

1. Add playbook and static coach-review fixtures.
2. Add local seed support for coach review fixtures.
3. Add hosted refresh script with confirmation guard.
4. Add hosted demo UI behavior for static coach reviews.
5. Move app demo domain to `demo.trading-journal.ai`.
6. Deploy marketing site to `trading-journal.ai`.

## Non-Goals

- Do not make the marketing site own demo data.
- Do not make public users trigger live OpenAI calls in the hosted demo.
- Do not refresh hosted demo data on every code deploy.
- Do not duplicate the app UI inside the marketing repo.
