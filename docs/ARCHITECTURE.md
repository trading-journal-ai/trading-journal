# System Architecture — App, Demo, and Marketing Site

A holistic map of the whole system, written to step back after a fast-moving
build and ask three questions honestly: **did we make the right decisions, can
we simplify, and what's next?**

This is the single source of truth for how the surfaces relate, how data and
rendering work, and how to operate the demo. Part 1 is the model and analysis;
Part 2 is the operational reference (env, build, deploy). The latency
deep-dive lives in [`PERFORMANCE_AUDIT.md`](deployment/PERFORMANCE_AUDIT.md).

---

# Part 1 — Model & Analysis

## The mental model: 3 surfaces, 2 repos, 1 app in 2 modes

The thing that causes confusion is that "the demo" spans concepts but **not**
repos. There is one app; it runs in two modes.

| Surface | Repo | Domain | What it is | Data |
| --- | --- | --- | --- | --- |
| Marketing site | `trading-journal-site` | `trading-journal.ai` | Static, lightweight frontend. Its job is a CTA that links out. | none |
| Hosted demo | `trading-journal` (this repo) | `demo.trading-journal.ai` | **The app**, read-only mode | bundled SQLite file |
| Local app | `trading-journal` (this repo) | `localhost` | **The app**, read-write, user-owned | local SQLite file |

- The marketing site is a **separate repo and infrastructure**. Clicking its
  CTA crosses to a different domain and loads the app. It is not involved in
  any app behavior or performance; it loads instantly.
- The **hosted demo and the local app are the same codebase** in different
  modes, switched by `DEMO_READ_ONLY` ([`demoMode.ts`](../src/lib/demoMode.ts)).
- **Local demo** is a fourth flavor: the local app pointed at the resettable
  demo DB — used to test and to generate demo fixtures.
- There is **no auth, no user system, no middleware**. A single account with a
  cookie-selected "active account" — consistent with local-first.

## Data & storage architecture

**Principle: SQLite everywhere. Local when you run it, bundled when it's the
demo. Nothing phones a database over the network.**
([`db/index.ts`](../src/lib/db/index.ts) resolves the source.)

| Mode | Store | Writes |
| --- | --- | --- |
| Local app / local demo | SQLite file (`DB_PATH`) | read-write |
| Hosted demo | **bundled** SQLite file (`DEMO_DB_PATH`), copied to `/tmp` per cold start | read-only |
| Per-visitor demo edits | `localStorage` overlay *(planned)* | browser-only, throwaway |

The demo content source of truth is fixtures in `samples/demo/`; the demo DB is
a **generated artifact** built from them, not hand-maintained.

### Decision assessment — storage

- ✅ **Local-first SQLite is right** and matches the product's conviction
  (runs on your machine, nothing phones home, easy to fork).
- ✅ **Bundled file for the demo (not a separate static-JSON renderer) is
  right** — it keeps the demo on the *identical* server-render + Drizzle code
  path as the real app, so the demo can't drift from the product.
- ✅ **Turso removed.** It existed only because serverless filesystems are
  read-only/ephemeral, so a *read-write* hosted demo would have needed an
  external DB. The demo is read-**only**, which erased that need, and the
  product is local-first, so a hosted DB server is never needed. The
  `TURSO_DATABASE_URL` path is gone from `db/index.ts`; storage is now one
  sentence: a SQLite file, local when you run it, bundled when it's the demo.
- 🔜 **`localStorage` overlay (planned).** See Part 2 for the rules.

## Rendering architecture

The app is **server-rendered from SQLite via Drizzle**, with a heavily
interactive client layer (34 of 59 components are `"use client"`). Server
Components query the DB; client components handle interaction.

**Every app route is `force-dynamic`** ([`(app)/layout.tsx`](../src/app/(app)/layout.tsx)
and each page). That means no caching or prerendering — a fresh server render
per request.

### Decision assessment — rendering

