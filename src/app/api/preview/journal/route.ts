import { NextResponse } from "next/server";
import {
  getJournalPrototypePayload,
  isJournalPrototypeScope,
  isViewForScope,
} from "@/lib/preview/journalPrototypeData";

export function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const view = searchParams.get("view");

  if (!isJournalPrototypeScope(scope) || !isViewForScope(scope, view)) {
    return NextResponse.json(
      { error: "Use a valid scope and view combination." },
      { status: 400 },
    );
  }

  return NextResponse.json(getJournalPrototypePayload(scope, view));
}
