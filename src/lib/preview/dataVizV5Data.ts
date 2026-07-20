import {
  rxtContextCandles,
  rxtContextTrades,
  sessionPoints,
  type MarketContextCandle,
  type MarketContextTrade,
} from "@/lib/preview/dataVizPrototypeData";

export type ScannerMoment = {
  minute: number;
  label: string;
  changePct: number;
  volume: number;
  relativeVolume: number | null;
};

export type ScannerResponseCandle = {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ScannerResponseCandidate = {
  id: string;
  symbol: string;
  alertTime: string;
  alertPrice: number;
  moveAtAlertPct: number;
  relativeVolume: number;
  catalyst: string;
  setupState: "formed" | "failed" | "never-formed";
  decision: "patient" | "chased" | "no-trade";
  pullbackStartMinute: number | null;
  pullbackEndMinute: number | null;
  triggerMinute: number | null;
  triggerPrice: number | null;
  entryMinute: number | null;
  entryPrice: number | null;
  pnl: number | null;
  maxMovePct: number;
  pullbackCandles: number;
  pullbackVolumeChangePct: number | null;
  triggerVolumeMultiple: number | null;
  read: string;
  candles: ScannerResponseCandle[];
};

export type V5Trade = MarketContextTrade & {
  symbol: string;
  date: string;
  side: "long";
  scannerMinute: number;
  scannerLabel: string;
};

export type OpportunityDay = {
  date: string;
  day: number;
  weekday: "MON" | "TUE" | "WED" | "THU" | "FRI";
  opportunityPct: number | null;
  pnl: number | null;
  trades: number | null;
  coverage: "captured" | "no-opportunity" | "no-trades" | "no-coverage";
};

export type PillarState = "pass" | "watch" | "fail" | "unknown";

export type OpportunityCandidate = {
  rank: number;
  symbol: string;
  firstSeen: string;
  price: number;
  floatMillions: number | null;
  relativeVolume: number | null;
  dayChangePct: number;
  catalyst: string;
  catalystState: PillarState;
  profile: "A+ candidate" | "Watchable" | "Avoid / low quality";
  leadership: "Emerging" | "Dominant" | "Fading";
  disposition: "Traded" | "Missed" | "Avoided" | "False opportunity";
  postAlert5mPct: number;
  postAlert15mPct: number;
  endOfDayPct: number;
  postAlertPath: Array<{ minute: number; movePct: number }>;
  pnl: number | null;
  selectionNote: string;
};

export const v5Candles: MarketContextCandle[] = rxtContextCandles;

export const scannerMoments: ScannerMoment[] = [
  { minute: 30, label: "Breakout / first +10%", changePct: 10.2, volume: 6_566_351, relativeVolume: null },
  { minute: 74.52, label: "Trend reclaim", changePct: 16.8, volume: 3_300_690, relativeVolume: null },
  { minute: 147.9, label: "High retest", changePct: 35.7, volume: 3_825_751, relativeVolume: null },
  { minute: 233.62, label: "Late expansion", changePct: 54.5, volume: 3_715_198, relativeVolume: null },
  { minute: 324.8, label: "Second push", changePct: 40.4, volume: 2_063_807, relativeVolume: null },
  { minute: 375, label: "Close extension", changePct: 49.2, volume: 3_323_221, relativeVolume: null },
];

// Illustrative one-minute scanner episodes. They deliberately include a clean
// setup, a failed alert, a chase, and a valid setup that failed so the visual
// vocabulary does not imply that every scanner pop becomes a trade or a win.
export const scannerResponseCandidates: ScannerResponseCandidate[] = [
  {
    id: "rxt-0941",
    symbol: "RXT",
    alertTime: "09:41",
    alertPrice: 4.32,
    moveAtAlertPct: 18.6,
    relativeVolume: 8.2,
    catalyst: "Fresh contract news",
    setupState: "formed",
    decision: "patient",
    pullbackStartMinute: 2,
    pullbackEndMinute: 4,
    triggerMinute: 5,
    triggerPrice: 4.49,
    entryMinute: 5,
    entryPrice: 4.51,
    pnl: 87,
    maxMovePct: 31.4,
    pullbackCandles: 3,
    pullbackVolumeChangePct: -57,
    triggerVolumeMultiple: 1.9,
    read: "You waited through a three-candle pullback. Volume contracted, the higher low held, and entry followed the first one-minute high break with renewed volume.",
    candles: [
      { minute: -5, open: 4.10, high: 4.13, low: 4.08, close: 4.11, volume: 92000 },
      { minute: -4, open: 4.11, high: 4.14, low: 4.10, close: 4.12, volume: 81000 },
      { minute: -3, open: 4.12, high: 4.14, low: 4.09, close: 4.10, volume: 87000 },
      { minute: -2, open: 4.10, high: 4.13, low: 4.09, close: 4.12, volume: 76000 },
      { minute: -1, open: 4.12, high: 4.16, low: 4.11, close: 4.15, volume: 118000 },
      { minute: 0, open: 4.15, high: 4.36, low: 4.14, close: 4.32, volume: 740000 },
      { minute: 1, open: 4.32, high: 4.58, low: 4.30, close: 4.52, volume: 1200000 },
      { minute: 2, open: 4.52, high: 4.55, low: 4.43, close: 4.46, volume: 620000 },
      { minute: 3, open: 4.46, high: 4.49, low: 4.38, close: 4.42, volume: 450000 },
      { minute: 4, open: 4.42, high: 4.48, low: 4.40, close: 4.45, volume: 390000 },
      { minute: 5, open: 4.45, high: 4.59, low: 4.44, close: 4.56, volume: 820000 },
      { minute: 6, open: 4.56, high: 4.72, low: 4.53, close: 4.69, volume: 980000 },
      { minute: 7, open: 4.69, high: 4.82, low: 4.66, close: 4.78, volume: 870000 },
      { minute: 8, open: 4.78, high: 4.85, low: 4.70, close: 4.74, volume: 650000 },
      { minute: 9, open: 4.74, high: 4.89, low: 4.72, close: 4.86, volume: 760000 },
      { minute: 10, open: 4.86, high: 4.91, low: 4.79, close: 4.83, volume: 540000 },
    ],
  },
  {
    id: "lcfy-0947",
    symbol: "LCFY",
    alertTime: "09:47",
    alertPrice: 2.29,
    moveAtAlertPct: 12.4,
    relativeVolume: 5.9,
    catalyst: "No-news momentum",
    setupState: "never-formed",
    decision: "no-trade",
    pullbackStartMinute: 1,
    pullbackEndMinute: 3,
    triggerMinute: null,
    triggerPrice: null,
    entryMinute: null,
    entryPrice: null,
    pnl: null,
    maxMovePct: 19.7,
    pullbackCandles: 3,
    pullbackVolumeChangePct: 22,
    triggerVolumeMultiple: null,
    read: "The pop never built a controlled pullback. Red volume stayed elevated, the alert price failed, and no one-minute high-break trigger formed. Passing was the disciplined response.",
    candles: [
      { minute: -5, open: 2.02, high: 2.04, low: 2.01, close: 2.03, volume: 44000 },
      { minute: -4, open: 2.03, high: 2.05, low: 2.02, close: 2.04, volume: 39000 },
      { minute: -3, open: 2.04, high: 2.05, low: 2.02, close: 2.03, volume: 42000 },
      { minute: -2, open: 2.03, high: 2.06, low: 2.02, close: 2.05, volume: 51000 },
      { minute: -1, open: 2.05, high: 2.08, low: 2.04, close: 2.07, volume: 68000 },
      { minute: 0, open: 2.07, high: 2.36, low: 2.06, close: 2.29, volume: 680000 },
      { minute: 1, open: 2.29, high: 2.47, low: 2.24, close: 2.31, volume: 910000 },
      { minute: 2, open: 2.31, high: 2.33, low: 2.13, close: 2.17, volume: 840000 },
      { minute: 3, open: 2.17, high: 2.20, low: 2.02, close: 2.06, volume: 830000 },
      { minute: 4, open: 2.06, high: 2.13, low: 1.99, close: 2.02, volume: 610000 },
      { minute: 5, open: 2.02, high: 2.10, low: 1.98, close: 2.08, volume: 430000 },
      { minute: 6, open: 2.08, high: 2.12, low: 2.01, close: 2.04, volume: 350000 },
      { minute: 7, open: 2.04, high: 2.08, low: 1.97, close: 2.00, volume: 320000 },
      { minute: 8, open: 2.00, high: 2.04, low: 1.94, close: 1.98, volume: 290000 },
      { minute: 9, open: 1.98, high: 2.03, low: 1.96, close: 2.01, volume: 240000 },
      { minute: 10, open: 2.01, high: 2.05, low: 1.98, close: 2.00, volume: 210000 },
    ],
  },
  {
    id: "zapp-1002",
    symbol: "ZAPP",
    alertTime: "10:02",
    alertPrice: 6.12,
    moveAtAlertPct: 21.8,
    relativeVolume: 11.7,
    catalyst: "Fresh financing news",
    setupState: "never-formed",
    decision: "chased",
    pullbackStartMinute: 3,
    pullbackEndMinute: 5,
    triggerMinute: null,
    triggerPrice: null,
    entryMinute: 2,
    entryPrice: 6.72,
    pnl: -140,
    maxMovePct: 36.2,
    pullbackCandles: 0,
    pullbackVolumeChangePct: null,
    triggerVolumeMultiple: null,
    read: "You entered during the third expansion candle, before any pullback or one-minute high-break setup existed. The entry was 9.8% above the alert price and the first real pullback arrived after you were already in.",
    candles: [
      { minute: -5, open: 5.01, high: 5.05, low: 4.99, close: 5.03, volume: 61000 },
      { minute: -4, open: 5.03, high: 5.07, low: 5.01, close: 5.05, volume: 55000 },
      { minute: -3, open: 5.05, high: 5.08, low: 5.02, close: 5.04, volume: 58000 },
      { minute: -2, open: 5.04, high: 5.10, low: 5.03, close: 5.08, volume: 72000 },
      { minute: -1, open: 5.08, high: 5.13, low: 5.07, close: 5.11, volume: 89000 },
      { minute: 0, open: 5.11, high: 6.18, low: 5.10, close: 6.12, volume: 1100000 },
      { minute: 1, open: 6.12, high: 6.51, low: 6.08, close: 6.46, volume: 1480000 },
      { minute: 2, open: 6.46, high: 6.84, low: 6.39, close: 6.76, volume: 1710000 },
      { minute: 3, open: 6.76, high: 6.79, low: 6.31, close: 6.38, volume: 1560000 },
      { minute: 4, open: 6.38, high: 6.44, low: 6.08, close: 6.17, volume: 1190000 },
      { minute: 5, open: 6.17, high: 6.29, low: 5.96, close: 6.04, volume: 920000 },
      { minute: 6, open: 6.04, high: 6.22, low: 5.98, close: 6.16, volume: 690000 },
      { minute: 7, open: 6.16, high: 6.25, low: 6.02, close: 6.08, volume: 540000 },
      { minute: 8, open: 6.08, high: 6.19, low: 5.94, close: 6.01, volume: 510000 },
      { minute: 9, open: 6.01, high: 6.13, low: 5.88, close: 5.97, volume: 470000 },
      { minute: 10, open: 5.97, high: 6.08, low: 5.91, close: 6.03, volume: 390000 },
    ],
  },
  {
    id: "tcbp-1019",
    symbol: "TCBP",
    alertTime: "10:19",
    alertPrice: 3.48,
    moveAtAlertPct: 15.1,
    relativeVolume: 7.4,
    catalyst: "Positive trial update",
    setupState: "failed",
    decision: "patient",
    pullbackStartMinute: 2,
    pullbackEndMinute: 3,
    triggerMinute: 4,
    triggerPrice: 3.66,
    entryMinute: 4,
    entryPrice: 3.68,
    pnl: -48,
    maxMovePct: 23.8,
    pullbackCandles: 2,
    pullbackVolumeChangePct: -49,
    triggerVolumeMultiple: 1.6,
    read: "A two-candle pullback contracted on volume and produced a legitimate high-break trigger. You waited and entered near the decision point; the continuation then failed. Good process and a losing outcome can coexist.",
    candles: [
      { minute: -5, open: 3.00, high: 3.03, low: 2.99, close: 3.01, volume: 52000 },
      { minute: -4, open: 3.01, high: 3.04, low: 3.00, close: 3.02, volume: 47000 },
      { minute: -3, open: 3.02, high: 3.04, low: 3.00, close: 3.01, volume: 49000 },
      { minute: -2, open: 3.01, high: 3.05, low: 3.00, close: 3.03, volume: 61000 },
      { minute: -1, open: 3.03, high: 3.08, low: 3.02, close: 3.07, volume: 82000 },
      { minute: 0, open: 3.07, high: 3.52, low: 3.06, close: 3.48, volume: 790000 },
      { minute: 1, open: 3.48, high: 3.71, low: 3.44, close: 3.66, volume: 940000 },
      { minute: 2, open: 3.66, high: 3.68, low: 3.55, close: 3.59, volume: 520000 },
      { minute: 3, open: 3.59, high: 3.64, low: 3.54, close: 3.61, volume: 430000 },
      { minute: 4, open: 3.61, high: 3.73, low: 3.60, close: 3.69, volume: 690000 },
      { minute: 5, open: 3.69, high: 3.74, low: 3.62, close: 3.65, volume: 610000 },
      { minute: 6, open: 3.65, high: 3.67, low: 3.51, close: 3.54, volume: 720000 },
      { minute: 7, open: 3.54, high: 3.56, low: 3.40, close: 3.43, volume: 810000 },
      { minute: 8, open: 3.43, high: 3.48, low: 3.35, close: 3.39, volume: 680000 },
      { minute: 9, open: 3.39, high: 3.44, low: 3.33, close: 3.37, volume: 510000 },
      { minute: 10, open: 3.37, high: 3.45, low: 3.35, close: 3.42, volume: 420000 },
    ],
  },
];

const scannerByTradeId: Record<number, Pick<V5Trade, "scannerMinute" | "scannerLabel">> = {
  17254: { scannerMinute: 74.52, scannerLabel: "Trend reclaim" },
  17263: { scannerMinute: 147.9, scannerLabel: "High retest" },
  3501: { scannerMinute: 233.62, scannerLabel: "Late expansion" },
  3502: { scannerMinute: 324.8, scannerLabel: "Second push" },
  3504: { scannerMinute: 375, scannerLabel: "Close extension" },
};

const selectedTradeIds = new Set(Object.keys(scannerByTradeId).map(Number));

export const v5Trades: V5Trade[] = rxtContextTrades
  .filter((trade) => selectedTradeIds.has(trade.id))
  .map((trade) => ({
    ...trade,
    symbol: "RXT",
    date: "2026-05-08",
    side: "long",
    ...scannerByTradeId[trade.id],
  }));

const sessionByDay = new Map(sessionPoints.map((session) => [Number(session.label), session]));

const opportunityInput: Array<
  Pick<OpportunityDay, "day" | "weekday" | "opportunityPct" | "coverage">
> = [
  { day: 1, weekday: "WED", opportunityPct: 28, coverage: "captured" },
  { day: 2, weekday: "THU", opportunityPct: 22, coverage: "captured" },
  { day: 3, weekday: "FRI", opportunityPct: 31, coverage: "captured" },
  { day: 6, weekday: "MON", opportunityPct: null, coverage: "no-opportunity" },
  { day: 7, weekday: "TUE", opportunityPct: 25, coverage: "captured" },
  { day: 8, weekday: "WED", opportunityPct: 36, coverage: "captured" },
  { day: 9, weekday: "THU", opportunityPct: 32, coverage: "captured" },
  { day: 10, weekday: "FRI", opportunityPct: 41, coverage: "captured" },
  { day: 13, weekday: "MON", opportunityPct: 27, coverage: "captured" },
  { day: 14, weekday: "TUE", opportunityPct: 33, coverage: "captured" },
  { day: 15, weekday: "WED", opportunityPct: null, coverage: "no-coverage" },
  { day: 16, weekday: "THU", opportunityPct: 24, coverage: "captured" },
  { day: 17, weekday: "FRI", opportunityPct: 29, coverage: "captured" },
  { day: 20, weekday: "MON", opportunityPct: 18, coverage: "no-trades" },
  { day: 21, weekday: "TUE", opportunityPct: 34, coverage: "no-trades" },
  { day: 22, weekday: "WED", opportunityPct: null, coverage: "no-coverage" },
  { day: 23, weekday: "THU", opportunityPct: 21, coverage: "no-trades" },
  { day: 24, weekday: "FRI", opportunityPct: 26, coverage: "no-trades" },
  { day: 27, weekday: "MON", opportunityPct: 13, coverage: "no-trades" },
  { day: 28, weekday: "TUE", opportunityPct: 38, coverage: "no-trades" },
  { day: 29, weekday: "WED", opportunityPct: 17, coverage: "no-trades" },
  { day: 30, weekday: "THU", opportunityPct: 22, coverage: "no-trades" },
  { day: 31, weekday: "FRI", opportunityPct: null, coverage: "no-coverage" },
];

export const opportunityDays: OpportunityDay[] = opportunityInput.map((day) => {
  const session = sessionByDay.get(day.day);
  return {
    ...day,
    date: `2026-07-${String(day.day).padStart(2, "0")}`,
    pnl: day.coverage === "captured" ? (session?.pnl ?? 0) : day.coverage === "no-trades" ? 0 : null,
    trades: day.coverage === "captured" ? (session?.trades ?? 0) : day.coverage === "no-trades" ? 0 : null,
  };
});

// Deliberately illustrative: this is the ideal daily-review contract, not a
// claim about a historical scanner session. The production view should freeze
// these inputs at the first qualifying scanner event and keep provenance.
export const opportunityCandidates: OpportunityCandidate[] = [
  {
    rank: 2,
    symbol: "MLGO",
    firstSeen: "09:36",
    price: 7.8,
    floatMillions: 3.1,
    relativeVolume: 12.4,
    dayChangePct: 31.2,
    catalyst: "No-news momentum",
    catalystState: "watch",
    profile: "A+ candidate",
    leadership: "Dominant",
    disposition: "Missed",
    postAlert5mPct: 9.4,
    postAlert15mPct: 28.1,
    endOfDayPct: 44.2,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 3, movePct: 5.2 }, { minute: 5, movePct: 9.4 },
      { minute: 9, movePct: 18.6 }, { minute: 15, movePct: 28.1 }, { minute: 26, movePct: 21.2 },
      { minute: 43, movePct: 27 }, { minute: 72, movePct: 46.8 }, { minute: 110, movePct: 41.5 },
      { minute: 180, movePct: 36 }, { minute: 384, movePct: 44.2 },
    ],
    pnl: null,
    selectionNote: "The strongest post-alert expansion came from a qualified name you did not trade.",
  },
  {
    rank: 1,
    symbol: "RXT",
    firstSeen: "09:41",
    price: 4.84,
    floatMillions: 7.4,
    relativeVolume: 8.2,
    dayChangePct: 18.6,
    catalyst: "Fresh contract news",
    catalystState: "pass",
    profile: "A+ candidate",
    leadership: "Dominant",
    disposition: "Traded",
    postAlert5mPct: 7.8,
    postAlert15mPct: 21.4,
    endOfDayPct: 31.6,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 3, movePct: 4 }, { minute: 5, movePct: 7.8 },
      { minute: 9, movePct: 13.2 }, { minute: 15, movePct: 21.4 }, { minute: 27, movePct: 15.6 },
      { minute: 46, movePct: 19.7 }, { minute: 78, movePct: 29.8 }, { minute: 110, movePct: 38.4 },
      { minute: 180, movePct: 34 }, { minute: 379, movePct: 31.6 },
    ],
    pnl: 310,
    selectionNote: "You selected one of the day’s two strongest candidates and traded with the leading move.",
  },
  {
    rank: 3,
    symbol: "RGTI",
    firstSeen: "09:52",
    price: 6.2,
    floatMillions: 40.2,
    relativeVolume: 9.1,
    dayChangePct: 24.4,
    catalyst: "Sector sympathy",
    catalystState: "watch",
    profile: "Watchable",
    leadership: "Emerging",
    disposition: "Missed",
    postAlert5mPct: 6.2,
    postAlert15mPct: 17.8,
    endOfDayPct: 32.9,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 5, movePct: 6.2 }, { minute: 10, movePct: 12.9 },
      { minute: 15, movePct: 17.8 }, { minute: 28, movePct: 10.4 }, { minute: 51, movePct: 18.9 },
      { minute: 95, movePct: 34.6 }, { minute: 160, movePct: 27.5 }, { minute: 368, movePct: 32.9 },
    ],
    pnl: null,
    selectionNote: "The move worked, but float failed the preferred filter and the catalyst was indirect.",
  },
  {
    rank: 5,
    symbol: "VERO",
    firstSeen: "10:03",
    price: 5.15,
    floatMillions: 4.8,
    relativeVolume: 2.8,
    dayChangePct: 10.8,
    catalyst: "Prior-day continuation",
    catalystState: "watch",
    profile: "Watchable",
    leadership: "Fading",
    disposition: "Traded",
    postAlert5mPct: 3.6,
    postAlert15mPct: 11.9,
    endOfDayPct: 19.7,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 5, movePct: 3.6 }, { minute: 10, movePct: 8.2 },
      { minute: 15, movePct: 11.9 }, { minute: 29, movePct: 4.8 }, { minute: 55, movePct: 13.5 },
      { minute: 120, movePct: 20.2 }, { minute: 357, movePct: 19.7 },
    ],
    pnl: -101,
    selectionNote: "You traded a fading continuation with weak relative volume while stronger names remained active.",
  },
  {
    rank: 4,
    symbol: "VSEE",
    firstSeen: "10:18",
    price: 14.2,
    floatMillions: 12.8,
    relativeVolume: 6.1,
    dayChangePct: 14.5,
    catalyst: "Fresh earnings update",
    catalystState: "pass",
    profile: "Watchable",
    leadership: "Emerging",
    disposition: "Avoided",
    postAlert5mPct: 2.1,
    postAlert15mPct: 5.4,
    endOfDayPct: 8.9,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 5, movePct: 2.1 }, { minute: 15, movePct: 5.4 },
      { minute: 26, movePct: -0.6 }, { minute: 60, movePct: 4.2 }, { minute: 105, movePct: 10.4 },
      { minute: 342, movePct: 8.9 },
    ],
    pnl: null,
    selectionNote: "The ticker had attention, but float was above the preferred range and follow-through stayed limited.",
  },
  {
    rank: 7,
    symbol: "SOUN",
    firstSeen: "10:27",
    price: 22.6,
    floatMillions: 178,
    relativeVolume: 4.2,
    dayChangePct: 12.1,
    catalyst: "Fresh product news",
    catalystState: "pass",
    profile: "Avoid / low quality",
    leadership: "Fading",
    disposition: "Avoided",
    postAlert5mPct: 1.2,
    postAlert15mPct: 2.8,
    endOfDayPct: 4.9,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 5, movePct: 1.2 }, { minute: 15, movePct: 2.8 },
      { minute: 30, movePct: 0.4 }, { minute: 60, movePct: 2.2 }, { minute: 130, movePct: 6.1 },
      { minute: 333, movePct: 4.9 },
    ],
    pnl: null,
    selectionNote: "Correct avoidance: price, float, and relative volume all sat outside the preferred setup.",
  },
  {
    rank: 6,
    symbol: "MIRA",
    firstSeen: "10:44",
    price: 1.9,
    floatMillions: 8.5,
    relativeVolume: 5.4,
    dayChangePct: 9.5,
    catalyst: "Unclear / stale",
    catalystState: "fail",
    profile: "Avoid / low quality",
    leadership: "Fading",
    disposition: "False opportunity",
    postAlert5mPct: -1.1,
    postAlert15mPct: -2.4,
    endOfDayPct: 0.8,
    postAlertPath: [
      { minute: 0, movePct: 0 }, { minute: 3, movePct: 1.4 }, { minute: 5, movePct: -1.1 },
      { minute: 15, movePct: -2.4 }, { minute: 35, movePct: -3.2 }, { minute: 90, movePct: -0.8 },
      { minute: 316, movePct: 0.8 },
    ],
    pnl: null,
    selectionNote: "The alert never cleared the +10% momentum threshold and quickly lost attention.",
  },
];
