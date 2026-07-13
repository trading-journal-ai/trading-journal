# Ticker review V1 design QA

- Source visual truth: `/Users/justin/Desktop/screenshots/Screenshot 2026-07-12 at 6.56.06 AM.png` and `/Users/justin/Desktop/screenshots/Screenshot 2026-07-12 at 7.02.15 AM.png`.
- Implementation: `http://localhost:3000/trades/review?date=2026-04-01&symbol=AGPU`.
- Implementation screenshots: `/tmp/ticker-review-build/05-final-empty-state.jpg` and `/tmp/ticker-review-build/04-final-tag-menu.jpg`.
- Side-by-side comparison: `/tmp/ticker-review-build/qa-comparison.png`.
- Viewport: desktop, 1280 × 720.
- Compared state: empty ticker note, saved overall + Trade 10 section, tag menu open, and attachment drop target.

## Evidence

The supplied source screenshots and browser-rendered implementation captures were opened together in `/tmp/ticker-review-build/qa-comparison.png`. The implementation intentionally retains the app's Deep theme, unified-note editor, and right-rail trade entry point. Console warnings and errors: none.

## Comparison history

### Pass 1 — structural mismatches

- The implementation led with an always-open ticker textarea instead of the wireframe's optional story.
- Trade selection was a native select and the rail could not start or navigate to a note.
- Trade note headers repeated the symbol and exposed a `Primary label` select plus setup pills.
- Save/Done actions lacked the wireframe's strong dark action treatment.
- Execution markers were visible on the V1 ticker chart, though the source specifies chart-only context.

### Pass 2 — applied fixes

- Story is now collapsed behind `+ Add your story` until the trader chooses it.
- `+ Add trade` opens a compact menu, while each rail row is clickable and its `+` starts/focuses that trade note.
- Trade headers now read as one lock-up: `Trade N · entry @time · P&L`.
- The primary-label control and permanently exposed setup pills are removed from the ticker-review note form.
- Save and Done share a named dark action token across themes.
- The ticker-review chart renders with no execution markers.

### Pass 3 — unified review note

- The prior story and per-trade note sections are replaced by one ticker review note.
- `+ Add a note` opens the sole composer. Rail rows and their `+` controls append an `@trade · @time` anchor on a new line in that same composer.
- Saved reviews render as one readable note with a single `Edit note` entry point. No individual trade composer, primary label, or setup/pattern section appears in the ticker-review flow.
- The source helper treatment is retained as a soft, full-width support panel in light themes and stays visually quiet in Deep.

### Pass 4 — saved rich formatting

- The single editor opens with a `Ticker overall` cue, giving the initial thought a clear home without adding another form.
- Saved raw prose renders as a readable review: unanchored text is `Ticker overall`; each `@N` line becomes `Trade N · @time` with the paragraph below it.
- Rail `+` inserts the raw anchor on a new line only while editing, keeping authoring fast while making the saved document scannable.

### Pass 5 — empty-state hierarchy

- The empty state now presents the review sequence as left-aligned lines: ticker overall, moments that matter, then the rail/mention instruction.
- `+ Add a note` sits immediately beneath that guidance instead of competing with the review heading.
- `Edit note` moves into the saved-note header, adjacent to the content it changes.

### Pass 6 — instruction and completion clarity

- The supporting copy is reduced to the ticker-level review instruction plus a separate `+ add a note · ✎ edit note` line.
- The editor loses its nested surface and extra `Ticker overall` label; the textarea is the single white/light input surface in light themes.
- The trade-count badge and redundant rail footer are removed.
- `Done reviewing` now describes its actual state change rather than implying a Coach send action.
- Editing a saved ticker note now includes `Delete note`.

### Pass 7 — saved versus editing states

- Rich formatted sections remain the saved/read view; Edit intentionally returns to the single raw composer.
- The main-column instruction panel appears only for an empty review. Saved and existing-note edit states stay quiet.
- `+ add a note · ✎ edit note` and the `@2` / `@09:41` explanation move beneath the Trades rail.

### Pass 8 — re-save regression and edit actions

- Re-saving a raw edit now immediately returns to the rich formatted review instead of leaving the composer open.
- `Delete note` is directly left of `Save note` in edit mode.
- The `@2` / `@09:41` guidance sits directly below the main review heading; the rail keeps only its compact `+ / ✎` legend.

