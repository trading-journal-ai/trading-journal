import type { Candle } from "./massive";

type ExecutionLike = {
  executedAt: number;
  price: number;
  quantity?: number | null;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function minuteFloor(epochSeconds: number): number {
  return Math.floor(epochSeconds / 60) * 60;
}

/**
 * Build a deterministic fallback chart from execution prices when real cached
 * candles are unavailable. This is intentionally modest: it preserves the
 * timing/price anchors from the trade while avoiding a raw provider error in
 * hosted demos or offline local review.
 */
export function fallbackCandlesFromExecutions(
  executions: ExecutionLike[],
  from: number,
  to: number,
): Candle[] {
  const sorted = executions
    .filter((execution) => Number.isFinite(execution.executedAt) && Number.isFinite(execution.price))
    .sort((a, b) => a.executedAt - b.executedAt);

  if (sorted.length === 0) return [];

  const firstPrice = sorted[0].price;
  const lastPrice = sorted.at(-1)?.price ?? firstPrice;
  const start = minuteFloor(Math.min(from, sorted[0].executedAt));
  const end = minuteFloor(Math.max(to, sorted.at(-1)?.executedAt ?? sorted[0].executedAt));
  const priceNudge = Math.max(firstPrice * 0.004, 0.01);
  const anchors = [
    { t: start, price: firstPrice - priceNudge },
    ...sorted.map((execution) => ({ t: minuteFloor(execution.executedAt), price: execution.price })),
    { t: end, price: lastPrice + Math.max(lastPrice * 0.002, 0.01) },
  ].sort((a, b) => a.t - b.t);
  const markerByMinute = new Map<number, ExecutionLike[]>();

  sorted.forEach((execution) => {
    const key = minuteFloor(execution.executedAt);
    markerByMinute.set(key, [...(markerByMinute.get(key) ?? []), execution]);
  });

  let anchorIndex = 0;
  let previousClose = anchors[0].price;
  const candles: Candle[] = [];

  for (let t = start, index = 0; t <= end; t += 60, index += 1) {
    while (anchorIndex < anchors.length - 2 && anchors[anchorIndex + 1].t < t) {
      anchorIndex += 1;
    }

    const current = anchors[anchorIndex];
    const next = anchors[Math.min(anchorIndex + 1, anchors.length - 1)];
    const span = Math.max(60, next.t - current.t);
    const progress = clamp((t - current.t) / span, 0, 1);
    const base = current.price + (next.price - current.price) * progress;
    const wave = Math.sin(index * 1.7) * Math.max(base * 0.0015, 0.004);
    const close = base + wave;
    const open = previousClose;
    const markers = markerByMinute.get(t) ?? [];
    const markerPrices = markers.map((marker) => marker.price);
    const wick = Math.max(base * 0.002, 0.006);
    const high = Math.max(open, close, ...markerPrices) + wick;
    const low = Math.min(open, close, ...markerPrices) - wick;
    const markerVolume = markers.reduce((sum, marker) => sum + Math.abs(marker.quantity ?? 0), 0);

    candles.push({
      t,
      o: open,
      h: high,
      l: low,
      c: close,
      vol: markerVolume > 0 ? markerVolume : Math.round(100 + Math.abs(Math.sin(index * 0.9)) * 300),
    });
    previousClose = close;
  }

  return candles;
}
