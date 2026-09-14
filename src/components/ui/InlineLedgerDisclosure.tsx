"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function useInlineLedgerDisclosure<Id extends string | number>() {
  const [expandedId, setExpandedId] = useState<Id | null>(null);
  const [closingId, setClosingId] = useState<Id | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  function clearCloseTimer() {
    if (!closeTimerRef.current) return;
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function close(id: Id) {
    clearCloseTimer();
    setClosingId(id);
    closeTimerRef.current = setTimeout(() => {
      setExpandedId((current) => current === id ? null : current);
      setClosingId((current) => current === id ? null : current);
      closeTimerRef.current = null;
    }, 200);
  }

  function toggle(id: Id) {
    if (expandedId === id) {
      if (closingId === id) {
        clearCloseTimer();
        setClosingId(null);
      } else {
        close(id);
      }
      return;
    }
    clearCloseTimer();
    setClosingId(null);
    setExpandedId(id);
  }

  return { close, closingId, expandedId, toggle };
}

export default function InlineLedgerDisclosure({
  children,
  closing,
}: {
  children: ReactNode;
  closing: boolean;
}) {
  return (
    <div className={`inline-trade-disclosure ${closing ? "inline-trade-disclosure--closing" : ""}`}>
      <div className="inline-trade-disclosure__content">{children}</div>
    </div>
  );
}
