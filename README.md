# Trading Journal

A local-first trading journal built around the review habit first: write the
recap, see the day in context, and drill into the trade evidence only when it
matters.

Instead of starting with a dense trade table, the app treats trading review more
like a chronological note journal. Days, weeks, and months become the structure.
Imported executions, P&L charts, and reports sit beside your notes so the story
of each trading day is easier to review and document.

The goal is to make journaling feel low-friction. Start with a daily recap, add
trade notes when a specific trade deserves attention, and come back later to a
human-readable record of what happened instead of a grid of data you have to
sort through again.

The project is early, but the core direction is clear: make reflection fast,
private, and useful without depending on a hosted journaling subscription.

## Vision

Most trading journals are good at tables and reports. That matters, but the real
review loop is more human:

- What setup did I take?
- Did the chart actually support the entry?
- Did I cut losers quickly enough?
- Did I hold winners long enough?
- Was this a process problem, an emotional problem, or just normal variance?

Trading Journal is designed around that loop. The journal is the center of the
product, not an afterthought. You can scan a month like a notebook, read daily
recaps chronologically, see the trades that shaped the day, and then drill into a
ticker or individual trade when you need the chart, executions, or trade note.

The goal is to reduce friction between "what happened?" and "what did I learn?"
The numbers, charts, and trade log are still there, but they support the journal
instead of replacing it.

## Review Flow

The primary workflow is intentionally simple:

1. Import executions from a broker CSV so the trade data, P&L, charts, and
   calendar context are created automatically.
2. Open the journal and review the day in chronological context.
3. Write a daily recap that captures the market read, execution quality,
   emotions, and lessons from the session.
4. Use the daily P&L chart and ticker list to see what shaped the day.
5. Drill into a ticker review when you want to inspect the trades behind a
   symbol.
6. Open a single trade when the chart, executions, or setup deserves a specific
   trade note.
7. Save that trade note back into the journal, nested under the same day, so the
   recap and supporting trade evidence stay connected.
8. Zoom back out to the week or month so one red day does not dominate the
   bigger story.

That structure keeps the journal lightweight and readable while still making the
underlying data available when it is useful.

## Current Features

- **CSV import** for ThinkorSwim Account Statement exports and DAS
  trade-summary exports.
- **Execution matching** into round-trip trades.
- **Local SQLite storage** with Drizzle migrations.
- **Automatic candle fetching** through Massive for OHLCV data.
- **Journal-first review** with month/week/day chronology, daily recaps, and
  trade notes that link back to the chart.
- **Ticker review** for quickly drilling into all trades for a symbol on a given
  day.
- **Trade detail charts** with candlesticks, volume, entry/exit markers, and
  trade notes.
- **Trade log** with sorting, pagination, and per-share value for deeper data
  inspection.
- **Calendar views** for monthly and yearly P&L context.
- **Reports** with cumulative P&L, stats, at-a-glance metrics, and distribution
  charts.
- **Light/dark theme toggle**.

See [FEATURES.md](FEATURES.md), [DESIGN.md](DESIGN.md), and
[JOURNAL_DESIGN.md](JOURNAL_DESIGN.md) for deeper product notes.

## How It Works

The app uses broker executions as the source of truth.

1. Export a supported broker CSV.
2. Import the CSV into the app.
3. The importer parses fills and groups them into trades.
4. The app fetches one-minute OHLCV candles for each traded symbol/date.
5. Trades, candles, reports, and notes are stored locally in SQLite.

Your trade data stays on your machine unless you intentionally deploy or share
it.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- SQLite
- Drizzle ORM
- better-sqlite3
- Massive API for stock candles

## Requirements

- Node.js 20+
- npm
- A Massive API key if you want automatic candlestick data

The app can still run without a Massive key, but trade charts that need candle
data will fail to fetch new candles until the key is configured.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Set your Massive API key in `.env.local`:

```bash
MASSIVE_API_KEY=your_key_here
```

Create the local SQLite database:

```bash
npm run db:migrate
```

Start the development server:

```bash
npm run dev
```

Open:

[http://localhost:3000](http://localhost:3000)

## Useful Scripts

```bash
npm run dev          # Start the local Next.js dev server
npm run build        # Build the app
npm run start        # Start the production build
npm run lint         # Run ESLint
npm test             # Run tests
npm run db:migrate   # Apply Drizzle migrations
npm run db:generate  # Generate migrations after schema changes
npm run db:push      # Push schema changes directly
npm run db:studio    # Open Drizzle Studio
```

## Data & Privacy

Local private data is gitignored:

- `data/journal.db`
- `data/journal.db-*`
- `data/uploads/`
- `data/samples/`
- `.env.local`

Real broker exports should not be committed. They can contain account numbers,
trade history, symbols, timestamps, and other private information.

## Demo Data

Generate a synthetic demo database:

```bash
npm run demo:db -- data/tradingjournaldemo.db
```

The demo database uses fake `SIMxx` symbols, synthetic trading activity, and
synthetic journal notes. It is intended for screenshots, hosted demos, and
contributor onboarding; do not commit real broker exports or a personal
`data/journal.db`.

## Hosting A Demo

The app can run locally from SQLite or in production against Turso/libSQL.
For a hosted demo:

```bash
# 1. Generate demo data
npm run demo:db -- data/tradingjournaldemo.db

# 2. Upload it to Turso
turso db create trading-journal-demo --from-file data/tradingjournaldemo.db --wait
turso db show trading-journal-demo
turso db tokens create trading-journal-demo

# 3. Link and configure Vercel
vercel link --project trading-journal
vercel env add TURSO_DATABASE_URL production
vercel env add TURSO_AUTH_TOKEN production

# 4. Deploy
vercel --prod
```

Required hosted environment variables:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_token_here
```

Keep `MASSIVE_API_KEY` server-side only. Do not let public users upload private
broker exports unless there is a clear privacy model.

## Candle Data

Candles are fetched from Massive using one-minute aggregate bars. The API key is
read server-side from `.env.local`; it is not pasted into the browser.

Environment variable:

```bash
MASSIVE_API_KEY=your_key_here
```

The candle cache is stored locally in SQLite so each symbol/date only needs to
be fetched once.

## Import Notes

The current importer supports:

- ThinkorSwim Account Statement CSVs, especially the `Account Trade History`
  section.
- DAS-style trade-summary CSVs with `Open Datetime`, `Close Datetime`,
  `Symbol`, `Side`, `Volume`, `Entry Price`, and `Exit Price` columns.

Known assumptions:

- `Exec Time` is interpreted as Pacific time and mapped to Eastern market time.
- `Net Price` is used for fill price.
- DAS `Open Datetime` and `Close Datetime` values are interpreted as Eastern
  market time.
- DAS trade-summary rows are already grouped trades, so the importer creates a
  synthetic open/close execution pair for each row.
- DAS trade-summary `Volume` is treated as round-trip volume. A closed
  500-share long trade exported as buy 500 / sell 500 is imported as a
  500-share trade, not 1,000 shares.
- Re-importing the same file is intended to be safe; duplicate executions are
  skipped.

Important import roadmap:

- Broker CSV exports are not standardized. Lightspeed, CenterPoint, Cobra,
  TradeZero, Ocean One, DAS Trader, and other brokers may all use different
  column names, timestamp formats, side labels, fee fields, and row structures.
- The long-term importer should use broker-specific adapters that normalize each
  CSV into a shared execution/fill shape before grouping fills into trades.
- A generic column-mapping import could help support unknown broker exports, but
  broker-specific sample files are still needed to test real-world edge cases.
- Real broker samples should be anonymized before sharing. Useful test files can
  replace account numbers, symbols, and personally identifying fields while
  preserving the original columns, row order, timestamps, quantities, prices,
  fees, and partial-fill behavior.

## Project Docs

- [DESIGN.md](DESIGN.md) - product design, architecture, data model, and phases.
- [FEATURES.md](FEATURES.md) - feature inventory and scope.
- [JOURNAL_DESIGN.md](JOURNAL_DESIGN.md) - journal model, note hierarchy, and
  review philosophy.

## Roadmap

Near-term:

- Add public-safe demo data and a seed command.
- Harden import previews and error states.
- Design broker CSV adapter support and collect anonymized sample exports from
  Lightspeed, CenterPoint, Ocean One, DAS Trader, and other active trading
  platforms.
- Improve trade chart pan/zoom and volume context.
- Generalize journal notes beyond trade-level entries.
- Add backup/export guidance for SQLite data.

Later:

- Broker-specific CSV imports beyond ThinkorSwim and DAS.
- Generic CSV column mapping for unsupported brokers.
- Manual candle CSV fallback.
- Settings for timezone, fees, and defaults.
- Search across journal notes.
- Optional hosted/demo deployment.

## License

No license has been selected yet. Add a license before opening the repository to
outside contributors.