### Pass 9 — explicit mentions and chart focus

- New trade anchors use the self-describing `@trade1 · @10:50` format; saved legacy `@1` anchors remain compatible.
- The instruction under the review heading now demonstrates `@trade1` for a trade and `@10:58` for a chart moment.
- A timestamp-only line saves as a formatted `Chart moment · @time` section, parallel to the formatted trade sections.
- The full session remains available in the chart, but its initial viewport opens from 20 minutes before Trade 1 through 70 minutes after it so the first execution is no longer lost in the full day.
- Browser smoke testing confirmed the new rail append syntax, legacy rich-note rendering, and focused chart framing.

### Pass 10 — execution markers

- Buy and sell executions are restored as entry and exit arrows on the focused ticker chart.
- The same arrows remain aligned in the expanded chart, and the Trade 1-focused initial viewport is preserved.

### Pass 11 — screenshot-matched note states

- The empty state is now a real voice-or-type composer with a prominent microphone action, instructional copy, best/worst trade suggestions, and a dormant completion action until the note is saved.
- Saved overall, trade, and chart-moment sections use the screenshot's bordered reading surfaces while keeping one raw note behind the single Edit action.
- Trade headers show entry time and signed P&L, and the right rail remains the primary way to append any trade.

### Pass 12 — functional tags and attachments

- Trade sections now expose `+ Add tags`, searchable/createable choices, recent pills, selected header pills, immediate persistence, Escape handling, and click-away dismissal.
- Trade sections accept image, audio, and MP4/WebM drops or file browsing and render persisted previews from the existing attachment model.
- The tag menu is height-bounded and scrollable so its controls remain reachable in the 720px desktop viewport.

### Pass 13 — tags while composing

- Choosing a suggested trade or tapping `+` in the rail now promotes that trade into an active composer header with entry time, signed P&L, existing tag pills, and `+ Add tags` before the note is saved.
- The composing-state tag menu was verified against `/Users/justin/Desktop/screenshots/Screenshot 2026-07-12 at 7.02.15 AM.png` in `/tmp/ticker-review-build/qa-composing-tags.png`.
- Browser evidence: `/tmp/ticker-review-build/06-composing-tags.jpg` and `/tmp/ticker-review-build/07-composing-tag-menu.jpg`; no console warnings or errors.

### Pass 14 — empty prompt focus transition

- The best/worst `Worth 30 seconds each` strip now appears before the note composer so the suggested review targets are framed before writing begins.
- The unfocused empty composer retains the large voice-or-type invitation; focusing the textarea removes the prompt treatment and returns dictation to the standard lower-right position.
- Empty completion styling is now visibly dormant instead of inheriting the green ready-for-Coach state.
- Comparison evidence: `/tmp/ticker-review-build/qa-focus-transition.png`; browser captures: `/tmp/ticker-review-build/08-empty-before-focus.jpg` and `/tmp/ticker-review-build/10-final-focused-editor.jpg`; no console warnings or errors.

### Pass 15 — appended-trade caret placement

- Appending a trade now waits for the controlled textarea to render, focuses it, and explicitly places the selection at the textarea's actual end.
- Browser interaction proof appended Trade 3 to an existing AGPU note and typed `caretcheck`; the text landed after `@trade3 · @10:43`, then the unsaved test state was reloaded away without changing the saved note.

### Pass 16 — chart price-scale formatting

- Removed the custom whole-dollar price formatter that collapsed distinct scale ticks such as `$2.50`, `$3.00`, and `$3.50` into repeated integers.
- Lightweight Charts now owns the tick layout and label formatting; the candle series only supplies instrument precision (two decimals at or above `$1`, four below `$1`).
- The right scale reserves a consistent label gutter and uses the denser chart type size so decimal labels remain legible without colliding.
- Browser verification on AGPU shows a correct `$2.00`–`$4.20` decimal scale with execution arrows still aligned. Evidence: `/tmp/ticker-review-build/11-price-axis-before.jpg` and `/tmp/ticker-review-build/12-price-axis-after.jpg`; no console errors.

### Pass 17 — chart plot and price-scale boundary

