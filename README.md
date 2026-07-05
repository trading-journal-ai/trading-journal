# Trading Journal AI

[Trading Journal AI](https://trading-journal.ai) is a local-first trading
journal built around reflection, context, and review.

It treats trade review more like a chronological journal than a spreadsheet.
Your daily recap leads. Trades, P&L, charts, notes, tags, calendar context, and
reports sit beside the writing so the story of each trading day is easier to
review, document, and learn from later.

The deeper thesis is that repeated review should compound into a personal
trading playbook: what you trade, how you trade it, what invalidates it, and
what the data shows about whether the edge is improving.
[`docs/product/PLAYBOOK.md`](docs/product/PLAYBOOK.md) covers that direction in
full.

The project is early, but the direction is clear: make journaling low-friction,
private, and useful without depending on a hosted trading-journal subscription.

## Active Roadmap

Trading Journal AI is in active development. The current product is already
useful for importing trades, reviewing sessions, writing daily recaps, tagging
trade notes, and exploring demo data, but the larger rollout is still taking
shape.

What is landing now:

- **Setup workspace and coach context**: Settings is becoming the home for
  connecting a broker/import source, adding a language-model API key,
  completing a trader self-assessment, defining trading rules, building a setup
  playbook, and tuning coach preferences. First launch can point into this
  workspace, and setup stays editable afterward from Settings and contextual
  setup prompts.
- **Dictation-first note capture**: Voice input is becoming a core journaling
  surface, because the real context behind a trade is often spoken faster and
  more honestly than it is typed.
- **Unified notes architecture**: Daily recaps, trade notes, review notes, and
  coach-ready context are converging into one consistent writing experience.
- **Rule systems and playbooks**: Traders will be able to define setups,
  patterns, process rules, and review criteria that the journal can use as
  context. The playbook roadmap lives in
  [`docs/product/PLAYBOOK.md`](docs/product/PLAYBOOK.md), with the first
  implementation slice in
  [`docs/product/PLAYBOOK_MVP.md`](docs/product/PLAYBOOK_MVP.md) and a
  development-only wireframe at `/preview/playbook`.
- **AI coach**: The coach layer is being built around your actual trades,
  notes, tags, screenshots, chart context, and rules, so feedback can become
  more specific than generic trading advice.
- **Image and video trade evidence**: The journal should support chart
  screenshots, annotated levels, multi-timeframe context, and selective screen
  recordings for meaningful wins, losses, rule breaks, and Level 2/tape review.
  These uploads should become part of the trade record and coach context without
  making video capture a requirement for every trade.
- **Dashboard and review loops**: The dashboard, calendar, reports, and journal
  views are being tightened around faster post-session review and better
  long-term pattern recognition.
- **Data importer and broker adapters**: Imports are moving toward a clearer
  inspect -> normalize -> review -> persist flow. ThinkorSwim/Schwab,
  DAS-style, and TraderVue-style exports are the current focus, and the adapter
  model will keep expanding so more broker exports can map into the same
  canonical trade format.

The goal is not to ship a static journal template. The goal is a local-first
review system that compounds with the trader: notes become context, context
becomes rules, rules become coaching, and coaching feeds a better next review.

The playbook is the connective tissue in that compounding loop. It turns the
trader's own examples, rules, mistakes, and setup definitions into context the
journal, analytics, and coach can use. The next product slice is the data model
and daily archive flow outlined in the playbook MVP doc.

Expect rough edges while this rolls out. The app, demo, and documentation are
moving quickly, and feedback from real review workflows is shaping the next
round of improvements.

## Journal-First Review

Most trading journals start with tables. This one starts with the day.

Import your broker executions, open the journal, and write the daily recap while
the session is still fresh: market read, execution quality, emotions, mistakes,
and what is worth repeating. From there, the data stays close but does not take
over. The daily P&L chart and ticker list show what shaped the session. Ticker
review lets you inspect every trade for a symbol in context. Trade detail lets
you open the chart, executions, and trade note when a specific decision deserves
attention.

The goal is to reduce the distance between:

- What happened?
- What did I see?
- What did I do well?
- What needs work?
- What should I focus on next session?

The AI coach builds on this same loop: a post-trade review assistant that reads
that context and helps summarize what worked, what did not, and what to focus
on next.

### Image And Video Review

Trade review should preserve the evidence that explains what the trader saw in
the moment, not just the final P&L. The roadmap includes support for uploading
chart screenshots, marked-up key levels, multi-timeframe context, and optional
video screen recordings of live trades.

Screenshots are the default lightweight artifact for structure: levels,
descending resistance, higher-timeframe context, entry zones, exit zones, and
before/after trade state. Video is intended as a selective deep-review artifact
for significant good trades, significant bad trades, execution lessons, and
moments where Level 2, tape speed, liquidity, hesitation, or real-time decision
making mattered.

Those uploads should be attached to the relevant trade, ticker/day review, or
daily recap; processed into journal context such as timeframe, level notes,
setup notes, and review prompts; and made available to the coach alongside
executions, chart data, tags, rules, and written reflections. The goal is not to
record every trade. The goal is to make high-signal evidence easy to review so
the journal and coach can surface what was good, what was bad, and what should
change next time.

## Data Importer

Trading Journal AI reads broker CSV exports and turns them into one normalized
trade format the journal, charts, calendar, reports, and coach can all use.

The import path has evolved from "parse this one CSV shape" into a real
broker-normalization pipeline:

```text
raw broker CSV
-> inspect source and shape
-> normalize with a broker/source adapter
-> preview diagnostics and confidence
-> persist trades and executions
-> power journal, charts, reports, and coach context
```

That separation matters. Broker CSVs are messy in different ways: some provide
fill-level executions, some provide trade summaries, some split fees into other
statement sections, and some use timestamps or side labels that need careful
handling. Adapters exist to keep that broker-specific work from leaking into
the journal, chart, reports, or coach layers.

### Your Own Data

The strongest current path is ThinkorSwim/Schwab account statement exports,
especially the `Account Trade History` section. Those imports can preserve
fill-level executions, match them into round-trip trades, attach fees where the
statement exposes them, dedupe repeated imports, and keep enough source detail
for chart markers and review.

The app also supports DAS-style and TraderVue-style trade-summary CSVs. Those
are useful for review and coaching, but they are treated as medium-confidence
imports because they usually summarize a trade rather than exposing every
underlying fill.

If you use another broker, the CSV may not work immediately. Broker exports can
use different column names, timestamps, side labels, fee fields, and row
structures. The intended path is to add a broker-specific adapter that
normalizes that broker's CSV into the app's shared trade format before anything
else tries to use it.

For non-technical users: you will not need to write code, but you may need
help teaching the importer how to read your broker's CSV. The direction is an
assisted adapter workflow: inspect the file locally, explain
what the app understands, preview normalized rows, and only import after the
shape looks right. Automated broker syncing and order execution are intentionally
out of scope for now.

### Demo Data

The repo includes a demo dataset with generated sample trades and placeholder
journal notes:

```text
samples/demo/trades.csv
```

The demo data is meant for previewing and testing the app. It is realistic
enough to exercise the journal, charts, calendar, reports, and trade-review
flows, but it is not intended to be a perfect trading record or a model trading
system.

To reset the local demo database:

```bash
npm run reset:local
```

Demo mode creates a local SQLite database, imports the sample CSV, and adds
placeholder journal notes: one daily recap per active trading day, plus trade
notes for the best winner and worst loser when available.

## Charts And Chart Data

Charts are rendered with
[TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/),
the open-source charting library from TradingView. The app uses it to display
candles, volume, pan/zoom behavior, and trade markers.

The candle data comes from [Massive](https://www.massive.com/). The free Massive
plan is enough to run the app locally. When you open a trade chart, the app uses
the trade's symbol and date to fetch one-minute OHLCV candle data: open, high,
low, close, and volume. It then caches that data locally so the chart does not
need to refetch the same candles every time.

Your broker CSV provides the execution data: symbol, time, side, shares, and
price. The chart combines both sources: Massive provides the market candles, and
your broker import provides the entry and exit markers. This is why broker CSV
parsing matters. If a broker export has unusual timestamps, time zones, prices,
or row formats, the importer may need an adapter so trades map cleanly onto the
chart.

If you enter a Massive API key during setup, the installer saves it to
`.env.local`, which is gitignored and stays on your machine. If you skip the key,
the app still runs, but uncached charts will not be able to fetch new candles.

## Install

The installer offers two modes:

- **Trading Journal Demo**: loads sample trades and notes so you can preview the
  app.
- **Trading Journal**: creates an empty local journal for your own broker CSV.

Requirements:

- Node.js 20+
- npm
- Optional: a free [Massive](https://www.massive.com/) API key for candlestick
  chart data

Clone the repo, enter the project folder, and run the installer:

```bash
git clone https://github.com/trading-journal-ai/trading-journal.git
cd trading-journal
./install-trading-journal.sh
```

Run the installer from inside the cloned `trading-journal` folder. If you see
`no such file or directory`, you are probably one folder too high. Run
`cd trading-journal` first, then run the installer again.

The installer:

- Installs project dependencies.
- Lets you choose demo data or an empty local journal.
- Lets you add a Massive API key or skip chart fetching for now.
- Creates the local SQLite database.
- Starts the app on localhost.

The script does not install anything globally. Everything it creates stays
inside this project folder.

## Run It Locally

After setup, the installer starts the app automatically.

To start it again later:

```bash
npm run --silent dev
```

Leave the terminal open while using the journal. To stop the app, click the
terminal and press **Ctrl + C**. On Mac, that is the Control key, not Command.

Stopping and restarting the app does not delete your data. Your journal lives in
a SQLite database file on disk.

If the browser does not open automatically, go to the localhost URL printed in
the terminal, usually [http://localhost:3000](http://localhost:3000). That opens
the dashboard.

If Next.js says another dev server is already running, or localhost feels stuck,
use the repo-local cleanup command:

```bash
npm run dev:restart
```

That stops any Next dev server running from this project folder and starts a
fresh one. To only stop the stuck server, run:

```bash
npm run dev:stop
```

## Hosted Demo

The hosted demo is a quick way to click through the app before installing it:

[demo.trading-journal.ai](https://demo.trading-journal.ai)

It runs this same app repo with demo data and read-only settings, so the hosted
preview stays in parity with local development, including coach, import, chart,
journal, and reporting changes. The app itself is designed to run locally with
your own broker exports, notes, API keys, and SQLite database on your machine.

## Data & Privacy

Local private data is gitignored:

- `data/journal.db`
- `data/journal.db-*`
- `data/uploads/`
- `data/samples/`
- `.env.local`

Real broker exports should not be committed. They can contain account numbers,
trade history, symbols, timestamps, and other private information.

## License

MIT License. See [LICENSE](LICENSE).

## Use & Responsibility

Use this project freely: download it, fork it, modify it, run it locally, or use
it as a starting point for your own trading journal.

This software is provided as-is. It is a journaling and review tool, not
financial advice, trade recommendations, risk management advice, tax advice, or
brokerage software. Verify your own data, protect your own broker exports, and
use it at your own risk.
