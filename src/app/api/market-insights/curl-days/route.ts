import { NextResponse } from "next/server";
import { curlDaySummaries, readCurlDays } from "@/lib/marketInsightsStore";

export const runtime = "nodejs";

/** Local research data for the Insights curl-labeling prototype. */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    const days = await curlDaySummaries();
    return days
      ? NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } })
      : NextResponse.json({ error: "No curl dataset yet. Run build-curl-days.py." }, { status: 404 });
  }
  const day = (await readCurlDays())?.find((item) => item.id === id);
  return day
    ? NextResponse.json(day, { headers: { "Cache-Control": "no-store" } })
    : NextResponse.json({ error: "That day is not in the curl dataset." }, { status: 404 });
}
