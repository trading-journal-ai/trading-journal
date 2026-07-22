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


---

# Design QA — journal data-exploration wireframe

## Source visual truth

- `/Users/justin/Downloads/exports/wireframe-1a-page-before.png`
- `/Users/justin/Downloads/exports/wireframe-1b-page-after.png`
- `/Users/justin/Downloads/exports/wireframe-1c-coach-feed.png`
- `/Users/justin/Downloads/exports/wireframe-2a-day-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-2b-week-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-2c-month-inventory.png`
- `/Users/justin/Downloads/exports/wireframe-3a-day.png`
- `/Users/justin/Downloads/exports/wireframe-3b-week.png`
- `/Users/justin/Downloads/exports/wireframe-3c-month.png`

## Implementation evidence

- `/tmp/journal-data-wireframe-qa/01-before-day-pnl-viewport.png`
- `/tmp/journal-data-wireframe-qa/02-month-risk-contract.png`
- `/tmp/journal-data-wireframe-qa/03-after-review.png`
- `/tmp/journal-data-wireframe-qa/04-coach-feed.png`
- `/tmp/journal-data-wireframe-qa/05-mobile-before.png`
- `/tmp/journal-data-wireframe-qa/06-mobile-month-risk.png`
- `/tmp/journal-data-wireframe-qa/07-day-pnl-module.png`
- `/tmp/journal-data-wireframe-qa/08-week-edge-module.png`
- Route: `http://localhost:3001/preview/journal`

## Viewports and states

- Desktop: 1100 × 900; before review, generated review, Coach feed, Day P&L, Week Edge, and Month Risk with data contract.
- Mobile: 390 × 844; before review and Month Risk.
- Mobile geometry: `scrollWidth: 390`, `clientWidth: 390`.

## Full-view comparison evidence

The source and implementation captures were opened together in five paired comparison inputs:

- Day module: `wireframe-3a-day.png` with `07-day-pnl-module.png`.
- Week module: `wireframe-3b-week.png` with `08-week-edge-module.png`.
- Month module: `wireframe-3c-month.png` with `02-month-risk-contract.png`.
- Coach feed: `wireframe-1c-coach-feed.png` with `04-coach-feed.png`.
- Page-before hierarchy: `wireframe-1a-page-before.png` with `01-before-day-pnl-viewport.png`.

The implementation preserves the source’s warm paper canvas, dark surround, dashed neutral modules, orange active/review accents, green generated-state accents, uppercase mono labels, compact segmented controls, and intentionally low-fidelity density. The source presents four module states side by side; the implementation intentionally turns them into one interactive module because the prototype’s purpose is to inspect each data view at readable size.

## Focused-region comparison evidence

- The Day P&L focused capture confirms the source’s chart-plus-ticker split is retained with representative values and note state.
- The Week Edge capture confirms the centered expectancy concept is represented as signed, directly labeled bars with sample size and PF in each row.
- The Month Risk capture confirms six risk metrics plus the wide rule-simulation block, while the data-contract drawer remains subordinate.
- The Coach feed capture confirms reverse chronological session entries with one highlighted weekly read.
- Mobile captures confirm the page-state controls and 3 × 4 module controls remain visible without page-level horizontal overflow.

## Findings

- P0: none.
- P1: none remaining.
- P2: none remaining.
- P3: the prototype masthead is an exploration aid not present in the source. It is intentionally retained so reviewers understand that visual polish is not the decision being requested.
- P3: simple DOM bars replace production chart geometry. This is intentional; values, labels, caveats, and interaction states are the prototype contract.
- No raster/image assets were required. All visible marks are data-bound interface elements, not substitutes for source imagery.

## Comparison history

### Pass 1 — URL hydration

- Finding: URL-derived scope/view state initialized differently on the server and client, producing a hydration error after reload.
- Severity: P1 because shared links could briefly render the wrong view and the development overlay reported a broken state.
- Fix: parse and validate `page`, `scope`, and `view` in the server page, then pass matching initial state and payload into the client component.

### Pass 2 — post-fix verification

- A clean browser tab loaded `?page=before&scope=day&view=pnl` with the correct Day P&L heading and no console warnings or errors.
- All 12 preview endpoint combinations returned HTTP 200.
- Generate review, Coach feed, Month Risk, and data-contract interactions passed.
- Desktop and mobile comparison captures show no remaining P0/P1/P2 mismatch.

