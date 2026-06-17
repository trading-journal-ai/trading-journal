import TradeJournalReview, {
  journalReviewHref,
  parseJournalReviewSearchParams,
} from "@/components/TradeJournalReview";
import { getActiveAccount } from "@/lib/accountScope";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    preset?: string;
    from?: string;
    month?: string;
  }>;
}) {
  const filters = parseJournalReviewSearchParams(await searchParams);
  const activeAccount = await getActiveAccount();
  const returnTo = journalReviewHref("/", filters);

  return (
    <TradeJournalReview
      {...filters}
      basePath="/"
      returnTo={returnTo}
      accountId={activeAccount.id}
    />
  );
}
