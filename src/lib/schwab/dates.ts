import { MARKET_TZ, zonedDateTimeToUtcMs } from "@/lib/time";

export const SCHWAB_MAX_LOOKBACK_DAYS = 60;
export const SCHWAB_HISTORY_CHUNK_DAYS = 7;
export const SCHWAB_ORDER_ENTRY_LOOKBACK_DAYS = 7;

export type SchwabDateChunk = {
  from: string;
  to: string;
  fromIso: string;
  toIso: string;
};

export type ValidatedSchwabDateRange = {
  from: string;
  to: string;
  startEpoch: number;
  endEpochExclusive: number;
  orderChunks: SchwabDateChunk[];
  transactionChunks: SchwabDateChunk[];
};

export class SchwabDateRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchwabDateRangeError";
  }
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  if (!date) throw new SchwabDateRangeError("Trade dates must use YYYY-MM-DD.");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function marketDate(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: MARKET_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isoBounds(from: string, to: string) {
  const startMs = zonedDateTimeToUtcMs(from, "00:00:00", MARKET_TZ);
  const endExclusiveMs = zonedDateTimeToUtcMs(shiftDate(to, 1), "00:00:00", MARKET_TZ);
  return {
    fromIso: new Date(startMs).toISOString(),
    toIso: new Date(endExclusiveMs - 1).toISOString(),
    startEpoch: Math.floor(startMs / 1000),
    endEpochExclusive: Math.floor(endExclusiveMs / 1000),
  };
}

function chunkDates(from: string, to: string): SchwabDateChunk[] {
  const chunks: SchwabDateChunk[] = [];
  let cursor = from;
  while (cursor <= to) {
    const chunkTo = [shiftDate(cursor, SCHWAB_HISTORY_CHUNK_DAYS - 1), to].sort()[0];
    const bounds = isoBounds(cursor, chunkTo);
    chunks.push({
      from: cursor,
      to: chunkTo,
      fromIso: bounds.fromIso,
      toIso: bounds.toIso,
    });
    cursor = shiftDate(chunkTo, 1);
  }
  return chunks;
}

export function validateSchwabDateRange(
  from: string,
  to: string,
  now = new Date(),
): ValidatedSchwabDateRange {
  if (!parseDate(from) || !parseDate(to)) {
    throw new SchwabDateRangeError("Choose valid start and end dates.");
  }
  if (from > to) {
    throw new SchwabDateRangeError("The start date must be on or before the end date.");
  }

  const today = marketDate(now);
  const minimum = shiftDate(today, -(SCHWAB_MAX_LOOKBACK_DAYS - 1));
  if (from < minimum) {
    throw new SchwabDateRangeError(
      `Initial Schwab sync is limited to the most recent ${SCHWAB_MAX_LOOKBACK_DAYS} days.`,
    );
  }
  if (to > today) {
    throw new SchwabDateRangeError("The end date cannot be in the future.");
  }

  const selectedBounds = isoBounds(from, to);
  const orderFrom = [shiftDate(from, -SCHWAB_ORDER_ENTRY_LOOKBACK_DAYS), minimum].sort().at(-1)
    ?? minimum;

  return {
    from,
    to,
    startEpoch: selectedBounds.startEpoch,
    endEpochExclusive: selectedBounds.endEpochExclusive,
    orderChunks: chunkDates(orderFrom, to),
    transactionChunks: chunkDates(from, to),
  };
}