## Fidelity surfaces

- Fonts and typography: Geist sans and mono reproduce the source’s plain body copy, strong mono labels, tabular figures, and low-fidelity hierarchy.
- Spacing and layout rhythm: the implementation keeps dashed blocks, restrained radii, open internal spacing, and clear separation between page-level interpretation and the data module.
- Colors and visual tokens: warm neutrals dominate; green/red communicate outcomes with signed text; orange marks active review and caveat states.
- Image quality and assets: the source set contains no required product imagery, logos, illustrations, or non-standard icons. The prototype uses data-bound bars, rows, heat cells, and tables.
- Copy and content: the page states and all 12 views map to the source inventories, with representative values, sample labels, deterministic takeaways, and explicit statistical caveats.

## Primary interactions tested

- Page states: Before review, After review, Coach feed.
- Scope controls: Day, Week, Month.
- View controls: all 12 payload combinations; representative UI transitions for Day P&L, Week Edge, and Month Risk.
- Generate Coach review.
- Show/hide data contract.
- URL-backed `page`, `scope`, and `view` state.
- Mobile controls and body-width behavior.
- Browser console after the hydration fix: no warnings or errors.

## Final result

passed

---

# Design QA — Tag Visual System Rollout

## Source and implementation

- Source visual truth: `/private/tmp/tag-visual-system-reference-sheet.png`, rendered from `docs/coach/references/tag-visual-system-reference.html`.
- Implementation: `http://127.0.0.1:4317/review/journal/tag-taxonomy`.
- Modal capture: `/private/tmp/tag-taxonomy-semantic-modal.png`.
- Saved classification capture: `/private/tmp/tag-taxonomy-semantic-saved.png`.
- Combined focused comparison: `/private/tmp/tag-visual-system-prototype-comparison.png`.

## Viewport and normalization

- Browser-rendered implementation viewport: `1280 × 720` CSS pixels at 1:1 density.
- Source reference: `1100 × 1357` pixels; implementation modal capture: `1280 × 720` pixels.
- Focused comparison: source crop normalized to `620 × 732`; implementation crop normalized to `620 × 564`; both placed in one `1280 × 802` comparison image without changing aspect ratio.
- Compared state: modal open with Pattern identity, review-grade Execution, reinforcing Risk, and settled Emotion selections visible. The saved view was also captured with all four categories grouped under headers.

## Full-view comparison evidence

The implementation carries the reference system into the existing compact modal without changing its established composition. Pattern uses the activity identity glyph and neutral fill; Execution and Risk use check/x verdict glyphs and green/red semantic fills; Emotion uses the face identity glyph with teal/amber sentiment. Unselected choices retain the modal's outline affordance while previewing their semantic icon color.

## Focused-region comparison evidence

`/private/tmp/tag-visual-system-prototype-comparison.png` places the source reference and rendered modal together. The visible glyph family, stroke weight, chip color tokens, chip scale, and category-to-semantics mapping match the source. The source's grouped-card example is reflected in the rendered Trade classification section in `/private/tmp/tag-taxonomy-semantic-saved.png`.

## Fidelity surfaces

- Fonts and typography: existing Geist sans/mono roles remain intact; the semantic chips preserve the reference's compact 11–12px scale and readable label weights.
- Spacing and layout rhythm: icons use a consistent 5px label gap, chips stay at the existing 24px picker height, and saved tags use a compact category-label grid.
- Colors and tokens: the implementation uses the source hex values exactly for reinforcing, review, neutral, settled, and activated states.
- Image quality and assets: all visible glyphs use the supplied SVG assets from `public/icons/tags`; no emoji, text glyphs, inline SVG replacements, or CSS-drawn icons were introduced.
- Copy and content: existing tag labels, Pattern terminology, and More controls are preserved.
- States and behavior: selected chips use semantic fills; available chips stay outlined; conflicting Execution selections replace one another; Save updates the grouped classification.

## Primary interactions tested

- Selected `Late or chased`, confirming it replaced the conflicting entry-timing choice and rendered with the review treatment.
- Selected `Calm`, confirming the settled Emotion treatment.
- Saved the modal and confirmed Pattern, Execution, Risk, and Emotion render under separate category headers.
- Confirmed page identity, meaningful DOM content, framework-overlay absence, and zero browser console warnings/errors.

