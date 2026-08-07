# Calendar & Journal Day — flattened prototypes

Self-contained HTML captures of the Calendar and Journal Day designs, prepared for
import into [Paper](https://paper.design) via its MCP server (`write_html`).

Source: `Trading Journal design review.zip` — a Design Component handoff whose
`.dc.html` files render through a runtime (`support.js`) that Paper does not execute.
Each file here is the **rendered DOM** of one prototype state, with the design-system
token CSS inlined, so it opens standalone with no server and no runtime.

## Files

| File | State |
| --- | --- |
| `calendar-month--collapsed.html` | Month grid, no day open |
| `calendar-month--day-expanded.html` | Month grid with the Tue Aug 4 week band open (day stat row + trade ledger) |
| `calendar-year.html` | Year zoom — twelve tinted mini-months |
| `journal-day--pnl.html` | Journal Day, P&L view — intraday chart + ticker rail |
| `journal-day--trades.html` | Journal Day, Trades view — full 10-column trade table |
| `calendar-design-review.html` | Written design rationale (prose, not a screen) |

The prototype's `Chart read` and `Coach` tabs are deliberate stubs ("Not built in this
prototype") and were not captured.

## What the flattening changed

- **The `<x-dc>` runtime is gone.** These are static DOM snapshots. Interaction is not
  preserved — that is why the calendar ships as three files rather than one.
- **Token CSS is inlined**, and `var(--token)` references are kept intact, so themes
  still resolve from `[data-theme]` on `<html>`.
- **Fonts load from Google Fonts** over the network, as in the source handoff.
- **The "Palette lab" panel was removed** from the Journal captures — a prototyping
  control, not part of the design.

## Round trip

These are a design reference, not production code. Reuse the shipped primitives
(`Money`, `LedgerTable`, `PnlChart`, `CalendarCell`, `SectionHeading`, `Button`) rather
than porting the inlined markup. Colour and type decisions belong in
`src/app/globals.css` — see [`docs/design/DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md).