- ✅ **`force-dynamic` is correct for the local app** — a live read-write
  journal should always reflect current data.
- ⚠️ **`force-dynamic` on the read-only demo is the remaining latency cost.**
  The bundled-file DB removed the per-request network round-trips; what's left
  is the serverless **cold start** (a function still wakes and renders on every
  hit). This is why the demo is faster but not yet instant.
- 🚧 **Fully static demo is blocked app-wide by `searchParams`.** Journal,
  trades, reports, calendar, and review all filter via the URL query string,
  which forces dynamic rendering. Making the demo static (served from CDN, no
  function, no cold start — i.e. *instant*) requires either moving that
  filtering client-side or restructuring routes to path segments
  (`/journal/[date]`). This is the biggest remaining optimization and a real
  project — not a config flip.

## External dependencies

Two remain (Turso was removed), and the demo needs **neither** at runtime.

| Dependency | Used for | Needed on hosted demo? |
| --- | --- | --- |
| MASSIVE (`MASSIVE_API_KEY`) | live candle/market data ([`candles/`](../src/lib/candles/)) | ❌ demo uses cached/fallback candles only |
| OpenAI (`OPENAI_API_KEY`) | live AI coach generation | ❌ demo uses static seeded coach reviews |

Dictation (voice notes → text) runs on a **local** Whisper Python sidecar
([`scripts/local_transcribe_server.py`](../scripts/local_transcribe_server.py))
— local-only, never part of the hosted demo. The demo makes **no public live
API calls**; it renders from the bundled DB and cached/fallback data.

## Deployment topology

```text
Visitor → trading-journal.ai (marketing, static CDN, instant)
            │  clicks CTA
            ▼
        demo.trading-journal.ai (this app on Vercel, DEMO_READ_ONLY=true)
            │  serverless function: cold start → render → read DB
            ▼
        bundled SQLite file (local to the function; was remote Turso)
```

The multi-second first load was **redirect hop + serverless cold start +
remote DB round-trips**. The bundled-file DB removed the DB network cost
(~halved the load in practice); the **cold start** remains until/unless the
demo goes static.

## Decisions to re-examine (the "did we move too fast?" list)

1. **`force-dynamic` on the demo** — the real perf ceiling now that Turso is
   gone; static is the fix but needs the searchParams refactor. (High value,
   higher effort.)
2. **Redirect chain** — marketing CTA should link to the final URL
   (`/journal`) to skip the 307. (Trivial.)
3. **Shared working tree** — multiple people editing one checkout caused a
   corrupted `package.json`, a tangled PR, and a lost doc consolidation. Adopt
   git worktrees / clearer branch ownership. (Process, not code.)

*Resolved this cycle:* Turso removed; line-ending hygiene fixed
(`.gitattributes` now normalizes `.ts/.tsx/.json/.css` to LF, the gap that
caused the `package.json` corruption).

## Optimization opportunities (prioritized)

1. **Static/ISR demo rendering** — removes cold start entirely; needs the
   searchParams refactor. *(biggest remaining win, real project)*
2. **Direct-link the marketing CTA** — drop the redirect hop. *(trivial)*
3. **`localStorage` session overlay** — lets visitors interact without any
   backend. *(feature, not perf)*

## Open questions

- Are the MASSIVE and OpenAI **fallback paths** actually exercised on the demo,
  or could a missing key throw at request time?
- What is the real breakdown of the remaining load (redirect vs. cold start)?
  Capture a live trace before committing to the static refactor.
- Should the demo eventually be its **own thinner build** (static export) or
  stay the full app in read-only mode?
- Where does the `localStorage` overlay merge happen, per component, without
  forking the render path?

---

# Part 2 — Operational Reference

## Source of truth

- **App code:** the `trading-journal` repo.
- **Demo content:** fixture files in the app repo (reviewed and committed). The
  demo database is a **generated deploy artifact**, not the source of truth.

