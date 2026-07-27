# Market Data Strategy

> Status: active operating contract
>
> Default dependency: **Massive Stocks Free**

## Decision

The Journal is local-first and Free-plan-safe. A paid Massive plan can accelerate
finite backfills, but no core chart, review, analytics metric, or historical
Journal read may require a paid subscription.

The provider receives public market-data keys—ticker and date—not broker
executions, P&L, notes, or account details.

## Data Ownership

| Evidence | Owner | Journal use |
| --- | --- | --- |
| Executions, trades, P&L, notes | Trading Journal | Source of truth |
| One-minute OHLCV | Massive aggregate API, cached locally | Charts, entry context, MAE/MFE, local indicators |
| Completed-day market breadth | Massive grouped daily, cached locally | Retrospective heat and leadership |
| Alert-time candidate evidence | Stock Info scanner capture | Selection and system-compliance review |
| Float/news/reference facts | Provider snapshot with effective/observed time | Optional candidate enrichment |

Completed-day market data cannot reconstruct what the scanner knew before an
entry.

## Free-Compatible Workflow

### Traded symbols and baselines

`npm run market-data:sync` reads distinct traded ticker-days from the local
database. For each ticker-day it requests:

- the traded session; and
- a conservative calendar window containing approximately 14 prior market
  sessions.

Bars are stored as unadjusted one-minute OHLCV in the existing `candles` table
and deduplicated by `symbol + timeframe + timestamp`. The prior-session baseline
supports true time-of-day RVOL, gap context, prior-day levels, and daily ATR.

The command defaults to a 12.5-second delay, safely below the Free plan's
five-request-per-minute limit:

```bash
npm run market-data:sync
```

Useful modes:

```bash
# Inspect work without network calls or writes.
npm run market-data:sync -- --dry-run true

# Temporary paid-plan acceleration.
npm run market-data:sync -- --delay-ms 250

# Fetch only missing traded sessions, without a prior-session baseline.
npm run market-data:sync -- --lookback-sessions 0
```

The sync skips likely unresolved security identifiers and retries a provider
ticker-history lookup when the current broker symbol has no anchor-day bars.
Failures remain visible in the command summary and can be retried safely.

### Completed-day market context

`npm run market-context:backfill` stores one retrospective grouped-daily summary
per ET session. It captures market breadth and notable completed-day movers
without pretending to reconstruct scanner timing.

Its default delay is also Free-safe. A temporary paid subscription may use a
smaller `--delay-ms` value for catch-up work.

## What Survives a Downgrade

Locally cached candles, market-context payloads, and locally derived analytics
continue to work after cancellation. New sessions can still be hydrated
post-close on Free.

A downgrade removes access to Starter-only speed and recency features:

- unlimited request throughput;
- five-year rather than two-year lookback;
- 15-minute-delayed data;
- snapshots, WebSockets, second aggregates, and aggregate flat files.

No production contract should depend on those features. If history older than
the Free lookback is relevant, fetch and cache only the ticker/date windows
needed by imported trades before the temporary subscription ends.

## Storage Policy

Store:

- one-minute bars for traded sessions and their prior-session baselines;
- one-minute bars for qualified scanner candidates, including missed names,
  once candidate capture exists;
- completed-day market-context summaries;
- provider/effective timestamps for reference enrichment;
- raw scanner evidence needed to preserve what was knowable.

Do not store by default:

- full-market minute flat files;
- second bars for every symbol;
- provider-computed technical indicators;
- repeated snapshots without an explicit observation contract;
- full copied news articles.

## Operational Boundaries

- Free is end-of-day, so same-session Journal views may remain incomplete until
  the provider makes that day's bars available.
- One-minute aggregates do not support bid/ask spread, order-book, or exact
  tape claims.
- Latest float is not historical float unless its effective date supports the
  session being reviewed.
- Corporate actions and ticker changes must remain point-in-time aware.
- Provider failures degrade to explicit missing coverage; they do not block
  execution imports or note-taking.

