# Demo Data

This folder is for public-safe demo data.

Do not commit real broker exports here. Real exports belong in `data/samples/`,
which is gitignored because those files can contain private account and trading
history.

Planned demo fixtures:

- `tos-demo-account-statement.csv` - synthetic ThinkorSwim-style statement.
- `das-paper-trades-2026-demo.csv` - paper-trading DAS-style trade summary
  export from January through June 2026, normalized for public demo use. The
  dates, symbols, prices, and trade outcomes are preserved, but share sizes are
  compressed into realistic demo lots so the UI stays useful and the examples
  do not showcase oversized trades.
- `demo-notes.json` - optional seeded journal notes for the demo flow.
- `seed-demo` script - creates `data/journal.db` and imports the demo fixtures.

The goal is for a new contributor to run:

```bash
npm install
npm run db:migrate
npm run seed:demo
npm run dev
```

Then open `http://localhost:3000` and see the dashboard, trades, calendar,
reports, charts, and journal working with fake data.

For the current DAS paper-trading demo fixture:

```bash
npm run demo:normalize-das -- --input /path/to/raw-das-export.csv --output samples/das-paper-trades-2026-demo.csv
npm run demo:paper-db -- --db data/tradingjournaldemo.db --csv samples/das-paper-trades-2026-demo.csv
```

The rebuild command preserves cached candle rows in `data/tradingjournaldemo.db`.
