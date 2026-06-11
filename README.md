# Trading Journal

A personal, local-first web app for logging stock/ETF trades, reviewing them
reflectively, and tracking performance over time.

Built for single-user, private use. Data lives locally in SQLite.

## Status

Early design. See [DESIGN.md](DESIGN.md) for the full plan, scope, and phasing.

## Planned stack

- Next.js (App Router) + React + TypeScript
- Local-first SQLite

## Data pipeline (current plan)

Two manual CSV inputs feed the journal:

- **Executions (your trades)** — exported from **DAS Trader** (or **ThinkorSwim**)
  at the fill level. Grouped into round-trip trades via FIFO matching.
- **Candles (for the chart)** — exported from **TradingView** ("Export chart
  data"). ⚠️ Default export is regular-hours only; pre-market needs an
  extended-hours export. Automating this (Schwab price-history API) is a later
  upgrade.

A working **trade-chart prototype** already exists at
`~/Desktop/trade_chart (10).html` — candlesticks + entry/exit markers + SVG
export, with a reusable DAS parser. We adapt it rather than rebuild. See
[DESIGN.md §8](DESIGN.md) for the full asset index.

## Phases

Scaffold → execution/trade model + FIFO matching → DAS/TOS import → trade chart
→ analytics → journaling → screenshots → automated candle/sync.

## Getting started

_Scaffold not yet created — coming in Phase 0._