## Comparison history

### Pass 1 — semantic rollout

- P0: none.
- P1: none.
- P2: none.
- P3: the in-app browser remained at its fixed `1280 × 720` viewport when a mobile viewport was requested, so this semantic rollout was not re-captured at mobile width. The previously verified modal uses wrapping rows and the icon addition does not change control height.

## Final result

passed

---

# Journal day data views — production slice QA

- Implementation: `http://localhost:3001/journal?date=2026-07-14`.
- Source behavior: `/Users/justin/Downloads/Daily Recap (standalone).html`.
- Production contract: `docs/product/JOURNAL_COMPARE_INDICATORS_KEY_MOMENTS.md`.
- Viewports checked: desktop application viewport and mobile 390 × 844.

## Evidence

- The production route rendered the existing live account data for July 14:
  14 trades, 36 fills, 69% accuracy, 2.05 PF, and +$6.38 net P&L.
- Day P&L, Trades, Process, and Coach tabs were exercised in the in-app browser.
- Trades exposed live time, symbol, side/size, hold, setup coverage, tag coverage,
  and P&L without inventing missing context.
- Add/Edit ticker-note affordances, Coach-context progress, scoped day-note entry,
  draft/generate actions, no-trade state, and safe generation-error copy rendered.
- Mobile capture showed no page-level horizontal overflow in the new module.
- Browser console warnings and errors: none.

## Findings

- P0: none.
- P1: none.
- P2: none found in functional and responsive browser checks.
- P3: Market Context is intentionally an explicit unavailable state until the
  immutable Stock Info daily-summary contract is connected.
- P3: Week Alignment cannot score opportunity fit until the immutable Stock
  Info daily-summary contract is connected.
- P3: Month Horizon currently compares the selected month with the existing
  prior-30-day baseline; 60d, 90d, and YTD remain a follow-on query contract.

## Source-capture caveat

The in-app browser security policy blocked direct `file://` capture of the
standalone HTML. Its source, interaction state machine, labels, and styles were
inspected and mapped directly, but a same-viewport, side-by-side raster
comparison against the HTML could not be completed in the approved browser.

## Comparison history

### Pass 2 — restore the standalone HTML hierarchy

- Moved Market Context below the session verdict and beside Process Read on
  desktop; Process Read now stacks Aligned above Unresolved.
- Restored the HTML control language: underlined Day/Week/Month tabs, dark
  pill-selected data views, open interpretation columns, white bordered metric
  cards, a bordered trade ledger, and stacked Process cards.
- Preserved production data, note affordances, URL navigation, and Coach state.
- Rendered evidence:
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-html-match-desktop.png`,
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-html-match-trades.png`,
  and
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-html-match-mobile.png`.
- Desktop and 390 × 844 mobile checks passed with no browser console warnings
  or errors. Market Context appears once and remains outside the active data
  view.

### Pass 3 — widen the production reading column

- Increased the desktop Journal frame from 905px to 1040px and the main review
  column from 665px to 800px, matching the more open proportions of the visual
  comp while retaining the archive rail.
- The interpretation row, data module, key-trade prompts, and review card now
  share the wider measure. Long-form Coach copy keeps its narrower readable
  line length.
- The medium breakpoint now uses a flexible main column instead of forcing the
  desktop width. Browser checks confirmed no horizontal overflow at 1280px,
  768px, or 390px.
- Rendered evidence:
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-wider-desktop.png`.

### Pass 4 — activate the production 3 × 4 matrix

- Replaced Week and Month navigation links with in-place scope tabs. The
  selected scope and view now remain visibly active and are mirrored in the
  Journal URL.
- Verified all 12 production combinations: Day P&L/Trades/Process/Coach; Week
  P&L/Edge/Alignment/Coach; Month P&L/Horizon/Risk/Coach.
- Scope changes reset to P&L, matching the exploration prototype. The selected
  day remains the page anchor.
- Week and Month render live range data. Missing Stock Info context and longer
  horizon queries remain explicit evidence boundaries rather than mock values.
- Desktop and 390 × 844 checks passed without horizontal overflow or console
  errors.
