# Calendar month-at-a-glance design QA

- **Source visual truth:** `/Users/justin/Working/trading-journal/.claude/worktrees/calendar-preview/docs/design/prototypes/calendar-journal/calendar-month--collapsed.html`
- **Reference screenshot:** `/private/tmp/calendar-month-reference.jpg`
- **Rendered implementation:** `http://127.0.0.1:4317/calendar?m=2026-08`
- **Implementation screenshot:** `/private/tmp/calendar-month-implementation.jpg`
- **Full-view comparison:** `/private/tmp/calendar-month-comparison-pass1.png`
- **Focused post-fix comparison:** `/private/tmp/calendar-month-focused-comparison.png`
- **State:** Light theme, August 2026, populated month, collapsed calendar cells

## Capture normalization

- Desktop CSS viewport: `1280 x 720`; source and implementation full-page captures are `1280 x 912` and `1280 x 865` respectively.
- The first full-view comparison used equal 1280px-wide captures at 1:1 output size.
- After the responsive breakpoint check, the in-app browser returned the post-fix implementation at 2x CSS sampling inside a 1280px-wide crop. The focused comparison therefore uses the matching visible `640 x 132` CSS grid region: the source crop is upsampled 2x to the implementation's `1280 x 264` pixel sampling before comparison. No density-derived typography or spacing findings were filed.
- Mobile CSS viewport: `390 x 844`; screenshot captured at `390 x 844`. The document remained 390px wide, while the dense calendar grid correctly used its own horizontal scroller.

## Findings

- **[P2, fixed] Empty calendar cells lacked the prototype's quiet surface distinction.**
  - Location: month grid cells in `src/app/(app)/calendar/page.tsx`.
  - Evidence: the first implementation used the page background for both traded and empty in-month days, while the reference gives empty days a slightly quieter surface.
  - Impact: the traded-session rows did not separate as clearly from the unused remainder of the month.
  - Fix: unconfirmed empty days now use a subtle `--background` / `--surface` mix; traded, today, no-trade, and weekly-summary cells retain the open page surface.
  - Post-fix evidence: `/private/tmp/calendar-month-focused-comparison.png`.

No actionable P0, P1, or P2 findings remain.

## Required fidelity surfaces

- **Fonts and typography:** Uses the app's Geist Sans stack and matches the reference hierarchy: 28px month title, 20px summary values, 17px daily/weekly P&L, and compact 11.5–13px metadata. The app intentionally omits a leading plus sign on positive currency to preserve its established money format and the accepted Journal micro-calendar convention.
- **Spacing and layout rhythm:** The title, underline tabs, summary strip, 96px cells, five weekday tracks, and 205px weekly rail match the reference. The implementation retains the shared 1152px Calendar/Journal/Trades/Analytics workspace rather than the prototype's additional 20px inner inset.
- **Colors and tokens:** Semantic green/red P&L, accent today label, hairline grid, white active cells, and quiet empty-cell surface all map to existing theme tokens and adapt across themes.
- **Image quality and assets:** The screen contains no visual image assets. The existing calendar icon in the range filter is reused; no substitute imagery, handcrafted SVG, or placeholder art was added.
- **Copy and content:** Month, summary labels, weekday labels, today state, trade counts, accuracy, and P&L are real app data. The footer says traded days open their Journal review, reflecting the established product behavior rather than the prototype's unimplemented inline-expansion copy.

## Interaction and responsive checks

- Previous moved from August to July; Next returned to August.
- Year opened `/calendar?view=year&y=2026`.
- Selecting August 3 opened `/journal?date=2026-08-03` with the Calendar return target intact.
- The 390px viewport had no document-level horizontal overflow; only the dense calendar grid scrolls horizontally.
- Browser console contained only React DevTools / Fast Refresh development logs; no warnings or errors.

## Comparison history

1. **Pass 1:** Full-view side-by-side comparison found one P2 surface mismatch: empty and traded cells shared the same white treatment.
2. **Fix:** Added the quiet empty-cell token mix while keeping data-bearing and today cells white.
3. **Pass 2:** Focused, density-normalized grid comparison confirmed the reference's active/empty surface distinction. No new P0/P1/P2 issue appeared.

## Follow-up polish

- None required for this slice. The recovered prototype's optional inline day expansion remains intentionally out of scope because Calendar is the browse/index mode and traded days already open the full Journal review.

**final result: passed**
