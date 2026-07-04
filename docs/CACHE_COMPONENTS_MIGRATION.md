# Cache Components Migration — WIP (paused)

**Goal:** make the hosted demo's first paint *instant* by serving a prerendered
static shell from the CDN (no serverless cold start), with the data-driven
content streaming in. This is Next 16's **Cache Components** (the successor to
per-route Partial Prerendering).

**Status:** in progress, **build does not pass yet.** Branch:
`perf/demo-ppr-static`. Nothing deployed or merged. Production is unaffected.

## Why this is bigger than a demo toggle

Next 16 **removed** opt-in-per-route PPR (`experimental_ppr`). The only way to
get static-shell + streaming is `cacheComponents: true`, which is **global** —
it changes rendering/caching semantics for **every** route, including the
**local read-write app**, not just the demo. So this is an app-wide migration
with correctness implications for the local experience, not a scoped demo tweak.

## Done (on this branch)

- `next.config.ts`: `cacheComponents: true`.
- Removed all route segment configs it forbids: `export const dynamic`
  (8 routes), `export const runtime` (dictation route), `experimental_ppr`.
- `src/lib/accountScope.ts`: `getActiveAccount()` skips `cookies()` when
  `DEMO_READ_ONLY` — so the demo shell has no request-dynamic dependency.
- Wrapped every `searchParams` page's data-loading in `<Suspense>` with a
  skeleton (rename `XPage` → `XContent`, add a thin default export that wraps
  it): journal, calendar, reports, trades, trades/[id], trades/review, plus the
  two orphan pages. Skeletons: `JournalSkeleton`, `RouteSkeleton`.
- **Result:** under `DEMO_READ_ONLY=true`, journal + calendar + reports +
  trades + review now prerender successfully.

## Remaining blockers (specific)

1. **Layout static shell.** `(app)/layout.tsx` does `await listAccounts()` (DB)
   — uncached data in the static shell → prerender error (surfaced on
   `/trades/[id]`, but it's the shared shell). Fix: cache the static account
   **list** (`'use cache'`) while keeping the cookie-based **active account**
   dynamic *on the local app only*. This is the demo-vs-local tension: the demo
   shell must be fully static (no cookies — already handled), but the local app
   reads a cookie here and must stay dynamic. Likely resolution: split — cache
   `listAccounts`, move the active-account (cookie) selection into a dynamic
   boundary. **Must not break `DEMO_READ_ONLY=false npm run build`** (the group
   runs the app locally).

2. **`Date.now()` in `TradeJournalReview.tsx:382`** (`currentEtDate`). Cache
   Components forbids reading current time during static prerender. It only
   trips the **orphan** `trades/review/mock` page — the real journal/review
   pages read `searchParams` (dynamic) first, which makes it allowed. Fix
   options: (a) delete the two orphan, unlinked dev pages
   `trades/review/mock` + `trades/lightweight-prototype` (safe — nothing links
   them; restorable from git), or (b) make `currentEtDate` prerender-safe
   (client component, or pass the date in, or `cacheLife`).

3. **Local read-write app under `cacheComponents`.** Because it's global, the
   local app's build + runtime change too (account switching, live-data
   freshness, `next build` compatibility). Needs its own validation so caching
   doesn't make the local app stale or fail to build.

## Resume steps

1. Blocker 2: delete the orphan pages (or fix `currentEtDate`).
2. Blocker 1: split the layout — cache the account list, keep active-account
   dynamic; verify **both** builds:
   - `DEMO_READ_ONLY=true DEMO_DB_PATH=samples/demo/tradingjournaldemo.db npm run build`
   - `DEMO_READ_ONLY=false npm run build`  ← must still pass (local/group build)
3. Confirm the build's route table marks journal/etc. as Partial Prerender.
4. Push → deploy a **Vercel preview** (`DEMO_READ_ONLY=true`) → verify: demo
   renders, click-path works, first paint is instant (static shell), date-nav
   works.
5. Measure TTFB (preview vs. production). **Merge only if it wins.**

## Gotchas / notes

- `cacheComponents` forbids `dynamic` / `runtime` / `experimental_ppr` route
  configs entirely — remove them everywhere.
- Any uncached async data (DB, `cookies()`, `searchParams`) must be inside a
  `<Suspense>` boundary or a `'use cache'` scope.
- Current time (`Date.now()`, `new Date()`) is forbidden in static prerender.
- Building in a git worktree needs a real `node_modules` (a symlink breaks the
  Turbopack build) — run `npm ci` in the worktree.
- Always build the demo with `DEMO_READ_ONLY=true DEMO_DB_PATH=...`.

## Honest assessment

The static-shell win is real and this is the correct Next 16 path to it — but
it's an **app-wide** migration touching the layout's account model and the core
`TradeJournalReview`, and it changes the local app's caching semantics. Treat it
as a deliberate, tested project (verify demo **and** local builds), not a quick
win. If the demo-speed payoff doesn't justify that scope right now, the
low-risk alternative is a keep-warm ping (see `ARCHITECTURE.md`), leaving this
branch to resume when the demo's polish is worth the investment.
