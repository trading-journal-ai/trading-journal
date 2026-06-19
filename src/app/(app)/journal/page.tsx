import TradeJournalReview, {
  journalReviewHref,
  parseJournalReviewSearchParams,
} from "@/components/TradeJournalReview";
import { getActiveAccount } from "@/lib/accountScope";

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
  const filters = parseJournalReviewSearchParams(params);
  const activeAccount = await getActiveAccount();
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
