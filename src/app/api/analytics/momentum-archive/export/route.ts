import { createMarketArchiveClient } from "@/lib/marketArchive";
import type {
  ArchiveMoverSort,
  ArchivePeakSession,
  ArchiveSortDirection,
  ArchiveUniverse,
} from "@/lib/marketArchive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Guards the download against an unbounded archive scan. */
const EXPORT_LIMIT = 5000;
const PAGE = 200;

const COLUMNS = [
  "date",
  "symbol",
  "name",
  "instrumentType",
  "exchange",
  "qualifiesCore",
  "coreExclusionReasons",
  "splitEvent",
  "previousRegularClose",
  "peakSession",
  "peakGainPercent",
  "premarketGainPercent",
  "regularGainPercent",
  "afterHoursGainPercent",
  "afterHoursGainFromRegularClosePercent",
  "high",
  "highAt",
  "close",
  "closeDistanceFromHighPercent",
  "rvol",
  "dollarVolume",
  "volume",
  "transactions",
  "transactionsPerActiveMinute",
  "activeMinutes",
] as const;

function validDate(value: string | null): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function numberOrUndefined(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const sessions = new Set<ArchivePeakSession>(["all", "premarket", "regular", "afterHours"]);
  const sorts = new Set<ArchiveMoverSort>([
    "date", "dollarVolume", "gain", "high", "name", "price", "rvol", "symbol", "volume",
  ]);
  const session = parameters.get("session") as ArchivePeakSession | null;
  const sort = parameters.get("sort") as ArchiveMoverSort | null;

  const filters = {
    direction: (parameters.get("direction") === "asc" ? "asc" : "desc") as ArchiveSortDirection,
    from: validDate(parameters.get("from")),
    minGain: numberOrUndefined(parameters.get("minGain")),
    minPreviousClose: numberOrUndefined(parameters.get("minPreviousClose")),
    minRvol: numberOrUndefined(parameters.get("minRvol")),
    query: parameters.get("q")?.trim() || undefined,
    peakSession: session && sessions.has(session) ? session : ("all" as ArchivePeakSession),
    sort: sort && sorts.has(sort) ? sort : ("gain" as ArchiveMoverSort),
    to: validDate(parameters.get("to")),
    universe: (parameters.get("universe") === "raw" ? "raw" : "core") as ArchiveUniverse,
  };

  try {
    const client = createMarketArchiveClient();
    const health = await client.health();
    if (!health.available) {
      return new Response("The Top Gainers archive is not available on this machine.", {
        headers: { "Cache-Control": "no-store" },
        status: 503,
      });
    }

    const lines = [COLUMNS.join(",")];
    let offset = 0;
    let truncated = false;
    while (offset < EXPORT_LIMIT) {
      const { movers, total } = await client.listMovers({ ...filters, limit: PAGE, offset });
      for (const mover of movers) {
        lines.push([
          mover.date,
          mover.symbol,
          mover.instrumentName,
          mover.instrumentType,
          mover.primaryExchange,
          mover.qualifiesCore,
          mover.coreExclusionReasons,
          mover.splitEvent,
          mover.previousRegularClose,
          mover.peakSession,
          mover.evidence.gainPercent,
          mover.premarketGainPercent,
          mover.regularGainPercent,
          mover.afterHoursGainPercent,
          mover.afterHoursGainFromRegularClosePercent,
          mover.evidence.high,
          mover.evidence.highAt,
          mover.evidence.close,
          mover.evidence.closeDistanceFromHighPercent,
          mover.evidence.rvol,
          mover.evidence.dollarVolume,
          mover.evidence.volume,
          mover.evidence.transactions,
          mover.evidence.transactionsPerActiveMinute,
          mover.evidence.activeMinutes,
        ].map(csvCell).join(","));
      }
      offset += movers.length;
      if (movers.length < PAGE || offset >= total) break;
      if (offset >= EXPORT_LIMIT) truncated = total > EXPORT_LIMIT;
    }
    if (truncated) {
      lines.push(`# truncated at ${EXPORT_LIMIT} rows — narrow the filters for the full set`);
    }

    const range = [filters.from ?? health.coverage?.from, filters.to ?? health.coverage?.to]
      .filter(Boolean)
      .join("-to-");
    return new Response(`${lines.join("\n")}\n`, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="momentum-archive-${filters.universe}-${range || "all"}.csv"`,
        "Content-Type": "text/csv;charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to export the Momentum Archive.", error);
    return new Response("Could not export this archive selection.", {
      headers: { "Cache-Control": "no-store" },
      status: 500,
    });
  }
}
