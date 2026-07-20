import { notFound } from "next/navigation";
import DataVizFactorLens from "@/components/DataVizFactorLens";

export default function DataVizV4PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizFactorLens />;
}
