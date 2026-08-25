# Calendar and journal design QA

- **Source visual truth:**
  - Day P&L: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.17 AM.png`
  - Month calendar: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.08 AM.png`
  - Week at a glance: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 8.47.04 AM.png`
  - Interaction details: `/Users/justin/Downloads/Trading Journal design review (1).zip`
  - Day Trades: `/Users/justin/Desktop/screenshots/Screenshot 2026-08-14 at 9.58.01 AM.png`
- **Rendered implementation:** `http://127.0.0.1:4321`
- **Implementation screenshots:**
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-pnl-white.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-week-selected.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-week-hover.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/calendar-month-selected.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/calendar-month-hover.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-trades-final.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-trades-mobile.png`
- **Comparison boards:**
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-day-reference-vs-white-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-week-reference-vs-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-month-reference-vs-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-day-trades-reference-vs-build.png`
  - `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/qa-day-trades-focused.png`
- **States:** Light theme; populated day; week selected and hover; month selected/current day and populated-day hover.

## Capture normalization

- Desktop CSS viewport and implementation captures: `1440 x 960`, device scale factor 1.
- Source pixels: day `2512 x 1182`, week `2706 x 644`, month `2396 x 1674`.
- Comparison boards resize both sides into equal-width white-backed panels. The day and week implementation panels use focused crops around the user-requested surface; the month uses the full view because the calendar grid is the dominant screen.
- Mobile CSS viewport and implementation capture: `390 x 844`, device scale factor 1, at `/Users/justin/.codex/visualizations/2026/08/14/019fffe4-f45c-7893-ac87-79734a0e1639/journal-day-pnl-mobile.png`.
- Day Trades reference pixels: `2452 x 1226`; implementation pixels and CSS
  viewport: `2048 x 1024`, device scale factor 1. Both share a 2:1 aspect ratio.
  The full-view board normalizes each to `1024 x 512`; the focused board uses
  content crops around the summary and ledger, then fits each into a white-backed
  `1200 x 430` panel without density-dependent judgments.

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

### Day Trades fidelity pass

- The implementation keeps the app's established `1152px` workspace instead of
  copying the handoff's wider canvas. Within that constraint, the stats, outcome
  bar, ledger, card edge, hairlines, row density, and numeric alignment follow the
  handoff's hierarchy.
- The shared `PillStatsBar` intentionally replaces the handoff's four ungrouped
  labels because that component was explicitly accepted for repeated summary use.
- The populated page uses real imported trades. Its `Needs context` labels are an
  honest empty annotation state; the reference-only “Good trade,” “Needs review,”
  and “Best setup” examples were not fabricated. Stored tags and setups use the
  matching compact pill treatment when present.

## Required fidelity surfaces

- **Fonts and typography:** Existing Geist Sans and Geist Mono roles are unchanged. The implementation deliberately preserves current product typography and data content; only the requested surface/state styling changed.
- **Spacing and layout rhythm:** Existing calendar and journal spacing remains intact. The new 8px card radius, subtle 1px edge, internal hairlines, and two-layer shadow match the HTML handoff. The day chart and existing ticker rail now occupy one shared card.
- **Colors and visual tokens:** Selected cells use a 6% semantic accent tint; hover uses a neutral `--background` / `--surface` mix. Borders and dividers are derived from `--foreground`, so all four product themes retain the same hierarchy.
- **Day chart surface:** The P&L chart canvas now uses the shared card background token. It renders white in the active light theme and retains the appropriate page background in the other themes.
- **Image quality and assets:** These surfaces contain no reference image assets. The existing chart rendering is unchanged; no placeholder art, custom icons, or replacement graphics were added.
- **Copy and content:** All app content, metrics, chart data, labels, and navigation remain unchanged as requested. Reference-only example content was not copied.
- **Day Trades typography:** Existing Geist roles remain intact. Ledger labels,
  tabular figures, context status, and P&L emphasis match the product's current
  type hierarchy while preserving the handoff's scan order.
- **Day Trades image quality/assets:** The reference contains no raster imagery or
  custom icon asset in this region. The win/loss distribution is a native data
  visualization derived from the actual rows; no placeholder art was introduced.

## Interaction and responsive checks

- Month: populated-day hover and current-day selected tint were visually confirmed; the calendar kept its existing dimensions and locally scrollable dense grid.
- Week: selecting the Week tab changed the URL to `scope=week`; the focused date rendered the selected tint, accent dot, and softly tinted metric pill. Hovering another session produced only the neutral lift.
- Day: the P&L chart and existing ticker rail rendered inside one shared card with a continuous divider and shadow.
- At `390 x 844`, the unified card remained viewport-bound and stacked its existing content without document-level horizontal overflow.
- Page identity, non-blank content, framework-overlay check, and DOM snapshots passed. The final browser console had no warnings or errors.
- Day Trades: verified all ten ledger columns, precise sub-cent per-share values,
  signed outcome color, the win/loss/flat calculation, and the selected-row inline
  review disclosure. The final fresh-browser pass loaded the PMAX review panel,
  closed it, and recorded no console warnings or errors.
- At `390 x 844`, the shared summary and dense ledger remain contained in local
  horizontal scrollers; all columns stay in the accessibility tree and there is no
  document-level table expansion.

## Comparison history

1. **Pass 1:** Side-by-side comparison found two P2 details: extra week-hover accent signals and an uneven day-card column height.
2. **Fix:** Restricted week accent signals to selection and normalized the unified card's column height.
3. **Pass 2:** Same-viewport selected, hover, day-card, month-card, and mobile captures showed no remaining P0/P1/P2 mismatch. Content and spacing differences from the references are intentional and explicitly required by the brief.
4. **Follow-up pass:** Changed the Day P&L chart canvas from `--surface` to the white light-theme card background, then repeated the 1440px comparison and console check. No new P0/P1/P2 issue appeared.
5. **Day Trades pass 1:** The rendered structure matched the reference, but the
   wider real P&L value clipped in its summary track and a sub-cent per-share value
   rounded to `$0.00`.
6. **Day Trades fix:** Widened the P&L track and used four-decimal precision only
   for nonzero per-share values below one cent. The final full-view and focused
   comparison boards show the complete `+$150.35` value and `+$0.0050` row value,
   with no remaining P0/P1/P2 mismatch.

## Follow-up polish

- None required for this styling slice.

**final result: passed**
