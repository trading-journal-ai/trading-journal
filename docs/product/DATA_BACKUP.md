# Data Backup & Safety

> Status: v1 design · 2026-07-21
>
> Motivating incident: the June 2026 candle hydration (~600 symbol-days of
> rate-limited API fetches) was silently wiped by a fixture-based DB rebuild
> and took a ~2-hour re-run to restore. Candles were re-fetchable; the
> trader's notes, annotations, and coach history would not have been.

## What's at stake, by data class

| Class | Examples | If lost |
| --- | --- | --- |
| **Irreplaceable** | journal notes, trade annotations, tags, conviction, coach reviews, playbook, experiments | Gone forever. This is the actual product value — the trader's accumulated self-knowledge. |
| **Re-importable (if the source was kept)** | fills/executions | Only recoverable while the broker still offers the export (ToS/DAS histories expire). Ties to the open **raw broker-file retention** decision (DATA_MODEL §8.9, OWNER_TODO) — this doc recommends **retain**: original CSVs are small, and keeping them completes the recovery story. |
| **Re-fetchable at cost** | candles | ~5 calls/min on the free plan → hours of re-fetching; delisted symbols may become unfetchable over time. |

## Design principle: one primitive, any destination

Do **not** build per-cloud integrations (Google Drive API, Dropbox SDK, S3…).
The app is local-first and the whole database is one SQLite file, so the
backup mechanism is a single primitive:

> **Produce a consistent snapshot of the DB into a user-chosen folder, on a
> schedule, with rotation.**

Where that folder lives is the user's choice and their sync tool's job:

- iCloud Drive / Google Drive / Dropbox / OneDrive folder → cloud backup
- external drive or NAS mount → local backup
- any combination — it's just a folder

This covers every destination with zero vendor code, no OAuth, no credentials
held by the app, and it works offline.

## Mechanism

- **Snapshot via `VACUUM INTO`** (not file copy). The live DB runs in WAL
  mode; copying `*.db` mid-write produces a torn backup. `VACUUM INTO` yields
  a transactionally consistent, compacted single file while the app keeps
  running.
- **Timestamped filenames** (`journal-YYYYMMDD-HHmmss.db`) — restore is
  "pick a file," and sync tools treat each snapshot as a new file (no
  partial-overwrite races).
- **Rotation**: keep the last N daily and M weekly snapshots (defaults: 7 + 8).
  A journal DB is small (MBs); candles dominate size, and even with them a
  full snapshot is tens of MB — rotation is about tidiness, not space.
- **Schedule**: snapshot on app quit after any day with writes, plus a
  catch-up check on launch (if last snapshot > 24h old and writes occurred).
  No daemon needed.
- **Restore story** (must be documented in-app, not just here): quit app →
  copy chosen snapshot over `DB_PATH` → relaunch → app runs
  `PRAGMA integrity_check` on start and reports.
- **Include raw broker files**: if retention is adopted (recommended), the
  snapshot step also mirrors the originals folder into the backup dest.

## v0 (exists): `scripts/backup-db.mjs`

Until the in-app version exists, `node scripts/backup-db.mjs` snapshots the
DB (default: `DB_PATH` from `.env.local`) into `data/backups/` (gitignored),
with `--dest` to point anywhere — including a cloud-synced folder — and
`--keep N` rotation. Owner can cron it or run it after meaningful sessions.

## Product surface (later, cheap)

1. **Settings → Data**: backup folder picker, last-backup timestamp, "Back up
   now" button, restore instructions.
2. **The nudge** (the user-awareness piece that motivated this doc): a quiet
   banner when `(days with writes since last snapshot) ≥ 5` or no backup
   folder is configured — "Your journal has N days of notes that exist in
   exactly one place." One-click backup from the banner. Never modal, never
   nagging on fresh installs with no user-authored content.
3. **Export ≠ backup**: the planned export-everything (md/json — DATA_MODEL
   §9 step 4) is the *format-agnostic, app-independent* layer for longevity;
   snapshots are the *fast, complete, restorable* layer. Both, eventually;
   snapshots first because they protect everything today at near-zero build
   cost.

## Guardrails for our own tooling (implemented 2026-07-21)

- `scripts/db-guard.mjs` exports `snapshotBeforeDestroy(dbPath, reason)`: if
  the target DB holds trades, notes, coach reviews, or fetched candles, it
  takes a `VACUUM INTO` snapshot in `data/backups/` and prints what was
  protected — distinguishing NOT-recoverable user content from
  re-fetchable-at-cost candles (with an estimated re-fetch time).
- Wired into both destructive paths: `create-demo-db.mjs` (which deletes its
  output file — this is what wiped the June candles) and
  `setup-local.mjs --reset-demo`. Any future destructive script must call the
  guard before touching the file.
- Motivating scenario: "delete the DB to re-import" feels safe because trades
  are re-importable — the guard exists to say out loud what else is in the
  file. The eventual in-app re-import/replace flow must show the same prompt
  (and remove the need to delete the DB at all).