- The execution-marker overlay now uses Lightweight Charts' actual plot width instead of the full chart container, so markers outside the visible time range cannot spill into the price scale.
- Off-range marker coordinates are discarded, and the SVG overlay is clipped at the plot boundary as a second guard during chart resize and fullscreen transitions.
- The minimum price-scale gutter is reduced from 64px to 56px, moving decimal labels closer to the right edge while preserving readability.
- Browser verification passed in both inline and expanded states. Evidence: `/tmp/ticker-review-build/13-chart-boundary-inline.jpg` and `/tmp/ticker-review-build/14-chart-boundary-expanded.jpg`; no console warnings or errors.

### Pass 18 — attachment save and repeated-trade regression

- NVDL contained one attachment database row but two Trade 2 anchors; each rendered card was showing the same saved image, which made the upload appear duplicated.
- Selecting a trade that is already mentioned no longer appends another anchor, including the selected-trade URL/reload path.
- Duplicate empty trade anchors already present in saved notes are normalized into one visible section without deleting the underlying note or attachment.
- Successful uploads now return their saved attachment record and show the preview immediately while the route refresh reconciles in the background; a synchronous in-flight guard blocks repeat submission before React updates.
- Browser verification shows one Trade 2 heading and one `Chart - from Dom.webp` figure before and after reload. Evidence: `/tmp/ticker-review-build/16-nvdl-note-single-attachment.jpg`; no console warnings or errors.

### Pass 19 — paired trade endpoint labels

- Each trade's first opening execution now receives a solid `Tn` label, and the final execution of a closed trade receives the matching outlined `Tn` label.
- Scale-ins and partial exits retain their buy/sell arrows without labels; open trades intentionally have no closing label.
- Execution ordering uses timestamp plus execution id so same-second partial fills produce a deterministic final-exit marker.
- Labels use role-based placement (entries above, exits below), lightweight connector lines, collision-aware horizontal/vertical lanes, and the existing plot clipping boundary.
- Browser verification on dense AGPU data passed in inline and expanded states. Evidence: `/tmp/ticker-review-build/20-trade-labels-final-inline.jpg` and `/tmp/ticker-review-build/21-trade-labels-expanded.jpg`; no console warnings or errors.

### Pass 20 — circular entry and exit endpoints

- Rectangular endpoint labels are replaced by compact numbered circles: green entries below the candle and red final exits above it.
- Each endpoint uses a thin semantic-color stem from the exact execution price to a circle positioned beyond the candle wick; a small anchored dot preserves the precise fill location.
- Lifecycle position and color now carry redundant meaning, so short trades remain understandable without relying on buy/sell color semantics.
- Partial fills retain the original buy/sell arrows, while endpoint circles continue to use collision-aware lanes and plot-boundary clipping.
- Browser verification passed on dense AGPU, single-trade ZJYL, and expanded ZJYL. Evidence: `/tmp/ticker-review-build/22-circle-endpoints-agpu.jpg`, `/tmp/ticker-review-build/23-circle-endpoints-zjyl.jpg`, and `/tmp/ticker-review-build/24-circle-endpoints-expanded.jpg`; no console warnings or errors.

### Pass 21 — minimal nearest-edge endpoint placement

- Endpoint placement now follows fill geometry rather than a fixed lifecycle side: the marker chooses the candle edge nearest its execution price and only moves farther outward to resolve collisions.
- This keeps stems short and prevents a low exit and high next entry on the same candle from crossing through the full candle.
- Circles shrink from 24px to 20px and switch to a white surface with green entry text or red exit text, retaining the exact-price anchor dot and a quieter semantic stem.
- Browser verification passed on dense AGPU, the overlapping three-trade NVDL sequence, expanded NVDL, and the Daylight theme. Evidence: `/tmp/ticker-review-build/25-minimal-endpoints-agpu.jpg`, `/tmp/ticker-review-build/26-minimal-endpoints-nvdl.jpg`, `/tmp/ticker-review-build/27-minimal-endpoints-expanded.jpg`, and `/tmp/ticker-review-build/28-minimal-endpoints-daylight.jpg`; no console warnings or errors.

### Pass 22 — number-only micro markers

