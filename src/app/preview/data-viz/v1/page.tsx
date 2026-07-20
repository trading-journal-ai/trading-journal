import { notFound } from "next/navigation";
import DataVizStickerSheet from "@/components/DataVizStickerSheet";

export default function DataVizV1PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return <DataVizStickerSheet />;
}
