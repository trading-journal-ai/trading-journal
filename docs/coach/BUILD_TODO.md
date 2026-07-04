# Coach Build Todo

> Status: working list · Last updated: 2026-07-03

This is the working to-do list for the coach build so ideas do not get lost
while the product direction is still moving. It should stay practical: what we
are working on now, what comes next, and what is intentionally later.

## Current Focus

Build the coach context layer before asking the model to judge trades:

- Capture the trader's own context: notes, daily recap, self-assessment, rules,
  setup intent, and selected chart screenshots.
- Capture the chart facts the coach needs: candles, fills, levels, VWAP, EMA
  9/20/200, and volume context.
- Keep the deterministic engine responsible for facts and indicators.
- Keep the model responsible for narrative, synthesis, caveats, and one
  experiment.

## Now

### AI Coach Chat Preview

Add a standalone AI Coach chat surface for the demo.

First version:

- Add an **AI Coach** tab or preview route.
- Let the trader chat with the coach without first generating a structured
  daily review.
- Seed the surface with reset prompts such as "I'm spiraling", "Talk me through
  today", "Help me stop trading", and "What should I review before tomorrow?"
- Use text chat as the primary coach experience.
- Add dictation to the coach composer so the trader can speak into the reset
  flow instead of typing while tilted; the transcript sends to the coach as
  text.
- Keep the coach grounded in completed-trade context and user-authored notes
  where available.
- Keep the guardrail explicit: no live trade calls, entries, exits, alerts, or
  position instructions.

Demo boundary:

- This can be a preview surface before it becomes a durable journal object.
- It should feel like a calm place to reset, debrief, or close the day, not a
  command center for live trading.

Persistence later:

- If coach chat proves useful, save each chat as a **coach session** attached to
  the trading date.
- A coach session is related to the day but distinct from the daily recap and
  trade notes.
- It can support the "personal journal inside the trading journal" direction
  without forcing every chat into the structured recap format.

Conversation architecture:

- The coach brain stays with the configured LLM provider.
- Speech-to-text can start with browser dictation and later use Whisper or
  another local transcription path.
- Read-aloud is out of scope for the demo. Local playback proved the path is
  possible, but latency made it worse than text for the coach reset flow.
- Keep responses concise enough to scan quickly while the trader is dysregulated.

### Trade Screenshot Upload

Add image upload to the trade detail chart area.

First version:

- Add an **Add screenshot** action near the trade chart.
- Allow one or more images per trade.
- Store images through the existing `attachments` table and local upload path.
- Show uploaded screenshots below or beside the trade chart.
- Support a short caption, such as "1m entry", "5m context", "daily levels",
  or "TradingView marked levels".
- Keep this manual and simple; no image understanding in v1.

Why trade detail first:

- It is the most obvious place when the user is drilling into a specific trade.
- The screenshot can sit next to fills, notes, and the setup label.
- It creates the user habit before we add level extraction.

Open UI question:

- Should the screenshot strip live directly under the chart, or in the right
  rail near notes and setup context?

### Coach Workbench List

Add a simple internal workbench/checklist surface in docs or Settings planning:

- AI model connected.
- Self-assessment current.
- Rules drafted.
- Setup playbook drafted.
- Trade screenshot upload available.
- AI Coach chat preview available.
- Indicator series computed.
- Level-map capture available.
- Daily coach prep available.
- Coach payload snapshot generated.
- Live model call enabled.

This is not gamification. It is wayfinding for the build and eventually for the
user's setup state.

## Next

### Multi-Timeframe Level Screenshots

Extend screenshots from trade-level evidence to ticker/day context.

Target flow:

- On ticker/day review, support uploading multiple TradingView screenshots for
  one symbol and date.
- Each screenshot should record timeframe, such as 1m, 5m, daily, 4h, weekly,
  monthly, or yearly.
- Capture what the user has already marked: support, resistance, supply/demand
  zones, pivot points, descending resistance, ascending support, trendlines, and
  key role-flip levels.
- Treat screenshots as visual evidence first.
- Later, use vision extraction only to transcribe marked levels into draft
  records for user confirmation.

Important guardrail:

- The coach should never invent or override the trader's marked levels. The
  screenshot extraction path creates drafts; the trader confirms the level map.

### Level Records

Turn confirmed screenshot context into structured level records.

Needed fields:

- Symbol and session date.
- Timeframe.
- Price or zone range.
- Kind: support, resistance, supply, demand, pivot, trendline, VWAP, other.
- Source: calculated or user-marked.
- Screenshot attachment reference.
- Confidence/status: draft, confirmed, ignored.

### Indicator Series

Compute indicator data from stored OHLCV in app code.

First indicators:

- EMA 9.
- EMA 20.
- EMA 200, using daily candles when available and intraday approximation only
  with a clear caveat.
- VWAP.
- Anchored VWAP / NVWAP only after the exact definition is chosen.
- Session volume aggregates.

Rules:

- The chart library renders indicators; it does not own the values.
- The same computed values should feed chart overlays, setup predicates, and
  coach fact packs.
- If an indicator cannot be computed from available candles, the coach should
  say it is missing instead of guessing.

### Daily Coach Prep

Build the daily prep flow before live AI review:

- Show deterministic starter read.
- Highlight key trades worth annotation.
- Ask for daily context and selected-trade context.
- Pull in trade screenshots and ticker/day level screenshots as evidence.
- Generate a payload snapshot even while the model call is stubbed.

## Later

### Vision-Assisted Level Extraction

After screenshot upload is stable:

- Extract visible marked levels from TradingView screenshots.
- Ask the trader to confirm or correct each extracted level.
- Persist confirmed levels as user-marked records.
- Keep screenshots attached as the visual source of truth.

This is transcription, not chart judgment.

### In-App Level Drawing

Eventually support drawing levels directly on the ticker/day chart:

- Horizontal levels and zones.
- Trendlines.
- Labels and timeframe tags.
- Convert drawings into the same level-record format as screenshot extraction.

This comes after screenshot capture because the trader already charts in
TradingView today.

### Coach Review

Wire the live model after:

- Playbook/rules/assessment context exists.
- Screenshot upload exists.
- Indicator series exists.
- Level-map capture has at least a manual path.
- Payload snapshots can be reviewed in evals.

## Not Now

- Chart-image pattern grading.
- Letting the model decide whether a setup existed from screenshots alone.
- Automatic level extraction without user confirmation.
- Mandatory screenshots for every trade.
- In-app drawing before screenshot upload.
- Live coaching or trade calls.
