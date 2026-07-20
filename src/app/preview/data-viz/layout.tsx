import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDataVizPreviewEnabled } from "@/lib/preview/dataVizAccess";

// The sharing flag is a server-runtime switch. Do not freeze its value into a
// prerendered 404 during the production build.
export const dynamic = "force-dynamic";

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