- Endpoint circles now show only the trade number; the redundant `T` prefix is removed.
- Circles shrink from 20px to 16px, numeric type drops from 10px to 8px, and stems/anchor dots scale down proportionally.
- Nearest-edge placement, entry/exit color semantics, collision lanes, and chart clipping remain unchanged.
- Browser verification confirms trades `10–12` remain legible on dense AGPU and paired `1–3` markers remain clear on inline and expanded NVDL. Evidence: `/tmp/ticker-review-build/29-numeric-markers-agpu.jpg`, `/tmp/ticker-review-build/30-numeric-markers-nvdl.jpg`, and `/tmp/ticker-review-build/31-numeric-markers-expanded.jpg`; no console warnings or errors.

### Pass 23 — restore execution arrows

- The trade-number experiment is removed: no endpoint circles, dots, stems, collision lanes, or trade-boundary marker data remain.
- Every execution—including each trade's first and final fill—renders through the same compact buy/sell triangle treatment again.
- The corrected decimal price scale, focused time range, fullscreen behavior, and plot-boundary clipping remain intact.
- Browser verification passed on eight-trade CUE and dense AGPU in inline and expanded states. Evidence: `/tmp/ticker-review-build/32-arrows-restored-cue.jpg`, `/tmp/ticker-review-build/33-arrows-restored-agpu.jpg`, and `/tmp/ticker-review-build/34-arrows-restored-expanded.jpg`; no console warnings or errors.

### Pass 24 — execution detail tooltip

- Execution arrows remain visually unchanged; each now has an invisible 20px hover, tap, and keyboard hit target.
- The compact tooltip shows only the execution's trade number and side, followed by share size and exact fill price (for example, `Trade 1 · Buy` and `10 shares @ $32.2499`).
- Tooltip positioning is clamped to the plot area, works in inline and expanded charts, and closes on Escape, blur, or a plot click.
- Accessible labels expose the same execution data, with Enter and Space support for keyboard users.
- Browser verification passed on eight-trade CUE in inline and expanded states. Evidence: `/tmp/ticker-review-build/35-execution-tooltip-cue.jpg` and `/tmp/ticker-review-build/36-execution-tooltip-expanded.jpg`.

### Pass 25 — compact fill and sell outcome

- Execution prices are rounded to two decimal places in both the visible tooltip and accessible marker label.
- The redundant word `shares` is removed while the fill quantity remains, producing compact copy such as `10 @ $32.25`.
- Sell tooltips append the trade's signed realized outcome, colored green for profit and red for loss; buy tooltips stay focused on the fill.
- The browser help cursor is removed, while the existing hover, tap, focus, and keyboard behavior remains intact.
- Browser verification passed on CUE buy and sell executions. Evidence: `/tmp/ticker-review-build/37-execution-tooltip-buy-rounded.jpg` and `/tmp/ticker-review-build/38-execution-tooltip-sell-pnl.jpg`; no console warnings or errors.

### Pass 26 — hold time and per-share outcome

- Each trade in the right rail now adds a quiet second metric line with exact hold duration and signed net P&L per share.
- Per-share math reuses the earlier single-trade review behavior: net trade P&L divided by absolute trade quantity.
- Sell execution tooltips now prioritize signed per-share outcome and total trade P&L; buy tooltips retain fill size and price.
- Tooltip width is content-driven (`max-content`) and its plot position is clamped using the rendered copy length, removing the oversized fixed card.
- Browser verification passed on thirteen-trade LABT for losing and profitable sells. Evidence: `/tmp/ticker-review-build/39-labt-trade-metrics.jpg`, `/tmp/ticker-review-build/40-labt-sell-per-share-tooltip.jpg`, and `/tmp/ticker-review-build/41-labt-profitable-sell-tooltip.jpg`; no console warnings or errors.

### Pass 27 — stacked sell outcomes

- Sell tooltips now stack per-share result and total P&L on separate lines beneath the trade header, removing the inline separator.
- Content-width calculation measures the longest tooltip row rather than the combined outcome string, allowing the surface to contract around the stacked copy.
- The taller sell card receives additional vertical clearance from its execution arrow; buy tooltips retain their compact two-row fill treatment.
- Browser verification passed on profitable and losing LABT sells, with a buy-fill regression check. Evidence: `/tmp/ticker-review-build/42-labt-stacked-sell-tooltip.jpg`; no console warnings or errors.

### Pass 28 — empty composer copy hierarchy

