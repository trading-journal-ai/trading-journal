import { notFound } from "next/navigation";
import DataVizLensLab from "@/components/DataVizLensLab";

export default function DataVizV2PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizLensLab />;
}