- Rendered evidence:
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-day-scope-production.png`,
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-month-risk-production.png`,
  and
  `/Users/justin/.codex/visualizations/2026/07/17/019f70c1-0c45-7db3-8b75-3bfa8af92f06/journal-month-risk-mobile.png`.

## Final result

blocked

---

# V5 data-visualization vocabulary design QA

- Source visual truth: `/Users/justin/.codex/generated_images/019f7644-90aa-7b33-9abe-b155adebfc72/exec-0357f86d-b69f-4ed2-b6e2-a4f6f8e28c96.png`.
- Implementation: `http://localhost:3001/preview/data-viz/v5`.
- Implementation screenshot: `/private/tmp/trading-journal-v5-desktop.png`.
- Side-by-side comparison: `/private/tmp/trading-journal-v5-comparison.png`.
- Viewports: desktop 1440 × 1059; mobile 390 × 844.
- Compared state: V5 overview with Move Field selected on T-3501; mobile overview, Move Field, and month list.

## Full-view comparison evidence

The source concept and browser-rendered V5 implementation were combined in one comparison image. The implementation retains the source’s warm paper surface, mono metadata, hairline structure, direct labels, neutral market context, green/red trade outcomes, and blue persistent-selection state. The larger vertical rhythm and separate specimens are intentional: the user selected a vocabulary exploration, not the source concept’s finished dashboard composition.

## Focused-region comparison evidence

The Move Field is legible in the combined image at the same desktop viewport. It preserves the source concept’s high–low envelope, close path, opportunity thresholds, scanner timing, execution spans, volume context, and selected-trade label. No raster imagery or non-standard product assets were required; all drawn marks encode data.

## Findings

- P0: none.
- P1: none.
- P2: none remaining.
- P3: the V5 masthead is intentionally more editorial than the compact source dashboard so reviewers understand the four independent vocabulary families before evaluating them.
- P3: reconstructed scanner moments are visibly labeled as prototype evidence; immutable relative-volume history is not fabricated.

## Comparison history

### Pass 1 — late-day label clipping

- Finding: the selected T-3504 outcome label extended past the right edge of the Move Field.
- Severity: P2 because a valid persistent selection lost part of its direct label.
- Fix: right-edge labels now reverse their text anchor and render inside the plot.

### Pass 2 — post-fix responsive verification

- Desktop and mobile pages rendered without framework overlays or console warnings/errors.
- The Move Field and Excursion Range retain swipeable wide canvases at 390px while keeping essential summaries outside the plot.
- Mobile geometry passed with `scrollWidth: 390` and `clientWidth: 390`.
- Persistent trade selection updated Result and MFE Captured; missing-coverage selection produced the explicit no-inference message.

## Fidelity surfaces

- Fonts and typography: Geist sans and mono preserve the app’s established type roles, tabular figures, direct labels, and readable hierarchy.
- Spacing and layout rhythm: open sections and hairlines replace nested cards; dense marks stay inside their specimens with generous separation between families.
- Colors and visual tokens: warm neutral tokens dominate; green/red carry signed outcome and favorable/adverse meaning; blue is reserved for focus and selection.
- Image quality and assets: the page uses crisp SVG data marks. No source logo, illustration, icon, or photographic asset was replaced with a code approximation.
- Copy and content: each specimen leads with a review question, explains the evidence, names its use case and mobile behavior, and exposes the relevant data caveat.

## Primary interactions tested

- Persistent Move Field trade selection, including a losing late-day trade.
- Explicit missing-scanner-coverage state in the monthly lens.
- Desktop page identity, meaningful DOM content, framework-overlay absence, console health, and screenshot evidence.
- Mobile responsive layout and page-level overflow at 390 × 844.

## Final result

passed

---

# Design QA — Trade Tag Taxonomy Prototype

## Source and implementation

- Source visual truth: `/Users/justin/Downloads/Tag Modal.dc.html`.
- Normalized source render: `/private/tmp/tag-modal-reference.html` and `/private/tmp/tag-modal-reference-final.png`.
- Source-render note: the export references a missing `support.js`; the normalized render uses the export's exact initial-state markup, inline styles, dimensions, and tag order. Interaction behavior was mapped from the embedded component logic.
- Implementation: `http://127.0.0.1:4317/review/journal/tag-taxonomy`.
- Implementation captures: `/private/tmp/tag-modal-react-final.png`, `/private/tmp/tag-modal-react-mobile.png`, and `/private/tmp/tag-modal-react-mobile-menu-pass3.png`.
- Full-view comparison: `/private/tmp/tag-modal-full-comparison.png`.
- Focused modal comparison: `/private/tmp/tag-modal-focused-comparison.png`.