- Removed the regressed `Start with the ticker, then the trades that matter.` sentence from beside the review heading.
- Promoted `How did {symbol} trade, and how did you trade it?` to the empty composer's primary prompt.
- Demoted `Hold to talk — or start typing.` to concise 12px supporting copy beneath the question.
- The instructional `@trade` / timestamp guidance and suggested-trade strip remain unchanged.
- Browser verification passed on SST. Evidence: `/tmp/ticker-review-build/44-sst-composer-headline.jpg`; no console warnings or errors.

### Pass 29 — inline trade instructions

- Removed the large instructional paragraph above the composer.
- Moved the guidance into the empty note surface under the review question.
- Tightened the copy to `Comment on any trade.` followed by two bullets: tap `+` on a trade row, or mention `@trade2` / `@10:58` while talking.
- Browser verification passed on SST. Evidence: `/tmp/ticker-review-build/45-sst-inline-note-instructions.jpg`; no console warnings or errors.

### Pass 30 — sans trade ledger and metric columns

- Removed the mono face from the suggested-trade summary and right-side trade rows while retaining tabular numerals for alignment.
- Widened the desktop trade rail from 260px to 360px.
- Added labeled `Entry`, `Held`, `Per share`, and `P&L` columns, with each trade rendered as one compact ledger row.
- Removed repeated `held` and `/share` suffixes from individual rows because the column headers now carry that context.
- Browser verification passed on SST. Evidence: `/tmp/ticker-review-build/46-sst-sans-trade-columns.jpg`; no console warnings or errors.

### Pass 31 — evenly spaced trade columns

- Replaced the custom per-column widths with one shared five-column equal-width grid.
- Header labels and every trade row now use the exact same grid contract.
- The `+` / edit action remains a separate narrow column so it does not compete with trade data.
- Browser verification passed on SST. Evidence: `/tmp/ticker-review-build/47-sst-even-trade-columns.jpg`; no console warnings or errors.

### Pass 32 — combined trade entry column

- Combined trade number and entry time into a single `Entry` column.
- Removed the separate `#` header and reduced the ledger to four evenly spaced data columns: Entry, Held, Per share, and P&L.
- The first cell preserves hierarchy with a bold trade number beside the muted timestamp.
- Browser verification passed on SST. Evidence: `/tmp/ticker-review-build/48-sst-combined-entry-column.jpg`; no console warnings or errors.

### Pass 33 — origin-aware global navigation

- Review pages now derive the active global section from their validated `returnTo` path.
- Journal-origin reviews keep Journal active; Trades-origin reviews keep Trades active.
- Missing or invalid origins continue to fall back to the route-based Trades state, and primary navigation now exposes `aria-current="page"`.
- Browser verification passed on GLXG for Journal origin, Trades origin, and no-origin fallback. Evidence: `/tmp/ticker-review-build/49-journal-origin-nav.jpg` and `/tmp/ticker-review-build/50-trades-origin-nav.jpg`; no console warnings or errors.

### Pass 34 — trade summary dashboard and column alignment

- Added an open four-stat strip under the Trades heading: trade count, accuracy, profit factor, and total P&L.
- Accuracy excludes scratch trades; profit factor divides summed winning P&L by absolute summed losing P&L; total P&L uses the same net row values.
- Rebalanced the ledger grid to give Entry more room, with Held and Per share centered beneath their headers and P&L right-aligned.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/51-agpu-trade-dashboard.jpg`; no console warnings or errors.

### Pass 35 — aligned review headings and single summary divider

- Promoted `Trades` to the same section-heading type role as `How did I trade {symbol}?`, aligning their baseline across the two-column layout.
- Removed the bottom border from the four-stat summary strip.
- The trade ledger's top hairline now serves as the summary's closing divider, eliminating the double-rule effect.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/52-agpu-heading-border-alignment.jpg`; no console warnings or errors.

### Pass 36 — aligned share-count trade ledger

- Added each trade's recorded share quantity to the review ledger.
- Reordered the trade metrics to `Shares`, `Per share`, `Held`, and `P&L` after the combined Entry column.
- Header and row values now share one five-column grid, with every metric centered beneath its label.
- Widened the desktop trade rail to 420px so the additional metric remains readable without crowding.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/53-agpu-shares-aligned-ledger.jpg`; no console warnings or errors.

### Pass 37 — expanded execution ledger

- Renamed the first ledger column to `Trade`, preserving trade number and entry time as the row identifier.
- Added `Entry shares`, `Executions`, average `Entry`, and average `Exit` columns ahead of Per share, Held, and P&L.
- Increased the desktop trade rail to 620px, intentionally reducing note width to prioritize trade comparison.
- Reused one eight-column grid for the header and every row so values stay locked beneath their labels.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/54-agpu-expanded-trade-ledger.jpg`; no console warnings or errors.

