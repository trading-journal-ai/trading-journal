import { NextResponse } from "next/server";
import { loadArchiveNews } from "@/lib/marketArchive/news";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const parameters = new URL(request.url).searchParams;
  try {
    const result = await loadArchiveNews({ symbol: parameters.get("symbol") ?? "", date: parameters.get("date") ?? "" });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (error) {
    const invalid = error instanceof Error && /^(Invalid symbol|Invalid archive date)/.test(error.message);
    return NextResponse.json({ error: invalid ? "Choose a valid symbol and archive date." : "Saved news is unavailable. Try again." },
      { status: invalid ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
