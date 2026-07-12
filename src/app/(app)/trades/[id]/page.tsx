import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getActiveAccount } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { etDateString } from "@/lib/time";

export const dynamic = "force-dynamic";

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/trades";
}

/** Keep old bookmarks working while trade review lives at the ticker/day level. */
export default async function LegacyTradeDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const tradeId = Number(id);
  if (!Number.isInteger(tradeId)) notFound();

  const activeAccount = await getActiveAccount();
  const trade = (
    await db.select().from(schema.trades).where(eq(schema.trades.id, tradeId)).limit(1)
  )[0];
  if (!trade || trade.accountId !== activeAccount.id) notFound();

  const backHref = safeReturnTo(returnTo);
  if (trade.entryAt == null) redirect(backHref);

  const tickerReviewParams = new URLSearchParams({
    date: etDateString(trade.entryAt),
    symbol: trade.symbol,
    trade: String(trade.id),
    returnTo: backHref,
  });
  redirect(`/trades/review?${tickerReviewParams.toString()}`);
}
