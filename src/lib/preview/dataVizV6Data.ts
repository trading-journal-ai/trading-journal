export type PriceActionCandle = {
  minute: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PriceActionCandidate = {
  symbol: string;
  alertRank: number;
  outcomeRank: number;
  firstSeen: string;
  alertMinuteFromOpen: number;
  alertPrice: number;
  dayHodPct: number;
  traded: boolean;
  catalyst: string;
  baseVolume: number;
  expectedRead: "Clean expansion" | "Whippy expansion" | "Tight grind" | "Dead chop";
  reviewPrompt: string;
  candles: PriceActionCandle[];
};

type CandidateSeed = Omit<PriceActionCandidate, "candles"> & {
  profile: "clean" | "whippy" | "grind" | "dead";
  postAlertDeltas: number[];
};

const cleanDeltas = [
  1.7, 2.2, 1.8, 2.4, 1.5, -0.4, 0.8, 1.3, 1.6, 1.1, -0.6, 0.5,
  1.4, 1.8, 1.1, -0.3, 0.9, 1.2, 1.0, 0.6, -0.7, 0.4, 1.1, 1.5,
  1.0, -0.4, 0.6, 0.8, 1.2, 1.4, -0.8, 0.5, 0.9, 1.1, 0.7, -0.2,
];

const whippyDeltas = [
  3.4, -2.5, 4.0, -3.2, 3.6, -2.8, 4.4, -3.4, 3.2, -2.6, 4.1, -3.3,
  3.5, -2.9, 3.8, -3.1, 4.2, -3.5, 3.0, -2.8, 3.6, -3.0, 4.0, -3.2,
  3.5, -3.1, 3.8, -3.4, 3.1, -2.7, 3.4, -3.0, 3.7, -3.2, 3.0, -2.6,
];

const grindDeltas = [
  0.7, 0.8, 0.6, 0.9, 0.5, 0.7, -0.1, 0.6, 0.8, 0.5, 0.7, -0.2,
  0.6, 0.7, 0.5, 0.8, -0.1, 0.6, 0.7, 0.4, 0.8, -0.2, 0.5, 0.7,
  0.6, 0.5, -0.1, 0.7, 0.6, 0.8, -0.2, 0.5, 0.6, 0.7, 0.4, -0.1,
];

const deadDeltas = [
  0.15, -0.12, 0.18, -0.16, 0.11, -0.14, 0.17, -0.13, 0.10, -0.15, 0.16, -0.12,
  0.14, -0.17, 0.13, -0.11, 0.15, -0.16, 0.12, -0.14, 0.16, -0.13, 0.11, -0.15,
  0.14, -0.12, 0.15, -0.17, 0.12, -0.11, 0.13, -0.15, 0.16, -0.14, 0.10, -0.12,
];

const seeds: CandidateSeed[] = [
  {
    symbol: "MLGO",
    alertRank: 2,
    outcomeRank: 1,
    firstSeen: "09:36",
    alertMinuteFromOpen: 6,
    alertPrice: 7.8,
    dayHodPct: 92.6,
    traded: false,
    catalyst: "No-news momentum",
    baseVolume: 520_000,
    expectedRead: "Clean expansion",
    reviewPrompt: "The largest mover also produced an orderly post-alert path. Was this a selection miss or an intentional skip?",
    profile: "clean",
    postAlertDeltas: cleanDeltas,
  },
  {
    symbol: "RGTI",
    alertRank: 3,
    outcomeRank: 2,
    firstSeen: "09:52",
    alertMinuteFromOpen: 22,
    alertPrice: 6.2,
    dayHodPct: 67.4,
    traded: false,
    catalyst: "Sector sympathy",
    baseVolume: 410_000,
    expectedRead: "Whippy expansion",
    reviewPrompt: "The move was large, but the path repeatedly reversed. Skipping it may have protected decision quality.",
    profile: "whippy",
    postAlertDeltas: whippyDeltas,
  },
  {
    symbol: "RXT",
    alertRank: 1,
    outcomeRank: 3,
    firstSeen: "09:41",
    alertMinuteFromOpen: 11,
    alertPrice: 4.84,
    dayHodPct: 64.1,
    traded: true,
    catalyst: "Fresh contract news",
    baseVolume: 355_000,
    expectedRead: "Tight grind",
    reviewPrompt: "The path advanced with smaller ranges and shallow pullbacks. Did sizing reflect the lower-volatility structure?",
    profile: "grind",
    postAlertDeltas: grindDeltas,
  },
  {
    symbol: "VERO",
    alertRank: 5,
    outcomeRank: 4,
    firstSeen: "10:03",
    alertMinuteFromOpen: 33,
    alertPrice: 5.15,
    dayHodPct: 33.2,
    traded: true,
    catalyst: "Prior-day continuation",
    baseVolume: 160_000,
    expectedRead: "Dead chop",
    reviewPrompt: "The stock remained active without creating directional progress. More trades would not have created more opportunity.",
    profile: "dead",
    postAlertDeltas: deadDeltas,
  },
];

function wickPercent(profile: CandidateSeed["profile"], bodyPercent: number, side: "upper" | "lower") {
  const body = Math.abs(bodyPercent);
  if (profile === "whippy") return 1.45 + body * (side === "upper" ? 0.34 : 0.3);
  if (profile === "clean") return 0.34 + body * (side === "upper" ? 0.12 : 0.09);
  if (profile === "grind") return 0.2 + body * (side === "upper" ? 0.1 : 0.08);
  return 0.18 + body * 0.18;
}

function buildCandles(seed: CandidateSeed): PriceActionCandle[] {
  const candles: PriceActionCandle[] = [];
  let previousClose = seed.alertPrice * 0.94;

  for (let minute = -55; minute < 0; minute += 1) {
    const progress = (minute + 55) / 54;
    const baseline = seed.alertPrice * (0.94 + progress * 0.06);
    const oscillation = seed.alertPrice * 0.0018 * Math.sin((minute + 55) * 1.7);
    const close = minute === -1 ? seed.alertPrice : baseline + oscillation;
    const open = previousClose;
    const bodyPercent = ((close - open) / open) * 100;
    const upper = Math.max(open, close) * (0.16 + Math.abs(bodyPercent) * 0.08) / 100;
    const lower = Math.min(open, close) * (0.14 + Math.abs(bodyPercent) * 0.07) / 100;
    candles.push({
      minute,
      open,
      high: Math.max(open, close) + upper,
      low: Math.min(open, close) - lower,
      close,
      volume: Math.round(seed.baseVolume * (0.22 + ((minute + 55) % 7) * 0.018)),
    });
    previousClose = close;
  }

  seed.postAlertDeltas.forEach((delta, minute) => {
    const open = previousClose;
    const close = open * (1 + delta / 100);
    const upper = Math.max(open, close) * wickPercent(seed.profile, delta, "upper") / 100;
    const lower = Math.min(open, close) * wickPercent(seed.profile, delta, "lower") / 100;
    const profileVolume = seed.profile === "dead" ? 0.5 : seed.profile === "grind" ? 0.82 : seed.profile === "whippy" ? 1.18 : 1;
    candles.push({
      minute,
      open,
      high: Math.max(open, close) + upper,
      low: Math.min(open, close) - lower,
      close,
      volume: Math.round(seed.baseVolume * profileVolume * (1.08 + (minute % 6) * 0.075)),
    });
    previousClose = close;
  });

  return candles;
}

export const priceActionCandidates: PriceActionCandidate[] = seeds.map(({ profile: _profile, postAlertDeltas: _postAlertDeltas, ...seed }) => ({
  ...seed,
  candles: buildCandles({ ...seed, profile: _profile, postAlertDeltas: _postAlertDeltas }),
}));
