import { fetchMassiveDay, fetchMassiveTickerEvents, type Candle } from "./massive";
import {
  marketDataSymbolForDate,
  marketDataSymbolFromEvents,
  type TickerChangeEvent,
} from "./symbolHistory";

export type CandleResolutionMethod = "direct" | "known_history" | "ticker_events";

export type ResolvedCandleDay = {
  attemptedSymbols: string[];
  bars: Candle[];
  historyError?: string;
  marketDataSymbol?: string;
  resolutionMethod?: CandleResolutionMethod;
};

type ResolutionDependencies = {
  fetchDay: (symbol: string, date: string) => Promise<Candle[]>;
  fetchTickerEvents: (symbol: string) => Promise<TickerChangeEvent[]>;
};

const defaultDependencies: ResolutionDependencies = {
  fetchDay: fetchMassiveDay,
  fetchTickerEvents: fetchMassiveTickerEvents,
};

/** Fetch a market day, retrying the point-in-time ticker when direct bars are empty. */
export async function fetchResolvedCandleDay(
  symbol: string,
  date: string,
  dependencies: ResolutionDependencies = defaultDependencies,
): Promise<ResolvedCandleDay> {
  const requestedSymbol = symbol.trim().toUpperCase();
  const knownSymbol = marketDataSymbolForDate(requestedSymbol, date);
  const attemptedSymbols = [knownSymbol];
  let bars = await dependencies.fetchDay(knownSymbol, date);
  let marketDataSymbol = knownSymbol;
  let resolutionMethod: CandleResolutionMethod = knownSymbol === requestedSymbol
    ? "direct"
    : "known_history";
  let historyError: string | undefined;

  if (bars.length === 0) {
    try {
      const events = await dependencies.fetchTickerEvents(requestedSymbol);
      const eventSymbol = marketDataSymbolFromEvents(date, events);
      if (eventSymbol && !attemptedSymbols.includes(eventSymbol)) {
        attemptedSymbols.push(eventSymbol);
        const eventBars = await dependencies.fetchDay(eventSymbol, date);
        if (eventBars.length > 0) {
          bars = eventBars;
          marketDataSymbol = eventSymbol;
          resolutionMethod = "ticker_events";
        }
      }
    } catch (error) {
      historyError = error instanceof Error ? error.message : "Ticker-history check failed.";
    }
  }

  if (bars.length === 0) {
    return { attemptedSymbols, bars, historyError };
  }
  return { attemptedSymbols, bars, marketDataSymbol, resolutionMethod };
}