## Viewports and normalization

- Source and desktop implementation viewport: `620 × 560` CSS pixels.
- Source screenshot: `620 × 560` pixels at 1:1 density.
- Implementation screenshot: `620 × 560` pixels at 1:1 density.
- Source modal: `496 × 409.5` CSS pixels; implementation modal: `496 × 411.75` CSS pixels.
- Focused comparison: both modal crops normalized to `496 × 412` pixels.
- Mobile implementation viewport: `390 × 844`; document width and client width both `390px`.
- Compared state: modal open with Curl, Waited for trigger, and Stop respected selected.

## Full-view comparison evidence

The implementation matches the source's compact 496px stacked modal, warm paper surfaces, 15px radius, subtle border and shadow, four hairline-separated category rows, compact outline/filled chips, dashed More controls, and minimal footer. The app keeps its real dimmed Journal page behind the modal instead of the source export's beige component-preview canvas.

## Focused-region comparison evidence

The normalized modal crops confirm matching category spacing, 24px chip height, 6px chip gaps, selected-state weight, rule placement, footer alignment, and action sizing. The user-requested copy changes are intentional: `Pattern` replaces `Play`, and the Pattern overflow control says `More` instead of `More plays`.

## Fidelity surfaces

- Fonts and typography: Geist roles, weights, line heights, and compact label scale visually match the export.
- Spacing and layout rhythm: row height, 22px horizontal inset, 17px vertical category padding, footer spacing, and 496px frame match within rounding tolerance.
- Colors and tokens: the modal uses the source's warm neutral palette and amber link/focus accent; the surrounding Journal retains its app theme.
- Image quality and assets: the source contains no raster imagery, logos, illustrations, or non-standard assets requiring generation or substitution.
- Copy and content: source labels and ordering are preserved except for the approved Pattern and More terminology.

## Interaction proof

- Featured chips toggle correctly.
- Execution timing and stop-behavior selections replace conflicting choices.
- Emotion stops at two selections and disables additional choices.
- Every category exposes a More menu.
- Pattern More supports search and creation of a custom pattern.
- Save updates the trade classification; Cancel restores the last saved selection.
- Escape and outside-click dismissal remain available.
- No framework overlay or browser console warnings/errors were observed.

## Comparison history

### Pass 1 — narrow-screen menu overflow

- Finding: the Pattern menu was anchored to the More button and extended beyond the left edge at `390px`.
- Severity: P2 because search and several pattern choices were clipped.
- Fix: anchor the menu to the category row on narrow screens while preserving its source-like floating treatment.

### Pass 2 — post-fix evidence

- `/private/tmp/tag-modal-react-mobile-menu-pass3.png` shows the `266px` menu fully contained from `x=35` to `x=301`.
- The mobile document remains exactly `390px` wide with no page-level overflow.

## Findings

- P0: none.
- P1: none.
- P2: none remaining.
- P3: the export's beige preview canvas is intentionally replaced by the real dimmed Journal context.

## Final result

passed

---

# Design QA — Borderless Tan Available Tags

## Source and implementation

- Source visual truth: `/Users/justin/Desktop/screenshots/Screenshot 2026-07-22 at 1.28.28 PM.png` plus the explicit direction that available tags use a darker tan fill and selected tags reveal semantic color.
- Implementation: `http://127.0.0.1:4317/review/journal/tag-taxonomy`.
- Browser-rendered implementation capture: `/private/tmp/tag-taxonomy-tan-unselected-final.png`.
- Combined focused before/after comparison: `/private/tmp/tag-taxonomy-tan-before-after.png`.

## Viewport and normalization

- Source screenshot: `1270 × 1034` pixels.
- Implementation viewport and screenshot: `1280 × 720` CSS pixels at 1:1 density.
- Focused modal crops were normalized without changing aspect ratio: source `620 × 551`; implementation `620 × 553`; combined comparison `1280 × 593`.
- Compared state: Curl, Waited for trigger, Stop respected, Focused, and FOMO selected; Calm disabled.

## Full-view comparison evidence

