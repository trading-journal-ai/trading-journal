"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Left/right arrows step through archived sessions, matching the day-by-day
 * prototype. Typing in a control always wins over stepping.
 */
export default function MomentumArchiveKeyboardNav({
  newerHref,
  olderHref,
}: {
  newerHref?: string;
  olderHref?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const active = document.activeElement;
      const tag = active?.tagName ?? "";
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (active instanceof HTMLElement && active.isContentEditable) return;

      if (event.key === "ArrowLeft" && olderHref) {
        event.preventDefault();
        router.push(olderHref);
      }
      if (event.key === "ArrowRight" && newerHref) {
        event.preventDefault();
        router.push(newerHref);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [newerHref, olderHref, router]);

  return null;
}
