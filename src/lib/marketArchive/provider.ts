import { createMarketArchiveClient as createLocalClient, type MarketArchiveHealth } from './client';
import { loadArchiveCandles as loadLocalCandles, type ArchiveCandleResult } from './candles';
import { CORE_MOVER_RULE_VERSION } from './rules';
import type { ArchiveMoverAggregate, ArchiveUniverse, CandidateDayContext, CandidateSourceCoverage, ListMoversInput, ListMoversResult, MarketHistoryDay, TradingDaySummary } from './types';

export type MarketArchiveClient = {
  health(): Promise<MarketArchiveHealth>;
  getDay(date: string): Promise<MarketHistoryDay | null>;
  listMovers(input?: ListMoversInput): Promise<ListMoversResult>;
  listTradingDays(universe?: ArchiveUniverse): Promise<TradingDaySummary[]>;
  summarizeMovers(input?: ListMoversInput): Promise<ArchiveMoverAggregate>;
};

export class MarketHistoryUnavailableError extends Error {}

type Environment = Record<string, string | undefined>;
function provider(environment: Environment): 'local' | 'server' {
  const value = environment.MARKET_HISTORY_PROVIDER?.trim() || 'local';
  if (value !== 'local' && value !== 'server') throw new Error('Invalid market history provider configuration.');
  return value;
}
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function date(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function sourceCoverageValid(value: unknown): value is CandidateSourceCoverage {
  return record(value) && typeof value.scope === 'string' && typeof value.completeness === 'string'
    && Array.isArray(value.limitations) && value.limitations.every(item => typeof item === 'string');
}
function candidateContextValid(value: unknown): value is CandidateDayContext {
  if (!record(value) || !date(value.date) || !['complete','partial'].includes(String(value.state))
    || value.scope !== 'selected-candidates' || typeof value.publishedAt !== 'string'
    || typeof value.generatedAt !== 'string' || typeof value.calculationVersion !== 'string'
    || !record(value.discovery) || !record(value.sourceCoverage)) return false;
  const sourceCoverage = value.sourceCoverage;
  return ['discovery','groupedDaily','candidateMinutes','candidateReference']
    .every(key => sourceCoverageValid(sourceCoverage[key]));
}
function candidateHealthValid(value: unknown): boolean {
  if (!record(value) || typeof value.available !== 'boolean' || value.scope !== 'selected-candidates'
    || !Number.isInteger(value.days) || Number(value.days) < 0
    || !Number.isInteger(value.partialDays) || Number(value.partialDays) < 0
    || Number(value.partialDays) > Number(value.days)) return false;
  if (value.available) return date(value.firstDate) && date(value.lastDate) && Number(value.days) > 0;
  return value.firstDate === null && value.lastDate === null && value.days === 0 && value.partialDays === 0;
}
function responseValid(operation: string, value: unknown): boolean {
  if (operation === 'days') return Array.isArray(value) && value.every(row => record(row) && typeof row.date === 'string' && Number.isFinite(row.moverCount));
  if (!record(value)) return false;
  if (operation === 'health') return value.available === true && value.owner === 'trading-server'
    && value.coreRuleVersion === CORE_MOVER_RULE_VERSION && record(value.counts)
    && ['archiveDates','coreMovers','rawMoversExcludingSplits','sessionStats','symbolDays'].every(k => Number.isFinite((value.counts as Record<string,unknown>)[k]))
    && record(value.coverage) && typeof value.coverage.from === 'string' && typeof value.coverage.to === 'string'
    && (value.candidateContext === undefined || candidateHealthValid(value.candidateContext));
  if (operation === 'movers') return Number.isFinite(value.total) && Array.isArray(value.movers)
    && value.movers.every(row => record(row) && typeof row.symbol === 'string' && typeof row.date === 'string'
      && record(row.evidence) && Array.isArray(row.coreExclusionReasons)
      && (row.dataSource === undefined || ['massive-minute','massive-rest-candidates'].includes(String(row.dataSource))));
  if (operation === 'summary') return ['days','symbols','total','dollarVolume'].every(k=>Number.isFinite(value[k]));
  if (operation === 'day') return date(value.date) && record(value.massive)
    && typeof value.massive.available === 'boolean' && (value.massive.datasetId === null || typeof value.massive.datasetId === 'string')
    && (value.candidateContext === undefined || value.candidateContext === null || candidateContextValid(value.candidateContext))
    && record(value.dts) && typeof value.dts.available === 'boolean' && Array.isArray(value.research);
  if (operation === 'candles') return typeof value.symbol === 'string' && typeof value.date === 'string' && typeof value.cached === 'boolean'
    && Array.isArray(value.candles) && value.candles.every(row=>record(row)&&['t','o','h','l','c','vol'].every(k=>Number.isFinite(row[k])));
  return false;
}
async function fetchHistory(fetcher: typeof fetch, url: URL): Promise<Response> {
  const options: RequestInit = { cache: 'no-store', signal: AbortSignal.timeout(50_000) };
  try { return await fetcher(url, options); }
  catch (error) {
    // A server restart or an idle keep-alive socket may close between read
    // requests. Retry this idempotent read once; never retry a timeout or schema error.
    const cause = error instanceof Error ? error.cause : null;
    if (!record(cause) || !['UND_ERR_SOCKET', 'ECONNRESET'].includes(String(cause.code))) throw error;
    return fetcher(url, { ...options, headers: { Connection: 'close' } });
  }
}

export function createServerArchiveClient(environment: Environment = process.env, fetcher: typeof fetch = fetch) {
  const configured = environment.MARKET_HISTORY_SERVER_URL?.trim() || 'http://127.0.0.1:8787';
  const base = new URL(configured);
  if (base.protocol !== 'http:' || !['127.0.0.1','localhost','[::1]'].includes(base.hostname) || base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('Market history requires a local Trading Server URL.');
  }
  const requests = new Map<string, Promise<unknown>>();
  async function request<T>(operation: string,input: object = {}): Promise<T> {
    const key = `${operation}:${JSON.stringify(input)}`;
    if (!requests.has(key)) requests.set(key,(async()=>{
      const url = new URL(`/api/market-history/${operation}`,base);
      if (operation === 'day' && 'date' in input && typeof input.date === 'string') url.searchParams.set('date',input.date);
      else url.searchParams.set('input',JSON.stringify(input));
      const response = await fetchHistory(fetcher,url);
      if (!response.ok) throw new Error('Trading Server market history is unavailable.');
      const body: unknown = await response.json();
      if (!record(body) || body.apiVersion !== 1 || !responseValid(operation,body.data)) throw new Error('Invalid Trading Server market history response.');
      return body.data;
    })());
    try { return await requests.get(key) as T; }
    catch { throw new MarketHistoryUnavailableError('Trading Server market history is unavailable.'); }
  }
  return {
    async health(): Promise<MarketArchiveHealth> {
      try { return await request<MarketArchiveHealth>('health'); }
      catch { return {available:false,coreRuleVersion:CORE_MOVER_RULE_VERSION,reason:'server_unavailable'}; }
    },
    getDay: (date: string) => request<MarketHistoryDay>('day',{date}),
    listMovers: (input: ListMoversInput = {}) => request<ListMoversResult>('movers',input),
    listTradingDays: (universe: ArchiveUniverse = 'core') => request<TradingDaySummary[]>('days',{universe}),
    summarizeMovers: (input: ListMoversInput = {}) => request<ArchiveMoverAggregate>('summary',input),
    candles: (input: {date:string;symbol:string}) => request<Omit<ArchiveCandleResult,'sourceFile'>>('candles',input),
  };
}
export function createMarketArchiveClient(environment: Environment = process.env): MarketArchiveClient {
  if (provider(environment) === 'server') return createServerArchiveClient(environment);
  const local = createLocalClient();
  return {
    health:async()=>local.health(),
    getDay:async()=>null,
    listMovers:async(input)=>local.listMovers(input),
    listTradingDays:async(universe)=>local.listTradingDays(universe),
    summarizeMovers:async(input)=>local.summarizeMovers(input),
  };
}
export async function loadArchiveCandles(input: {date:string;symbol:string},environment: Environment = process.env) {
  return provider(environment) === 'server' ? createServerArchiveClient(environment).candles(input) : loadLocalCandles(input);
}
