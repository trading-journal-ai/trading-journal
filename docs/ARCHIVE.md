# Archive — deleted docs (git history is the archive)

Retired docs are **deleted, not moved to archive folders**. Git history
preserves every version; this file is the tombstone index so a deleted doc is
still discoverable by name.

To read a deleted doc:

```bash
git log --diff-filter=D --oneline -- "docs/**<FILENAME>"   # find the deleting commit
git show <commit>^:<full/path/from/this/table>             # print the last version
```

> **Caveat:** "git history preserves it" holds only as long as history isn't
> rewritten. This repo had one deliberate rewrite (2026-07-11, to purge private
> P&L data) and two non-sensitive docs went missing with it. Deleting via a
> normal commit (like the rows below) is safe; rewriting history is the only
> thing that actually destroys.

| Deleted | Path | Why | Superseded by |
| --- | --- | --- | --- |
| 2026-07-25 | `docs/deployment/DEMO_RUNTIME.md` | Described the Turso-based hosted-demo runtime removed from `main`; carried a STALE banner since 2026-07-11. | `docs/ARCHITECTURE.md` Part 2 (current demo ops) |
| 2026-07-25 | `docs/coach/NEXT_BUILD.md` | 2026-07-02 pickup handoff; its durable content (two-layer coach stance, product flow, output contract, eval list) was absorbed into the coach architecture doc. | `docs/coach/COACH_ARCHITECTURE.md` · `docs/coach/PRIVATE_EVALS.md` |
| 2026-07-25 | `docs/import/TOS_TO_TRADERVUE_RECONSTRUCTION.md` | Feasibility study that shipped as the broker normalizer; statement catalog duplicated the adapter doc. | `docs/import/THINKORSWIM_ADAPTER.md` · `docs/import/BROKER_NORMALIZER.md` |
| 2026-07-25 | `docs/design/_archive/DESIGN_SYSTEM_ONE_SHEET.md` (+ `.html`) | Prototype-era "Deep" single-theme checklist; palette and phantom tokens don't match the shipped 4-theme system. Archived 2026-07-22, deleted under the new policy. | `docs/design/DESIGN_SYSTEM.md` + `src/app/globals.css` |
| 2026-07-25 | `docs/design/_archive/design-qa-ticker-review-v1.md` | One-off QA process log; referenced ephemeral `/tmp`/Desktop screenshots that no longer exist. | — (process log) |
| 2026-07-25 | `docs/design/_archive/design-qa-journal-wireframe.md` | Same — one-off QA process log with dead screenshot references. | — (process log) |
