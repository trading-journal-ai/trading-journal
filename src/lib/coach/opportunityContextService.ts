/**
 * Server-side assembly for the opportunity-context calculator: loads cached
 * candles (fetching once if missing), builds one SessionAnatomy per traded
 * ticker-day, and computes per-trade context. The math itself stays pure in
 * opportunityContext.ts.
 */
import { getCandles } from "@/lib/candles";
import { MARKET_TZ, etDateString, zonedDateTimeToUtcMs } from "@/lib/time";
import {
  opportunityContextForTrade,
  sessionAnatomy,
  type SessionAnatomy,
  type TradeOpportunityContext,
} from "./opportunityContext";

export type OpportunityServiceTrade = {
  id: number;
  symbol: string;
  side: string;
  entryAt: number | null;
  exitAt: number | null;
  entryPrice: number | null;
  quantity: number;
  pnl: number | null;
  setup?: string | null;
  /** Epoch seconds of averaging-down adds (from executionAnalysis). */
  adverseAddTimes?: number[];
};

function etSeconds(date: string, time: string): number {
  return Math.round(zonedDateTimeToUtcMs(date, time, MARKET_TZ) / 1000);
}

export async function opportunityContextsForTrades(
  trades: OpportunityServiceTrade[],
): Promise<Map<number, TradeOpportunityContext>> {
  const anatomies = new Map<string, SessionAnatomy | null>();

  for (const trade of trades) {
    if (trade.entryAt == null) continue;
    const date = etDateString(trade.entryAt);
    const key = `${trade.symbol}|${date}`;
    if (anatomies.has(key)) continue;
    const { candles } = await getCandles(
      trade.symbol,
      etSeconds(date, "04:00:00"),
      etSeconds(date, "20:00:00"),
    );
    anatomies.set(key, candles.length > 0 ? sessionAnatomy(trade.symbol, date, candles) : null);
  }

  const contexts = new Map<number, TradeOpportunityContext>();
  for (const trade of trades) {
    const anatomy = trade.entryAt == null
      ? null
      : anatomies.get(`${trade.symbol}|${etDateString(trade.entryAt)}`) ?? null;
    contexts.set(
      trade.id,
      opportunityContextForTrade(anatomy, trade, { adverseAddTimes: trade.adverseAddTimes }),
    );
  }
  return contexts;
}