The modal structure, spacing, typography, More controls, footer, and semantic selected colors remain unchanged. Available tag chips now use a shared warm-tan surface with a transparent border, so the selected green, teal, amber, and neutral states carry the visual emphasis.

## Focused-region comparison evidence

`/private/tmp/tag-taxonomy-tan-before-after.png` places the supplied screenshot and browser-rendered implementation together. The comparison confirms that black outline pills were removed from available tags, their icons were neutralized until selection, and chip height, label wrapping, row rhythm, and category grouping were preserved.

## Fidelity surfaces

- Fonts and typography: unchanged Geist scale, weight, and line height; chip labels remain compact and legible.
- Spacing and layout rhythm: chip height, padding, gaps, category dividers, and modal dimensions are unchanged.
- Colors and visual tokens: available tags use `#E9E1D4` with `#5F584E`; hover uses `#DDD3C2`; selected tags continue to use the established semantic palette.
- Image quality and assets: supplied SVG category/verdict icons remain crisp and aligned; no substitute assets were introduced.
- Copy and content: all labels and category names are unchanged.
- Accessibility and states: semantic icon shapes remain visible without color; disabled tags preserve the tan surface at reduced opacity; focus-visible outlines remain available for keyboard navigation.

## Primary interactions tested

- Selected Focused and FOMO and confirmed their teal/amber treatments replaced the shared tan availability treatment.
- Confirmed Calm became disabled at the Emotion selection limit.
- Confirmed selected, available, and disabled buttons have transparent borders and the expected computed background/text colors.
- Confirmed page identity, meaningful DOM content, framework-overlay absence, and zero browser console warnings/errors.

## Comparison history

### Pass 1 — post-change comparison

- P0: none.
- P1: none.
- P2: none.
- P3: the captured FOMO chip retains its browser focus-visible ring after interaction; this is an intentional accessibility state, not a persistent border treatment.

## Final result

passed

---

# Design QA — Fixed First-Position Add Control

## Source and implementation

- Source visual truth: `/private/tmp/tag-taxonomy-tan-unselected-final.png` plus the direction to keep the tag-library action first, label it `Add`, and remove the dotted outline/caret.
- Implementation: `http://127.0.0.1:4317/review/journal/tag-taxonomy`.
- Browser-rendered implementation capture: `/private/tmp/tag-taxonomy-add-first-aligned.png`.
- Open-menu capture: `/private/tmp/tag-taxonomy-add-first-menu.png`.
- Combined focused comparison: `/private/tmp/tag-taxonomy-add-first-comparison.png`.

## Viewport and normalization

- Source and implementation screenshots: `1280 × 720` CSS pixels at 1:1 density.
- Source and implementation modal crops: `497 × 443` pixels, each normalized to `620 × 553` without changing aspect ratio.
- Combined comparison: `1280 × 593` pixels.
- Compared state: Curl, Waited for trigger, Stop respected, Focused, and FOMO selected; Calm disabled.

## Full-view comparison evidence

Every category now begins with the same compact Add control at the same horizontal coordinate. The previous trailing/wrapping More controls, dotted borders, and carets are gone. Existing tag order, semantic selected states, category rhythm, and footer actions remain intact.

## Focused-region comparison evidence

`/private/tmp/tag-taxonomy-add-first-comparison.png` shows the prior trailing More treatment and the new fixed leading Add treatment in the same modal crop and state. The change removes action-position drift while preserving the modal dimensions and the existing wrap behavior for tag content.

## Fidelity surfaces

- Fonts and typography: Add uses the existing compact sans control role at 12px semibold; tag typography is unchanged.
- Spacing and layout rhythm: all Add controls resolve to `x = 415px` in the browser capture and occupy the first flex position; category spacing and chip gaps remain unchanged.
- Colors and visual tokens: Add uses the same warm-tan availability surface (`#E9E1D4`) with a darker neutral label and no visible border.
- Image quality and assets: no new image or icon assets were required; existing semantic SVG icons remain unchanged.
- Copy and content: `More` is replaced by `Add` in all four categories, with no caret or extra label.
- Accessibility and behavior: each Add button retains `aria-expanded`, `aria-haspopup="menu"`, and a focus-visible outline; the Pattern Add menu opens with search and the complete option list.

## Primary interactions tested

