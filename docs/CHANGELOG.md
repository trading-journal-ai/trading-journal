# Changelog

Dated record of notable, completed changes — features shipped, contracts landed,
capabilities added. Format loosely follows [Keep a Changelog](https://keepachangelog.com).

**How to use this:** when a **Now** item in [PROJECT_STATUS.md](PROJECT_STATUS.md)
is actually done, add it here under a dated heading with a category
(`Added` / `Changed` / `Fixed` / `Docs` / `Decided`). Keep entries short and link
the PR. Day-to-day "where we stopped" notes go in the PROJECT_STATUS Worklog, not here.

> Started 2026-07-11. Changes before this date are recorded only in git history
> (`git log`), not backfilled here.

---

## 2026-07-11

### Docs
- Finalized the journal/coach **data model and content contract**: `DATA_MODEL.md`
  (provenance layers, definition of finalized, review-engine impact, 07:00–20:00 ET
  review window), `COACH_REVIEW_SCHEMA_V2.md` (typed Coach Review contract),
  in-repo `COACH_RECAP_CONTENT_SPEC.md` (Rev 2). ([PR #26](https://github.com/trading-journal-ai/trading-journal/pull/26))
- Added project-tracking docs: `OWNER_TODO.md` (owner decisions + ⭐ shortlist),
  `PROJECT_STATUS.md` (now/next/later + worklog), and this changelog.

### Decided
- Daily Recap is the journal artifact; **Coach Review is a section inside it.**
- Coach Review stored as **structured JSON**, immutable generated version with
  separate user corrections; user notes stay prose.
- Ticker-day review chart shows the **full session 07:00–20:00 ET** (overnight excluded).

### Verified
- Extended-hours candle coverage is already present: bars span **04:00–19:59 ET**
  (demo DB), so the review-window requirement is a display task, not a fetch change.

---

<!-- Template for the next entry:
## YYYY-MM-DD
### Added
- <feature> (PR #NN)
### Changed / Fixed / Docs / Decided
- ...
-->
