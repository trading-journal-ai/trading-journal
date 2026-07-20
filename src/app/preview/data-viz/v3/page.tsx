import { notFound } from "next/navigation";
import DataVizJoinLab from "@/components/DataVizJoinLab";

export default function DataVizV3PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizJoinLab />;
}
