import { notFound } from "next/navigation";
import DataVizV8Forms from "@/components/DataVizV8Forms";

export default function DataVizV8PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizV8Forms />;
}
