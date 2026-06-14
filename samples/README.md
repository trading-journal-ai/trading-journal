# Demo Data

This folder is for public-safe demo data.

Do not commit real broker exports here. Real exports belong in `data/samples/`,
which is gitignored because those files can contain private account and trading
history.

Planned demo fixtures:

- `tos-demo-account-statement.csv` - synthetic ThinkorSwim-style statement.
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
