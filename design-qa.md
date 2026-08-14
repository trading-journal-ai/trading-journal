# Calendar and journal card-state design QA

- **Source visual truth:**
  - Day P&L: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.17 AM.png`
  - Month calendar: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.08 AM.png`
  - Week at a glance: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.04 AM.png`
  - Interaction details: `/Users/justin/Downloads/Trading Journal design review (1).zip`
- **Rendered implementation:** `http://127.0.0.1:4321`
- **Implementation screenshots:**
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-pnl-card.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-week-selected.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-week-hover.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/calendar-month-selected.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/calendar-month-hover.png`
- **Comparison boards:**
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-day-reference-vs-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-week-reference-vs-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-month-reference-vs-build.png`
- **States:** Light theme; populated day; week selected and hover; month selected/current day and populated-day hover.

## Capture normalization

- Desktop CSS viewport and implementation captures: `1440 x 960`, device scale factor 1.
- Source pixels: day `2512 x 1182`, week `2706 x 644`, month `2396 x 1674`.
- Comparison boards resize both sides into equal-width white-backed panels. The day and week implementation panels use focused crops around the user-requested surface; the month uses the full view because the calendar grid is the dominant screen.
- Mobile CSS viewport and implementation capture: `390 x 844`, device scale factor 1, at `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-pnl-mobile.png`.

## Findings

- **[P2, fixed] Week hover carried extra accent signals absent from the HTML reference.**
  - Location: `src/app/globals.css`, `.journal-week-day` states.
  - Evidence: the first implementation showed a blue dot and accent-colored metric text on hover; the source HTML changes only the neutral cell surface for hover.
  - Fix: limited the dot and accent-tinted metric pill to the selected day. Hover now changes only the cell background.
  - Post-fix evidence: `journal-week-hover.png`.
- **[P2, fixed] Unified day card divider stopped above the outer card edge.**
  - Location: `src/components/TradeJournalReview.tsx`.
  - Evidence: the first pass gave the padded ticker rail its own 420px child height, making it taller than the chart and interrupting the shared divider.
  - Fix: moved the fixed height to the rail wrapper and made its inner section fill the wrapper, so both card columns share one 420px frame.
  - Post-fix evidence: `journal-day-pnl-card.png`.

No actionable P0, P1, or P2 findings remain.

## Required fidelity surfaces

- **Fonts and typography:** Existing Geist Sans and Geist Mono roles are unchanged. The implementation deliberately preserves current product typography and data content; only the requested surface/state styling changed.
- **Spacing and layout rhythm:** Existing calendar and journal spacing remains intact. The new 8px card radius, subtle 1px edge, internal hairlines, and two-layer shadow match the HTML handoff. The day chart and existing ticker rail now occupy one shared card.
- **Colors and visual tokens:** Selected cells use a 6% semantic accent tint; hover uses a neutral `--background` / `--surface` mix. Borders and dividers are derived from `--foreground`, so all four product themes retain the same hierarchy.
- **Image quality and assets:** These surfaces contain no reference image assets. The existing chart rendering is unchanged; no placeholder art, custom icons, or replacement graphics were added.
- **Copy and content:** All app content, metrics, chart data, labels, and navigation remain unchanged as requested. Reference-only example content was not copied.

## Interaction and responsive checks

- Month: populated-day hover and current-day selected tint were visually confirmed; the calendar kept its existing dimensions and locally scrollable dense grid.
- Week: selecting the Week tab changed the URL to `scope=week`; the focused date rendered the selected tint, accent dot, and softly tinted metric pill. Hovering another session produced only the neutral lift.
- Day: the P&L chart and existing ticker rail rendered inside one shared card with a continuous divider and shadow.
- At `390 x 844`, the unified card remained viewport-bound and stacked its existing content without document-level horizontal overflow.
- Page identity, non-blank content, framework-overlay check, and DOM snapshots passed. The final browser console had no warnings or errors.

## Comparison history

1. **Pass 1:** Side-by-side comparison found two P2 details: extra week-hover accent signals and an uneven day-card column height.
2. **Fix:** Restricted week accent signals to selection and normalized the unified card's column height.
3. **Pass 2:** Same-viewport selected, hover, day-card, month-card, and mobile captures showed no remaining P0/P1/P2 mismatch. Content and spacing differences from the references are intentional and explicitly required by the brief.

## Follow-up polish

- None required for this styling slice.

**final result: passed**
