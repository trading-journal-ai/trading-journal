type HistoricalTicker = {
  /** First market date on which the journal/current symbol became effective. */
  currentSymbolFrom: string;
  /** Ticker Massive expects for dates before currentSymbolFrom. */
  previousSymbol: string;
};

export type TickerChangeEvent = {
  date: string;
  ticker: string;
};

/**
 * Point-in-time ticker changes that broker exports may rewrite to the current
 * symbol. Keep this registry intentionally explicit: trade identity remains
 * unchanged while market-data requests use the ticker valid on that date.
 */
const HISTORICAL_TICKERS: Record<string, HistoricalTicker> = {
  // Faeth Therapeutics changed from SNSE to FTH effective 2026-06-16.
  FTH: { currentSymbolFrom: "2026-06-16", previousSymbol: "SNSE" },
};

export function marketDataSymbolForDate(symbol: string, marketDate: string): string {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const history = HISTORICAL_TICKERS[normalizedSymbol];
  if (history && marketDate < history.currentSymbolFrom) {
    return history.previousSymbol;
  }
  return normalizedSymbol;
}

/** Resolve the ticker that was effective on marketDate from a provider timeline. */
export function marketDataSymbolFromEvents(
  marketDate: string,
  events: TickerChangeEvent[],
): string | null {
  let bestMatch: TickerChangeEvent | null = null;
  for (const event of events) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || event.date > marketDate) continue;
    if (!bestMatch || event.date > bestMatch.date) bestMatch = event;
  }
  return bestMatch?.ticker.trim().toUpperCase() || null;
}
