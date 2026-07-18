import { notFound } from "next/navigation";
import DataVizStickerSheet from "@/components/DataVizStickerSheet";

export default function DataVizPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizStickerSheet />;
}
