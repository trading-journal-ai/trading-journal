import { notFound } from "next/navigation";
import DataVizVocabularyV5 from "@/components/DataVizVocabularyV5";

export default function DataVizV5PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizVocabularyV5 />;
}