```text
samples/demo/
  trades.csv            # present
  coach-reviews.json    # present (approved static coach reviews)
  journal-notes.json    # target
  playbook.json         # target
  candles/              # target
```

## Environment contract

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

Local demo may call OpenAI because it is developer-owned and useful for
generating approved coach fixtures.

### Hosted demo

```text
DEMO_DB_PATH=data/tradingjournaldemo.db
DEMO_READ_ONLY=true
MASSIVE_API_KEY=unset
OPENAI_API_KEY=unset
```

The hosted demo makes **no public live API calls** — it renders from the
bundled DB and cached/fallback market data. There is no Turso configuration.

### Marketing site

```text
NEXT_PUBLIC_DEMO_URL=https://demo.trading-journal.ai
```

During transition the site can default to `https://trading-journal.ai/demo`.

## Demo DB build

The bundled demo DB is built from fixtures at deploy time — no hosted database
to mutate, no refresh script, no confirmation guard.

```text
Fixture files (samples/demo/)
  → build step: npm run demo:db   (generates data/tradingjournaldemo.db)
  → next build                     (next.config outputFileTracingIncludes bundles the .db)
  → serverless function reads the bundled file locally (copied to /tmp per cold start)
```

How the runtime resolves it: when `DEMO_DB_PATH` is set and
`DEMO_READ_ONLY=true`, [`db/index.ts`](../src/lib/db/index.ts) reads that file.
Serverless bundles are read-only and SQLite must write its `-wal`/`-shm`
sidecars, so the file is copied into writable `/tmp` once per cold start.
**Verify on a Vercel preview deployment** (renders + latency dropped) before
pointing the live demo at it.

## Per-visitor demo persistence (`localStorage`)

The hosted demo may let visitors personalize without accounts, using
browser-local storage. **The shared demo DB stays read-only; demo writes never
reach the server** — the server always renders the shared seed, a thin client
layer overlays the visitor's session edits and clears when they leave.

Rules:

- Versioned namespace, e.g. `trading-journal.demo.v1.*`.
- Overlays are device/browser-specific; they vanish when browser data clears.
- Never store API keys, broker exports, account numbers, or raw audio.
- Overlays must be easy to reset or replace when demo fixtures change.

Good candidates: trade-note drafts, daily recap notes, ticker/day review notes,
dismissed onboarding prompts, future playbook/coach-preference demo edits.

## AI coach in the demo

The public demo must not call OpenAI live. Flow:

1. Run local demo with a private `OPENAI_API_KEY`.
2. Generate coach reviews from the deterministic payload + demo notes.
3. Edit and approve the responses.
4. Save approved responses as fixtures (`samples/demo/coach-reviews.json`).
5. Seed them into `coach_reviews` rows when building the demo DB.
6. Hosted demo displays those seeded reviews read-only.

When `DEMO_READ_ONLY=true`, the coach UI prefers existing seeded rows and must
not expose a public path that triggers paid or nondeterministic generation.

## Deployment flows

```text
App code update:   push main → Vercel rebuilds → demo gets latest UI + a freshly built demo DB
Demo content:      update samples/demo fixtures → verify local demo → rebuild → deploy
Marketing update:  push site repo → Vercel rebuilds trading-journal.ai → CTA → hosted demo
```

App code deploys automatically via Vercel. Because the demo DB is a build
artifact (not a mutated hosted DB), a demo-content change is just a fixture edit
+ redeploy — no separate hosted-refresh operation.

## Near-term checklist

1. Add `.gitattributes` line-ending normalization. ✅ done
2. Remove Turso. ✅ done
3. Point the marketing CTA at `demo.trading-journal.ai/journal` (skip redirect).
4. Add playbook/journal-note/candle fixtures under `samples/demo/`.

## Non-goals

- The marketing site must not own demo data.
- Public demo users must not trigger live OpenAI calls.
- The demo must not depend on a hosted database server.
