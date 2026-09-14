import { NextResponse } from "next/server";
import { getActiveAccount } from "@/lib/accountScope";
import { loadCalendarDayTrades } from "@/lib/calendarDayTrades";
import { isCalendarDate } from "@/lib/monthCalendar";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const expectedAccount = Number(params.get("account"));
  if (!isCalendarDate(date) || !Number.isSafeInteger(expectedAccount) || expectedAccount <= 0) {
    return NextResponse.json({ error: "Invalid calendar day request." }, { status: 400, headers });
  }
  try {
    const account = await getActiveAccount();
    // The parameter detects a stale screen; it never selects or authorizes an account.
    if (account.id !== expectedAccount) {
      return NextResponse.json({ error: "The account changed. Refresh the calendar to continue." }, { status: 409, headers });
    }
    const rows = await loadCalendarDayTrades(account.id, date);
    return NextResponse.json({ accountId: account.id, date, rows }, { headers });
  } catch {
    return NextResponse.json({ error: "Could not load this day's trades." }, { status: 500, headers });
  }
}
