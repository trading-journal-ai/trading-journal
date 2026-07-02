# Demo Data

This folder is for public-safe demo data.

The included demo dataset is meant for previewing and testing the app with
augmented sample trades and placeholder journal notes, without requiring someone
to import their own trading history first.

The trades are realistic enough to exercise the journal, charts, calendar,
reports, and trade-review flows, but this is not a perfect trading record or a
model trading system. Treat it as demo material.

Do not commit real broker exports here. Real exports belong in `data/samples/`,
which is gitignored because those files can contain private account and trading
history.

Current demo fixtures:

- `demo/trades.csv` - augmented trade data from January through June
  2026, normalized for public demo use. The dataset is designed to make the UI
  feel active and testable without requiring private broker exports.
- `demo/coach-reviews.json` - approved static AI coach responses for demo days.
- `demo-trades-and-notes.csv` - legacy compatibility copy. New scripts should
  prefer `demo/trades.csv`.

The goal is for a new contributor to run:

```bash
npm install
DB_PATH=data/tradingjournaldemo.db npm run db:migrate
npm run demo:paper
DB_PATH=data/tradingjournaldemo.db npm run dev
```

Then open `http://localhost:3000` and see the journal, calendar, trades, and
reports working with demo trades and seeded notes.

If they also want candlestick charts, they need a server-side Massive API key in
`.env.local`, then:

```bash
npm run demo:candles -- --db data/tradingjournaldemo.db
```

For the current demo fixture:

```bash
npm run demo:normalize-das -- --input /path/to/raw-das-export.csv --output samples/demo/trades.csv
npm run demo:paper-db -- --db data/tradingjournaldemo.db --csv samples/demo/trades.csv
npm run demo:notes -- --db data/tradingjournaldemo.db --month all
npm run demo:coach -- --db data/tradingjournaldemo.db
```

The rebuild command preserves cached candle rows in `data/tradingjournaldemo.db`.
