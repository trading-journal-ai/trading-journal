"use client";

import { useRouter } from "next/navigation";
import DateRangePicker from "./DateRangePicker";
import { archiveRangeHref } from "@/lib/momentumArchiveDates";

export default function MomentumArchiveRangePicker({ href, ...props }: {
  from: string; to: string; today: string; href: string; className: string;
}) {
  const router = useRouter();
  return <DateRangePicker {...props} dialogLabel="Archive date range"
    onApply={(from, to) => router.push(archiveRangeHref(href, from, to))} />;
}
