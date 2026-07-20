import { NextResponse } from "next/server";
import { getActiveAccount } from "@/lib/accountScope";
import { loadInlineTradeReview } from "@/lib/inlineTradeReview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") ?? "";
  const symbol = (params.get("symbol") ?? "").trim().toUpperCase();
  const tradeId = Number(params.get("trade"));

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^[A-Z0-9.\-]+$/.test(symbol) || !Number.isInteger(tradeId)) {
    return NextResponse.json({ error: "Invalid inline trade review request." }, { status: 400 });
  }

  try {
    const activeAccount = await getActiveAccount();
    const data = await loadInlineTradeReview({ accountId: activeAccount.id, date, symbol, tradeId });
    if (!data) return NextResponse.json({ error: "Trade not found for this session." }, { status: 404 });

    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load inline trade review.", error);
    return NextResponse.json(
      { error: "Could not load this trade review." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
