import TradeJournalReview, {
  journalReviewHref,
  parseJournalReviewSearchParams,
} from "@/components/TradeJournalReview";
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

function hasExplicitJournalRange(params: {
  date?: string;
  preset?: string;
  from?: string;
  month?: string;
}) {
  return Boolean(params.date || params.preset || params.from || params.month);
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
  const defaultDate = hasExplicitJournalRange(params)
    ? undefined
    : await latestJournalDate(activeAccount.id);
  const filters = parseJournalReviewSearchParams({
    ...params,
    date: params.date ?? defaultDate,
  });
  const returnTo = appendReturnTo(journalReviewHref("/journal", filters), params.returnTo);

  return (
    <TradeJournalReview
      {...filters}
      basePath="/journal"
      returnTo={returnTo}
      backHref={params.returnTo}
      accountId={activeAccount.id}
    />
  );
}
