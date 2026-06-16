import TradeJournalReview, {
  journalReviewHref,
  parseJournalReviewSearchParams,
} from "@/components/TradeJournalReview";
import { getActiveAccount } from "@/lib/accountScope";

export const dynamic = "force-dynamic";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    preset?: string;
    from?: string;
  }>;
}) {
  const filters = parseJournalReviewSearchParams(await searchParams);
  const activeAccount = await getActiveAccount();
  const returnTo = journalReviewHref("/journal", filters);

  return (
    <TradeJournalReview
      {...filters}
      basePath="/journal"
      returnTo={returnTo}
      accountId={activeAccount.id}
    />
  );
}
