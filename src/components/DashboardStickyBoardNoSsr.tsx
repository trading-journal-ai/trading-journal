"use client";

import dynamic from "next/dynamic";

const DashboardStickyBoard = dynamic(() => import("@/components/DashboardStickyBoard"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[392px] place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading sticky notes...
    </div>
  ),
});

export default function DashboardStickyBoardNoSsr() {
  return <DashboardStickyBoard />;
}
