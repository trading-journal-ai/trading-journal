import { notFound } from "next/navigation";
import JournalWireframePrototype from "@/components/JournalWireframePrototype";
import {
  getJournalPrototypePayload,
  isJournalPrototypeScope,
  isViewForScope,
  journalScopeViews,
  type JournalPrototypePageState,
  type JournalPrototypeView,
} from "@/lib/preview/journalPrototypeData";

type JournalPreviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JournalPreviewPage({ searchParams }: JournalPreviewPageProps) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const requestedScope = firstValue(params.scope) ?? null;
  const scope = isJournalPrototypeScope(requestedScope) ? requestedScope : "day";
  const requestedView = firstValue(params.view) ?? null;
  const view = isViewForScope(scope, requestedView)
    ? requestedView
    : journalScopeViews[scope][0] as JournalPrototypeView;
  const requestedPage = firstValue(params.page);
  const pageState: JournalPrototypePageState = requestedPage === "after" || requestedPage === "feed" ? requestedPage : "before";

  return (
    <JournalWireframePrototype
      initialPageState={pageState}
      initialPayload={getJournalPrototypePayload(scope, view)}
    />
  );
}
