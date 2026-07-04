# Performance Audit — Hosted Demo First-Load Latency

**Date:** 2026-07-03
**Symptom:** Entering the hosted demo from the marketing site (and some in-app
navigations) takes ~3 seconds, despite the app being small and text-only (no
image-heavy pages, tiny dataset).
**Conclusion:** This is an architecture issue, not a UX one. A loading
animation was prototyped and **deliberately rejected** — it masks the delay
instead of removing it. The fix is to stop rendering read-only static content
as if it were live and dynamic.

> Measurement caveat: the timings below are inferred from the code path and
> deployment shape, not yet measured against the live Vercel deployment. The
> architecture fully explains a multi-second first load; exact attribution
> (cold start vs. DB round-trips vs. redirect) should be confirmed with real
> traces — see "Verification TODO."

## The core mismatch

Per [`ARCHITECTURE.md`](../ARCHITECTURE.md), the hosted demo is **100% read-only,
static content**: `DEMO_READ_ONLY=true`, imports disabled, server writes
disabled, static seeded coach reviews. The data is identical for every visitor
and never changes between deploys.

Yet it is rendered as if every request might mutate state and must be freshly
computed. **Static content is being served through the most dynamic possible
path.**

## The compounding costs (per page view)

### 1. Every app route is `force-dynamic` → no caching, ever

`export const dynamic = "force-dynamic"` is set on essentially every app route:

- [`(app)/layout.tsx`](../../src/app/(app)/layout.tsx)
- [`(app)/journal/page.tsx`](../../src/app/(app)/journal/page.tsx)
- `(app)/trades/page.tsx`, `(app)/trades/[id]/page.tsx`,
  `(app)/trades/review/page.tsx`, `(app)/calendar/page.tsx`,
  `(app)/reports/page.tsx`

This disables prerendering and caching: Vercel runs a fresh serverless render
for **every** request, even though the output is byte-identical for every
visitor. Nothing is ever reused.

### 2. Remote Turso DB, hit over the network, sequentially

[`src/lib/db/index.ts`](../../src/lib/db/index.ts) builds an `@libsql/client`
against `TURSO_DATABASE_URL` on the hosted demo — every query is an **HTTP
round-trip** to Turso. And the reads are **sequential**, not parallel:

```text
layout:  await listAccounts()  →  await getActiveAccount(accounts)
page:    await latestJournalDate()   (itself 2 sequential queries)
         →  await <full journal dataset>
```

If the Turso region is not co-located with the Vercel function region, this is
easily 5–8 network hops in series before the first byte renders.

### 3. Serverless cold start

Because the pages are `force-dynamic`, there is always a function invocation.
A cold one adds hundreds of ms to seconds. Static pages served from the CDN
invoke no function at all.

### 4. Redirect hop (minor)

[`next.config.ts`](../../next.config.ts) redirects `/` → `/dashboard` (or
`demo.trading-journal.ai/` → `/journal`). Entry from the marketing CTA incurs a
307 before rendering begins.

**Net:** cold start + no cache + N sequential cross-network DB reads + a
redirect, for content that never changes.

## Recommendations (priority order)

### 1. Serve the hosted demo statically (biggest win)

Since demo data is immutable, these pages should be prerendered (SSG) or
ISR-cached and served from the CDN — **no function, no DB, no cold start at
request time.**

`force-dynamic` exists because the *local* app is a live read-write journal.
So make dynamism **conditional on runtime**:

- `DEMO_READ_ONLY=true` (hosted demo) → static / long-`revalidate`.
- `DEMO_READ_ONLY=false` (local app) → dynamic, as today.

This single change makes the loader unnecessary: a cached HTML document from
the CDN returns in tens of milliseconds.

### 2. Read a bundled SQLite file on the demo instead of remote Turso

The demo DB is a fixture (`data/tradingjournaldemo.db`). Bundling it into the
deployment and reading it as a local file removes the network entirely.
`next.config` already externalizes `better-sqlite3`, suggesting file-mode was
the original design. (If any route stays dynamic, also `Promise.all` the
independent queries so round-trips overlap instead of stacking.)

### 3. Point the marketing CTA at the final URL

Link the demo CTA directly to `/journal` (or `/dashboard`) to skip the 307
redirect. Free.

### 4. (Optional) Keep-warm only if anything stays dynamic

If some route must remain dynamic, a scheduled ping avoids cold starts. Not
needed for anything made static by #1 — static assets never go cold.

## Why not the loader

A loading animation was prototyped (a growing green "grab attention" mark,
shown only on entry from the marketing site). It was rejected because:

- It treats the symptom. The content is static and *should* be near-instant.
- It can't cover the worst part anyway — the pre-first-byte cold-start wait
  happens before any client JS runs, so no client-side animation can fill it.
- Once the demo is static (rec #1), there is nothing left to mask.

If, after the fixes, a brief transition is still wanted for polish, revisit it
then — as polish, not as a latency patch.

## Feasibility findings (2026-07-03)

Traced the actual render path to check how easily rec #1 (static) can be
applied. **It is blocked by two hard dynamic dependencies**, so it is a
refactor, not a config flip:

- **Layout reads cookies.** [`(app)/layout.tsx`](../../src/app/(app)/layout.tsx)
  awaits `getActiveAccount()`, which calls `cookies()`
  ([`accountScope.ts`](../../src/lib/accountScope.ts)). `cookies()` forces
  dynamic rendering on **every** app page.
- **Journal reads searchParams.**
  [`(app)/journal/page.tsx`](../../src/app/(app)/journal/page.tsx) awaits
  `searchParams` for date/preset/month filtering. `searchParams` forces
  dynamic rendering.

Realistic implementation paths, in increasing effort:

1. **Cut Turso network latency, keep rendering dynamic (smallest, deploy-only).**
   Point the hosted demo at a bundled `data/tradingjournaldemo.db` read as a
   local file instead of remote Turso; ensure the file is traced into the
   serverless bundle. Removes N network round-trips per request without
   touching rendering mode, cookies, or searchParams. Must be verified on a
   real deploy.
2. **Remove the layout's cookie dependency on the demo.** The hosted demo is
   single-account with no switching (settings hidden), so `getActiveAccount`
   can default to the first account without reading `cookies()` when
   `DEMO_READ_ONLY=true`. Removes one of the two static blockers.
3. **Remove the journal's searchParams dependency on the demo.** Move date
   filtering client-side, or `generateStaticParams` over a fixed set of demo
   dates. Removes the second blocker.
4. **Then** flip route config to conditional static/ISR
   (`process.env.DEMO_READ_ONLY === "true" ? "force-static" : "force-dynamic"`,
   evaluated at build). Only viable once 2 + 3 are done.

Note: none of these produce a locally measurable win — the demo reads a fast
local file locally, so the latency being fixed (cold start + remote Turso
round-trips) only appears on the deployed Vercel + Turso stack. **Measure
there first**, then implement behind a branch and re-measure.

## Verification TODO

- Capture real traces from the live deployment: TTFB, function cold-start
  duration, and per-query Turso latency, to confirm the attribution above.
- Confirm the Turso region vs. the Vercel function region.
- Confirm the marketing CTA's exact entry URL (to size the redirect cost).
- Prototype conditional static rendering behind `DEMO_READ_ONLY` and measure
  before/after.

## Relationship to other docs

- [`ARCHITECTURE.md`](../ARCHITECTURE.md) — the system model and runtime/env
  reference; this audit is its latency deep-dive.
