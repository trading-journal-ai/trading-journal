import { notFound } from "next/navigation";
import DataVizJournalLenses from "@/components/DataVizJournalLenses";

export default function DataVizV7PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizJournalLenses />;
}