### Pass 38 — fixed ledger price precision

- Shortened the `Entry shares` header to `Shares`.
- Scoped Entry and Exit formatting to the review ledger and fixed both to exactly two decimal places, including trailing zeros.
- Preserved higher-precision price formatting elsewhere in the app.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/55-agpu-rounded-ledger-prices.jpg`; no console warnings or errors.

### Pass 39 — compact entry and exit column

- Combined the separate Entry and Exit columns into one `Entry / exit` column.
- Rendered both two-decimal prices on one line with a slash separator.
- Shortened `Executions` to `Exec` and reduced the desktop trade rail from 620px to 560px, returning useful width to the note.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/56-agpu-combined-entry-exit.jpg`; no console warnings or errors.

### Pass 40 — tighter Trade and Shares spacing

- Reduced the Trade column's grid share so its width better matches the compact trade number and entry time content.
- Moved the complete Shares column left without offsetting its header from its row values.
- Preserved the spacing and alignment of Exec, Entry / exit, Per share, Held, and P&L.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/57-agpu-tighter-trade-shares-spacing.jpg`; no console warnings or errors.

### Pass 41 — balanced summary metric strip

- Anchored Trades at the left edge, centered Accuracy and Profit factor, and anchored Total P&L at the right edge of the summary strip.
- Kept the four equal metric columns and their dividers, but used each column's full width so the right side no longer appears empty.
- Matched the summary-to-ledger spacing to the heading-to-summary spacing for a consistent vertical rhythm.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/58-agpu-justified-summary-metrics.jpg`; no console warnings or errors.

### Pass 42 — even summary cells and zero ledger gap

- Removed the Trade ledger's top margin so the ledger border joins the summary strip directly.
- Gave Trades, Accuracy, Profit factor, and Total P&L the same centered cell alignment and padding inside a four-column grid.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/59-agpu-even-summary-zero-gap-ledger.jpg`; no console warnings or errors.

### Pass 43 — summary edge alignment

- Kept the four equal summary cells while left-aligning Trades and right-aligning Total P&L.
- Preserved centered alignment for Accuracy and Profit factor.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/60-agpu-summary-edge-alignment.jpg`; no console warnings or errors.

### Pass 44 — centered summary metrics

- Centered Trades and Total P&L again so all four summary metrics use the same equal-cell alignment.
- Preserved the no-gap transition into the trade ledger.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/61-agpu-centered-summary-metrics.jpg`; no console warnings or errors.

### Pass 45 — evenly spaced summary anchors

- Pinned Trades to the left and Total P&L to the right.
- Positioned Accuracy and Profit factor at evenly spaced interior anchors rather than centering all four values in equal-width cells.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/62-agpu-evenly-spaced-summary-anchors.jpg`; no console warnings or errors.

### Pass 46 — optical summary-to-ledger alignment