- Opened Pattern Add and confirmed search plus additional pattern choices rendered.
- Closed the menu and selected Focused plus FOMO to confirm selection limits and semantic states still work.
- Confirmed every Add control shares the same text, tan fill, transparent border, pill radius, and horizontal coordinate.
- Confirmed page identity, meaningful DOM content, framework-overlay absence, and zero browser console warnings/errors.

## Comparison history

### Pass 1 — fixed Add placement

- P0: none.
- P1: none.
- P2: none.
- P3: the compact width keeps Add visually quiet; if future copy localization expands the label, a fixed minimum width may be worth adding.

## Final result

passed

---

# Design QA — Inline Tag Classification

## Source and implementation

- Source visual truth: `/private/tmp/tag-taxonomy-add-first-aligned.png` plus the approved direction to replace the modal with a fixed Pattern / Execution / Risk / Emotion row, category dropdowns, and selected pills directly above the note.
- Implementation: `http://127.0.0.1:4317/review/journal/tag-taxonomy`.
- Browser-rendered implementation capture: `/private/tmp/tag-taxonomy-inline-closed.png`.
- Open-menu interaction capture: `/private/tmp/tag-taxonomy-inline-open.png`.
- Combined source/implementation comparison: `/private/tmp/tag-taxonomy-inline-comparison.jpg`.

## Viewport and normalization

- Source and implementation screenshots: `1280 × 720` CSS pixels at 1:1 density.
- Combined comparison: `2560 × 720` pixels, with the source at left and implementation at right; neither side was rescaled.
- Compared state: the source shows the former modal; the implementation shows the intentionally approved inline replacement with Chop, Anticipated, two Risk exceptions, and two Emotion tags selected.

## Full-view comparison evidence

The comparison confirms the deliberate structural change from a blocking modal to a compact, non-blocking classification row above the note. The implementation preserves the source's warm dropdown surface, semantic chip palette, supplied icon system, compact typography, and category order while removing the overlay, footer actions, and repeated category sections.

## Focused-region comparison evidence

The full viewport keeps the classification controls and note labels readable, so a separate crop was not needed. `/private/tmp/tag-taxonomy-inline-open.png` provides the focused interaction evidence: the Emotion dropdown aligns with its fixed category control, shows the question/helper copy, keeps selected semantic fills, and visibly disables additional choices at the two-tag limit.

## Fidelity surfaces

- Fonts and typography: the inline controls use the app's existing Geist hierarchy; mono is retained for the classification eyebrow and saved pills. Question, helper, and option weights remain legible at compact sizes.
- Spacing and layout rhythm: the fixed four-control row stays compact, selected pills sit immediately beneath it, and the note follows after one clear section break. The table and review column retain their existing alignment.
- Colors and visual tokens: app surfaces use canonical product tokens; the dropdown keeps the warm reference surface; Pattern remains neutral, Execution/Risk use reinforcing/review colors, and Emotion uses teal/amber sentiment colors.
- Image quality and assets: the supplied category/verdict SVG assets remain crisp at 13–14px. No substitute, emoji, or drawn-in-code asset was introduced.
- Copy and content: Pattern, Execution, Risk, and Emotion remain fixed labels. V1 choices match the ratified taxonomy, including `Chop` for consolidation/low-structure participation and `Anticipated` as distinct from `Early`.
- Accessibility and states: buttons expose menu state, options use radio/checkbox menu roles, Escape and outside click close the menu, focus-visible outlines remain available, semantic meaning uses both icon shape and color, and selection-limit states disable unavailable options.

## Primary interactions tested

- Replaced Curl with Chop and confirmed the Pattern menu closed after selection.
- Replaced Clean with Anticipated and confirmed Execution remained single-select.
- Selected Undersized plus Averaged down, confirmed the two-tag limit, then replaced Undersized with Oversized without losing Averaged down.
- Selected Focused plus FOMO and confirmed remaining Emotion choices became disabled.
- Confirmed selected pills update immediately while category controls stay fixed.
- Confirmed page identity, meaningful DOM content, no blocking overlay, and zero browser console warnings/errors.

## Comparison history

### Pass 1 — approved inline replacement

- P0: none.
- P1: none.
- P2: none.
- P3: the dropdown uses its own warm elevated surface against the canonical app background; this is intentional continuity with the source modal and can be revisited after the production component is wired.

## Final result

passed
