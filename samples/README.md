# Demo Data

This folder is for public-safe demo data.

The included demo dataset is meant for previewing and testing the app with
realistic trades and seeded journal notes, without requiring someone to import
their own trading history first.

Do not commit real broker exports here. Real exports belong in `data/samples/`,
which is gitignored because those files can contain private account and trading
history.

Current demo fixtures:

- `das-paper-trades-2026-demo.csv` - paper-trading DAS-style trade summary
  export from January through June 2026, normalized for public demo use. The
  dates, symbols, prices, and trade outcomes are preserved, but share sizes are
  compressed into realistic demo lots so the UI stays useful and the examples
  do not showcase oversized trades.

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

For the current DAS paper-trading demo fixture:

```bash
npm run demo:normalize-das -- --input /path/to/raw-das-export.csv --output samples/das-paper-trades-2026-demo.csv
npm run demo:paper-db -- --db data/tradingjournaldemo.db --csv samples/das-paper-trades-2026-demo.csv
npm run demo:notes -- --db data/tradingjournaldemo.db --month all
```

The rebuild command preserves cached candle rows in `data/tradingjournaldemo.db`.
