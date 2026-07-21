import TradeJournalReview from "@/components/TradeJournalReview";
import { getActiveAccount } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { etDateString } from "@/lib/time";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function safeInternalHref(value: string | undefined): string | undefined {
  return value?.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function appendReturnTo(href: string, returnTo: string | undefined): string {
  const safeReturnTo = safeInternalHref(returnTo);
  if (!safeReturnTo) return href;

  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("returnTo", safeReturnTo);
  return `${path}?${params.toString()}`;
}

function validDate(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function validMonth(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : undefined;
}

async function latestJournalDate(accountId: number): Promise<string | undefined> {
  const [latestTrade] = await db
    .select({ entryAt: schema.trades.entryAt })
    .from(schema.trades)
    .where(eq(schema.trades.accountId, accountId))
    .orderBy(desc(schema.trades.entryAt))
    .limit(1);

  if (latestTrade?.entryAt != null) return etDateString(latestTrade.entryAt);

  const [latestDayNote] = await db
    .select({ scopeKey: schema.journalEntries.scopeKey })
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.accountId, accountId),
        eq(schema.journalEntries.scope, "day"),
      ),
    )
    .orderBy(desc(schema.journalEntries.scopeKey))
    .limit(1);

  return latestDayNote?.scopeKey ?? undefined;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    preset?: string;
    from?: string;
    month?: string;
    returnTo?: string;
  }>;
}) {
  const params = await searchParams;
  const activeAccount = await getActiveAccount();
  const requestedDate = validDate(params.date);
  const requestedMonth = validMonth(params.month)
    ?? (params.preset === "month" || params.preset === "week"
      ? validDate(params.from)?.slice(0, 7)
      : undefined);
  const journalDate = requestedMonth
    ? undefined
    : requestedDate ?? await latestJournalDate(activeAccount.id);
  const filters = requestedMonth
    ? { preset: "month" as const, from: `${requestedMonth}-01`, month: requestedMonth }
    : { preset: "today" as const, date: journalDate };
  const journalHref = requestedMonth
    ? `/journal?month=${requestedMonth}`
    : journalDate
      ? `/journal?date=${journalDate}`
      : "/journal";
  const returnTo = appendReturnTo(journalHref, params.returnTo);

  return (
    <TradeJournalReview
      {...filters}
      basePath="/journal"
      returnTo={returnTo}
      backHref={params.returnTo}
      accountId={activeAccount.id}
      archiveLinkMode="review-module"
    />
  );
}
