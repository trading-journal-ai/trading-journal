import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDataVizPreviewEnabled } from "@/lib/preview/dataVizAccess";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DataVizPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!isDataVizPreviewEnabled()) notFound();

  return children;
}
