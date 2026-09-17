"use client";

import { useRouter } from "next/navigation";
import DateRangePicker from "@/components/DateRangePicker";
import { analyticsDateRangeHref } from "@/lib/analyticsDateRange";

export default function AnalyticsRangePicker({ href, label, ...props }: {
  from: string; to: string; today: string; href: string; label: string;
}) {
  const router = useRouter();
  return <DateRangePicker {...props} dialogLabel="Analytics date range"
    triggerLabel={<>{label}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6" /></svg></>}
    description="Completed trades by final exit date · Both dates included · Eastern Time"
    className="inline-flex min-h-11 items-center gap-3 rounded-sm py-2 text-left text-2xl font-semibold tracking-tight text-[var(--foreground)] transition-colors hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    onApply={(from, to) => router.push(analyticsDateRangeHref(href, from, to))} />;
}
