import type { ChartCandle } from "@/components/TradeChart";
import { parseCsvRows } from "@/lib/import/csv";
import { etDateString } from "@/lib/time";

export const MAX_CHART_CSV_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 50_000;

function timestamp(value: string): number {
  // Never interpret a timezone-less timestamp in the browser's local timezone.
  const t = /^\d{10}$/.test(value) ? Number(value)
    : /^\d{13}$/.test(value) ? Number(value) / 1000
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
        ? Date.parse(value) / 1000 : NaN;
  if (!Number.isSafeInteger(t) || t % 60 !== 0) {
    throw new Error("Export one-minute bars with Unix timestamps or ISO timestamps that include a timezone offset.");
  }
  return t;
}

/** Validate a TradingView OHLCV export; extra indicator columns are ignored. */
export function parseChartCsv(csv: string, symbol: string, date: string): ChartCandle[] {
  if (new TextEncoder().encode(csv).length > MAX_CHART_CSV_BYTES) {
    throw new Error("Choose a chart CSV smaller than 5 MB.");
  }
  const [header = [], ...rows] = parseCsvRows(csv);
  if (rows.length > MAX_ROWS) throw new Error("Export a smaller date range (at most 50,000 bars).");
  const names = header.map((name) => name.toLowerCase());
  const columns = ["time", "open", "high", "low", "close", "volume"];
  if (columns.some((name) => names.filter((cell) => cell === name).length !== 1)) {
    throw new Error("Use a TradingView chart CSV with Time, Open, High, Low, Close and Volume columns. Broker trade exports cannot supply chart candles.");
  }
  const [time, open, high, low, close, volume] = columns.map((name) => names.indexOf(name));
  const symbolColumn = names.findIndex((name) => name === "symbol" || name === "ticker");
  const bars = new Map<number, ChartCandle>();
  for (const [index, row] of rows.entries()) {
    const t = timestamp(row[time] ?? "");
    if (symbolColumn >= 0 && row[symbolColumn]?.split(":").at(-1)?.toUpperCase() !== symbol.toUpperCase()) {
      throw new Error(`The CSV contains a different ticker. Export ${symbol}'s chart.`);
    }
    const values = [open, high, low, close, volume].map((column) => {
      const value = row[column];
      return value?.trim() ? Number(value) : NaN;
    });
    const [o, h, l, c, vol] = values;
    if (values.some((value) => !Number.isFinite(value)) || Math.min(o, h, l, c) <= 0
      || vol < 0 || h < Math.max(o, l, c) || l > Math.min(o, h, c)) {
      throw new Error(`Invalid price or volume on CSV row ${index + 2}. Export the chart again with numeric OHLCV values.`);
    }
    if (etDateString(t) !== date) continue;
    const candle = { t, o, h, l, c, vol };
    const previous = bars.get(t);
    if (previous && JSON.stringify(previous) !== JSON.stringify(candle)) {
      throw new Error("The CSV contains conflicting bars for the same minute. Export a single chart again.");
    }
    bars.set(t, candle);
  }
  const candles = [...bars.values()].sort((a, b) => a.t - b.t);
  if (!candles.length) throw new Error(`No bars match ${date} in Eastern Time. Export the session you are reviewing.`);
  if (!candles.some((bar, index) => index > 0 && bar.t - candles[index - 1].t === 60)) {
    throw new Error("Export the chart at the 1-minute interval, with at least two consecutive minute bars.");
  }
  return candles;
}
