import { notFound } from "next/navigation";
import DataVizVocabularyV6 from "@/components/DataVizVocabularyV6";

export default function DataVizV6PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizVocabularyV6 />;
}
