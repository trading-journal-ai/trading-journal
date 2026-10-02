import { NextResponse } from "next/server";
import { isDemoReadOnly } from "@/lib/demoMode";
import { applyCurlLabelChange, curlLabelState, parseCurlLabelChange, readCurlDays } from "@/lib/marketInsightsStore";

import { validateReviewDay } from "@/lib/marketChartReview";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await curlLabelState(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const siteOrigin = `${requestUrl.protocol}//${request.headers.get("host") ?? requestUrl.host}`;
  if (!origin || origin !== siteOrigin) return NextResponse.json({ error: "Open the journal on its own site to save labels." }, { status: 403 });
  if (isDemoReadOnly()) return NextResponse.json({ error: "Labels cannot be saved in the read-only demo." }, { status: 403 });
  let change;
  try {
    change = parseCurlLabelChange(await request.json());
    if ("observation" in change) {
      const dayId = change.dayId;
      const day = (await readCurlDays())?.find((item) => item.id === dayId);
      if (!day) throw new Error("The chart day is unavailable. Reload before saving.");
      validateReviewDay(change.observation, day);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "That label change could not be read." }, { status: 400 });
  }
  try {
    await applyCurlLabelChange(change);
    return NextResponse.json(await curlLabelState(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The label could not be saved to data/evals/market-insights/labels.json. Check that the folder exists and is writable." }, { status: 500 });
  }
}
