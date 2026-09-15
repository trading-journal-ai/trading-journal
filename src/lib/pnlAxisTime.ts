const axisTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Only clock-aligned half hours label the axis; the crosshair stays precise. */
export function formatPnlAxisTime(time: unknown): string {
  if (typeof time !== "number" || time % 1800 !== 0) return "";
  return axisTime.format(new Date(time * 1000)).replace(/^24:/, "00:").replace(/^0(?=\d:)/, "");
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

/** Lightweight Charts spaces indices equally. Empty slots make that elapsed
 * time spacing without inventing P&L values or moving existing trade points.
 * Use the coarsest exact second-based interval shared by the day's events. */
export function pnlTimeline(points: { time: number; value: number }[]): { time: number; value?: number }[] {
  if (!points.length) return [];
  const start = Math.floor(points[0].time / 1800) * 1800;
  const end = Math.max(start + 1800, Math.ceil(points[points.length - 1].time / 1800) * 1800);
  const interval = points.reduce((step, point) => gcd(step, point.time - start), 1800);
  const values = new Map(points.map((point) => [point.time, point]));
  return Array.from({ length: (end - start) / interval + 1 }, (_, index) => {
    const time = start + index * interval;
    return values.get(time) ?? { time };
  });
}
