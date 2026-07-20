export type SessionPoint = {
  date: string;
  label: string;
  pnl: number;
  trades: number;
  winRate: number;
};

export type EdgeRow = {
  label: string;
  trades: number;
  winRate: number;
  avgTrade: number;
  pnl: number;
};

export type ContributionTrade = {
  label: string;
  symbol: string;
  pnl: number;
};

export type CohortMetric = {
  label: string;
  baseline: number;
  current: number;
  min: number;
  max: number;
  format: "percent" | "ratio" | "money" | "count";
  direction: "higher" | "lower";
};

export type ActivityPoint = {
  label: string;
  trades: number;
  avgTrade: number;
  pnl: number;
};

export type CalendarSession = {
  day: number;
  pnl: number;
};

export type ExcursionPoint = {
  label: string;
  mae: number;
  mfe: number;
  realized: number;
};

export type TradeTapePoint = {
  id: number;
  entryTime: string;
  minute: number;
  quantity: number;
  pnl: number;
  durationSeconds: number;
};

export type MarketContextCandle = {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketContextTrade = {
  id: number;
  entryMinute: number;
  exitMinute: number;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  maePrice: number;
  mfePrice: number;
  candleCount: number;
};

export type PeriodComparison = {
  label: string;
  range: string;
  trades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  pnl: number;
};

export type SessionHeatCell = {
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  slot: "07–08" | "08–09" | "09–10" | "10+";
  trades: number;
  avgTrade: number;
};

export const sessionPoints: SessionPoint[] = [
  { date: "2026-07-01", label: "01", pnl: 420, trades: 6, winRate: 67 },
  { date: "2026-07-02", label: "02", pnl: -180, trades: 4, winRate: 50 },
  { date: "2026-07-03", label: "03", pnl: 760, trades: 5, winRate: 60 },
  { date: "2026-07-06", label: "06", pnl: 140, trades: 3, winRate: 67 },
  { date: "2026-07-07", label: "07", pnl: -520, trades: 7, winRate: 29 },
  { date: "2026-07-08", label: "08", pnl: 315, trades: 4, winRate: 50 },
  { date: "2026-07-09", label: "09", pnl: 980, trades: 6, winRate: 67 },
  { date: "2026-07-10", label: "10", pnl: -240, trades: 5, winRate: 40 },
  { date: "2026-07-13", label: "13", pnl: 175, trades: 3, winRate: 67 },
  { date: "2026-07-14", label: "14", pnl: 560, trades: 4, winRate: 75 },
  { date: "2026-07-15", label: "15", pnl: -310, trades: 5, winRate: 40 },
  { date: "2026-07-16", label: "16", pnl: 690, trades: 4, winRate: 75 },
  { date: "2026-07-17", label: "17", pnl: 85, trades: 2, winRate: 50 },
];

export const tradeOutcomes = [
  -520, -310, -240, -180, -145, -120, -85, -60, -40, -25, -10, 0, 15, 30, 45, 55, 70,
  90, 105, 120, 140, 165, 185, 210, 240, 280, 315, 360, 420, 560, 690, 760, 980,
];

export const edgeRows: EdgeRow[] = [
  { label: "07:00–08:00", trades: 12, winRate: 58, avgTrade: 84, pnl: 1008 },
  { label: "08:00–09:00", trades: 18, winRate: 61, avgTrade: 62, pnl: 1116 },
  { label: "09:00–10:00", trades: 23, winRate: 52, avgTrade: 18, pnl: 414 },
  { label: "10:00–11:00", trades: 19, winRate: 42, avgTrade: -28, pnl: -532 },
  { label: "11:00–12:00", trades: 11, winRate: 36, avgTrade: -41, pnl: -451 },
  { label: "12:00+", trades: 7, winRate: 43, avgTrade: 5, pnl: 35 },
];

export const contributionTrades: ContributionTrade[] = [
  { label: "T-31", symbol: "GME", pnl: 980 },
  { label: "T-18", symbol: "MLGO", pnl: 760 },
  { label: "T-42", symbol: "VSEE", pnl: 690 },
  { label: "T-27", symbol: "SOUN", pnl: 560 },
  { label: "T-07", symbol: "RGTI", pnl: 420 },
  { label: "T-36", symbol: "GME", pnl: -520 },
  { label: "T-39", symbol: "MLGO", pnl: -310 },
  { label: "T-22", symbol: "SOUN", pnl: -240 },
];

export const cohortMetrics: CohortMetric[] = [
  { label: "Win rate", baseline: 49, current: 56, min: 35, max: 70, format: "percent", direction: "higher" },
  { label: "Payoff", baseline: 1.31, current: 1.82, min: 0.8, max: 2.2, format: "ratio", direction: "higher" },
  { label: "Profit factor", baseline: 1.22, current: 1.76, min: 0.8, max: 2.2, format: "ratio", direction: "higher" },
  { label: "Avg trade", baseline: 29, current: 64, min: 0, max: 80, format: "money", direction: "higher" },
  { label: "Trades / day", baseline: 5.7, current: 4.2, min: 3, max: 7, format: "count", direction: "lower" },
];

export const activityPoints: ActivityPoint[] = [
  { label: "Jul 01", trades: 3, avgTrade: 128, pnl: 384 },
  { label: "Jul 02", trades: 4, avgTrade: 74, pnl: 296 },
  { label: "Jul 03", trades: 5, avgTrade: 91, pnl: 455 },
  { label: "Jul 06", trades: 3, avgTrade: 53, pnl: 159 },
  { label: "Jul 07", trades: 7, avgTrade: -74, pnl: -518 },
  { label: "Jul 08", trades: 4, avgTrade: 79, pnl: 316 },
  { label: "Jul 09", trades: 6, avgTrade: 163, pnl: 978 },
  { label: "Jul 10", trades: 8, avgTrade: -31, pnl: -248 },
  { label: "Jul 13", trades: 3, avgTrade: 58, pnl: 174 },
  { label: "Jul 14", trades: 7, avgTrade: -18, pnl: -126 },
  { label: "Jul 15", trades: 9, avgTrade: -35, pnl: -315 },
  { label: "Jul 16", trades: 4, avgTrade: 173, pnl: 692 },
];

export const calendarSessions: CalendarSession[] = [
  { day: 1, pnl: 420 },
  { day: 2, pnl: -180 },
  { day: 3, pnl: 760 },
  { day: 6, pnl: 140 },
  { day: 7, pnl: -520 },
  { day: 8, pnl: 315 },
  { day: 9, pnl: 980 },
  { day: 10, pnl: -240 },
  { day: 13, pnl: 175 },
  { day: 14, pnl: 560 },
  { day: 15, pnl: -310 },
  { day: 16, pnl: 690 },
  { day: 17, pnl: 85 },
];

export const excursionPoints: ExcursionPoint[] = [
  { label: "GME", mae: -0.3, mfe: 2.4, realized: 1.8 },
  { label: "MLGO", mae: -0.8, mfe: 1.9, realized: 0.7 },
  { label: "VSEE", mae: -0.2, mfe: 1.3, realized: 1.1 },
  { label: "SOUN", mae: -1.1, mfe: 0.6, realized: -0.8 },
  { label: "RGTI", mae: -0.5, mfe: 1.8, realized: 0.4 },
  { label: "SERV", mae: -0.9, mfe: 0.9, realized: -0.5 },
  { label: "MIRA", mae: -0.4, mfe: 2.8, realized: 1.2 },
  { label: "KULR", mae: -1.3, mfe: 0.3, realized: -1.0 },
];

export const periodComparisons: PeriodComparison[] = [
  { label: "DAY", range: "JUL 16", trades: 4, winRate: 75, avgWin: 250, avgLoss: -60, pnl: 690 },
  { label: "WEEK", range: "JUL 13–17", trades: 18, winRate: 61, avgWin: 168, avgLoss: -81, pnl: 1200 },
  { label: "MONTH", range: "JUL", trades: 55, winRate: 56, avgWin: 180, avgLoss: -113, pnl: 2875 },
  { label: "YEAR", range: "2026", trades: 612, winRate: 55, avgWin: 166, avgLoss: -118, pnl: 23492 },
];

export const sessionHeatCells: SessionHeatCell[] = [
  { day: "MON", slot: "07–08", trades: 4, avgTrade: 58 },
  { day: "MON", slot: "08–09", trades: 6, avgTrade: 74 },
  { day: "MON", slot: "09–10", trades: 5, avgTrade: 22 },
  { day: "MON", slot: "10+", trades: 3, avgTrade: -18 },
  { day: "TUE", slot: "07–08", trades: 5, avgTrade: 41 },
  { day: "TUE", slot: "08–09", trades: 7, avgTrade: 65 },
  { day: "TUE", slot: "09–10", trades: 6, avgTrade: -12 },
  { day: "TUE", slot: "10+", trades: 5, avgTrade: -47 },
  { day: "WED", slot: "07–08", trades: 6, avgTrade: 96 },
  { day: "WED", slot: "08–09", trades: 7, avgTrade: 88 },
  { day: "WED", slot: "09–10", trades: 5, avgTrade: 35 },
  { day: "WED", slot: "10+", trades: 4, avgTrade: -10 },
  { day: "THU", slot: "07–08", trades: 5, avgTrade: 112 },
  { day: "THU", slot: "08–09", trades: 8, avgTrade: 105 },
  { day: "THU", slot: "09–10", trades: 6, avgTrade: 28 },
  { day: "THU", slot: "10+", trades: 4, avgTrade: -32 },
  { day: "FRI", slot: "07–08", trades: 4, avgTrade: 67 },
  { day: "FRI", slot: "08–09", trades: 5, avgTrade: 48 },
  { day: "FRI", slot: "09–10", trades: 4, avgTrade: 5 },
  { day: "FRI", slot: "10+", trades: 3, avgTrade: -55 },
];

// Bundled synthetic demo data: VERO on 2026-01-16, normalized for this specimen.
export const tradeTapePoints: TradeTapePoint[] = [
  { id: 2544, entryTime: "11:37", minute: 7.95, quantity: 1000, pnl: 408.36, durationSeconds: 815 },
  { id: 2545, entryTime: "11:54", minute: 24.47, quantity: 700, pnl: 154, durationSeconds: 79 },
  { id: 2546, entryTime: "11:57", minute: 27.48, quantity: 1300, pnl: 520, durationSeconds: 221 },
  { id: 2547, entryTime: "12:07", minute: 37.12, quantity: 500, pnl: 112.5, durationSeconds: 31 },
  { id: 2548, entryTime: "12:08", minute: 38.07, quantity: 900, pnl: 90, durationSeconds: 8 },
  { id: 2549, entryTime: "12:11", minute: 41.1, quantity: 700, pnl: -101.5, durationSeconds: 55 },
  { id: 2550, entryTime: "12:12", minute: 42.28, quantity: 1300, pnl: -22.09, durationSeconds: 89 },
  { id: 2551, entryTime: "12:14", minute: 44.35, quantity: 600, pnl: 168, durationSeconds: 28 },
  { id: 2552, entryTime: "12:17", minute: 47.43, quantity: 900, pnl: 81, durationSeconds: 8 },
  { id: 2553, entryTime: "12:18", minute: 48.23, quantity: 500, pnl: 170, durationSeconds: 11 },
  { id: 2554, entryTime: "12:20", minute: 50.08, quantity: 800, pnl: 24, durationSeconds: 6 },
  { id: 2555, entryTime: "12:21", minute: 51.13, quantity: 1300, pnl: 11.34, durationSeconds: 24 },
  { id: 2556, entryTime: "12:24", minute: 54.62, quantity: 800, pnl: 126.09, durationSeconds: 42 },
  { id: 2557, entryTime: "12:27", minute: 57.32, quantity: 1400, pnl: -83.16, durationSeconds: 67 },
  { id: 2558, entryTime: "13:06", minute: 96.37, quantity: 1200, pnl: 169.61, durationSeconds: 539 },
  { id: 2559, entryTime: "13:24", minute: 114.17, quantity: 1300, pnl: 86.34, durationSeconds: 33 },
  { id: 2560, entryTime: "13:33", minute: 123.4, quantity: 900, pnl: 13.5, durationSeconds: 74 },
];

// Bundled synthetic demo data: RXT on 2026-05-08, aggregated from one-minute candles.
export const rxtContextCandles: MarketContextCandle[] = [
  { minute: 0, open: 3.820, high: 3.830, low: 3.790, close: 3.790, volume: 257219 },
  { minute: 10, open: 3.796, high: 3.890, low: 3.796, close: 3.880, volume: 219436 },
  { minute: 20, open: 3.880, high: 3.920, low: 3.825, close: 3.850, volume: 370506 },
  { minute: 30, open: 3.855, high: 4.200, low: 3.750, close: 4.190, volume: 6566351 },
  { minute: 40, open: 4.190, high: 4.590, low: 4.150, close: 4.370, volume: 9526094 },
  { minute: 50, open: 4.370, high: 4.500, low: 4.210, close: 4.280, volume: 4181342 },
  { minute: 60, open: 4.290, high: 4.300, low: 4.120, close: 4.195, volume: 2069590 },
  { minute: 70, open: 4.190, high: 4.500, low: 4.180, close: 4.460, volume: 3300690 },
  { minute: 80, open: 4.470, high: 4.850, low: 4.461, close: 4.805, volume: 8232442 },
  { minute: 90, open: 4.805, high: 4.960, low: 4.730, close: 4.950, volume: 5315448 },
  { minute: 100, open: 4.950, high: 5.070, low: 4.840, close: 4.970, volume: 6611254 },
  { minute: 110, open: 4.960, high: 5.220, low: 4.958, close: 5.190, volume: 5417542 },
  { minute: 120, open: 5.188, high: 5.300, low: 5.130, close: 5.150, volume: 4576941 },
  { minute: 130, open: 5.160, high: 5.180, low: 4.880, close: 4.900, volume: 4501619 },
  { minute: 140, open: 4.890, high: 5.180, low: 4.880, close: 5.143, volume: 3825751 },
  { minute: 150, open: 5.140, high: 5.440, low: 5.140, close: 5.425, volume: 6196093 },
  { minute: 160, open: 5.430, high: 5.430, low: 5.230, close: 5.250, volume: 2960085 },
  { minute: 170, open: 5.250, high: 5.350, low: 5.230, close: 5.315, volume: 2392604 },
  { minute: 180, open: 5.310, high: 5.470, low: 5.309, close: 5.430, volume: 2917412 },
  { minute: 190, open: 5.420, high: 5.740, low: 5.420, close: 5.700, volume: 4930675 },
  { minute: 200, open: 5.710, high: 5.730, low: 5.480, close: 5.610, volume: 3588644 },
  { minute: 210, open: 5.610, high: 5.705, low: 5.550, close: 5.605, volume: 2885378 },
  { minute: 220, open: 5.609, high: 5.870, low: 5.600, close: 5.840, volume: 3715198 },
  { minute: 230, open: 5.849, high: 6.000, low: 5.780, close: 5.860, volume: 5423903 },
  { minute: 240, open: 5.853, high: 5.860, low: 5.590, close: 5.640, volume: 3887070 },
  { minute: 250, open: 5.645, high: 5.705, low: 5.520, close: 5.575, volume: 2215872 },
  { minute: 260, open: 5.579, high: 5.590, low: 5.470, close: 5.560, volume: 1966486 },
  { minute: 270, open: 5.557, high: 5.560, low: 5.330, close: 5.383, volume: 2865157 },
  { minute: 280, open: 5.390, high: 5.500, low: 5.280, close: 5.310, volume: 1763858 },
  { minute: 290, open: 5.310, high: 5.325, low: 5.230, close: 5.250, volume: 1420544 },
  { minute: 300, open: 5.245, high: 5.390, low: 5.170, close: 5.320, volume: 2063807 },
  { minute: 310, open: 5.330, high: 5.480, low: 5.160, close: 5.195, volume: 2449716 },
  { minute: 320, open: 5.200, high: 5.240, low: 5.080, close: 5.115, volume: 1802172 },
  { minute: 330, open: 5.120, high: 5.250, low: 5.050, close: 5.180, volume: 1658190 },
  { minute: 340, open: 5.185, high: 5.440, low: 5.175, close: 5.420, volume: 1805173 },
  { minute: 350, open: 5.420, high: 5.460, low: 5.330, close: 5.375, volume: 1840343 },
  { minute: 360, open: 5.375, high: 5.540, low: 5.310, close: 5.535, volume: 1927171 },
  { minute: 370, open: 5.535, high: 5.760, low: 5.530, close: 5.635, volume: 3323221 },
  { minute: 380, open: 5.630, high: 5.640, low: 5.480, close: 5.560, volume: 1508173 },
];

export const rxtContextTrades: MarketContextTrade[] = [
  { id: 17242, entryMinute: 17.65, exitMinute: 20.20, quantity: 10, entryPrice: 3.849, exitPrice: 3.873, pnl: 0.24, maePrice: 3.840, mfePrice: 3.890, candleCount: 4 },
  { id: 17254, entryMinute: 76.05, exitMinute: 76.25, quantity: 500, entryPrice: 4.367, exitPrice: 4.380, pnl: 6.35, maePrice: 4.360, mfePrice: 4.450, candleCount: 1 },
  { id: 17263, entryMinute: 149.42, exitMinute: 149.45, quantity: 500, entryPrice: 5.080, exitPrice: 5.096, pnl: 7.84, maePrice: 5.070, mfePrice: 5.160, candleCount: 1 },
  { id: 17264, entryMinute: 150.72, exitMinute: 151.03, quantity: 100, entryPrice: 5.180, exitPrice: 5.175, pnl: -0.53, maePrice: 5.140, mfePrice: 5.300, candleCount: 2 },
  { id: 17265, entryMinute: 168.05, exitMinute: 168.23, quantity: 10, entryPrice: 5.350, exitPrice: 5.355, pnl: 0.05, maePrice: 5.310, mfePrice: 5.370, candleCount: 1 },
  { id: 17267, entryMinute: 192.20, exitMinute: 192.43, quantity: 100, entryPrice: 5.570, exitPrice: 5.580, pnl: 0.97, maePrice: 5.550, mfePrice: 5.590, candleCount: 1 },
  { id: 17268, entryMinute: 194.87, exitMinute: 195.23, quantity: 100, entryPrice: 5.580, exitPrice: 5.555, pnl: -2.53, maePrice: 5.511, mfePrice: 5.600, candleCount: 2 },
  { id: 17269, entryMinute: 196.10, exitMinute: 196.47, quantity: 100, entryPrice: 5.525, exitPrice: 5.535, pnl: 0.97, maePrice: 5.500, mfePrice: 5.570, candleCount: 1 },
  { id: 17270, entryMinute: 197.17, exitMinute: 199.68, quantity: 100, entryPrice: 5.579, exitPrice: 5.650, pnl: 7.07, maePrice: 5.560, mfePrice: 5.740, candleCount: 3 },
  { id: 17271, entryMinute: 201.98, exitMinute: 202.13, quantity: 100, entryPrice: 5.540, exitPrice: 5.540, pnl: -0.02, maePrice: 5.480, mfePrice: 5.630, candleCount: 2 },
  { id: 17272, entryMinute: 212.70, exitMinute: 212.82, quantity: 100, entryPrice: 5.670, exitPrice: 5.680, pnl: 0.97, maePrice: 5.650, mfePrice: 5.690, candleCount: 1 },
  { id: 17273, entryMinute: 217.53, exitMinute: 217.98, quantity: 100, entryPrice: 5.650, exitPrice: 5.650, pnl: -0.02, maePrice: 5.550, mfePrice: 5.680, candleCount: 1 },
  { id: 3501, entryMinute: 235.15, exitMinute: 237.37, quantity: 700, entryPrice: 5.960, exitPrice: 5.980, pnl: 14.00, maePrice: 5.910, mfePrice: 6.000, candleCount: 3 },
  { id: 3502, entryMinute: 326.33, exitMinute: 335.77, quantity: 1400, entryPrice: 5.180, exitPrice: 5.242, pnl: 87.06, maePrice: 5.050, mfePrice: 5.250, candleCount: 10 },
  { id: 3503, entryMinute: 370.60, exitMinute: 370.80, quantity: 200, entryPrice: 5.630, exitPrice: 5.630, pnl: 0.00, maePrice: 5.530, mfePrice: 5.660, candleCount: 1 },
  { id: 3504, entryMinute: 376.48, exitMinute: 377.08, quantity: 1200, entryPrice: 5.700, exitPrice: 5.690, pnl: -12.00, maePrice: 5.650, mfePrice: 5.740, candleCount: 2 },
  { id: 17274, entryMinute: 377.83, exitMinute: 378.87, quantity: 10, entryPrice: 5.710, exitPrice: 5.635, pnl: -0.75, maePrice: 5.630, mfePrice: 5.760, candleCount: 2 },
];
