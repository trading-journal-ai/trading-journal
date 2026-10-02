import { NextResponse } from "next/server";
import { isDemoReadOnly } from "@/lib/demoMode";
import { getLevelReview, LevelReviewError, submitLevelReview } from "@/lib/marketLevelReviewStore";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof LevelReviewError ? error.message : "The level review could not be loaded or saved." }, { status: error instanceof LevelReviewError ? error.status : 500, headers });
}

export async function GET(request: Request) {
  try { return NextResponse.json(await getLevelReview(new URL(request.url).searchParams.get("dayId") ?? ""), { headers }); }
  catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  if (!request.headers.get("origin") || request.headers.get("origin") !== origin) return NextResponse.json({ error: "Open the journal on its own site to submit a review." }, { status: 403, headers });
  if (isDemoReadOnly()) return NextResponse.json({ error: "Reviews cannot be submitted in the read-only demo." }, { status: 403, headers });
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "Send the level review as valid JSON." }, { status: 400, headers }); }
  try { return NextResponse.json(await submitLevelReview(input), { headers }); }
  catch (error) { return failure(error); }
}
