import { NextResponse } from "next/server";
import { loadArchiveCandles } from "@/lib/marketArchive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  const date = parameters.get("date") ?? "";
  const symbol = parameters.get("symbol") ?? "";

  try {
    const result = await loadArchiveCandles({ date, symbol });
    return NextResponse.json({
      cached: result.cached,
      candles: result.candles,
      date: result.date,
      symbol: result.symbol,
    }, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load archive candles.";
    const invalid = message.startsWith("Invalid") || message.includes("not an archived mover");
    console.error("Failed to load Momentum Archive candles.", error);
    return NextResponse.json(
      { error: invalid ? message : "Could not load this archived chart." },
      { status: invalid ? 400 : 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