- Shifted the Trades summary metric 4px right to match the Trade-number inset below.
- Shifted Total P&L 12px left to align with the add/edit action glyphs in the ledger.
- Preserved the evenly spaced Accuracy and Profit factor anchors.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/63-agpu-optical-summary-alignment.jpg`; no console warnings or errors.

### Pass 47 — semi-bold trade headers

- Applied semi-bold weight to the Trade, Shares, Exec, Entry / exit, Per share, Held, and P&L column labels.
- Kept row values at their existing weight to preserve hierarchy.
- Browser verification passed on AGPU. Evidence: `/tmp/ticker-review-build/64-agpu-semibold-trade-headers.jpg`; no console warnings or errors.

## Fidelity surfaces

- Typography and layout: the empty composer, saved section cards, tag menu, and attachment slot follow the supplied hierarchy at the app's denser desktop scale.
- Colors and tokens: the app intentionally retains its active Deep theme rather than forcing the source's Daylight palette; named action tokens preserve the source's strong save hierarchy in every theme.
- Images and chart: the chart remains the app's live TradingView-style chart; execution arrows are visible in both inline and expanded views.
- Copy and affordances: voice or typing starts the review immediately; suggested-trade buttons and rail `+` append trade anchors; `Edit note` remains the only saved-state edit action.
- Note structure: the raw review note stays readable while `@trade` / `@time` anchors turn into section headers after save and give Coach the context needed to interpret each paragraph.

## Follow-up polish

- Verify the same flow at a mobile breakpoint.

final result: passed

---

# Coach recap spine design QA

- Source visual truth: `/Users/justin/.codex/generated_images/019f58d5-bb93-7161-bc70-2e19d4be0215/exec-02f05185-fc9e-4987-9d48-6ac12aae8291.png`.
- Implementation: `http://localhost:3000/review/journal/coach-recap-spine`.
- Implementation screenshots: `/private/tmp/trading-journal-codex-qa-019f58d5/coach-recap-qa/01-ready.png`, `/private/tmp/trading-journal-codex-qa-019f58d5/coach-recap-qa/02-generated-with-evidence.png`, `/private/tmp/trading-journal-codex-qa-019f58d5/coach-recap-qa/03-mobile-ready.png`, `/private/tmp/trading-journal-codex-qa-019f58d5/coach-recap-qa/06-post-fix-980x1000.png`, and `/private/tmp/trading-journal-codex-qa-019f58d5/coach-recap-qa/07-chart-region.png`.
- Viewports: desktop `1280 × 720`, matched visual frame `980 × 1000`, and mobile `390 × 844`.
- Compared states: ready to generate, generated recap, answered coach question, and open/closed evidence drawer.

## Full-view comparison evidence

The selected Film Room concept and the final browser captures were opened together. The implementation preserves the concept's coach-first hierarchy, Deep theme, day header, cumulative P&L plus ticker rail, qualitative playbook alignment, prioritized review moments, one experiment, and advanced evidence disclosure. The review-only header and the pre-generation state are intentional prototype additions required to demonstrate the revised product flow.

## Focused region comparison evidence

The chart/ticker and playbook-alignment region was captured separately in `07-chart-region.png`. It confirms the negative P&L path is red, positive P&L path is green, ticker values retain semantic color, and the alignment strip keeps the source's open ledger rhythm.

## Findings

- No remaining P0/P1/P2 differences.
- P3: the implementation uses the app's Geist typography and existing chart axis density instead of reproducing the generated mock's exact font rendering and three-tick axis. This is intentional design-system alignment.
- P3: the recap is longer than the source because the requested targeted follow-up question is an inline workflow rather than an action link. Progressive disclosure keeps the advanced evidence collapsed by default.

## Comparison history

### Pass 1 — semantic chart tone

- Finding: the reused cumulative chart colored the entire line green because the final session P&L was positive, making the early drawdown look positive.
- Severity: P2 because trading meaning was encoded incorrectly.
- Fix: added optional split-tone and fill behavior to the shared chart, enabled only for this recap preview.

### Pass 2 — post-fix evidence

- `07-chart-region.png` shows the drawdown in red, the recovery in green, semantic area fills, and the ticker rail in the same rendered state.
- Browser console: no warnings or errors.
- Desktop document width matched the viewport with no horizontal overflow.
- Mobile document width matched `390px` with no horizontal overflow.

## Interaction proof

- `Generate recap` transitions from the source-readiness screen to the synthesized coach feedback.
- The coach answer field enables `Update recap`; submitting an answer shows the revised judgment and records that the answer is saved back to PFSA trade context.
- The evidence drawer opens to robustness, economics, and trend-vote details.
- Page identity, non-blank state, framework overlay check, and console health passed.

## Fidelity surfaces

- Fonts and typography: app-standard Geist sans/mono roles, readable body sizes, compact mono evidence labels, and source-like hierarchy.
- Spacing and layout rhythm: open sections, hairlines before boxes, restrained radii, and dense-but-readable trading rows.
- Colors and visual tokens: Deep theme tokens, red/green reserved for outcomes, blue reserved for actions and focus.
- Image and asset fidelity: no source imagery was required; the existing app-native cumulative P&L chart was reused and extended instead of replaced with placeholder artwork.
- Copy and content: recap copy separates process from outcome, cites playbook and note sources, and asks only for context that could change the coach judgment.

final result: passed
