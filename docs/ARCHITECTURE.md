# System Architecture — App, Demo, and Marketing Site

A holistic map of the whole system, written to step back after a fast-moving
build and ask three questions honestly: **did we make the right decisions, can
we simplify, and what's next?** This is the repo-wide companion to the
surface-specific docs ([`DEMO_RUNTIME.md`](deployment/DEMO_RUNTIME.md) for the
runtime contract, [`PERFORMANCE_AUDIT.md`](deployment/PERFORMANCE_AUDIT.md) for
the latency work).

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
- There is **no auth, no user system, no middleware**. A single account with a
  cookie-selected "active account" — consistent with local-first.

## Data & storage architecture

**Principle: SQLite everywhere. Local when you run it, bundled when it's the
demo.** ([`db/index.ts`](../src/lib/db/index.ts) resolves the source.)

| Mode | Store | Writes |
| --- | --- | --- |
| Local app / demo | SQLite file (`DB_PATH`) | read-write |
| Hosted demo | **bundled** SQLite file (`DEMO_DB_PATH`), copied to `/tmp` per cold start | read-only |
| Per-visitor demo edits | `localStorage` overlay *(planned)* | browser-only, throwaway |

The demo content source of truth is fixtures in `samples/demo/`; the demo DB is
a **generated artifact** built from them, not hand-maintained.

### Decision assessment — storage

- ✅ **Local-first SQLite is right** and matches the product's conviction
  (runs on your machine, nothing phones home, easy to fork).
- ✅ **Bundled file for the demo (not a separate static-JSON renderer) is
  right** — it keeps the demo on the *identical* server-render + Drizzle code
  path as the real app, so the demo can't drift from the product. (See
  [`PERFORMANCE_AUDIT.md`](deployment/PERFORMANCE_AUDIT.md).)
- ⚠️ **Turso is vestigial and should be removed.** It exists only because
  serverless filesystems are read-only/ephemeral, so a *read-write* hosted
  demo would have needed an external DB. The demo is now read-**only**, which
  erased that need. Because the whole product is local-first, a hosted DB
  server is arguably never needed. **Next step:** after the bundled-file demo
  is verified on a preview deploy, delete the `TURSO_DATABASE_URL` path from
  `db/index.ts` and the env docs. Collapses the storage story to one sentence.
- 🔜 **`localStorage` overlay (planned).** Let demo visitors add notes/tags
  during a session; store them in the browser only, merged over the read-only
  seed **client-side**; clears when they leave. Adds *zero* backend surface.
  The strict rule that keeps it lightweight: demo writes never reach the
  server — the server always renders the shared seed, a thin client layer
  overlays the visitor's session edits.

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
- ⚠️ **`force-dynamic` on the read-only demo is the core latency bug.** Static
  content is served through the most dynamic possible path (cold start + DB
  round-trips per request). PR fixing the DB round-trips is in flight; the
  *rendering* mode is the remaining lever.
- 🚧 **Fully static demo is blocked app-wide by `searchParams`.** Journal,
  trades, reports, calendar, and review all filter via the URL query string,
  which forces dynamic rendering. Making the demo static (served from CDN, no
  function, no cold start) requires either moving that filtering client-side or
  restructuring routes to path segments (`/journal/[date]`). This is the
  biggest remaining optimization and a real project — not a config flip.

## External dependencies

Three, and the demo should need **none** of them at runtime.

| Dependency | Used for | Needed on hosted demo? |
| --- | --- | --- |
| Turso (`@libsql/client` remote) | hosted-demo DB (legacy) | ❌ replaced by bundled file — remove |
| MASSIVE (`MASSIVE_API_KEY`) | live candle/market data ([`candles/`](../src/lib/candles/)) | ❌ demo uses cached/fallback candles only |
| OpenAI (`OPENAI_API_KEY`) | live AI coach generation | ❌ demo uses static seeded coach reviews |

The demo is designed to make **no public live API calls** — it renders from
seeded content and cached/fallback data. Worth confirming each fallback path is
actually exercised in demo mode (see Open questions).

## Deployment topology

```text
Visitor → trading-journal.ai (marketing, static CDN, instant)
            │  clicks CTA
            ▼
        demo.trading-journal.ai (this app on Vercel, DEMO_READ_ONLY=true)
            │  serverless function: cold start → render → read DB
            ▼
        bundled SQLite file (after the perf change; was remote Turso)
```

The multi-second first load = **redirect hop + serverless cold start + (was)
remote DB round-trips**. The bundled-file change removes the DB network cost;
cold start remains until/unless the demo goes static.

## Decisions to re-examine (the "did we move too fast?" list)

1. **Turso** — vestigial; remove. (High confidence, low effort, after preview
   verify.)
2. **`force-dynamic` on the demo** — the real perf ceiling; static is the fix
   but needs the searchParams refactor. (High value, higher effort.)
3. **Redirect chain** — marketing CTA should link to the final URL
   (`/journal`) to skip the 307. (Trivial.)
4. **Line-ending hygiene** — mixed LF/CRLF has already caused one corruption
   this cycle; add a `.gitattributes` to normalize. (Cheap, prevents pain.)
5. **Shared working tree** — multiple people editing one checkout caused a
   corrupted `package.json` and a tangled PR. Adopt git worktrees / clearer
   branch ownership. (Process, not code.)

## Optimization opportunities (prioritized)

1. **Bundled-file demo DB** — removes remote-DB latency. *(in flight)*
2. **Remove Turso** — simplifies storage to one story. *(after #1 verified)*
3. **Direct-link the marketing CTA** — drop the redirect hop. *(trivial)*
4. **Static/ISR demo rendering** — removes cold start entirely; needs the
   searchParams refactor. *(biggest remaining win, real project)*
5. **`localStorage` session overlay** — lets visitors interact without any
   backend. *(feature, not perf)*

## Open questions

- Are the MASSIVE and OpenAI **fallback paths** actually exercised on the demo,
  or could a missing key throw at request time?
- What is the real breakdown of the ~3s (redirect vs. cold start vs. DB)?
  Capture a live trace before committing to the static refactor.
- Should the demo eventually be its **own thinner build** (static export) or
  stay the full app in read-only mode?
- Where does the `localStorage` overlay merge happen, per component, without
  forking the render path?

## Relationship to other docs

- [`deployment/DEMO_RUNTIME.md`](deployment/DEMO_RUNTIME.md) — the runtime
  contract and env matrix per surface.
- [`deployment/PERFORMANCE_AUDIT.md`](deployment/PERFORMANCE_AUDIT.md) — the
  latency root-cause analysis and the bundled-file fix.
- [`product/APP_MAP.md`](product/APP_MAP.md) — the in-app feature/route map.
